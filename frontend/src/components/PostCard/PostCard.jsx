import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import { deletePost, pinPost, unpinPost } from "../../api/posts.api";
import { likePost, unlikePost } from "../../api/likes.api";

import { formatPostDate } from "../../utils/time";
import { getFileExtension, getFileName, getFileSizeLabel, isImageAttachment } from "../../utils/files";

import "./PostCard.css";

function getInitials(name) {
  if (!name) return "П";
  const parts = name.trim().split(/\s+/);
  return `${parts[0]?.[0] || ""}${parts[1]?.[0] || ""}` || "П";
}

function PostImages({ images }) {
  const [index, setIndex] = useState(0);

  if (!images.length) return null;

  const currentImage = images[index];

  function prev() {
    setIndex((value) => (value === 0 ? images.length - 1 : value - 1));
  }

  function next() {
    setIndex((value) => (value === images.length - 1 ? 0 : value + 1));
  }

  return (
    <div className="post-card__image-wrap">
      <img className="post-card__image" src={currentImage.file_url} alt="" />

      {images.length > 1 && (
        <>
          <button
            className="post-card__image-arrow post-card__image-arrow--left"
            type="button"
            onClick={prev}
          >
            <img src="/assets/arrow_left.svg" alt="" />
          </button>

          <button
            className="post-card__image-arrow post-card__image-arrow--right"
            type="button"
            onClick={next}
          >
            <img src="/assets/arrow_right.svg" alt="" />
          </button>
        </>
      )}
    </div>
  );
}

function PostFiles({ files }) {
  if (!files.length) return null;

  return (
    <div className="post-card__files">
      {files.map((file) => (
        <a
          className="post-card__file"
          key={file.attachment_id}
          href={file.file_url}
          target="_blank"
          rel="noreferrer"
        >
          <img src="/assets/file.svg" alt="" />

          <span className="post-card__file-info">
            <span className="post-card__file-name">
              {file.original_name || getFileName(file.file_url)}
            </span>

            <span className="post-card__file-meta">
              {getFileExtension(file.file_url) || "ФАЙЛ"} • {getFileSizeLabel(file.file_size)}
            </span>
          </span>
        </a>
      ))}
    </div>
  );
}

export default function PostCard({
  post,
  onChanged,
  isDetails = false,
  hideCommunitySource = false,
}) {
  const navigate = useNavigate();

  const [menuOpen, setMenuOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [liked, setLiked] = useState(Boolean(post.is_liked_by_me));
  const [likesCount, setLikesCount] = useState(post.counters?.likes ?? 0);

  const menuRef = useRef(null);

  const author = post.author || {};
  const authorName = author.full_name || "Пользователь";
  const authorAvatar = author.avatar || "";

  const images = post.attachments?.filter(isImageAttachment) || [];
  const files = post.attachments?.filter((item) => !isImageAttachment(item)) || [];

  const canEdit = Boolean(post.permissions?.can_edit);
  const canDelete = Boolean(post.permissions?.can_delete);
  const canPin = Boolean(post.permissions?.can_pin);

  const showCommunitySource = post.source?.type === "community" && !hideCommunitySource;

  useEffect(() => {
    function handleDocumentClick(event) {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(event.target)) {
        setMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", handleDocumentClick);

    return () => {
      document.removeEventListener("mousedown", handleDocumentClick);
    };
  }, []);

  async function handleLike() {
    try {
      if (liked) {
        const result = await unlikePost(post.post_id);
        setLiked(false);
        setLikesCount(result.likes_count);
      } else {
        const result = await likePost(post.post_id);
        setLiked(true);
        setLikesCount(result.likes_count);
      }
    } catch (e) {
      alert(e?.response?.data?.message || "Не удалось изменить лайк");
    }
  }

  async function handleDelete() {
    setMenuOpen(false);

    if (!window.confirm("Удалить новость?")) return;

    try {
      setBusy(true);
      await deletePost(post.post_id);
      onChanged?.();
    } catch (e) {
      alert(e?.response?.data?.message || "Не удалось удалить новость");
    } finally {
      setBusy(false);
    }
  }

  async function handlePinToggle() {
    setMenuOpen(false);

    try {
      setBusy(true);

      if (post.is_pinned) {
        await unpinPost(post.post_id);
      } else {
        await pinPost(post.post_id);
      }

      onChanged?.();
    } catch (e) {
      alert(e?.response?.data?.message || "Не удалось изменить закрепление");
    } finally {
      setBusy(false);
    }
  }

  function handleEdit() {
    setMenuOpen(false);
    navigate(`/posts/${post.post_id}/edit`);
  }

  return (
    <article className="post-card">
      <header className="post-card__header">
        <div className="post-card__author">
          <div className="post-card__avatar">
            {authorAvatar ? (
              <img src={authorAvatar} alt="" />
            ) : (
              <span>{getInitials(authorName)}</span>
            )}
          </div>

          <div className="post-card__author-content">
            <div className="post-card__author-row">
              <span className="post-card__author-name">{authorName}</span>

              {post.is_pinned && (
                <img
                  className="post-card__pin-icon"
                  src="/assets/pin.svg"
                  alt=""
                />
              )}
            </div>

            <div className="post-card__meta">
              {showCommunitySource ? (
                <>
                  <span className="post-card__community-badge">Сообщество</span>
                  <span className="post-card__dot">•</span>
                  <span>{post.source.name}</span>
                  <span className="post-card__dot">•</span>
                  <span>{formatPostDate(post.published_at)}</span>
                </>
              ) : (
                <>
                  {author.role?.should_display && (
                    <>
                      <span>{author.role.name}</span>
                      <span className="post-card__dot">•</span>
                    </>
                  )}

                  <span>{formatPostDate(post.published_at)}</span>
                </>
              )}
            </div>
          </div>
        </div>

        {(canEdit || canDelete || canPin) && (
          <div className="post-card__menu" ref={menuRef}>
            <button
              className="post-card__menu-button"
              type="button"
              disabled={busy}
              onClick={() => setMenuOpen((value) => !value)}
            >
              <img src="/assets/dots.svg" alt="" />
            </button>

            {menuOpen && (
              <div className="post-card__menu-list">
                {canEdit && (
                  <button type="button" onClick={handleEdit}>
                    Редактировать
                  </button>
                )}

                {canPin && (
                  <button type="button" onClick={handlePinToggle}>
                    {post.is_pinned ? "Открепить" : "Закрепить"}
                  </button>
                )}

                {canDelete && (
                  <button
                    className="post-card__menu-danger"
                    type="button"
                    onClick={handleDelete}
                  >
                    Удалить
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </header>

      {post.title && (
        <h2
          className="post-card__title"
          onClick={() => !isDetails && navigate(`/posts/${post.post_id}`)}
        >
          {post.title}
        </h2>
      )}

      {post.content && (
        <p
          className={`post-card__text ${
            isDetails ? "post-card__text--full" : ""
          }`}
          onClick={() => !isDetails && navigate(`/posts/${post.post_id}`)}
        >
          {post.content}
        </p>
      )}

      <PostImages images={images} />
      <PostFiles files={files} />

      <footer className="post-card__footer">
        <button
          className={`post-card__counter ${liked ? "post-card__counter--active" : ""}`}
          type="button"
          onClick={handleLike}
        >
          <img src="/assets/like.svg" alt="" />
          <span>{likesCount}</span>
        </button>

        <button
          className="post-card__counter"
          type="button"
          onClick={() => navigate(`/posts/${post.post_id}`)}
        >
          <img src="/assets/comment.svg" alt="" />
          <span>{post.counters?.comments ?? 0}</span>
      </button>
      </footer>
    </article>
  );
}