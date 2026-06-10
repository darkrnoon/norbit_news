import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { getMyCommunitiesFeed } from "../../api/posts.api";
import { getMyCommunities } from "../../api/communities.api";

import PostCard from "../../components/PostCard/PostCard";

import "./MySubscriptionsPage.css";

function getInitials(name) {
  if (!name) return "С";

  const parts = name.trim().split(/\s+/);

  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }

  return `${parts[0]?.[0] || ""}${parts[1]?.[0] || ""}`.toUpperCase();
}

function normalizeCommunity(community) {
  return {
    community_id: community.community_id,
    name: community.name || "Сообщество",
    photo_url: community.photo_url || "",
  };
}

export default function MySubscriptionsPage() {
  const navigate = useNavigate();

  const [posts, setPosts] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const visibleSubscriptions = subscriptions.slice(0, 5);

  async function loadPosts() {
    const data = await getMyCommunitiesFeed();
    setPosts(data);
  }

  async function loadSubscriptions() {
    const data = await getMyCommunities();
    setSubscriptions(data.map(normalizeCommunity));
  }

  async function loadPage() {
    try {
      setIsLoading(true);
      setError("");

      await Promise.all([loadPosts(), loadSubscriptions()]);
    } catch (e) {
      setError(
        e?.response?.data?.message ||
          "Не удалось загрузить новости подписок"
      );
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadPage();
  }, []);

  return (
    <div className="my-subscriptions-page">
      <section className="my-subscriptions-feed">
        {isLoading && (
          <div className="my-subscriptions-state">Загрузка...</div>
        )}

        {error && <div className="my-subscriptions-error">{error}</div>}

        {!isLoading && !error && posts.length === 0 && (
          <div className="my-subscriptions-state">
            В ваших подписках пока нет новостей
          </div>
        )}

        {!isLoading &&
          !error &&
          posts.map((post) => (
            <PostCard
              key={post.post_id}
              post={post}
              onChanged={loadPosts}
            />
          ))}
      </section>

      <aside className="my-subscriptions-sidebar">
        <h2 className="my-subscriptions-sidebar__title">Подписки</h2>

        {visibleSubscriptions.length === 0 ? (
          <div className="my-subscriptions-sidebar__empty">
            Вы пока не подписаны на сообщества
          </div>
        ) : (
          <div className="my-subscriptions-sidebar__list">
            {visibleSubscriptions.map((community) => (
              <button
                className="my-subscriptions-sidebar__item"
                type="button"
                key={community.community_id}
                onClick={() =>
                  navigate(`/communities/${community.community_id}`)
                }
              >
                <span className="my-subscriptions-sidebar__avatar">
                  {community.photo_url ? (
                    <img src={community.photo_url} alt="" />
                  ) : (
                    <span>{getInitials(community.name)}</span>
                  )}
                </span>

                <span className="my-subscriptions-sidebar__name">
                  {community.name}
                </span>
              </button>
            ))}
          </div>
        )}

        {subscriptions.length > 0 && (
          <button
            className="my-subscriptions-sidebar__show-all"
            type="button"
            onClick={() => navigate("/communities?tab=my")}
          >
            Показать все
          </button>
        )}
      </aside>
    </div>
  );
}