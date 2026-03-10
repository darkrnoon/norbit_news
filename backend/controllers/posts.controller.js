const postsService = require("../services/posts.service");
const httpError = require("../utils/httpError");

exports.create = async (req, res, next) => {
  try {
    const { title, content, community_id, is_community_post } = req.body ?? {};

    const post = await postsService.createPost({
      authorUserId: req.user.userId,
      title,
      content,
      communityId: community_id ?? null,
      isCommunityPost: Boolean(is_community_post),
    });

    res.status(201).json(post);
  } catch (e) {
    next(e);
  }
};

exports.getFeed = async (req, res, next) => {
  try {
    const feed = await postsService.getFeed({
      communityId: req.query.communityId,
      authorId: req.query.authorId,
      pinnedOnly: req.query.pinnedOnly,
      take: req.query.take,
      skip: req.query.skip,
    });
    res.json(feed);
  } catch (e) {
    next(e);
  }
};

exports.getMyCommunitiesFeed = async (req, res, next) => {
  try {
    const feed = await postsService.getMyCommunitiesFeed({
      userId: req.user.userId,
      take: req.query.take,
      skip: req.query.skip,
      pinnedOnly: req.query.pinnedOnly,
    });
    res.json(feed);
  } catch (e) {
    next(e);
  }
};

exports.getById = async (req, res, next) => {
  try {
    const postId = Number(req.params.id);
    if (!Number.isFinite(postId)) throw httpError(400, "Invalid post id");

    const post = await postsService.getPostById(postId);
    res.json(post);
  } catch (e) {
    next(e);
  }
};

exports.update = async (req, res, next) => {
  try {
    const postId = Number(req.params.id);
    if (!Number.isFinite(postId)) throw httpError(400, "Invalid post id");

    const { title, content, community_id, is_community_post } = req.body ?? {};

    const post = await postsService.updatePost({
      postId,
      actorUserId: req.user.userId,
      actorRoleId: req.user.roleId,
      title,
      content,
      communityId: community_id ?? null,
      isCommunityPost: Boolean(is_community_post),
});

    res.json(post);
  } catch (e) {
    next(e);
  }
};

exports.remove = async (req, res, next) => {
  try {
    const postId = Number(req.params.id);
    if (!Number.isFinite(postId)) throw httpError(400, "Invalid post id");

    const result = await postsService.deletePost({
      postId,
      actorUserId: req.user.userId,
      actorRoleId: req.user.roleId,
    });

    res.json(result);
  } catch (e) {
    next(e);
  }
};

exports.pin = async (req, res, next) => {
  try {
    const postId = Number(req.params.id);
    if (!Number.isFinite(postId)) throw httpError(400, "Invalid post id");

    const pin = await postsService.pinPost({
      postId,
      actorUserId: req.user.userId,
      actorRoleId: req.user.roleId,
    });

    res.status(201).json(pin);
  } catch (e) {
    next(e);
  }
};

exports.unpin = async (req, res, next) => {
  try {
    const postId = Number(req.params.id);
    if (!Number.isFinite(postId)) throw httpError(400, "Invalid post id");

    const result = await postsService.unpinPost({
      postId,
      actorRoleId: req.user.roleId,
    });

    res.json(result);
  } catch (e) {
    next(e);
  }
};