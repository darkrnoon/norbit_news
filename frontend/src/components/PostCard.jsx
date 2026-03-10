import React, { useEffect, useRef, useState } from "react";
import { deletePost, pinPost, unpinPost } from "../api/posts";
import "./postCard.css";
import { timeAgoRu } from "../utils/timeAgo";
import { useNavigate } from "react-router-dom";

function initials(name) {
  if (!name) return "??";
  const p = name.trim().split(/\s+/);
  return (p[0]?.[0] || "?") + (p[1]?.[0] || "");
}

export default function PostCard({
  post,
  meUserId,
  isModerator,
  canPinPosts,
  showPinBadge = true,
  onChanged,
}) {
  const nav = useNavigate();

  const pinned = post.post_pins?.some((x) => x.is_active);
  const authorId = post.author_user_id;

  const authorName =
    post.users?.contacts?.full_name || post.users?.login || "Пользователь";
  const authorPosition = post.users?.contacts?.position || "";
  const authorAvatar = post.users?.contacts?.avatar || "";

  const canEdit = Boolean(meUserId) && (authorId === meUserId || isModerator);
  const canPin = Boolean(canPinPosts);

  const [menuOpen, setMenuOpen] = useState(false);
  const [pinBusy, setPinBusy] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const onDoc = (e) => {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(e.target)) setMenuOpen(false);
    };

    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const onDelete = async () => {
    setMenuOpen(false);
    if (!confirm("Удалить новость?")) return;
    await deletePost(post.post_id);
    onChanged?.();
  };

  const onEdit = () => {
    setMenuOpen(false);
    nav(`/posts/${post.post_id}/edit`);
  };

  const onTogglePin = async () => {
    setMenuOpen(false);
    if (!canPin) return;

    try {
      setPinBusy(true);

      if (pinned) {
        await unpinPost(post.post_id);
      } else {
        await pinPost(post.post_id);
      }

      onChanged?.();
    } finally {
      setPinBusy(false);
    }
  };

  return (
    <div className="postCard">
      <div className="postTop">
        <div className="postAuthor">
          <div className="postAvatar">
            {authorAvatar ? (
              <img src={authorAvatar} alt="" />
            ) : (
              <span>{initials(authorName)}</span>
            )}
          </div>

          <div className="postAuthorText">
            <div className="postAuthorName">
              {authorName}{" "}
              {showPinBadge && pinned ? <span className="pin">📌</span> : null}
            </div>

            <div className="postMeta">
              {authorPosition ? (
                <>
                  <span>{authorPosition}</span> ·{" "}
                </>
              ) : null}

              {post.communities ? (
                <>
                  <span className="tag">Сообщество</span> ·{" "}
                  <span>{post.communities.name}</span> ·{" "}
                </>
              ) : null}

              <span>{timeAgoRu(post.published_at)}</span>
            </div>
          </div>
        </div>

        {(canEdit || canPin) && (
          <div className="postMenuWrap" ref={menuRef}>
            <button
              className="dotsBtn"
              onClick={() => setMenuOpen((v) => !v)}
            >
              ⋯
            </button>

            {menuOpen && (
              <div className="postMenu">
                {canEdit && (
                  <button className="postMenuItem" onClick={onEdit}>
                    Редактировать
                  </button>
                )}

                {canPin && (
                  <button
                    className="postMenuItem"
                    onClick={onTogglePin}
                    disabled={pinBusy}
                  >
                    {pinned ? "Открепить" : "Закрепить"}
                  </button>
                )}

                {canEdit && (
                  <button className="postMenuItem danger" onClick={onDelete}>
                    Удалить
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {post.title ? <div className="postTitle">{post.title}</div> : null}
      {post.content ? <div className="postBody">{post.content}</div> : null}
    </div>
  );
}