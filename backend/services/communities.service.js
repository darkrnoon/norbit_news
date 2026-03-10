const prisma = require("../db/prisma");
const httpError = require("../utils/httpError");
const { ensureOwnerOrModerator } = require("./ownership.service");

exports.categories = async () => {
  return prisma.community_categoties.findMany({
    select: {
      community_category_id: true,
      name: true,
    },
    orderBy: { name: "asc" },
  });
};

exports.create = async ({ creatorUserId, name, description, photoUrl, categoryId }) => {
  const cat = await prisma.community_categoties.findUnique({
    where: { community_category_id: categoryId },
    select: { community_category_id: true },
  });
  if (!cat) throw httpError(404, "Category not found");

  return prisma.communities.create({
    data: {
      name,
      description,
      photo_url: photoUrl,
      community_category_id: categoryId,
      creator_user_id: creatorUserId,
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
    },
  });
};

exports.list = async ({ userId, categoryId, search, take = 20, skip = 0 }) => {
  take = Math.min(Math.max(Number(take) || 20, 1), 50);
  skip = Math.max(Number(skip) || 0, 0);

  const where = {
    deleted_at: null,
    ...(categoryId ? { community_category_id: Number(categoryId) } : {}),
    ...(search
      ? { name: { contains: String(search), mode: "insensitive" } }
      : {}),
  };

  const items = await prisma.communities.findMany({
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
      community_subscriptions: {
        where: { user_id: Number(userId), is_active: true },
        select: { user_id: true },
      },
      _count: { select: { community_subscriptions: true } },
    },
    orderBy: { created_at: "desc" },
    take,
    skip,
  });

  return items.map((c) => ({
    community_id: c.community_id,
    name: c.name,
    description: c.description,
    photo_url: c.photo_url,
    community_category_id: c.community_category_id,
    category_name: c.community_categoties?.name || null,
    creator_user_id: c.creator_user_id,
    created_at: c.created_at,
    updated_at: c.updated_at,
    isSubscribed: c.community_subscriptions.length > 0,
    subscribersCount: c._count.community_subscriptions,
  }));
};

exports.getById = async ({ communityId, userId }) => {
  const c = await prisma.communities.findUnique({
    where: { community_id: communityId },
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
      community_subscriptions: {
        where: { user_id: Number(userId), is_active: true },
        select: { user_id: true },
      },
    },
  });

  if (!c || c.deleted_at) throw httpError(404, "Community not found");

  const subscribersCount = await prisma.community_subscriptions.count({
    where: { community_id: communityId, is_active: true },
  });

  const postsCount = await prisma.posts.count({
    where: { community_id: communityId, deleted_at: null },
  });

  return {
    community_id: c.community_id,
    name: c.name,
    description: c.description,
    photo_url: c.photo_url,
    community_category_id: c.community_category_id,
    category_name: c.community_categoties?.name || null,
    creator_user_id: c.creator_user_id,
    created_at: c.created_at,
    updated_at: c.updated_at,
    isSubscribed: c.community_subscriptions.length > 0,
    subscribersCount,
    postsCount,
  };
};

exports.update = async ({ communityId, actorUserId, actorRoleId, patch }) => {
  const existing = await prisma.communities.findUnique({
    where: { community_id: communityId },
    select: { community_id: true, creator_user_id: true, deleted_at: true },
  });
  if (!existing || existing.deleted_at) throw httpError(404, "Community not found");

  ensureOwnerOrModerator({
    actorUserId,
    actorRoleId,
    ownerUserId: existing.creator_user_id,
  });

  if (patch.community_category_id !== undefined && patch.community_category_id !== null) {
    const cat = await prisma.community_categoties.findUnique({
      where: { community_category_id: Number(patch.community_category_id) },
      select: { community_category_id: true },
    });
    if (!cat) throw httpError(404, "Category not found");
  }

  return prisma.communities.update({
    where: { community_id: communityId },
    data: {
      name: patch.name ?? undefined,
      description: patch.description ?? undefined,
      photo_url: patch.photo_url ?? undefined,
      community_category_id:
        patch.community_category_id !== undefined
          ? Number(patch.community_category_id)
          : undefined,
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
    },
  });
};

exports.remove = async ({ communityId, actorUserId, actorRoleId }) => {
  const existing = await prisma.communities.findUnique({
    where: { community_id: communityId },
    select: { community_id: true, creator_user_id: true, deleted_at: true },
  });
  if (!existing || existing.deleted_at) throw httpError(404, "Community not found");

  ensureOwnerOrModerator({
    actorUserId,
    actorRoleId,
    ownerUserId: existing.creator_user_id,
  });

  await prisma.communities.update({
    where: { community_id: communityId },
    data: { deleted_at: new Date(), updated_at: new Date() },
  });

  return { ok: true };
};

exports.subscribe = async ({ communityId, userId }) => {
  const c = await prisma.communities.findUnique({
    where: { community_id: communityId },
    select: { deleted_at: true },
  });
  if (!c || c.deleted_at) throw httpError(404, "Community not found");

  const sub = await prisma.community_subscriptions.upsert({
    where: {
      community_id_user_id: {
        community_id: communityId,
        user_id: Number(userId),
      },
    },
    update: {
      is_active: true,
      subscribed_at: new Date(),
    },
    create: {
      community_id: communityId,
      user_id: Number(userId),
      is_active: true,
      subscribed_at: new Date(),
    },
  });

  return sub;
};

exports.unsubscribe = async ({ communityId, userId }) => {
  await prisma.community_subscriptions.updateMany({
    where: { community_id: communityId, user_id: Number(userId), is_active: true },
    data: { is_active: false },
  });

  return { ok: true };
};

exports.mySubscriptions = async (userId) => {
  const subs = await prisma.community_subscriptions.findMany({
    where: { user_id: Number(userId), is_active: true },
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
          deleted_at: true,
          community_categoties: {
            select: {
              community_category_id: true,
              name: true,
            },
          },
        },
      },
    },
    orderBy: { subscribed_at: "desc" },
  });

  return subs
    .map((s) => s.communities)
    .filter((c) => c && !c.deleted_at)
    .map((c) => ({
      community_id: c.community_id,
      name: c.name,
      description: c.description,
      photo_url: c.photo_url,
      community_category_id: c.community_category_id,
      category_name: c.community_categoties?.name || null,
      creator_user_id: c.creator_user_id,
      created_at: c.created_at,
      updated_at: c.updated_at,
    }));
};

exports.posts = async ({ communityId, take = 20, skip = 0 }) => {
  take = Math.min(Math.max(Number(take) || 20, 1), 50);
  skip = Math.max(Number(skip) || 0, 0);

  const c = await prisma.communities.findUnique({
    where: { community_id: communityId },
    select: { deleted_at: true },
  });
  if (!c || c.deleted_at) throw httpError(404, "Community not found");

  const pinned = await prisma.posts.findMany({
    where: {
      community_id: communityId,
      deleted_at: null,
      post_pins: { some: { is_active: true } },
    },
    include: {
      post_pins: { where: { is_active: true } },
      users: { select: { user_id: true, login: true, role_id: true, contacts: true } },
      attachments: true,
      communities: true,
    },
    orderBy: { published_at: "desc" },
  });

  const regular = await prisma.posts.findMany({
    where: {
      community_id: communityId,
      deleted_at: null,
      NOT: { post_pins: { some: { is_active: true } } },
    },
    include: {
      post_pins: { where: { is_active: true } },
      users: { select: { user_id: true, login: true, role_id: true, contacts: true } },
      attachments: true,
      communities: true,
    },
    orderBy: { published_at: "desc" },
    take,
    skip,
  });

  return [...pinned, ...regular];
};