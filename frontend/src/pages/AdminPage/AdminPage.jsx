import { useEffect, useMemo, useState } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";

import {
  deleteAdminCommunity,
  deleteAdminHelpRequest,
  deleteAdminPost,
  deleteAdminPostComment,
  getAdminCommunities,
  getAdminCommunityById,
  getAdminHelpRequestById,
  getAdminHelpRequests,
  getAdminPostById,
  getAdminPostComments,
  getAdminPosts,
  getAdminStats,
} from "../../api/admin.api";

import "./AdminPage.css";

const TABS = {
  POSTS: "posts",
  COMMUNITIES: "communities",
  HELP_REQUESTS: "helpRequests",
};

function normalizeText(value) {
  return String(value || "").trim().toLowerCase();
}

function getInitials(name) {
  if (!name) return "П";

  const parts = name.trim().split(/\s+/);

  return `${parts[0]?.[0] || ""}${parts[1]?.[0] || ""}` || "П";
}

function formatDateTime(value) {
  if (!value) return "дата не указана";

  return new Date(value).toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDate(value) {
  if (!value) return "дата не указана";

  return new Date(value).toLocaleDateString("ru-RU");
}

function formatRelativeActivity(value) {
  if (!value) return "активности не было";

  const date = new Date(value);
  const diffMs = Date.now() - date.getTime();

  const minutes = Math.floor(diffMs / 1000 / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (minutes < 1) return "только что";
  if (minutes < 60) return `${minutes} мин. назад`;
  if (hours < 24) return `${hours} ч. назад`;

  return `${days} дн. назад`;
}

function getValueByPath(object, path) {
  return path.split(".").reduce((current, key) => {
    if (current === undefined || current === null) return undefined;
    return current[key];
  }, object);
}

function toSafeNumber(value) {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  if (Array.isArray(value)) {
    return value.length;
  }

  if (typeof value === "object") {
    return toSafeNumber(
      value.total ??
        value.count ??
        value.value ??
        value.total_count ??
        value.current ??
        value.all ??
        value.amount
    );
  }

  const number = Number(String(value).replace(/\s/g, "").replace(",", "."));

  return Number.isFinite(number) ? number : null;
}

function getStatsValue(stats, paths, fallback = 0) {
  for (const path of paths) {
    const value = getValueByPath(stats, path);
    const number = toSafeNumber(value);

    if (number !== null) {
      return number;
    }
  }

  return fallback;
}

function normalizeStats(stats) {
  return {
    usersTotal: getStatsValue(stats, [
      "users_total",
      "total_users",
      "usersTotal",
      "totalUsers",
      "users.total",
      "users.count",
      "users.total_count",
      "users.value",
      "users",
    ]),

    usersWeek: getStatsValue(stats, [
      "users_week",
      "users_new_week",
      "new_users_week",
      "newUsersWeek",
      "users.week",
      "users.new_week",
      "users.newWeek",
      "users.this_week",
      "users.thisWeek",
      "users.week_count",
      "users.weekCount",
    ]),

    postsTotal: getStatsValue(stats, [
      "posts_total",
      "total_posts",
      "postsTotal",
      "totalPosts",
      "posts.total",
      "posts.count",
      "posts.total_count",
      "posts.value",
      "posts",
    ]),

    postsWeek: getStatsValue(stats, [
      "posts_week",
      "posts_new_week",
      "new_posts_week",
      "newPostsWeek",
      "posts.week",
      "posts.new_week",
      "posts.newWeek",
      "posts.this_week",
      "posts.thisWeek",
      "posts.week_count",
      "posts.weekCount",
    ]),

    communitiesTotal: getStatsValue(stats, [
      "communities_total",
      "total_communities",
      "communitiesTotal",
      "totalCommunities",
      "communities.total",
      "communities.count",
      "communities.total_count",
      "communities.value",
      "communities",
    ]),

    communitiesWeek: getStatsValue(stats, [
      "communities_week",
      "communities_new_week",
      "new_communities_week",
      "newCommunitiesWeek",
      "communities.week",
      "communities.new_week",
      "communities.newWeek",
      "communities.this_week",
      "communities.thisWeek",
      "communities.week_count",
      "communities.weekCount",
    ]),

    helpTotal: getStatsValue(stats, [
      "help_requests_total",
      "total_help_requests",
      "helpRequestsTotal",
      "totalHelpRequests",
      "help_requests.total",
      "help_requests.count",
      "help_requests.total_count",
      "help_requests.value",
      "helpRequests.total",
      "helpRequests.count",
      "helpRequests.value",
      "helpRequests",
    ]),

    helpWeek: getStatsValue(stats, [
      "help_requests_week",
      "help_requests_new_week",
      "new_help_requests_week",
      "newHelpRequestsWeek",
      "help_requests.week",
      "help_requests.new_week",
      "help_requests.newWeek",
      "help_requests.this_week",
      "help_requests.thisWeek",
      "helpRequests.week",
      "helpRequests.newWeek",
      "helpRequests.thisWeek",
      "helpRequests.week_count",
      "helpRequests.weekCount",
    ]),
  };
}

function getPostId(post) {
  return post.post_id || post.id;
}

function getCommunityId(community) {
  return community.community_id || community.id;
}

function getHelpRequestId(request) {
  return request.help_request_id || request.request_id || request.id;
}

function isDeleted(item) {
  const status = item?.status || item?.request_status;

  return Boolean(
    item?.deleted_at ||
      item?.deletedAt ||
      item?.is_deleted ||
      item?.isDeleted ||
      item?.deleted ||
      status === "deleted"
  );
}

function getPostAuthorName(post) {
  return (
    post.author?.full_name ||
    post.author?.contacts?.full_name ||
    post.users?.contacts?.full_name ||
    post.users?.login ||
    post.author?.login ||
    "Пользователь"
  );
}

function getPostAuthorAvatar(post) {
  return (
    post.author?.avatar ||
    post.author?.contacts?.avatar ||
    post.users?.contacts?.avatar ||
    ""
  );
}

function getPostCommunityName(post) {
  return (
    post.community?.name ||
    post.communities?.name ||
    post.source?.name ||
    ""
  );
}

function getPostLikesCount(post) {
  return (
    post.counters?.likes ??
    post._count?.post_likes ??
    post.likes_count ??
    post.likesCount ??
    0
  );
}

function getPostCommentsCount(post) {
  return (
    post.counters?.comments ??
    post._count?.post_comments ??
    post.comments_count ??
    post.commentsCount ??
    0
  );
}

function getCommunitySubscribersCount(community) {
  return (
    community.subscribers_count ??
    community.members_count ??
    community.subscriptions_count ??
    community.membersCount ??
    community.subscribersCount ??
    community._count?.community_subscriptions ??
    0
  );
}

function getCommunityPostsCount(community) {
  return (
    community.posts_count ??
    community.publications_count ??
    community.postsCount ??
    community.publicationsCount ??
    community._count?.posts ??
    0
  );
}

function getCommunityTodayPostsCount(community) {
  return (
    community.today_posts_count ??
    community.activity_today ??
    community.posts_today ??
    community.todayPostsCount ??
    community.activityToday ??
    0
  );
}

function getCommunityLastActivity(community) {
  return (
    community.last_post_at ||
    community.last_activity_at ||
    community.lastPostAt ||
    community.lastActivityAt ||
    community.updated_at ||
    community.created_at
  );
}

function getCommunityCreatorName(community) {
  return (
    community.creator?.contacts?.full_name ||
    community.creator?.full_name ||
    community.users?.contacts?.full_name ||
    community.users?.login ||
    community.creator?.login ||
    "Пользователь"
  );
}

function getHelpAuthorName(request) {
  return (
    request.author?.full_name ||
    request.author?.contacts?.full_name ||
    request.user?.contacts?.full_name ||
    request.users?.contacts?.full_name ||
    request.users?.login ||
    request.author?.login ||
    "Пользователь"
  );
}

function getHelpAuthorAvatar(request) {
  return (
    request.author?.avatar ||
    request.author?.contacts?.avatar ||
    request.users?.contacts?.avatar ||
    ""
  );
}

function getHelpReward(request) {
  return (
    request.reward_amount ??
    request.reward_beads ??
    request.beads_amount ??
    request.reward ??
    0
  );
}

function getHelpDescription(request) {
  return request.description || request.content || "";
}

function getHelpResponses(request) {
  return (
    request.responses ||
    request.help_responses ||
    request.helpResponses ||
    []
  );
}

function getResponseStatus(response) {
  return response?.status || response?.response_status;
}

function isActiveResponse(response) {
  const status = getResponseStatus(response);
  return status === "active" || status === "in_progress";
}

function isSuccessfulResponse(response) {
  const status = getResponseStatus(response);
  return status === "successful" || status === "completed";
}

function getActiveHelpResponse(request) {
  return (
    request.active_response ||
    request.activeResponse ||
    getHelpResponses(request).find(isActiveResponse) ||
    null
  );
}

function getSuccessfulHelpResponse(request) {
  return (
    request.successful_response ||
    request.successfulResponse ||
    getHelpResponses(request).find(isSuccessfulResponse) ||
    null
  );
}

function getResponder(response) {
  return response?.responder || response?.user || response?.users || {};
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

function getHelpStatus(request) {
  if (isDeleted(request)) {
    return {
      label: "Удалено",
      className: "is-deleted",
    };
  }

  const status = request.status || request.request_status;

  if (
    status === "completed" ||
    status === "done" ||
    getSuccessfulHelpResponse(request)
  ) {
    return {
      label: "Завершен",
      className: "is-completed",
    };
  }

  if (status === "in_progress" || getActiveHelpResponse(request)) {
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

export default function AdminPage() {
  const navigate = useNavigate();
  const outletContext = useOutletContext();
  const logout = outletContext?.logout;

  const [activeTab, setActiveTab] = useState(TABS.POSTS);

  const [stats, setStats] = useState(null);

  const [posts, setPosts] = useState([]);
  const [communities, setCommunities] = useState([]);
  const [helpRequests, setHelpRequests] = useState([]);

  const [selectedPost, setSelectedPost] = useState(null);
  const [selectedCommunity, setSelectedCommunity] = useState(null);
  const [selectedHelpRequest, setSelectedHelpRequest] = useState(null);

  const [comments, setComments] = useState([]);
  const [showComments, setShowComments] = useState(false);

  const [search, setSearch] = useState("");

  const [isLoading, setIsLoading] = useState(true);
  const [isDetailsLoading, setIsDetailsLoading] = useState(false);
  const [error, setError] = useState("");

  const normalizedStats = normalizeStats(stats || {});

  const filteredPosts = useMemo(() => {
    const query = normalizeText(search);

    return posts.filter((post) => {
      if (!query) return true;

      return (
        normalizeText(post.title).includes(query) ||
        normalizeText(post.content).includes(query) ||
        normalizeText(getPostAuthorName(post)).includes(query) ||
        normalizeText(getPostCommunityName(post)).includes(query)
      );
    });
  }, [posts, search]);

  const filteredCommunities = useMemo(() => {
    const query = normalizeText(search);

    return communities.filter((community) => {
      if (!query) return true;

      return (
        normalizeText(community.name).includes(query) ||
        normalizeText(community.description).includes(query)
      );
    });
  }, [communities, search]);

  const filteredHelpRequests = useMemo(() => {
    const query = normalizeText(search);

    return helpRequests.filter((request) => {
      if (!query) return true;

      return (
        normalizeText(request.title).includes(query) ||
        normalizeText(getHelpDescription(request)).includes(query) ||
        normalizeText(getHelpAuthorName(request)).includes(query)
      );
    });
  }, [helpRequests, search]);

  async function loadStats() {
    const data = await getAdminStats();
    setStats(data);
  }

  async function loadPosts() {
    const data = await getAdminPosts();
    setPosts(data);
  }

  async function loadCommunities() {
    const data = await getAdminCommunities();
    setCommunities(data);
  }

  async function loadHelpRequests() {
    const data = await getAdminHelpRequests();
    setHelpRequests(data);
  }

  async function loadCurrentTab(tab = activeTab) {
    if (tab === TABS.POSTS) {
      await loadPosts();
      return;
    }

    if (tab === TABS.COMMUNITIES) {
      await loadCommunities();
      return;
    }

    await loadHelpRequests();
  }

  async function loadPage(tab = activeTab) {
    try {
      setIsLoading(true);
      setError("");

      await Promise.all([loadStats(), loadCurrentTab(tab)]);
    } catch (e) {
      setError(
        e?.response?.data?.message || "Не удалось загрузить админ-панель"
      );
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadPage(activeTab);
  }, [activeTab]);

  function handleTabChange(tab) {
    setSearch("");
    setActiveTab(tab);

    setSelectedPost(null);
    setSelectedCommunity(null);
    setSelectedHelpRequest(null);

    setComments([]);
    setShowComments(false);
  }

  async function handleSelectPost(post) {
    try {
      setIsDetailsLoading(true);
      setShowComments(false);
      setComments([]);

      const data = await getAdminPostById(getPostId(post));
      setSelectedPost(data);
    } catch (e) {
      alert(e?.response?.data?.message || "Не удалось открыть новость");
    } finally {
      setIsDetailsLoading(false);
    }
  }

  async function handleSelectCommunity(community) {
    try {
      setIsDetailsLoading(true);

      const data = await getAdminCommunityById(getCommunityId(community));
      setSelectedCommunity(data);
    } catch (e) {
      alert(e?.response?.data?.message || "Не удалось открыть сообщество");
    } finally {
      setIsDetailsLoading(false);
    }
  }

  async function handleSelectHelpRequest(request) {
    try {
      setIsDetailsLoading(true);

      const data = await getAdminHelpRequestById(getHelpRequestId(request));
      setSelectedHelpRequest(data);
    } catch (e) {
      alert(e?.response?.data?.message || "Не удалось открыть запрос");
    } finally {
      setIsDetailsLoading(false);
    }
  }

  async function handleDeletePost(postId) {
    if (!window.confirm("Удалить новость?")) return;

    try {
      await deleteAdminPost(postId);

      await Promise.all([loadStats(), loadPosts()]);

      if (selectedPost && getPostId(selectedPost) === postId) {
        const data = await getAdminPostById(postId);
        setSelectedPost(data);
      }
    } catch (e) {
      alert(e?.response?.data?.message || "Не удалось удалить новость");
    }
  }

  async function handleOpenPostComments(postId) {
    try {
      setIsDetailsLoading(true);

      const data = await getAdminPostComments(postId);
      setComments(data);
      setShowComments(true);
    } catch (e) {
      alert(e?.response?.data?.message || "Не удалось загрузить комментарии");
    } finally {
      setIsDetailsLoading(false);
    }
  }

  async function handleDeleteComment(postId, commentId) {
    if (!window.confirm("Удалить комментарий?")) return;

    try {
      await deleteAdminPostComment(postId, commentId);

      const data = await getAdminPostComments(postId);
      setComments(data);
    } catch (e) {
      alert(e?.response?.data?.message || "Не удалось удалить комментарий");
    }
  }

  async function handleDeleteCommunity(communityId) {
    if (!window.confirm("Удалить сообщество?")) return;

    try {
      await deleteAdminCommunity(communityId);

      await Promise.all([loadStats(), loadCommunities()]);

      if (
        selectedCommunity &&
        getCommunityId(selectedCommunity) === communityId
      ) {
        const data = await getAdminCommunityById(communityId);
        setSelectedCommunity(data);
      }
    } catch (e) {
      alert(e?.response?.data?.message || "Не удалось удалить сообщество");
    }
  }

  async function handleDeleteHelpRequest(requestId) {
    if (
      !window.confirm(
        "Удалить запрос помощи? Баланс будет обработан по правилам статуса запроса."
      )
    ) {
      return;
    }

    try {
      await deleteAdminHelpRequest(requestId);

      await Promise.all([loadStats(), loadHelpRequests()]);

      if (
        selectedHelpRequest &&
        getHelpRequestId(selectedHelpRequest) === requestId
      ) {
        const data = await getAdminHelpRequestById(requestId);
        setSelectedHelpRequest(data);
      }
    } catch (e) {
      alert(e?.response?.data?.message || "Не удалось удалить запрос помощи");
    }
  }

  function handleLogout() {
    if (logout) {
      logout();
      return;
    }

    localStorage.removeItem("accessToken");
    navigate("/login", { replace: true });
  }

  return (
    <div className="admin-page">
      <div className="admin-header">
        <div>
          <h1 className="admin-header__title">Панель администратора</h1>

          <p className="admin-header__subtitle">
            Управление контентом системы
          </p>
        </div>        
      </div>

      {error && <div className="admin-error">{error}</div>}

      <div className="admin-stats">
        <AdminStatCard
          title="Всего пользователей"
          value={normalizedStats.usersTotal}
          weekValue={normalizedStats.usersWeek}
          icon="/assets/users.svg"
        />

        <AdminStatCard
          title="Новостей"
          value={normalizedStats.postsTotal}
          weekValue={normalizedStats.postsWeek}
          icon="/assets/news.svg"
        />

        <AdminStatCard
          title="Сообществ"
          value={normalizedStats.communitiesTotal}
          weekValue={normalizedStats.communitiesWeek}
          icon="/assets/communities.svg"
        />

        <AdminStatCard
          title="Запросов помощи"
          value={normalizedStats.helpTotal}
          weekValue={normalizedStats.helpWeek}
          icon="/assets/help.svg"
        />
      </div>

      <div className="admin-tabs">
        <button
          className={`admin-tabs__button ${
            activeTab === TABS.POSTS ? "is-active" : ""
          }`}
          type="button"
          onClick={() => handleTabChange(TABS.POSTS)}
        >
          <img src="/assets/news.svg" alt="" />
          <span>Новости</span>
        </button>

        <button
          className={`admin-tabs__button ${
            activeTab === TABS.COMMUNITIES ? "is-active" : ""
          }`}
          type="button"
          onClick={() => handleTabChange(TABS.COMMUNITIES)}
        >
          <img src="/assets/communities.svg" alt="" />
          <span>Сообщества</span>
        </button>

        <button
          className={`admin-tabs__button ${
            activeTab === TABS.HELP_REQUESTS ? "is-active" : ""
          }`}
          type="button"
          onClick={() => handleTabChange(TABS.HELP_REQUESTS)}
        >
          <img src="/assets/help.svg" alt="" />
          <span>Запросы помощи</span>
        </button>
      </div>

      {isLoading ? (
        <div className="admin-state">Загрузка...</div>
      ) : (
        <div className="admin-workspace">
          <section className="admin-list-card">
            <AdminListHeader activeTab={activeTab} />

            <div className="admin-search">
              <img src="/assets/search.svg" alt="" />

              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Поиск..."
              />
            </div>

            {activeTab === TABS.POSTS && (
              <AdminPostsList
                posts={filteredPosts}
                selectedPost={selectedPost}
                onSelect={handleSelectPost}
              />
            )}

            {activeTab === TABS.COMMUNITIES && (
              <AdminCommunitiesList
                communities={filteredCommunities}
                selectedCommunity={selectedCommunity}
                onSelect={handleSelectCommunity}
              />
            )}

            {activeTab === TABS.HELP_REQUESTS && (
              <AdminHelpRequestsList
                requests={filteredHelpRequests}
                selectedRequest={selectedHelpRequest}
                onSelect={handleSelectHelpRequest}
              />
            )}
          </section>

          <section className="admin-details-card">
            {isDetailsLoading && (
              <div className="admin-details-empty">Загрузка...</div>
            )}

            {!isDetailsLoading && activeTab === TABS.POSTS && (
              <AdminPostDetails
                post={selectedPost}
                comments={comments}
                showComments={showComments}
                onDeletePost={handleDeletePost}
                onOpenComments={handleOpenPostComments}
                onDeleteComment={handleDeleteComment}
              />
            )}

            {!isDetailsLoading && activeTab === TABS.COMMUNITIES && (
              <AdminCommunityDetails
                community={selectedCommunity}
                onDeleteCommunity={handleDeleteCommunity}
                onOpenCommunity={(communityId) =>
                  navigate(`/communities/${communityId}`)
                }
              />
            )}

            {!isDetailsLoading && activeTab === TABS.HELP_REQUESTS && (
              <AdminHelpRequestDetails
                request={selectedHelpRequest}
                onDeleteRequest={handleDeleteHelpRequest}
              />
            )}
          </section>
        </div>
      )}
    </div>
  );
}

function AdminStatCard({ title, value, weekValue, icon }) {
  const safeValue = toSafeNumber(value) ?? 0;
  const safeWeekValue = toSafeNumber(weekValue) ?? 0;

  return (
    <article className="admin-stat-card">
      <div>
        <div className="admin-stat-card__title">{title}</div>

        <div className="admin-stat-card__value">
          {safeValue.toLocaleString("ru-RU")}
        </div>        
      </div>

      <div className="admin-stat-card__icon">
        <img src={icon} alt="" />
      </div>
    </article>
  );
}

function AdminListHeader({ activeTab }) {
  if (activeTab === TABS.COMMUNITIES) {
    return (
      <>
        <h2 className="admin-card-title">Список сообществ</h2>

        <p className="admin-card-subtitle">
          Выберите сообщество для управления
        </p>
      </>
    );
  }

  if (activeTab === TABS.HELP_REQUESTS) {
    return (
      <>
        <h2 className="admin-card-title">Список запросов</h2>

        <p className="admin-card-subtitle">
          Выберите запрос для просмотра деталей
        </p>
      </>
    );
  }

  return (
    <>
      <h2 className="admin-card-title">Список новостей</h2>

      <p className="admin-card-subtitle">
        Выберите новость для просмотра деталей
      </p>
    </>
  );
}

function AdminPostsList({ posts, selectedPost, onSelect }) {
  if (posts.length === 0) {
    return <div className="admin-list-empty">Новости не найдены</div>;
  }

  return (
    <div className="admin-list">
      {posts.map((post) => {
        const postId = getPostId(post);
        const selected = selectedPost && getPostId(selectedPost) === postId;

        return (
          <button
            className={`admin-list-item ${selected ? "is-selected" : ""}`}
            type="button"
            key={postId}
            onClick={() => onSelect(post)}
          >
            <div className="admin-list-item__top">
              <div>
                {isDeleted(post) && (
                  <span className="admin-status is-deleted">Удалено</span>
                )}

                <div className="admin-list-item__title">
                  {post.title || "Без заголовка"}
                </div>
              </div>

              <span className="admin-list-item__arrow">›</span>
            </div>

            <p className="admin-list-item__text">{post.content}</p>

            <div className="admin-list-item__meta">
              <span>{getPostAuthorName(post)}</span>

              {getPostCommunityName(post) && (
                <>
                  <span>•</span>
                  <span>{getPostCommunityName(post)}</span>
                </>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}

function AdminCommunitiesList({ communities, selectedCommunity, onSelect }) {
  if (communities.length === 0) {
    return <div className="admin-list-empty">Сообщества не найдены</div>;
  }

  return (
    <div className="admin-list">
      {communities.map((community) => {
        const communityId = getCommunityId(community);
        const selected =
          selectedCommunity && getCommunityId(selectedCommunity) === communityId;

        return (
          <button
            className={`admin-list-item ${selected ? "is-selected" : ""}`}
            type="button"
            key={communityId}
            onClick={() => onSelect(community)}
          >
            <div className="admin-list-item__top">
              <div>
                {isDeleted(community) && (
                  <span className="admin-status is-deleted">Удалено</span>
                )}

                <div className="admin-list-item__title">
                  {community.name || "Сообщество"}
                </div>
              </div>

              <span className="admin-list-item__arrow">›</span>
            </div>

            <p className="admin-list-item__text">{community.description}</p>           
          </button>
        );
      })}
    </div>
  );
}

function AdminHelpRequestsList({ requests, selectedRequest, onSelect }) {
  if (requests.length === 0) {
    return <div className="admin-list-empty">Запросы не найдены</div>;
  }

  return (
    <div className="admin-list">
      {requests.map((request) => {
        const requestId = getHelpRequestId(request);
        const selected =
          selectedRequest && getHelpRequestId(selectedRequest) === requestId;

        const status = getHelpStatus(request);

        return (
          <button
            className={`admin-list-item ${selected ? "is-selected" : ""}`}
            type="button"
            key={requestId}
            onClick={() => onSelect(request)}
          >
            <div className="admin-list-item__top">
              <div>
                <span className={`admin-status ${status.className}`}>
                  {status.label}
                </span>

                <div className="admin-list-item__title">
                  {request.title || "Запрос помощи"}
                </div>
              </div>

              <span className="admin-list-item__arrow">›</span>
            </div>

            <div className="admin-list-item__meta">
              {getHelpAuthorName(request)}
            </div>

            <div className="admin-list-item__reward">
              {getHelpReward(request)} бусинок
            </div>
          </button>
        );
      })}
    </div>
  );
}

function AdminPostDetails({
  post,
  comments,
  showComments,
  onDeletePost,
  onOpenComments,
  onDeleteComment,
}) {
  if (!post) {
    return (
      <div className="admin-details-empty">
        <img src="/assets/news.svg" alt="" />
        <span>Выберите новость из списка для просмотра деталей</span>
      </div>
    );
  }

  const postId = getPostId(post);
  const authorName = getPostAuthorName(post);
  const authorAvatar = getPostAuthorAvatar(post);

  return (
    <div className="admin-details">
      <div className="admin-details__header">
        <div className="admin-details__author">
          <span className="admin-details__avatar">
            {authorAvatar ? (
              <img src={authorAvatar} alt="" />
            ) : (
              <span>{getInitials(authorName)}</span>
            )}
          </span>

          <span>{authorName}</span>
        </div>

        {!isDeleted(post) && (
          <button
            className="admin-details__danger"
            type="button"
            onClick={() => onDeletePost(postId)}
          >
            Удалить
          </button>
        )}
      </div>

      {isDeleted(post) && (
        <span className="admin-status is-deleted admin-details__status">
          Удалено
        </span>
      )}

      <h2 className="admin-details__title">{post.title || "Без заголовка"}</h2>

      <p className="admin-details__text">{post.content}</p>

      <div className="admin-details__info-grid">
        {getPostCommunityName(post) && (
          <div className="admin-info-box">
            <span>Сообщество</span>
            <strong>{getPostCommunityName(post)}</strong>
          </div>
        )}

        <div className="admin-info-box">
          <span>Создано</span>
          <strong>{formatDateTime(post.published_at || post.created_at)}</strong>
        </div>
      </div>

      <div className="admin-details__actions">
        <button
          className="admin-details__button"
          type="button"
          onClick={() => window.open(`/posts/${postId}`, "_blank")}
        >
          <img src="/assets/eye.svg" alt="" />
          <span>Открыть публикацию</span>
        </button>

        <button
          className="admin-details__button"
          type="button"
          onClick={() => onOpenComments(postId)}
        >
          <img src="/assets/comment.svg" alt="" />
          <span>Комментарии ({getPostCommentsCount(post)})</span>
        </button>
      </div>

      {showComments && (
        <div className="admin-comments">
          <h3 className="admin-comments__title">Комментарии</h3>

          {comments.length === 0 && (
            <div className="admin-comments__empty">Комментариев нет</div>
          )}

          {comments.map((comment) => {
            const commentId = comment.comment_id || comment.id;

            const author =
              comment.author?.contacts?.full_name ||
              comment.users?.contacts?.full_name ||
              comment.author?.login ||
              comment.users?.login ||
              "Пользователь";

            return (
              <article className="admin-comment" key={commentId}>
                <div>
                  <div className="admin-comment__author">{author}</div>

                  <p className="admin-comment__text">{comment.content}</p>
                </div>

                {!isDeleted(comment) && (
                  <button
                    className="admin-comment__delete"
                    type="button"
                    onClick={() => onDeleteComment(postId, commentId)}
                  >
                    Удалить
                  </button>
                )}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

function AdminCommunityDetails({ community, onDeleteCommunity, onOpenCommunity }) {
  if (!community) {
    return (
      <div className="admin-details-empty">
        <img src="/assets/communities.svg" alt="" />
        <span>Выберите сообщество из списка для просмотра деталей</span>
      </div>
    );
  }

  const communityId = getCommunityId(community);

  return (
    <div className="admin-details">
      <div className="admin-details__header">
        <h2 className="admin-details__title admin-details__title--compact">
          {community.name || "Сообщество"}
        </h2>

        {!isDeleted(community) && (
          <button
            className="admin-details__danger"
            type="button"
            onClick={() => onDeleteCommunity(communityId)}
          >
            Удалить
          </button>
        )}
      </div>

      {isDeleted(community) && (
        <span className="admin-status is-deleted admin-details__status">
          Удалено
        </span>
      )}

      <p className="admin-details__text">{community.description}</p>

      <div className="admin-details__info-grid">
        <div className="admin-info-box">
          <span>Участников</span>
          <strong>{getCommunitySubscribersCount(community)}</strong>
        </div>

        <div className="admin-info-box">
          <span>Публикаций</span>
          <strong>{getCommunityPostsCount(community)}</strong>
        </div>

        <div className="admin-info-box">
          <span>Активность сегодня</span>
          <strong>{getCommunityTodayPostsCount(community)}</strong>
        </div>

        <div className="admin-info-box">
          <span>Создано</span>
          <strong>{formatDate(community.created_at)}</strong>
        </div>
      </div>

      <div className="admin-details__line">
        Последняя активность:{" "}
        {formatRelativeActivity(getCommunityLastActivity(community))}
      </div>

      <div className="admin-details__creator">
        <span>Создатель</span>
        <strong>{getCommunityCreatorName(community)}</strong>
      </div>

      <button
        className="admin-details__button admin-details__button--full"
        type="button"
        onClick={() => onOpenCommunity(communityId)}
      >
        <img src="/assets/eye.svg" alt="" />
        <span>Открыть</span>
      </button>
    </div>
  );
}

function AdminHelpRequestDetails({ request, onDeleteRequest }) {
  if (!request) {
    return (
      <div className="admin-details-empty">
        <img src="/assets/help.svg" alt="" />
        <span>Выберите запрос из списка для просмотра деталей</span>
      </div>
    );
  }

  const requestId = getHelpRequestId(request);
  const status = getHelpStatus(request);
  const activeResponse = getActiveHelpResponse(request);
  const successfulResponse = getSuccessfulHelpResponse(request);
  const performer = successfulResponse || activeResponse;

  const authorName = getHelpAuthorName(request);
  const authorAvatar = getHelpAuthorAvatar(request);

  return (
    <div className="admin-details">
      <div className="admin-details__header">
        <div className="admin-details__author">
          <span className="admin-details__avatar">
            {authorAvatar ? (
              <img src={authorAvatar} alt="" />
            ) : (
              <span>{getInitials(authorName)}</span>
            )}
          </span>

          <span>{authorName}</span>
        </div>

        {!isDeleted(request) && (
          <button
            className="admin-details__danger"
            type="button"
            onClick={() => onDeleteRequest(requestId)}
          >
            Удалить
          </button>
        )}
      </div>

      <h2 className="admin-details__title">
        {request.title || "Запрос помощи"}
      </h2>

      <p className="admin-details__text">{getHelpDescription(request)}</p>

      <span className={`admin-status ${status.className} admin-details__status`}>
        {status.label}
      </span>

      <div className="admin-details__info-grid">
        <div className="admin-info-box">
          <span>Создано</span>
          <strong>{formatDate(request.created_at)}</strong>
        </div>

        <div className="admin-info-box">
          <span>Награда</span>
          <strong>{getHelpReward(request)}</strong>
        </div>
      </div>

      {performer && (
        <div
          className={`admin-performer ${
            successfulResponse ? "is-successful" : ""
          }`}
        >
          <span>{successfulResponse ? "Исполнитель" : "Выполняет"}</span>

          <div className="admin-performer__user">
            <span className="admin-details__avatar">
              {getResponderAvatar(performer) ? (
                <img src={getResponderAvatar(performer)} alt="" />
              ) : (
                <span>{getInitials(getResponderName(performer))}</span>
              )}
            </span>

            <strong>{getResponderName(performer)}</strong>
          </div>
        </div>
      )}

      <div className="admin-details__warning">
        При удалении открытого или выполняющегося запроса бусинки автору не
        возвращаются. При удалении завершенного запроса награда списывается с
        исполнителя.
      </div>
    </div>
  );
}