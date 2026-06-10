import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useOutletContext, useParams } from "react-router-dom";

import {
  deleteCommunity,
  getCommunityById,
  getCommunityPosts,
  subscribeCommunity,
  unsubscribeCommunity,
} from "../../api/communities.api";

import PostCard from "../../components/PostCard/PostCard";

import "./CommunityDetailsPage.css";

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

function getCommunityCreatorId(community) {
  return (
    community.creator_user_id ||
    community.creator?.user_id ||
    community.creator?.userId
  );
}

function isCommunityOwner(community, user) {
  return Number(getCommunityCreatorId(community)) === Number(getCurrentUserId(user));
}

function getSubscribersCount(community) {
  return (
    community.subscribers_count ??
    community.members_count ??
    community.subscriptions_count ??
    0
  );
}

function getSubscriptionState(community) {
  return Boolean(community.isSubscribed ?? community.is_subscribed);
}

function formatCommunityDate(date) {
  if (!date) return "дата не указана";

  return new Date(date).toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function getMembersWord(count) {
  const value = Math.abs(Number(count));

  if (value % 10 === 1 && value % 100 !== 11) {
    return "участник";
  }

  if ([2, 3, 4].includes(value % 10) && ![12, 13, 14].includes(value % 100)) {
    return "участника";
  }

  return "участников";
}

export default function CommunityDetailsPage() {
  const params = useParams();
  const navigate = useNavigate();
  const { user } = useOutletContext();

  const menuRef = useRef(null);

  const communityId = Number(params.id);

  const [community, setCommunity] = useState(null);
  const [posts, setPosts] = useState([]);

  const [isLoading, setIsLoading] = useState(true);
  const [isBusy, setIsBusy] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const [error, setError] = useState("");

  const isOwner = community ? isCommunityOwner(community, user) : false;
  const isModerator = canModerateCommunities(user);

  const canEdit = isOwner;
  const canDelete = isOwner || isModerator;
  const canShowMenu = canEdit || canDelete;

  const isSubscribed = community ? getSubscriptionState(community) : false;
  const subscribersCount = community ? getSubscribersCount(community) : 0;

  async function loadCommunity() {
    const data = await getCommunityById(communityId);
    setCommunity(data);
  }

  async function loadPosts() {
    const data = await getCommunityPosts(communityId);
    setPosts(data);
  }

  async function loadPage() {
    try {
      setIsLoading(true);
      setError("");

      await Promise.all([loadCommunity(), loadPosts()]);
    } catch (e) {
      setError(e?.response?.data?.message || "Не удалось загрузить сообщество");
    } finally {
      setIsLoading(false);
    }
  }

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

  useEffect(() => {
    if (!Number.isInteger(communityId) || communityId <= 0) {
      setError("Некорректный идентификатор сообщества");
      setIsLoading(false);
      return;
    }

    loadPage();
  }, [communityId]);

  async function handleToggleSubscription() {
    if (isBusy || !community) return;

    try {
      setIsBusy(true);

      if (isSubscribed) {
        await unsubscribeCommunity(community.community_id);
      } else {
        await subscribeCommunity(community.community_id);
      }

      await loadCommunity();
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

      navigate("/communities", { replace: true });
    } catch (e) {
      alert(e?.response?.data?.message || "Не удалось удалить сообщество");
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <div className="community-details-page">
      <div className="community-details-page__top">
        <Link className="community-details-page__back" to="/communities">
          <img src="/assets/back_arrow.svg" alt="" />
          <span>Назад</span>
        </Link>
      </div>

      {isLoading && (
        <div className="community-details-state">Загрузка...</div>
      )}

      {error && <div className="community-details-error">{error}</div>}

      {!isLoading && !error && community && (
        <>
          <section className="community-details-card">
            <div className="community-details-card__avatar">
              {community.photo_url ? (
                <img src={community.photo_url} alt="" />
              ) : (
                <span>{getInitials(community.name)}</span>
              )}
            </div>

            <div className="community-details-card__content">
              <h1 className="community-details-card__title">
                {community.name}
              </h1>

              <p className="community-details-card__description">
                {community.description || "Описание сообщества отсутствует"}
              </p>

              <div className="community-details-card__meta">
                <span className="community-details-card__meta-item">
                  <img src="/assets/users.svg" alt="" />
                  <span>
                    {subscribersCount} {getMembersWord(subscribersCount)}
                  </span>
                </span>

                <span className="community-details-card__meta-item">
                  <img src="/assets/calendar.svg" alt="" />
                  <span>
                    Создано {formatCommunityDate(community.created_at)}
                  </span>
                </span>
              </div>
            </div>

            <div className="community-details-card__actions">
              <button
                className={`community-details-card__subscribe ${
                  isSubscribed ? "is-subscribed" : ""
                }`}
                type="button"
                onClick={handleToggleSubscription}
                disabled={isBusy}
              >
                {isBusy ? "..." : isSubscribed ? "Отписаться" : "Подписаться"}
              </button>

              {canShowMenu && (
                <div className="community-details-card__menu" ref={menuRef}>
                  <button
                    className="community-details-card__menu-button"
                    type="button"
                    disabled={isBusy}
                    onClick={() => setIsMenuOpen((value) => !value)}
                  >
                    <img src="/assets/dots.svg" alt="" />
                  </button>

                  {isMenuOpen && (
                    <div className="community-details-card__menu-list">
                      {canEdit && (
                        <button type="button" onClick={handleEdit}>
                          Редактировать
                        </button>
                      )}

                      {canDelete && (
                        <button
                          className="community-details-card__menu-danger"
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
          </section>

          <div className="community-details-posts">
            {posts.length === 0 && (
              <div className="community-details-state">
                В этом сообществе пока нет новостей
              </div>
            )}

            {posts.map((post) => (
              <PostCard
                key={post.post_id}
                post={post}
                hideCommunitySource
                onChanged={loadPosts}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}