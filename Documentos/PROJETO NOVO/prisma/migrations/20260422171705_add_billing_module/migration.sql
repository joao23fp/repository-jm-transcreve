-- CreateEnum
CREATE TYPE "TipoTransacao" AS ENUM ('COMPRA', 'BLOQUEIO', 'ESTORNO', 'CONSUMO');

-- CreateEnum
CREATE TYPE "StatusPagamento" AS ENUM ('PENDING', 'SUCCEEDED', 'FAILED', 'EXPIRED');

-- CreateTable
CREATE TABLE "Transaction" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "TipoTransacao" NOT NULL,
    "amountMinutes" DOUBLE PRECISION NOT NULL,
    "refType" TEXT,
    "refId" TEXT,
    "balanceAfter" DOUBLE PRECISION NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Transaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentIntent" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "status" "StatusPagamento" NOT NULL DEFAULT 'PENDING',
    "minutesGranted" INTEGER NOT NULL,
    "planLabel" TEXT NOT NULL,
    "checkoutUrl" TEXT NOT NULL,
    "webhookReceivedAt" TIMESTAMP(3),
    "webhookAttempts" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentIntent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WebhookAlert" (
    "id" TEXT NOT NULL,
    "paymentIntentId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WebhookAlert_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Transaction_userId_createdAt_idx" ON "Transaction"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "Transaction_refType_refId_idx" ON "Transaction"("refType", "refId");

-- CreateIndex
CREATE INDEX "PaymentIntent_userId_status_idx" ON "PaymentIntent"("userId", "status");

-- CreateIndex
CREATE INDEX "PaymentIntent_status_expiresAt_idx" ON "PaymentIntent"("status", "expiresAt");

-- CreateIndex
CREATE INDEX "WebhookAlert_userId_createdAt_idx" ON "WebhookAlert"("userId", "createdAt");
