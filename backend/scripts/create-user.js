require("dotenv").config();

const bcrypt = require("bcrypt");
const prisma = require("../utils/prisma");
// Если у тебя Prisma Client всё еще лежит в db/prisma.js,
// тогда используй:
// const prisma = require("../db/prisma");

async function main() {
  const login = process.argv[2];
  const password = process.argv[3];
  const roleId = Number(process.argv[4] || 1);
  const fullName = process.argv[5] || login;
  const email = process.argv[6] || null;

  if (!login || !password) {
    console.log("Использование:");
    console.log(
      "npm run create-user <login> <password> [roleId] [fullName] [email]"
    );
    console.log("");
    console.log("Пример:");
    console.log(
      'npm run create-user admin admin123 4 "Системный администратор" admin@norbit.local'
    );
    process.exit(1);
  }

  if (!Number.isInteger(roleId) || roleId <= 0) {
    throw new Error("Некорректный идентификатор роли");
  }

  const role = await prisma.roles.findUnique({
    where: {
      role_id: roleId,
    },
    select: {
      role_id: true,
      name: true,
    },
  });

  if (!role) {
    throw new Error(`Роль с id ${roleId} не найдена`);
  }

  const existingUser = await prisma.users.findUnique({
    where: {
      login,
    },
    select: {
      user_id: true,
      login: true,
    },
  });

  if (existingUser) {
    throw new Error(`Пользователь с логином "${login}" уже существует`);
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const result = await prisma.$transaction(async (tx) => {
    const user = await tx.users.create({
      data: {
        login,
        password_hash: passwordHash,
        role_id: roleId,
        is_active: true,
      },
      select: {
        user_id: true,
        login: true,
        role_id: true,
        is_active: true,
        created_at: true,
      },
    });

    const contact = await tx.contacts.create({
      data: {
        contact_id: user.user_id,
        full_name: fullName,
        email,
        beads_balance: 0,
      },
      select: {
        contact_id: true,
        full_name: true,
        email: true,
        beads_balance: true,
      },
    });

    return {
      user,
      role,
      contact,
    };
  });

  console.log("Пользователь успешно создан:");
  console.log(JSON.stringify(result, null, 2));
}

main()
  .catch((error) => {
    if (error.code === "P2002") {
      console.error("Ошибка: пользователь с таким логином уже существует");
    } else {
      console.error("Ошибка:", error.message);
    }

    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });