const prisma = require("../utils/prisma");
const httpError = require("../utils/httpError");

const {
  HELP_REQUEST_STATUS,
  HELP_RESPONSE_STATUS,
  HELP_REQUEST_STATUS_LABELS,
  HELP_RESPONSE_STATUS_LABELS,
} = require("../utils/helpStatuses");

const {
  ensureHelpRequestOwner,
  ensureCanDeleteHelpRequest,
} = require("./ownership.service");

function normalizeReward(value) {
  const reward = Number(value ?? 0);

  if (!Number.isInteger(reward) || reward < 0) {
    throw httpError(400, "Некорректное количество бусинок");
  }

  return reward;
}

function normalizeHelpRequest(item, currentUserId = null) {
  const successfulResponse = item.help_responses?.find(
    (response) => response.status === HELP_RESPONSE_STATUS.SUCCESSFUL
  );

  const activeResponse = item.help_responses?.find(
    (response) => response.status === HELP_RESPONSE_STATUS.ACTIVE
  );

  const myActiveResponse = currentUserId
    ? item.help_responses?.find(
        (response) =>
          response.helper_user_id === Number(currentUserId) &&
          response.status === HELP_RESPONSE_STATUS.ACTIVE
      )
    : null;

  return {
    help_request_id: item.help_request_id,
    title: item.title,
    description: item.description,
    reward_beads: item.reward_beads ?? 0,
    contact_url: item.contact_url,
    status: item.status,
    status_label: HELP_REQUEST_STATUS_LABELS[item.status] ?? item.status,
    created_at: item.created_at,
    updated_at: item.updated_at,
    closed_at: item.closed_at,

    author: {
      user_id: item.users.user_id,
      login: item.users.login,
      avatar: item.users.contacts?.avatar ?? null,
      full_name: item.users.contacts?.full_name ?? "Пользователь",
    },

    active_response: activeResponse
      ? {
          help_response_id: activeResponse.help_response_id,
          helper_user_id: activeResponse.helper_user_id,
          created_at: activeResponse.created_at,
          helper: {
            user_id: activeResponse.users.user_id,
            login: activeResponse.users.login,
            avatar: activeResponse.users.contacts?.avatar ?? null,
            full_name: activeResponse.users.contacts?.full_name ?? "Пользователь",
          },
        }
      : null,

    completed_by: successfulResponse
      ? {
          help_response_id: successfulResponse.help_response_id,
          helper_user_id: successfulResponse.helper_user_id,
          created_at: successfulResponse.created_at,
          helper: {
            user_id: successfulResponse.users.user_id,
            login: successfulResponse.users.login,
            avatar: successfulResponse.users.contacts?.avatar ?? null,
            full_name:
              successfulResponse.users.contacts?.full_name ?? "Пользователь",
          },
        }
      : null,

    my_response: myActiveResponse
      ? {
          help_response_id: myActiveResponse.help_response_id,
          status: myActiveResponse.status,
          status_label:
            HELP_RESPONSE_STATUS_LABELS[myActiveResponse.status] ??
            myActiveResponse.status,
        }
      : null,

    permissions: {
      can_edit:
        currentUserId &&
        Number(item.creator_user_id) === Number(currentUserId) &&
        item.status !== HELP_REQUEST_STATUS.COMPLETED,

      can_delete:
        currentUserId && Number(item.creator_user_id) === Number(currentUserId),

      can_respond:
        currentUserId &&
        Number(item.creator_user_id) !== Number(currentUserId) &&
        item.status !== HELP_REQUEST_STATUS.COMPLETED &&
        !myActiveResponse,

      can_cancel_response: Boolean(myActiveResponse),

      can_confirm:
        currentUserId &&
        Number(item.creator_user_id) === Number(currentUserId) &&
        item.status === HELP_REQUEST_STATUS.IN_PROGRESS,
    },
  };
}

const helpRequestInclude = {
  users: {
    select: {
      user_id: true,
      login: true,
      contacts: {
        select: {
          avatar: true,
          full_name: true,
        },
      },
    },
  },

  help_responses: {
    where: {
      status: {
        in: [
          HELP_RESPONSE_STATUS.ACTIVE,
          HELP_RESPONSE_STATUS.SUCCESSFUL,
        ],
      },
    },
    select: {
      help_response_id: true,
      help_request_id: true,
      helper_user_id: true,
      status: true,
      created_at: true,
      users: {
        select: {
          user_id: true,
          login: true,
          contacts: {
            select: {
              avatar: true,
              full_name: true,
            },
          },
        },
      },
    },
    orderBy: {
      created_at: "asc",
    },
  },
};

async function getProfileContactUrl(userId) {
  const contact = await prisma.contacts.findUnique({
    where: {
      contact_id: Number(userId),
    },
    select: {
      telegram_url: true,
    },
  });

  if (!contact?.telegram_url) {
    throw httpError(
      400,
      "В профиле не указан Telegram. Введите контакт вручную"
    );
  }

  return contact.telegram_url;
}

async function refreshRequestStatus(tx, helpRequestId) {
  const successfulResponse = await tx.help_responses.findFirst({
    where: {
      help_request_id: Number(helpRequestId),
      status: HELP_RESPONSE_STATUS.SUCCESSFUL,
    },
    select: {
      help_response_id: true,
    },
  });

  if (successfulResponse) {
    await tx.help_requests.update({
      where: {
        help_request_id: Number(helpRequestId),
      },
      data: {
        status: HELP_REQUEST_STATUS.COMPLETED,
        closed_at: new Date(),
        updated_at: new Date(),
      },
    });

    return HELP_REQUEST_STATUS.COMPLETED;
  }

  const activeResponse = await tx.help_responses.findFirst({
    where: {
      help_request_id: Number(helpRequestId),
      status: HELP_RESPONSE_STATUS.ACTIVE,
    },
    select: {
      help_response_id: true,
    },
  });

  const nextStatus = activeResponse
    ? HELP_REQUEST_STATUS.IN_PROGRESS
    : HELP_REQUEST_STATUS.OPEN;

  await tx.help_requests.update({
    where: {
      help_request_id: Number(helpRequestId),
    },
    data: {
      status: nextStatus,
      closed_at: null,
      updated_at: new Date(),
    },
  });

  return nextStatus;
}

exports.create = async ({
  creatorUserId,
  title,
  description,
  rewardBeads,
  contactUrl,
  useProfileContact,
}) => {
  const normalizedTitle = title?.trim();
  const normalizedDescription = description?.trim();
  const reward = normalizeReward(rewardBeads);

  if (!normalizedTitle) {
    throw httpError(400, "Введите заголовок запроса");
  }

  if (!normalizedDescription) {
    throw httpError(400, "Введите описание проблемы");
  }

  const finalContactUrl = useProfileContact
    ? await getProfileContactUrl(creatorUserId)
    : contactUrl?.trim();

  if (!finalContactUrl) {
    throw httpError(400, "Укажите контакт для связи");
  }

  const created = await prisma.$transaction(async (tx) => {
    const contact = await tx.contacts.findUnique({
      where: {
        contact_id: Number(creatorUserId),
      },
      select: {
        contact_id: true,
        beads_balance: true,
      },
    });

    if (!contact) {
      throw httpError(404, "Контактная информация пользователя не найдена");
    }

    const balance = contact.beads_balance ?? 0;

    if (balance < reward) {
      throw httpError(400, "Недостаточно бусинок для создания запроса");
    }

    if (reward > 0) {
      await tx.contacts.update({
        where: {
          contact_id: Number(creatorUserId),
        },
        data: {
          beads_balance: {
            decrement: reward,
          },
        },
      });

      await tx.bead_transactions.create({
        data: {
          from_contact_id: Number(creatorUserId),
          to_contact_id: null,
          amount: reward,
          reason: "Резерв награды за запрос помощи",
        },
      });
    }

    return tx.help_requests.create({
      data: {
        creator_user_id: Number(creatorUserId),
        title: normalizedTitle,
        description: normalizedDescription,
        reward_beads: reward,
        contact_url: finalContactUrl,
        status: HELP_REQUEST_STATUS.OPEN,
      },
      include: helpRequestInclude,
    });
  });

  return normalizeHelpRequest(created, creatorUserId);
};

exports.list = async ({
  currentUserId,
  take = 20,
  skip = 0,
  status,
}) => {
  const limit = Math.min(Math.max(Number(take) || 20, 1), 50);
  const offset = Math.max(Number(skip) || 0, 0);

  const where = {
    deleted_at: null,
    ...(status
      ? {
          status: String(status),
        }
      : {}),
  };

  const items = await prisma.help_requests.findMany({
    where,
    include: helpRequestInclude,
    orderBy: {
      created_at: "desc",
    },
    take: limit,
    skip: offset,
  });

  return items.map((item) => normalizeHelpRequest(item, currentUserId));
};

exports.myRequests = async ({ userId, take = 20, skip = 0 }) => {
  const limit = Math.min(Math.max(Number(take) || 20, 1), 50);
  const offset = Math.max(Number(skip) || 0, 0);

  const items = await prisma.help_requests.findMany({
    where: {
      creator_user_id: Number(userId),
      deleted_at: null,
    },
    include: helpRequestInclude,
    orderBy: {
      created_at: "desc",
    },
    take: limit,
    skip: offset,
  });

  return items.map((item) => normalizeHelpRequest(item, userId));
};

exports.myResponses = async ({ userId, take = 20, skip = 0 }) => {
  const limit = Math.min(Math.max(Number(take) || 20, 1), 50);
  const offset = Math.max(Number(skip) || 0, 0);

  const responses = await prisma.help_responses.findMany({
    where: {
      helper_user_id: Number(userId),
      help_requests: {
        deleted_at: null,
      },
    },
    select: {
      help_response_id: true,
      status: true,
      created_at: true,
      help_requests: {
        include: helpRequestInclude,
      },
    },
    orderBy: {
      created_at: "desc",
    },
    take: limit,
    skip: offset,
  });

  return responses.map((response) => {
    const request = normalizeHelpRequest(response.help_requests, userId);

    return {
      response_id: response.help_response_id,
      response_status: response.status,
      response_status_label:
        HELP_RESPONSE_STATUS_LABELS[response.status] ?? response.status,
      response_created_at: response.created_at,
      request,
    };
  });
};

exports.getById = async ({ helpRequestId, currentUserId }) => {
  const item = await prisma.help_requests.findUnique({
    where: {
      help_request_id: Number(helpRequestId),
    },
    include: helpRequestInclude,
  });

  if (!item || item.deleted_at) {
    throw httpError(404, "Запрос помощи не найден");
  }

  return normalizeHelpRequest(item, currentUserId);
};

exports.update = async ({
  helpRequestId,
  actorUserId,
  patch,
}) => {
  const existing = await prisma.help_requests.findUnique({
    where: {
      help_request_id: Number(helpRequestId),
    },
    select: {
      help_request_id: true,
      creator_user_id: true,
      title: true,
      description: true,
      reward_beads: true,
      contact_url: true,
      status: true,
      deleted_at: true,
    },
  });

  if (!existing || existing.deleted_at) {
    throw httpError(404, "Запрос помощи не найден");
  }

  ensureHelpRequestOwner({
    actorUserId,
    ownerUserId: existing.creator_user_id,
  });

  if (existing.status === HELP_REQUEST_STATUS.COMPLETED) {
    throw httpError(400, "Завершенный запрос нельзя редактировать");
  }

  const activeResponsesCount = await prisma.help_responses.count({
    where: {
      help_request_id: Number(helpRequestId),
      status: HELP_RESPONSE_STATUS.ACTIVE,
    },
  });

  const normalizedTitle =
    patch.title === undefined ? undefined : patch.title?.trim();

  if (patch.title !== undefined && !normalizedTitle) {
    throw httpError(400, "Введите заголовок запроса");
  }

  const normalizedDescription =
    patch.description === undefined
      ? undefined
      : patch.description?.trim();

  if (patch.description !== undefined && !normalizedDescription) {
    throw httpError(400, "Введите описание проблемы");
  }

  let finalContactUrl;

  if (patch.useProfileContact === true) {
    finalContactUrl = await getProfileContactUrl(actorUserId);
  } else if (patch.contactUrl !== undefined) {
    finalContactUrl = patch.contactUrl?.trim();

    if (!finalContactUrl) {
      throw httpError(400, "Укажите контакт для связи");
    }
  }

  let newReward;

  if (patch.rewardBeads !== undefined) {
    if (activeResponsesCount > 0) {
      throw httpError(
        400,
        "Нельзя изменять награду после появления откликов"
      );
    }

    newReward = normalizeReward(patch.rewardBeads);
  }

  const updated = await prisma.$transaction(async (tx) => {
    if (newReward !== undefined) {
      const oldReward = existing.reward_beads ?? 0;
      const diff = newReward - oldReward;

      if (diff > 0) {
        const contact = await tx.contacts.findUnique({
          where: {
            contact_id: Number(actorUserId),
          },
          select: {
            beads_balance: true,
          },
        });

        if ((contact?.beads_balance ?? 0) < diff) {
          throw httpError(400, "Недостаточно бусинок для увеличения награды");
        }

        await tx.contacts.update({
          where: {
            contact_id: Number(actorUserId),
          },
          data: {
            beads_balance: {
              decrement: diff,
            },
          },
        });

        await tx.bead_transactions.create({
          data: {
            from_contact_id: Number(actorUserId),
            to_contact_id: null,
            amount: diff,
            reason: "Увеличение резерва награды за запрос помощи",
          },
        });
      }

      if (diff < 0) {
        await tx.contacts.update({
          where: {
            contact_id: Number(actorUserId),
          },
          data: {
            beads_balance: {
              increment: Math.abs(diff),
            },
          },
        });

        await tx.bead_transactions.create({
          data: {
            from_contact_id: null,
            to_contact_id: Number(actorUserId),
            amount: Math.abs(diff),
            reason: "Возврат части резерва награды за запрос помощи",
          },
        });
      }
    }

    return tx.help_requests.update({
      where: {
        help_request_id: Number(helpRequestId),
      },
      data: {
        title: normalizedTitle,
        description: normalizedDescription,
        reward_beads: newReward,
        contact_url: finalContactUrl,
        updated_at: new Date(),
      },
      include: helpRequestInclude,
    });
  });

  return normalizeHelpRequest(updated, actorUserId);
};

exports.remove = async ({
  helpRequestId,
  actorUserId,
  actorRoleName,
}) => {
  const existing = await prisma.help_requests.findUnique({
    where: {
      help_request_id: Number(helpRequestId),
    },
    select: {
      help_request_id: true,
      creator_user_id: true,
      reward_beads: true,
      status: true,
      deleted_at: true,
    },
  });

  if (!existing || existing.deleted_at) {
    throw httpError(404, "Запрос помощи не найден");
  }

  ensureCanDeleteHelpRequest({
    actorUserId,
    actorRoleName,
    ownerUserId: existing.creator_user_id,
  });

  await prisma.$transaction(async (tx) => {
    await tx.help_requests.update({
      where: {
        help_request_id: Number(helpRequestId),
      },
      data: {
        deleted_at: new Date(),
        updated_at: new Date(),
      },
    });

    await tx.help_responses.updateMany({
      where: {
        help_request_id: Number(helpRequestId),
        status: HELP_RESPONSE_STATUS.ACTIVE,
      },
      data: {
        status: HELP_RESPONSE_STATUS.CANCELLED,
      },
    });

    if (existing.status !== HELP_REQUEST_STATUS.COMPLETED) {
      const reward = existing.reward_beads ?? 0;

      if (reward > 0) {
        await tx.contacts.update({
          where: {
            contact_id: Number(existing.creator_user_id),
          },
          data: {
            beads_balance: {
              increment: reward,
            },
          },
        });

        await tx.bead_transactions.create({
          data: {
            from_contact_id: null,
            to_contact_id: Number(existing.creator_user_id),
            amount: reward,
            reason: "Возврат награды при удалении запроса помощи",
          },
        });
      }
    }
  });

  return {
    ok: true,
    message: "Запрос помощи удален",
  };
};

exports.respond = async ({ helpRequestId, helperUserId }) => {
  const request = await prisma.help_requests.findUnique({
    where: {
      help_request_id: Number(helpRequestId),
    },
    select: {
      help_request_id: true,
      creator_user_id: true,
      status: true,
      deleted_at: true,
    },
  });

  if (!request || request.deleted_at) {
    throw httpError(404, "Запрос помощи не найден");
  }

  if (request.status === HELP_REQUEST_STATUS.COMPLETED) {
    throw httpError(400, "Запрос уже завершен");
  }

  if (Number(request.creator_user_id) === Number(helperUserId)) {
    throw httpError(400, "Нельзя откликнуться на собственный запрос");
  }

  const result = await prisma.$transaction(async (tx) => {
    const existingActive = await tx.help_responses.findFirst({
      where: {
        help_request_id: Number(helpRequestId),
        helper_user_id: Number(helperUserId),
        status: HELP_RESPONSE_STATUS.ACTIVE,
      },
      select: {
        help_response_id: true,
      },
    });

    if (existingActive) {
      throw httpError(400, "Вы уже откликнулись на этот запрос");
    }

    const response = await tx.help_responses.create({
      data: {
        help_request_id: Number(helpRequestId),
        helper_user_id: Number(helperUserId),
        status: HELP_RESPONSE_STATUS.ACTIVE,
      },
      select: {
        help_response_id: true,
        help_request_id: true,
        helper_user_id: true,
        status: true,
        created_at: true,
      },
    });

    await refreshRequestStatus(tx, helpRequestId);

    return response;
  });

  return {
    ...result,
    status_label: HELP_RESPONSE_STATUS_LABELS[result.status],
    message: "Отклик отправлен",
  };
};

exports.cancelResponse = async ({ helpRequestId, helperUserId }) => {
  const request = await prisma.help_requests.findUnique({
    where: {
      help_request_id: Number(helpRequestId),
    },
    select: {
      help_request_id: true,
      status: true,
      deleted_at: true,
    },
  });

  if (!request || request.deleted_at) {
    throw httpError(404, "Запрос помощи не найден");
  }

  if (request.status === HELP_REQUEST_STATUS.COMPLETED) {
    throw httpError(400, "Нельзя отменить отклик у завершенного запроса");
  }

  const result = await prisma.$transaction(async (tx) => {
    const response = await tx.help_responses.findFirst({
      where: {
        help_request_id: Number(helpRequestId),
        helper_user_id: Number(helperUserId),
        status: HELP_RESPONSE_STATUS.ACTIVE,
      },
      select: {
        help_response_id: true,
      },
    });

    if (!response) {
      throw httpError(404, "Активный отклик не найден");
    }

    await tx.help_responses.update({
      where: {
        help_response_id: response.help_response_id,
      },
      data: {
        status: HELP_RESPONSE_STATUS.CANCELLED,
      },
    });

    const nextStatus = await refreshRequestStatus(tx, helpRequestId);

    return {
      nextStatus,
    };
  });

  return {
    ok: true,
    request_status: result.nextStatus,
    request_status_label:
      HELP_REQUEST_STATUS_LABELS[result.nextStatus] ?? result.nextStatus,
    message: "Отклик отменен",
  };
};

exports.confirmResponse = async ({
  helpRequestId,
  responseId,
  actorUserId,
}) => {
  const request = await prisma.help_requests.findUnique({
    where: {
      help_request_id: Number(helpRequestId),
    },
    select: {
      help_request_id: true,
      creator_user_id: true,
      reward_beads: true,
      status: true,
      deleted_at: true,
    },
  });

  if (!request || request.deleted_at) {
    throw httpError(404, "Запрос помощи не найден");
  }

  if (Number(request.creator_user_id) !== Number(actorUserId)) {
    throw httpError(403, "Подтвердить выполнение может только автор запроса");
  }

  if (request.status === HELP_REQUEST_STATUS.COMPLETED) {
    throw httpError(400, "Запрос уже завершен");
  }

  const result = await prisma.$transaction(async (tx) => {
    const response = await tx.help_responses.findUnique({
      where: {
        help_response_id: Number(responseId),
      },
      select: {
        help_response_id: true,
        help_request_id: true,
        helper_user_id: true,
        status: true,
      },
    });

    if (
      !response ||
      response.help_request_id !== Number(helpRequestId) ||
      response.status !== HELP_RESPONSE_STATUS.ACTIVE
    ) {
      throw httpError(404, "Активный отклик не найден");
    }

    const reward = request.reward_beads ?? 0;

    await tx.help_responses.update({
      where: {
        help_response_id: Number(responseId),
      },
      data: {
        status: HELP_RESPONSE_STATUS.SUCCESSFUL,
      },
    });

    await tx.help_responses.updateMany({
      where: {
        help_request_id: Number(helpRequestId),
        help_response_id: {
          not: Number(responseId),
        },
        status: HELP_RESPONSE_STATUS.ACTIVE,
      },
      data: {
        status: HELP_RESPONSE_STATUS.CANCELLED,
      },
    });

    await tx.help_requests.update({
      where: {
        help_request_id: Number(helpRequestId),
      },
      data: {
        status: HELP_REQUEST_STATUS.COMPLETED,
        closed_at: new Date(),
        updated_at: new Date(),
      },
    });

    if (reward > 0) {
      await tx.contacts.update({
        where: {
          contact_id: Number(response.helper_user_id),
        },
        data: {
          beads_balance: {
            increment: reward,
          },
        },
      });

      await tx.bead_transactions.create({
        data: {
          from_contact_id: Number(request.creator_user_id),
          to_contact_id: Number(response.helper_user_id),
          amount: reward,
          reason: "Награда за выполнение запроса помощи",
        },
      });
    }

    return {
      helper_user_id: response.helper_user_id,
      reward,
    };
  });

  return {
    ok: true,
    request_status: HELP_REQUEST_STATUS.COMPLETED,
    request_status_label: HELP_REQUEST_STATUS_LABELS[HELP_REQUEST_STATUS.COMPLETED],
    response_status: HELP_RESPONSE_STATUS.SUCCESSFUL,
    response_status_label:
      HELP_RESPONSE_STATUS_LABELS[HELP_RESPONSE_STATUS.SUCCESSFUL],
    helper_user_id: result.helper_user_id,
    reward_beads: result.reward,
    message: "Выполнение запроса подтверждено",
  };
};