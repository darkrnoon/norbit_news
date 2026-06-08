const meService = require("../services/me.service");

exports.me = async (req, res, next) => {
  try {
    const data = await meService.getMe(req.user.userId);
    res.json(data);
  } catch (e) {
    next(e);
  }
};

exports.getFeedFilterUsers = async (req, res, next) => {
  try {
    const users = await meService.getFeedFilterUsers(req.user.userId);
    res.json(users);
  } catch (e) {
    next(e);
  }
};