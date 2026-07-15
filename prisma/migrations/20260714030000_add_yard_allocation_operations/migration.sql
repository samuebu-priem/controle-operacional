CREATE TYPE "PatioAllocationOrigin" AS ENUM ('INITIAL_INVENTORY', 'MANUAL_ALLOCATION', 'MANUAL_MOVE', 'MANUAL_RELEASE');

ALTER TABLE "PatioAllocation"
  ADD COLUMN "branch" TEXT,
  ADD COLUMN "origin" "PatioAllocationOrigin" NOT NULL DEFAULT 'MANUAL_ALLOCATION',
  ADD COLUMN "releaseOrigin" "PatioAllocationOrigin",
  ADD COLUMN "registeredAt" TIMESTAMP(3),
  ADD COLUMN "updatedAt" TIMESTAMP(3);

UPDATE "PatioAllocation" allocation
SET "branch" = patio."branch",
    "registeredAt" = allocation."createdAt",
    "updatedAt" = COALESCE(allocation."releasedAt", allocation."createdAt")
FROM "PatioArea" area
JOIN "Patio" patio ON patio."id" = area."patioId"
WHERE allocation."areaId" = area."id";

ALTER TABLE "PatioAllocation"
  ALTER COLUMN "branch" SET NOT NULL,
  ALTER COLUMN "registeredAt" SET NOT NULL,
  ALTER COLUMN "registeredAt" SET DEFAULT CURRENT_TIMESTAMP,
  ALTER COLUMN "updatedAt" SET NOT NULL;

DROP INDEX IF EXISTS "PatioAllocation_active_fleet_key";
CREATE UNIQUE INDEX "PatioAllocation_active_fleet_branch_key"
  ON "PatioAllocation"("fleetId", "branch") WHERE "releasedAt" IS NULL;

DROP INDEX IF EXISTS "PatioAllocation_fleetId_releasedAt_createdAt_idx";
CREATE INDEX "PatioAllocation_fleetId_branch_releasedAt_createdAt_idx"
  ON "PatioAllocation"("fleetId", "branch", "releasedAt", "createdAt");
CREATE INDEX "PatioAllocation_branch_updatedAt_idx" ON "PatioAllocation"("branch", "updatedAt");
