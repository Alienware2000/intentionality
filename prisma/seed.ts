import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

const adapter = new PrismaBetterSqlite3({
  url: process.env.DATABASE_URL!, // e.g. "file:./dev.db"
});

const prisma = new PrismaClient({ adapter });


async function main() {
  // Intentionally empty.
  // After auth ownership is wired, we'll create per-user onboarding data.
}

main()
  .then(async () => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
