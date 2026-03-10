// utils/roles.js
// Если у тебя role_id другие — просто поменяй числа здесь.
module.exports = {
  ROLE_IDS: {
    ADMIN: 1,
    EMPLOYEE: 2,
    SYSADMIN: 3,
    DIRECTOR: 4 
  },

  // кто считается "привилегированным" для модерации (удаление чужого и т.п.)
  MODERATOR_ROLE_IDS: [1, 3], // ADMIN, SYSADMIN

  // кто может закреплять новости (пример)
  PIN_ROLE_IDS: [1, 3, 4], // ADMIN, DIRECTOR, SYSADMIN
};