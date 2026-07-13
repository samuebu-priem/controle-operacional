CREATE TYPE "YardSector" AS ENUM ('A', 'B', 'C', 'D', 'E', 'F', 'G', 'H');

ALTER TABLE "YardLocation" ADD COLUMN "sector" "YardSector";
ALTER TABLE "YardLocationHistory" ADD COLUMN "sector" "YardSector";

CREATE INDEX "YardLocation_branch_sector_updatedAt_idx" ON "YardLocation"("branch", "sector", "updatedAt");
CREATE INDEX "YardLocationHistory_branch_sector_createdAt_idx" ON "YardLocationHistory"("branch", "sector", "createdAt");
