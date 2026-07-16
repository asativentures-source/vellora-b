import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Cookie, X } from "lucide-react";

const KEY = "verdia_cookie_consent_v1";

export default function CookieConsent() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    if (typeof window !== "undefined" && !localStorage.getItem(KEY)) {
      const t = setTimeout(() => setShow(true), 800);
      return () => clearTimeout(t);
    }
  }, []);
  const accept = (v) => {
    localStorage.setItem(KEY, v);
    setShow(false);
  };
  if (!show) return null;
  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-6 md:right-auto md:max-w-md z-[70] animate-in" data-testid="cookie-consent">
      <div className="rounded-2xl bg-white border border-border/60 soft-shadow p-5">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-accent flex items-center justify-center text-primary shrink-0"><Cookie size={18}/></div>
          <div className="flex-1">
            <div className="font-serif text-xl text-slate-900">Your privacy matters</div>
            <p className="text-sm text-slate-600 mt-1">
              We use essential cookies to keep you signed in and analytical cookies to improve care. Read our privacy policy for details.
            </p>
            <div className="mt-3 flex gap-2">
              <Button size="sm" onClick={() => accept("all")} className="rounded-full bg-primary hover:bg-primary/90" data-testid="cookie-accept-all">Accept all</Button>
              <Button size="sm" variant="outline" onClick={() => accept("essential")} className="rounded-full" data-testid="cookie-essential">Essential only</Button>
            </div>
          </div>
          <button onClick={() => accept("dismissed")} className="text-slate-400 hover:text-slate-700" data-testid="cookie-dismiss"><X size={16}/></button>
        </div>
      </div>
    </div>
  );
}
