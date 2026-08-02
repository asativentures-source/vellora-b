import { useState } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { resetPassword, formatApiErrorDetail } from "@/lib/api";
import { toast } from "sonner";
import { Lock } from "lucide-react";

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const nav = useNavigate();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (!token) {
      setError("Missing or invalid reset token.");
      return;
    }

    setError("");
    setBusy(true);
    try {
      await resetPassword({ token, password });
      toast.success("Password reset successfully! Please sign in.");
      nav("/login", { replace: true });
    } catch (err) {
      setError(formatApiErrorDetail(err.response?.data?.detail) || err.message);
    }
    setBusy(false);
  };

  return (
    <main className="max-w-md mx-auto px-6 pt-16 pb-24" data-testid="reset-password-page">
      <Card className="rounded-3xl border-border/60 soft-shadow">
        <CardContent className="p-8">
          <div className="text-xs uppercase tracking-widest text-slate-500">Security</div>
          <h1 className="font-serif text-3xl mt-2">Reset Password</h1>
          <p className="text-sm text-slate-500 mt-1 mb-6">Enter your new password below.</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="new-pw">New Password</Label>
              <Input
                id="new-pw"
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 8 characters"
                data-testid="new-password-input"
              />
            </div>

            <div>
              <Label htmlFor="confirm-pw">Confirm New Password</Label>
              <Input
                id="confirm-pw"
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                data-testid="confirm-password-input"
              />
            </div>

            {error && <div className="text-xs text-red-600" data-testid="reset-error">{error}</div>}

            <Button type="submit" disabled={busy} className="w-full rounded-full bg-primary hover:bg-primary/90" data-testid="reset-submit">
              <Lock size={16} className="mr-2" /> {busy ? "Updating..." : "Reset Password"}
            </Button>
          </form>

          <div className="text-center mt-6">
            <Link to="/login" className="text-xs text-primary hover:underline">
              Back to Sign in
            </Link>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}