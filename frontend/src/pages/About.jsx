import { Card, CardContent } from "@/components/ui/card";
import { HeartPulse, ShieldCheck, Compass, Users } from "lucide-react";

const values = [
  { icon: HeartPulse, title: "Clinical rigor", desc: "Every decision anchored in current evidence and specialist review." },
  { icon: ShieldCheck, title: "Radical safety", desc: "No shortcuts. No unlicensed sourcing. Cold-chain from pharmacy to door." },
  { icon: Compass, title: "Long-horizon", desc: "We optimize for the 24-month outcome, not the 4-week weigh-in." },
  { icon: Users, title: "Whole-human care", desc: "Nutrition, sleep, movement, and mental load — treated together." },
];

const leaders = [
  { name: "Dr. Aisha Rahman", role: "Chief Medical Officer", picture: "https://images.pexels.com/photos/6749765/pexels-photo-6749765.jpeg" },
  { name: "Ravi Iyer", role: "Founder & CEO", picture: "https://images.unsplash.com/photo-1607746882042-944635dfe10e" },
  { name: "Dr. Elena Rossi", role: "Head of Nutrition", picture: "https://images.unsplash.com/photo-1559839734-2b71ea197ec2" },
  { name: "Dr. Samuel Okafor", role: "Advisor, Diabetes", picture: "https://images.unsplash.com/photo-1537368910025-700350fe46c7" },
];

export default function About() {
  return (
    <main className="max-w-7xl mx-auto px-6 lg:px-8 pt-16 pb-24" data-testid="about-page">
      <div className="max-w-3xl">
        <div className="text-xs uppercase tracking-widest text-slate-500">About Verdia</div>
        <h1 className="font-serif text-5xl md:text-6xl mt-3">A medical home for metabolic health.</h1>
        <p className="mt-6 text-lg text-slate-600 leading-relaxed">
          We built Verdia because millions of people navigating obesity, diabetes, and PCOS still feel unseen by traditional care.
          Our mission is simple: bring together the best clinicians and the calmest technology, so your transformation feels supported — not performative.
        </p>
      </div>

      <div className="mt-14 grid md:grid-cols-2 gap-6">
        <div className="rounded-3xl overflow-hidden">
          <img src="https://images.unsplash.com/photo-1631217868264-e5b90bb7e133" className="w-full h-full object-cover" alt="team" />
        </div>
        <div className="rounded-3xl sage-block p-10">
          <div className="text-xs uppercase tracking-widest text-primary">Vision</div>
          <div className="font-serif text-3xl mt-2">Metabolic health as a birthright.</div>
          <p className="mt-4 text-slate-700 leading-relaxed">
            We envision a world where GLP-1 therapy, nutrition medicine, and behavioral coaching are the standard of care — accessible from a phone, delivered by real physicians, integrated with your labs and daily life.
          </p>
        </div>
      </div>

      <div className="mt-20">
        <div className="text-xs uppercase tracking-widest text-slate-500">Standards</div>
        <h2 className="font-serif text-4xl mt-2">How we practice</h2>
        <div className="grid md:grid-cols-4 gap-6 mt-8">
          {values.map((v) => (
            <Card key={v.title} className="rounded-2xl border-border/60 soft-shadow">
              <CardContent className="p-6">
                <div className="w-10 h-10 rounded-full bg-accent flex items-center justify-center text-primary"><v.icon size={18}/></div>
                <div className="font-serif text-2xl mt-4">{v.title}</div>
                <p className="text-sm text-slate-600 mt-1">{v.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <div className="mt-20">
        <div className="text-xs uppercase tracking-widest text-slate-500">Leadership & advisory</div>
        <h2 className="font-serif text-4xl mt-2">The team behind the plan</h2>
        <div className="grid md:grid-cols-4 gap-6 mt-8">
          {leaders.map((l) => (
            <Card key={l.name} className="rounded-2xl overflow-hidden border-border/60 soft-shadow">
              <img src={l.picture} alt={l.name} className="w-full h-56 object-cover"/>
              <CardContent className="p-5">
                <div className="font-serif text-xl">{l.name}</div>
                <div className="text-xs uppercase tracking-widest text-slate-500 mt-1">{l.role}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </main>
  );
}
