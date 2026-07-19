-- AlterTable
ALTER TABLE "Provider" ADD COLUMN "previousOwnerUserId" TEXT;
ALTER TABLE "Provider" ADD COLUMN "ownerTransferredAt" TIMESTAMP(3);
