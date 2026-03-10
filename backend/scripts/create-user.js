require("dotenv").config();
const bcrypt = require("bcrypt");
const prisma = require("../db/prisma");

async function main() {
  const login = process.argv[2];
  const pass = process.argv[3];
  const roleId = Number(process.argv[4] || 1);

  if (!login || !pass) {
    console.log("Usage: node scripts/create-user.js <login> <password> [roleId]");
    process.exit(1);
  }

  const password_hash = await bcrypt.hash(pass, 10);

  const user = await prisma.users.create({
    data: { login, password_hash, role_id: roleId, is_active: true },
    select: { user_id: true, login: true, role_id: true, is_active: true },
  });

  console.log("Created:", user);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());