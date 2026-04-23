-- CreateEnum
CREATE TYPE "StatusClipe" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "FormatoExport" AS ENUM ('VIDEO', 'PDF', 'WORD');

-- CreateTable
CREATE TABLE "VideoClip" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "fileId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "startMs" INTEGER NOT NULL,
    "endMs" INTEGER NOT NULL,
    "durationSeconds" DOUBLE PRECISION NOT NULL,
    "transcriptText" TEXT NOT NULL,
    "status" "StatusClipe" NOT NULL DEFAULT 'PENDING',
    "clipStoragePath" TEXT,
    "thumbnailPath" TEXT,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "VideoClip_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExportJob" (
    "id" TEXT NOT NULL,
    "videoClipId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "format" "FormatoExport" NOT NULL,
    "status" "StatusClipe" NOT NULL DEFAULT 'PENDING',
    "fileStoragePath" TEXT,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "ExportJob_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "VideoClip_userId_fileId_idx" ON "VideoClip"("userId", "fileId");

-- CreateIndex
CREATE INDEX "VideoClip_userId_status_idx" ON "VideoClip"("userId", "status");

-- CreateIndex
CREATE INDEX "ExportJob_userId_videoClipId_idx" ON "ExportJob"("userId", "videoClipId");

-- AddForeignKey
ALTER TABLE "ExportJob" ADD CONSTRAINT "ExportJob_videoClipId_fkey" FOREIGN KEY ("videoClipId") REFERENCES "VideoClip"("id") ON DELETE CASCADE ON UPDATE CASCADE;
