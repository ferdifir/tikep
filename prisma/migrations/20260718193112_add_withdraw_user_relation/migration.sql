-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_WithdrawRequest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "walletId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "method" TEXT NOT NULL DEFAULT 'BI_FAST',
    "accountName" TEXT NOT NULL DEFAULT '',
    "accountNumber" TEXT NOT NULL DEFAULT '',
    "adminFee" INTEGER NOT NULL DEFAULT 0,
    "netAmount" INTEGER NOT NULL DEFAULT 0,
    "payoutDetails" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "developerNotifiedAt" DATETIME,
    "paidAt" DATETIME,
    "rejectedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "WithdrawRequest_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "Wallet" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "WithdrawRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_WithdrawRequest" ("accountName", "accountNumber", "adminFee", "amount", "createdAt", "developerNotifiedAt", "id", "method", "netAmount", "paidAt", "payoutDetails", "rejectedAt", "status", "updatedAt", "userId", "walletId") SELECT "accountName", "accountNumber", "adminFee", "amount", "createdAt", "developerNotifiedAt", "id", "method", "netAmount", "paidAt", "payoutDetails", "rejectedAt", "status", "updatedAt", "userId", "walletId" FROM "WithdrawRequest";
DROP TABLE "WithdrawRequest";
ALTER TABLE "new_WithdrawRequest" RENAME TO "WithdrawRequest";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
