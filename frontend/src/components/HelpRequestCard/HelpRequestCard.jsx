import { useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  cancelHelpResponse,
  confirmHelpResponse,
  deleteHelpRequest,
  respondHelpRequest,
} from "../../api/helpRequests.api";

import "./HelpRequestCard.css";

function getRequestId(request) {
  return request.help_request_id || request.request_id || request.id;
}

function getCurrentUserId(user) {
  return user?.user_id || user?.userId;
}

function getAuthor(request) {
  return request.author || request.user || request.users || {};
}

function getAuthorId(request) {
  const author = getAuthor(request);

  return (
    request.requester_user_id ||
    request.author_user_id ||
    request.user_id ||
    author.user_id ||
    author.userId ||
    author.id
  );
}

function getAuthorName(request) {
  const author = getAuthor(request);

  return (
    author.full_name ||
    author.contacts?.full_name ||
    author.login ||
    "Пользователь"
  );
}

function getAuthorAvatar(request) {
  const author = getAuthor(request);

  return author.avatar || author.contacts?.avatar || "";
}

function getInitials(name) {
  if (!name) return "П";

  const parts = name.trim().split(/\s+/);

  return `${parts[0]?.[0] || ""}${parts[1]?.[0] || ""}` || "П";
}

function getReward(request) {
  return (
    request.reward_amount ??
    request.reward_beads ??
    request.beads_amount ??
    request.reward ??
    0
  );
}

function getDescription(request) {
  return request.description || request.content || "";
}

function getTitle(request) {
  return request.title || request.name || "Запрос помощи";
}

function getContact(request) {
  return (
    request.contact_url ||
    request.contact ||
    request.telegram_url ||
    request.author_contact ||
    ""
  );
}

function normalizeContactUrl(value) {
  const contact = String(value || "").trim();

  if (!contact) return "";

  if (/^https?:\/\//i.test(contact) || /^tg:\/\//i.test(contact)) {
    return contact;
  }

  if (contact.startsWith("@")) {
    return `https://t.me/${contact.slice(1)}`;
  }

  if (contact.startsWith("t.me/")) {
    return `https://${contact}`;
  }

  if (/^[a-zA-Z0-9_]{5,}$/.test(contact)) {
    return `https://t.me/${contact}`;
  }

  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact)) {
    return `mailto:${contact}`;
  }

  return contact;
}

function getResponses(request) {
  return (
    request.responses ||
    request.help_responses ||
    request.helpResponses ||
    []
  );
}

function getResponseId(response) {
  return response?.help_response_id || response?.response_id || response?.id;
}

function getResponseStatus(response) {
  return response?.status || response?.response_status;
}

function isCancelledResponse(response) {
  return getResponseStatus(response) === "cancelled";
}

function isSuccessfulResponse(response) {
  const status = getResponseStatus(response);

  return status === "successful" || status === "completed";
}

function isActiveResponse(response) {
  const status = getResponseStatus(response);

  return status === "active" || status === "in_progress";
}

function getResponder(response) {
  return response?.responder || response?.user || response?.users || {};
}

function getResponderId(response) {
  const responder = getResponder(response);

  return (
    response?.responder_user_id ||
    response?.user_id ||
    responder.user_id ||
    responder.userId ||
    responder.id
  );
}

function getResponderName(response) {
  const responder = getResponder(response);

  return (
    responder.full_name ||
    responder.contacts?.full_name ||
    responder.login ||
    "Пользователь"
  );
}

function getResponderAvatar(response) {
  const responder = getResponder(response);

  return responder.avatar || responder.contacts?.avatar || "";
}

function getActiveResponse(request) {
  return (
    request.active_response ||
    request.activeResponse ||
    getResponses(request).find(isActiveResponse) ||
    null
  );
}

function getSuccessfulResponse(request) {
  return (
    request.successful_response ||
    request.successfulResponse ||
    getResponses(request).find(isSuccessfulResponse) ||
    null
  );
}

function getMyResponse(request, user) {
  const currentUserId = Number(getCurrentUserId(user));

  const responseFromBackend =
    request.my_response || request.myResponse || null;

  if (responseFromBackend && !isCancelledResponse(responseFromBackend)) {
    return responseFromBackend;
  }

  return (
    getResponses(request).find((response) => {
      const responderId = Number(getResponderId(response));

      return (
        responderId &&
        currentUserId &&
        responderId === currentUserId &&
        !isCancelledResponse(response)
      );
    }) || null
  );
}

function canModerate(user) {
  const roleName = user?.role?.name;
  const roleId = user?.role?.role_id || user?.roleId;

  return (
    roleName === "Администратор" ||
    roleName === "Системный администратор" ||
    roleId === 1 ||
    roleId === 3
  );
}

function isOwner(request, user) {
  return Number(getAuthorId(request)) === Number(getCurrentUserId(user));
}

function isRequestCompleted(request) {
  const status = request.status || request.request_status;

  return (
    status === "completed" ||
    status === "done" ||
    Boolean(getSuccessfulResponse(request))
  );
}

function getRequestStatus(request, activeTab, user) {
  const status = request.status || request.request_status;
  const myResponse = getMyResponse(request, user);

  if (
    activeTab === "responses" &&
    myResponse &&
    isSuccessfulResponse(myResponse)
  ) {
    return {
      label: "Выполнено",
      className: "is-done-by-me",
    };
  }

  if (
    status === "completed" ||
    status === "done" ||
    getSuccessfulResponse(request)
  ) {
    return {
      label: "Завершен",
      className: "is-completed",
    };
  }

  if (status === "in_progress" || getActiveResponse(request)) {
    return {
      label: "Выполняется",
      className: "is-progress",
    };
  }

  return {
    label: "Открыт",
    className: "is-open",
  };
}

function isTextLong(text) {
  return String(text || "").length > 180;
}

export default function HelpRequestCard({
  request,
  user,
  activeTab,
  onChanged,
}) {
  const navigate = useNavigate();

  const [isExpanded, setIsExpanded] = useState(false);
  const [isBusy, setIsBusy] = useState(false);

  const requestId = getRequestId(request);

  const title = getTitle(request);
  const description = getDescription(request);
  const reward = getReward(request);

  const authorName = getAuthorName(request);
  const authorAvatar = getAuthorAvatar(request);

  const owner = isOwner(request, user);
  const moderator = canModerate(user);

  const activeResponse = getActiveResponse(request);
  const successfulResponse = getSuccessfulResponse(request);
  const myResponse = getMyResponse(request, user);

  const completed = isRequestCompleted(request);
  const status = getRequestStatus(request, activeTab, user);

  const contactUrl = normalizeContactUrl(getContact(request));
  const longDescription = isTextLong(description);

  const canEdit = owner && !completed;
  const canDelete = (owner && !completed) || moderator;

  const canRespond =
    !owner &&
    status.label === "Открыт" &&
    !myResponse &&
    !activeResponse &&
    !completed;

  const canCancelMyResponse =
    myResponse && isActiveResponse(myResponse) && !completed;

  const canConfirm = owner && activeResponse && !completed;

  const canWriteToAuthor =
    !owner &&
    myResponse &&
    !isCancelledResponse(myResponse) &&
    Boolean(contactUrl);

  async function handleRespond() {
    try {
      setIsBusy(true);

      await respondHelpRequest(requestId);
      await onChanged?.();
    } catch (e) {
      alert(e?.response?.data?.message || "Не удалось откликнуться");
    } finally {
      setIsBusy(false);
    }
  }

  async function handleCancelMyResponse() {
    if (!window.confirm("Отменить отклик?")) return;

    try {
      setIsBusy(true);

      await cancelHelpResponse(requestId);
      await onChanged?.();
    } catch (e) {
      alert(e?.response?.data?.message || "Не удалось отменить отклик");
    } finally {
      setIsBusy(false);
    }
  }

  async function handleConfirmResponse() {
    const responseId = getResponseId(activeResponse);

    if (!responseId) {
      alert("Не найден идентификатор отклика");
      return;
    }

    if (!window.confirm("Подтвердить выполнение запроса?")) return;

    try {
      setIsBusy(true);

      await confirmHelpResponse(requestId, responseId);
      await onChanged?.();
    } catch (e) {
      alert(e?.response?.data?.message || "Не удалось подтвердить выполнение");
    } finally {
      setIsBusy(false);
    }
  }

  async function handleDelete() {
    if (!window.confirm("Удалить запрос помощи?")) return;

    try {
      setIsBusy(true);

      await deleteHelpRequest(requestId);
      await onChanged?.();
    } catch (e) {
      alert(e?.response?.data?.message || "Не удалось удалить запрос");
    } finally {
      setIsBusy(false);
    }
  }

  function handleOpenContact() {
    if (!contactUrl) return;

    window.open(contactUrl, "_blank", "noopener,noreferrer");
  }

  return (
    <article className="help-request-card">
      <div className="help-request-card__badges">
        <span className={`help-request-card__status ${status.className}`}>
          {status.label}
        </span>

        <span className="help-request-card__reward">
          <img src="/assets/bead.svg" alt="" />
          <span>{reward} бусинок</span>
        </span>
      </div>

      <h2 className="help-request-card__title">{title}</h2>

      <p
        className={`help-request-card__description ${
          isExpanded ? "is-expanded" : ""
        }`}
      >
        {description}
      </p>

      <div className="help-request-card__bottom">
        <div className="help-request-card__author">
          <span className="help-request-card__avatar">
            {authorAvatar ? (
              <img src={authorAvatar} alt="" />
            ) : (
              <span>{getInitials(authorName)}</span>
            )}
          </span>

          <span>{authorName}</span>

          {owner && <span>(Я)</span>}

          {canWriteToAuthor && (
            <>
              <span>•</span>

              <button
                className="help-request-card__contact"
                type="button"
                onClick={handleOpenContact}
              >
                Написать
              </button>
            </>
          )}
        </div>

        <div className="help-request-card__actions">
          {canRespond && (
            <button
              className="help-request-card__button help-request-card__button--primary"
              type="button"
              onClick={handleRespond}
              disabled={isBusy}
            >
              Откликнуться
            </button>
          )}

          {canCancelMyResponse && (
            <button
              className="help-request-card__button help-request-card__button--danger"
              type="button"
              onClick={handleCancelMyResponse}
              disabled={isBusy}
            >
              Отменить отклик
            </button>
          )}

          {canEdit && (
            <button
              className="help-request-card__button help-request-card__button--primary"
              type="button"
              onClick={() => navigate(`/help-requests/${requestId}/edit`)}
              disabled={isBusy}
            >
              Редактировать
            </button>
          )}

          {canDelete && (
            <button
              className="help-request-card__button help-request-card__button--danger"
              type="button"
              onClick={handleDelete}
              disabled={isBusy}
            >
              Удалить
            </button>
          )}

          {longDescription && (
            <button
              className="help-request-card__button help-request-card__button--secondary"
              type="button"
              onClick={() => setIsExpanded((value) => !value)}
            >
              {isExpanded ? "Скрыть" : "Просмотреть"}
            </button>
          )}
        </div>
      </div>

      {owner && activeResponse && !completed && (
        <div className="help-request-card__response">
          <div className="help-request-card__response-title">
            Откликнувшийся:
          </div>

          <div className="help-request-card__response-row">
            <div className="help-request-card__responder">
              <span className="help-request-card__avatar">
                {getResponderAvatar(activeResponse) ? (
                  <img src={getResponderAvatar(activeResponse)} alt="" />
                ) : (
                  <span>{getInitials(getResponderName(activeResponse))}</span>
                )}
              </span>

              <span>{getResponderName(activeResponse)}</span>
            </div>

            <div className="help-request-card__actions">
              {canConfirm && (
                <button
                  className="help-request-card__button help-request-card__button--success"
                  type="button"
                  onClick={handleConfirmResponse}
                  disabled={isBusy}
                >
                  Подтвердить
                </button>
              )}
            </div>
          </div>

          <div className="help-request-card__note">
            <img src="/assets/info.svg" alt="" />

            <span>
              При нажатии кнопки “Подтвердить” бусинки отправятся на баланс
              выбранного сотрудника
            </span>
          </div>
        </div>
      )}

      {owner && completed && successfulResponse && (
        <div className="help-request-card__response">
          <div className="help-request-card__response-title">
            Откликнувшийся:
          </div>

          <div className="help-request-card__responder">
            <span className="help-request-card__avatar">
              {getResponderAvatar(successfulResponse) ? (
                <img src={getResponderAvatar(successfulResponse)} alt="" />
              ) : (
                <span>{getInitials(getResponderName(successfulResponse))}</span>
              )}
            </span>

            <span>{getResponderName(successfulResponse)}</span>
          </div>
        </div>
      )}
    </article>
  );
}