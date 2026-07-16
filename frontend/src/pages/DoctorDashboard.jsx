import { useEffect, useState } from "react";
import DashboardShell from "@/components/DashboardShell";
import { fetchDoctorDashboard } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Calendar, MessageSquare, FileText } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const links = [
  { to: "/doctor", label: "Overview", icon: "LayoutDashboard" },
  { to: "/doctor/notes", label: "Notes", icon: "MessageSquare" },
  { to: "/doctor/messages", label: "Messages", icon: "MessageSquare" },
];

export default function DoctorDashboard() {
  const [data, setData] = useState({ appointments: [], patients: [] });
  useEffect(() => { fetchDoctorDashboard().then(setData).catch(() => {}); }, []);

  return (
    <DashboardShell title="Clinic today" links={links}>
      <div className="grid md:grid-cols-3 gap-6">
        {[
          { label: "Today's appointments", val: data.appointments.length, icon: Calendar },
          { label: "Active patients", val: data.patients.length, icon: Users },
          { label: "Pending notes", val: 3, icon: FileText },
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

      <div className="grid lg:grid-cols-3 gap-6 mt-6" id="appts">
        <Card className="lg:col-span-2 rounded-2xl border-border/60 soft-shadow">
          <CardContent className="p-6">
            <div className="font-serif text-2xl">Schedule</div>
            <div className="mt-4 divide-y divide-border/60">
              {data.appointments.length === 0 && <div className="text-sm text-slate-500 py-8 text-center">No appointments yet.</div>}
              {data.appointments.map((a) => (
                <div key={a.id} className="py-3 flex items-center justify-between" data-testid={`doc-appt-${a.id}`}>
                  <div>
                    <div className="font-medium">{a.patient_name}</div>
                    <div className="text-xs text-slate-500">{new Date(a.scheduled_at).toLocaleString()} · {a.reason}</div>
                  </div>
                  <Badge className="rounded-full bg-accent text-primary hover:bg-accent">{a.status}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border/60 soft-shadow" id="patients">
          <CardContent className="p-6">
            <div className="font-serif text-2xl">Recent patients</div>
            <div className="mt-4 space-y-3">
              {data.patients.slice(0,6).map((p) => (
                <div key={p.user_id} className="flex items-center gap-3">
                  <Avatar className="h-9 w-9"><AvatarImage src={p.picture}/><AvatarFallback>{p.name[0]}</AvatarFallback></Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{p.name}</div>
                    <div className="text-xs text-slate-500 truncate">{p.email}</div>
                  </div>
                </div>
              ))}
              {data.patients.length === 0 && <div className="text-sm text-slate-500">No patients yet.</div>}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardShell>
  );
}
