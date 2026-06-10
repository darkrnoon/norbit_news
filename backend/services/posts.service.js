const prisma = require("../utils/prisma");
const httpError = require("../utils/httpError");
const { deleteFilesByUrls } = require("../utils/file.utils");

const {
  ensurePostOwner,
  ensureCanDeletePost,
} = require("./ownership.service");

const {
  canModerate,
  canPinPosts,
} = require("./permission.service");

const {
  DISPLAY_ROLE_NAMES,
} = require("../utils/roles");

const DAY_IN_MS = 24 * 60 * 60 * 1000;

function getPostInclude(currentUserId, now = new Date()) {
  return {
    communities: {
      select: {
        community_id: true,
        name: true,
        photo_url: true,
        deleted_at: true,
      },
    },

    attachments: {
      select: {
        attachment_id: true,
        file_url: true,
        original_name: true,
        mime_type: true,
        file_size: true,
        uploaded_at: true,
      },
    },

    post_likes: {
      where: {
        user_id: Number(currentUserId),
      },
      select: {
        user_id: true,
      },
    },

    post_pins: {
      where: {
        is_active: true,
        OR: [
          { pinned_until: null },
          { pinned_until: { gt: now } },
        ],
      },
      select: {
        pin_id: true,
        pinned_at: true,
        pinned_until: true,
        is_active: true,
        pinned_by_user_id: true,
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
            contact_id: true,
            avatar: true,
            full_name: true,
          },
        },
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
}

function isImageFile(fileUrl) {
  return /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(fileUrl);
}

function normalizePost(post, currentUserId, currentUserRoleName) {
  const isPinned = post.post_pins.length > 0;
  const isOwner = Number(post.author_user_id) === Number(currentUserId);

  const authorRoleName = post.users.roles.name;
  const shouldDisplayAuthorRole = DISPLAY_ROLE_NAMES.includes(authorRoleName);

  const canEdit = isOwner;
  const canDelete = isOwner || canModerate(currentUserRoleName);
  const canPin = canPinPosts(currentUserRoleName);

  return {
    post_id: post.post_id,
    title: post.title,
    content: post.content,
    published_at: post.published_at,
    updated_at: post.updated_at,

    is_community_post: post.is_community_post,
    is_pinned: isPinned,

    source:
      post.is_community_post && post.communities
        ? {
            type: "community",
            label: "Сообщество",
            community_id: post.communities.community_id,
            name: post.communities.name,
            photo_url: post.communities.photo_url,
          }
        : {
            type: "user",
            label: "Пользователь",
          },

    community: post.communities
      ? {
          community_id: post.communities.community_id,
          name: post.communities.name,
          photo_url: post.communities.photo_url,
        }
      : null,

    author: {
      user_id: post.users.user_id,
      login: post.users.login,
      avatar: post.users.contacts?.avatar ?? null,
      full_name: post.users.contacts?.full_name ?? "Пользователь",
      role: {
        role_id: post.users.roles.role_id,
        name: authorRoleName,
        should_display: shouldDisplayAuthorRole,
      },
    },

    attachments: post.attachments.map((attachment) => ({
      attachment_id: attachment.attachment_id,
      file_url: attachment.file_url,
      original_name: attachment.original_name,
      mime_type: attachment.mime_type,
      file_size: attachment.file_size,
      uploaded_at: attachment.uploaded_at,
      type: isImageFile(attachment.file_url) ? "image" : "file",
    })),

    counters: {
      likes: post._count.post_likes,
      comments: post._count.post_comments,
    },

    is_liked_by_me: post.post_likes.length > 0,

    permissions: {
      can_edit: canEdit,
      can_delete: canDelete,
      can_pin: canPin,
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

function normalizePosts(posts, currentUserId, currentUserRoleName) {
  return posts.map((post) =>
    normalizePost(post, currentUserId, currentUserRoleName)
  );
}

async function ensureCommunityPostAvailable({ communityId, userId }) {
  if (!communityId) {
    throw httpError(400, "Выберите сообщество для публикации новости");
  }

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

  const subscription = await prisma.community_subscriptions.findUnique({
    where: {
      community_id_user_id: {
        community_id: Number(communityId),
        user_id: Number(userId),
      },
    },
    select: {
      is_active: true,
    },
  });

  if (!subscription || !subscription.is_active) {
    throw httpError(
      403,
      "Публикация от лица сообщества доступна только подписчикам этого сообщества"
    );
  }
}

function prepareAttachments(attachments) {
  if (!Array.isArray(attachments)) return [];

  return attachments
    .filter((item) => item && typeof item.file_url === "string")
    .map((item) => ({
      file_url: item.file_url,
      original_name: item.original_name ?? null,
      mime_type: item.mime_type ?? null,
      file_size: item.file_size ?? null,
    }));
}

exports.createPost = async ({
  authorUserId,
  currentUserRoleName,
  title,
  content,
  communityId,
  isCommunityPost,
  attachments = [],
}) => {
  const normalizedTitle = title?.trim() || null;
  const normalizedContent = content?.trim() || null;
  const isCommunity = Boolean(isCommunityPost);
  const preparedAttachments = prepareAttachments(attachments);

  if (
    !normalizedTitle &&
    !normalizedContent &&
    preparedAttachments.length === 0
  ) {
    throw httpError(
      400,
      "Новость должна содержать заголовок, текст или вложение"
    );
  }

  if (isCommunity) {
    await ensureCommunityPostAvailable({
      communityId,
      userId: authorUserId,
    });
  }

  const post = await prisma.posts.create({
    data: {
      author_user_id: Number(authorUserId),
      title: normalizedTitle,
      content: normalizedContent,
      community_id: isCommunity ? Number(communityId) : null,
      is_community_post: isCommunity,

      attachments: preparedAttachments.length
        ? {
            create: preparedAttachments,
          }
        : undefined,
    },
    include: getPostInclude(authorUserId),
  });

  return normalizePost(post, authorUserId, currentUserRoleName);
};

exports.getPostById = async ({
  postId,
  currentUserId,
  currentUserRoleName,
}) => {
  const post = await prisma.posts.findUnique({
    where: {
      post_id: Number(postId),
    },
    include: getPostInclude(currentUserId),
  });

  if (!post || post.deleted_at || post.communities?.deleted_at) {
    throw httpError(404, "Новость не найдена");
  }

  return normalizePost(post, currentUserId, currentUserRoleName);
};

exports.updatePost = async ({
  postId,
  actorUserId,
  currentUserRoleName,
  title,
  content,
  communityId,
  isCommunityPost,
  attachments = [],
  keepAttachmentIds,
}) => {
  const post = await prisma.posts.findUnique({
    where: {
      post_id: Number(postId),
    },
    select: {
      post_id: true,
      author_user_id: true,
      title: true,
      content: true,
      community_id: true,
      is_community_post: true,
      deleted_at: true,
      communities: {
        select: {
          deleted_at: true,
        },
      },
      attachments: {
        select: {
          attachment_id: true,
          file_url: true,
        },
      },
    },
  });

  if (!post || post.deleted_at || post.communities?.deleted_at) {
    throw httpError(404, "Новость не найдена");
  }

  ensurePostOwner({
    actorUserId: Number(actorUserId),
    ownerUserId: post.author_user_id,
  });

  const preparedAttachments = prepareAttachments(attachments);

  const existingAttachmentIds = post.attachments.map(
    (attachment) => attachment.attachment_id
  );

  const idsToKeep = Array.isArray(keepAttachmentIds)
    ? keepAttachmentIds.filter((id) => existingAttachmentIds.includes(id))
    : existingAttachmentIds;

  const attachmentsToDelete = post.attachments.filter(
    (attachment) => !idsToKeep.includes(attachment.attachment_id)
  );

  const deletedFileUrls = attachmentsToDelete.map(
    (attachment) => attachment.file_url
  );

  const finalAttachmentsCount = idsToKeep.length + preparedAttachments.length;

  if (finalAttachmentsCount > 4) {
    throw httpError(400, "Можно прикрепить не более 4 файлов");
  }

  const normalizedTitle =
    title === undefined ? undefined : title?.trim() || null;

  const normalizedContent =
    content === undefined ? undefined : content?.trim() || null;

  const shouldUpdateCommunity = isCommunityPost !== undefined;

  const isCommunity = shouldUpdateCommunity
    ? Boolean(isCommunityPost)
    : undefined;

  if (isCommunity === true) {
    await ensureCommunityPostAvailable({
      communityId,
      userId: actorUserId,
    });
  }

  const finalTitle =
    normalizedTitle === undefined ? post.title : normalizedTitle;

  const finalContent =
    normalizedContent === undefined ? post.content : normalizedContent;

  if (!finalTitle && !finalContent && finalAttachmentsCount === 0) {
    throw httpError(
      400,
      "Новость должна содержать заголовок, текст или вложение"
    );
  }

  const updatedPost = await prisma.$transaction(async (tx) => {
    if (attachmentsToDelete.length > 0) {
      await tx.attachments.deleteMany({
        where: {
          attachment_id: {
            in: attachmentsToDelete.map(
              (attachment) => attachment.attachment_id
            ),
          },
          post_id: Number(postId),
        },
      });
    }

    return tx.posts.update({
      where: {
        post_id: Number(postId),
      },
      data: {
        title: normalizedTitle,
        content: normalizedContent,

        community_id:
          isCommunity === undefined
            ? undefined
            : isCommunity
              ? Number(communityId)
              : null,

        is_community_post:
          isCommunity === undefined ? undefined : isCommunity,

        updated_at: new Date(),

        attachments:
          preparedAttachments.length > 0
            ? {
                create: preparedAttachments,
              }
            : undefined,
      },
      include: getPostInclude(actorUserId),
    });
  });

  await deleteFilesByUrls(deletedFileUrls);

  return normalizePost(updatedPost, actorUserId, currentUserRoleName);
};

exports.deletePost = async ({
  postId,
  actorUserId,
  actorRoleName,
}) => {
  const post = await prisma.posts.findUnique({
    where: {
      post_id: Number(postId),
    },
    select: {
      post_id: true,
      author_user_id: true,
      deleted_at: true,
      attachments: {
        select: {
          file_url: true,
        },
      },
    },
  });

  if (!post || post.deleted_at) {
    throw httpError(404, "Новость не найдена");
  }

  ensureCanDeletePost({
    actorUserId: Number(actorUserId),
    actorRoleName,
    ownerUserId: post.author_user_id,
  });

  const fileUrls = post.attachments.map((attachment) => attachment.file_url);

  await prisma.$transaction(async (tx) => {
    await tx.attachments.deleteMany({
      where: {
        post_id: Number(postId),
      },
    });

    await tx.posts.update({
      where: {
        post_id: Number(postId),
      },
      data: {
        deleted_at: new Date(),
        updated_at: new Date(),
      },
    });
  });

  await deleteFilesByUrls(fileUrls);

  return {
    ok: true,
    message: "Новость удалена",
  };
};

exports.pinPost = async ({
  postId,
  actorUserId,
  actorRoleName,
}) => {
  if (!canPinPosts(actorRoleName)) {
    throw httpError(403, "Недостаточно прав для закрепления новости");
  }

  const post = await prisma.posts.findUnique({
    where: {
      post_id: Number(postId),
    },
    select: {
      post_id: true,
      deleted_at: true,
      communities: {
        select: {
          deleted_at: true,
        },
      },
    },
  });

  if (!post || post.deleted_at || post.communities?.deleted_at) {
    throw httpError(404, "Новость не найдена");
  }

  const pinnedAt = new Date();
  const pinnedUntil = new Date(pinnedAt.getTime() + DAY_IN_MS);

  const pin = await prisma.$transaction(async (tx) => {
    await tx.post_pins.updateMany({
      where: {
        post_id: Number(postId),
        is_active: true,
      },
      data: {
        is_active: false,
      },
    });

    return tx.post_pins.create({
      data: {
        post_id: Number(postId),
        pinned_by_user_id: Number(actorUserId),
        pinned_at: pinnedAt,
        pinned_until: pinnedUntil,
        is_active: true,
      },
      select: {
        pin_id: true,
        post_id: true,
        pinned_by_user_id: true,
        pinned_at: true,
        pinned_until: true,
        is_active: true,
      },
    });
  });

  return pin;
};

exports.unpinPost = async ({
  postId,
  actorRoleName,
}) => {
  if (!canPinPosts(actorRoleName)) {
    throw httpError(403, "Недостаточно прав для открепления новости");
  }

  const post = await prisma.posts.findUnique({
    where: {
      post_id: Number(postId),
    },
    select: {
      post_id: true,
      deleted_at: true,
      communities: {
        select: {
          deleted_at: true,
        },
      },
    },
  });

  if (!post || post.deleted_at || post.communities?.deleted_at) {
    throw httpError(404, "Новость не найдена");
  }

  await prisma.post_pins.updateMany({
    where: {
      post_id: Number(postId),
      is_active: true,
    },
    data: {
      is_active: false,
    },
  });

  return {
    ok: true,
    message: "Новость откреплена",
  };
};

exports.getFeed = async ({
  currentUserId,
  currentUserRoleName,
  communityId,
  authorId,
  pinnedOnly,
  take = 20,
  skip = 0,
}) => {
  const limit = Math.min(Math.max(Number(take) || 20, 1), 50);
  const offset = Math.max(Number(skip) || 0, 0);
  const now = new Date();

  const where = {
    deleted_at: null,

    OR: [
      {
        community_id: null,
      },
      {
        communities: {
          deleted_at: null,
        },
      },
    ],

    ...(communityId
      ? {
          community_id: Number(communityId),
        }
      : {}),

    ...(authorId
      ? {
          author_user_id: Number(authorId),
        }
      : {}),
  };

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

  if (pinnedOnly === "true") {
    const pinnedPosts = await prisma.posts.findMany({
      where: {
        ...where,
        post_pins: {
          some: activePinWhere,
        },
      },
      include: getPostInclude(currentUserId, now),
      orderBy: [
        {
          published_at: "desc",
        },
      ],
      take: limit,
      skip: offset,
    });

    return normalizePosts(
      pinnedPosts,
      currentUserId,
      currentUserRoleName
    );
  }

  const pinnedPosts =
    offset === 0
      ? await prisma.posts.findMany({
          where: {
            ...where,
            post_pins: {
              some: activePinWhere,
            },
          },
          include: getPostInclude(currentUserId, now),
          orderBy: [
            {
              published_at: "desc",
            },
          ],
          take: 10,
        })
      : [];

  const pinnedPostIds = pinnedPosts.map((post) => post.post_id);

  const regularPosts = await prisma.posts.findMany({
    where: {
      ...where,
      ...(pinnedPostIds.length
        ? {
            post_id: {
              notIn: pinnedPostIds,
            },
          }
        : {}),
    },
    include: getPostInclude(currentUserId, now),
    orderBy: [
      {
        published_at: "desc",
      },
    ],
    take: limit,
    skip: offset,
  });

  return normalizePosts(
    [...pinnedPosts, ...regularPosts],
    currentUserId,
    currentUserRoleName
  );
};

exports.getMyCommunitiesFeed = async ({
  currentUserId,
  currentUserRoleName,
  take = 20,
  skip = 0,
  pinnedOnly,
}) => {
  const limit = Math.min(Math.max(Number(take) || 20, 1), 50);
  const offset = Math.max(Number(skip) || 0, 0);
  const now = new Date();

  const subscriptions = await prisma.community_subscriptions.findMany({
    where: {
      user_id: Number(currentUserId),
      is_active: true,
      communities: {
        deleted_at: null,
      },
    },
    select: {
      community_id: true,
    },
  });

  const communityIds = subscriptions.map((item) => item.community_id);

  if (communityIds.length === 0) {
    return [];
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

  const where = {
    deleted_at: null,
    community_id: {
      in: communityIds,
    },
    communities: {
      deleted_at: null,
    },
  };

  if (pinnedOnly === "true") {
    const posts = await prisma.posts.findMany({
      where: {
        ...where,
        post_pins: {
          some: activePinWhere,
        },
      },
      include: getPostInclude(currentUserId, now),
      orderBy: [
        {
          published_at: "desc",
        },
      ],
      take: limit,
      skip: offset,
    });

    return normalizePosts(posts, currentUserId, currentUserRoleName);
  }

  const pinnedPosts =
    offset === 0
      ? await prisma.posts.findMany({
          where: {
            ...where,
            post_pins: {
              some: activePinWhere,
            },
          },
          include: getPostInclude(currentUserId, now),
          orderBy: [
            {
              published_at: "desc",
            },
          ],
          take: 10,
        })
      : [];

  const pinnedPostIds = pinnedPosts.map((post) => post.post_id);

  const regularPosts = await prisma.posts.findMany({
    where: {
      ...where,
      ...(pinnedPostIds.length
        ? {
            post_id: {
              notIn: pinnedPostIds,
            },
          }
        : {}),
    },
    include: getPostInclude(currentUserId, now),
    orderBy: [
      {
        published_at: "desc",
      },
    ],
    take: limit,
    skip: offset,
  });

  return normalizePosts(
    [...pinnedPosts, ...regularPosts],
    currentUserId,
    currentUserRoleName
  );
};