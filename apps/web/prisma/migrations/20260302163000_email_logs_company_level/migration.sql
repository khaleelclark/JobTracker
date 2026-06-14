PRAGMA foreign_keys=OFF;

CREATE TABLE "new_email_logs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "application_id" TEXT,
    "company_name" TEXT,
    "channel" TEXT NOT NULL DEFAULT 'email',
    "direction" TEXT NOT NULL,
    "is_human" BOOLEAN NOT NULL,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "notes" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "email_logs_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "applications" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "email_logs_target_check" CHECK (("application_id" IS NOT NULL AND "company_name" IS NULL) OR ("application_id" IS NULL AND "company_name" IS NOT NULL))
);

INSERT INTO "new_email_logs" (
    "id",
    "application_id",
    "company_name",
    "channel",
    "direction",
    "is_human",
    "subject",
    "body",
    "notes",
    "created_at"
)
SELECT
    "id",
    "application_id",
    NULL,
    "channel",
    "direction",
    "is_human",
    "subject",
    "body",
    "notes",
    "created_at"
FROM "email_logs";

DROP TABLE "email_logs";
ALTER TABLE "new_email_logs" RENAME TO "email_logs";

CREATE INDEX "email_logs_application_id_created_at_idx" ON "email_logs"("application_id", "created_at");
CREATE INDEX "email_logs_company_name_created_at_idx" ON "email_logs"("company_name", "created_at");

PRAGMA foreign_keys=ON;
