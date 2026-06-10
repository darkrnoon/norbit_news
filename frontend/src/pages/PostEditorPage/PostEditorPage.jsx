import { useEffect, useMemo, useRef, useState } from "react";
import {
  Link,
  useNavigate,
  useOutletContext,
  useParams,
} from "react-router-dom";

import {
  createPost,
  getPostById,
  pinPost,
  unpinPost,
  updatePost,
} from "../../api/posts.api";

import { getMyCommunities } from "../../api/communities.api";

import {
  getFileExtension,
  getFileName,
  getFileSizeLabel,
} from "../../utils/files";

import "./PostEditorPage.css";

const MAX_FILES_COUNT = 4;

function canUserPinPosts(user) {
  const roleName = user?.role?.name;
  const roleId = user?.role?.role_id;

  return (
    roleName === "Администратор" ||
    roleName === "Системный администратор" ||
    roleName === "Директор" ||
    roleId === 1 ||
    roleId === 3 ||
    roleId === 4
  );
}

function getErrorMessage(error) {
  return (
    error?.response?.data?.message ||
    "Не удалось сохранить новость. Попробуйте еще раз"
  );
}

function isRequiredFieldsFilled(title, content) {
  return title.trim() && content.trim();
}

function buildPostFormData({
  title,
  content,
  communityId,
  newFiles,
  existingAttachments,
  isEdit,
}) {
  const formData = new FormData();

  formData.append("title", title.trim());
  formData.append("content", content.trim());

  if (communityId) {
    formData.append("is_community_post", "true");
    formData.append("community_id", String(communityId));
  } else {
    formData.append("is_community_post", "false");
  }

  if (isEdit) {
    formData.append(
      "keep_attachment_ids",
      JSON.stringify(
        existingAttachments.map((attachment) => attachment.attachment_id)
      )
    );
  }

  newFiles.forEach((file) => {
    formData.append("attachments", file);
  });

  return formData;
}

function getAttachmentDisplayName(attachment) {
  return attachment.original_name || getFileName(attachment.file_url);
}

function getAttachmentExtension(attachment) {
  return (
    getFileExtension(attachment.original_name) ||
    getFileExtension(attachment.file_url) ||
    "ФАЙЛ"
  );
}

export default function PostEditorPage() {
  const navigate = useNavigate();
  const params = useParams();
  const { user } = useOutletContext();

  const imageInputRef = useRef(null);
  const fileInputRef = useRef(null);

  const postId = params.id ? Number(params.id) : null;
  const isEdit = Number.isInteger(postId) && postId > 0;

  const [isLoading, setIsLoading] = useState(isEdit);
  const [isSaving, setIsSaving] = useState(false);

  const [error, setError] = useState("");

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");

  const [communities, setCommunities] = useState([]);
  const [communityId, setCommunityId] = useState("");

  const [isPinned, setIsPinned] = useState(false);

  const [existingAttachments, setExistingAttachments] = useState([]);
  const [newFiles, setNewFiles] = useState([]);

  const canPin = useMemo(() => canUserPinPosts(user), [user]);

  const totalFilesCount = existingAttachments.length + newFiles.length;

  useEffect(() => {
    async function loadCommunities() {
      try {
        const data = await getMyCommunities();
        setCommunities(data);
      } catch {
        setCommunities([]);
      }
    }

    loadCommunities();
  }, []);

  useEffect(() => {
    if (!isEdit) return;

    async function loadPost() {
      try {
        setIsLoading(true);
        setError("");

        const post = await getPostById(postId);

        setTitle(post.title || "");
        setContent(post.content || "");

        setCommunityId(
          post.community?.community_id
            ? String(post.community.community_id)
            : ""
        );

        setIsPinned(Boolean(post.is_pinned));
        setExistingAttachments(post.attachments || []);
        setNewFiles([]);
      } catch (e) {
        setError(getErrorMessage(e));
      } finally {
        setIsLoading(false);
      }
    }

    loadPost();
  }, [isEdit, postId]);

  function handleCancel() {
    navigate(-1);
  }

  function addFiles(selectedFiles) {
    setError("");

    const incomingFiles = Array.from(selectedFiles || []);

    if (incomingFiles.length === 0) return;

    const availableSlots = MAX_FILES_COUNT - totalFilesCount;

    if (availableSlots <= 0) {
      setError("Можно прикрепить не более 4 файлов");
      return;
    }

    if (incomingFiles.length > availableSlots) {
      setError("Можно прикрепить не более 4 файлов");
    }

    setNewFiles((prev) => [
      ...prev,
      ...incomingFiles.slice(0, availableSlots),
    ]);
  }

  function removeExistingAttachment(attachmentId) {
    setExistingAttachments((prev) =>
      prev.filter((attachment) => attachment.attachment_id !== attachmentId)
    );
  }

  function removeNewFile(indexToRemove) {
    setNewFiles((prev) => prev.filter((_, index) => index !== indexToRemove));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    setError("");

    if (!isRequiredFieldsFilled(title, content)) {
      setError("Заполните обязательные поля");
      return;
    }

    try {
      setIsSaving(true);

      const formData = buildPostFormData({
        title,
        content,
        communityId,
        newFiles,
        existingAttachments,
        isEdit,
      });

      if (isEdit) {
        await updatePost(postId, formData);

        if (canPin) {
          if (isPinned) {
            await pinPost(postId);
          } else {
            await unpinPost(postId);
          }
        }
      } else {
        const createdPost = await createPost(formData);

        if (canPin && isPinned) {
          await pinPost(createdPost.post_id);
        }
      }

      navigate("/", { replace: true });
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="post-editor-page">
      <div className="post-editor-page__top">
        <Link className="post-editor-page__back" to="/">
          <img src="/assets/back_arrow.svg" alt="" />
          <span>Назад к ленте</span>
        </Link>
      </div>

      <section className="post-editor-card">
        <h1 className="post-editor-card__title">
          {isEdit ? "Редактирование новости" : "Создание новости"}
        </h1>

        <p className="post-editor-card__subtitle">
          Поделитесь новостью с коллегами
        </p>

        {isLoading ? (
          <div className="post-editor-card__loading">Загрузка...</div>
        ) : (
          <form className="post-editor-form" onSubmit={handleSubmit}>
            <div className="post-editor-form__field">
              <label className="post-editor-form__label" htmlFor="post-title">
                Заголовок *
              </label>

              <input
                id="post-title"
                className="post-editor-form__input"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Введите заголовок новости..."
              />
            </div>

            <div className="post-editor-form__field">
              <label className="post-editor-form__label" htmlFor="post-content">
                Содержание *
              </label>

              <textarea
                id="post-content"
                className="post-editor-form__textarea"
                value={content}
                onChange={(event) => setContent(event.target.value)}
                placeholder="Расскажите подробнее..."
              />
            </div>

            <div className="post-editor-form__field">
              <label
                className="post-editor-form__label"
                htmlFor="post-community"
              >
                От лица сообщества &#40;опционально&#41;
              </label>

              <select
                id="post-community"
                className="post-editor-form__select"
                value={communityId}
                onChange={(event) => setCommunityId(event.target.value)}
              >
                <option value="">Выберите сообщество</option>

                {communities.map((community) => (
                  <option
                    key={community.community_id}
                    value={community.community_id}
                  >
                    {community.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="post-editor-pin">
              <div>
                <div className="post-editor-pin__title">
                  Закрепить новость
                </div>

                <div className="post-editor-pin__text">
                  Новость будет показываться вверху ленты
                </div>
              </div>

              <label
                className={`post-editor-switch ${
                  !canPin ? "post-editor-switch--disabled" : ""
                }`}
              >
                <input
                  type="checkbox"
                  checked={isPinned}
                  onChange={(event) => setIsPinned(event.target.checked)}
                  disabled={!canPin}
                />

                <span />
              </label>
            </div>

            <div className="post-editor-files">
              <div className="post-editor-form__label">
                Прикрепить файлы
              </div>

              <div className="post-editor-files__actions">
                <button
                  className="post-editor-files__button"
                  type="button"
                  onClick={() => imageInputRef.current?.click()}
                >
                  <img src="/assets/image.svg" alt="" />
                  <span>Изображение</span>
                </button>

                <button
                  className="post-editor-files__button"
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <img src="/assets/file_attach.svg" alt="" />
                  <span>Файл</span>
                </button>
              </div>

              <input
                ref={imageInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                multiple
                hidden
                onChange={(event) => {
                  addFiles(event.target.files);
                  event.target.value = "";
                }}
              />

              <input
                ref={fileInputRef}
                type="file"
                multiple
                hidden
                onChange={(event) => {
                  addFiles(event.target.files);
                  event.target.value = "";
                }}
              />

              {(existingAttachments.length > 0 || newFiles.length > 0) && (
                <div className="post-editor-files__list">
                  {existingAttachments.map((attachment) => (
                    <div
                      className="post-editor-files__item"
                      key={`existing-${attachment.attachment_id}`}
                    >
                      <img src="/assets/file.svg" alt="" />

                      <div className="post-editor-files__info">
                        <div className="post-editor-files__name">
                          {getAttachmentDisplayName(attachment)}
                        </div>

                        <div className="post-editor-files__meta">
                          {getAttachmentExtension(attachment)} •{" "}
                          {getFileSizeLabel(attachment.file_size)}
                        </div>
                      </div>

                      <button
                        className="post-editor-files__remove"
                        type="button"
                        onClick={() =>
                          removeExistingAttachment(attachment.attachment_id)
                        }
                        aria-label="Удалить файл"
                      >
                        ×
                      </button>
                    </div>
                  ))}

                  {newFiles.map((file, index) => (
                    <div
                      className="post-editor-files__item"
                      key={`new-${file.name}-${file.size}-${index}`}
                    >
                      <img src="/assets/file.svg" alt="" />

                      <div className="post-editor-files__info">
                        <div className="post-editor-files__name">
                          {file.name}
                        </div>

                        <div className="post-editor-files__meta">
                          {getFileExtension(file.name) || "ФАЙЛ"} •{" "}
                          {getFileSizeLabel(file.size)}
                        </div>
                      </div>

                      <button
                        className="post-editor-files__remove"
                        type="button"
                        onClick={() => removeNewFile(index)}
                        aria-label="Удалить файл"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {error && (
              <div className="post-editor-error">
                <img src="/assets/error_auth.svg" alt="" />
                <span>{error}</span>
              </div>
            )}

            <div className="post-editor-actions">
              <button
                className="post-editor-actions__submit"
                type="submit"
                disabled={isSaving}
              >
                {isSaving
                  ? "Сохранение..."
                  : isEdit
                    ? "Сохранить"
                    : "Опубликовать"}
              </button>

              <button
                className="post-editor-actions__cancel"
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