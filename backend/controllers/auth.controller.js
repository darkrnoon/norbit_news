const authService = require("../services/auth.service");
const httpError = require("../utils/httpError");

exports.login = async (req, res, next) => {
  try {
    const { login, password } = req.body ?? {};

    if (!login || !password) {
      throw httpError(400, "Введите логин и пароль");
    }

    const result = await authService.login(login, password);

    res.json(result);
  } catch (e) {
    next(e);
  }
};