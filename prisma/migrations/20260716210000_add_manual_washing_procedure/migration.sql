CREATE TYPE "WashingProcedure" AS ENUM ('WASH_ONLY', 'STEAM_ONLY', 'WASH_AND_STEAM', 'NO_WASH_REQUIRED', 'NOT_DEFINED');

ALTER TABLE "Product"
  ADD COLUMN "washingProcedure" "WashingProcedure" NOT NULL DEFAULT 'NOT_DEFINED',
  ADD COLUMN "washingProcedureNotes" TEXT,
  ADD COLUMN "washingProcedureManualOverride" BOOLEAN NOT NULL DEFAULT false;

-- Compatibilidade inicial. Estes valores não são marcados como decisão manual,
-- portanto o gestor continua podendo revisá-los e uma importação explícita pode sugerir ajustes.
UPDATE "Product"
SET "washingProcedure" = CASE
  WHEN "requiresSteam" = true THEN 'WASH_AND_STEAM'::"WashingProcedure"
  ELSE 'WASH_ONLY'::"WashingProcedure"
END;

ALTER TABLE "ProductInspectionHistory"
  ADD COLUMN "productWashingProcedureSnapshot" "WashingProcedure",
  ADD COLUMN "productWashingNotesSnapshot" TEXT;

CREATE INDEX "Product_washingProcedure_active_idx" ON "Product"("washingProcedure", "active");
