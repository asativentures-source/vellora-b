import { Link } from "react-router-dom";
import { Activity, ShieldCheck, Lock } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { subscribeNewsletter } from "@/lib/api";
import { toast } from "sonner";

export default function Footer() {
  const [email, setEmail] = useState("");
  const submit = async (e) => {
    e.preventDefault();
    if (!email) return;
    try {
      await subscribeNewsletter(email);
      toast.success("Subscribed. Look for care tips in your inbox.");
      setEmail("");
    } catch {
      toast.error("Please try again.");
    }
  };
  return (
    <footer className="mt-24 border-t border-border/60 bg-white" data-testid="site-footer">
      <div className="max-w-7xl mx-auto px-6 lg:px-8 py-16 grid md:grid-cols-5 gap-10">
        <div className="md:col-span-2">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center text-white">
              <Activity size={18} />
            </div>
            <span className="font-serif text-2xl">Velora360</span>
          </div>
          <p className="mt-4 text-slate-600 text-sm max-w-sm">
            Medically supervised GLP-1 care for lasting metabolic health. Board-certified physicians, personalized plans, sustainable outcomes.
          </p>
          <form onSubmit={submit} className="mt-6 flex gap-2 max-w-sm" data-testid="footer-newsletter">
            <Input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              type="email"
              required
              className="rounded-full"
              data-testid="footer-newsletter-email"
            />
            <Button type="submit" className="rounded-full bg-primary hover:bg-primary/90" data-testid="footer-newsletter-submit">
              Subscribe
            </Button>
          </form>
          <div className="mt-6 flex items-center gap-4 text-xs text-slate-500">
            <div className="flex items-center gap-1.5"><ShieldCheck size={14} /> HIPAA-aware</div>
            <div className="flex items-center gap-1.5"><Lock size={14} /> Encrypted at rest</div>
          </div>
        </div>
        <div>
          <div className="text-xs uppercase tracking-widest text-slate-500 mb-4">Care</div>
          <ul className="space-y-2 text-sm text-slate-700">
            <li><Link to="/programs/weight-loss">Weight Loss</Link></li>
            <li><Link to="/programs/diabetes">Diabetes</Link></li>
            <li><Link to="/programs/pcos">PCOS</Link></li>
            <li><Link to="/programs/metabolic">Metabolic</Link></li>
          </ul>
        </div>
        <div>
          <div className="text-xs uppercase tracking-widest text-slate-500 mb-4">Company</div>
          <ul className="space-y-2 text-sm text-slate-700">
            <li><Link to="/about">About</Link></li>
            <li><Link to="/doctors">Doctors</Link></li>
            <li><Link to="/pricing">Pricing</Link></li>
            <li><Link to="/blog">Learning Center</Link></li>
          </ul>
        </div>
        <div>
          <div className="text-xs uppercase tracking-widest text-slate-500 mb-4">Support</div>
          <ul className="space-y-2 text-sm text-slate-700">
            <li><Link to="/support">Contact</Link></li>
            <li><Link to="/support">Help Center</Link></li>
            <li><Link to="/support">Emergency</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-border/60 py-6 text-xs text-slate-500 text-center">
        © {new Date().getFullYear()} Vellora360 Health. Not a substitute for professional medical advice.
      </div>
    </footer>
  );
}
