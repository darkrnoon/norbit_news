const {
  MODERATOR_ROLE_NAMES,
  PIN_ROLE_NAMES,
} = require("../utils/roles");

exports.canModerate = (roleName) => {
  return MODERATOR_ROLE_NAMES.includes(roleName);
};

exports.canPinPosts = (roleName) => {
  return PIN_ROLE_NAMES.includes(roleName);
};