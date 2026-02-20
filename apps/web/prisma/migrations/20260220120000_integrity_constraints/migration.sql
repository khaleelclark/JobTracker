-- CreateIndex
CREATE UNIQUE INDEX "interviews_application_id_round_index_key" ON "interviews"("application_id", "round_index");

-- CreateIndex
CREATE UNIQUE INDEX "followup_attempts_application_id_attempt_index_key" ON "followup_attempts"("application_id", "attempt_index");

-- DropIndex
DROP INDEX "ui_cards_dedupe_key_state_idx";

-- CreateIndex
CREATE UNIQUE INDEX "ui_cards_dedupe_key_state_key" ON "ui_cards"("dedupe_key", "state");
