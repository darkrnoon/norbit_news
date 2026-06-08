const prisma = require("../utils/prisma");
const httpError = require("../utils/httpError");

const PRIVILEGED_ROLES = [
  "Директор",
  "Администратор",
  "Системный администратор",
];

exports.getMe = async (userId) => {
  const user = await prisma.users.findUnique({
    where: {
      user_id: Number(userId),
    },
    select: {
      user_id: true,
      login: true,
      role_id: true,
      is_active: true,
      created_at: true,
      roles: {
        select: {
          role_id: true,
          name: true,
        },
      },
      contacts: {
        select: {
          contact_id: true,
          avatar: true,
          full_name: true,
          beads_balance: true,
        },
      },
    },
  });

  if (!user) {
    throw httpError(404, "Пользователь не найден");
  }

  if (!user.is_active) {
    throw httpError(403, "Учетная запись заблокирована");
  }

  if (!user.contacts) {
    throw httpError(404, "Контактная информация пользователя не найдена");
  }

  const shouldDisplayRole = PRIVILEGED_ROLES.includes(user.roles.name);

  return {
    user_id: user.user_id,
    login: user.login,
    is_active: user.is_active,
    created_at: user.created_at,

    role: {
      role_id: user.roles.role_id,
      name: user.roles.name,
      should_display: shouldDisplayRole,
    },

    contact: {
      contact_id: user.contacts.contact_id,
      avatar: user.contacts.avatar,
      full_name: user.contacts.full_name,
      beads_balance: user.contacts.beads_balance ?? 0,
    },
  };
};

exports.getFeedFilterUsers = async (currentUserId) => {
  const contacts = await prisma.contacts.findMany({
    where: {
      users: {
        is_active: true,
      },
    },
    select: {
      contact_id: true,
      avatar: true,
      full_name: true,
      users: {
        select: {
          user_id: true,
        },
      },
    },
  });

  return contacts
    .map((contact) => ({
      user_id: contact.users.user_id,
      avatar: contact.avatar,
      full_name: contact.full_name,
    }))
    .sort((a, b) => a.full_name.localeCompare(b.full_name, "ru"));
};