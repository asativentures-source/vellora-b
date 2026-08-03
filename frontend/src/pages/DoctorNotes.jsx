import { useCallback, useEffect, useState } from "react";
import DashboardShell from "@/components/DashboardShell";
import { api } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, FileText } from "lucide-react";
import { toast } from "sonner";

const links = [
  { to: "/doctor", label: "Overview", icon: "LayoutDashboard" },
  { to: "/doctor/notes", label: "Notes", icon: "MessageSquare" },
  { to: "/doctor/messages", label: "Messages", icon: "MessageSquare" },
];

export default function DoctorNotes() {
  const [patients, setPatients] = useState([]);
  const [notes, setNotes] = useState([]);
  const [reports, setReports] = useState([]);
  const [form, setForm] = useState({ patient_id: "", subjective: "", objective: "", assessment: "", plan: "", follow_up_at: "" });
  const [selectedPatient, setSelectedPatient] = useState("");

  const load = useCallback(async () => {
    const d = await api.get("/doctor/dashboard").then(x=>x.data);
    setPatients(d.patients || []);
    const n = await api.get("/doctor/notes").then(x=>x.data);
    setNotes(n);
    const params = selectedPatient && selectedPatient !== "__all__" ? { patient_id: selectedPatient } : {};
    const r = await api.get("/doctor/lab-reports", { params }).then(x=>x.data);
    setReports(r);
  }, [selectedPatient]);
  useEffect(() => { load(); }, [load]);

  const submit = async () => {
    if (!form.patient_id) { toast.error("Choose a patient"); return; }
    await api.post("/doctor/note", form);
    toast.success("Consultation note saved");
    setForm({ patient_id: "", subjective: "", objective: "", assessment: "", plan: "", follow_up_at: "" });
    load();
  };

  return (
    <DashboardShell title="Consultation notes" links={links}>
      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 rounded-2xl border-border/60 soft-shadow">
          <CardContent className="p-6">
            <div className="font-serif text-2xl">Write a SOAP note</div>
            <div className="grid gap-4 mt-4">
              <div>
                <Label>Patient</Label>
                <Select value={form.patient_id} onValueChange={(v)=>setForm({...form, patient_id: v})}>
                  <SelectTrigger data-testid="note-patient"><SelectValue placeholder="Select patient"/></SelectTrigger>
                  <SelectContent>{patients.map(p => <SelectItem key={p.user_id} value={p.user_id}>{p.name} · {p.email}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Subjective</Label><Textarea value={form.subjective} onChange={(e)=>setForm({...form, subjective: e.target.value})} placeholder="Patient reports…" data-testid="note-s"/></div>
              <div><Label>Objective</Label><Textarea value={form.objective} onChange={(e)=>setForm({...form, objective: e.target.value})} placeholder="Weight 82 kg, BP 122/78…" data-testid="note-o"/></div>
              <div><Label>Assessment</Label><Textarea value={form.assessment} onChange={(e)=>setForm({...form, assessment: e.target.value})} placeholder="Diagnosis, differentials…" data-testid="note-a"/></div>
              <div><Label>Plan</Label><Textarea value={form.plan} onChange={(e)=>setForm({...form, plan: e.target.value})} placeholder="Titration, labs, follow-up…" data-testid="note-p"/></div>
              <div><Label>Follow-up</Label><Input type="datetime-local" value={form.follow_up_at} onChange={(e)=>setForm({...form, follow_up_at: e.target.value})}/></div>
              <div className="flex justify-end"><Button onClick={submit} className="rounded-full bg-primary hover:bg-primary/90" data-testid="note-submit"><Plus size={16} className="mr-1"/> Save note</Button></div>
            </div>
          </CardContent>
        </Card>
        <div className="space-y-6">
          <Card className="rounded-2xl border-border/60 soft-shadow">
            <CardContent className="p-6">
              <div className="font-serif text-2xl">Recent notes</div>
              <div className="mt-4 space-y-4 max-h-96 overflow-y-auto">
                {notes.length === 0 && <div className="text-sm text-slate-500">No notes yet.</div>}
                {notes.map((n) => (
                  <div key={n.id} className="border-b border-border/60 pb-3">
                    <div className="flex items-center justify-between">
                      <div className="font-medium text-sm">{n.patient_name}</div>
                      <div className="text-xs text-slate-500">{new Date(n.created_at).toLocaleDateString()}</div>
                    </div>
                    {n.assessment && <div className="text-xs text-slate-700 mt-2"><span className="text-slate-500 uppercase tracking-widest text-[10px]">A:</span> {n.assessment}</div>}
                    {n.plan && <div className="text-xs text-slate-700 mt-1"><span className="text-slate-500 uppercase tracking-widest text-[10px]">P:</span> {n.plan}</div>}
                    {n.follow_up_at && <div className="text-xs text-primary mt-1">Follow-up: {new Date(n.follow_up_at).toLocaleString()}</div>}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-border/60 soft-shadow">
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-2"><FileText size={16} className="text-primary"/><div className="font-serif text-2xl">Patient labs</div></div>
              <Select value={selectedPatient} onValueChange={setSelectedPatient}>
                <SelectTrigger><SelectValue placeholder="All patients"/></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">All patients</SelectItem>
                  {patients.map(p => <SelectItem key={p.user_id} value={p.user_id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <div className="mt-4 space-y-3 max-h-72 overflow-y-auto">
                {reports.length === 0 && <div className="text-sm text-slate-500">No reports.</div>}
                {reports.map((r) => (
                  <div key={r.id} className="border-b border-border/60 pb-3">
                    <div className="text-sm font-medium">{r.title}</div>
                    <div className="text-xs text-slate-500 mt-1">{new Date(r.collected_at).toLocaleDateString()} · {Object.keys(r.values || {}).length} markers</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardShell>
  );
}
