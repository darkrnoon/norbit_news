const commentsService = require("../services/comments.service");
const httpError = require("../utils/httpError");

function parsePositiveId(value, message) {
  const id = Number(value);

  if (!Number.isInteger(id) || id <= 0) {
    throw httpError(400, message);
  }

  return id;
}

exports.getByPost = async (req, res, next) => {
  try {
    const postId = parsePositiveId(
      req.params.id,
      "Некорректный идентификатор новости"
    );

    const comments = await commentsService.getCommentsByPost({
      postId,
      take: req.query.take,
      skip: req.query.skip,
    });

    res.json(comments);
  } catch (e) {
    next(e);
  }
};

exports.create = async (req, res, next) => {
  try {
    const postId = parsePositiveId(
      req.params.id,
      "Некорректный идентификатор новости"
    );

    const { content } = req.body ?? {};

    const comment = await commentsService.createComment({
      postId,
      userId: req.user.userId,
      content,
    });

    res.status(201).json(comment);
  } catch (e) {
    next(e);
  }
};

exports.remove = async (req, res, next) => {
  try {
    const postId = parsePositiveId(
      req.params.postId,
      "Некорректный идентификатор новости"
    );

    const commentId = parsePositiveId(
      req.params.commentId,
      "Некорректный идентификатор комментария"
    );

    const result = await commentsService.deleteComment({
      postId,
      commentId,
      actorUserId: req.user.userId,
      actorRoleName: req.user.roleName,
    });

    res.json(result);
  } catch (e) {
    next(e);
  }
};