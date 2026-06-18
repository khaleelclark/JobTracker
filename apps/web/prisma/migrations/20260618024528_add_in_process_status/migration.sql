/*
  Warnings:

  - You are about to drop the `master_skills` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `resume_master_skills` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "master_skills";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "resume_master_skills";
PRAGMA foreign_keys=on;
