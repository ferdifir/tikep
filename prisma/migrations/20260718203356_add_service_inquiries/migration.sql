-- CreateTable
CREATE TABLE "ServiceInquiry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "serviceId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "customerUserId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'REQUESTED',
    "message" TEXT,
    "providerMessageId" INTEGER,
    "customerNotifiedAt" DATETIME,
    "providerRespondedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ServiceInquiry_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ServiceInquiry_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "Provider" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ServiceInquiry_customerUserId_fkey" FOREIGN KEY ("customerUserId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ReviewCode" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "serviceId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "createdByUserId" TEXT NOT NULL,
    "usedByUserId" TEXT,
    "codeHash" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "customerChatId" TEXT,
    "inquiryId" TEXT,
    "sentAt" DATETIME,
    "usedAt" DATETIME,
    "expiresAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ReviewCode_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ReviewCode_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "Provider" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ReviewCode_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ReviewCode_usedByUserId_fkey" FOREIGN KEY ("usedByUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ReviewCode_inquiryId_fkey" FOREIGN KEY ("inquiryId") REFERENCES "ServiceInquiry" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_ReviewCode" ("codeHash", "createdAt", "createdByUserId", "customerChatId", "expiresAt", "id", "providerId", "sentAt", "serviceId", "status", "usedAt", "usedByUserId") SELECT "codeHash", "createdAt", "createdByUserId", "customerChatId", "expiresAt", "id", "providerId", "sentAt", "serviceId", "status", "usedAt", "usedByUserId" FROM "ReviewCode";
DROP TABLE "ReviewCode";
ALTER TABLE "new_ReviewCode" RENAME TO "ReviewCode";
CREATE UNIQUE INDEX "ReviewCode_codeHash_key" ON "ReviewCode"("codeHash");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "ServiceInquiry_serviceId_customerUserId_key" ON "ServiceInquiry"("serviceId", "customerUserId");
