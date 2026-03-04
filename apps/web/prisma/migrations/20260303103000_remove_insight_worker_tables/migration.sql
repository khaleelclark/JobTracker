-- Remove insight-card and worker-run persistence tables.
DROP TABLE IF EXISTS "ui_cards";
DROP TABLE IF EXISTS "llm_run_queue";
DROP TABLE IF EXISTS "llm_runs";
