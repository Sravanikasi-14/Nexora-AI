import Link from "next/link";

const STEPS = [
  { title: "Understand", desc: "Nexora asks about your business, your customers, your goals — nothing more than you're willing to share." },
  { title: "Diagnose", desc: "It assesses your digital presence, sales, and customers to see what's actually there — never assumed." },
  { title: "Recommend", desc: "You get a prioritized roadmap and daily missions, each with the reasoning behind it." },
  { title: "Act", desc: "Nexora drafts the WhatsApp message, email, or follow-up. You approve before anything goes out." },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-base text-ink">
      <header className="max-w-6xl mx-auto px-8 py-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center font-display font-bold text-white">
            N
          </div>
          <span className="font-display font-semibold text-lg tracking-tight">Nexora</span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/login" className="btn-ghost">Sign in</Link>
          <Link href="/register" className="btn-primary">Get started</Link>
        </div>
      </header>

      <section className="max-w-4xl mx-auto px-8 pt-20 pb-16 text-center">
        <span className="pill bg-surface2 text-accent border border-border mb-6">
          Not a dashboard. A Chief Growth Officer.
        </span>
        <h1 className="font-display text-5xl md:text-6xl font-semibold tracking-tight leading-[1.05] mb-6">
          Nexora understands your business
          <br />
          <span className="text-accent">before it ever advises you.</span>
        </h1>
        <p className="text-lg text-muted max-w-2xl mx-auto mb-10 leading-relaxed">
          Most AI tools start giving recommendations immediately. Nexora doesn&apos;t. It learns your business first —
          your customers, your digital presence, your data — and only then diagnoses problems, explains its reasoning,
          and helps you grow.
        </p>
        <div className="flex items-center justify-center gap-4">
          <Link href="/register" className="btn-primary text-base px-6 py-3">Start Business Discovery</Link>
          <Link href="/login" className="btn-secondary text-base px-6 py-3">I already have an account</Link>
        </div>
      </section>

      <section className="max-w-5xl mx-auto px-8 pb-24">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {STEPS.map((s, i) => (
            <div key={s.title} className="card p-6">
              <span className="text-accent font-display font-semibold text-sm">{String(i + 1).padStart(2, "0")}</span>
              <h3 className="font-display font-semibold text-lg mt-3 mb-2">{s.title}</h3>
              <p className="text-sm text-muted leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="max-w-4xl mx-auto px-8 pb-24">
        <div className="card p-8 border-accent/30 bg-gradient-to-br from-surface to-surface2">
          <h2 className="font-display text-2xl font-semibold mb-3">Never a fabricated growth score.</h2>
          <p className="text-muted leading-relaxed">
            If your business hasn&apos;t connected any digital presence, customer list, or sales data, Nexora says so —
            plainly — instead of inventing a metric to look impressive. Every score, every insight, every recommendation
            is grounded in real information you&apos;ve provided.
          </p>
        </div>
      </section>

      <footer className="border-t border-border py-8 text-center text-sm text-muted">
        © {new Date().getFullYear()} Nexora. Built for small businesses that want to grow with clarity.
      </footer>
    </div>
  );
}
