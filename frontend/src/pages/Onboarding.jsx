import { useState } from "react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ArrowRight, ArrowLeft, CheckCircle2, Sparkles } from "lucide-react";
import { useNavigate, Link } from "react-router-dom";
import { toast } from "sonner";

const conditions = ["Obesity", "Type 2 Diabetes", "Prediabetes", "PCOS", "Metabolic syndrome", "Thyroid issues"];
const goals = ["Lose weight", "Reverse diabetes", "Manage PCOS", "Optimize longevity", "Improve energy"];

export default function Onboarding() {
  const nav = useNavigate();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState(null);
  const [form, setForm] = useState({
    goal: "",
    conditions: [],
    weight_kg: "",
    height_cm: "",
    age: "",
    sex: "",
    medications: "",
    lifestyle: "",
    email: "",
    name: "",
  });

  const total = 5;
  const pct = ((step + 1) / total) * 100;

  const next = () => setStep((s) => Math.min(total - 1, s + 1));
  const back = () => setStep((s) => Math.max(0, s - 1));

  const toggleCondition = (c) => {
    setForm((f) => ({
      ...f,
      conditions: f.conditions.includes(c) ? f.conditions.filter((x) => x !== c) : [...f.conditions, c],
    }));
  };

  const submit = async () => {
    setSaving(true);
    try {
      const payload = {
        ...form,
        weight_kg: form.weight_kg ? parseFloat(form.weight_kg) : null,
        height_cm: form.height_cm ? parseFloat(form.height_cm) : null,
        age: form.age ? parseInt(form.age) : null,
      };
      const { data } = await api.post("/onboarding", payload);
      setResult(data);
      setStep(total); // done state
    } catch {
      toast.error("Please try again.");
    }
    setSaving(false);
  };

  if (result) {
    return (
      <main className="max-w-3xl mx-auto px-6 lg:px-8 pt-16 pb-24" data-testid="onboarding-done">
        <div className="rounded-3xl bg-white border border-border/60 soft-shadow p-10 text-center">
          <div className="w-14 h-14 mx-auto rounded-full bg-accent flex items-center justify-center text-primary"><CheckCircle2 size={26}/></div>
          <h1 className="font-serif text-4xl mt-4">Your care plan is ready.</h1>
          <p className="text-slate-600 mt-2">Based on your inputs, we recommend the <span className="font-medium text-primary capitalize">{result.recommended_program.replace("-", " ")}</span> program.
          {result.bmi ? <> Your BMI is <span className="font-medium">{result.bmi}</span>.</> : null}
          </p>
          <div className="mt-8 flex flex-wrap gap-3 justify-center">
            <Link to={`/programs/${result.recommended_program}`}><Button className="rounded-full bg-primary hover:bg-primary/90" data-testid="onboarding-view-program">View program</Button></Link>
            <Link to="/pricing"><Button variant="outline" className="rounded-full">See plans</Button></Link>
            <Link to="/assessment"><Button variant="ghost" className="rounded-full">Talk to Aria</Button></Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="max-w-3xl mx-auto px-6 lg:px-8 pt-16 pb-24" data-testid="onboarding-page">
      <div className="text-xs uppercase tracking-widest text-slate-500">Onboarding</div>
      <h1 className="font-serif text-5xl mt-2">Let's tailor your plan.</h1>
      <p className="text-slate-600 mt-2">Five short steps. About two minutes.</p>

      <div className="mt-8">
        <Progress value={pct} className="h-2"/>
        <div className="text-xs text-slate-500 mt-2">Step {step + 1} of {total}</div>
      </div>

      <Card className="mt-8 rounded-3xl border-border/60 soft-shadow">
        <CardContent className="p-8">
          {step === 0 && (
            <div data-testid="onboarding-step-goal">
              <div className="font-serif text-3xl">What matters most right now?</div>
              <RadioGroup value={form.goal} onValueChange={(v)=>setForm({...form, goal: v})} className="mt-6 grid md:grid-cols-2 gap-3">
                {goals.map((g) => (
                  <label key={g} className={`flex items-center gap-3 p-4 rounded-2xl border cursor-pointer ${form.goal === g ? "border-primary bg-accent/60" : "border-border/60"}`}>
                    <RadioGroupItem value={g} id={`goal-${g}`}/>
                    <span className="text-sm text-slate-800">{g}</span>
                  </label>
                ))}
              </RadioGroup>
            </div>
          )}

          {step === 1 && (
            <div data-testid="onboarding-step-conditions">
              <div className="font-serif text-3xl">Any conditions we should know about?</div>
              <p className="text-sm text-slate-500 mt-1">Select all that apply.</p>
              <div className="mt-6 grid md:grid-cols-2 gap-3">
                {conditions.map((c) => (
                  <label key={c} className={`flex items-center gap-3 p-4 rounded-2xl border cursor-pointer ${form.conditions.includes(c) ? "border-primary bg-accent/60" : "border-border/60"}`}>
                    <Checkbox checked={form.conditions.includes(c)} onCheckedChange={()=>toggleCondition(c)} data-testid={`cond-${c.toLowerCase().replace(/\s+/g,"-")}`}/>
                    <span className="text-sm text-slate-800">{c}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="grid grid-cols-2 gap-4" data-testid="onboarding-step-vitals">
              <div className="col-span-2 font-serif text-3xl">Tell us your basics.</div>
              <div><Label>Weight (kg)</Label><Input value={form.weight_kg} onChange={(e)=>setForm({...form, weight_kg: e.target.value})} placeholder="82" data-testid="ob-weight"/></div>
              <div><Label>Height (cm)</Label><Input value={form.height_cm} onChange={(e)=>setForm({...form, height_cm: e.target.value})} placeholder="170" data-testid="ob-height"/></div>
              <div><Label>Age</Label><Input value={form.age} onChange={(e)=>setForm({...form, age: e.target.value})} placeholder="38"/></div>
              <div>
                <Label>Sex assigned at birth</Label>
                <RadioGroup value={form.sex} onValueChange={(v)=>setForm({...form, sex: v})} className="flex gap-4 mt-2">
                  <label className="flex items-center gap-2 text-sm"><RadioGroupItem value="female"/> Female</label>
                  <label className="flex items-center gap-2 text-sm"><RadioGroupItem value="male"/> Male</label>
                  <label className="flex items-center gap-2 text-sm"><RadioGroupItem value="prefer-not"/> Prefer not to say</label>
                </RadioGroup>
              </div>
            </div>
          )}

          {step === 3 && (
            <div data-testid="onboarding-step-lifestyle">
              <div className="font-serif text-3xl">Current medications and lifestyle</div>
              <div className="mt-6"><Label>Any medications you're taking?</Label><Textarea value={form.medications} onChange={(e)=>setForm({...form, medications: e.target.value})} placeholder="Metformin 500mg twice daily, Vitamin D…"/></div>
              <div className="mt-4"><Label>Typical week (sleep, movement, meals)?</Label><Textarea value={form.lifestyle} onChange={(e)=>setForm({...form, lifestyle: e.target.value})} placeholder="Desk job, 6h sleep, 5k steps, one large meal after work…"/></div>
            </div>
          )}

          {step === 4 && (
            <div data-testid="onboarding-step-contact">
              <div className="font-serif text-3xl">Where should we send your plan?</div>
              <div className="mt-6 grid gap-4">
                <div><Label>Name</Label><Input value={form.name} onChange={(e)=>setForm({...form, name: e.target.value})} placeholder="Your name" data-testid="ob-name"/></div>
                <div><Label>Email</Label><Input type="email" value={form.email} onChange={(e)=>setForm({...form, email: e.target.value})} placeholder="you@example.com" data-testid="ob-email"/></div>
              </div>
              <div className="mt-6 text-xs text-slate-500 flex items-start gap-2">
                <Sparkles size={14} className="text-primary shrink-0 mt-0.5"/>
                Your responses will be reviewed by a licensed clinician before any recommendation is made.
              </div>
            </div>
          )}

          <div className="mt-8 flex items-center justify-between">
            <Button variant="ghost" onClick={back} disabled={step === 0} className="rounded-full" data-testid="ob-back"><ArrowLeft size={16} className="mr-1"/> Back</Button>
            {step < total - 1 ? (
              <Button onClick={next} className="rounded-full bg-primary hover:bg-primary/90" data-testid="ob-next">Next <ArrowRight size={16} className="ml-1"/></Button>
            ) : (
              <Button onClick={submit} disabled={saving} className="rounded-full bg-primary hover:bg-primary/90" data-testid="ob-submit">{saving ? "Saving…" : "See my plan"} <ArrowRight size={16} className="ml-1"/></Button>
            )}
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
