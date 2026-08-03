import { useEffect, useState } from "react";
import { fetchPlans } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle } from "lucide-react";

const rows = [
  ["Doctor consultations", "1/mo", "3/qtr", "12/yr"],
  ["Nutrition coaching", true, true, true],
  ["Medication support", true, true, true],
  ["Progress tracking", true, true, true],
  ["Lab integration", false, true, true],
  ["Priority support", false, false, true],
];

export default function Pricing() {
  const [plans, setPlans] = useState([]);
  useEffect(() => { fetchPlans().then((plans) => setPlans(Array.isArray(plans) ? plans : [])).catch(() => {}); }, []);
  const planList = Array.isArray(plans) ? plans : [];
  return (
    <main className="max-w-7xl mx-auto px-6 lg:px-8 pt-16 pb-24" data-testid="pricing-page">
      <div className="max-w-3xl">
        <div className="text-xs uppercase tracking-widest text-slate-500">Pricing</div>
        <h1 className="font-serif text-5xl md:text-6xl mt-3">One transparent price. No surprises.</h1>
        <p className="mt-3 text-slate-600 text-lg">Cancel anytime. Medication billed separately at pass-through cost.</p>
      </div>

      <div className="grid md:grid-cols-3 gap-6 mt-12">
        {planList.map((p) => (
          <Card key={p.code} className={`rounded-3xl soft-shadow ${p.highlight ? "border-primary border-2" : "border-border/60"}`} data-testid={`plan-${p.code}`}>
            <CardContent className="p-8">
              <div className="flex items-center justify-between">
                <div className="font-serif text-3xl">{p.name}</div>
                {p.badge && <Badge className="rounded-full bg-primary text-white hover:bg-primary">{p.badge}</Badge>}
              </div>
              <div className="mt-6 flex items-baseline gap-1">
                <span className="text-5xl font-serif">${p.price}</span>
                <span className="text-slate-500 text-sm">/mo</span>
              </div>
              <div className="text-xs text-slate-500 mt-1">{p.period}</div>
              <Button className={`w-full mt-6 rounded-full ${p.highlight ? "bg-primary" : "bg-slate-900"} hover:opacity-90`}>Get {p.name}</Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-16 rounded-3xl bg-white border border-border/60 soft-shadow overflow-hidden">
        <div className="grid grid-cols-4 text-sm">
          <div className="p-5 bg-accent/50 font-medium text-primary">Compare features</div>
          {planList.map((p) => <div key={p.code} className="p-5 bg-accent/50 font-medium text-primary text-center">{p.name}</div>)}
          {rows.map((r, i) => (
            <div key={i} className="contents">
              <div className="p-5 border-t border-border/60 text-slate-700">{r[0]}</div>
              {r.slice(1).map((v, j) => (
                <div key={j} className="p-5 border-t border-border/60 text-center">
                  {typeof v === "boolean" ? (v ? <CheckCircle2 className="mx-auto text-primary" size={18}/> : <XCircle className="mx-auto text-slate-300" size={18}/>) : <span className="text-slate-800">{v}</span>}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
