export default function HomePage() {
  return (
    <section id="hero" className="max-w-7xl mx-auto px-6 py-24 text-center">
      <h1 className="text-5xl font-extrabold tracking-tight bg-gradient-to-r from-indigo-400 via-purple-400 to-cyan-400 bg-clip-text text-transparent">
        Learn Smarter, Not Harder
      </h1>
      <p className="mt-6 text-lg text-[var(--color-text-muted)] max-w-2xl mx-auto">
        An AI-powered adaptive learning platform that personalises your
        education journey using cutting-edge language models &amp; real-time
        knowledge tracking.
      </p>
      <div className="mt-10 flex justify-center gap-4">
        <a href="/dashboard" className="px-6 py-3 rounded-xl bg-indigo-600 text-white font-semibold hover:bg-indigo-500 transition-colors">
          Get Started
        </a>
        <a href="/chat" className="px-6 py-3 rounded-xl border border-white/20 text-white font-semibold hover:bg-white/5 transition-colors">
          Try AI Tutor
        </a>
      </div>
    </section>
  );
}
