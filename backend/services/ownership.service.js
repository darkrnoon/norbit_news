const httpError = require("../utils/httpError");
const { canModerate } = require("./permission.service");

exports.ensurePostOwner = ({ actorUserId, ownerUserId }) => {
  if (Number(actorUserId) !== Number(ownerUserId)) {
    throw httpError(403, "Редактировать новость может только её автор");
  }
};

exports.ensureCanDeletePost = ({ actorUserId, actorRoleName, ownerUserId }) => {
  if (Number(actorUserId) === Number(ownerUserId)) return;

  if (canModerate(actorRoleName)) return;

  throw httpError(403, "Недостаточно прав для удаления новости");
};

exports.ensureCommunityOwner = ({ actorUserId, ownerUserId }) => {
  if (Number(actorUserId) !== Number(ownerUserId)) {
    throw httpError(403, "Редактировать сообщество может только его создатель");
  }
};

exports.ensureCanDeleteCommunity = ({
  actorUserId,
  actorRoleName,
  ownerUserId,
}) => {
  if (Number(actorUserId) === Number(ownerUserId)) return;

  if (canModerate(actorRoleName)) return;

  throw httpError(403, "Недостаточно прав для удаления сообщества");
};

exports.ensureHelpRequestOwner = ({ actorUserId, ownerUserId }) => {
  if (Number(actorUserId) !== Number(ownerUserId)) {
    throw httpError(403, "Редактировать запрос может только его автор");
  }
};

exports.ensureCanDeleteHelpRequest = ({
  actorUserId,
  actorRoleName,
  ownerUserId,
}) => {
  if (Number(actorUserId) === Number(ownerUserId)) return;

  if (canModerate(actorRoleName)) return;

  throw httpError(403, "Недостаточно прав для удаления запроса");
};