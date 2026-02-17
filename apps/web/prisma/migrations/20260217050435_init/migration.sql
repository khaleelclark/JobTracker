-- CreateTable
CREATE TABLE "applications" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "company_name" TEXT NOT NULL,
    "role_title" TEXT NOT NULL,
    "generic_status" TEXT NOT NULL,
    "precise_status" TEXT,
    "role_family" TEXT,
    "role_level" TEXT,
    "applied_at" DATETIME NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    "notes" TEXT
);

-- CreateTable
CREATE TABLE "resumes" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "file_path" TEXT NOT NULL,
    "extracted_text" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "application_resumes" (
    "application_id" TEXT NOT NULL,
    "resume_id" TEXT NOT NULL,

    PRIMARY KEY ("application_id", "resume_id"),
    CONSTRAINT "application_resumes_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "applications" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "application_resumes_resume_id_fkey" FOREIGN KEY ("resume_id") REFERENCES "resumes" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "interviews" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "application_id" TEXT NOT NULL,
    "round_index" INTEGER NOT NULL,
    "round_label" TEXT NOT NULL,
    "scheduled_at" DATETIME NOT NULL,
    "status" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "interviews_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "applications" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "interview_reflections" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "interview_id" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "outcome" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "interview_reflections_interview_id_fkey" FOREIGN KEY ("interview_id") REFERENCES "interviews" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "email_logs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "application_id" TEXT NOT NULL,
    "direction" TEXT NOT NULL,
    "is_human" BOOLEAN NOT NULL,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "email_logs_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "applications" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "followup_attempts" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "application_id" TEXT NOT NULL,
    "attempt_index" INTEGER NOT NULL,
    "channel" TEXT NOT NULL,
    "sent_at" DATETIME NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "followup_attempts_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "applications" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "followup_results" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "followup_attempt_id" TEXT NOT NULL,
    "result_status" TEXT NOT NULL,
    "response_type" TEXT,
    "resolved_at" DATETIME,
    CONSTRAINT "followup_results_followup_attempt_id_fkey" FOREIGN KEY ("followup_attempt_id") REFERENCES "followup_attempts" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "engagement_events" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "application_id" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "occurred_at" DATETIME NOT NULL,
    CONSTRAINT "engagement_events_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "applications" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ui_cards" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "card_type" TEXT NOT NULL,
    "priority" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "evidence_json" TEXT NOT NULL,
    "suggested_gpt_prompt" TEXT,
    "related_application_id" TEXT,
    "related_interview_id" TEXT,
    "state" TEXT NOT NULL DEFAULT 'active',
    "snoozed_until" DATETIME,
    "expires_at" DATETIME,
    "dedupe_key" TEXT NOT NULL,
    CONSTRAINT "ui_cards_related_application_id_fkey" FOREIGN KEY ("related_application_id") REFERENCES "applications" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ui_cards_related_interview_id_fkey" FOREIGN KEY ("related_interview_id") REFERENCES "interviews" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "llm_run_queue" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "pending" BOOLEAN NOT NULL DEFAULT false,
    "last_run_started_at" DATETIME,
    "last_run_finished_at" DATETIME,
    "cooldown_until" DATETIME
);

-- CreateTable
CREATE TABLE "llm_runs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "started_at" DATETIME NOT NULL,
    "finished_at" DATETIME,
    "cards_created_count" INTEGER NOT NULL DEFAULT 0,
    "error" TEXT
);

-- CreateIndex
CREATE INDEX "applications_generic_status_idx" ON "applications"("generic_status");

-- CreateIndex
CREATE INDEX "applications_applied_at_idx" ON "applications"("applied_at");

-- CreateIndex
CREATE INDEX "interviews_application_id_scheduled_at_idx" ON "interviews"("application_id", "scheduled_at");

-- CreateIndex
CREATE UNIQUE INDEX "interview_reflections_interview_id_key" ON "interview_reflections"("interview_id");

-- CreateIndex
CREATE INDEX "email_logs_application_id_created_at_idx" ON "email_logs"("application_id", "created_at");

-- CreateIndex
CREATE INDEX "followup_attempts_application_id_sent_at_idx" ON "followup_attempts"("application_id", "sent_at");

-- CreateIndex
CREATE UNIQUE INDEX "followup_results_followup_attempt_id_key" ON "followup_results"("followup_attempt_id");

-- CreateIndex
CREATE INDEX "engagement_events_application_id_occurred_at_idx" ON "engagement_events"("application_id", "occurred_at");

-- CreateIndex
CREATE INDEX "ui_cards_state_priority_idx" ON "ui_cards"("state", "priority");

-- CreateIndex
CREATE INDEX "ui_cards_dedupe_key_state_idx" ON "ui_cards"("dedupe_key", "state");
