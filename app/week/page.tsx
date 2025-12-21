export default function WeekPage() {
    return (
        <div>
            <header className="mb-8">
                <h1 className="text-3xl font-semibold">This Week</h1>
                <p className="text-white/70 mt-2">
                    Focused execution for the current week.
                </p>
            </header>

            <section className="rounded-2xl border border-white/10 bg-white/5 p-6">
                <p className="text-white/60">
                    Weekly tasks and progress will appear here.
                </p>
            </section>
        </div>
    );
}