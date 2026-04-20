-- CreateTable
CREATE TABLE "TranscriptSegment" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "sequenceIndex" INTEGER NOT NULL,
    "startMs" INTEGER NOT NULL,
    "endMs" INTEGER NOT NULL,
    "speakerId" TEXT,
    "originalText" TEXT NOT NULL,
    "editedText" TEXT,
    "lastEditedAt" TIMESTAMP(3),
    "wordTimestamps" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TranscriptSegment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SpeakerProfile" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "suggestedTag" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "isRenamed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SpeakerProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChatMessage" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "citedSegmentIds" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChatMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InconsistencyReport" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "primarySegmentId" TEXT NOT NULL,
    "conflictingSegmentId" TEXT NOT NULL,
    "confidenceScore" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InconsistencyReport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TranscriptSegment_jobId_sequenceIndex_idx" ON "TranscriptSegment"("jobId", "sequenceIndex");

-- CreateIndex
CREATE INDEX "TranscriptSegment_jobId_startMs_idx" ON "TranscriptSegment"("jobId", "startMs");

-- CreateIndex
CREATE INDEX "SpeakerProfile_jobId_idx" ON "SpeakerProfile"("jobId");

-- CreateIndex
CREATE UNIQUE INDEX "SpeakerProfile_jobId_suggestedTag_key" ON "SpeakerProfile"("jobId", "suggestedTag");

-- CreateIndex
CREATE INDEX "ChatMessage_jobId_createdAt_idx" ON "ChatMessage"("jobId", "createdAt");

-- CreateIndex
CREATE INDEX "InconsistencyReport_jobId_idx" ON "InconsistencyReport"("jobId");

-- AddForeignKey
ALTER TABLE "TranscriptSegment" ADD CONSTRAINT "TranscriptSegment_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "ProcessingJob"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TranscriptSegment" ADD CONSTRAINT "TranscriptSegment_speakerId_fkey" FOREIGN KEY ("speakerId") REFERENCES "SpeakerProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SpeakerProfile" ADD CONSTRAINT "SpeakerProfile_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "ProcessingJob"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatMessage" ADD CONSTRAINT "ChatMessage_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "ProcessingJob"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InconsistencyReport" ADD CONSTRAINT "InconsistencyReport_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "ProcessingJob"("id") ON DELETE CASCADE ON UPDATE CASCADE;
