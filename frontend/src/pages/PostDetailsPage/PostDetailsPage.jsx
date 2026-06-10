import { useEffect, useRef, useState } from "react";
import { Link, useOutletContext, useParams } from "react-router-dom";

import { getPostById } from "../../api/posts.api";
import {
  createPostComment,
  deletePostComment,
  getPostComments,
} from "../../api/comments.api";

import PostCard from "../../components/PostCard/PostCard";
import { formatPostDate } from "../../utils/time";

import "./PostDetailsPage.css";

function getInitials(name) {
  if (!name) return "П";

  const parts = name.trim().split(/\s+/);
  return `${parts[0]?.[0] || ""}${parts[1]?.[0] || ""}` || "П";
}

function getCommentAuthor(comment) {
  return comment.author || comment.user || comment.users || {};
}

function getCommentAuthorName(comment) {
  const author = getCommentAuthor(comment);

  return (
    author.full_name ||
    author.contacts?.full_name ||
    author.login ||
    "Пользователь"
  );
}

function getCommentAuthorAvatar(comment) {
  const author = getCommentAuthor(comment);

  return author.avatar || author.contacts?.avatar || "";
}

function getCommentId(comment) {
  return comment.comment_id || comment.post_comment_id || comment.id;
}

function getCommentAuthorId(comment) {
  const author = getCommentAuthor(comment);

  return (
    comment.user_id ||
    comment.author_user_id ||
    author.user_id ||
    author.userId ||
    author.id
  );
}

function getCurrentUserId(user) {
  return user?.user_id || user?.userId;
}

function canModerateComments(user) {
  const roleName = user?.role?.name;
  const roleId = user?.role?.role_id || user?.roleId;

  return (
    roleName === "Администратор" ||
    roleName === "Системный администратор" ||
    roleId === 1 ||
    roleId === 3
  );
}

function canDeleteComment(comment, user) {
  if (
    comment.permissions?.can_delete ||
    comment.can_delete ||
    comment.canDelete
  ) {
    return true;
  }

  const currentUserId = Number(getCurrentUserId(user));
  const authorId = Number(getCommentAuthorId(comment));

  if (currentUserId && authorId && currentUserId === authorId) {
    return true;
  }

  return canModerateComments(user);
}

export default function PostDetailsPage() {
  const params = useParams();
  const postId = Number(params.id);

  const { user } = useOutletContext();

  const openedMenuRef = useRef(null);

  const [post, setPost] = useState(null);
  const [comments, setComments] = useState([]);

  const [commentText, setCommentText] = useState("");
  const [openedCommentMenuId, setOpenedCommentMenuId] = useState(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isCommentSending, setIsCommentSending] = useState(false);

  const [error, setError] = useState("");
  const [commentError, setCommentError] = useState("");

  const isCommentTextEmpty = commentText.trim().length === 0;

  async function loadPost() {
    const data = await getPostById(postId);
    setPost(data);
  }

  async function loadComments() {
    const data = await getPostComments(postId);
    setComments(data);
  }

  async function loadPage() {
    try {
      setIsLoading(true);
      setError("");

      await Promise.all([loadPost(), loadComments()]);
    } catch (e) {
      setError(e?.response?.data?.message || "Не удалось загрузить новость");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    function handleDocumentClick(event) {
      if (!openedMenuRef.current) return;

      if (!openedMenuRef.current.contains(event.target)) {
        setOpenedCommentMenuId(null);
      }
    }

    document.addEventListener("mousedown", handleDocumentClick);

    return () => {
      document.removeEventListener("mousedown", handleDocumentClick);
    };
  }, []);

  useEffect(() => {
    if (!Number.isInteger(postId) || postId <= 0) {
      setError("Некорректный идентификатор новости");
      setIsLoading(false);
      return;
    }

    loadPage();
  }, [postId]);

  async function handleCreateComment(event) {
    event.preventDefault();

    const content = commentText.trim();

    if (!content) {
      setCommentError("Введите текст комментария");
      return;
    }

    try {
      setIsCommentSending(true);
      setCommentError("");

      await createPostComment(postId, content);

      setCommentText("");

      await Promise.all([loadComments(), loadPost()]);
    } catch (e) {
      setCommentError(
        e?.response?.data?.message || "Не удалось отправить комментарий"
      );
    } finally {
      setIsCommentSending(false);
    }
  }

  async function handleDeleteComment(commentId) {
    setOpenedCommentMenuId(null);

    if (!window.confirm("Удалить комментарий?")) return;

    try {
      await deletePostComment(postId, commentId);
      await Promise.all([loadComments(), loadPost()]);
    } catch (e) {
      setCommentError(
        e?.response?.data?.message || "Не удалось удалить комментарий"
      );
    }
  }

  return (
    <div className="post-details-page">
      <div className="post-details-page__top">
        <Link className="post-details-page__back" to="/">
          <img src="/assets/back_arrow.svg" alt="" />
          <span>Назад</span>
        </Link>
      </div>

      {isLoading && (
        <div className="post-details-page__state">Загрузка...</div>
      )}

      {error && <div className="post-details-page__error">{error}</div>}

      {!isLoading && !error && post && (
        <>
          <PostCard post={post} isDetails onChanged={loadPage} />

          <section className="post-comments">
            <h2 className="post-comments__title">
              Комментарии ({comments.length})
            </h2>

            <form
              className="post-comments__form"
              onSubmit={handleCreateComment}
            >
              <div className="post-comments__my-avatar">Вы</div>

              <div className="post-comments__form-body">
                <textarea
                  className="post-comments__textarea"
                  value={commentText}
                  onChange={(event) => {
                    setCommentText(event.target.value);
                    setCommentError("");
                  }}
                  placeholder="Написать комментарий..."
                />

                {commentError && (
                  <div className="post-comments__error">
                    <img src="/assets/error_auth.svg" alt="" />
                    <span>{commentError}</span>
                  </div>
                )}

                <div className="post-comments__form-actions">
                  <button
                    className="post-comments__submit"
                    type="submit"
                    disabled={isCommentSending || isCommentTextEmpty}
                  >
                    <img src="/assets/send.svg" alt="" />
                    <span>
                      {isCommentSending ? "Отправка..." : "Отправить"}
                    </span>
                  </button>
                </div>
              </div>
            </form>

            <div className="post-comments__list">
              {comments.length === 0 && (
                <div className="post-comments__empty">
                  Комментариев пока нет
                </div>
              )}

              {comments.map((comment) => {
                const commentId = getCommentId(comment);
                const authorName = getCommentAuthorName(comment);
                const authorAvatar = getCommentAuthorAvatar(comment);

                const canDelete = canDeleteComment(comment, user);
                const isMenuOpen = openedCommentMenuId === commentId;

                return (
                  <article className="post-comment" key={commentId}>
                    <div className="post-comment__avatar">
                      {authorAvatar ? (
                        <img src={authorAvatar} alt="" />
                      ) : (
                        <span>{getInitials(authorName)}</span>
                      )}
                    </div>

                    <div className="post-comment__body">
                      <div className="post-comment__header">
                        <div>
                          <span className="post-comment__author">
                            {authorName}
                          </span>

                          <span className="post-comment__date">
                            {formatPostDate(comment.created_at)}
                          </span>
                        </div>

                        {canDelete && (
                          <div
                            className="post-comment__menu-wrap"
                            ref={isMenuOpen ? openedMenuRef : null}
                          >
                            <button
                              className="post-comment__menu"
                              type="button"
                              onClick={() =>
                                setOpenedCommentMenuId((currentId) =>
                                  currentId === commentId ? null : commentId
                                )
                              }
                            >
                              <img src="/assets/dots.svg" alt="" />
                            </button>

                            {isMenuOpen && (
                              <div className="post-comment__menu-list">
                                <button
                                  className="post-comment__menu-danger"
                                  type="button"
                                  onClick={() =>
                                    handleDeleteComment(commentId)
                                  }
                                >
                                  Удалить
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      <p className="post-comment__text">{comment.content}</p>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        </>
      )}
    </div>
  );
}