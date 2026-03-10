const prisma = require("../db/prisma");
const httpError = require("../utils/httpError");

exports.getMe = async (userId) => {
  const user = await prisma.users.findUnique({
    where: { user_id: Number(userId) },
    select: {
      user_id: true,
      login: true,
      role_id: true,
      is_active: true,
      created_at: true,
      roles: { select: { role_id: true, name: true } },
      contacts: {
        select: {
          contact_id: true,
          avatar: true,
          full_name: true,
          position: true,
          department: true,
          branch: true,
          office_room: true,
          city: true,
          address: true,
          gender: true,
          birth_date: true,
          hire_date: true,
          email: true,
          phone: true,
          telegram_url: true,
          beads_balance: true,
        },
      },
    },
  });

  if (!user) throw httpError(404, "User not found");

  return {
    user_id: user.user_id,
    login: user.login,
    is_active: user.is_active,
    created_at: user.created_at,
    role: user.roles,
    contact: user.contacts, // может быть null, если контакт не создан
  };
};

exports.updateMyContact = async (userId, patch) => {
  // 1) контакт должен существовать (по твоей модели contact_id = user_id)
  const existing = await prisma.contacts.findUnique({
    where: { contact_id: Number(userId) },
    select: { contact_id: true },
  });
  if (!existing) throw httpError(404, "Contact not found");

  // 2) обновляем только разрешённые поля
  return prisma.contacts.update({
    where: { contact_id: Number(userId) },
    data: {
      avatar: patch.avatar ?? undefined,
      full_name: patch.full_name ?? undefined,
      position: patch.position ?? undefined,
      department: patch.department ?? undefined,
      branch: patch.branch ?? undefined,
      office_room: patch.office_room ?? undefined,
      city: patch.city ?? undefined,
      address: patch.address ?? undefined,
      gender: patch.gender ?? undefined,
      birth_date: patch.birth_date ? new Date(patch.birth_date) : undefined,
      hire_date: patch.hire_date ? new Date(patch.hire_date) : undefined,
      email: patch.email ?? undefined,
      phone: patch.phone ?? undefined,
      telegram_url: patch.telegram_url ?? undefined,
      // beads_balance пользователь сам менять не должен — не обновляем тут
    },
    select: {
      contact_id: true,
      avatar: true,
      full_name: true,
      position: true,
      department: true,
      branch: true,
      office_room: true,
      city: true,
      address: true,
      gender: true,
      birth_date: true,
      hire_date: true,
      email: true,
      phone: true,
      telegram_url: true,
      beads_balance: true,
    },
  });
};