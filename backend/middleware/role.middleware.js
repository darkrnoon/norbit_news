module.exports = function roleMiddleware(...allowedRoles) {
  return function (req, res, next) {
    if (!req.user) {
      return res.status(401).json({
        message: "Необходимо авторизоваться",
      });
    }

    if (!allowedRoles.includes(req.user.roleName)) {
      return res.status(403).json({
        message: "Недостаточно прав для выполнения действия",
      });
    }

    next();
  };
};