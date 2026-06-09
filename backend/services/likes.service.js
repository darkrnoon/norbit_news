const prisma = require("../utils/prisma");
const httpError = require("../utils/httpError");

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

exports.likePost = async ({ postId, userId }) => {
  await ensurePostAvailable(postId);

  await prisma.post_likes.upsert({
    where: {
      post_id_user_id: {
        post_id: Number(postId),
        user_id: Number(userId),
      },
    },
    update: {},
    create: {
      post_id: Number(postId),
      user_id: Number(userId),
    },
  });

  const likesCount = await prisma.post_likes.count({
    where: {
      post_id: Number(postId),
    },
  });

  return {
    ok: true,
    is_liked: true,
    likes_count: likesCount,
    message: "Лайк поставлен",
  };
};

exports.unlikePost = async ({ postId, userId }) => {
  await ensurePostAvailable(postId);

  await prisma.post_likes.deleteMany({
    where: {
      post_id: Number(postId),
      user_id: Number(userId),
    },
  });

  const likesCount = await prisma.post_likes.count({
    where: {
      post_id: Number(postId),
    },
  });

  return {
    ok: true,
    is_liked: false,
    likes_count: likesCount,
    message: "Лайк убран",
  };
};