-- CreateEnum
CREATE TYPE "EditRequestKind" AS ENUM ('REQUEST', 'QUESTION');

-- CreateEnum
CREATE TYPE "EditRequestStatus" AS ENUM ('OPEN', 'RESPONDED', 'RESOLVED', 'ANSWERED');

-- CreateEnum
CREATE TYPE "EditCommentAction" AS ENUM ('NOTE', 'RESPOND', 'RESOLVE', 'REREQUEST', 'ANSWER');

-- AlterTable
ALTER TABLE "Part" ADD COLUMN     "completedVersionId" TEXT;

-- CreateTable
CREATE TABLE "EditRequest" (
    "id" TEXT NOT NULL,
    "partId" TEXT NOT NULL,
    "versionId" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "kind" "EditRequestKind" NOT NULL,
    "status" "EditRequestStatus" NOT NULL DEFAULT 'OPEN',
    "page" INTEGER NOT NULL,
    "x" DOUBLE PRECISION NOT NULL,
    "y" DOUBLE PRECISION NOT NULL,
    "w" DOUBLE PRECISION NOT NULL,
    "h" DOUBLE PRECISION NOT NULL,
    "body" TEXT NOT NULL,
    "authorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EditRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EditRequestComment" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "authorId" TEXT,
    "body" TEXT NOT NULL DEFAULT '',
    "action" "EditCommentAction" NOT NULL DEFAULT 'NOTE',
    "versionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EditRequestComment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EditRequest_partId_status_idx" ON "EditRequest"("partId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "EditRequest_partId_number_key" ON "EditRequest"("partId", "number");

-- CreateIndex
CREATE INDEX "EditRequestComment_requestId_idx" ON "EditRequestComment"("requestId");

-- AddForeignKey
ALTER TABLE "EditRequest" ADD CONSTRAINT "EditRequest_partId_fkey" FOREIGN KEY ("partId") REFERENCES "Part"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EditRequest" ADD CONSTRAINT "EditRequest_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "Version"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EditRequest" ADD CONSTRAINT "EditRequest_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EditRequestComment" ADD CONSTRAINT "EditRequestComment_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "EditRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EditRequestComment" ADD CONSTRAINT "EditRequestComment_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EditRequestComment" ADD CONSTRAINT "EditRequestComment_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "Version"("id") ON DELETE SET NULL ON UPDATE CASCADE;
