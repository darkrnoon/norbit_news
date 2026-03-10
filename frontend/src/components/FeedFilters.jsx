import React, { useMemo, useState } from "react";
import "./feedFilters.css";

export default function FeedFilters({
  mode,
  setMode,
  period,
  setPeriod,
  hiddenAuthors,
  setHiddenAuthors,
  authorsOptions = [],
  showPinFilter = true,
}) {
  const [userQuery, setUserQuery] = useState("");

  const filteredAuthors = useMemo(() => {
    const q = userQuery.trim().toLowerCase();

    if (!q) {
      return authorsOptions.slice(0, 5);
    }

    return authorsOptions.filter((a) => a.name.toLowerCase().includes(q));
  }, [authorsOptions, userQuery]);

  const toggleHidden = (id) => {
    setHiddenAuthors((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  return (
    <div className="filtersCard">
      <div className="filtersTitle">Фильтры</div>

      <div className="filtersGroup">
        <div className="filtersLabel">Показать:</div>

        <label className="radioRow">
          <input
            type="radio"
            checked={mode === "all"}
            onChange={() => setMode("all")}
          />
          Все новости
        </label>

        <label className="radioRow">
          <input
            type="radio"
            checked={mode === "mine"}
            onChange={() => setMode("mine")}
          />
          Мои новости
        </label>

        {showPinFilter && (
          <label className="radioRow">
            <input
              type="radio"
              checked={mode === "pinned"}
              onChange={() => setMode("pinned")}
            />
            Только закреплённые
          </label>
        )}
      </div>

      <div className="filtersGroup">
        <div className="filtersLabel">Период:</div>

        <label className="radioRow">
          <input
            type="radio"
            checked={period === "today"}
            onChange={() => setPeriod("today")}
          />
          Сегодня
        </label>

        <label className="radioRow">
          <input
            type="radio"
            checked={period === "week"}
            onChange={() => setPeriod("week")}
          />
          Неделя
        </label>

        <label className="radioRow">
          <input
            type="radio"
            checked={period === "month"}
            onChange={() => setPeriod("month")}
          />
          Месяц
        </label>

        <label className="radioRow">
          <input
            type="radio"
            checked={period === "all"}
            onChange={() => setPeriod("all")}
          />
          Всё время
        </label>
      </div>

      <div className="filtersGroup">
        <div className="filtersLabel">Скрыть новости от:</div>

        <input
          className="search"
          value={userQuery}
          onChange={(e) => setUserQuery(e.target.value)}
          placeholder="Поиск пользователя..."
        />

        <div className="checks">
          {filteredAuthors.length === 0 ? (
            <div className="muted">Пользователи не найдены</div>
          ) : (
            filteredAuthors.map((a) => (
              <label key={a.id} className="checkRow">
                <input
                  type="checkbox"
                  checked={hiddenAuthors.includes(a.id)}
                  onChange={() => toggleHidden(a.id)}
                />
                {a.label}
              </label>
            ))
          )}
        </div>
      </div>
    </div>
  );
}