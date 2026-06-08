const communitiesService = require("../services/communities.service");
const httpError = require("../utils/httpError");
const { cleanupUploadedFiles } = require("../utils/file.utils");

function parsePositiveId(value, errorMessage) {
  const id = Number(value);

  if (!Number.isInteger(id) || id <= 0) {
    throw httpError(400, errorMessage);
  }

  return id;
}

function getCommunityAvatarUrl(file) {
  if (!file) return undefined;
  return `/uploads/communities/${file.filename}`;
}

async function cleanupUploadedAvatar(file) {
  if (file) {
    await cleanupUploadedFiles([file]);
  }
}

exports.create = async (req, res, next) => {
  try {
    const { name, description } = req.body ?? {};

    const categoryId = parsePositiveId(
      req.body?.community_category_id,
      "Выберите категорию сообщества"
    );

    const photoUrl = getCommunityAvatarUrl(req.file) ?? null;

    const community = await communitiesService.create({
      creatorUserId: req.user.userId,
      name,
      description: description ?? null,
      photoUrl,
      categoryId,
    });

    res.status(201).json(community);
  } catch (e) {
    await cleanupUploadedAvatar(req.file);
    next(e);
  }
};

exports.categories = async (req, res, next) => {
  try {
    const data = await communitiesService.categories();
    res.json(data);
  } catch (e) {
    next(e);
  }
};

exports.list = async (req, res, next) => {
  try {
    const data = await communitiesService.list({
      userId: req.user.userId,
      categoryId: req.query.categoryId,
      search: req.query.search,
      take: req.query.take,
      skip: req.query.skip,
    });

    res.json(data);
  } catch (e) {
    next(e);
  }
};

exports.getById = async (req, res, next) => {
  try {
    const communityId = parsePositiveId(
      req.params.id,
      "Некорректный идентификатор сообщества"
    );

    const data = await communitiesService.getById({
      communityId,
      userId: req.user.userId,
    });

    res.json(data);
  } catch (e) {
    next(e);
  }
};

exports.update = async (req, res, next) => {
  try {
    const communityId = parsePositiveId(
      req.params.id,
      "Некорректный идентификатор сообщества"
    );

    const { name, description } = req.body ?? {};

    const hasCategory = req.body?.community_category_id !== undefined;
    const hasAvatar = Boolean(req.file);

    if (
      name === undefined &&
      description === undefined &&
      !hasCategory &&
      !hasAvatar
    ) {
      throw httpError(400, "Нет данных для обновления");
    }

    const categoryId = hasCategory
      ? parsePositiveId(
          req.body.community_category_id,
          "Некорректная категория сообщества"
        )
      : undefined;

    const photoUrl = getCommunityAvatarUrl(req.file);

    const updated = await communitiesService.update({
      communityId,
      actorUserId: req.user.userId,
      patch: {
        name,
        description,
        photoUrl,
        categoryId,
      },
    });

    res.json(updated);
  } catch (e) {
    await cleanupUploadedAvatar(req.file);
    next(e);
  }
};

exports.remove = async (req, res, next) => {
  try {
    const communityId = parsePositiveId(
      req.params.id,
      "Некорректный идентификатор сообщества"
    );

    const result = await communitiesService.remove({
      communityId,
      actorUserId: req.user.userId,
      actorRoleName: req.user.roleName,
    });

    res.json(result);
  } catch (e) {
    next(e);
  }
};

exports.subscribe = async (req, res, next) => {
  try {
    const communityId = parsePositiveId(
      req.params.id,
      "Некорректный идентификатор сообщества"
    );

    const result = await communitiesService.subscribe({
      communityId,
      userId: req.user.userId,
    });

    res.status(201).json(result);
  } catch (e) {
    next(e);
  }
};

exports.unsubscribe = async (req, res, next) => {
  try {
    const communityId = parsePositiveId(
      req.params.id,
      "Некорректный идентификатор сообщества"
    );

    const result = await communitiesService.unsubscribe({
      communityId,
      userId: req.user.userId,
    });

    res.json(result);
  } catch (e) {
    next(e);
  }
};

exports.mySubscriptions = async (req, res, next) => {
  try {
    const list = await communitiesService.mySubscriptions(req.user.userId);
    res.json(list);
  } catch (e) {
    next(e);
  }
};

exports.posts = async (req, res, next) => {
  try {
    const communityId = parsePositiveId(
      req.params.id,
      "Некорректный идентификатор сообщества"
    );

    const data = await communitiesService.posts({
      communityId,
      currentUserId: req.user.userId,
      currentUserRoleName: req.user.roleName,
      take: req.query.take,
      skip: req.query.skip,
    });

    res.json(data);
  } catch (e) {
    next(e);
  }
};