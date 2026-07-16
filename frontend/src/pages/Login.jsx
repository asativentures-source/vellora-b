import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { GoogleLogo } from "@/components/GoogleLogo";
import { ShieldCheck, Lock } from "lucide-react";

export default function Login() {
  const { user, loading } = useAuth();
  const nav = useNavigate();

  useEffect(() => {
    if (!loading && user) {
      const to = user.role === "admin" ? "/admin" : user.role === "doctor" ? "/doctor" : "/patient";
      nav(to, { replace: true });
    }
  }, [user, loading, nav]);

  const google = () => {
    // REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
    const redirectUrl = window.location.origin + "/auth-callback";
    window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
  };

  return (
    <main className="max-w-md mx-auto px-6 pt-20 pb-24" data-testid="login-page">
      <Card className="rounded-3xl border-border/60 soft-shadow">
        <CardContent className="p-10">
          <div className="text-xs uppercase tracking-widest text-slate-500">Welcome</div>
          <h1 className="font-serif text-4xl mt-2">Sign in to Verdia</h1>
          <p className="text-slate-600 mt-3">Use your Google account to access your dashboard, consultations, labs, and messages.</p>

          <Button
            onClick={google}
            className="mt-8 w-full h-12 rounded-full bg-white hover:bg-slate-50 border border-border/70 text-slate-800 shadow-sm"
            data-testid="google-signin-btn"
          >
            <GoogleLogo size={20} className="mr-2"/> Continue with Google
          </Button>

          <div className="mt-6 space-y-2 text-xs text-slate-500">
            <div className="flex items-center gap-2"><ShieldCheck size={14} className="text-primary"/> HIPAA-aware infrastructure</div>
            <div className="flex items-center gap-2"><Lock size={14} className="text-primary"/> Session encrypted, signed out in 7 days by default</div>
          </div>

          <p className="mt-8 text-xs text-slate-400 leading-relaxed">
            By continuing you agree to our Terms of Service and acknowledge our Privacy Policy.
            First-time users will be onboarded to the patient dashboard automatically.
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
