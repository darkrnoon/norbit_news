import { Navigate } from "react-router-dom";
import { useAuth } from "./AuthContext";

export default function GuestOnly({ children }) {
  const { isAuth, isAuthLoading } = useAuth();

  if (isAuthLoading) {
    return <div style={{ padding: 24 }}>Загрузка...</div>;
  }

  if (isAuth) {
    return <Navigate to="/" replace />;
  }

  return children;
}