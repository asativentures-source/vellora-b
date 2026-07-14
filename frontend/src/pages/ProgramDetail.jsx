import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { fetchPrograms } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { CheckCircle2, ArrowRight } from "lucide-react";

export default function ProgramDetail() {
  const { slug } = useParams();
  const [p, setP] = useState(null);
  useEffect(() => { fetchPrograms().then((all) => setP(all.find((x) => x.slug === slug))); }, [slug]);
  if (!p) return <main className="max-w-7xl mx-auto px-6 py-24 text-slate-500">Loading…</main>;
  return (
    <main className="max-w-7xl mx-auto px-6 lg:px-8 pt-12 pb-24" data-testid={`program-detail-${slug}`}>
      <div className="rounded-3xl overflow-hidden relative">
        <img src={p.hero_image} className="w-full h-[360px] object-cover" alt={p.title}/>
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/70 to-transparent" />
        <div className="absolute bottom-8 left-8 text-white max-w-2xl">
          <div className="text-xs uppercase tracking-widest text-white/70">Program</div>
          <h1 className="font-serif text-5xl mt-2">{p.title}</h1>
          <p className="mt-3 text-white/85">{p.tagline}</p>
        </div>
      </div>
      <div className="grid md:grid-cols-3 gap-10 mt-14">
        <div>
          <div className="text-xs uppercase tracking-widest text-slate-500">Eligibility</div>
          <ul className="mt-4 space-y-2 text-slate-700">
            {p.eligibility.map((e) => <li key={e} className="flex gap-2"><CheckCircle2 size={16} className="text-primary mt-1"/> {e}</li>)}
          </ul>
        </div>
        <div>
          <div className="text-xs uppercase tracking-widest text-slate-500">Expected outcomes</div>
          <ul className="mt-4 space-y-2 text-slate-700">
            {p.outcomes.map((e) => <li key={e} className="flex gap-2"><CheckCircle2 size={16} className="text-primary mt-1"/> {e}</li>)}
          </ul>
        </div>
        <div>
          <div className="text-xs uppercase tracking-widest text-slate-500">Timeline</div>
          <p className="mt-4 text-slate-700">{p.timeline}</p>
          <div className="mt-6 text-xs uppercase tracking-widest text-slate-500">Starting price</div>
          <div className="font-serif text-4xl mt-2">${p.starting_price}<span className="text-base text-slate-500">/mo</span></div>
          <Link to="/pricing"><Button className="mt-4 rounded-full bg-primary hover:bg-primary/90">See plans <ArrowRight size={16} className="ml-1"/></Button></Link>
        </div>
      </div>
      <div className="mt-16">
        <div className="text-xs uppercase tracking-widest text-slate-500">Treatment journey</div>
        <div className="mt-6 grid md:grid-cols-5 gap-3">
          {p.steps.map((s, i) => (
            <div key={s} className="rounded-2xl bg-white border border-border/60 p-5 soft-shadow">
              <div className="text-xs uppercase tracking-widest text-slate-500">Step {i+1}</div>
              <div className="font-serif text-xl mt-1">{s}</div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
