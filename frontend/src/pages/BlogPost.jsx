import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { api } from "@/lib/api";
import { ArrowLeft } from "lucide-react";

export default function BlogPost() {
  const { slug } = useParams();
  const [post, setPost] = useState(null);
  useEffect(() => { api.get(`/blog/${slug}`).then(r => setPost(r.data)).catch(() => {}); }, [slug]);
  if (!post) return <main className="max-w-4xl mx-auto px-6 py-20 text-slate-500">Loading…</main>;
  return (
    <main className="max-w-4xl mx-auto px-6 lg:px-8 pt-12 pb-24" data-testid="blog-post-page">
      <Link to="/blog" className="text-sm text-primary inline-flex items-center gap-1"><ArrowLeft size={14}/> All articles</Link>
      <div className="text-xs uppercase tracking-widest text-slate-500 mt-6">{post.category}</div>
      <h1 className="font-serif text-5xl mt-2">{post.title}</h1>
      <div className="text-sm text-slate-500 mt-3">{post.author} · {post.read_min} min read</div>
      <img src={post.cover} className="w-full rounded-3xl mt-10 h-96 object-cover" alt={post.title}/>
      <p className="mt-8 text-lg text-slate-700 leading-relaxed">{post.excerpt}</p>
      <p className="mt-6 text-slate-700 leading-relaxed">{post.content}</p>
    </main>
  );
}
