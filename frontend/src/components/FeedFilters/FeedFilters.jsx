import { useMemo, useState } from "react";
import "./FeedFilters.css";

const modeOptions = [
  { value: "all", label: "Все новости" },
  { value: "mine", label: "Мои новости" },
  { value: "pinned", label: "Только закрепленные" },
];

const periodOptions = [
  { value: "today", label: "Сегодня" },
  { value: "week", label: "Неделя" },
  { value: "month", label: "Месяц" },
  { value: "all", label: "Всё время" },
];

function getInitials(name) {
  if (!name) return "П";
  const parts = name.trim().split(/\s+/);
  return `${parts[0]?.[0] || ""}${parts[1]?.[0] || ""}` || "П";
}

export default function FeedFilters({
  mode,
  onModeChange,
  period,
  onPeriodChange,
  hiddenAuthors,
  onToggleHiddenAuthor,
  authors = [],
}) {
  const [search, setSearch] = useState("");

  const filteredAuthors = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return authors.slice(0, 6);
    }

    return authors.filter((author) =>
      author.full_name?.toLowerCase().includes(query)
    );
  }, [authors, search]);

  return (
    <aside className="feed-filters">
      <h2 className="feed-filters__title">Фильтры</h2>

      <section className="feed-filters__section">
        <div className="feed-filters__label">Показать:</div>

        <div className="feed-filters__options">
          {modeOptions.map((option) => (
            <label className="feed-filters__radio" key={option.value}>
              <input
                type="radio"
                checked={mode === option.value}
                onChange={() => onModeChange(option.value)}
              />
              <span>{option.label}</span>
            </label>
          ))}
        </div>
      </section>

      <section className="feed-filters__section">
        <div className="feed-filters__label">Период:</div>

        <div className="feed-filters__options">
          {periodOptions.map((option) => (
            <label className="feed-filters__radio" key={option.value}>
              <input
                type="radio"
                checked={period === option.value}
                onChange={() => onPeriodChange(option.value)}
              />
              <span>{option.label}</span>
            </label>
          ))}
        </div>
      </section>

      <section className="feed-filters__section">
        <div className="feed-filters__label">Скрыть новости от:</div>

        <div className="feed-filters__search">
          <img src="/assets/search.svg" alt="" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Поиск..."
          />
        </div>

        <div className="feed-filters__users">
          {filteredAuthors.map((author) => (
            <label
                className={`feed-filters__user ${
                hiddenAuthors.includes(author.user_id) ? "is-checked" : ""
            }`}
                key={author.user_id}>
                    
              <input
                type="checkbox"
                checked={hiddenAuthors.includes(author.user_id)}
                onChange={() => onToggleHiddenAuthor(author.user_id)}
              />

              <span className="feed-filters__avatar">
                {author.avatar ? (
                  <img src={author.avatar} alt="" />
                ) : (
                  <span>{getInitials(author.full_name)}</span>
                )}
              </span>

              <span className="feed-filters__name">{author.full_name}</span>
            </label>
          ))}

          {filteredAuthors.length === 0 && (
            <div className="feed-filters__empty">Пользователи не найдены</div>
          )}
        </div>
      </section>
    </aside>
  );
}