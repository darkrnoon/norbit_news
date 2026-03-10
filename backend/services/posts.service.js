// services/posts.service.js
const prisma = require("../db/prisma");
const httpError = require("../utils/httpError");
const { ensureOwnerOrModerator } = require("./ownership.service");
const { canPinPosts } = require("./permission.service");

// Единый include для всех выдач постов (ФИО/должность/аватар автора + сообщество + закреп + вложения)
const postInclude = {
  post_pins: { where: { is_active: true } },
  communities: { select: { community_id: true, name: true } },
  attachments: true,
  users: {
    select: {
      user_id: true,
      login: true,
      role_id: true,
      contacts: {
        select: {
          full_name: true,
          position: true,
          avatar: true,
        },
      },
    },
  },
};

exports.createPost = async ({ authorUserId, title, content, communityId, isCommunityPost }) => {
  const isCommunity = Boolean(isCommunityPost);

  // Если пост "от лица сообщества" — communityId обязателен
  if (isCommunity) {
    if (!communityId) throw httpError(400, "community_id is required for community post");

    // Проверяем подписку пользователя на сообщество
    const sub = await prisma.community_subscriptions.findUnique({
      where: {
        community_id_user_id: {
          community_id: Number(communityId),
          user_id: Number(authorUserId),
        },
      },
      select: { is_active: true },
    });

    if (!sub || !sub.is_active) throw httpError(403, "You are not subscribed to this community");

    // Проверяем, что сообщество не удалено
    const community = await prisma.communities.findUnique({
      where: { community_id: Number(communityId) },
      select: { deleted_at: true },
    });
    if (!community || community.deleted_at) throw httpError(404, "Community not found");
  }

  const post = await prisma.posts.create({
    data: {
      author_user_id: Number(authorUserId),
      title: title ?? null,
      content: content ?? null,
      community_id: isCommunity ? Number(communityId) : null,
      is_community_post: isCommunity,
    },
    include: postInclude,
  });

  return post;
};

exports.getPostById = async (postId) => {
  const post = await prisma.posts.findUnique({
    where: { post_id: Number(postId) },
    include: postInclude,
  });

  if (!post || post.deleted_at) throw httpError(404, "Post not found");
  return post;
};

exports.updatePost = async ({ postId, actorUserId, actorRoleId, title, content, communityId, isCommunityPost }) => {
  const post = await prisma.posts.findUnique({
    where: { post_id: Number(postId) },
    select: { post_id: true, author_user_id: true, deleted_at: true },
  });
  if (!post || post.deleted_at) throw httpError(404, "Post not found");

  ensureOwnerOrModerator({ actorUserId: Number(actorUserId), actorRoleId: Number(actorRoleId), ownerUserId: post.author_user_id });

  const isCommunity = Boolean(isCommunityPost);

  // если делаем пост от сообщества — проверяем подписку
  if (isCommunity) {
    if (!communityId) throw httpError(400, "community_id is required for community post");

    const sub = await prisma.community_subscriptions.findUnique({
      where: {
        community_id_user_id: {
          community_id: Number(communityId),
          user_id: Number(actorUserId),
        },
      },
      select: { is_active: true },
    });

    if (!sub || !sub.is_active) throw httpError(403, "You are not subscribed to this community");
  }

  return prisma.posts.update({
    where: { post_id: Number(postId) },
    data: {
      title: title ?? undefined,
      content: content ?? undefined,
      community_id: isCommunity ? Number(communityId) : null,
      is_community_post: isCommunity,
      updated_at: new Date(),
    },
    include: postInclude,
  });
};

exports.deletePost = async ({ postId, actorUserId, actorRoleId }) => {
  const post = await prisma.posts.findUnique({
    where: { post_id: Number(postId) },
    select: { post_id: true, author_user_id: true, deleted_at: true },
  });
  if (!post || post.deleted_at) throw httpError(404, "Post not found");

  ensureOwnerOrModerator({
    actorUserId: Number(actorUserId),
    actorRoleId: Number(actorRoleId),
    ownerUserId: post.author_user_id,
  });

  // soft delete
  await prisma.posts.update({
    where: { post_id: Number(postId) },
    data: { deleted_at: new Date(), updated_at: new Date() },
  });

  return { ok: true };
};

exports.pinPost = async ({ postId, actorUserId, actorRoleId }) => {
  if (!canPinPosts(Number(actorRoleId))) throw httpError(403, "Forbidden");

  const post = await prisma.posts.findUnique({
    where: { post_id: Number(postId) },
    select: { post_id: true, deleted_at: true },
  });
  if (!post || post.deleted_at) throw httpError(404, "Post not found");

  // Деактивируем старые активные pin
  await prisma.post_pins.updateMany({
    where: { post_id: Number(postId), is_active: true },
    data: { is_active: false },
  });

  const pin = await prisma.post_pins.create({
    data: {
      post_id: Number(postId),
      pinned_by_user_id: Number(actorUserId),
      is_active: true,
    },
  });

  return pin;
};

exports.unpinPost = async ({ postId, actorRoleId }) => {
  if (!canPinPosts(Number(actorRoleId))) throw httpError(403, "Forbidden");

  await prisma.post_pins.updateMany({
    where: { post_id: Number(postId), is_active: true },
    data: { is_active: false },
  });

  return { ok: true };
};

exports.getFeed = async ({ communityId, authorId, pinnedOnly, take = 20, skip = 0 }) => {
  take = Math.min(Math.max(Number(take) || 20, 1), 50);
  skip = Math.max(Number(skip) || 0, 0);

  const where = {
    deleted_at: null,
    ...(communityId ? { community_id: Number(communityId) } : {}),
    ...(authorId ? { author_user_id: Number(authorId) } : {}),
  };

  // только закрепленные
  if (pinnedOnly === "true") {
    return prisma.posts.findMany({
      where: { ...where, post_pins: { some: { is_active: true } } },
      include: postInclude,
      orderBy: [{ published_at: "desc" }],
      take,
      skip,
    });
  }

  // закрепленные сверху
  const pinned = await prisma.posts.findMany({
    where: { ...where, post_pins: { some: { is_active: true } } },
    include: postInclude,
    orderBy: [{ published_at: "desc" }],
    take: 10,
  });

  const pinnedIds = pinned.map((p) => p.post_id);

  const others = await prisma.posts.findMany({
    where: {
      ...where,
      ...(pinnedIds.length ? { post_id: { notIn: pinnedIds } } : {}),
    },
    include: postInclude,
    orderBy: [{ published_at: "desc" }],
    take,
    skip,
  });

  return [...pinned, ...others];
};

exports.getMyCommunitiesFeed = async ({ userId, take = 20, skip = 0 }) => {
  take = Math.min(Math.max(Number(take) || 20, 1), 50);
  skip = Math.max(Number(skip) || 0, 0);

  const subs = await prisma.community_subscriptions.findMany({
    where: { user_id: Number(userId), is_active: true },
    select: { community_id: true },
  });

  const communityIds = subs.map((s) => s.community_id);
  if (communityIds.length === 0) return [];

  return prisma.posts.findMany({
    where: {
      deleted_at: null,
      community_id: { in: communityIds },
    },
    include: postInclude,
    orderBy: [{ published_at: "desc" }],
    take,
    skip,
  });
};