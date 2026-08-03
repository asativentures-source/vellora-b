import { useEffect, useState } from "react";
import DashboardShell from "@/components/DashboardShell";
import { fetchPatientDashboard, addCheckin, bookAppointment, addGoal, fetchDoctors } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { AreaChart, Area, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { TrendingDown, HeartPulse, Ruler, Sparkles, Target, Plus, Calendar as CalIcon, Pill } from "lucide-react";
import { toast } from "sonner";

const links = [
  { to: "/patient", label: "Overview", icon: "LayoutDashboard" },
  { to: "/patient/labs", label: "Labs", icon: "FlaskConical" },
  { to: "/patient/messages", label: "Messages", icon: "MessageSquare" },
  { to: "/patient#appts", label: "Appointments", icon: "Calendar" },
  { to: "/patient#meds", label: "Medication", icon: "Pill" },
  { to: "/settings", label: "Settings", icon: "Settings" },
];

function MetricCard({ icon: Icon, label, value, delta, trend }) {
  return (
    <Card className="rounded-2xl border-border/60 soft-shadow soft-shadow-hover">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="w-10 h-10 rounded-full bg-accent flex items-center justify-center text-primary"><Icon size={18}/></div>
          {delta && <Badge className={`rounded-full ${trend === "down" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"} hover:opacity-100`}>{delta}</Badge>}
        </div>
        <div className="mt-6">
          <div className="text-xs uppercase tracking-widest text-slate-500">{label}</div>
          <div className="font-serif text-4xl mt-1">{value}</div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function PatientDashboard() {
  const [data, setData] = useState({ metrics: [], appointments: [], medications: [], goals: [] });
  const [doctors, setDoctors] = useState([]);
  const [openCheckin, setOpenCheckin] = useState(false);
  const [openAppt, setOpenAppt] = useState(false);
  const [openGoal, setOpenGoal] = useState(false);
  const [ci, setCi] = useState({ weight_kg: "", waist_cm: "", energy: 7, mood: 7, notes: "" });
  const [ap, setAp] = useState({ doctor_id: "", scheduled_at: "", reason: "" });
  const [g, setG] = useState({ title: "", target: "", due_date: "" });

  const load = () =>
    fetchPatientDashboard()
      .then((payload) => {
        setData({
          metrics: Array.isArray(payload?.metrics) ? payload.metrics : [],
          appointments: Array.isArray(payload?.appointments) ? payload.appointments : [],
          medications: Array.isArray(payload?.medications) ? payload.medications : [],
          goals: Array.isArray(payload?.goals) ? payload.goals : [],
        });
      })
      .catch(() => {});
  useEffect(() => { load(); fetchDoctors().then((docs) => setDoctors(Array.isArray(docs) ? docs : [])).catch(() => {}); }, []);

  const metrics = Array.isArray(data.metrics) ? data.metrics : [];
  const appointments = Array.isArray(data.appointments) ? data.appointments : [];
  const goals = Array.isArray(data.goals) ? data.goals : [];

  const latest = metrics[metrics.length - 1] || {};
  const first = metrics[0] || {};
  const weightDelta = latest.weight_kg && first.weight_kg ? (latest.weight_kg - first.weight_kg).toFixed(1) : null;
  const chartData = metrics
    .filter((m) => m.weight_kg)
    .map((m) => ({ date: new Date(m.recorded_at).toLocaleDateString(undefined, { month: "short", day: "numeric" }), weight: m.weight_kg, waist: m.waist_cm }));

  const submitCi = async () => {
    const payload = {
      weight_kg: ci.weight_kg ? parseFloat(ci.weight_kg) : null,
      waist_cm: ci.waist_cm ? parseFloat(ci.waist_cm) : null,
      energy: parseInt(ci.energy),
      mood: parseInt(ci.mood),
      notes: ci.notes,
    };
    await addCheckin(payload);
    toast.success("Check-in saved");
    setOpenCheckin(false);
    setCi({ weight_kg: "", waist_cm: "", energy: 7, mood: 7, notes: "" });
    load();
  };

  const submitAp = async () => {
    if (!ap.doctor_id || !ap.scheduled_at) return;
    await bookAppointment(ap);
    toast.success("Consultation booked");
    setOpenAppt(false);
    setAp({ doctor_id: "", scheduled_at: "", reason: "" });
    load();
  };

  const submitG = async () => {
    if (!g.title || !g.target) return;
    await addGoal(g);
    toast.success("Goal added");
    setOpenGoal(false);
    setG({ title: "", target: "", due_date: "" });
    load();
  };

  return (
    <DashboardShell title="Your health" links={links}>
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3 grid grid-cols-2 md:grid-cols-4 gap-6">
          <MetricCard icon={HeartPulse} label="Current weight" value={latest.weight_kg ? `${latest.weight_kg} kg` : "—"} delta={weightDelta ? `${weightDelta} kg` : null} trend="down"/>
          <MetricCard icon={TrendingDown} label="Change" value={weightDelta ? `${weightDelta} kg` : "Log to see"} />
          <MetricCard icon={Ruler} label="Waist" value={latest.waist_cm ? `${latest.waist_cm} cm` : "—"}/>
          <MetricCard icon={Sparkles} label="Mood today" value={latest.mood ? `${latest.mood}/10` : "—"}/>
        </div>
        <div className="lg:col-span-1 flex flex-col gap-3">
          <Dialog open={openCheckin} onOpenChange={setOpenCheckin}>
            <DialogTrigger asChild>
              <Button className="rounded-full bg-primary hover:bg-primary/90 h-12" data-testid="btn-open-checkin"><Plus size={16} className="mr-1"/> Daily check-in</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle className="font-serif text-2xl">Daily check-in</DialogTitle></DialogHeader>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Weight (kg)</Label><Input value={ci.weight_kg} onChange={(e)=>setCi({...ci, weight_kg: e.target.value})} placeholder="80.5" data-testid="ci-weight"/></div>
                <div><Label>Waist (cm)</Label><Input value={ci.waist_cm} onChange={(e)=>setCi({...ci, waist_cm: e.target.value})} placeholder="92" data-testid="ci-waist"/></div>
                <div><Label>Energy (1-10)</Label><Input type="number" min="1" max="10" value={ci.energy} onChange={(e)=>setCi({...ci, energy: e.target.value})}/></div>
                <div><Label>Mood (1-10)</Label><Input type="number" min="1" max="10" value={ci.mood} onChange={(e)=>setCi({...ci, mood: e.target.value})}/></div>
                <div className="col-span-2"><Label>Notes</Label><Textarea value={ci.notes} onChange={(e)=>setCi({...ci, notes: e.target.value})} placeholder="How did today feel?"/></div>
              </div>
              <DialogFooter><Button onClick={submitCi} className="rounded-full bg-primary" data-testid="ci-submit">Save check-in</Button></DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={openAppt} onOpenChange={setOpenAppt}>
            <DialogTrigger asChild>
              <Button variant="outline" className="rounded-full h-12" data-testid="btn-open-appt"><CalIcon size={16} className="mr-1"/> Book consult</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle className="font-serif text-2xl">Book a consultation</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div>
                  <Label>Doctor</Label>
                  <Select value={ap.doctor_id} onValueChange={(v)=>setAp({...ap, doctor_id: v})}>
                    <SelectTrigger data-testid="ap-doctor"><SelectValue placeholder="Choose a doctor"/></SelectTrigger>
                    <SelectContent>{doctors.map(d => <SelectItem key={d.doctor_id} value={d.doctor_id}>{d.name} · {d.specialty}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Date & time</Label><Input type="datetime-local" value={ap.scheduled_at} onChange={(e)=>setAp({...ap, scheduled_at: e.target.value})} data-testid="ap-date"/></div>
                <div><Label>Reason</Label><Input value={ap.reason} onChange={(e)=>setAp({...ap, reason: e.target.value})} placeholder="Progress review"/></div>
              </div>
              <DialogFooter><Button onClick={submitAp} className="rounded-full bg-primary" data-testid="ap-submit">Book</Button></DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Chart */}
      <Card className="mt-6 rounded-2xl border-border/60 soft-shadow" id="progress">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs uppercase tracking-widest text-slate-500">Progress</div>
              <div className="font-serif text-3xl mt-1">Weight & waist</div>
            </div>
          </div>
          <div className="h-64 mt-6">
            {chartData.length > 1 ? (
              <ResponsiveContainer>
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3B6B56" stopOpacity={0.35}/>
                      <stop offset="95%" stopColor="#3B6B56" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="#E2E8F0" strokeDasharray="3 3" opacity={0.4}/>
                  <XAxis dataKey="date" stroke="#94A3B8" fontSize={12}/>
                  <YAxis stroke="#94A3B8" fontSize={12}/>
                  <Tooltip contentStyle={{ border: "1px solid #E2E8F0", borderRadius: 12 }}/>
                  <Area type="monotone" dataKey="weight" stroke="#3B6B56" fill="url(#g1)" strokeWidth={2}/>
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-500 text-sm">Log a check-in to see your trend.</div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Appointments + Goals */}
      <div className="grid lg:grid-cols-3 gap-6 mt-6" id="appts">
        <Card className="lg:col-span-2 rounded-2xl border-border/60 soft-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="font-serif text-2xl">Upcoming consultations</div>
            </div>
            <div className="mt-4 space-y-3">
              {appointments.length === 0 && <div className="text-sm text-slate-500">No appointments yet. Book your first consultation.</div>}
              {appointments.map((a) => (
                <div key={a.id} className="flex items-center justify-between border-b border-border/60 pb-3">
                  <div>
                    <div className="font-medium">{a.doctor_name}</div>
                    <div className="text-xs text-slate-500">{new Date(a.scheduled_at).toLocaleString()} · {a.reason}</div>
                  </div>
                  <Badge className="rounded-full bg-accent text-primary hover:bg-accent">{a.status}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border/60 soft-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="font-serif text-2xl">Goals</div>
              <Dialog open={openGoal} onOpenChange={setOpenGoal}>
                <DialogTrigger asChild>
                  <Button size="sm" variant="outline" className="rounded-full" data-testid="btn-open-goal"><Plus size={14}/> Add</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle className="font-serif text-2xl">New goal</DialogTitle></DialogHeader>
                  <div className="space-y-3">
                    <div><Label>Title</Label><Input value={g.title} onChange={(e)=>setG({...g, title: e.target.value})} placeholder="Walk 10k daily"/></div>
                    <div><Label>Target</Label><Input value={g.target} onChange={(e)=>setG({...g, target: e.target.value})} placeholder="10,000 steps"/></div>
                    <div><Label>Due</Label><Input type="date" value={g.due_date} onChange={(e)=>setG({...g, due_date: e.target.value})}/></div>
                  </div>
                  <DialogFooter><Button onClick={submitG} className="rounded-full bg-primary">Save</Button></DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
            <div className="mt-4 space-y-3">
              {goals.length === 0 && <div className="text-sm text-slate-500">Set a goal to keep momentum.</div>}
              {goals.map((gl) => (
                <div key={gl.id} className="flex items-center gap-3 border-b border-border/60 pb-3">
                  <div className="w-9 h-9 rounded-full bg-accent flex items-center justify-center text-primary"><Target size={16}/></div>
                  <div className="flex-1">
                    <div className="font-medium text-sm">{gl.title}</div>
                    <div className="text-xs text-slate-500">{gl.target}{gl.due_date ? ` · by ${gl.due_date}` : ""}</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Medication + Diet stub */}
      <div className="grid lg:grid-cols-2 gap-6 mt-6" id="meds">
        <Card className="rounded-2xl border-border/60 soft-shadow">
          <CardContent className="p-6">
            <div className="font-serif text-2xl">Medication schedule</div>
            <div className="mt-4 space-y-3 text-sm">
              <div className="flex items-center justify-between p-3 rounded-xl bg-accent/60"><span className="flex items-center gap-2"><Pill size={16} className="text-primary"/> Semaglutide 0.5 mg</span><span className="text-slate-600">Fri 9:00 am</span></div>
              <div className="flex items-center justify-between p-3 rounded-xl bg-accent/40"><span className="flex items-center gap-2"><Pill size={16} className="text-primary"/> Vitamin D 2000 IU</span><span className="text-slate-600">Daily</span></div>
              <div className="text-xs text-slate-500 mt-2">Refill in 12 days · Cold-chain shipping active</div>
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-2xl border-border/60 soft-shadow">
          <CardContent className="p-6">
            <div className="font-serif text-2xl">This week's plate</div>
            <div className="mt-4 grid grid-cols-3 gap-3">
              {[
                { label: "Protein", val: "0.8g / lb" },
                { label: "Fiber", val: "30 g" },
                { label: "Water", val: "2.5 L" },
              ].map((k)=>(
                <div key={k.label} className="p-3 rounded-xl bg-accent/40 text-center">
                  <div className="text-xs uppercase tracking-widest text-slate-500">{k.label}</div>
                  <div className="font-serif text-xl mt-1">{k.val}</div>
                </div>
              ))}
            </div>
            <img src="https://images.unsplash.com/photo-1494859802809-d069c3b71a8a" alt="plate" className="mt-4 rounded-xl w-full h-40 object-cover"/>
          </CardContent>
        </Card>
      </div>
    </DashboardShell>
  );
}
