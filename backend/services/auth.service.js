const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const prisma = require("../db/prisma");
const httpError = require("../utils/httpError");

exports.login = async (login, password) => {
  const user = await prisma.users.findUnique({
    where: { login },
    select: {
      user_id: true,
      login: true,
      password_hash: true,
      role_id: true,
      is_active: true,
    },
  });

  if (!user || !user.is_active) throw httpError(401, "Invalid credentials");

  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) throw httpError(401, "Invalid credentials");

  const token = jwt.sign(
    { userId: user.user_id, roleId: user.role_id },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "1h" }
  );

  return token;
};