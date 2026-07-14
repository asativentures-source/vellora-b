import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { submitContact } from "@/lib/api";
import { toast } from "sonner";
import { LifeBuoy, MessageCircle, Phone } from "lucide-react";

export default function Support() {
  const [form, setForm] = useState({ name: "", email: "", topic: "general", message: "" });
  const [sending, setSending] = useState(false);
  const submit = async (e) => {
    e.preventDefault();
    setSending(true);
    try {
      await submitContact(form);
      toast.success("Message received. We'll respond within one business day.");
      setForm({ name: "", email: "", topic: "general", message: "" });
    } catch { toast.error("Please try again."); }
    setSending(false);
  };
  return (
    <main className="max-w-7xl mx-auto px-6 lg:px-8 pt-16 pb-24" data-testid="support-page">
      <div className="max-w-3xl">
        <div className="text-xs uppercase tracking-widest text-slate-500">Support</div>
        <h1 className="font-serif text-5xl md:text-6xl mt-3">We're here — really.</h1>
        <p className="mt-3 text-slate-600 text-lg">For anything urgent, please call your local emergency line first.</p>
      </div>
      <div className="grid md:grid-cols-3 gap-6 mt-12">
        {[
          { icon: MessageCircle, title: "Live chat", desc: "Care team, 7am–11pm local time." },
          { icon: LifeBuoy, title: "Help center", desc: "Common questions, guides, resources." },
          { icon: Phone, title: "Emergency guidance", desc: "Symptom triage and escalation paths." },
        ].map((s) => (
          <Card key={s.title} className="rounded-2xl border-border/60 soft-shadow">
            <CardContent className="p-6">
              <div className="w-10 h-10 rounded-full bg-accent flex items-center justify-center text-primary"><s.icon size={18}/></div>
              <div className="font-serif text-2xl mt-3">{s.title}</div>
              <p className="text-sm text-slate-600 mt-1">{s.desc}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="mt-12 rounded-3xl border-border/60 soft-shadow" data-testid="contact-form-card">
        <CardContent className="p-8">
          <div className="font-serif text-3xl">Contact us</div>
          <form onSubmit={submit} className="mt-6 grid md:grid-cols-2 gap-4" data-testid="contact-form">
            <Input required placeholder="Your name" value={form.name} onChange={e=>setForm({...form, name: e.target.value})} data-testid="contact-name"/>
            <Input required type="email" placeholder="Email" value={form.email} onChange={e=>setForm({...form, email: e.target.value})} data-testid="contact-email"/>
            <Input placeholder="Topic (billing, medical, technical)" value={form.topic} onChange={e=>setForm({...form, topic: e.target.value})} className="md:col-span-2" data-testid="contact-topic"/>
            <Textarea required placeholder="How can we help?" value={form.message} onChange={e=>setForm({...form, message: e.target.value})} className="md:col-span-2 min-h-32" data-testid="contact-message"/>
            <div className="md:col-span-2 flex justify-end">
              <Button type="submit" disabled={sending} className="rounded-full bg-primary hover:bg-primary/90" data-testid="contact-submit">{sending ? "Sending…" : "Send message"}</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
