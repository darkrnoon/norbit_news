// services/permission.service.js
const { MODERATOR_ROLE_IDS, PIN_ROLE_IDS } = require("../utils/roles");

exports.canModerate = (roleId) => MODERATOR_ROLE_IDS.includes(roleId);
exports.canPinPosts = (roleId) => PIN_ROLE_IDS.includes(roleId);