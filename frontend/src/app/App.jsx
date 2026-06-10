import { Navigate, Route, Routes } from "react-router-dom";

import RequireAuth from "../auth/RequireAuth";
import GuestOnly from "../auth/GuestOnly";

import LoginPage from "../pages/LoginPage/LoginPage";
import AppLayout from "../layouts/AppLayout/AppLayout";
import FeedPage from "../pages/FeedPage/FeedPage";
import PostEditorPage from "../pages/PostEditorPage/PostEditorPage";
import PostDetailsPage from "../pages/PostDetailsPage/PostDetailsPage";
import CommunitiesPage from "../pages/CommunitiesPage/CommunitiesPage";
import CommunityEditorPage from "../pages/CommunityEditorPage/CommunityEditorPage";
import CommunityDetailsPage from "../pages/CommunityDetailsPage/CommunityDetailsPage";
import MySubscriptionsPage from "../pages/MySubscriptionsPage/MySubscriptionsPage";
import HelpRequestsPage from "../pages/HelpRequestsPage/HelpRequestsPage";
import HelpRequestEditorPage from "../pages/HelpRequestEditorPage/HelpRequestEditorPage";
import AdminPage from "../pages/AdminPage/AdminPage";

function StubPage({ title }) {
  return (
    <div
      style={{
        padding: 20,
        background: "#fff",
        border: "1px solid #d7d7d7",
        borderRadius: 10,
      }}
    >
      {title}
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route
        path="/login"
        element={
          <GuestOnly>
            <LoginPage />
          </GuestOnly>
        }
      />

      <Route
        path="/"
        element={
          <RequireAuth>
            <AppLayout />
          </RequireAuth>
        }
      >
        <Route index element={<FeedPage />} />
        <Route path="subscriptions" element={<MySubscriptionsPage />} />
        <Route path="posts/:id" element={<PostDetailsPage />} />
        <Route path="posts/new" element={<PostEditorPage />} />
        <Route path="posts/:id/edit" element={<PostEditorPage />} />
        <Route path="subscriptions" element={<StubPage title="Мои подписки" />} />
        <Route path="communities" element={<CommunitiesPage />} />
        <Route path="communities/new" element={<CommunityEditorPage />} />
        <Route path="communities/:id" element={<CommunityDetailsPage />} />
        <Route path="communities/:id/edit" element={<CommunityEditorPage />} />
        <Route path="help-requests" element={<HelpRequestsPage />} />
        <Route path="help-requests/new" element={<HelpRequestEditorPage />} />
        <Route path="help-requests/:id/edit" element={<HelpRequestEditorPage />} />
        <Route path="admin" element={<AdminPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}