-- Add optional per-skill experience for better context in UI + LLM snapshots
ALTER TABLE "master_skills" ADD COLUMN "experience_years" REAL;
