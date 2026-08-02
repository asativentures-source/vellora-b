import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { submitContact, formatApiErrorDetail } from "@/lib/api";

export default function EnquireForm() {
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    message: "",
    topic: "enquiry"
  });
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Phone number validation check (10 digits, optional country code)
    const phoneRegex = /^\+?[0-9]{10}$/;
    const cleanedPhone = formData.phone.replace(/[\s\-\(\)]/g, "");
    if (!phoneRegex.test(cleanedPhone)) {
      toast.error("Please enter a valid phone number...");
      return;
    }

    setLoading(true);

    try {
      await submitContact(formData);
      toast.success("Enquiry submitted successfully! We will contact you soon.");
      setFormData({ name: "", phone: "", email: "", message: "", topic: "enquiry" });
    } catch (err) {
      const errMsg = formatApiErrorDetail(err.response?.data?.detail) || err.message;
      toast.error(errMsg || "Failed to submit enquiry. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-lg bg-white p-6 rounded-xl border border-border shadow-sm">
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1" htmlFor="name" style={{ color: '#FF5C5C' }}>Full Name *</label>
        <Input
          type="text"
          name="name"
          value={formData.name}
          onChange={handleChange}
          required
          placeholder="Enter your name"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1" htmlFor="phone" style={{ color: '#FF5C5C' }}>Phone Number *</label>
        <Input
          type="tel"
          name="phone"
          value={formData.phone}
          onChange={handleChange}
          required
          placeholder="Enter your phone number"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Email (Optional)</label>
        <Input
          type="email"
          name="email"
          value={formData.email}
          onChange={handleChange}
          placeholder="Enter your email"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Message / Questions</label>
        <textarea
          name="message"
          value={formData.message}
          onChange={handleChange}
          rows={4}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          placeholder="Tell us what you need help with..."
        />
      </div>

      <Button type="submit" disabled={loading} className="w-full bg-primary text-white">
        {loading ? "Submitting..." : "Submit Enquiry"}
      </Button>
    </form>
  );
}