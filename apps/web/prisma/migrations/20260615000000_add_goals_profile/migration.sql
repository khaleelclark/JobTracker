CREATE TABLE "goals_profile" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'singleton',
    "mission_statement" TEXT NOT NULL DEFAULT '',
    "weekly_applications_target" INTEGER,
    "compensation_preference" TEXT NOT NULL DEFAULT '',
    "preferred_locations" TEXT NOT NULL DEFAULT '',
    "employment_types" TEXT NOT NULL DEFAULT '[]',
    "workplace_modes" TEXT NOT NULL DEFAULT '[]',
    "priority_notes" TEXT NOT NULL DEFAULT '',
    "updated_at" DATETIME NOT NULL
);
