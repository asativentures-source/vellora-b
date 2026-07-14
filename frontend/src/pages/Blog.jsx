import { useEffect, useState } from "react";
import { fetchBlog } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";

const categories = ["All","GLP-1 Education","Nutrition","Fitness","Lifestyle","Medical Research","Success Stories"];

export default function Blog() {
  const [posts, setPosts] = useState([]);
  const [cat, setCat] = useState("All");
  useEffect(() => { fetchBlog(cat === "All" ? undefined : cat).then(setPosts); }, [cat]);
  return (
    <main className="max-w-7xl mx-auto px-6 lg:px-8 pt-16 pb-24" data-testid="blog-page">
      <div className="max-w-3xl">
        <div className="text-xs uppercase tracking-widest text-slate-500">Learning Center</div>
        <h1 className="font-serif text-5xl md:text-6xl mt-3">Read. Rethink. Reshape.</h1>
      </div>
      <div className="flex flex-wrap gap-2 mt-8">
        {categories.map((c) => (
          <button key={c} onClick={()=>setCat(c)} className={`text-sm px-4 py-1.5 rounded-full border ${cat===c ? "bg-primary text-white border-primary" : "border-border/60 text-slate-700 hover:bg-accent"}`} data-testid={`blog-cat-${c}`}>
            {c}
          </button>
        ))}
      </div>
      <div className="grid md:grid-cols-3 gap-6 mt-10">
        {posts.map((p) => (
          <Link key={p.slug} to={`/blog/${p.slug}`} data-testid={`blog-post-${p.slug}`}>
            <Card className="rounded-2xl overflow-hidden border-border/60 soft-shadow soft-shadow-hover h-full">
              <img src={p.cover} className="w-full h-52 object-cover" alt={p.title}/>
              <CardContent className="p-6">
                <Badge className="rounded-full bg-accent text-primary hover:bg-accent">{p.category}</Badge>
                <div className="font-serif text-2xl mt-3">{p.title}</div>
                <p className="text-sm text-slate-600 mt-2">{p.excerpt}</p>
                <div className="text-xs text-slate-500 mt-4">{p.author} · {p.read_min} min read</div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </main>
  );
}
