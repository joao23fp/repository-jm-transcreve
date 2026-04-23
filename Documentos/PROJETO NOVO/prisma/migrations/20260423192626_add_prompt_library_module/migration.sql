-- CreateEnum
CREATE TYPE "TipoPrompt" AS ENUM ('Sistema', 'Usuario');

-- CreateTable
CREATE TABLE "PromptFolder" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "parentFolderId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PromptFolder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PromptTemplate" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "folderId" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "body" TEXT NOT NULL,
    "type" "TipoPrompt" NOT NULL DEFAULT 'Usuario',
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PromptTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PromptApplication" (
    "id" TEXT NOT NULL,
    "fileId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "promptId" TEXT NOT NULL,
    "appliedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PromptApplication_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PromptFolder_userId_parentFolderId_idx" ON "PromptFolder"("userId", "parentFolderId");

-- CreateIndex
CREATE INDEX "PromptTemplate_userId_type_isDeleted_idx" ON "PromptTemplate"("userId", "type", "isDeleted");

-- CreateIndex
CREATE INDEX "PromptTemplate_folderId_idx" ON "PromptTemplate"("folderId");

-- CreateIndex
CREATE UNIQUE INDEX "PromptTemplate_userId_folderId_name_key" ON "PromptTemplate"("userId", "folderId", "name");

-- CreateIndex
CREATE INDEX "PromptApplication_userId_fileId_idx" ON "PromptApplication"("userId", "fileId");

-- CreateIndex
CREATE INDEX "PromptApplication_promptId_idx" ON "PromptApplication"("promptId");

-- AddForeignKey
ALTER TABLE "PromptFolder" ADD CONSTRAINT "PromptFolder_parentFolderId_fkey" FOREIGN KEY ("parentFolderId") REFERENCES "PromptFolder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PromptTemplate" ADD CONSTRAINT "PromptTemplate_folderId_fkey" FOREIGN KEY ("folderId") REFERENCES "PromptFolder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PromptApplication" ADD CONSTRAINT "PromptApplication_promptId_fkey" FOREIGN KEY ("promptId") REFERENCES "PromptTemplate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
