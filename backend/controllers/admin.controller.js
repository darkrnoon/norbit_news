const adminService = require("../services/admin.service");
const httpError = require("../utils/httpError");

function parsePositiveId(value, message) {
  const id = Number(value);

  if (!Number.isInteger(id) || id <= 0) {
    throw httpError(400, message);
  }

  return id;
}

exports.stats = async (req, res, next) => {
  try {
    const data = await adminService.getStats();
    res.json(data);
  } catch (e) {
    next(e);
  }
};

// Новости

exports.listPosts = async (req, res, next) => {
  try {
    const data = await adminService.listPosts({
      search: req.query.search,
      take: req.query.take,
      skip: req.query.skip,
    });

    res.json(data);
  } catch (e) {
    next(e);
  }
};

exports.getPostById = async (req, res, next) => {
  try {
    const postId = parsePositiveId(
      req.params.id,
      "Некорректный идентификатор новости"
    );

    const data = await adminService.getPostById(postId);
    res.json(data);
  } catch (e) {
    next(e);
  }
};

exports.deletePost = async (req, res, next) => {
  try {
    const postId = parsePositiveId(
      req.params.id,
      "Некорректный идентификатор новости"
    );

    const result = await adminService.deletePost(postId);
    res.json(result);
  } catch (e) {
    next(e);
  }
};

// Комментарии

exports.getPostComments = async (req, res, next) => {
  try {
    const postId = parsePositiveId(
      req.params.id,
      "Некорректный идентификатор новости"
    );

    const data = await adminService.getPostComments({
      postId,
      take: req.query.take,
      skip: req.query.skip,
    });

    res.json(data);
  } catch (e) {
    next(e);
  }
};

exports.deleteComment = async (req, res, next) => {
  try {
    const postId = parsePositiveId(
      req.params.postId,
      "Некорректный идентификатор новости"
    );

    const commentId = parsePositiveId(
      req.params.commentId,
      "Некорректный идентификатор комментария"
    );

    const result = await adminService.deleteComment({
      postId,
      commentId,
    });

    res.json(result);
  } catch (e) {
    next(e);
  }
};

// Сообщества

exports.listCommunities = async (req, res, next) => {
  try {
    const data = await adminService.listCommunities({
      search: req.query.search,
      take: req.query.take,
      skip: req.query.skip,
    });

    res.json(data);
  } catch (e) {
    next(e);
  }
};

exports.getCommunityById = async (req, res, next) => {
  try {
    const communityId = parsePositiveId(
      req.params.id,
      "Некорректный идентификатор сообщества"
    );

    const data = await adminService.getCommunityById(communityId);
    res.json(data);
  } catch (e) {
    next(e);
  }
};

exports.deleteCommunity = async (req, res, next) => {
  try {
    const communityId = parsePositiveId(
      req.params.id,
      "Некорректный идентификатор сообщества"
    );

    const result = await adminService.deleteCommunity(communityId);
    res.json(result);
  } catch (e) {
    next(e);
  }
};

// Запросы помощи

exports.listHelpRequests = async (req, res, next) => {
  try {
    const data = await adminService.listHelpRequests({
      status: req.query.status,
      search: req.query.search,
      take: req.query.take,
      skip: req.query.skip,
    });

    res.json(data);
  } catch (e) {
    next(e);
  }
};

exports.getHelpRequestById = async (req, res, next) => {
  try {
    const helpRequestId = parsePositiveId(
      req.params.id,
      "Некорректный идентификатор запроса помощи"
    );

    const data = await adminService.getHelpRequestById(helpRequestId);
    res.json(data);
  } catch (e) {
    next(e);
  }
};

exports.deleteHelpRequest = async (req, res, next) => {
  try {
    const helpRequestId = parsePositiveId(
      req.params.id,
      "Некорректный идентификатор запроса помощи"
    );

    const result = await adminService.deleteHelpRequest(helpRequestId);
    res.json(result);
  } catch (e) {
    next(e);
  }
};