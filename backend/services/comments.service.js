const prisma = require("../utils/prisma");
const httpError = require("../utils/httpError");
const { canModerate } = require("./permission.service");

async function ensurePostAvailable(postId) {
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

  return post;
}

function normalizeComment(comment) {
  return {
    comment_id: comment.comment_id,
    post_id: comment.post_id,
    content: comment.content,
    created_at: comment.created_at,

    author: {
      user_id: comment.users.user_id,
      login: comment.users.login,
      avatar: comment.users.contacts?.avatar ?? null,
      full_name: comment.users.contacts?.full_name ?? "Пользователь",
    },
  };
}

const commentSelect = {
  comment_id: true,
  post_id: true,
  content: true,
  created_at: true,
  users: {
    select: {
      user_id: true,
      login: true,
      contacts: {
        select: {
          avatar: true,
          full_name: true,
        },
      },
    },
  },
};

exports.getCommentsByPost = async ({ postId, take = 30, skip = 0 }) => {
  await ensurePostAvailable(postId);

  const limit = Math.min(Math.max(Number(take) || 30, 1), 100);
  const offset = Math.max(Number(skip) || 0, 0);

  const comments = await prisma.post_comments.findMany({
    where: {
      post_id: Number(postId),
      deleted_at: null,
    },
    select: commentSelect,
    orderBy: {
      created_at: "asc",
    },
    take: limit,
    skip: offset,
  });

  return comments.map(normalizeComment);
};

exports.createComment = async ({ postId, userId, content }) => {
  await ensurePostAvailable(postId);

  const normalizedContent = content?.trim();

  if (!normalizedContent) {
    throw httpError(400, "Введите текст комментария");
  }

  if (normalizedContent.length > 2000) {
    throw httpError(400, "Комментарий не должен превышать 2000 символов");
  }

  const comment = await prisma.post_comments.create({
    data: {
      post_id: Number(postId),
      user_id: Number(userId),
      content: normalizedContent,
    },
    select: commentSelect,
  });

  const commentsCount = await prisma.post_comments.count({
    where: {
      post_id: Number(postId),
      deleted_at: null,
    },
  });

  return {
    ...normalizeComment(comment),
    comments_count: commentsCount,
  };
};

exports.deleteComment = async ({
  postId,
  commentId,
  actorUserId,
  actorRoleName,
}) => {
  const comment = await prisma.post_comments.findUnique({
    where: {
      comment_id: Number(commentId),
    },
    select: {
      comment_id: true,
      post_id: true,
      user_id: true,
      deleted_at: true,
      posts: {
        select: {
          deleted_at: true,
          communities: {
            select: {
              deleted_at: true,
            },
          },
        },
      },
    },
  });

  if (
    !comment ||
    comment.deleted_at ||
    comment.post_id !== Number(postId) ||
    comment.posts.deleted_at ||
    comment.posts.communities?.deleted_at
  ) {
    throw httpError(404, "Комментарий не найден");
  }

  const isOwner = Number(comment.user_id) === Number(actorUserId);
  const isModerator = canModerate(actorRoleName);

  if (!isOwner && !isModerator) {
    throw httpError(403, "Недостаточно прав для удаления комментария");
  }

  await prisma.post_comments.update({
    where: {
      comment_id: Number(commentId),
    },
    data: {
      deleted_at: new Date(),
    },
  });

  const commentsCount = await prisma.post_comments.count({
    where: {
      post_id: Number(postId),
      deleted_at: null,
    },
  });

  return {
    ok: true,
    comments_count: commentsCount,
    message: "Комментарий удален",
  };
};