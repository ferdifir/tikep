PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;

CREATE TABLE "new_Category" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "deletedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

INSERT INTO "new_Category" ("id", "slug", "name", "deletedAt", "createdAt", "updatedAt")
SELECT
    "id",
    CASE
        WHEN EXISTS (
            SELECT 1
            FROM "Category" AS "earlier"
            WHERE "earlier"."slug" = "Category"."slug"
              AND "earlier"."rowid" < "Category"."rowid"
        )
        THEN "slug" || '-' || substr("id", -6)
        ELSE "slug"
    END,
    "name",
    "deletedAt",
    "createdAt",
    "updatedAt"
FROM "Category";

DROP TABLE "Category";
ALTER TABLE "new_Category" RENAME TO "Category";
CREATE UNIQUE INDEX "Category_slug_key" ON "Category"("slug");

PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
