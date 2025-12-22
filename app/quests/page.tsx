import { getQuests, getTasks } from "../lib/store";

export default function QuestsPage() {
    const quests = getQuests();
    const tasks = getTasks();

    return (
        <div>
            <header className="mb-8">
                <h1 className="text-3xl font-semibold">Quests</h1>
                <p className="text-white/70 mt-2">
                    High-level goals and missions will live here.
                </p>
            </header>

            <section className="rounded-2xl border border-white/10 bg-white/5 p-6">
                {quests.map((quest) => {
                    const tasksForQuest = tasks.filter((t) => t.questId === quest.id);
                    const completedCount = tasksForQuest.filter((t) => t.completed).length;
                    const totalCount = tasksForQuest.length;

                    return (
                        <div
                            key={quest.id}
                            className="rounded-2xl border border-white/10 bg-white/5 p-6"
                            >
                                <div className="flex items-start justify-between gap-4">
                                    <div>
                                        <h2 className="text-xl font-semibold">{quest.title}</h2>
                                        <p className="text-white/60 mt-1">
                                            Created: {quest.createdAt}
                                        </p>
                                    </div>

                                    <div className="text-right">
                                        <div className="text-sm text-white/60">Progress</div>
                                        <div className="text-lg font-semibold">
                                            {completedCount}/{totalCount}
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-5">
                                    <div className="h-2 w-full rounded-full bg-white/10">
                                        <div
                                            className="h-2 rounded-full bg-white/40"
                                            style={{
                                                width:
                                                    totalCount === 0
                                                        ? "0%"
                                                        : `${Math.round((completedCount / totalCount) * 100)}%`,
                                            }}
                                        />
                                    </div>
                                    <p className="text-xs text-white/50 mt-2">
                                        {totalCount === 0 
                                        ? "No tasks yet." 
                                        : `${Math.round((completedCount / totalCount) * 100)}% complete`}
                                    </p>
                                </div>
                            </div>
                    );
                })}
            </section>
        </div>
    );
}