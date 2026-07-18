ALTER TABLE "ServiceInquiry" ADD COLUMN "providerNotificationStatus" TEXT;
ALTER TABLE "ServiceInquiry" ADD COLUMN "providerNotificationError" TEXT;
ALTER TABLE "ServiceInquiry" ADD COLUMN "providerMessageEditedAt" DATETIME;
ALTER TABLE "ServiceInquiry" ADD COLUMN "customerNotificationStatus" TEXT;
ALTER TABLE "ServiceInquiry" ADD COLUMN "customerNotificationError" TEXT;
ALTER TABLE "ServiceInquiry" ADD COLUMN "reviewInvitedAt" DATETIME;
ALTER TABLE "ServiceInquiry" ADD COLUMN "reviewInviteStatus" TEXT;
ALTER TABLE "ServiceInquiry" ADD COLUMN "reviewInviteError" TEXT;
