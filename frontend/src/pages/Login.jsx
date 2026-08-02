import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GoogleLogo } from "@/components/GoogleLogo";
import { ShieldCheck, Lock, Mail } from "lucide-react";
import { emailLogin, emailRegister, forgotPassword, formatApiErrorDetail } from "@/lib/api";
import { toast } from "sonner";

export default function Login() {
  const { user, loading, refresh } = useAuth();
  const nav = useNavigate();
  const [mode, setMode] = useState("signin");
  const [busy, setBusy] = useState(false);
  const [signInForm, setSignInForm] = useState({ email: "", password: "" });
  const [signUpForm, setSignUpForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");

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

  const doSignIn = async (e) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const { user } = await emailLogin(signInForm);
      toast.success(`Welcome back, ${user.name?.split(" ")[0] || ""}`);
      await refresh();
      const to = user.role === "admin" ? "/admin" : user.role === "doctor" ? "/doctor" : "/patient";
      nav(to, { replace: true });
    } catch (err) {
      setError(formatApiErrorDetail(err.response?.data?.detail) || err.message);
    }
    setBusy(false);
  };

  const doSignUp = async (e) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const { user } = await emailRegister(signUpForm);
      toast.success(`Welcome to Verdia, ${user.name?.split(" ")[0] || ""}`);
      await refresh();
      nav("/patient", { replace: true });
    } catch (err) {
      setError(formatApiErrorDetail(err.response?.data?.detail) || err.message);
    }
    setBusy(false);
  };

  const doForgot = async () => {
    if (!signInForm.email) { toast.error("Enter your email above first."); return; }
    try {
      await forgotPassword(signInForm.email);
      toast.success("If an account exists, we've sent a reset link.");
    } catch { toast.error("Please try again."); }
  };

  return (
    <main className="max-w-md mx-auto px-6 pt-16 pb-24" data-testid="login-page">
      <Card className="rounded-3xl border-border/60 soft-shadow">
        <CardContent className="p-8">
          <div className="text-xs uppercase tracking-widest text-slate-500">Welcome</div>
          <h1 className="font-serif text-4xl mt-2">Sign in to Vellora360</h1>
          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 h-px bg-border/60"/>
            <span className="text-xs uppercase tracking-widest text-slate-400">Sign in with email</span>
            <div className="flex-1 h-px bg-border/60"/>
          </div>

          <Tabs value={mode} onValueChange={(v)=>{ setMode(v); setError(""); }}>
             <TabsList className="grid grid-cols-2 rounded-full bg-accent/60">
              <TabsTrigger value="signin" className="rounded-full" data-testid="tab-signin">Sign in</TabsTrigger>
              <TabsTrigger value="signup" className="rounded-full" data-testid="tab-signup">Create account</TabsTrigger>
            </TabsList>
          

            <TabsContent value="signin" className="mt-5">
              <form onSubmit={doSignIn} className="space-y-3" data-testid="email-signin-form">
                <div>
                  <Label htmlFor="si-email">Email</Label>
                  <Input id="si-email" type="email" required value={signInForm.email} onChange={(e)=>setSignInForm({...signInForm, email: e.target.value})} placeholder="you@example.com" autoComplete="email" data-testid="signin-email"/>
                </div>
                <div>
                  <Label htmlFor="si-pw">Password</Label>
                  <Input id="si-pw" type="password" required value={signInForm.password} onChange={(e)=>setSignInForm({...signInForm, password: e.target.value})} placeholder="••••••••" autoComplete="current-password" data-testid="signin-password"/>
                </div>
                {error && <div className="text-xs text-red-600" data-testid="signin-error">{error}</div>}
                <div className="flex items-center justify-between">
                  <button type="button" onClick={doForgot} className="text-xs text-primary hover:underline" data-testid="forgot-password-link">Forgot password?</button>
                </div>
                <Button type="submit" disabled={busy} className="w-full rounded-full bg-primary hover:bg-primary/90" data-testid="signin-submit">
                  <Mail size={16} className="mr-2"/> {busy ? "Signing in…" : "Sign in with Email"}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup" className="mt-5">
              <form onSubmit={doSignUp} className="space-y-3" data-testid="email-signup-form">
                <div>
                  <Label htmlFor="su-name">Full name</Label>
                  <Input id="su-name" required value={signUpForm.name} onChange={(e)=>setSignUpForm({...signUpForm, name: e.target.value})} placeholder="Alex Morgan" autoComplete="name" data-testid="signup-name"/>
                </div>
                <div>
                  <Label htmlFor="su-email">Email</Label>
                  <Input id="su-email" type="email" required value={signUpForm.email} onChange={(e)=>setSignUpForm({...signUpForm, email: e.target.value})} placeholder="you@example.com" autoComplete="email" data-testid="signup-email"/>
                </div>
                <div>
                  <Label htmlFor="su-pw">Password</Label>
                  <Input id="su-pw" type="password" required minLength={8} value={signUpForm.password} onChange={(e)=>setSignUpForm({...signUpForm, password: e.target.value})} placeholder="At least 8 characters" autoComplete="new-password" data-testid="signup-password"/>
                </div>
                {error && <div className="text-xs text-red-600" data-testid="signup-error">{error}</div>}
                <Button type="submit" disabled={busy} className="w-full rounded-full bg-primary hover:bg-primary/90" data-testid="signup-submit">
                  {busy ? "Creating account…" : "Create account"}
                </Button>
                <p className="text-xs text-slate-500">Doctors, please email us to be onboarded with clinician credentials.</p>
              </form>
            </TabsContent>
          </Tabs>

        </CardContent>
      </Card>

      <p className="text-center text-xs text-slate-400 mt-6">
        Need help? <Link to="/support" className="text-primary hover:underline">Contact support</Link>
      </p>
    </main>
  );
}
