import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import {
  createCommunity,
  getCommunityById,
  getCommunityCategories,
  updateCommunity,
} from "../../api/communities.api";

import { getFileExtension, getFileSizeLabel } from "../../utils/files";

import "./CommunityEditorPage.css";

function getErrorMessage(error, isEdit) {
  return (
    error?.response?.data?.message ||
    (isEdit
      ? "Не удалось сохранить изменения"
      : "Не удалось создать сообщество")
  );
}

function buildCommunityFormData({
  name,
  description,
  categoryId,
  avatarFile,
}) {
  const formData = new FormData();

  formData.append("name", name.trim());
  formData.append("description", description.trim());
  formData.append("community_category_id", String(categoryId));

  if (avatarFile) {
    formData.append("avatar", avatarFile);
  }

  return formData;
}

export default function CommunityEditorPage() {
  const navigate = useNavigate();
  const params = useParams();

  const avatarInputRef = useRef(null);

  const communityId = params.id ? Number(params.id) : null;
  const isEdit = Number.isInteger(communityId) && communityId > 0;

  const [isPageLoading, setIsPageLoading] = useState(isEdit);
  const [isSaving, setIsSaving] = useState(false);

  const [error, setError] = useState("");

  const [categories, setCategories] = useState([]);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState("");

  const [currentAvatarUrl, setCurrentAvatarUrl] = useState("");
  const [avatarFile, setAvatarFile] = useState(null);

  useEffect(() => {
    async function loadData() {
      try {
        setIsPageLoading(true);
        setError("");

        const categoriesData = await getCommunityCategories();
        setCategories(categoriesData);

        if (isEdit) {
          const community = await getCommunityById(communityId);

          setName(community.name || "");
          setDescription(community.description || "");

          setCategoryId(
            community.community_category_id
              ? String(community.community_category_id)
              : ""
          );

          setCurrentAvatarUrl(community.photo_url || "");
          setAvatarFile(null);
        }
      } catch (e) {
        setError(
          e?.response?.data?.message || "Не удалось загрузить данные сообщества"
        );
      } finally {
        setIsPageLoading(false);
      }
    }

    loadData();
  }, [communityId, isEdit]);

  function handleAvatarChange(files) {
    setError("");

    const file = files?.[0];

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Можно загрузить только изображение");
      return;
    }

    setAvatarFile(file);
  }

  function removeSelectedAvatar() {
    setAvatarFile(null);

    if (avatarInputRef.current) {
      avatarInputRef.current.value = "";
    }
  }

  function handleCancel() {
    navigate("/communities");
  }

  async function handleSubmit(event) {
    event.preventDefault();

    setError("");

    if (!name.trim() || !description.trim() || !categoryId) {
      setError("Заполните обязательные поля");
      return;
    }

    try {
      setIsSaving(true);

      const formData = buildCommunityFormData({
        name,
        description,
        categoryId,
        avatarFile,
      });

      if (isEdit) {
        await updateCommunity(communityId, formData);
      } else {
        await createCommunity(formData);
      }

      navigate("/communities", { replace: true });
    } catch (e) {
      setError(getErrorMessage(e, isEdit));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="community-editor-page">
      <div className="community-editor-page__top">
        <Link className="community-editor-page__back" to="/communities">
          <img src="/assets/back_arrow.svg" alt="" />
          <span>Назад к сообществам</span>
        </Link>
      </div>

      <section className="community-editor-card">
        <h1 className="community-editor-card__title">
          {isEdit ? "Редактирование сообщества" : "Создание сообщества"}
        </h1>

        <p className="community-editor-card__subtitle">
          {isEdit
            ? "Измените данные тематического сообщества"
            : "Создайте новое тематическое сообщество для коллег"}
        </p>

        {isPageLoading ? (
          <div className="community-editor-card__loading">Загрузка...</div>
        ) : (
          <form className="community-editor-form" onSubmit={handleSubmit}>
            <div className="community-editor-form__field">
              <label
                className="community-editor-form__label"
                htmlFor="community-name"
              >
                Название сообщества *
              </label>

              <input
                id="community-name"
                className="community-editor-form__input"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Например: IT-отдел"
              />
            </div>

            <div className="community-editor-form__field">
              <label
                className="community-editor-form__label"
                htmlFor="community-description"
              >
                Описание *
              </label>

              <textarea
                id="community-description"
                className="community-editor-form__textarea"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Кратко опишите тематику сообщества..."
              />
            </div>

            <div className="community-editor-form__field">
              <label
                className="community-editor-form__label"
                htmlFor="community-category"
              >
                Категория *
              </label>

              <select
                id="community-category"
                className="community-editor-form__select"
                value={categoryId}
                onChange={(event) => setCategoryId(event.target.value)}
              >
                <option value="">Выберите категорию</option>

                {categories.map((category) => (
                  <option
                    key={category.community_category_id}
                    value={category.community_category_id}
                  >
                    {category.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="community-editor-avatar">
              <div className="community-editor-form__label">
                Поставьте аватарку
              </div>

              <button
                className="community-editor-avatar__button"
                type="button"
                onClick={() => avatarInputRef.current?.click()}
              >
                <img src="/assets/image.svg" alt="" />
                <span>Загрузить изображение</span>
              </button>

              <input
                ref={avatarInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                hidden
                onChange={(event) => {
                  handleAvatarChange(event.target.files);
                  event.target.value = "";
                }}
              />

              {avatarFile && (
                <div className="community-editor-avatar__file">
                  <img src="/assets/image.svg" alt="" />

                  <div className="community-editor-avatar__info">
                    <div className="community-editor-avatar__name">
                      {avatarFile.name}
                    </div>

                    <div className="community-editor-avatar__meta">
                      {getFileExtension(avatarFile.name) || "ИЗОБРАЖЕНИЕ"} •{" "}
                      {getFileSizeLabel(avatarFile.size)}
                    </div>
                  </div>

                  <button
                    className="community-editor-avatar__remove"
                    type="button"
                    onClick={removeSelectedAvatar}
                    aria-label="Удалить выбранную аватарку"
                  >
                    ×
                  </button>
                </div>
              )}

              {!avatarFile && currentAvatarUrl && (
                <div className="community-editor-avatar__current">
                  <img src={currentAvatarUrl} alt="" />

                  <div>
                    <div className="community-editor-avatar__name">
                      Текущая аватарка
                    </div>

                    <div className="community-editor-avatar__meta">
                      При загрузке новой аватарки она будет заменена
                    </div>
                  </div>
                </div>
              )}
            </div>

            {error && (
              <div className="community-editor-error">
                <img src="/assets/error_auth.svg" alt="" />
                <span>{error}</span>
              </div>
            )}

            <div className="community-editor-actions">
              <button
                className="community-editor-actions__submit"
                type="submit"
                disabled={isSaving}
              >
                {isSaving
                  ? "Сохранение..."
                  : isEdit
                    ? "Сохранить изменения"
                    : "Создать сообщество"}
              </button>

              <button
                className="community-editor-actions__cancel"
                type="button"
                onClick={handleCancel}
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