import React, { useEffect, useMemo, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { getMe } from "../api/me";
import Header from "./Header";
import Sidebar from "./Sidebar";
import FeedFilters from "../components/FeedFilters";
import "./layout.css";

export default function AppLayout() {
  const [me, setMe] = useState(null);
  const [meError, setMeError] = useState("");

  const nav = useNavigate();
  const location = useLocation();

  // ✅ состояние фильтров живёт здесь
  const [mode, setMode] = useState("all");       // all | mine | pinned
  const [period, setPeriod] = useState("all");   // all | today | week | month
  const [hiddenAuthors, setHiddenAuthors] = useState([]); // ["1","2",...]
  const [authorsOptions, setAuthorsOptions] = useState([]); // [{id,name}]

  useEffect(() => {
    (async () => {
      try {
        const data = await getMe();
        setMe(data);
      } catch (e) {
        setMeError(e?.response?.data?.message || "Не удалось загрузить профиль");
      }
    })();
  }, []);

  const isMainFeed = location.pathname === "/";

  // удобно передать вниз как один объект
  const feedFilters = useMemo(
    () => ({
      mode,
      setMode,
      period,
      setPeriod,
      hiddenAuthors,
      setHiddenAuthors,
      authorsOptions,
      setAuthorsOptions,
    }),
    [mode, period, hiddenAuthors, authorsOptions]
  );

  return (
    <div className="app">
      <Header me={me} onCreate={() => nav("/posts/new")} />

      <div className="body">
        <aside className="left">
          <Sidebar />
        </aside>

        <main className="center">
          {meError && <div className="errorBox">{meError}</div>}
          <Outlet context={{ me, feedFilters }} />
        </main>

        <aside className="right">
          {/* ✅ фильтры только на главной ленте */}
          {isMainFeed ? (
            <FeedFilters
              mode={mode}
              setMode={setMode}
              period={period}
              setPeriod={setPeriod}
              hiddenAuthors={hiddenAuthors}
              setHiddenAuthors={setHiddenAuthors}
              authorsOptions={authorsOptions}
              showPinFilter={true}
            />
          ) : null}
        </aside>
      </div>
    </div>
  );
}