import { useEffect, useState } from "react";
import { fetchPrograms } from "@/lib/api";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

export default function Programs() {
  const [items, setItems] = useState([]);
  useEffect(() => { fetchPrograms().then((items) => setItems(Array.isArray(items) ? items : [])).catch(() => {}); }, []);
  const programItems = Array.isArray(items) ? items : [];
  return (
    <main className="max-w-7xl mx-auto px-6 lg:px-8 pt-16 pb-24" data-testid="programs-page">
      <div className="max-w-3xl">
        <div className="text-xs uppercase tracking-widest text-slate-500">Programs</div>
        <h1 className="font-serif text-5xl md:text-6xl mt-3">Care built around your condition.</h1>
        <p className="mt-4 text-slate-600 text-lg">Four physician-led pathways. Same clinical rigor, different focus.</p>
      </div>
      <div className="grid md:grid-cols-2 gap-6 mt-12">
        {programItems.map((p) => (
          <Card key={p.slug} className="overflow-hidden rounded-3xl border-border/60 soft-shadow soft-shadow-hover" data-testid={`program-${p.slug}`}>
            <div className="grid md:grid-cols-5">
              <div className="md:col-span-2">
                <img src={p.hero_image} className="w-full h-full object-cover min-h-56" alt={p.title}/>
              </div>
              <CardContent className="md:col-span-3 p-6">
                <div className="text-xs uppercase tracking-widest text-primary">{p.slug}</div>
                <div className="font-serif text-3xl mt-2">{p.title}</div>
                <p className="text-slate-600 mt-2">{p.tagline}</p>
                <div className="text-sm text-slate-700 mt-4">Starting at <span className="font-medium">${p.starting_price}/mo</span> · {p.timeline}</div>
                <Link to={`/programs/${p.slug}`}><Button className="mt-4 rounded-full bg-primary hover:bg-primary/90">Explore <ArrowRight size={16} className="ml-1"/></Button></Link>
              </CardContent>
            </div>
          </Card>
        ))}
      </div>
    </main>
  );
}
