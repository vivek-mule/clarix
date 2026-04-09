export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--color-surface)]">
      <div className="w-full max-w-md p-8 rounded-2xl bg-[var(--color-surface-alt)] border border-white/10 shadow-2xl">
        <h1 className="text-2xl font-bold text-center bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent">
          Welcome Back
        </h1>
        <form className="mt-8 space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-[var(--color-text-muted)] mb-1">Email</label>
            <input id="email" type="email" className="w-full rounded-lg bg-[var(--color-surface)] border border-white/10 px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-[var(--color-text-muted)] mb-1">Password</label>
            <input id="password" type="password" className="w-full rounded-lg bg-[var(--color-surface)] border border-white/10 px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
          <button id="login-btn" type="submit" className="w-full py-3 rounded-lg bg-indigo-600 text-white font-semibold hover:bg-indigo-500 transition-colors">
            Sign In
          </button>
        </form>
        <p className="mt-6 text-center text-sm text-[var(--color-text-muted)]">
          Don&apos;t have an account?{" "}
          <a href="#" className="text-indigo-400 hover:underline">Sign Up</a>
        </p>
      </div>
    </div>
  );
}
