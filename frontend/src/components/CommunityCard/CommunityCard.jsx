import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  deleteCommunity,
  subscribeCommunity,
  unsubscribeCommunity,
} from "../../api/communities.api";

import "./CommunityCard.css";

function getInitials(name) {
  if (!name) return "С";

  const parts = name.trim().split(/\s+/);

  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }

  return `${parts[0]?.[0] || ""}${parts[1]?.[0] || ""}`.toUpperCase();
}

function getCurrentUserId(user) {
  return user?.user_id || user?.userId;
}

function canModerateCommunities(user) {
  const roleName = user?.role?.name;
  const roleId = user?.role?.role_id || user?.roleId;

  return (
    roleName === "Администратор" ||
    roleName === "Системный администратор" ||
    roleId === 1 ||
    roleId === 3
  );
}

function isCommunityOwner(community, user) {
  return Number(community.creator_user_id) === Number(getCurrentUserId(user));
}

export default function CommunityCard({ community, user, onChanged }) {
  const navigate = useNavigate();

  const menuRef = useRef(null);

  const [isBusy, setIsBusy] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const [isSubscribed, setIsSubscribed] = useState(
        Boolean(community.isSubscribed ?? community.is_subscribed)
    );

    useEffect(() => {
        setIsSubscribed(Boolean(community.isSubscribed ?? community.is_subscribed));
        }, [community.isSubscribed, community.is_subscribed, community.community_id]);

  const isOwner = isCommunityOwner(community, user);
  const isModerator = canModerateCommunities(user);

  const canEdit = isOwner;
  const canDelete = isOwner || isModerator;
  const canShowMenu = canEdit || canDelete;

  useEffect(() => {
    function handleDocumentClick(event) {
      if (!menuRef.current) return;

      if (!menuRef.current.contains(event.target)) {
        setIsMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", handleDocumentClick);

    return () => {
      document.removeEventListener("mousedown", handleDocumentClick);
    };
  }, []);

  async function handleToggleSubscription() {
    if (isBusy) return;

    const nextIsSubscribed = !isSubscribed;

    try {
        setIsBusy(true);

        if (isSubscribed) {
        await unsubscribeCommunity(community.community_id);
        } else {
        await subscribeCommunity(community.community_id);
        }

        setIsSubscribed(nextIsSubscribed);

        await onChanged?.();
    } catch (e) {
        alert(
        e?.response?.data?.message ||
            "Не удалось изменить подписку на сообщество"
        );
    } finally {
        setIsBusy(false);
    }
    }

  function handleEdit() {
    setIsMenuOpen(false);
    navigate(`/communities/${community.community_id}/edit`);
  }

  async function handleDelete() {
    setIsMenuOpen(false);

    if (!window.confirm("Удалить сообщество?")) return;

    try {
      setIsBusy(true);

      await deleteCommunity(community.community_id);

      onChanged?.();
    } catch (e) {
      alert(e?.response?.data?.message || "Не удалось удалить сообщество");
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <article className="community-card">
      <div className="community-card__top">
        <button
            className="community-card__avatar community-card__avatar-button"
            type="button"
            onClick={() => navigate(`/communities/${community.community_id}`)}
        >
          {community.photo_url ? (
            <img src={community.photo_url} alt="" />
          ) : (
            <span>{getInitials(community.name)}</span>
          )}
        </button>

        <button
        className="community-card__content community-card__content-button"
        type="button"
        onClick={() => navigate(`/communities/${community.community_id}`)}
        >
          <h2 className="community-card__title">{community.name}</h2>

          <p className="community-card__description">
            {community.description || "Описание сообщества отсутствует"}
          </p>
        </button>

        {canShowMenu && (
          <div className="community-card__menu" ref={menuRef}>
            <button
              className="community-card__menu-button"
              type="button"
              onClick={() => setIsMenuOpen((value) => !value)}
              disabled={isBusy}
            >
              <img src="/assets/dots.svg" alt="" />
            </button>

            {isMenuOpen && (
              <div className="community-card__menu-list">
                {canEdit && (
                  <button type="button" onClick={handleEdit}>
                    Редактировать
                  </button>
                )}

                {canDelete && (
                  <button
                    className="community-card__menu-danger"
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
      </div>

      <div className="community-card__bottom">
        <button
            className={`community-card__subscribe ${
                isSubscribed ? "is-subscribed" : ""
            }`}
            type="button"
            onClick={handleToggleSubscription}
            disabled={isBusy}
            >
            {isBusy ? "..." : isSubscribed ? "Отписаться" : "Подписаться"}
        </button>
      </div>
    </article>
  );
}