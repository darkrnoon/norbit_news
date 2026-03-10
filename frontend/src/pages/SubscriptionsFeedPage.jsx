import React, { useEffect, useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { getMyCommunitiesFeed } from "../api/posts";
import PostCard from "../components/PostCard";
import "./feed.css";

export default function SubscriptionsFeedPage() {
  const { me } = useOutletContext();

  const [items, setItems] = useState([]);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);

  const myUserId = me?.user_id;
  const roleName = useMemo(
    () => me?.role?.name?.toUpperCase?.() || "",
    [me]
  );

  const isModerator = useMemo(() => {
    return roleName === "ADMIN" || roleName === "SYSADMIN";
  }, [roleName]);

  const load = async () => {
    setLoading(true);
    setErr("");

    try {
      const data = await getMyCommunitiesFeed();
      setItems(data);
    } catch (e) {
      setErr(
        e?.response?.data?.message || "Не удалось загрузить новости подписок"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="feed">
      {loading && <div className="hint">Загрузка...</div>}
      {err && <div className="error">{err}</div>}

      <div className="feedList">
        {items.map((post) => (
          <PostCard
            key={post.post_id}
            post={post}
            meUserId={myUserId}
            isModerator={isModerator}
            canPinPosts={false}
            showPinBadge={false}
            onChanged={load}
          />
        ))}
      </div>

      {!loading && !err && items.length === 0 && (
        <div className="hint">У вас пока нет новостей из сообществ</div>
      )}
    </div>
  );
}