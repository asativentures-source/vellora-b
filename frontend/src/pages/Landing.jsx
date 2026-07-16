import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Sparkles, Stethoscope, Pill, Activity, LineChart, Users, Star, ShieldCheck, HeartPulse, Salad, CheckCircle2 } from "lucide-react";
import { useEffect, useState } from "react";
import { fetchStats, fetchDoctors, fetchTestimonials, fetchFaqs, fetchPlans } from "@/lib/api";

function Stat({ value, suffix = "", label }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!value) return;
    let start = 0;
    const dur = 1400;
    const t0 = performance.now();
    const step = (t) => {
      const p = Math.min(1, (t - t0) / dur);
      setN(Math.floor(value * (0.2 + 0.8 * (1 - Math.pow(1 - p, 3)))));
      if (p < 1) requestAnimationFrame(step);
      else setN(value);
    };
    requestAnimationFrame(step);
  }, [value]);
  return (
    <div className="text-center md:text-left">
      <div className="font-serif text-4xl md:text-5xl text-slate-900 tabular-nums">{n.toLocaleString()}{suffix}</div>
      <div className="text-xs uppercase tracking-widest text-slate-500 mt-2">{label}</div>
    </div>
  );
}

const steps = [
  { icon: Sparkles, title: "Health Assessment", desc: "5-minute personalized intake with our AI, reviewed by a clinician." },
  { icon: Stethoscope, title: "Doctor Consultation", desc: "Video visit with a board-certified physician who knows GLP-1." },
  { icon: Pill, title: "Prescription", desc: "If clinically appropriate, a tailored GLP-1 plan is prescribed." },
  { icon: HeartPulse, title: "Medication Delivery", desc: "Cold-chain shipped to your door with refill reminders." },
  { icon: LineChart, title: "Progress Tracking", desc: "Weight, BMI, waist, labs, and coaching in one calm dashboard." },
];

const benefits = [
  { icon: Activity, title: "Appetite regulation", desc: "GLP-1 helps you feel full sooner and stay satisfied longer." },
  { icon: LineChart, title: "Metabolic reset", desc: "Improves insulin sensitivity, HbA1c, and lipid markers." },
  { icon: HeartPulse, title: "Cardiovascular protection", desc: "Emerging evidence for reduced cardiovascular events." },
  { icon: Salad, title: "Habit anchor", desc: "Creates the calm window to rebuild nutrition and movement." },
];

export default function Landing() {
  const [stats, setStats] = useState({});
  const [doctors, setDoctors] = useState([]);
  const [testimonials, setTestimonials] = useState([]);
  const [faqs, setFaqs] = useState([]);
  const [plans, setPlans] = useState([]);

  useEffect(() => {
    fetchStats().then(setStats).catch(() => {});
    fetchDoctors().then((d) => setDoctors(d.slice(0, 3))).catch(() => {});
    fetchTestimonials().then(setTestimonials).catch(() => {});
    fetchFaqs().then(setFaqs).catch(() => {});
    fetchPlans().then(setPlans).catch(() => {});
  }, []);

  return (
    <main data-testid="landing-page">
      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 grid-bg opacity-70" />
        <div className="max-w-7xl mx-auto px-6 lg:px-8 pt-20 pb-24 relative grid lg:grid-cols-12 gap-10 items-center">
          <div className="lg:col-span-7">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent text-primary text-xs font-medium">
              <ShieldCheck size={14} /> Board-certified physicians · Evidence-based
            </div>
            <h1 className="mt-6 font-serif text-5xl md:text-7xl leading-[1.05] tracking-tighter text-slate-900" data-testid="hero-headline">
              A calmer way to lose weight, backed by medicine.
            </h1>
            <p className="mt-6 text-slate-600 text-lg max-w-xl leading-relaxed">
              Verdia is a clinician-led GLP-1 program for obesity, Type 2 diabetes, PCOS, and metabolic health. Personalized plans, real doctors, sustainable outcomes.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/assessment">
                <Button size="lg" className="rounded-full bg-primary hover:bg-primary/90 h-12 px-7" data-testid="hero-cta-assessment">
                  Start free assessment <ArrowRight size={18} className="ml-1" />
                </Button>
              </Link>
              <Link to="/pricing">
                <Button size="lg" variant="outline" className="rounded-full h-12 px-7" data-testid="hero-cta-pricing">
                  See plans
                </Button>
              </Link>
            </div>
            <div className="mt-10 flex items-center gap-6">
              <div className="flex -space-x-3">
                {doctors.slice(0,4).map((d) => (
                  <Avatar key={d.doctor_id} className="border-2 border-white h-10 w-10">
                    <AvatarImage src={d.picture} />
                    <AvatarFallback>{d.name?.[0]}</AvatarFallback>
                  </Avatar>
                ))}
              </div>
              <div className="text-sm text-slate-600">
                <div className="flex items-center gap-1 text-slate-800 font-medium"><Star size={14} className="fill-current text-amber-500" /> 4.9 average patient rating</div>
                <div className="text-xs text-slate-500">Across 42,000+ visits worldwide</div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-5 relative">
            <div className="relative rounded-[2rem] overflow-hidden soft-shadow">
              <img
                src="https://images.pexels.com/photos/8173483/pexels-photo-8173483.jpeg"
                alt="Woman by window"
                className="w-full h-[520px] object-cover"
              />
              <div className="absolute top-4 left-4 bg-white/85 backdrop-blur-md rounded-2xl p-3 flex items-center gap-3 soft-shadow">
                <div className="w-10 h-10 rounded-full bg-accent flex items-center justify-center text-primary"><HeartPulse size={18}/></div>
                <div>
                  <div className="text-xs text-slate-500 uppercase tracking-widest">Weekly progress</div>
                  <div className="font-medium">-1.2 kg · Steady</div>
                </div>
              </div>
              <div className="absolute bottom-4 right-4 bg-white/85 backdrop-blur-md rounded-2xl p-4 soft-shadow max-w-[220px]">
                <div className="text-xs text-slate-500 uppercase tracking-widest">Today</div>
                <div className="text-sm text-slate-800 mt-1">Semaglutide dose confirmed. Water goal 78%.</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* STATS */}
      <section className="bg-white border-y border-border/60">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 py-14 grid grid-cols-2 md:grid-cols-4 gap-10">
          <Stat value={stats.patients_served || 0} label="Patients served" />
          <Stat value={stats.kg_lost || 0} suffix=" kg" label="Weight lost together" />
          <Stat value={stats.doctors_onboarded || 0} label="Clinicians" />
          <Stat value={stats.success_rate || 0} suffix="%" label="Achieve targets" />
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex items-end justify-between flex-wrap gap-4">
            <div>
              <div className="text-xs uppercase tracking-widest text-slate-500">How it works</div>
              <h2 className="font-serif text-4xl md:text-5xl mt-2 max-w-2xl">From assessment to lasting results — in five thoughtful steps.</h2>
            </div>
          </div>
          <div className="mt-12 grid md:grid-cols-5 gap-4">
            {steps.map((s, i) => (
              <Card key={i} className="rounded-2xl border-border/60 soft-shadow soft-shadow-hover">
                <CardContent className="p-6">
                  <div className="w-11 h-11 rounded-full bg-accent flex items-center justify-center text-primary"><s.icon size={20}/></div>
                  <div className="text-xs uppercase tracking-widest text-slate-500 mt-4">Step {i+1}</div>
                  <div className="font-serif text-2xl mt-1">{s.title}</div>
                  <p className="text-sm text-slate-600 mt-2 leading-relaxed">{s.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* BENEFITS + WHY US bento */}
      <section className="py-8">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 sage-block rounded-3xl p-10">
            <div className="text-xs uppercase tracking-widest text-primary">Why GLP-1</div>
            <h3 className="font-serif text-4xl mt-2">Not a shortcut. A physiologic shift.</h3>
            <div className="grid md:grid-cols-2 gap-4 mt-8">
              {benefits.map((b, i) => (
                <div key={i} className="bg-white rounded-2xl p-5 soft-shadow">
                  <div className="w-9 h-9 rounded-full bg-accent flex items-center justify-center text-primary"><b.icon size={16}/></div>
                  <div className="font-medium mt-3">{b.title}</div>
                  <div className="text-sm text-slate-600 mt-1">{b.desc}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-3xl bg-slate-900 text-white p-10 flex flex-col">
            <div className="text-xs uppercase tracking-widest text-white/60">Why Verdia</div>
            <h3 className="font-serif text-4xl mt-2">Real doctors. Real oversight.</h3>
            <ul className="mt-6 space-y-3 text-sm text-white/80">
              {["Board-certified endocrinologists, obesity medicine, PCOS specialists","Zero-guesswork protocols anchored in the latest evidence","Nutrition, movement and behavioral coaching included","Refill logistics with cold-chain handling"].map((t)=>(
                <li key={t} className="flex gap-2"><CheckCircle2 size={18} className="mt-0.5 text-emerald-300"/> {t}</li>
              ))}
            </ul>
            <Link to="/about" className="mt-auto inline-flex items-center gap-2 text-emerald-300 pt-8">
              Meet the clinical team <ArrowRight size={16}/>
            </Link>
          </div>
        </div>
      </section>

      {/* DOCTORS */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex items-end justify-between flex-wrap gap-4">
            <div>
              <div className="text-xs uppercase tracking-widest text-slate-500">Clinical leadership</div>
              <h2 className="font-serif text-4xl md:text-5xl mt-2">Featured physicians</h2>
            </div>
            <Link to="/doctors" className="text-primary text-sm inline-flex items-center gap-1">Browse all <ArrowRight size={14}/></Link>
          </div>
          <div className="mt-10 grid md:grid-cols-3 gap-6">
            {doctors.map((d) => (
              <Card key={d.doctor_id} className="rounded-2xl overflow-hidden border-border/60 soft-shadow soft-shadow-hover" data-testid={`landing-doctor-${d.doctor_id}`}>
                <img src={d.picture} alt={d.name} className="w-full h-64 object-cover" />
                <CardContent className="p-6">
                  <div className="text-xs uppercase tracking-widest text-slate-500">{d.specialty}</div>
                  <div className="font-serif text-2xl mt-1">{d.name}</div>
                  <div className="text-sm text-slate-600 mt-2">{d.experience_years} yrs · {d.languages.join(", ")}</div>
                  <div className="mt-3 flex items-center gap-2 text-sm">
                    <Star size={14} className="fill-current text-amber-500"/>
                    <span className="font-medium">{d.rating}</span>
                    <span className="text-slate-500">· {d.consultations.toLocaleString()} consultations</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="py-16 bg-white border-y border-border/60">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="text-xs uppercase tracking-widest text-slate-500">Patient stories</div>
          <h2 className="font-serif text-4xl md:text-5xl mt-2 max-w-3xl">Progress, in their own words.</h2>
          <div className="mt-10 grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {testimonials.map((t)=>(
              <Card key={t.id} className="rounded-2xl border-border/60 soft-shadow">
                <CardContent className="p-6">
                  <Badge className="rounded-full bg-accent text-primary hover:bg-accent">{t.program}</Badge>
                  <p className="mt-4 text-slate-700 leading-relaxed">“{t.quote}”</p>
                  <div className="mt-5 flex items-center gap-3">
                    <Avatar className="h-10 w-10"><AvatarImage src={t.picture}/><AvatarFallback>{t.name[0]}</AvatarFallback></Avatar>
                    <div>
                      <div className="font-medium">{t.name}, {t.age}</div>
                      <div className="text-xs text-primary">{t.outcome}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* PRICING preview */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="text-xs uppercase tracking-widest text-slate-500">Plans</div>
          <h2 className="font-serif text-4xl md:text-5xl mt-2">Transparent pricing. No surprises.</h2>
          <div className="mt-10 grid md:grid-cols-3 gap-6">
            {plans.map((p)=>(
              <Card key={p.code} className={`rounded-3xl soft-shadow ${p.highlight ? "border-primary border-2" : "border-border/60"}`}>
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
                  <ul className="mt-6 space-y-2 text-sm">
                    <li className="flex gap-2"><CheckCircle2 size={16} className="text-primary"/> {p.features.doctor_consults} doctor consultations / period</li>
                    <li className="flex gap-2"><CheckCircle2 size={16} className="text-primary"/> Nutrition coaching</li>
                    <li className="flex gap-2"><CheckCircle2 size={16} className="text-primary"/> Medication support</li>
                    {p.features.lab_integration && <li className="flex gap-2"><CheckCircle2 size={16} className="text-primary"/> Lab integration</li>}
                    {p.features.priority_support && <li className="flex gap-2"><CheckCircle2 size={16} className="text-primary"/> Priority support</li>}
                  </ul>
                  <Link to="/pricing"><Button className={`w-full mt-6 rounded-full ${p.highlight ? "bg-primary" : "bg-slate-900"} hover:opacity-90`}>Choose {p.name}</Button></Link>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16 sage-block">
        <div className="max-w-4xl mx-auto px-6 lg:px-8">
          <div className="text-xs uppercase tracking-widest text-primary">Questions</div>
          <h2 className="font-serif text-4xl md:text-5xl mt-2">Frequently asked</h2>
          <Accordion type="single" collapsible className="mt-8">
            {faqs.map((f, i) => (
              <AccordionItem key={i} value={`f-${i}`} className="border-b border-border/60">
                <AccordionTrigger className="text-left font-medium text-slate-800" data-testid={`faq-trigger-${i}`}>{f.q}</AccordionTrigger>
                <AccordionContent className="text-slate-600">{f.a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24">
        <div className="max-w-6xl mx-auto px-6 lg:px-8 rounded-[2rem] bg-slate-900 text-white p-12 md:p-16 relative overflow-hidden">
          <div className="max-w-2xl">
            <h2 className="font-serif text-4xl md:text-5xl">Your best chapter starts with a five-minute conversation.</h2>
            <p className="mt-4 text-white/70">Speak with a Verdia clinician about GLP-1, PCOS, diabetes, or metabolic health.</p>
            <Link to="/onboarding">
              <Button className="mt-8 rounded-full bg-emerald-400 hover:bg-emerald-300 text-slate-900 h-12 px-7" data-testid="cta-start-assessment">
                Start free assessment <ArrowRight size={18} className="ml-1"/>
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
