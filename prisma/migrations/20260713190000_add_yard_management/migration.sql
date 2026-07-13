-- CreateEnum
CREATE TYPE "YardBranch" AS ENUM ('PAULINIA');

-- CreateEnum
CREATE TYPE "YardLocationAccuracy" AS ENUM ('EXACT', 'APPROXIMATE');

-- CreateEnum
CREATE TYPE "YardLocationSource" AS ENUM ('MANUAL', 'OCR');

-- CreateTable
CREATE TABLE "YardLocation" (
    "id" TEXT NOT NULL,
    "fleetId" TEXT NOT NULL,
    "branch" "YardBranch" NOT NULL,
    "xPercent" DOUBLE PRECISION NOT NULL,
    "yPercent" DOUBLE PRECISION NOT NULL,
    "note" TEXT,
    "accuracy" "YardLocationAccuracy" NOT NULL,
    "source" "YardLocationSource" NOT NULL DEFAULT 'MANUAL',
    "updatedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "YardLocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "YardLocationHistory" (
    "id" TEXT NOT NULL,
    "fleetId" TEXT NOT NULL,
    "branch" "YardBranch" NOT NULL,
    "xPercent" DOUBLE PRECISION NOT NULL,
    "yPercent" DOUBLE PRECISION NOT NULL,
    "note" TEXT,
    "accuracy" "YardLocationAccuracy" NOT NULL,
    "source" "YardLocationSource" NOT NULL DEFAULT 'MANUAL',
    "updatedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "YardLocationHistory_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "YardLocation_fleetId_branch_key" ON "YardLocation"("fleetId", "branch");
CREATE INDEX "YardLocation_branch_updatedAt_idx" ON "YardLocation"("branch", "updatedAt");
CREATE INDEX "YardLocation_updatedById_idx" ON "YardLocation"("updatedById");
CREATE INDEX "YardLocationHistory_fleetId_branch_createdAt_idx" ON "YardLocationHistory"("fleetId", "branch", "createdAt");
CREATE INDEX "YardLocationHistory_branch_createdAt_idx" ON "YardLocationHistory"("branch", "createdAt");
CREATE INDEX "YardLocationHistory_updatedById_idx" ON "YardLocationHistory"("updatedById");

ALTER TABLE "YardLocation" ADD CONSTRAINT "YardLocation_fleetId_fkey" FOREIGN KEY ("fleetId") REFERENCES "Frota"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "YardLocation" ADD CONSTRAINT "YardLocation_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "YardLocationHistory" ADD CONSTRAINT "YardLocationHistory_fleetId_fkey" FOREIGN KEY ("fleetId") REFERENCES "Frota"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "YardLocationHistory" ADD CONSTRAINT "YardLocationHistory_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
