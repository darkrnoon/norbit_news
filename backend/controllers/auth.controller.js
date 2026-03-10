const authService = require("../services/auth.service");
const httpError = require("../utils/httpError");

exports.login = async (req, res, next) => {
  try {
    const { login, password } = req.body ?? {};
    if (!login || !password) throw httpError(400, "login and password are required");

    const accessToken = await authService.login(login, password);
    res.json({ accessToken });
  } catch (e) {
    next(e);
  }
};