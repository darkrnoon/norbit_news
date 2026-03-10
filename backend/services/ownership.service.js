// services/ownership.service.js
const { canModerate } = require("./permission.service");

exports.ensureOwnerOrModerator = ({ actorUserId, actorRoleId, ownerUserId }) => {
  if (actorUserId === ownerUserId) return;        // владелец
  if (canModerate(actorRoleId)) return;           // админ/сисадмин
  const err = new Error("Forbidden");
  err.status = 403;
  throw err;
};