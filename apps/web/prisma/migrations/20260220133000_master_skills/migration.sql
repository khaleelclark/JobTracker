-- CreateTable
CREATE TABLE "master_skills" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "category" TEXT,
    "notes" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "resume_master_skills" (
    "resume_id" TEXT NOT NULL,
    "master_skill_id" TEXT NOT NULL,

    PRIMARY KEY ("resume_id", "master_skill_id"),
    CONSTRAINT "resume_master_skills_resume_id_fkey" FOREIGN KEY ("resume_id") REFERENCES "resumes" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "resume_master_skills_master_skill_id_fkey" FOREIGN KEY ("master_skill_id") REFERENCES "master_skills" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "master_skills_category_idx" ON "master_skills"("category");

-- CreateIndex
CREATE UNIQUE INDEX "master_skills_name_key" ON "master_skills"("name");
