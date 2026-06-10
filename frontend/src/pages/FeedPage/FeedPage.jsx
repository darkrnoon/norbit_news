import { useEffect, useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";

import { getFeed } from "../../api/posts.api";
import { getFeedFilterUsersApi } from "../../api/me.api";

import FeedFilters from "../../components/FeedFilters/FeedFilters";
import PostCard from "../../components/PostCard/PostCard";

import "./FeedPage.css";

function isPostInPeriod(post, period) {
  if (period === "all") return true;

  const date = new Date(post.published_at);
  const now = new Date();

  if (period === "today") {
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    return date >= start;
  }

  if (period === "week") {
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    return date >= weekAgo;
  }

  if (period === "month") {
    const monthAgo = new Date(now);
    monthAgo.setMonth(now.getMonth() - 1);
    return date >= monthAgo;
  }

  return true;
}

export default function FeedPage() {
  const { userId } = useOutletContext();

  const [posts, setPosts] = useState([]);
  const [authors, setAuthors] = useState([]);

  const [mode, setMode] = useState("all");
  const [period, setPeriod] = useState("all");
  const [hiddenAuthors, setHiddenAuthors] = useState([]);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadAuthors() {
    try {
      const data = await getFeedFilterUsersApi();
      setAuthors(data);
    } catch {
      setAuthors([]);
    }
  }

  async function loadPosts() {
    try {
      setIsLoading(true);
      setError("");

      const params = {};

      if (mode === "mine" && userId) {
        params.authorId = userId;
      }

      if (mode === "pinned") {
        params.pinnedOnly = "true";
      }

      const data = await getFeed(params);
      setPosts(data);
    } catch (e) {
      setError(e?.response?.data?.message || "Не удалось загрузить ленту новостей");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadAuthors();
  }, []);

  useEffect(() => {
    loadPosts();
  }, [mode, userId]);

  function toggleHiddenAuthor(authorId) {
    setHiddenAuthors((prev) => {
      if (prev.includes(authorId)) {
        return prev.filter((id) => id !== authorId);
      }

      return [...prev, authorId];
    });
  }

  const filteredPosts = useMemo(() => {
    return posts
      .filter((post) => {
        if (hiddenAuthors.includes(post.author?.user_id)) return false;
        return true;
      })
      .filter((post) => isPostInPeriod(post, period));
  }, [posts, hiddenAuthors, period]);

  return (
    <div className="feed-page">
      <section className="feed-page__feed">
        {isLoading && <div className="feed-page__state">Загрузка...</div>}

        {error && <div className="feed-page__error">{error}</div>}

        {!isLoading && !error && filteredPosts.length === 0 && (
          <div className="feed-page__state">Нет новостей по выбранным фильтрам</div>
        )}

        {!isLoading && !error && (
          <div className="feed-page__list">
            {filteredPosts.map((post) => (
              <PostCard key={post.post_id} post={post} onChanged={loadPosts} />
            ))}
          </div>
        )}
      </section>

      <FeedFilters
        mode={mode}
        onModeChange={setMode}
        period={period}
        onPeriodChange={setPeriod}
        hiddenAuthors={hiddenAuthors}
        onToggleHiddenAuthor={toggleHiddenAuthor}
        authors={authors}
      />
    </div>
  );
}