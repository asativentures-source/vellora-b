import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Activity, LayoutDashboard, HeartPulse, Calendar, Pill, FlaskConical, MessageSquare, Users, ShoppingBag, ShieldCheck, BarChart3, LogOut, Settings } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const iconMap = { LayoutDashboard, HeartPulse, Calendar, Pill, FlaskConical, MessageSquare, Users, ShoppingBag, ShieldCheck, BarChart3, Settings };

export default function DashboardShell({ title, links, children }) {
  const { user, logout } = useAuth();
  const loc = useLocation();
  const nav = useNavigate();

  return (
    <div className="min-h-screen bg-background flex" data-testid="dashboard-shell">
      <aside className="w-64 shrink-0 border-r border-border/60 bg-white/60 backdrop-blur-md hidden md:flex flex-col">
        <Link to="/" className="flex items-center gap-2 px-6 h-16 border-b border-border/60">
          <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center text-white"><Activity size={18}/></div>
          <span className="font-serif text-2xl">Verdia</span>
        </Link>
        <nav className="p-4 flex-1 space-y-1">
          {links.map((l) => {
            const Icon = iconMap[l.icon] || LayoutDashboard;
            const active = loc.pathname === l.to || (l.to !== "/" && loc.pathname.startsWith(l.to));
            return (
              <Link key={l.to} to={l.to} data-testid={`nav-${l.label.toLowerCase().replace(/\s+/g,"-")}`}
                className={`flex items-center gap-3 px-3 py-2 rounded-full text-sm ${active ? "bg-accent text-primary font-medium" : "text-slate-700 hover:bg-accent/60"}`}>
                <Icon size={16}/> {l.label}
              </Link>
            );
          })}
        </nav>
        <div className="p-4 border-t border-border/60">
          <div className="flex items-center gap-3">
            <Avatar className="h-9 w-9"><AvatarImage src={user?.picture}/><AvatarFallback>{user?.name?.[0]}</AvatarFallback></Avatar>
            <div className="min-w-0">
              <div className="text-sm font-medium truncate">{user?.name}</div>
              <div className="text-xs text-slate-500 capitalize">{user?.role}</div>
            </div>
          </div>
          <button onClick={async () => { await logout(); nav("/"); }} className="mt-3 w-full flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 px-3 py-2 rounded-full hover:bg-accent/60" data-testid="dashboard-logout">
            <LogOut size={14}/> Log out
          </button>
        </div>
      </aside>
      <main className="flex-1 min-w-0">
        <header className="glass-nav h-16 flex items-center justify-between px-6 lg:px-10 sticky top-0 z-30">
          <div className="font-serif text-2xl text-slate-900">{title}</div>
          <div className="text-xs uppercase tracking-widest text-slate-500">{new Date().toLocaleDateString(undefined, { weekday:"long", month:"long", day:"numeric" })}</div>
        </header>
        <div className="p-6 lg:p-10">{children}</div>
      </main>
    </div>
  );
}
