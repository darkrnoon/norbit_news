import React, { useEffect, useRef, useState } from "react";
import { useAuth } from "../auth/AuthContext";
import "./header.css";

function initials(name) {
  if (!name) return "??";
  const parts = name.trim().split(/\s+/);
  return (parts[0]?.[0] || "?") + (parts[1]?.[0] || "");
}

export default function Header({ me, onCreate }) {
  const { logout } = useAuth();

  const fullName = me?.contact?.full_name || me?.login || "Пользователь";
  const beads = me?.contact?.beads_balance ?? 0;
  const avatar = me?.contact?.avatar;

  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);

  // закрывать меню при клике вне профиля
  useEffect(() => {
    const onDocClick = (e) => {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  return (
    <header className="header">
      <div className="headerInner">
        <div className="brand">
          <div className="logo">H</div>
          <div className="brandName">Норбит</div>
        </div>

        <div className="headerActions">
          <button className="createBtn" onClick={onCreate}>
            + Создать
          </button>

          <div className="profileWrap" ref={menuRef}>
            <button
              type="button"
              className="profileBtn"
              onClick={() => setOpen((v) => !v)}
              aria-expanded={open}
            >
              <div className="avatar">
                {avatar ? <img src={avatar} alt="" /> : <span>{initials(fullName)}</span>}
              </div>

              <div className="meText">
                <div className="meName">{fullName}</div>
                <div className="meSub">{beads} бусинок</div>
              </div>

              <div className={"chev " + (open ? "up" : "")}>▾</div>
            </button>

            {open && (
              <div className="profileMenu">
                <button className="menuItem" onClick={() => { setOpen(false); logout(); }}>
                  Выйти
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}