const helpRequestsService = require("../services/helpRequests.service");
const httpError = require("../utils/httpError");

function parsePositiveId(value, message) {
  const id = Number(value);

  if (!Number.isInteger(id) || id <= 0) {
    throw httpError(400, message);
  }

  return id;
}

exports.create = async (req, res, next) => {
  try {
    const {
      title,
      description,
      reward_beads,
      contact_url,
      use_profile_contact,
    } = req.body ?? {};

    const request = await helpRequestsService.create({
      creatorUserId: req.user.userId,
      title,
      description,
      rewardBeads: reward_beads,
      contactUrl: contact_url,
      useProfileContact:
        use_profile_contact === true ||
        use_profile_contact === "true" ||
        use_profile_contact === "1",
    });

    res.status(201).json(request);
  } catch (e) {
    next(e);
  }
};

exports.list = async (req, res, next) => {
  try {
    const data = await helpRequestsService.list({
      currentUserId: req.user.userId,
      take: req.query.take,
      skip: req.query.skip,
      status: req.query.status,
    });

    res.json(data);
  } catch (e) {
    next(e);
  }
};

exports.myRequests = async (req, res, next) => {
  try {
    const data = await helpRequestsService.myRequests({
      userId: req.user.userId,
      take: req.query.take,
      skip: req.query.skip,
    });

    res.json(data);
  } catch (e) {
    next(e);
  }
};

exports.myResponses = async (req, res, next) => {
  try {
    const data = await helpRequestsService.myResponses({
      userId: req.user.userId,
      take: req.query.take,
      skip: req.query.skip,
    });

    res.json(data);
  } catch (e) {
    next(e);
  }
};

exports.getById = async (req, res, next) => {
  try {
    const helpRequestId = parsePositiveId(
      req.params.id,
      "Некорректный идентификатор запроса"
    );

    const data = await helpRequestsService.getById({
      helpRequestId,
      currentUserId: req.user.userId,
    });

    res.json(data);
  } catch (e) {
    next(e);
  }
};

exports.update = async (req, res, next) => {
  try {
    const helpRequestId = parsePositiveId(
      req.params.id,
      "Некорректный идентификатор запроса"
    );

    const {
      title,
      description,
      reward_beads,
      contact_url,
      use_profile_contact,
    } = req.body ?? {};

    const updated = await helpRequestsService.update({
      helpRequestId,
      actorUserId: req.user.userId,
      patch: {
        title,
        description,
        rewardBeads: reward_beads,
        contactUrl: contact_url,
        useProfileContact:
          use_profile_contact === undefined
            ? undefined
            : use_profile_contact === true ||
              use_profile_contact === "true" ||
              use_profile_contact === "1",
      },
    });

    res.json(updated);
  } catch (e) {
    next(e);
  }
};

exports.remove = async (req, res, next) => {
  try {
    const helpRequestId = parsePositiveId(
      req.params.id,
      "Некорректный идентификатор запроса"
    );

    const result = await helpRequestsService.remove({
      helpRequestId,
      actorUserId: req.user.userId,
      actorRoleName: req.user.roleName,
    });

    res.json(result);
  } catch (e) {
    next(e);
  }
};

exports.respond = async (req, res, next) => {
  try {
    const helpRequestId = parsePositiveId(
      req.params.id,
      "Некорректный идентификатор запроса"
    );

    const result = await helpRequestsService.respond({
      helpRequestId,
      helperUserId: req.user.userId,
    });

    res.status(201).json(result);
  } catch (e) {
    next(e);
  }
};

exports.cancelResponse = async (req, res, next) => {
  try {
    const helpRequestId = parsePositiveId(
      req.params.id,
      "Некорректный идентификатор запроса"
    );

    const result = await helpRequestsService.cancelResponse({
      helpRequestId,
      helperUserId: req.user.userId,
    });

    res.json(result);
  } catch (e) {
    next(e);
  }
};

exports.confirmResponse = async (req, res, next) => {
  try {
    const helpRequestId = parsePositiveId(
      req.params.id,
      "Некорректный идентификатор запроса"
    );

    const responseId = parsePositiveId(
      req.params.responseId,
      "Некорректный идентификатор отклика"
    );

    const result = await helpRequestsService.confirmResponse({
      helpRequestId,
      responseId,
      actorUserId: req.user.userId,
    });

    res.json(result);
  } catch (e) {
    next(e);
  }
};