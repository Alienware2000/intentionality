export default function Home() {
  return (
    <main className="min-h-screen bg-black text-white p-8">
      <header className="mb-8">
        <h1 className="text-4xl font-semibold tracking-tight">Intentionality</h1>
        <p className="text-white/70 mt-2">Command Center (v0)</p>
      </header>

      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <h2 className="text-lg font-medium">This Week</h2>
          <p className="text-white/60 mt-2">
          Your weekly plan will live here.
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <h2 className="text-lg font-medium">Quests</h2>
          <p className="text-white/60 mt-2">
            High-level goals and missions will live here.
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <h2 className="text-lg font-medium">XP & Status</h2>
          <p className="text-white/60 mt-2">
            Progress, XP, and streaks will live here.
          </p>
        </div>
      </section>
    </main>
  )
}