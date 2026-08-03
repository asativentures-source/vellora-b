import { useCallback, useEffect, useState } from "react";
import DashboardShell from "@/components/DashboardShell";
import { fetchAdminContactMessages, updateContactStatus } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, RotateCcw, Clock, Edit3, CheckCircle2, AlertCircle } from "lucide-react";
import { toast } from "sonner";

const links = [
  { to: "/admin", label: "Overview", icon: "LayoutDashboard" },
  { to: "/admin#users", label: "Users", icon: "Users" },
  { to: "/admin#doctors", label: "Doctors", icon: "ShieldCheck" },
  { to: "/admin/messages", label: "Messages", icon: "MessageSquare" },
  { to: "/admin#orders", label: "Orders", icon: "ShoppingBag" },
  { to: "/admin#analytics", label: "Analytics", icon: "BarChart3" },
  { to: "/settings", label: "Settings", icon: "Settings" },
];

export default function AdminMessages() {
  const [messages, setMessages] = useState([]);
  const [totalMessages, setTotalMessages] = useState(0);
  const [skip, setSkip] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  
  // Filters
  const [searchInput, setSearchInput] = useState("");
  const [startInput, setStartInput] = useState("");
  const [endInput, setEndInput] = useState("");
  const [statusInput, setStatusInput] = useState("");

  const [activeSearch, setActiveSearch] = useState("");
  const [activeStart, setActiveStart] = useState("");
  const [activeEnd, setActiveEnd] = useState("");
  const [activeStatus, setActiveStatus] = useState("");

  // Modal State for updating status & notes
  const [selectedMsg, setSelectedMsg] = useState(null);
  const [modalStatus, setModalStatus] = useState("pending");
  const [modalNote, setModalNote] = useState("");
  const [modalFollowUp, setModalFollowUp] = useState("");
  const [updating, setUpdating] = useState(false);

  const limit = 10;

  const loadMessages = useCallback(async (currentSkip, isAppending = false, search = activeSearch, start = activeStart, end = activeEnd, status = activeStatus) => {
    try {
      setLoadingMore(true);
      const data = await fetchAdminContactMessages(currentSkip, limit, "", search, start, end, status);
      const fetchedList = Array.isArray(data) ? data : (data?.messages || []);
      const totalCount = data?.total ?? fetchedList.length;

      setTotalMessages(totalCount);
      setMessages((prev) => isAppending ? [...prev, ...fetchedList] : fetchedList);
    } catch (err) {
      console.error("Failed to fetch messages", err);
      setMessages([]);
    } finally {
      setLoadingMore(false);
    }
  }, [activeSearch, activeStart, activeEnd, activeStatus, limit]);

  useEffect(() => {
    setSkip(0);
    loadMessages(0, false, activeSearch, activeStart, activeEnd, activeStatus);
  }, [activeSearch, activeStart, activeEnd, activeStatus, loadMessages]);

  const handleSearchClick = () => {
    setActiveSearch(searchInput);
    setActiveStart(startInput);
    setActiveEnd(endInput);
  };

  const handleClearFilters = () => {
    setSearchInput("");
    setStartInput("");
    setEndInput("");
    setStatusInput("");
    setActiveSearch("");
    setActiveStart("");
    setActiveEnd("");
    setActiveStatus("");
  };

  const handleOpenModal = (msg) => {
    setSelectedMsg(msg);
    setModalStatus(msg.status || "pending");
    setModalNote(msg.note || "");
    setModalFollowUp(msg.follow_up_date || "");
  };

  const handleSaveStatus = async () => {
    if (!selectedMsg) return;
    try {
      setUpdating(true);
      await updateContactStatus(selectedMsg.phone, modalStatus, modalNote, modalFollowUp);
      toast.success("Enquiry status updated successfully");
      
      // Update local list
      setMessages(messages.map(m => m.phone === selectedMsg.phone ? { 
        ...m, 
        status: modalStatus, 
        note: modalNote, 
        follow_up_date: modalFollowUp 
      } : m));
      
      setSelectedMsg(null);
    } catch (err) {
      toast.error("Failed to update status");
    } finally {
      setUpdating(false);
    }
  };

  const handleLoadMore = () => {
    const nextSkip = skip + limit;
    setSkip(nextSkip);
    loadMessages(nextSkip, true, activeSearch, activeStart, activeEnd, activeStatus);
  };

  const getStatusBadge = (status) => {
    switch(status) {
      case "called": return <Badge className="bg-green-100 text-green-700">Called</Badge>;
      case "busy": return <Badge className="bg-orange-100 text-orange-700">Busy</Badge>;
      case "no_response": return <Badge className="bg-red-100 text-red-700">No Response</Badge>;
      case "call_later": return <Badge className="bg-purple-100 text-purple-700">Call Later</Badge>;
      default: return <Badge className="bg-amber-100 text-amber-700">Pending</Badge>;
    }
  };

  return (
    <DashboardShell title="Platform" links={links}>
      <Card className="rounded-2xl border-border/60 soft-shadow">
        <CardContent className="p-6">
          <div className="font-serif text-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
            <span>Customer Enquiries & Contact Messages</span>
            <div className="flex flex-wrap gap-2">
              {["", "pending", "busy", "no_response", "call_later", "called"].map((s) => (
                <Button 
                  key={s}
                  onClick={() => setActiveStatus(s)} 
                  variant={activeStatus === s ? "default" : "outline"}
                  className="rounded-full text-xs capitalize"
                >
                  {s === "" ? "All" : s.replace("_", " ")}
                </Button>
              ))}
              <Badge className="bg-primary text-white rounded-full px-4 ml-auto">{totalMessages} Total</Badge>
            </div>
          </div>

          {/* Filters Bar */}
          <div className="grid md:grid-cols-4 gap-4 mb-6 bg-slate-50 p-4 rounded-xl border border-border/60 items-end">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Search</label>
              <Input
                type="text"
                placeholder="Name / Phone..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="bg-white"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Start Date</label>
              <Input
                type="date"
                value={startInput}
                onChange={(e) => setStartInput(e.target.value)}
                className="bg-white"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">End Date</label>
              <Input
                type="date"
                value={endInput}
                onChange={(e) => setEndInput(e.target.value)}
                className="bg-white"
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleSearchClick} className="flex-1 bg-primary text-white">
                <Search size={16} className="mr-1" /> Search
              </Button>
              <Button onClick={handleClearFilters} variant="outline" title="Clear Filters">
                <RotateCcw size={16} />
              </Button>
            </div>
          </div>

          <div className="mt-4 divide-y divide-border/60">
            {Array.isArray(messages) && messages.map((msg) => (
              <div key={msg.id || msg._id} className="py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-900">{msg.name}</span>
                    <Badge variant="outline" className="capitalize text-xs">{msg.topic || "general"}</Badge>
                    {getStatusBadge(msg.status)}
                  </div>
                  <div className="text-xs text-slate-500 flex items-center gap-4">
                    <span>Phone: <strong className="text-slate-700">{msg.phone}</strong></span>
                    {msg.email && <span>Email: <strong className="text-slate-700">{msg.email}</strong></span>}
                  </div>
                  <p className="text-sm text-slate-700 bg-accent/30 p-3 rounded-xl mt-2">{msg.message || "No message provided."}</p>
                  
                  {/* Notes / Follow-up display */}
                  {(msg.note || msg.follow_up_date) && (
                    <div className="text-xs text-slate-600 bg-slate-100 p-2 rounded-lg mt-2 flex flex-col gap-1">
                      {msg.note && <span><strong>Note:</strong> {msg.note}</span>}
                      {msg.follow_up_date && <span className="text-purple-700 font-medium">📅 Follow-up Date: {msg.follow_up_date}</span>}
                    </div>
                  )}
                </div>

                <div className="flex flex-col md:items-end gap-2">
                  <span className="text-xs text-slate-400">{msg.created_at ? new Date(msg.created_at).toLocaleString() : ""}</span>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => handleOpenModal(msg)}
                    className="text-xs"
                  >
                    <Edit3 size={14} className="mr-1" /> Update Status & Note
                  </Button>
                </div>
              </div>
            ))}
            {(!Array.isArray(messages) || messages.length === 0) && (
              <div className="text-sm text-slate-500 py-6 text-center">No contact messages found.</div>
            )}
          </div>

          {Array.isArray(messages) && messages.length < totalMessages && (
            <div className="mt-6 text-center">
              <Button 
                onClick={handleLoadMore} 
                disabled={loadingMore} 
                variant="outline" 
                className="rounded-full px-6"
              >
                {loadingMore ? "Loading more..." : "Load More Messages"}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Update Modal / Dialog */}
      {selectedMsg && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4">
            <div className="font-serif text-xl font-semibold">Update Enquiry Status</div>
            <div className="text-xs text-slate-500">Customer: <strong>{selectedMsg.name}</strong> ({selectedMsg.phone})</div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Status</label>
              <select 
                value={modalStatus} 
                onChange={(e) => setModalStatus(e.target.value)}
                className="w-full border border-border rounded-xl p-2 text-sm bg-white"
              >
                <option value="pending">Pending</option>
                <option value="called">Called</option>
                <option value="busy">Busy</option>
                <option value="no_response">No Response</option>
                <option value="call_later">Call Later</option>
              </select>
            </div>

            {modalStatus === "call_later" && (
                 <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Follow-up Date</label>
                    <Input 
                         type="date" 
                         min={new Date().toISOString().split("T")[0]} // <--- Aaj ki date se pehle ki dates block ho jayengi
                         value={modalFollowUp} 
                         onChange={(e) => setModalFollowUp(e.target.value)} 
                     />
                 </div>
            )}

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Note / Reason</label>
              <textarea 
                rows={3}
                placeholder="Write down why they didn't pick up or any remarks..."
                value={modalNote}
                onChange={(e) => setModalNote(e.target.value)}
                className="w-full border border-border rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setSelectedMsg(null)}>Cancel</Button>
              <Button onClick={handleSaveStatus} disabled={updating} className="bg-primary text-white">
                {updating ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </DashboardShell>
  );
}