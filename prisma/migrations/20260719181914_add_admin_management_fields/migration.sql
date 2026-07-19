-- AlterTable
ALTER TABLE "Category" ADD COLUMN "deletedAt" DATETIME;

-- AlterTable
ALTER TABLE "Media" ADD COLUMN "deletedAt" DATETIME;

-- AlterTable
ALTER TABLE "User" ADD COLUMN "deletedAt" DATETIME;
ALTER TABLE "User" ADD COLUMN "suspendedAt" DATETIME;
