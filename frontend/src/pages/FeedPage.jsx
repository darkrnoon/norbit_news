import React, { useEffect, useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { getFeed } from "../api/posts";
import PostCard from "../components/PostCard";
import "./feed.css";

function shuffle(array) {
  const result = [...array];

  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }

  return result;
}

export default function FeedPage() {
  const { me, feedFilters } = useOutletContext();

  const [items, setItems] = useState([]);
  const [allAuthors, setAllAuthors] = useState([]);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);

  const myUserId = me?.user_id;
  const roleId = me?.role?.role_id;

  const isModerator = useMemo(() => roleId === 1 || roleId === 3, [roleId]);
  const canPinPosts = useMemo(
    () => roleId === 1 || roleId === 3 || roleId === 4,
    [roleId]
  );

  const { mode, period, hiddenAuthors, setAuthorsOptions } = feedFilters;

  const normalizeAuthor = (post) => {
    const id = String(post.author_user_id);
    const rawName =
      post.users?.contacts?.full_name ||
      post.users?.login ||
      `Пользователь ${post.author_user_id}`;

    const isMe = String(post.author_user_id) === String(myUserId);

    return {
      id,
      name: rawName,
      label: isMe ? `${rawName} (Я)` : rawName,
      isMe,
    };
  };

  const loadAuthorsBase = async () => {
    try {
      const data = await getFeed({});
      const map = new Map();

      for (const post of data) {
        const author = normalizeAuthor(post);

        if (!map.has(author.id)) {
          map.set(author.id, author);
        }
      }

      const authors = Array.from(map.values());

      setAllAuthors(authors);
    } catch {
      setAllAuthors([]);
    }
  };

  const load = async () => {
    setLoading(true);
    setErr("");

    try {
      const params = {};

      if (mode === "mine" && myUserId) {
        params.authorId = myUserId;
      }

      if (mode === "pinned") {
        params.pinnedOnly = "true";
      }

      const data = await getFeed(params);
      setItems(data);

      const currentMap = new Map();

      for (const post of data) {
        const author = normalizeAuthor(post);

        if (!currentMap.has(author.id)) {
          currentMap.set(author.id, author);
        }
      }

      const mergedMap = new Map();

      for (const author of allAuthors) {
        mergedMap.set(author.id, author);
      }

      for (const author of currentMap.values()) {
        mergedMap.set(author.id, author);
      }

      const mergedAuthors = Array.from(mergedMap.values());

      const meAuthor = mergedAuthors.find((a) => a.isMe);
      const otherAuthors = mergedAuthors.filter((a) => !a.isMe);
      const randomFive = shuffle(otherAuthors).slice(0, 5);

      const resultAuthors = meAuthor ? [meAuthor, ...randomFive] : randomFive;

      setAuthorsOptions(resultAuthors);
    } catch (e) {
      setErr(e?.response?.data?.message || "Не удалось загрузить ленту");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAuthorsBase();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [myUserId]);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, allAuthors.length]);

  const filtered = useMemo(() => {
    let res = items;

    if (hiddenAuthors.length) {
      const hiddenSet = new Set(hiddenAuthors.map(String));
      res = res.filter((p) => !hiddenSet.has(String(p.author_user_id)));
    }

    if (period !== "all") {
      const now = new Date();
      let from = null;

      if (period === "today") {
        from = new Date(now);
        from.setHours(0, 0, 0, 0);
      } else if (period === "week") {
        from = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      } else if (period === "month") {
        from = new Date(now);
        from.setMonth(now.getMonth() - 1);
      }

      if (from) {
        res = res.filter((p) => new Date(p.published_at) >= from);
      }
    }

    return res;
  }, [items, hiddenAuthors, period]);

  return (
    <div className="feed">
      {loading && <div className="hint">Загрузка...</div>}
      {err && <div className="error">{err}</div>}

      <div className="feedList">
        {filtered.map((post) => (
          <PostCard
            key={post.post_id}
            post={post}
            meUserId={myUserId}
            isModerator={isModerator}
            canPinPosts={canPinPosts}
            showPinBadge={true}
            onChanged={load}
          />
        ))}
      </div>

      {!loading && !err && filtered.length === 0 && (
        <div className="hint">Нет новостей по фильтрам</div>
      )}
    </div>
  );
}