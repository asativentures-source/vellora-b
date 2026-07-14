import { useEffect, useState } from "react";
import DashboardShell from "@/components/DashboardShell";
import { fetchAdminStats, fetchAdminUsers, fetchAdminAppointments } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Users, Stethoscope, Calendar, ShoppingBag } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

const links = [
  { to: "/admin", label: "Overview", icon: "LayoutDashboard" },
  { to: "/admin#users", label: "Users", icon: "Users" },
  { to: "/admin#doctors", label: "Doctors", icon: "ShieldCheck" },
  { to: "/admin#orders", label: "Orders", icon: "ShoppingBag" },
  { to: "/admin#analytics", label: "Analytics", icon: "BarChart3" },
];

const analytics = [
  { m: "Jan", signups: 210 }, { m: "Feb", signups: 320 },
  { m: "Mar", signups: 410 }, { m: "Apr", signups: 380 },
  { m: "May", signups: 520 }, { m: "Jun", signups: 690 },
];

export default function AdminDashboard() {
  const [stats, setStats] = useState({});
  const [users, setUsers] = useState([]);
  const [appts, setAppts] = useState([]);
  useEffect(() => {
    fetchAdminStats().then(setStats).catch(() => {});
    fetchAdminUsers().then(setUsers).catch(() => {});
    fetchAdminAppointments().then(setAppts).catch(() => {});
  }, []);

  return (
    <DashboardShell title="Platform" links={links}>
      <div className="grid md:grid-cols-4 gap-6">
        {[
          { icon: Users, label: "Users", val: stats.users || 0 },
          { icon: Stethoscope, label: "Doctors", val: stats.doctors || 0 },
          { icon: Calendar, label: "Appointments", val: stats.appointments || 0 },
          { icon: ShoppingBag, label: "Orders", val: stats.orders || 0 },
        ].map((k)=>(
          <Card key={k.label} className="rounded-2xl border-border/60 soft-shadow">
            <CardContent className="p-6">
              <div className="w-10 h-10 rounded-full bg-accent flex items-center justify-center text-primary"><k.icon size={18}/></div>
              <div className="text-xs uppercase tracking-widest text-slate-500 mt-4">{k.label}</div>
              <div className="font-serif text-4xl mt-1">{k.val}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="mt-6 rounded-2xl border-border/60 soft-shadow" id="analytics">
        <CardContent className="p-6">
          <div className="font-serif text-2xl">Sign-ups (6 mo)</div>
          <div className="h-64 mt-4">
            <ResponsiveContainer>
              <BarChart data={analytics}>
                <CartesianGrid stroke="#E2E8F0" strokeDasharray="3 3" opacity={0.4}/>
                <XAxis dataKey="m" stroke="#94A3B8" fontSize={12}/>
                <YAxis stroke="#94A3B8" fontSize={12}/>
                <Tooltip contentStyle={{ border: "1px solid #E2E8F0", borderRadius: 12 }}/>
                <Bar dataKey="signups" fill="#3B6B56" radius={[8,8,0,0]}/>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <div className="grid lg:grid-cols-2 gap-6 mt-6">
        <Card className="rounded-2xl border-border/60 soft-shadow" id="users">
          <CardContent className="p-6">
            <div className="font-serif text-2xl">Recent users</div>
            <div className="mt-4 divide-y divide-border/60">
              {users.slice(0,8).map((u) => (
                <div key={u.user_id} className="py-3 flex items-center gap-3">
                  <Avatar className="h-9 w-9"><AvatarImage src={u.picture}/><AvatarFallback>{u.name?.[0]}</AvatarFallback></Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{u.name}</div>
                    <div className="text-xs text-slate-500 truncate">{u.email}</div>
                  </div>
                  <Badge className="rounded-full bg-accent text-primary hover:bg-accent capitalize">{u.role}</Badge>
                </div>
              ))}
              {users.length === 0 && <div className="text-sm text-slate-500 py-6">No users yet.</div>}
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-2xl border-border/60 soft-shadow">
          <CardContent className="p-6">
            <div className="font-serif text-2xl">Latest appointments</div>
            <div className="mt-4 divide-y divide-border/60">
              {appts.slice(0,8).map((a) => (
                <div key={a.id} className="py-3">
                  <div className="text-sm font-medium">{a.patient_name} → {a.doctor_name}</div>
                  <div className="text-xs text-slate-500">{new Date(a.scheduled_at).toLocaleString()} · {a.reason}</div>
                </div>
              ))}
              {appts.length === 0 && <div className="text-sm text-slate-500 py-6">No appointments yet.</div>}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardShell>
  );
}
