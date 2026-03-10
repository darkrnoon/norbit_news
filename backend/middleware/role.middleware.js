// middleware/role.middleware.js
module.exports = function requireRole(allowedRoleIds) {
  return (req, res, next) => {
    // auth.middleware должен уже положить req.user
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });

    const roleId = req.user.roleId;
    if (!allowedRoleIds.includes(roleId)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    next();
  };
};