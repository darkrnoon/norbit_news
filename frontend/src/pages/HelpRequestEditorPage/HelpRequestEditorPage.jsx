import { useEffect, useState } from "react";
import {
  Link,
  useNavigate,
  useOutletContext,
  useParams,
} from "react-router-dom";

import {
  createHelpRequest,
  getHelpRequestById,
  updateHelpRequest,
} from "../../api/helpRequests.api";

import "./HelpRequestEditorPage.css";

function getProfileContact(user) {
  return (
    user?.contact?.telegram_url ||
    user?.contact?.telegramUrl ||
    user?.contacts?.telegram_url ||
    user?.contacts?.telegramUrl ||
    user?.telegram_url ||
    user?.telegramUrl ||
    user?.contact?.email ||
    user?.contacts?.email ||
    user?.email ||
    ""
  );
}

function getRequestId(params) {
  const id = Number(params.id);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function buildPayload({ title, description, reward, contact }) {
  const rewardValue = Number(reward);

  return {
    title: title.trim(),
    description: description.trim(),

    reward_amount: rewardValue,
    reward_beads: rewardValue,
    beads_amount: rewardValue,

    contact_url: contact.trim(),
    contact: contact.trim(),
  };
}

export default function HelpRequestEditorPage() {
  const navigate = useNavigate();
  const params = useParams();
  const { user } = useOutletContext();

  const requestId = getRequestId(params);
  const isEdit = Boolean(requestId);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [reward, setReward] = useState("50");
  const [contact, setContact] = useState("");
  const [useProfileContact, setUseProfileContact] = useState(false);

  const [isLoading, setIsLoading] = useState(isEdit);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  const profileContact = getProfileContact(user);

  useEffect(() => {
    if (!isEdit) return;

    async function loadRequest() {
      try {
        setIsLoading(true);
        setError("");

        const request = await getHelpRequestById(requestId);

        setTitle(request.title || "");
        setDescription(request.description || request.content || "");

        setReward(
          String(
            request.reward_amount ??
              request.reward_beads ??
              request.beads_amount ??
              request.reward ??
              50
          )
        );

        setContact(
          request.contact_url ||
            request.contact ||
            request.telegram_url ||
            ""
        );
      } catch (e) {
        setError(e?.response?.data?.message || "Не удалось загрузить запрос");
      } finally {
        setIsLoading(false);
      }
    }

    loadRequest();
  }, [isEdit, requestId]);

  function handleUseProfileContactChange(event) {
    const checked = event.target.checked;

    if (checked && !profileContact) {
      setUseProfileContact(false);
      setError("В профиле не указан контакт");
      return;
    }

    setError("");
    setUseProfileContact(checked);

    if (checked) {
      setContact(profileContact);
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();

    setError("");

    if (!title.trim() || !description.trim() || !reward || !contact.trim()) {
      setError("Заполните обязательные поля");
      return;
    }

    if (Number(reward) <= 0) {
      setError("Награда должна быть больше 0");
      return;
    }

    try {
      setIsSaving(true);

      const payload = buildPayload({
        title,
        description,
        reward,
        contact,
      });

      if (isEdit) {
        await updateHelpRequest(requestId, payload);
      } else {
        await createHelpRequest(payload);
      }

      navigate("/help-requests", { replace: true });
    } catch (e) {
      setError(
        e?.response?.data?.message ||
          (isEdit ? "Не удалось сохранить запрос" : "Не удалось создать запрос")
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="help-editor-page">
      <div className="help-editor-page__top">
        <Link className="help-editor-page__back" to="/help-requests">
          <img src="/assets/back_arrow.svg" alt="" />
          <span>Назад к запросам</span>
        </Link>
      </div>

      <section className="help-editor-card">
        <h1 className="help-editor-card__title">
          {isEdit ? "Редактирование запроса" : "Создание запроса о помощи"}
        </h1>

        <p className="help-editor-card__subtitle">
          Опишите проблему и укажите награду за помощь
        </p>

        {isLoading ? (
          <div className="help-editor-card__loading">Загрузка...</div>
        ) : (
          <form className="help-editor-form" onSubmit={handleSubmit}>
            <div className="help-editor-form__field">
              <label className="help-editor-form__label" htmlFor="help-title">
                Заголовок запроса *
              </label>

              <input
                id="help-title"
                className="help-editor-form__input"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Кратко опишите, что вам нужно..."
              />
            </div>

            <div className="help-editor-form__field">
              <label
                className="help-editor-form__label"
                htmlFor="help-description"
              >
                Подробное описание *
              </label>

              <textarea
                id="help-description"
                className="help-editor-form__textarea"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Детально опишите проблему или задачу..."
              />
            </div>

            <div className="help-editor-form__field">
              <label className="help-editor-form__label" htmlFor="help-reward">
                Награда (бусинки) *
              </label>

              <input
                id="help-reward"
                className="help-editor-form__input"
                type="number"
                min="1"
                value={reward}
                onChange={(event) => setReward(event.target.value)}
                placeholder="50"
              />
            </div>

            <div className="help-editor-note">
              <img src="/assets/info.svg" alt="" />

              <span>
                Бусинки будут списаны с вашего баланса при создании запроса и
                переданы помощнику после подтверждения
              </span>
            </div>

            <div className="help-editor-form__field">
              <label className="help-editor-form__label" htmlFor="help-contact">
                Контакты *
              </label>

              <input
                id="help-contact"
                className="help-editor-form__input"
                value={contact}
                onChange={(event) => {
                  setContact(event.target.value);
                  setUseProfileContact(false);
                }}
                placeholder="https://t.me/username"
              />             
            </div>

            {error && (
              <div className="help-editor-error">
                <img src="/assets/error_auth.svg" alt="" />
                <span>{error}</span>
              </div>
            )}

            <div className="help-editor-actions">
              <button
                className="help-editor-actions__submit"
                type="submit"
                disabled={isSaving}
              >
                {isSaving
                  ? "Сохранение..."
                  : isEdit
                    ? "Сохранить изменения"
                    : "Создать запрос"}
              </button>

              <button
                className="help-editor-actions__cancel"
                type="button"
                onClick={() => navigate("/help-requests")}
                disabled={isSaving}
              >
                Отмена
              </button>
            </div>
          </form>
        )}
      </section>
    </div>
  );
}