import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  deleteCommunity,
  subscribeCommunity,
  unsubscribeCommunity,
} from "../api/communities";
import "./communityCard.css";

export default function CommunityCard({ community, me, onChanged }) {
  const nav = useNavigate();
  const [busy, setBusy] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  const roleId = me?.role?.role_id;
  const myUserId = me?.user_id;

  const isModerator = roleId === 1 || roleId === 3;
  const canManage =
    Boolean(myUserId) &&
    (myUserId === community.creator_user_id || isModerator);

  useEffect(() => {
    const onDoc = (e) => {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(e.target)) setMenuOpen(false);
    };

    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const onToggle = async () => {
    if (busy) return;

    try {
      setBusy(true);

      if (community.isSubscribed) {
        await unsubscribeCommunity(community.community_id);
      } else {
        await subscribeCommunity(community.community_id);
      }

      onChanged?.();
    } finally {
      setBusy(false);
    }
  };

  const onEdit = () => {
    setMenuOpen(false);
    nav(`/communities/${community.community_id}/edit`);
  };

  const onDelete = async () => {
    setMenuOpen(false);
    if (!confirm("Удалить сообщество?")) return;

    try {
      setBusy(true);
      await deleteCommunity(community.community_id);
      onChanged?.();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="commCard">
      <div className="commHeader">
        <div className="commText">
          <div className="commTitle">{community.name}</div>
          <div className="commDesc">{community.description || " "}</div>
        </div>

        {canManage && (
          <div className="commMenuWrap" ref={menuRef}>
            <button
              type="button"
              className="commDotsBtn"
              onClick={() => setMenuOpen((v) => !v)}
            >
              ...
            </button>

            {menuOpen && (
              <div className="commMenu">
                <button className="commMenuItem" onClick={onEdit}>
                  Редактировать
                </button>
                <button className="commMenuItem danger" onClick={onDelete}>
                  Удалить
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="commFooter">
        <button
          type="button"
          className={community.isSubscribed ? "commBtn secondary" : "commBtn primary"}
          onClick={onToggle}
          disabled={busy}
        >
          {busy ? "..." : community.isSubscribed ? "Отписаться" : "Подписаться"}
        </button>
      </div>
    </div>
  );
}