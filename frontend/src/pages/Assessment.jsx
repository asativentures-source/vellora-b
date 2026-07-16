import { useEffect, useRef, useState } from "react";
import { aiAssessment } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Send, Sparkles } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

export default function Assessment() {
  const { user } = useAuth();
  const [msgs, setMsgs] = useState([
    { role: "assistant", text: "Hi, I'm Aria — your Verdia care companion. Before we match you with a clinician, may I ask a few questions? First: what brings you here today (weight, energy, diabetes, PCOS, or something else)?" },
  ]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [sid, setSid] = useState(null);
  const bottomRef = useRef(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs]);

  const send = async (e) => {
    e?.preventDefault();
    if (!input.trim() || sending) return;
    const text = input.trim();
    setMsgs((m) => [...m, { role: "user", text }]);
    setInput("");
    setSending(true);
    try {
      const res = await aiAssessment(text, sid);
      setSid(res.session_id);
      setMsgs((m) => [...m, { role: "assistant", text: res.reply }]);
    } catch (e) {
      setMsgs((m) => [...m, { role: "assistant", text: "Sorry, I hit a snag. Please try again." }]);
    }
    setSending(false);
  };

  const login = () => {
    window.location.href = "/login";
  };

  return (
    <main className="max-w-4xl mx-auto px-6 lg:px-8 pt-16 pb-24" data-testid="assessment-page">
      <div className="text-xs uppercase tracking-widest text-slate-500">Health assessment</div>
      <h1 className="font-serif text-5xl mt-2">A conversation, not a form.</h1>
      <p className="mt-3 text-slate-600">Answers stay private. Reviewed by a licensed clinician before any recommendation.</p>

      <Card className="mt-10 rounded-3xl border-border/60 soft-shadow overflow-hidden">
        <CardContent className="p-0">
          <div className="max-h-[520px] overflow-y-auto p-6 space-y-4" data-testid="assessment-thread">
            {msgs.map((m, i) => (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${m.role === "user" ? "bg-primary text-white" : "bg-accent text-slate-800"}`}>
                  {m.role === "assistant" && <div className="flex items-center gap-1.5 text-xs uppercase tracking-widest text-primary mb-1"><Sparkles size={12}/> Aria</div>}
                  {m.text}
                </div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>
          <form onSubmit={send} className="border-t border-border/60 p-3 flex gap-2 bg-white" data-testid="assessment-form">
            <Input placeholder="Type your response…" value={input} onChange={(e)=>setInput(e.target.value)} className="rounded-full" data-testid="assessment-input"/>
            <Button type="submit" disabled={sending} className="rounded-full bg-primary hover:bg-primary/90" data-testid="assessment-send">
              <Send size={16}/>
            </Button>
          </form>
        </CardContent>
      </Card>

      {!user && (
        <div className="mt-8 rounded-3xl sage-block p-8 flex items-center justify-between gap-6 flex-wrap">
          <div>
            <div className="font-serif text-2xl">Ready to speak to a clinician?</div>
            <p className="text-slate-600 mt-1 text-sm">Create your Verdia account to save this assessment and book a consultation.</p>
          </div>
          <Button onClick={login} className="rounded-full bg-primary hover:bg-primary/90 h-11 px-5" data-testid="assessment-signin">Sign in to continue</Button>
        </div>
      )}
    </main>
  );
}
