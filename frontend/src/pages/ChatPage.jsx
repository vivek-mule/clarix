export default function ChatPage() {
  return (
    <section id="chat" className="max-w-4xl mx-auto px-6 py-16 flex flex-col h-[calc(100vh-4rem)]">
      <h1 className="text-3xl font-bold">AI Tutor</h1>
      <p className="mt-2 text-[var(--color-text-muted)]">
        Ask anything — the AI tutor adapts to your knowledge level.
      </p>

      {/* Chat messages area */}
      <div className="mt-6 flex-1 overflow-y-auto rounded-xl bg-[var(--color-surface-alt)] p-4">
        {/* TODO: message list */}
      </div>

      {/* Input bar */}
      <form className="mt-4 flex gap-3">
        <input
          id="chat-input"
          type="text"
          placeholder="Type your question…"
          className="flex-1 rounded-xl bg-[var(--color-surface-alt)] border border-white/10 px-4 py-3 text-white placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <button
          id="chat-send"
          type="submit"
          className="px-6 py-3 rounded-xl bg-indigo-600 text-white font-semibold hover:bg-indigo-500 transition-colors"
        >
          Send
        </button>
      </form>
    </section>
  );
}
