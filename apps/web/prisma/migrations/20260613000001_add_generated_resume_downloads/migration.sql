CREATE TABLE "generated_resume_downloads" (
  "id"         TEXT NOT NULL PRIMARY KEY,
  "file_name"  TEXT NOT NULL,
  "file_path"  TEXT NOT NULL,
  "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expires_at" DATETIME NOT NULL
);
