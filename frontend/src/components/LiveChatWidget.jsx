import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { MessageCircle, X, Send, Sparkles } from "lucide-react";
import { aiAssessment } from "@/lib/api";

export default function LiveChatWidget() {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState([
    { role: "assistant", text: "Hi! I'm Aria from Verdia. Ask me anything about GLP-1 care, eligibility, pricing, or booking." },
  ]);
  const [input, setInput] = useState("");
  const [sid, setSid] = useState(null);
  const [sending, setSending] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" }); }, [msgs, open]);

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
    } catch {
      setMsgs((m) => [...m, { role: "assistant", text: "I'm having trouble replying. Try our contact form on the Support page." }]);
    }
    setSending(false);
  };

  return (
    <>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Open live chat"
        className="fixed bottom-5 right-5 z-[60] w-14 h-14 rounded-full bg-primary hover:bg-primary/90 text-white flex items-center justify-center soft-shadow-hover soft-shadow"
        data-testid="live-chat-toggle"
      >
        {open ? <X size={22}/> : <MessageCircle size={22}/>}
      </button>
      {open && (
        <div className="fixed bottom-24 right-5 z-[60] w-[360px] max-w-[calc(100vw-2rem)] rounded-3xl bg-white border border-border/60 soft-shadow overflow-hidden flex flex-col" data-testid="live-chat-panel">
          <div className="px-5 py-4 border-b border-border/60 flex items-center gap-3 bg-accent/40">
            <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center text-white"><Sparkles size={16}/></div>
            <div>
              <div className="font-serif text-lg">Chat with Aria</div>
              <div className="text-xs text-slate-500">Typically replies in a moment</div>
            </div>
          </div>
          <div ref={scrollRef} className="p-4 space-y-3 max-h-80 overflow-y-auto">
            {msgs.map((m, i) => (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[85%] text-sm rounded-2xl px-3.5 py-2.5 leading-relaxed ${m.role === "user" ? "bg-primary text-white" : "bg-accent text-slate-800"}`}>{m.text}</div>
              </div>
            ))}
            {sending && <div className="text-xs text-slate-500">Aria is typing…</div>}
          </div>
          <form onSubmit={send} className="p-3 border-t border-border/60 flex gap-2 bg-white">
            <Input placeholder="Ask a question…" value={input} onChange={(e)=>setInput(e.target.value)} className="rounded-full" data-testid="live-chat-input"/>
            <Button type="submit" disabled={sending} className="rounded-full bg-primary hover:bg-primary/90" data-testid="live-chat-send"><Send size={16}/></Button>
          </form>
        </div>
      )}
    </>
  );
}
