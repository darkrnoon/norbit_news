const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const prisma = require("../utils/prisma");
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
      roles: {
        select: {
          name: true,
        },
      },
    },
  });

  if (!user || !user.is_active) {
    throw httpError(401, "Неверный логин или пароль");
  }

  const isPasswordValid = await bcrypt.compare(password, user.password_hash);

  if (!isPasswordValid) {
    throw httpError(401, "Неверный логин или пароль");
  }

  const accessToken = jwt.sign(
    {
      userId: user.user_id,
      roleId: user.role_id,
      roleName: user.roles.name,
    },
    process.env.JWT_SECRET,
    {
      expiresIn: process.env.JWT_EXPIRES_IN || "1h",
    }
  );

  return {
    accessToken,
    user: {
      userId: user.user_id,
      login: user.login,
      roleId: user.role_id,
      roleName: user.roles.name,
    },
  };
};