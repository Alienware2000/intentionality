import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

const adapter = new PrismaBetterSqlite3({
  url: process.env.DATABASE_URL!, // e.g. "file:./dev.db"
});

const prisma = new PrismaClient({ adapter });


async function main() {
  await prisma.quest.upsert({
    where: { id: "q_general" },
    update: {},
    create: { id: "q_general", title: "General Tasks" },
  });

  await prisma.quest.upsert({
    where: { id: "q_leetcode" },
    update: {},
    create: { id: "q_leetcode", title: "leetcode consistency" },
  });

  await prisma.quest.upsert({
    where: { id: "q_intentionality" },
    update: {},
    create: { id: "q_intentionality", title: "Ship Intentionality v0" },
  });

  await prisma.quest.upsert({
    where: { id: "q_portfolio" },
    update: {},
    create: { id: "q_portfolio", title: "Polish portfolio + LinkedIn" },
  });

  await prisma.task.upsert({
    where: { id: "t_arrays" },
    update: {},
    create: {
      id: "t_arrays",
      questId: "q_leetcode",
      title: "Solve 2 array problems",
      dueDate: "2025-12-28",
      completed: false,
    },
  });

  await prisma.task.upsert({
    where: { id: "t_portfolio_about" },
    update: {},
    create: {
      id: "t_portfolio_about",
      questId: "q_portfolio",
      title: "Update About section",
      dueDate: "2025-12-30",
      completed: false,
    },
  });

  await prisma.task.upsert({
    where: { id: "t_ui_cleanup" },
    update: {},
    create: {
      id: "t_ui_cleanup",
      questId: "q_intentionality",
      title: "Refactor layout + pages (done today)",
      dueDate: "2025-12-31",
      completed: true,
    },
  });
}

main()
  .then(async () => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
