import { useEffect, useState } from "react";
import { fetchDoctors } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Star, Search, Calendar } from "lucide-react";
import { Link } from "react-router-dom";

export default function Doctors() {
  const [docs, setDocs] = useState([]);
  const [q, setQ] = useState("");
  useEffect(() => { fetchDoctors().then(setDocs); }, []);
  const filtered = docs.filter((d) =>
    !q || d.name.toLowerCase().includes(q.toLowerCase()) || d.specialty.toLowerCase().includes(q.toLowerCase())
  );
  return (
    <main className="max-w-7xl mx-auto px-6 lg:px-8 pt-16 pb-24" data-testid="doctors-page">
      <div className="max-w-3xl">
        <div className="text-xs uppercase tracking-widest text-slate-500">Directory</div>
        <h1 className="font-serif text-5xl md:text-6xl mt-3">Meet our clinicians.</h1>
        <p className="mt-3 text-slate-600 text-lg">Board-certified physicians across endocrinology, obesity medicine, and PCOS.</p>
      </div>
      <div className="mt-8 relative max-w-md">
        <Search className="absolute left-3 top-2.5 text-slate-400" size={18}/>
        <Input placeholder="Search by name or specialty" value={q} onChange={(e)=>setQ(e.target.value)} className="pl-10 rounded-full" data-testid="doctor-search"/>
      </div>
      <div className="grid md:grid-cols-3 gap-6 mt-10">
        {filtered.map((d) => (
          <Card key={d.doctor_id} className="rounded-2xl overflow-hidden border-border/60 soft-shadow soft-shadow-hover" data-testid={`doctor-card-${d.doctor_id}`}>
            <img src={d.picture} alt={d.name} className="w-full h-64 object-cover"/>
            <CardContent className="p-6">
              <div className="text-xs uppercase tracking-widest text-slate-500">{d.specialty}</div>
              <div className="font-serif text-2xl mt-1">{d.name}</div>
              <p className="text-sm text-slate-600 mt-2 line-clamp-2">{d.bio}</p>
              <div className="mt-3 flex items-center gap-3 text-sm">
                <span className="flex items-center gap-1"><Star size={14} className="fill-current text-amber-500"/> {d.rating}</span>
                <span className="text-slate-500">{d.experience_years} yrs</span>
                <span className="text-slate-500">{d.languages.join(", ")}</span>
              </div>
              <div className="mt-3 text-xs text-slate-500">Next: {d.available_slots?.[0]}</div>
              <Link to="/assessment"><Button className="mt-4 w-full rounded-full bg-primary hover:bg-primary/90"><Calendar size={14} className="mr-1"/> Book consultation</Button></Link>
            </CardContent>
          </Card>
        ))}
      </div>
    </main>
  );
}
