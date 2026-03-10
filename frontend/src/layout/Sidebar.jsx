import React from "react";
import { NavLink } from "react-router-dom";
import "./sidebar.css";

export default function Sidebar() {
  const linkClass = ({ isActive }) => (isActive ? "navItem active" : "navItem");

  return (
    <div className="sidebar">
      <NavLink to="/" className={linkClass}>Главная</NavLink>
      <NavLink to="/subscriptions" className={linkClass}>Мои подписки</NavLink>
      <NavLink to="/communities" className={linkClass}>Сообщества</NavLink>
      <NavLink to="/help" className={linkClass}>Запросы помощи</NavLink>
    </div>
  );
}