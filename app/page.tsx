import Link from "next/link";

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <span className="font-syne font-bold text-xl text-text-primary">Applyjobs</span>
          <div className="flex items-center gap-4">
            <Link href="/auth" className="text-sm text-text-dimmed hover:text-text-primary transition-all duration-[150ms] font-dm-sans">
              Log in
            </Link>
            <Link href="/auth" className="text-sm px-4 py-2 bg-btn-bg text-btn-text rounded-[8px] font-dm-sans hover:opacity-90 transition-all duration-[150ms]">
              Get started free
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-5xl mx-auto px-6 py-24 text-center">
        <h1 className="font-syne font-extrabold text-5xl md:text-6xl text-text-primary leading-tight mb-6">
          Know what you&apos;re walking into.<br />Apply in 3 minutes.
        </h1>
        <p className="text-lg text-text-dimmed font-dm-sans font-light max-w-xl mx-auto mb-10">
          Applyjobs fetches jobs matched to your CV, scores them, and generates a full application kit — cover letter, tailored CV, and screening answers.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/auth" className="px-6 py-3 bg-btn-bg text-btn-text rounded-[8px] font-dm-sans font-medium hover:opacity-90 transition-all duration-[150ms]">
            Get started free →
          </Link>
          <Link href="/waitlist" className="px-6 py-3 border border-border text-text-primary rounded-[8px] font-dm-sans hover:bg-surface transition-all duration-[150ms]">
            Join waitlist
          </Link>
        </div>
      </section>

      {/* How it works */}
      <section className="border-t border-border py-20">
        <div className="max-w-5xl mx-auto px-6">
          <h2 className="font-syne font-bold text-3xl text-text-primary text-center mb-12">How it works</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                step: "01",
                title: "Upload your CV",
                desc: "Upload your PDF. We parse it and build your profile.",
              },
              {
                step: "02",
                title: "Get matched jobs",
                desc: "We fetch live jobs from Adzuna and score each one against your CV.",
              },
              {
                step: "03",
                title: "Apply with a full kit",
                desc: "Generate a cover letter, tailored CV, and screening answers in seconds.",
              },
            ].map((item) => (
              <div key={item.step} className="border border-border rounded-[8px] p-6 bg-surface">
                <span className="font-syne font-bold text-3xl text-text-dimmed block mb-3">{item.step}</span>
                <h3 className="font-dm-sans font-medium text-text-primary mb-2">{item.title}</h3>
                <p className="text-sm text-text-dimmed font-dm-sans font-light">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20">
        <div className="max-w-5xl mx-auto px-6">
          <h2 className="font-syne font-bold text-3xl text-text-primary text-center mb-12">Features</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                title: "Job scoring",
                desc: "Claude scores every job 0–100 based on your CV, role, location, and seniority.",
              },
              {
                title: "Full application kit",
                desc: "Cover letter, ATS-optimised CV, likely screening questions, and skills gap analysis.",
              },
              {
                title: "Application tracker",
                desc: "Track every application, posting status, and follow-up in one clean board.",
              },
            ].map((f) => (
              <div key={f.title} className="border border-border rounded-[8px] p-6 bg-surface">
                <h3 className="font-dm-sans font-medium text-text-primary mb-2">{f.title}</h3>
                <p className="text-sm text-text-dimmed font-dm-sans font-light">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="border-t border-border py-20">
        <div className="max-w-5xl mx-auto px-6">
          <h2 className="font-syne font-bold text-3xl text-text-primary text-center mb-12">Pricing</h2>
          <div className="grid md:grid-cols-2 gap-6 max-w-2xl mx-auto">
            <div className="border border-border rounded-[8px] p-8 bg-surface">
              <h3 className="font-syne font-bold text-xl text-text-primary mb-2">Free</h3>
              <p className="font-syne font-bold text-4xl text-text-primary mb-6">$0</p>
              <ul className="space-y-2 text-sm text-text-dimmed font-dm-sans mb-8">
                {["5 job refreshes per day", "Job scoring", "Application Preview", "Basic tracker"].map((f) => (
                  <li key={f} className="flex items-center gap-2">
                    <span>—</span> {f}
                  </li>
                ))}
              </ul>
              <Link href="/auth" className="block w-full text-center py-3 border border-border rounded-[8px] text-sm font-dm-sans hover:bg-surface-secondary transition-all duration-[150ms]">
                Start free
              </Link>
            </div>
            <div className="border border-btn-bg rounded-[8px] p-8 bg-btn-bg text-btn-text">
              <h3 className="font-syne font-bold text-xl mb-2">Pro</h3>
              <p className="font-syne font-bold text-4xl mb-1">$9</p>
              <p className="text-sm opacity-60 font-dm-sans mb-6">per month</p>
              <ul className="space-y-2 text-sm opacity-80 font-dm-sans mb-8">
                {["Everything in Free", "Full application kits", "Cover letter + tailored CV", "Screening answers", "Skills gap analysis", "Follow-up generator"].map((f) => (
                  <li key={f} className="flex items-center gap-2">
                    <span>—</span> {f}
                  </li>
                ))}
              </ul>
              <Link href="/auth" className="block w-full text-center py-3 bg-background text-text-primary rounded-[8px] text-sm font-dm-sans hover:opacity-90 transition-all duration-[150ms]">
                Get started
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8">
        <div className="max-w-5xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <span className="font-syne font-bold text-text-primary">Applyjobs</span>
          <p className="text-sm text-text-dimmed font-dm-sans">© 2025 Applyjobs. All rights reserved.</p>
        </div>
      </footer>
    </main>
  );
}
