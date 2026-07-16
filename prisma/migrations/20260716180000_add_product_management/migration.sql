CREATE TYPE "ProductRiskLevel" AS ENUM ('LOW', 'MEDIUM', 'HIGH');
CREATE TYPE "ProductWashDifficulty" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

CREATE TABLE "ProductFamily" (
  "id" TEXT NOT NULL, "name" TEXT NOT NULL, "slug" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ProductFamily_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ProductFamily_slug_key" ON "ProductFamily"("slug");
CREATE INDEX "ProductFamily_name_idx" ON "ProductFamily"("name");

CREATE TABLE "Manufacturer" (
  "id" TEXT NOT NULL, "name" TEXT NOT NULL, "slug" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Manufacturer_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Manufacturer_slug_key" ON "Manufacturer"("slug");
CREATE INDEX "Manufacturer_name_idx" ON "Manufacturer"("name");

CREATE TABLE "Product" (
  "id" TEXT NOT NULL, "name" TEXT NOT NULL, "normalizedName" TEXT NOT NULL,
  "chemicalName" TEXT, "internalCode" TEXT, "unNumber" TEXT,
  "manufacturerId" TEXT, "familyId" TEXT, "physicalState" TEXT, "color" TEXT,
  "odor" TEXT, "polarity" TEXT, "solubility" TEXT, "flammability" TEXT,
  "corrosivity" TEXT, "toxicity" TEXT, "riskClass" TEXT,
  "riskLevel" "ProductRiskLevel" NOT NULL DEFAULT 'LOW',
  "requiresSteam" BOOLEAN NOT NULL DEFAULT false, "washType" TEXT,
  "recommendedCleaningProducts" TEXT,
  "washDifficulty" "ProductWashDifficulty" NOT NULL DEFAULT 'LOW',
  "averageWashMinutes" INTEGER, "criticalPoints" TEXT, "residueHidePoints" TEXT,
  "mainRejectionCauses" TEXT, "approvalCriteria" TEXT, "notes" TEXT,
  "manualVersion" TEXT, "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Product_normalizedName_key" ON "Product"("normalizedName");
CREATE UNIQUE INDEX "Product_internalCode_key" ON "Product"("internalCode");
CREATE INDEX "Product_name_idx" ON "Product"("name");
CREATE INDEX "Product_chemicalName_idx" ON "Product"("chemicalName");
CREATE INDEX "Product_unNumber_idx" ON "Product"("unNumber");
CREATE INDEX "Product_familyId_idx" ON "Product"("familyId");
CREATE INDEX "Product_manufacturerId_idx" ON "Product"("manufacturerId");
CREATE INDEX "Product_riskClass_idx" ON "Product"("riskClass");
CREATE INDEX "Product_active_updatedAt_idx" ON "Product"("active", "updatedAt");

CREATE TABLE "ProductAlias" (
  "id" TEXT NOT NULL, "productId" TEXT NOT NULL, "name" TEXT NOT NULL,
  "normalizedName" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ProductAlias_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ProductAlias_normalizedName_key" ON "ProductAlias"("normalizedName");
CREATE INDEX "ProductAlias_productId_idx" ON "ProductAlias"("productId");
CREATE INDEX "ProductAlias_name_idx" ON "ProductAlias"("name");

CREATE TABLE "ProductHistory" (
  "id" TEXT NOT NULL, "productId" TEXT NOT NULL, "changedById" TEXT,
  "action" TEXT NOT NULL, "source" TEXT, "changes" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ProductHistory_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ProductHistory_productId_createdAt_idx" ON "ProductHistory"("productId", "createdAt");
CREATE INDEX "ProductHistory_changedById_idx" ON "ProductHistory"("changedById");

CREATE TABLE "ProductDocument" (
  "id" TEXT NOT NULL, "productId" TEXT, "uploadedById" TEXT,
  "fileName" TEXT NOT NULL, "fileUrl" TEXT NOT NULL, "mimeType" TEXT NOT NULL,
  "version" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ProductDocument_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ProductDocument_productId_createdAt_idx" ON "ProductDocument"("productId", "createdAt");
CREATE INDEX "ProductDocument_uploadedById_idx" ON "ProductDocument"("uploadedById");

CREATE TABLE "ProductInspectionHistory" (
  "id" TEXT NOT NULL, "productId" TEXT NOT NULL, "inspectionId" TEXT NOT NULL,
  "washTimeMinutes" INTEGER, "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ProductInspectionHistory_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ProductInspectionHistory_inspectionId_key" ON "ProductInspectionHistory"("inspectionId");
CREATE INDEX "ProductInspectionHistory_productId_createdAt_idx" ON "ProductInspectionHistory"("productId", "createdAt");

ALTER TABLE "Product" ADD CONSTRAINT "Product_manufacturerId_fkey" FOREIGN KEY ("manufacturerId") REFERENCES "Manufacturer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Product" ADD CONSTRAINT "Product_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "ProductFamily"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ProductAlias" ADD CONSTRAINT "ProductAlias_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProductHistory" ADD CONSTRAINT "ProductHistory_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProductHistory" ADD CONSTRAINT "ProductHistory_changedById_fkey" FOREIGN KEY ("changedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ProductDocument" ADD CONSTRAINT "ProductDocument_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProductDocument" ADD CONSTRAINT "ProductDocument_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ProductInspectionHistory" ADD CONSTRAINT "ProductInspectionHistory_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ProductInspectionHistory" ADD CONSTRAINT "ProductInspectionHistory_inspectionId_fkey" FOREIGN KEY ("inspectionId") REFERENCES "Inspecao"("id") ON DELETE CASCADE ON UPDATE CASCADE;
