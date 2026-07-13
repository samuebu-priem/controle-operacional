ALTER TABLE "YardLocation" ALTER COLUMN "branch" TYPE TEXT USING "branch"::TEXT;
ALTER TABLE "YardLocationHistory" ALTER COLUMN "branch" TYPE TEXT USING "branch"::TEXT;
ALTER TABLE "YardLocation" ALTER COLUMN "sector" TYPE TEXT USING "sector"::TEXT;
ALTER TABLE "YardLocationHistory" ALTER COLUMN "sector" TYPE TEXT USING "sector"::TEXT;

DROP TYPE "YardBranch";
DROP TYPE "YardSector";

CREATE TABLE "YardMap" (
    "id" TEXT NOT NULL,
    "branch" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "document" JSONB NOT NULL,
    "revision" INTEGER NOT NULL DEFAULT 1,
    "createdById" TEXT NOT NULL,
    "updatedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "YardMap_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "YardMap_branch_key" ON "YardMap"("branch");
CREATE INDEX "YardMap_updatedAt_idx" ON "YardMap"("updatedAt");
CREATE INDEX "YardMap_createdById_idx" ON "YardMap"("createdById");
CREATE INDEX "YardMap_updatedById_idx" ON "YardMap"("updatedById");

ALTER TABLE "YardMap" ADD CONSTRAINT "YardMap_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "YardMap" ADD CONSTRAINT "YardMap_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
