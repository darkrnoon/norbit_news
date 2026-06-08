const prisma = require("../utils/prisma");
const httpError = require("../utils/httpError");
const { deleteFilesByUrls } = require("../utils/file.utils");

const {
  ensureCommunityOwner,
  ensureCanDeleteCommunity,
} = require("./ownership.service");

const { canModerate, canPinPosts } = require("./permission.service");
const { DISPLAY_ROLE_NAMES } = require("../utils/roles");

function isImageFile(fileUrl) {
  return /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(fileUrl);
}

function normalizeCommunity(community, extra = {}) {
  return {
    community_id: community.community_id,
    name: community.name,
    description: community.description,
    photo_url: community.photo_url,
    community_category_id: community.community_category_id,
    category: community.community_categoties
      ? {
          community_category_id:
            community.community_categoties.community_category_id,
          name: community.community_categoties.name,
        }
      : null,
    creator_user_id: community.creator_user_id,
    created_at: community.created_at,
    updated_at: community.updated_at,
    ...extra,
  };
}

function normalizeCommunityPost(post, currentUserId, currentUserRoleName) {
  const isOwner = Number(post.author_user_id) === Number(currentUserId);
  const isPinned = post.post_pins.length > 0;

  const authorRoleName = post.users.roles.name;

  return {
    post_id: post.post_id,
    title: post.title,
    content: post.content,
    published_at: post.published_at,
    updated_at: post.updated_at,
    is_pinned: isPinned,

    author: {
      user_id: post.users.user_id,
      login: post.users.login,
      avatar: post.users.contacts?.avatar ?? null,
      full_name: post.users.contacts?.full_name ?? "Пользователь",
      role: {
        role_id: post.users.roles.role_id,
        name: authorRoleName,
        should_display: DISPLAY_ROLE_NAMES.includes(authorRoleName),
      },
    },

    attachments: post.attachments.map((attachment) => ({
      attachment_id: attachment.attachment_id,
      file_url: attachment.file_url,
      uploaded_at: attachment.uploaded_at,
      type: isImageFile(attachment.file_url) ? "image" : "file",
    })),

    counters: {
      likes: post._count.post_likes,
      comments: post._count.post_comments,
    },

    permissions: {
      can_edit: isOwner,
      can_delete: isOwner || canModerate(currentUserRoleName),
      can_pin: canPinPosts(currentUserRoleName),
    },

    pin: isPinned
      ? {
          pin_id: post.post_pins[0].pin_id,
          pinned_at: post.post_pins[0].pinned_at,
          pinned_until: post.post_pins[0].pinned_until,
        }
      : null,
  };
}

exports.categories = async () => {
  return prisma.community_categories.findMany({
    select: {
      community_category_id: true,
      name: true,
    },
    orderBy: {
      name: "asc",
    },
  });
};

exports.create = async ({
  creatorUserId,
  name,
  description,
  photoUrl,
  categoryId,
}) => {
  const normalizedName = name?.trim();
  const normalizedDescription = description?.trim() || null;

  if (!normalizedName) {
    throw httpError(400, "Введите название сообщества");
  }

  const category = await prisma.community_categories.findUnique({
    where: {
      community_category_id: Number(categoryId),
    },
    select: {
      community_category_id: true,
    },
  });

  if (!category) {
    throw httpError(404, "Категория сообщества не найдена");
  }

  const community = await prisma.$transaction(async (tx) => {
    const created = await tx.communities.create({
      data: {
        name: normalizedName,
        description: normalizedDescription,
        photo_url: photoUrl,
        community_category_id: Number(categoryId),
        creator_user_id: Number(creatorUserId),
      },
      select: {
        community_id: true,
        name: true,
        description: true,
        photo_url: true,
        community_category_id: true,
        creator_user_id: true,
        created_at: true,
        updated_at: true,
        community_categoties: {
          select: {
            community_category_id: true,
            name: true,
          },
        },
      },
    });

    await tx.community_subscriptions.create({
      data: {
        community_id: created.community_id,
        user_id: Number(creatorUserId),
        is_active: true,
        subscribed_at: new Date(),
      },
    });

    return created;
  });

  return normalizeCommunity(community, {
    is_subscribed: true,
    subscribers_count: 1,
  });
};

exports.list = async ({
  userId,
  categoryId,
  search,
  take = 20,
  skip = 0,
}) => {
  const limit = Math.min(Math.max(Number(take) || 20, 1), 50);
  const offset = Math.max(Number(skip) || 0, 0);

  const where = {
    deleted_at: null,

    ...(categoryId
      ? {
          community_category_id: Number(categoryId),
        }
      : {}),

    ...(search
      ? {
          name: {
            contains: String(search),
            mode: "insensitive",
          },
        }
      : {}),
  };

  const communities = await prisma.communities.findMany({
    where,
    select: {
      community_id: true,
      name: true,
      description: true,
      photo_url: true,
      community_category_id: true,
      creator_user_id: true,
      created_at: true,
      updated_at: true,
      community_categoties: {
        select: {
          community_category_id: true,
          name: true,
        },
      },
    },
    orderBy: {
      created_at: "desc",
    },
    take: limit,
    skip: offset,
  });

  const communityIds = communities.map((community) => community.community_id);

  if (communityIds.length === 0) {
    return [];
  }

  const subscribersCounts = await prisma.community_subscriptions.groupBy({
    by: ["community_id"],
    where: {
      community_id: {
        in: communityIds,
      },
      is_active: true,
    },
    _count: {
      user_id: true,
    },
  });

  const mySubscriptions = await prisma.community_subscriptions.findMany({
    where: {
      community_id: {
        in: communityIds,
      },
      user_id: Number(userId),
      is_active: true,
    },
    select: {
      community_id: true,
    },
  });

  const countsMap = new Map(
    subscribersCounts.map((item) => [item.community_id, item._count.user_id])
  );

  const mySubscriptionsSet = new Set(
    mySubscriptions.map((item) => item.community_id)
  );

  return communities.map((community) =>
    normalizeCommunity(community, {
      is_subscribed: mySubscriptionsSet.has(community.community_id),
      subscribers_count: countsMap.get(community.community_id) ?? 0,
    })
  );
};

exports.getById = async ({ communityId, userId }) => {
  const community = await prisma.communities.findUnique({
    where: {
      community_id: Number(communityId),
    },
    select: {
      community_id: true,
      name: true,
      description: true,
      photo_url: true,
      community_category_id: true,
      creator_user_id: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
      community_categoties: {
        select: {
          community_category_id: true,
          name: true,
        },
      },
    },
  });

  if (!community || community.deleted_at) {
    throw httpError(404, "Сообщество не найдено");
  }

  const [subscribersCount, postsCount, mySubscription] = await Promise.all([
    prisma.community_subscriptions.count({
      where: {
        community_id: Number(communityId),
        is_active: true,
      },
    }),

    prisma.posts.count({
      where: {
        community_id: Number(communityId),
        deleted_at: null,
      },
    }),

    prisma.community_subscriptions.findUnique({
      where: {
        community_id_user_id: {
          community_id: Number(communityId),
          user_id: Number(userId),
        },
      },
      select: {
        is_active: true,
      },
    }),
  ]);

  return normalizeCommunity(community, {
    is_subscribed: Boolean(mySubscription?.is_active),
    subscribers_count: subscribersCount,
    posts_count: postsCount,
  });
};

exports.update = async ({
  communityId,
  actorUserId,
  patch,
}) => {
  const existing = await prisma.communities.findUnique({
    where: {
      community_id: Number(communityId),
    },
    select: {
      community_id: true,
      creator_user_id: true,
      photo_url: true,
      deleted_at: true,
    },
  });

  if (!existing || existing.deleted_at) {
    throw httpError(404, "Сообщество не найдено");
  }

  ensureCommunityOwner({
    actorUserId: Number(actorUserId),
    ownerUserId: existing.creator_user_id,
  });

  const normalizedName =
    patch.name === undefined ? undefined : patch.name?.trim();

  if (patch.name !== undefined && !normalizedName) {
    throw httpError(400, "Введите название сообщества");
  }

  const normalizedDescription =
    patch.description === undefined
      ? undefined
      : patch.description?.trim() || null;

  if (patch.categoryId !== undefined) {
    const category = await prisma.community_categories.findUnique({
      where: {
        community_category_id: Number(patch.categoryId),
      },
      select: {
        community_category_id: true,
      },
    });

    if (!category) {
      throw httpError(404, "Категория сообщества не найдена");
    }
  }

  const updated = await prisma.communities.update({
    where: {
      community_id: Number(communityId),
    },
    data: {
      name: normalizedName,
      description: normalizedDescription,
      photo_url: patch.photoUrl,
      community_category_id:
        patch.categoryId !== undefined ? Number(patch.categoryId) : undefined,
      updated_at: new Date(),
    },
    select: {
      community_id: true,
      name: true,
      description: true,
      photo_url: true,
      community_category_id: true,
      creator_user_id: true,
      created_at: true,
      updated_at: true,
      community_categoties: {
        select: {
          community_category_id: true,
          name: true,
        },
      },
    },
  });

  if (patch.photoUrl && existing.photo_url && existing.photo_url !== patch.photoUrl) {
    await deleteFilesByUrls([existing.photo_url]);
  }

  return normalizeCommunity(updated);
};

exports.remove = async ({
  communityId,
  actorUserId,
  actorRoleName,
}) => {
  const existing = await prisma.communities.findUnique({
    where: {
      community_id: Number(communityId),
    },
    select: {
      community_id: true,
      creator_user_id: true,
      photo_url: true,
      deleted_at: true,
    },
  });

  if (!existing || existing.deleted_at) {
    throw httpError(404, "Сообщество не найдено");
  }

  ensureCanDeleteCommunity({
    actorUserId: Number(actorUserId),
    actorRoleName,
    ownerUserId: existing.creator_user_id,
  });

  await prisma.$transaction(async (tx) => {
    await tx.communities.update({
      where: {
        community_id: Number(communityId),
      },
      data: {
        deleted_at: new Date(),
        updated_at: new Date(),
      },
    });

    await tx.community_subscriptions.updateMany({
      where: {
        community_id: Number(communityId),
        is_active: true,
      },
      data: {
        is_active: false,
      },
    });
  });

  if (existing.photo_url) {
    await deleteFilesByUrls([existing.photo_url]);
  }

  return {
    ok: true,
    message: "Сообщество удалено",
  };
};

exports.subscribe = async ({ communityId, userId }) => {
  const community = await prisma.communities.findUnique({
    where: {
      community_id: Number(communityId),
    },
    select: {
      community_id: true,
      deleted_at: true,
    },
  });

  if (!community || community.deleted_at) {
    throw httpError(404, "Сообщество не найдено");
  }

  await prisma.community_subscriptions.upsert({
    where: {
      community_id_user_id: {
        community_id: Number(communityId),
        user_id: Number(userId),
      },
    },
    update: {
      is_active: true,
      subscribed_at: new Date(),
    },
    create: {
      community_id: Number(communityId),
      user_id: Number(userId),
      is_active: true,
      subscribed_at: new Date(),
    },
  });

  return {
    ok: true,
    is_subscribed: true,
    message: "Подписка на сообщество оформлена",
  };
};

exports.unsubscribe = async ({ communityId, userId }) => {
  const community = await prisma.communities.findUnique({
    where: {
      community_id: Number(communityId),
    },
    select: {
      community_id: true,
      deleted_at: true,
    },
  });

  if (!community || community.deleted_at) {
    throw httpError(404, "Сообщество не найдено");
  }

  await prisma.community_subscriptions.updateMany({
    where: {
      community_id: Number(communityId),
      user_id: Number(userId),
      is_active: true,
    },
    data: {
      is_active: false,
    },
  });

  return {
    ok: true,
    is_subscribed: false,
    message: "Подписка на сообщество отменена",
  };
};

exports.mySubscriptions = async (userId) => {
  const subscriptions = await prisma.community_subscriptions.findMany({
    where: {
      user_id: Number(userId),
      is_active: true,
      communities: {
        deleted_at: null,
      },
    },
    select: {
      subscribed_at: true,
      communities: {
        select: {
          community_id: true,
          name: true,
          description: true,
          photo_url: true,
          community_category_id: true,
          creator_user_id: true,
          created_at: true,
          updated_at: true,
          community_categoties: {
            select: {
              community_category_id: true,
              name: true,
            },
          },
        },
      },
    },
    orderBy: {
      subscribed_at: "desc",
    },
  });

  return subscriptions.map((subscription) =>
    normalizeCommunity(subscription.communities, {
      is_subscribed: true,
      subscribed_at: subscription.subscribed_at,
    })
  );
};

exports.posts = async ({
  communityId,
  currentUserId,
  currentUserRoleName,
  take = 20,
  skip = 0,
}) => {
  const limit = Math.min(Math.max(Number(take) || 20, 1), 50);
  const offset = Math.max(Number(skip) || 0, 0);
  const now = new Date();

  const community = await prisma.communities.findUnique({
    where: {
      community_id: Number(communityId),
    },
    select: {
      community_id: true,
      deleted_at: true,
    },
  });

  if (!community || community.deleted_at) {
    throw httpError(404, "Сообщество не найдено");
  }

  const activePinWhere = {
    is_active: true,
    OR: [
      {
        pinned_until: null,
      },
      {
        pinned_until: {
          gt: now,
        },
      },
    ],
  };

  const postInclude = {
    post_pins: {
      where: activePinWhere,
      select: {
        pin_id: true,
        pinned_at: true,
        pinned_until: true,
        is_active: true,
      },
    },

    users: {
      select: {
        user_id: true,
        login: true,
        roles: {
          select: {
            role_id: true,
            name: true,
          },
        },
        contacts: {
          select: {
            avatar: true,
            full_name: true,
          },
        },
      },
    },

    attachments: {
      select: {
        attachment_id: true,
        file_url: true,
        uploaded_at: true,
      },
    },

    _count: {
      select: {
        post_likes: true,
        post_comments: {
          where: {
            deleted_at: null,
          },
        },
      },
    },
  };

  const pinnedPosts = await prisma.posts.findMany({
    where: {
      community_id: Number(communityId),
      deleted_at: null,
      post_pins: {
        some: activePinWhere,
      },
    },
    include: postInclude,
    orderBy: {
      published_at: "desc",
    },
    take: 10,
  });

  const pinnedPostIds = pinnedPosts.map((post) => post.post_id);

  const regularPosts = await prisma.posts.findMany({
    where: {
      community_id: Number(communityId),
      deleted_at: null,
      ...(pinnedPostIds.length
        ? {
            post_id: {
              notIn: pinnedPostIds,
            },
          }
        : {}),
    },
    include: postInclude,
    orderBy: {
      published_at: "desc",
    },
    take: limit,
    skip: offset,
  });

  return [...pinnedPosts, ...regularPosts].map((post) =>
    normalizeCommunityPost(post, currentUserId, currentUserRoleName)
  );
};