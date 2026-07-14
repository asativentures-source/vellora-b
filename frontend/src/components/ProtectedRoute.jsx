import { Navigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

export default function ProtectedRoute({ children, role }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-500" data-testid="protected-loading">
        Loading…
      </div>
    );
  }
  if (!user) return <Navigate to="/" replace />;
  if (role && user.role !== role && user.role !== "admin") {
    return <Navigate to="/patient" replace />;
  }
  return children;
}
