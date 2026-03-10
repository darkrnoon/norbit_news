const communitiesService = require("../services/communities.service");
const httpError = require("../utils/httpError");

exports.create = async (req, res, next) => {
  try {
    const { name, description, photo_url, community_category_id } = req.body ?? {};
    if (!name) throw httpError(400, "name is required");
    if (!community_category_id) throw httpError(400, "community_category_id is required");

    const community = await communitiesService.create({
      creatorUserId: req.user.userId,
      name,
      description: description ?? null,
      photoUrl: photo_url ?? null,
      categoryId: Number(community_category_id),
    });

    res.status(201).json(community);
  } catch (e) {
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
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) throw httpError(400, "Invalid community id");

    const data = await communitiesService.getById({ communityId: id, userId: req.user.userId });
    res.json(data);
  } catch (e) {
    next(e);
  }
};

exports.update = async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) throw httpError(400, "Invalid community id");

    const { name, description, photo_url, community_category_id } = req.body ?? {};
    if (
      name === undefined &&
      description === undefined &&
      photo_url === undefined &&
      community_category_id === undefined
    ) {
      throw httpError(400, "Nothing to update");
    }

    const updated = await communitiesService.update({
      communityId: id,
      actorUserId: req.user.userId,
      actorRoleId: req.user.roleId,
      patch: {
        name,
        description,
        photo_url,
        community_category_id,
      },
    });

    res.json(updated);
  } catch (e) {
    next(e);
  }
};

exports.remove = async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) throw httpError(400, "Invalid community id");

    const result = await communitiesService.remove({
      communityId: id,
      actorUserId: req.user.userId,
      actorRoleId: req.user.roleId,
    });

    res.json(result);
  } catch (e) {
    next(e);
  }
};

exports.subscribe = async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) throw httpError(400, "Invalid community id");

    const result = await communitiesService.subscribe({
      communityId: id,
      userId: req.user.userId,
    });

    res.status(201).json(result);
  } catch (e) {
    next(e);
  }
};

exports.unsubscribe = async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) throw httpError(400, "Invalid community id");

    const result = await communitiesService.unsubscribe({
      communityId: id,
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
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) throw httpError(400, "Invalid community id");

    const data = await communitiesService.posts({
      communityId: id,
      take: req.query.take,
      skip: req.query.skip,
    });

    res.json(data);
  } catch (e) {
    next(e);
  }
};