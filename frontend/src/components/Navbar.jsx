import { Link, useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { Menu, X, Activity } from "lucide-react";
import { useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const links = [
  { to: "/programs", label: "Programs" },
  //{ to: "/doctors", label: "Doctors" },
  //{ to: "/pricing", label: "Pricing" },
  { to: "/blog", label: "Learn" },
  { to: "/about", label: "About" },
  { to: "/enquire", label: "Enquire" },
];

export default function Navbar() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const nav = useNavigate();
  const loc = useLocation();

  const dashHref =
    user?.role === "admin" ? "/admin" : user?.role === "doctor" ? "/doctor" : "/patient";

  const login = () => {
    nav("/login");
  };

  return (
    <header className="glass-nav sticky top-0 z-50" data-testid="site-navbar">
      <div className="max-w-7xl mx-auto px-6 lg:px-8 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 group" data-testid="brand-link">
          <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center text-white">
            <Activity size={18} strokeWidth={2.2} />
          </div>
          <span className="font-serif text-2xl tracking-tight text-slate-900">Velora360</span>
        </Link>

        <nav className="hidden md:flex items-center gap-8">
          {links.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              data-testid={`nav-${l.label.toLowerCase()}`}
              className={`text-sm text-slate-600 hover:text-primary transition-colors ${
                loc.pathname.startsWith(l.to) ? "text-primary font-medium" : ""
              }`}
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="hidden md:flex items-center gap-3">
          <Button
            variant="ghost"
            className="rounded-full text-slate-700"
            onClick={() => nav("/onboarding")}
            data-testid="nav-assessment-btn"
          >
            Get started
          </Button>
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button data-testid="nav-user-menu" className="flex items-center gap-2">
                  <Avatar className="h-9 w-9 border border-border">
                    <AvatarImage src={user.picture} />
                    <AvatarFallback className="bg-accent text-primary">
                      {user.name?.[0] ?? "U"}
                    </AvatarFallback>
                  </Avatar>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <div className="px-2 py-1.5 text-sm">
                  <div className="font-medium">{user.name}</div>
                  <div className="text-xs text-muted-foreground">{user.email}</div>
                  <div className="text-xs mt-1 inline-block px-2 py-0.5 rounded-full bg-accent text-primary capitalize">
                    {user.role}
                  </div>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => nav(dashHref)} data-testid="menu-dashboard">
                  Dashboard
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => nav("/settings")} data-testid="menu-settings">
                  Settings
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => nav("/support")}>Support</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={logout} data-testid="menu-logout">
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button
              onClick={login}
              className="rounded-full bg-white hover:bg-slate-50 border border-border/70 text-slate-800 shadow-sm h-10 px-4"
              data-testid="nav-login-btn"
            >
              Sign in
            </Button>
            
            
          )}
        </div>

        <button
          className="md:hidden p-2"
          onClick={() => setOpen(!open)}
          data-testid="nav-mobile-toggle"
        >
          {open ? <X /> : <Menu />}
        </button>
      </div>

      {open && (
        <div className="md:hidden border-t border-border/40 bg-white" data-testid="nav-mobile-menu">
          <div className="px-6 py-4 flex flex-col gap-3">
            {links.map((l) => (
              <Link key={l.to} to={l.to} onClick={() => setOpen(false)} className="py-2 text-slate-700">
                {l.label}
              </Link>
            ))}
            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                className="rounded-full flex-1"
                onClick={() => { setOpen(false); nav("/onboarding"); }}
              >
                Get started
              </Button>
              {user ? (
                <Button className="rounded-full flex-1 bg-primary" onClick={() => { setOpen(false); nav(dashHref); }}>
                  Dashboard
                </Button>
              ) : (
                <Button className="rounded-full flex-1 bg-white border border-border/70 text-slate-800 shadow-sm" onClick={login}>
                  Sign in
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
