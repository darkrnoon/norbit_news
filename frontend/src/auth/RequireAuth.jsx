import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "./AuthContext";

export default function RequireAuth({ children }) {
  const { isAuth, isAuthLoading } = useAuth();
  const location = useLocation();

  if (isAuthLoading) {
    return <div style={{ padding: 24 }}>Загрузка...</div>;
  }

  if (!isAuth) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return children;
}