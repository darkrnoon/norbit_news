const prisma = require("../utils/prisma");
const httpError = require("../utils/httpError");
const { deleteFilesByUrls } = require("../utils/file.utils");

const {
  HELP_REQUEST_STATUS,
  HELP_RESPONSE_STATUS,
  HELP_REQUEST_STATUS_LABELS,
  HELP_RESPONSE_STATUS_LABELS,
} = require("../utils/helpStatuses");

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

function normalizePagination(take = 20, skip = 0) {
  return {
    limit: Math.min(Math.max(Number(take) || 20, 1), 100),
    offset: Math.max(Number(skip) || 0, 0),
  };
}

function truncateText(value, max = 180) {
  if (!value) return null;

  const text = String(value);

  if (text.length <= max) return text;

  return `${text.slice(0, max)}...`;
}

function getStartOfToday() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
}

function pluralRu(number, one, few, many) {
  const mod10 = number % 10;
  const mod100 = number % 100;

  if (mod10 === 1 && mod100 !== 11) return one;
  if ([2, 3, 4].includes(mod10) && ![12, 13, 14].includes(mod100)) return few;

  return many;
}

function timeAgoRu(date) {
  if (!date) return "Активности не было";

  const diffMs = Date.now() - new Date(date).getTime();
  const diffMinutes = Math.floor(diffMs / 60000);

  if (diffMinutes < 1) return "только что";

  if (diffMinutes < 60) {
    return `${diffMinutes} ${pluralRu(
      diffMinutes,
      "минуту",
      "минуты",
      "минут"
    )} назад`;
  }

  const diffHours = Math.floor(diffMinutes / 60);

  if (diffHours < 24) {
    return `${diffHours} ${pluralRu(diffHours, "час", "часа", "часов")} назад`;
  }

  const diffDays = Math.floor(diffHours / 24);

  return `${diffDays} ${pluralRu(diffDays, "день", "дня", "дней")} назад`;
}

function getPostStatus(post) {
  return post.deleted_at
    ? { value: "deleted", label: "Удалено" }
    : { value: "active", label: "Активно" };
}

function getCommunityStatus(community) {
  return community.deleted_at
    ? { value: "deleted", label: "Удалено" }
    : { value: "active", label: "Активно" };
}

function getHelpRequestAdminStatus(request) {
  if (request.deleted_at) {
    return {
      value: "deleted",
      label: "Удалено",
    };
  }

  return {
    value: request.status,
    label: HELP_REQUEST_STATUS_LABELS[request.status] ?? request.status,
  };
}

// ====================
// Статистика
// ====================

exports.getStats = async () => {
  const weekAgo = new Date(Date.now() - WEEK_MS);

  const [
    usersTotal,
    usersWeek,
    postsTotal,
    postsWeek,
    communitiesTotal,
    communitiesWeek,
    helpRequestsTotal,
    helpRequestsWeek,
  ] = await Promise.all([
    prisma.users.count(),
    prisma.users.count({
      where: {
        created_at: {
          gte: weekAgo,
        },
      },
    }),

    prisma.posts.count(),
    prisma.posts.count({
      where: {
        published_at: {
          gte: weekAgo,
        },
      },
    }),

    prisma.communities.count(),
    prisma.communities.count({
      where: {
        created_at: {
          gte: weekAgo,
        },
      },
    }),

    prisma.help_requests.count(),
    prisma.help_requests.count({
      where: {
        created_at: {
          gte: weekAgo,
        },
      },
    }),
  ]);

  return {
    users: {
      total: usersTotal,
      added_week: usersWeek,
    },
    posts: {
      total: postsTotal,
      added_week: postsWeek,
    },
    communities: {
      total: communitiesTotal,
      added_week: communitiesWeek,
    },
    help_requests: {
      total: helpRequestsTotal,
      added_week: helpRequestsWeek,
    },
  };
};

// ====================
// Новости
// ====================

function normalizeAdminPostListItem(post) {
  return {
    post_id: post.post_id,
    title: post.title,
    content_preview: truncateText(post.content),
    is_community_post: post.is_community_post,

    author: {
      user_id: post.users.user_id,
      login: post.users.login,
      full_name: post.users.contacts?.full_name ?? "Пользователь",
      avatar: post.users.contacts?.avatar ?? null,
    },

    community:
      post.is_community_post && post.communities
        ? {
            community_id: post.communities.community_id,
            name: post.communities.name,
          }
        : null,

    counters: {
      likes: post._count.post_likes,
      comments: post._count.post_comments,
    },

    status: getPostStatus(post),
    published_at: post.published_at,
    updated_at: post.updated_at,
  };
}

function normalizeAdminPostDetail(post) {
  return {
    post_id: post.post_id,
    title: post.title,
    content: post.content,
    is_community_post: post.is_community_post,

    author: {
      user_id: post.users.user_id,
      login: post.users.login,
      full_name: post.users.contacts?.full_name ?? "Пользователь",
      avatar: post.users.contacts?.avatar ?? null,
    },

    community:
      post.is_community_post && post.communities
        ? {
            community_id: post.communities.community_id,
            name: post.communities.name,
            photo_url: post.communities.photo_url,
          }
        : null,

    attachments: post.attachments.map((attachment) => ({
      attachment_id: attachment.attachment_id,
      file_url: attachment.file_url,
      uploaded_at: attachment.uploaded_at,
    })),

    counters: {
      likes: post._count.post_likes,
      comments: post._count.post_comments,
    },

    status: getPostStatus(post),
    published_at: post.published_at,
    updated_at: post.updated_at,
    deleted_at: post.deleted_at,
  };
}

exports.listPosts = async ({ search, take, skip }) => {
  const { limit, offset } = normalizePagination(take, skip);

  const where = {
    ...(search
      ? {
          OR: [
            {
              title: {
                contains: String(search),
                mode: "insensitive",
              },
            },
            {
              content: {
                contains: String(search),
                mode: "insensitive",
              },
            },
          ],
        }
      : {}),
  };

  const posts = await prisma.posts.findMany({
    where,
    select: {
      post_id: true,
      title: true,
      content: true,
      is_community_post: true,
      published_at: true,
      updated_at: true,
      deleted_at: true,

      users: {
        select: {
          user_id: true,
          login: true,
          contacts: {
            select: {
              full_name: true,
              avatar: true,
            },
          },
        },
      },

      communities: {
        select: {
          community_id: true,
          name: true,
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
    },
    orderBy: {
      published_at: "desc",
    },
    take: limit,
    skip: offset,
  });

  return posts.map(normalizeAdminPostListItem);
};

exports.getPostById = async (postId) => {
  const post = await prisma.posts.findUnique({
    where: {
      post_id: Number(postId),
    },
    select: {
      post_id: true,
      title: true,
      content: true,
      is_community_post: true,
      published_at: true,
      updated_at: true,
      deleted_at: true,

      users: {
        select: {
          user_id: true,
          login: true,
          contacts: {
            select: {
              full_name: true,
              avatar: true,
            },
          },
        },
      },

      communities: {
        select: {
          community_id: true,
          name: true,
          photo_url: true,
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
    },
  });

  if (!post) {
    throw httpError(404, "Новость не найдена");
  }

  return normalizeAdminPostDetail(post);
};

exports.deletePost = async (postId) => {
  const post = await prisma.posts.findUnique({
    where: {
      post_id: Number(postId),
    },
    select: {
      post_id: true,
      deleted_at: true,
      attachments: {
        select: {
          file_url: true,
        },
      },
    },
  });

  if (!post) {
    throw httpError(404, "Новость не найдена");
  }

  if (post.deleted_at) {
    throw httpError(400, "Новость уже удалена");
  }

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

// ====================
// Комментарии
// ====================

exports.getPostComments = async ({ postId, take, skip }) => {
  const { limit, offset } = normalizePagination(take, skip);

  const post = await prisma.posts.findUnique({
    where: {
      post_id: Number(postId),
    },
    select: {
      post_id: true,
    },
  });

  if (!post) {
    throw httpError(404, "Новость не найдена");
  }

  const comments = await prisma.post_comments.findMany({
    where: {
      post_id: Number(postId),
    },
    select: {
      comment_id: true,
      post_id: true,
      content: true,
      created_at: true,
      deleted_at: true,

      users: {
        select: {
          user_id: true,
          login: true,
          contacts: {
            select: {
              full_name: true,
              avatar: true,
            },
          },
        },
      },
    },
    orderBy: {
      created_at: "desc",
    },
    take: limit,
    skip: offset,
  });

  return comments.map((comment) => ({
    comment_id: comment.comment_id,
    post_id: comment.post_id,
    content: comment.content,
    created_at: comment.created_at,
    deleted_at: comment.deleted_at,
    status: comment.deleted_at
      ? { value: "deleted", label: "Удалено" }
      : { value: "active", label: "Активно" },

    author: {
      user_id: comment.users.user_id,
      login: comment.users.login,
      full_name: comment.users.contacts?.full_name ?? "Пользователь",
      avatar: comment.users.contacts?.avatar ?? null,
    },
  }));
};

exports.deleteComment = async ({ postId, commentId }) => {
  const comment = await prisma.post_comments.findUnique({
    where: {
      comment_id: Number(commentId),
    },
    select: {
      comment_id: true,
      post_id: true,
      deleted_at: true,
    },
  });

  if (!comment || comment.post_id !== Number(postId)) {
    throw httpError(404, "Комментарий не найден");
  }

  if (comment.deleted_at) {
    throw httpError(400, "Комментарий уже удален");
  }

  await prisma.post_comments.update({
    where: {
      comment_id: Number(commentId),
    },
    data: {
      deleted_at: new Date(),
    },
  });

  return {
    ok: true,
    message: "Комментарий удален",
  };
};

// ====================
// Сообщества
// ====================

function normalizeAdminCommunityListItem(community) {
  return {
    community_id: community.community_id,
    name: community.name,
    description: community.description,
    photo_url: community.photo_url,

    counters: {
      subscribers: community._count.community_subscriptions,
      posts: community._count.posts,
    },

    status: getCommunityStatus(community),
    created_at: community.created_at,
    updated_at: community.updated_at,
  };
}

exports.listCommunities = async ({ search, take, skip }) => {
  const { limit, offset } = normalizePagination(take, skip);

  const communities = await prisma.communities.findMany({
    where: {
      ...(search
        ? {
            OR: [
              {
                name: {
                  contains: String(search),
                  mode: "insensitive",
                },
              },
              {
                description: {
                  contains: String(search),
                  mode: "insensitive",
                },
              },
            ],
          }
        : {}),
    },
    select: {
      community_id: true,
      name: true,
      description: true,
      photo_url: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,

      _count: {
        select: {
          community_subscriptions: {
            where: {
              is_active: true,
            },
          },
          posts: {
            where: {
              deleted_at: null,
            },
          },
        },
      },
    },
    orderBy: {
      created_at: "desc",
    },
    take: limit,
    skip: offset,
  });

  return communities.map(normalizeAdminCommunityListItem);
};

exports.getCommunityById = async (communityId) => {
  const startOfToday = getStartOfToday();

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
      created_at: true,
      updated_at: true,
      deleted_at: true,

      community_categoties: {
        select: {
          community_category_id: true,
          name: true,
        },
      },

      users: {
        select: {
          user_id: true,
          login: true,
          contacts: {
            select: {
              full_name: true,
              avatar: true,
            },
          },
        },
      },

      _count: {
        select: {
          community_subscriptions: {
            where: {
              is_active: true,
            },
          },
          posts: {
            where: {
              deleted_at: null,
            },
          },
        },
      },
    },
  });

  if (!community) {
    throw httpError(404, "Сообщество не найдено");
  }

  const [todayPostsCount, lastPost] = await Promise.all([
    prisma.posts.count({
      where: {
        community_id: Number(communityId),
        deleted_at: null,
        published_at: {
          gte: startOfToday,
        },
      },
    }),

    prisma.posts.findFirst({
      where: {
        community_id: Number(communityId),
        deleted_at: null,
      },
      select: {
        post_id: true,
        published_at: true,
      },
      orderBy: {
        published_at: "desc",
      },
    }),
  ]);

  return {
    community_id: community.community_id,
    name: community.name,
    description: community.description,
    photo_url: community.photo_url,

    category: community.community_categoties
      ? {
          community_category_id:
            community.community_categoties.community_category_id,
          name: community.community_categoties.name,
        }
      : null,

    counters: {
      subscribers: community._count.community_subscriptions,
      posts: community._count.posts,
      posts_today: todayPostsCount,
    },

    activity: {
      last_post_at: lastPost?.published_at ?? null,
      last_activity_text: lastPost
        ? timeAgoRu(lastPost.published_at)
        : "Активности не было",
    },

    creator: {
      user_id: community.users.user_id,
      login: community.users.login,
      full_name: community.users.contacts?.full_name ?? "Пользователь",
      avatar: community.users.contacts?.avatar ?? null,
    },

    status: getCommunityStatus(community),
    created_at: community.created_at,
    updated_at: community.updated_at,
    deleted_at: community.deleted_at,
  };
};

exports.deleteCommunity = async (communityId) => {
  const community = await prisma.communities.findUnique({
    where: {
      community_id: Number(communityId),
    },
    select: {
      community_id: true,
      photo_url: true,
      deleted_at: true,
    },
  });

  if (!community) {
    throw httpError(404, "Сообщество не найдено");
  }

  if (community.deleted_at) {
    throw httpError(400, "Сообщество уже удалено");
  }

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

  if (community.photo_url) {
    await deleteFilesByUrls([community.photo_url]);
  }

  return {
    ok: true,
    message: "Сообщество удалено",
  };
};

// ====================
// Запросы помощи
// ====================

const adminHelpRequestInclude = {
  users: {
    select: {
      user_id: true,
      login: true,
      contacts: {
        select: {
          full_name: true,
          avatar: true,
        },
      },
    },
  },

  help_responses: {
    where: {
      status: {
        in: [
          HELP_RESPONSE_STATUS.ACTIVE,
          HELP_RESPONSE_STATUS.SUCCESSFUL,
        ],
      },
    },
    select: {
      help_response_id: true,
      helper_user_id: true,
      status: true,
      created_at: true,

      users: {
        select: {
          user_id: true,
          login: true,
          contacts: {
            select: {
              full_name: true,
              avatar: true,
            },
          },
        },
      },
    },
    orderBy: {
      created_at: "asc",
    },
  },
};

function getHelpExecutor(request) {
  const successfulResponse = request.help_responses.find(
    (response) => response.status === HELP_RESPONSE_STATUS.SUCCESSFUL
  );

  const activeResponse = request.help_responses.find(
    (response) => response.status === HELP_RESPONSE_STATUS.ACTIVE
  );

  const response = successfulResponse || activeResponse;

  if (!response) return null;

  return {
    help_response_id: response.help_response_id,
    response_status: response.status,
    response_status_label:
      HELP_RESPONSE_STATUS_LABELS[response.status] ?? response.status,
    created_at: response.created_at,

    user: {
      user_id: response.users.user_id,
      login: response.users.login,
      full_name: response.users.contacts?.full_name ?? "Пользователь",
      avatar: response.users.contacts?.avatar ?? null,
    },
  };
}

function normalizeAdminHelpRequestListItem(request) {
  return {
    help_request_id: request.help_request_id,
    title: request.title,
    reward_beads: request.reward_beads ?? 0,

    status: getHelpRequestAdminStatus(request),

    author: {
      user_id: request.users.user_id,
      login: request.users.login,
      full_name: request.users.contacts?.full_name ?? "Пользователь",
      avatar: request.users.contacts?.avatar ?? null,
    },

    executor: getHelpExecutor(request),

    created_at: request.created_at,
    updated_at: request.updated_at,
    deleted_at: request.deleted_at,
  };
}

function normalizeAdminHelpRequestDetail(request) {
  return {
    help_request_id: request.help_request_id,
    title: request.title,
    description: request.description,
    reward_beads: request.reward_beads ?? 0,
    contact_url: request.contact_url,

    status: getHelpRequestAdminStatus(request),

    author: {
      user_id: request.users.user_id,
      login: request.users.login,
      full_name: request.users.contacts?.full_name ?? "Пользователь",
      avatar: request.users.contacts?.avatar ?? null,
    },

    executor: getHelpExecutor(request),

    responses: request.help_responses.map((response) => ({
      help_response_id: response.help_response_id,
      helper_user_id: response.helper_user_id,
      status: response.status,
      status_label:
        HELP_RESPONSE_STATUS_LABELS[response.status] ?? response.status,
      created_at: response.created_at,

      helper: {
        user_id: response.users.user_id,
        login: response.users.login,
        full_name: response.users.contacts?.full_name ?? "Пользователь",
        avatar: response.users.contacts?.avatar ?? null,
      },
    })),

    created_at: request.created_at,
    updated_at: request.updated_at,
    closed_at: request.closed_at,
    deleted_at: request.deleted_at,
  };
}

exports.listHelpRequests = async ({ status, search, take, skip }) => {
  const { limit, offset } = normalizePagination(take, skip);

  const requests = await prisma.help_requests.findMany({
    where: {
      ...(status
        ? {
            status: String(status),
          }
        : {}),

      ...(search
        ? {
            OR: [
              {
                title: {
                  contains: String(search),
                  mode: "insensitive",
                },
              },
              {
                description: {
                  contains: String(search),
                  mode: "insensitive",
                },
              },
            ],
          }
        : {}),
    },
    include: adminHelpRequestInclude,
    orderBy: {
      created_at: "desc",
    },
    take: limit,
    skip: offset,
  });

  return requests.map(normalizeAdminHelpRequestListItem);
};

exports.getHelpRequestById = async (helpRequestId) => {
  const request = await prisma.help_requests.findUnique({
    where: {
      help_request_id: Number(helpRequestId),
    },
    include: adminHelpRequestInclude,
  });

  if (!request) {
    throw httpError(404, "Запрос помощи не найден");
  }

  return normalizeAdminHelpRequestDetail(request);
};

exports.deleteHelpRequest = async (helpRequestId) => {
  const request = await prisma.help_requests.findUnique({
    where: {
      help_request_id: Number(helpRequestId),
    },
    select: {
      help_request_id: true,
      creator_user_id: true,
      reward_beads: true,
      status: true,
      deleted_at: true,

      help_responses: {
        select: {
          help_response_id: true,
          helper_user_id: true,
          status: true,
        },
      },
    },
  });

  if (!request) {
    throw httpError(404, "Запрос помощи не найден");
  }

  if (request.deleted_at) {
    throw httpError(400, "Запрос помощи уже удален");
  }

  const reward = request.reward_beads ?? 0;

  const successfulResponse = request.help_responses.find(
    (response) => response.status === HELP_RESPONSE_STATUS.SUCCESSFUL
  );

  await prisma.$transaction(async (tx) => {
    await tx.help_requests.update({
      where: {
        help_request_id: Number(helpRequestId),
      },
      data: {
        deleted_at: new Date(),
        updated_at: new Date(),
      },
    });

    await tx.help_responses.updateMany({
      where: {
        help_request_id: Number(helpRequestId),
        status: HELP_RESPONSE_STATUS.ACTIVE,
      },
      data: {
        status: HELP_RESPONSE_STATUS.CANCELLED,
      },
    });

    // По твоему правилу:
    // если запрос открыт или выполняется — награда автору НЕ возвращается;
    // если запрос завершен — награда списывается с исполнителя.
    if (
      request.status === HELP_REQUEST_STATUS.COMPLETED &&
      successfulResponse &&
      reward > 0
    ) {
      await tx.contacts.update({
        where: {
          contact_id: Number(successfulResponse.helper_user_id),
        },
        data: {
          beads_balance: {
            decrement: reward,
          },
        },
      });

      await tx.bead_transactions.create({
        data: {
          from_contact_id: Number(successfulResponse.helper_user_id),
          to_contact_id: null,
          amount: reward,
          reason: "Списание награды при удалении завершенного запроса администратором",
        },
      });
    }
  });

  return {
    ok: true,
    message: "Запрос помощи удален",
  };
};