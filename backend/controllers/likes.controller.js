const likesService = require("../services/likes.service");
const httpError = require("../utils/httpError");

function parsePositiveId(value, message) {
  const id = Number(value);

  if (!Number.isInteger(id) || id <= 0) {
    throw httpError(400, message);
  }

  return id;
}

exports.like = async (req, res, next) => {
  try {
    const postId = parsePositiveId(
      req.params.id,
      "Некорректный идентификатор новости"
    );

    const result = await likesService.likePost({
      postId,
      userId: req.user.userId,
    });

    res.status(201).json(result);
  } catch (e) {
    next(e);
  }
};

exports.unlike = async (req, res, next) => {
  try {
    const postId = parsePositiveId(
      req.params.id,
      "Некорректный идентификатор новости"
    );

    const result = await likesService.unlikePost({
      postId,
      userId: req.user.userId,
    });

    res.json(result);
  } catch (e) {
    next(e);
  }
};