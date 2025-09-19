/*
  Warnings:

  - The values [void] on the enum `PaymentStatus` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `createdAt` on the `Case` table. All the data in the column will be lost.
  - You are about to drop the column `destinationCountry` on the `Case` table. All the data in the column will be lost.
  - You are about to drop the column `originCountry` on the `Case` table. All the data in the column will be lost.
  - You are about to drop the column `status` on the `Case` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `Case` table. All the data in the column will be lost.
  - You are about to drop the column `visaType` on the `Case` table. All the data in the column will be lost.
  - You are about to alter the column `totalFee` on the `Case` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Integer`.
  - You are about to drop the column `createdAt` on the `Document` table. All the data in the column will be lost.
  - You are about to drop the column `gcsBucket` on the `Document` table. All the data in the column will be lost.
  - You are about to drop the column `gcsObject` on the `Document` table. All the data in the column will be lost.
  - You are about to drop the column `mimeType` on the `Document` table. All the data in the column will be lost.
  - You are about to drop the column `reviewedAt` on the `Document` table. All the data in the column will be lost.
  - You are about to drop the column `reviewedById` on the `Document` table. All the data in the column will be lost.
  - You are about to drop the column `sizeBytes` on the `Document` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `Document` table. All the data in the column will be lost.
  - You are about to drop the column `uploadedById` on the `Document` table. All the data in the column will be lost.
  - You are about to drop the column `url` on the `Document` table. All the data in the column will be lost.
  - You are about to drop the column `attachmentDocumentId` on the `Message` table. All the data in the column will be lost.
  - You are about to drop the column `sender` on the `Message` table. All the data in the column will be lost.
  - You are about to drop the column `senderUserId` on the `Message` table. All the data in the column will be lost.
  - You are about to drop the column `amountCents` on the `Payment` table. All the data in the column will be lost.
  - You are about to drop the column `dueDate` on the `Payment` table. All the data in the column will be lost.
  - You are about to drop the column `issuedAt` on the `Payment` table. All the data in the column will be lost.
  - You are about to drop the column `paidAt` on the `Payment` table. All the data in the column will be lost.
  - You are about to drop the column `paymentMethod` on the `Payment` table. All the data in the column will be lost.
  - You are about to drop the column `stripePiId` on the `Payment` table. All the data in the column will be lost.
  - You are about to drop the column `stripeSessionId` on the `Payment` table. All the data in the column will be lost.
  - You are about to drop the column `title` on the `Payment` table. All the data in the column will be lost.
  - You are about to alter the column `amount` on the `Payment` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Integer`.
  - You are about to drop the column `image` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `phone` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `preferredLanguage` on the `User` table. All the data in the column will be lost.
  - You are about to drop the `Account` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `AuditLog` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `DocumentRequest` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `DocumentType` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `JourneyStage` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Session` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Task` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `TermsAcceptance` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `VerificationToken` table. If the table is not empty, all the data it contains will be lost.
  - Changed the type of `overallStatus` on the `Case` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Made the column `invoiceNumber` on table `Payment` required. This step will fail if there are existing NULL values in that column.

*/
-- CreateEnum
CREATE TYPE "Direction" AS ENUM ('INCOMING', 'OUTGOING');

-- AlterEnum
BEGIN;
CREATE TYPE "PaymentStatus_new" AS ENUM ('paid', 'unpaid', 'overdue');
ALTER TABLE "Payment" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Payment" ALTER COLUMN "status" TYPE "PaymentStatus_new" USING ("status"::text::"PaymentStatus_new");
ALTER TYPE "PaymentStatus" RENAME TO "PaymentStatus_old";
ALTER TYPE "PaymentStatus_new" RENAME TO "PaymentStatus";
DROP TYPE "PaymentStatus_old";
COMMIT;

-- DropForeignKey
ALTER TABLE "Account" DROP CONSTRAINT "Account_userId_fkey";

-- DropForeignKey
ALTER TABLE "AuditLog" DROP CONSTRAINT "AuditLog_caseId_fkey";

-- DropForeignKey
ALTER TABLE "AuditLog" DROP CONSTRAINT "AuditLog_userId_fkey";

-- DropForeignKey
ALTER TABLE "Document" DROP CONSTRAINT "Document_reviewedById_fkey";

-- DropForeignKey
ALTER TABLE "Document" DROP CONSTRAINT "Document_uploadedById_fkey";

-- DropForeignKey
ALTER TABLE "DocumentRequest" DROP CONSTRAINT "DocumentRequest_caseId_fkey";

-- DropForeignKey
ALTER TABLE "JourneyStage" DROP CONSTRAINT "JourneyStage_caseId_fkey";

-- DropForeignKey
ALTER TABLE "Message" DROP CONSTRAINT "Message_senderUserId_fkey";

-- DropForeignKey
ALTER TABLE "Session" DROP CONSTRAINT "Session_userId_fkey";

-- DropForeignKey
ALTER TABLE "Task" DROP CONSTRAINT "Task_assignedTo_fkey";

-- DropForeignKey
ALTER TABLE "Task" DROP CONSTRAINT "Task_caseId_fkey";

-- DropForeignKey
ALTER TABLE "Task" DROP CONSTRAINT "Task_createdBy_fkey";

-- DropForeignKey
ALTER TABLE "TermsAcceptance" DROP CONSTRAINT "TermsAcceptance_userId_fkey";

-- DropIndex
DROP INDEX "Payment_invoiceNumber_key";

-- AlterTable
ALTER TABLE "Case" DROP COLUMN "createdAt",
DROP COLUMN "destinationCountry",
DROP COLUMN "originCountry",
DROP COLUMN "status",
DROP COLUMN "updatedAt",
DROP COLUMN "visaType",
ALTER COLUMN "stage" DROP DEFAULT,
DROP COLUMN "overallStatus",
ADD COLUMN     "overallStatus" "CaseStatus" NOT NULL,
ALTER COLUMN "totalFee" SET DATA TYPE INTEGER;

-- AlterTable
ALTER TABLE "Document" DROP COLUMN "createdAt",
DROP COLUMN "gcsBucket",
DROP COLUMN "gcsObject",
DROP COLUMN "mimeType",
DROP COLUMN "reviewedAt",
DROP COLUMN "reviewedById",
DROP COLUMN "sizeBytes",
DROP COLUMN "updatedAt",
DROP COLUMN "uploadedById",
DROP COLUMN "url",
ALTER COLUMN "state" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Message" DROP COLUMN "attachmentDocumentId",
DROP COLUMN "sender",
DROP COLUMN "senderUserId";

-- AlterTable
ALTER TABLE "Payment" DROP COLUMN "amountCents",
DROP COLUMN "dueDate",
DROP COLUMN "issuedAt",
DROP COLUMN "paidAt",
DROP COLUMN "paymentMethod",
DROP COLUMN "stripePiId",
DROP COLUMN "stripeSessionId",
DROP COLUMN "title",
ALTER COLUMN "amount" SET DATA TYPE INTEGER,
ALTER COLUMN "currency" DROP DEFAULT,
ALTER COLUMN "status" DROP DEFAULT,
ALTER COLUMN "invoiceNumber" SET NOT NULL;

-- AlterTable
ALTER TABLE "User" DROP COLUMN "image",
DROP COLUMN "phone",
DROP COLUMN "preferredLanguage";

-- DropTable
DROP TABLE "Account";

-- DropTable
DROP TABLE "AuditLog";

-- DropTable
DROP TABLE "DocumentRequest";

-- DropTable
DROP TABLE "DocumentType";

-- DropTable
DROP TABLE "JourneyStage";

-- DropTable
DROP TABLE "Session";

-- DropTable
DROP TABLE "Task";

-- DropTable
DROP TABLE "TermsAcceptance";

-- DropTable
DROP TABLE "VerificationToken";

-- DropEnum
DROP TYPE "VisaType";

-- CreateTable
CREATE TABLE "PartnerRole" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "PartnerRole_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExternalPartner" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "type" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,

    CONSTRAINT "ExternalPartner_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExternalCommunication" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "direction" "Direction" NOT NULL,
    "body" TEXT NOT NULL,
    "sender" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,

    CONSTRAINT "ExternalCommunication_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TimelineEvent" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "details" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,

    CONSTRAINT "TimelineEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PartnerRole_name_key" ON "PartnerRole"("name");

-- AddForeignKey
ALTER TABLE "ExternalPartner" ADD CONSTRAINT "ExternalPartner_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExternalPartner" ADD CONSTRAINT "ExternalPartner_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "PartnerRole"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExternalCommunication" ADD CONSTRAINT "ExternalCommunication_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimelineEvent" ADD CONSTRAINT "TimelineEvent_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
