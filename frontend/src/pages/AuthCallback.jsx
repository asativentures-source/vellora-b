import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { createSession } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

// REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
export default function AuthCallback() {
  const nav = useNavigate();
  const hasProcessed = useRef(false);
  const { setUser } = useAuth();

  useEffect(() => {
    if (hasProcessed.current) return;
    hasProcessed.current = true;

    const hash = window.location.hash || "";
    const sid = new URLSearchParams(hash.replace(/^#/, "")).get("session_id");
    if (!sid) {
      nav("/");
      return;
    }
    (async () => {
      try {
        const { user } = await createSession(sid);
        setUser(user);
        const target =
          user.role === "admin" ? "/admin" : user.role === "doctor" ? "/doctor" : "/patient";
        nav(target, { replace: true, state: { user } });
      } catch (e) {
        nav("/", { replace: true });
      }
    })();
  }, [nav, setUser]);

  return (
    <div className="min-h-screen flex items-center justify-center text-slate-500" data-testid="auth-callback">
      Completing sign-in…
    </div>
  );
}
