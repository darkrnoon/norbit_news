import React, { useState } from "react";
import "./filters.css";

export default function FiltersPanel() {
  const [show, setShow] = useState("all"); // all | subs | mine | pinned
  const [period, setPeriod] = useState("all"); // today | week | month | all
  const [q, setQ] = useState("");

  return (
    <div className="filtersCard">
      <div className="filtersTitle">Фильтры</div>

      <div className="filtersGroup">
        <div className="filtersLabel">Показать:</div>

        <label className="radioRow">
          <input type="radio" checked={show === "all"} onChange={() => setShow("all")} />
          Все новости
        </label>

        <label className="radioRow">
          <input type="radio" checked={show === "subs"} onChange={() => setShow("subs")} />
          Мои подписки
        </label>

        <label className="radioRow">
          <input type="radio" checked={show === "mine"} onChange={() => setShow("mine")} />
          Мои новости
        </label>

        <label className="radioRow">
          <input type="radio" checked={show === "pinned"} onChange={() => setShow("pinned")} />
          Только закреплённые
        </label>
      </div>

      <div className="filtersGroup">
        <div className="filtersLabel">Период:</div>

        <label className="radioRow">
          <input type="radio" checked={period === "today"} onChange={() => setPeriod("today")} />
          Сегодня
        </label>

        <label className="radioRow">
          <input type="radio" checked={period === "week"} onChange={() => setPeriod("week")} />
          Неделя
        </label>

        <label className="radioRow">
          <input type="radio" checked={period === "month"} onChange={() => setPeriod("month")} />
          Месяц
        </label>

        <label className="radioRow">
          <input type="radio" checked={period === "all"} onChange={() => setPeriod("all")} />
          Всё время
        </label>
      </div>

      <div className="filtersGroup">
        <div className="filtersLabel">Поиск:</div>
        <input className="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Поиск..." />
      </div>

      <div className="filtersGroup">
        <div className="filtersLabel">Скрыть новости от:</div>
        <div className="muted">Пока заглушка (позже подключим список сотрудников)</div>
      </div>
    </div>
  );
}