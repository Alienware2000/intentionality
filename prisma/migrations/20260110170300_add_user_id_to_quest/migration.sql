/*
  Warnings:

  - Added the required column `userId` to the `Quest` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Quest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_Quest" ("createdAt", "id", "title") SELECT "createdAt", "id", "title" FROM "Quest";
DROP TABLE "Quest";
ALTER TABLE "new_Quest" RENAME TO "Quest";
CREATE INDEX "Quest_userId_idx" ON "Quest"("userId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
