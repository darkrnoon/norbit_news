const postsService = require("../services/posts.service");
const httpError = require("../utils/httpError");
const { cleanupUploadedFiles } = require("../utils/file.utils");

function parseBoolean(value) {
  return value === true || value === "true" || value === "1";
}

function parseOptionalNumber(value) {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  const number = Number(value);

  if (!Number.isInteger(number) || number <= 0) {
    return null;
  }

  return number;
}

function getUploadedAttachments(files = []) {
  return files.map((file) => ({
    file_url: `/uploads/posts/${file.filename}`,
  }));
}

exports.create = async (req, res, next) => {
  try {
    const { title, content } = req.body ?? {};

    const communityId = parseOptionalNumber(req.body?.community_id);
    const isCommunityPost = parseBoolean(req.body?.is_community_post);
    const attachments = getUploadedAttachments(req.files);

    const post = await postsService.createPost({
      authorUserId: req.user.userId,
      currentUserRoleName: req.user.roleName,
      title,
      content,
      communityId,
      isCommunityPost,
      attachments,
    });

    res.status(201).json(post);
  } catch (e) {
    await cleanupUploadedFiles(req.files);
    next(e);
  }
};

exports.getFeed = async (req, res, next) => {
  try {
    const feed = await postsService.getFeed({
      currentUserId: req.user.userId,
      currentUserRoleName: req.user.roleName,
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
      currentUserId: req.user.userId,
      currentUserRoleName: req.user.roleName,
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

    if (!Number.isInteger(postId) || postId <= 0) {
      throw httpError(400, "Некорректный идентификатор новости");
    }

    const post = await postsService.getPostById({
      postId,
      currentUserId: req.user.userId,
      currentUserRoleName: req.user.roleName,
    });

    res.json(post);
  } catch (e) {
    next(e);
  }
};

exports.update = async (req, res, next) => {
  try {
    const postId = Number(req.params.id);

    if (!Number.isInteger(postId) || postId <= 0) {
      throw httpError(400, "Некорректный идентификатор новости");
    }

    const { title, content } = req.body ?? {};

    const communityId = parseOptionalNumber(req.body?.community_id);
    const isCommunityPost = parseBoolean(req.body?.is_community_post);
    const attachments = getUploadedAttachments(req.files);

    const post = await postsService.updatePost({
      postId,
      actorUserId: req.user.userId,
      currentUserRoleName: req.user.roleName,
      title,
      content,
      communityId,
      isCommunityPost,
      attachments,
      replaceAttachments: req.files && req.files.length > 0,
    });

    res.json(post);
  } catch (e) {
    await cleanupUploadedFiles(req.files);
    next(e);
  }
};

exports.remove = async (req, res, next) => {
  try {
    const postId = Number(req.params.id);

    if (!Number.isInteger(postId) || postId <= 0) {
      throw httpError(400, "Некорректный идентификатор новости");
    }

    const result = await postsService.deletePost({
      postId,
      actorUserId: req.user.userId,
      actorRoleName: req.user.roleName,
    });

    res.json(result);
  } catch (e) {
    next(e);
  }
};

exports.pin = async (req, res, next) => {
  try {
    const postId = Number(req.params.id);

    if (!Number.isInteger(postId) || postId <= 0) {
      throw httpError(400, "Некорректный идентификатор новости");
    }

    const pin = await postsService.pinPost({
      postId,
      actorUserId: req.user.userId,
      actorRoleName: req.user.roleName,
    });

    res.status(201).json(pin);
  } catch (e) {
    next(e);
  }
};

exports.unpin = async (req, res, next) => {
  try {
    const postId = Number(req.params.id);

    if (!Number.isInteger(postId) || postId <= 0) {
      throw httpError(400, "Некорректный идентификатор новости");
    }

    const result = await postsService.unpinPost({
      postId,
      actorRoleName: req.user.roleName,
    });

    res.json(result);
  } catch (e) {
    next(e);
  }
};