import React, { useEffect, useState } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import { listCommunities } from "../api/communities";
import CommunityCard from "../components/CommunityCard";
import "./communities.css";

export default function CommunitiesPage() {
  const nav = useNavigate();
  const { me } = useOutletContext();

  const [items, setItems] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const load = async (q = search) => {
    setLoading(true);
    setErr("");
    try {
      const data = await listCommunities({ search: q || undefined });
      setItems(data);
    } catch (e) {
      setErr(e?.response?.data?.message || "Не удалось загрузить сообщества");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const t = setTimeout(() => load(search), 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  return (
    <div className="commsPage">
      <div className="commsHeaderRow">
        <div>
          <div className="commsTitle">Сообщества</div>
          <div className="commsSub">Присоединяйтесь к тематическим сообществам</div>
        </div>

        <button className="createCommunityBtn" onClick={() => nav("/communities/new")}>
          + Создать сообщество
        </button>
      </div>

      <div className="commsSearchRow">
        <input
          className="commsSearch"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Поиск сообществ..."
        />
      </div>

      {loading && <div className="hint">Загрузка...</div>}
      {err && <div className="error">{err}</div>}

      <div className="commsGrid">
        {items.map((c) => (
          <CommunityCard
            key={c.community_id}
            community={c}
            me={me}
            onChanged={() => load(search)}
          />
        ))}
      </div>

      {!loading && !err && items.length === 0 && (
        <div className="hint">Сообщества не найдены</div>
      )}
    </div>
  );
}