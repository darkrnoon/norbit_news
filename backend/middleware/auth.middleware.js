const jwt = require("jsonwebtoken");

module.exports = function authMiddleware(req, res, next) {
  const header = req.headers.authorization;

  if (!header) {
    return res.status(401).json({
      message: "Необходимо авторизоваться",
    });
  }

  const [type, token] = header.split(" ");

  if (type !== "Bearer" || !token) {
    return res.status(401).json({
      message: "Неверный формат токена авторизации",
    });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);

    req.user = {
      userId: payload.userId,
      roleId: payload.roleId,
      roleName: payload.roleName,
    };

    next();
  } catch (e) {
    return res.status(401).json({
      message: "Срок действия сессии истек. Выполните вход снова",
    });
  }
};