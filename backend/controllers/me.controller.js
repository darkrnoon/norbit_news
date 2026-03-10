const meService = require("../services/me.service");
const httpError = require("../utils/httpError");

exports.me = async (req, res, next) => {
  try {
    const data = await meService.getMe(req.user.userId);
    res.json(data);
  } catch (e) {
    next(e);
  }
};

exports.updateContact = async (req, res, next) => {
  try {
    const patch = req.body ?? {};
    if (Object.keys(patch).length === 0) throw httpError(400, "Empty body");

    const updated = await meService.updateMyContact(req.user.userId, patch);
    res.json(updated);
  } catch (e) {
    next(e);
  }
};