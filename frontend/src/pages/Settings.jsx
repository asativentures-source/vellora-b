import { useEffect, useState } from "react";
import DashboardShell from "@/components/DashboardShell";
import { useAuth } from "@/context/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { addPassword, changePassword, fetchSecurity, formatApiErrorDetail } from "@/lib/api";
import { toast } from "sonner";
import { KeyRound, ShieldCheck, LogOut, Sparkles, Lock } from "lucide-react";
import { GoogleLogo } from "@/components/GoogleLogo";

const patientLinks = [
  { to: "/patient", label: "Overview", icon: "LayoutDashboard" },
  { to: "/patient/labs", label: "Labs", icon: "FlaskConical" },
  { to: "/patient/messages", label: "Messages", icon: "MessageSquare" },
  { to: "/settings", label: "Settings", icon: "Settings" },
];
const doctorLinks = [
  { to: "/doctor", label: "Overview", icon: "LayoutDashboard" },
  { to: "/doctor/notes", label: "Notes", icon: "MessageSquare" },
  { to: "/doctor/messages", label: "Messages", icon: "MessageSquare" },
  { to: "/settings", label: "Settings", icon: "Settings" },
];
const adminLinks = [
  { to: "/admin", label: "Overview", icon: "LayoutDashboard" },
  { to: "/settings", label: "Settings", icon: "Settings" },
];

export default function Settings() {
  const { user, refresh } = useAuth();
  const [sec, setSec] = useState(null);
  const [addForm, setAddForm] = useState({ password: "", confirm: "" });
  const [changeForm, setChangeForm] = useState({ current_password: "", new_password: "", confirm: "" });
  const [busy, setBusy] = useState(false);

  const load = async () => {
    try { setSec(await fetchSecurity()); } catch { setSec(null); }
  };
  useEffect(() => { load(); }, []);

  if (!user) return null;
  const links = user.role === "admin" ? adminLinks : user.role === "doctor" ? doctorLinks : patientLinks;

  const doAdd = async (e) => {
    e.preventDefault();
    if (addForm.password !== addForm.confirm) { toast.error("Passwords do not match"); return; }
    setBusy(true);
    try {
      const r = await addPassword(addForm.password);
      toast.success(r.message || "Password set");
      setAddForm({ password: "", confirm: "" });
      await refresh();
      await load();
    } catch (err) {
      toast.error(formatApiErrorDetail(err.response?.data?.detail) || err.message);
    }
    setBusy(false);
  };

  const doChange = async (e) => {
    e.preventDefault();
    if (changeForm.new_password !== changeForm.confirm) { toast.error("Passwords do not match"); return; }
    setBusy(true);
    try {
      const r = await changePassword({ current_password: changeForm.current_password, new_password: changeForm.new_password });
      toast.success(r.message || "Password updated");
      setChangeForm({ current_password: "", new_password: "", confirm: "" });
      await load();
    } catch (err) {
      toast.error(formatApiErrorDetail(err.response?.data?.detail) || err.message);
    }
    setBusy(false);
  };

  return (
    <DashboardShell title="Settings" links={links}>
      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1 rounded-2xl border-border/60 soft-shadow">
          <CardContent className="p-6">
            <div className="font-serif text-2xl">Profile</div>
            <div className="mt-4 space-y-3 text-sm">
              <div>
                <div className="text-xs uppercase tracking-widest text-slate-500">Name</div>
                <div className="font-medium">{user.name}</div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-widest text-slate-500">Email</div>
                <div className="font-medium break-all">{user.email}</div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-widest text-slate-500">Role</div>
                <Badge className="rounded-full bg-accent text-primary hover:bg-accent capitalize">{user.role}</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2 rounded-2xl border-border/60 soft-shadow">
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <ShieldCheck size={18} className="text-primary"/>
              <div className="font-serif text-2xl">Security</div>
            </div>

            {/* Auth methods overview */}
            <div className="grid sm:grid-cols-2 gap-3 mt-5">
              <div className="p-4 rounded-2xl border border-border/60 flex items-center gap-3" data-testid="auth-method-google">
                <GoogleLogo size={20}/>
                <div className="flex-1">
                  <div className="text-sm font-medium">Google</div>
                  <div className="text-xs text-slate-500">{sec?.has_google ? "Connected" : "Not connected"}</div>
                </div>
                {sec?.has_google && <Badge className="rounded-full bg-emerald-100 text-emerald-700 hover:bg-emerald-100">Active</Badge>}
              </div>
              <div className="p-4 rounded-2xl border border-border/60 flex items-center gap-3" data-testid="auth-method-password">
                <Lock size={18} className="text-slate-600"/>
                <div className="flex-1">
                  <div className="text-sm font-medium">Email + password</div>
                  <div className="text-xs text-slate-500">{sec?.has_password ? "Enabled" : "Not set"}</div>
                </div>
                {sec?.has_password && <Badge className="rounded-full bg-emerald-100 text-emerald-700 hover:bg-emerald-100">Active</Badge>}
              </div>
            </div>

            {/* Add password (Google-only users) */}
            {sec && !sec.has_password && (
              <div className="mt-6" data-testid="add-password-block">
                <div className="flex items-center gap-2 text-primary">
                  <Sparkles size={16}/>
                  <div className="text-sm font-medium">Add a password to your account</div>
                </div>
                <p className="text-sm text-slate-600 mt-1">
                  You're currently signed in with Google. Adding a password lets you also sign in with email — a useful backup if you ever lose access to your Google account.
                </p>
                {!sec.fresh_auth && (
                  <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50/70 px-4 py-3 text-sm text-amber-800" data-testid="fresh-auth-warning">
                    For your security, please sign in again within the last {sec.fresh_auth_window_min} minutes before setting a password.
                    <Button
                      variant="link"
                      className="p-0 h-auto ml-2 text-amber-900 underline"
                      onClick={() => { window.location.href = "/login"; }}
                      data-testid="reauth-link"
                    >
                      Re-authenticate →
                    </Button>
                  </div>
                )}
                <form onSubmit={doAdd} className="mt-4 grid sm:grid-cols-2 gap-3" data-testid="add-password-form">
                  <div>
                    <Label>New password</Label>
                    <Input type="password" required minLength={8} value={addForm.password} onChange={(e)=>setAddForm({...addForm, password: e.target.value})} placeholder="At least 8 characters" autoComplete="new-password" data-testid="add-pw-new"/>
                  </div>
                  <div>
                    <Label>Confirm password</Label>
                    <Input type="password" required minLength={8} value={addForm.confirm} onChange={(e)=>setAddForm({...addForm, confirm: e.target.value})} placeholder="Repeat password" autoComplete="new-password" data-testid="add-pw-confirm"/>
                  </div>
                  <div className="sm:col-span-2 flex justify-end">
                    <Button type="submit" disabled={busy || !sec.fresh_auth} className="rounded-full bg-primary hover:bg-primary/90" data-testid="add-pw-submit">
                      <KeyRound size={16} className="mr-2"/> {busy ? "Saving…" : "Set password"}
                    </Button>
                  </div>
                </form>
              </div>
            )}

            {/* Change password */}
            {sec && sec.has_password && (
              <div className="mt-6" data-testid="change-password-block">
                <div className="text-sm font-medium">Change password</div>
                <p className="text-sm text-slate-600 mt-1">You'll be signed out from other devices after changing your password.</p>
                <form onSubmit={doChange} className="mt-4 grid sm:grid-cols-2 gap-3" data-testid="change-password-form">
                  <div className="sm:col-span-2">
                    <Label>Current password</Label>
                    <Input type="password" required value={changeForm.current_password} onChange={(e)=>setChangeForm({...changeForm, current_password: e.target.value})} autoComplete="current-password" data-testid="ch-pw-current"/>
                  </div>
                  <div>
                    <Label>New password</Label>
                    <Input type="password" required minLength={8} value={changeForm.new_password} onChange={(e)=>setChangeForm({...changeForm, new_password: e.target.value})} placeholder="At least 8 characters" autoComplete="new-password" data-testid="ch-pw-new"/>
                  </div>
                  <div>
                    <Label>Confirm new</Label>
                    <Input type="password" required minLength={8} value={changeForm.confirm} onChange={(e)=>setChangeForm({...changeForm, confirm: e.target.value})} autoComplete="new-password" data-testid="ch-pw-confirm"/>
                  </div>
                  <div className="sm:col-span-2 flex justify-end">
                    <Button type="submit" disabled={busy} className="rounded-full bg-primary hover:bg-primary/90" data-testid="ch-pw-submit">
                      {busy ? "Updating…" : "Update password"}
                    </Button>
                  </div>
                </form>
              </div>
            )}

            {/* Sessions summary */}
            {sec && (
              <div className="mt-8 pt-6 border-t border-border/60">
                <div className="text-xs uppercase tracking-widest text-slate-500 mb-2">Active sessions</div>
                <div className="flex flex-wrap gap-3 text-sm text-slate-700">
                  <div className="flex items-center gap-2"><LogOut size={14}/> {sec.active_refresh_sessions} email/password session(s)</div>
                  <div className="flex items-center gap-2"><LogOut size={14}/> {sec.active_google_sessions} Google session(s)</div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardShell>
  );
}
