import EnquireForm from "@/components/EnquireForm";

export default function Enquire() {
  return (
    <div className="max-w-7xl mx-auto px-6 py-16 lg:px-8">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
        <div>
          <span className="text-primary font-medium text-sm uppercase tracking-wider">Get in Touch</span>
          <h1 className="text-4xl font-serif font-bold text-slate-900 mt-2 mb-4">
            Have Questions About Our Care Programs?
          </h1>
          <p className="text-slate-600 text-lg mb-6">
            Fill out your details below, and our team will get in touch with you shortly to answer your questions and help you get started.
          </p>
        </div>
        <div>
          <EnquireForm />
        </div>
      </div>
    </div>
  );
}