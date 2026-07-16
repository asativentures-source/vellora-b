import { useEffect, useState } from "react";
import DashboardShell from "@/components/DashboardShell";
import { api } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LineChart as LineChartIcon, Upload, FlaskConical, Plus } from "lucide-react";
import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { toast } from "sonner";

const links = [
  { to: "/patient", label: "Overview", icon: "LayoutDashboard" },
  { to: "/patient/labs", label: "Labs", icon: "FlaskConical" },
  { to: "/patient/messages", label: "Messages", icon: "MessageSquare" },
];

export default function PatientLabs() {
  const [tests, setTests] = useState([]);
  const [orders, setOrders] = useState([]);
  const [reports, setReports] = useState([]);
  const [order, setOrder] = useState({ test_code: "", collection_type: "home", scheduled_at: "", address: "", notes: "" });
  const [openOrder, setOpenOrder] = useState(false);
  const [openReport, setOpenReport] = useState(false);
  const [rep, setRep] = useState({ title: "", test_code: "", values_text: "", notes: "", collected_at: "", file_name: "", file_data: "" });

  const load = async () => {
    const [t, o, r] = await Promise.all([
      api.get("/lab-tests").then(x=>x.data),
      api.get("/patient/lab-orders").then(x=>x.data),
      api.get("/patient/lab-reports").then(x=>x.data),
    ]);
    setTests(t); setOrders(o); setReports(r);
  };
  useEffect(() => { load(); }, []);

  const submitOrder = async () => {
    if (!order.test_code) return;
    await api.post("/patient/lab-order", order);
    toast.success("Test booked. We'll reach out to confirm.");
    setOpenOrder(false);
    setOrder({ test_code: "", collection_type: "home", scheduled_at: "", address: "", notes: "" });
    load();
  };

  const onFile = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 2_000_000) { toast.error("Max 2MB"); return; }
    const reader = new FileReader();
    reader.onload = () => setRep((r) => ({ ...r, file_name: f.name, file_data: String(reader.result) }));
    reader.readAsDataURL(f);
  };

  const submitReport = async () => {
    if (!rep.title) return;
    // parse "HbA1c: 6.1, LDL: 110"
    const values = {};
    (rep.values_text || "").split(",").forEach((chunk) => {
      const [k, v] = chunk.split(":").map((x) => x?.trim());
      if (k && v && !isNaN(parseFloat(v))) values[k] = parseFloat(v);
    });
    await api.post("/patient/lab-report", {
      title: rep.title,
      test_code: rep.test_code || null,
      values,
      units: {},
      file_name: rep.file_name || null,
      file_data: rep.file_data || null,
      notes: rep.notes || null,
      collected_at: rep.collected_at || new Date().toISOString(),
    });
    toast.success("Report uploaded");
    setOpenReport(false);
    setRep({ title: "", test_code: "", values_text: "", notes: "", collected_at: "", file_name: "", file_data: "" });
    load();
  };

  // Build trend series per marker
  const markerSeries = {};
  reports.forEach((r) => {
    Object.entries(r.values || {}).forEach(([k, v]) => {
      markerSeries[k] = markerSeries[k] || [];
      markerSeries[k].push({ date: new Date(r.collected_at).toLocaleDateString(undefined, { month: "short", day: "numeric" }), value: v });
    });
  });

  return (
    <DashboardShell title="Diagnostics" links={links}>
      <div className="grid md:grid-cols-3 gap-6">
        {[
          { label: "Tests booked", val: orders.length, icon: FlaskConical },
          { label: "Reports on file", val: reports.length, icon: Upload },
          { label: "Markers tracked", val: Object.keys(markerSeries).length, icon: LineChartIcon },
        ].map((k) => (
          <Card key={k.label} className="rounded-2xl border-border/60 soft-shadow">
            <CardContent className="p-6">
              <div className="w-10 h-10 rounded-full bg-accent flex items-center justify-center text-primary"><k.icon size={18}/></div>
              <div className="text-xs uppercase tracking-widest text-slate-500 mt-4">{k.label}</div>
              <div className="font-serif text-4xl mt-1">{k.val}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-6 flex gap-3 flex-wrap">
        <Dialog open={openOrder} onOpenChange={setOpenOrder}>
          <DialogTrigger asChild>
            <Button className="rounded-full bg-primary hover:bg-primary/90" data-testid="btn-book-test"><Plus size={16} className="mr-1"/> Book a lab test</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle className="font-serif text-2xl">Book a lab test</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>Test</Label>
                <Select value={order.test_code} onValueChange={(v)=>setOrder({...order, test_code: v})}>
                  <SelectTrigger data-testid="lo-test"><SelectValue placeholder="Choose a test"/></SelectTrigger>
                  <SelectContent>{tests.map(t => <SelectItem key={t.code} value={t.code}>{t.name} · ${t.price}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Collection</Label>
                <Select value={order.collection_type} onValueChange={(v)=>setOrder({...order, collection_type: v})}>
                  <SelectTrigger><SelectValue/></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="home">Home collection</SelectItem>
                    <SelectItem value="lab">Visit a partner lab</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Preferred date & time</Label><Input type="datetime-local" value={order.scheduled_at} onChange={(e)=>setOrder({...order, scheduled_at: e.target.value})}/></div>
              {order.collection_type === "home" && <div><Label>Address</Label><Input value={order.address} onChange={(e)=>setOrder({...order, address: e.target.value})} placeholder="Street, city"/></div>}
              <div><Label>Notes</Label><Input value={order.notes} onChange={(e)=>setOrder({...order, notes: e.target.value})}/></div>
            </div>
            <DialogFooter><Button onClick={submitOrder} className="rounded-full bg-primary" data-testid="lo-submit">Book</Button></DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={openReport} onOpenChange={setOpenReport}>
          <DialogTrigger asChild>
            <Button variant="outline" className="rounded-full" data-testid="btn-upload-report"><Upload size={16} className="mr-1"/> Upload a report</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle className="font-serif text-2xl">Upload a lab report</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Report title</Label><Input value={rep.title} onChange={(e)=>setRep({...rep, title: e.target.value})} placeholder="Quarterly labs — Feb 2026" data-testid="rep-title"/></div>
              <div>
                <Label>Related test</Label>
                <Select value={rep.test_code} onValueChange={(v)=>setRep({...rep, test_code: v})}>
                  <SelectTrigger><SelectValue placeholder="Optional"/></SelectTrigger>
                  <SelectContent>{tests.map(t => <SelectItem key={t.code} value={t.code}>{t.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Values (e.g. HbA1c: 6.1, LDL: 110)</Label>
                <Textarea value={rep.values_text} onChange={(e)=>setRep({...rep, values_text: e.target.value})} placeholder="HbA1c: 6.1, LDL: 110, HDL: 55" data-testid="rep-values"/>
              </div>
              <div><Label>Collected on</Label><Input type="date" value={rep.collected_at} onChange={(e)=>setRep({...rep, collected_at: e.target.value})}/></div>
              <div><Label>PDF / Image (max 2 MB)</Label><Input type="file" accept="application/pdf,image/*" onChange={onFile}/></div>
              <div><Label>Notes</Label><Input value={rep.notes} onChange={(e)=>setRep({...rep, notes: e.target.value})}/></div>
            </div>
            <DialogFooter><Button onClick={submitReport} className="rounded-full bg-primary" data-testid="rep-submit">Save report</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Trends */}
      <div className="grid lg:grid-cols-2 gap-6 mt-6">
        {Object.entries(markerSeries).length === 0 && (
          <Card className="lg:col-span-2 rounded-2xl border-border/60 soft-shadow"><CardContent className="p-8 text-center text-slate-500 text-sm">
            Upload a report with values (e.g. <span className="font-mono">HbA1c: 6.1</span>) to unlock trend charts.
          </CardContent></Card>
        )}
        {Object.entries(markerSeries).map(([marker, series]) => (
          <Card key={marker} className="rounded-2xl border-border/60 soft-shadow">
            <CardContent className="p-6">
              <div className="text-xs uppercase tracking-widest text-slate-500">Marker</div>
              <div className="font-serif text-2xl">{marker}</div>
              <div className="h-52 mt-4">
                <ResponsiveContainer>
                  <LineChart data={series}>
                    <CartesianGrid stroke="#E2E8F0" strokeDasharray="3 3" opacity={0.4}/>
                    <XAxis dataKey="date" stroke="#94A3B8" fontSize={12}/>
                    <YAxis stroke="#94A3B8" fontSize={12}/>
                    <Tooltip contentStyle={{ border: "1px solid #E2E8F0", borderRadius: 12 }}/>
                    <Line type="monotone" dataKey="value" stroke="#3B6B56" strokeWidth={2.5} dot={{ fill: "#3B6B56", r: 4 }}/>
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Orders + Reports lists */}
      <div className="grid lg:grid-cols-2 gap-6 mt-6">
        <Card className="rounded-2xl border-border/60 soft-shadow">
          <CardContent className="p-6">
            <div className="font-serif text-2xl">Scheduled tests</div>
            <div className="mt-4 space-y-3">
              {orders.length === 0 && <div className="text-sm text-slate-500">Nothing booked yet.</div>}
              {orders.map((o) => (
                <div key={o.id} className="border-b border-border/60 pb-3">
                  <div className="flex items-center justify-between">
                    <div className="font-medium">{o.test_name}</div>
                    <Badge className="rounded-full bg-accent text-primary hover:bg-accent">{o.status}</Badge>
                  </div>
                  <div className="text-xs text-slate-500 mt-1">{o.collection_type === "home" ? "Home collection" : "Partner lab"} · {o.scheduled_at ? new Date(o.scheduled_at).toLocaleString() : "Time TBD"}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-2xl border-border/60 soft-shadow">
          <CardContent className="p-6">
            <div className="font-serif text-2xl">Report history</div>
            <div className="mt-4 space-y-3">
              {reports.length === 0 && <div className="text-sm text-slate-500">No reports uploaded yet.</div>}
              {reports.map((r) => (
                <div key={r.id} className="border-b border-border/60 pb-3">
                  <div className="flex items-center justify-between">
                    <div className="font-medium">{r.title}</div>
                    {r.reviewed ? <Badge className="rounded-full bg-emerald-100 text-emerald-700 hover:bg-emerald-100">Reviewed</Badge> : <Badge className="rounded-full bg-amber-100 text-amber-700 hover:bg-amber-100">Pending</Badge>}
                  </div>
                  <div className="text-xs text-slate-500 mt-1">{new Date(r.collected_at).toLocaleDateString()} · {Object.keys(r.values || {}).length} markers{r.file_name ? ` · ${r.file_name}` : ""}</div>
                  {r.doctor_comment && <div className="text-xs text-primary mt-2 italic">Doctor: {r.doctor_comment}</div>}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardShell>
  );
}
