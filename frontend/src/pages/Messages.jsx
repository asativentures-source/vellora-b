import { useEffect, useRef, useState } from "react";
import DashboardShell from "@/components/DashboardShell";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Send, MessageSquare } from "lucide-react";

const patientLinks = [
  { to: "/patient", label: "Overview", icon: "LayoutDashboard" },
  { to: "/patient/labs", label: "Labs", icon: "FlaskConical" },
  { to: "/patient/messages", label: "Messages", icon: "MessageSquare" },
];
const doctorLinks = [
  { to: "/doctor", label: "Overview", icon: "LayoutDashboard" },
  { to: "/doctor/messages", label: "Messages", icon: "MessageSquare" },
  { to: "/doctor/notes", label: "Notes", icon: "MessageSquare" },
];

export default function Messages() {
  const { user } = useAuth();
  const [threads, setThreads] = useState([]);
  const [contacts, setContacts] = useState([]); // for starting a new thread
  const [selected, setSelected] = useState(null); // other user_id
  const [selectedName, setSelectedName] = useState("");
  const [msgs, setMsgs] = useState([]);
  const [text, setText] = useState("");
  const [startWith, setStartWith] = useState("");
  const scrollRef = useRef(null);
  const isDoctor = user?.role === "doctor" || user?.role === "admin";

  const loadThreads = async () => {
    const t = await api.get("/messages/threads").then(x=>x.data);
    setThreads(t);
    if (!selected && t.length) {
      setSelected(t[0].other_user_id);
      setSelectedName(t[0].other_name);
    }
  };

  const loadContacts = async () => {
    if (isDoctor) {
      const patients = await api.get("/doctor/dashboard").then(x=>x.data.patients);
      setContacts(patients.map(p => ({ user_id: p.user_id, name: p.name })));
    } else {
      // Patient can only reply to threads doctors initiate (contacts stay empty).
      setContacts([]);
    }
  };

  const loadThread = async (uid) => {
    const m = await api.get("/messages/thread", { params: { with_user_id: uid } }).then(x=>x.data);
    setMsgs(m);
    setTimeout(() => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight }), 50);
  };

  useEffect(() => { loadThreads(); loadContacts(); }, []);
  useEffect(() => { if (selected) loadThread(selected); }, [selected]);

  const send = async (e) => {
    e?.preventDefault();
    if (!text.trim() || !selected) return;
    await api.post("/messages", { to_user_id: selected, body: text.trim() });
    setText("");
    await loadThread(selected);
    loadThreads();
  };

  const startNew = async () => {
    if (!startWith) return;
    const contact = contacts.find(c => c.user_id === startWith);
    setSelected(startWith);
    setSelectedName(contact?.name || "");
    await api.post("/messages", { to_user_id: startWith, body: `Hi ${contact?.name?.split(" ")[0] || ""}, just checking in.` }).catch(()=>{});
    await loadThreads();
    await loadThread(startWith);
  };

  return (
    <DashboardShell title="Messages" links={isDoctor ? doctorLinks : patientLinks}>
      <div className="grid lg:grid-cols-3 gap-6 h-[calc(100vh-8rem)]">
        <Card className="rounded-2xl border-border/60 soft-shadow lg:col-span-1 flex flex-col">
          <CardContent className="p-4 flex-1 overflow-hidden flex flex-col">
            <div className="font-serif text-2xl mb-3">Conversations</div>
            <div className="space-y-1 overflow-y-auto flex-1" data-testid="thread-list">
              {threads.length === 0 && <div className="text-sm text-slate-500 p-3">No conversations yet.</div>}
              {threads.map((t) => (
                <button
                  key={t.thread_id}
                  onClick={() => { setSelected(t.other_user_id); setSelectedName(t.other_name); }}
                  className={`w-full text-left p-3 rounded-xl flex items-center gap-3 ${selected === t.other_user_id ? "bg-accent" : "hover:bg-accent/40"}`}
                  data-testid={`thread-${t.thread_id}`}
                >
                  <Avatar className="h-9 w-9"><AvatarFallback>{t.other_name?.[0]}</AvatarFallback></Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{t.other_name}</div>
                    <div className="text-xs text-slate-500 truncate">{t.last_message}</div>
                  </div>
                  {t.unread > 0 && <Badge className="rounded-full bg-primary text-white hover:bg-primary">{t.unread}</Badge>}
                </button>
              ))}
            </div>
            <div className="mt-4 pt-4 border-t border-border/60">
              <div className="text-xs uppercase tracking-widest text-slate-500 mb-2">Start new</div>
              {contacts.length === 0 ? (
                <div className="text-xs text-slate-500">
                  {isDoctor ? "No patients available yet." : "Your care team will start the conversation after your first consultation."}
                </div>
              ) : (
                <div className="flex gap-2">
                  <Select value={startWith} onValueChange={setStartWith}>
                    <SelectTrigger data-testid="msg-new-select"><SelectValue placeholder={isDoctor ? "Choose patient" : "Choose doctor"}/></SelectTrigger>
                    <SelectContent>
                      {contacts.filter(c => c.user_id !== user?.user_id).map(c => (
                        <SelectItem key={c.user_id} value={c.user_id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button onClick={startNew} disabled={!startWith} className="rounded-full bg-primary hover:bg-primary/90" data-testid="msg-new-start">Start</Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border/60 soft-shadow lg:col-span-2 flex flex-col">
          <CardContent className="p-0 flex-1 flex flex-col">
            <div className="px-6 py-4 border-b border-border/60 flex items-center gap-3">
              <MessageSquare size={16} className="text-primary"/>
              <div className="font-serif text-xl">{selectedName || "Select a conversation"}</div>
            </div>
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-3" data-testid="thread-messages">
              {!selected && <div className="text-sm text-slate-500 text-center mt-10">Choose a conversation to begin.</div>}
              {msgs.map((m) => (
                <div key={m.id} className={`flex ${m.from_user_id === user?.user_id ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[70%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${m.from_user_id === user?.user_id ? "bg-primary text-white" : "bg-accent text-slate-800"}`}>
                    {m.body}
                    <div className={`text-[10px] mt-1 ${m.from_user_id === user?.user_id ? "text-white/70" : "text-slate-500"}`}>{new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</div>
                  </div>
                </div>
              ))}
            </div>
            {selected && (
              <form onSubmit={send} className="p-4 border-t border-border/60 flex gap-2" data-testid="msg-form">
                <Input value={text} onChange={(e)=>setText(e.target.value)} placeholder="Type a message…" className="rounded-full" data-testid="msg-input"/>
                <Button type="submit" className="rounded-full bg-primary hover:bg-primary/90" data-testid="msg-send"><Send size={16}/></Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardShell>
  );
}
