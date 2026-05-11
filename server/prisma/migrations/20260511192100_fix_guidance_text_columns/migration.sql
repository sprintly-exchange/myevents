-- Rebuild guidance table to ensure text columns are not constrained to single characters
CREATE TABLE "event_guidance_items_new" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "event_id" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "event_guidance_items_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

INSERT INTO "event_guidance_items_new" ("id", "event_id", "sort_order", "title", "body", "created_at")
SELECT "id", "event_id", "sort_order", "title", "body", "created_at"
FROM "event_guidance_items";

DROP TABLE "event_guidance_items";

ALTER TABLE "event_guidance_items_new" RENAME TO "event_guidance_items";
