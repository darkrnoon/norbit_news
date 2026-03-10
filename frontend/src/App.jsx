import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import RequireAuth from "./auth/RequireAuth";
import LoginPage from "./pages/LoginPage";
import AppLayout from "./layout/AppLayout";
import FeedPage from "./pages/FeedPage";
import SubscriptionsFeedPage from "./pages/SubscriptionsFeedPage";
import PostEditorPage from "./pages/PostEditorPage";
import CommunitiesPage from "./pages/CommunitiesPage";
import CreateCommunityPage from "./pages/CreateCommunityPage";

function Stub({ title }) {
  return <div style={{ background: "#fff", border: "1px solid #e6e8ee", borderRadius: 10, padding: 12 }}>{title}</div>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route
        path="/"
        element={
          <RequireAuth>
            <AppLayout />
          </RequireAuth>
        }
      >
        <Route index element={<FeedPage />} />
        <Route path="subscriptions" element={<SubscriptionsFeedPage />} />
        <Route path="communities" element={<CommunitiesPage />} />
        <Route path="communities/new" element={<CreateCommunityPage />} />
        <Route path="communities/:id/edit" element={<CreateCommunityPage />} />
        <Route path="help" element={<Stub title="Запросы помощи (заглушка)" />} />
        <Route path="posts/new" element={<PostEditorPage />} />
        <Route path="posts/:id/edit" element={<PostEditorPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}