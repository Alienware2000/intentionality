export default function QuestsPage() {
    return (
        <main className="min-h-screen bg-black text-white p-8">
            <header className="mb-8">
                <h1 className="text-3xl font-semibold">Quests</h1>
                <p className="text-white/70 mt-2">
                    High-level goals and missions will live here.
                </p>
            </header>

            <section className="rounded-2xl border border-white/10 bg-white/5 p-6">
                <p className="text-white/60">
                    Your quests and related tasks will appear here.
                </p>
            </section>
        </main>
    );
}