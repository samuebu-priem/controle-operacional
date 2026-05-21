-- CreateEnum safely. Production may already contain these types if a previous
-- deploy attempt created them before failing on the existing Collaborator table.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ResultadoPosLavagem') THEN
    CREATE TYPE "ResultadoPosLavagem" AS ENUM ('APROVADO', 'REPROVADO');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'MotivoNaoConformidade') THEN
    CREATE TYPE "MotivoNaoConformidade" AS ENUM ('FERRUGEM', 'MANCHA', 'AMARELAMENTO', 'ODOR', 'PRODUTO_RESIDUAL', 'VALVULA_CONTAMINADA', 'OUTRO');
  END IF;
END $$;

-- Collaborator already exists in production. Do not recreate or drop it.
-- This migration only integrates post-wash fields into the existing Inspecao table.
ALTER TABLE "Inspecao"
  ADD COLUMN IF NOT EXISTS "colaboradorId" TEXT,
  ADD COLUMN IF NOT EXISTS "resultadoPosLavagem" "ResultadoPosLavagem",
  ADD COLUMN IF NOT EXISTS "motivoNaoConformidade" "MotivoNaoConformidade";

-- Keep indexes compatible with schema.prisma without failing if production
-- already received them in a partial/previous deploy.
CREATE INDEX IF NOT EXISTS "Collaborator_nome_idx" ON "Collaborator"("nome");
CREATE INDEX IF NOT EXISTS "Collaborator_ativo_idx" ON "Collaborator"("ativo");
CREATE INDEX IF NOT EXISTS "Inspecao_colaboradorId_dataInspecao_idx" ON "Inspecao"("colaboradorId", "dataInspecao");
CREATE INDEX IF NOT EXISTS "Inspecao_resultadoPosLavagem_idx" ON "Inspecao"("resultadoPosLavagem");
CREATE INDEX IF NOT EXISTS "Inspecao_motivoNaoConformidade_idx" ON "Inspecao"("motivoNaoConformidade");

-- Add FK only if it is not already present.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'Inspecao_colaboradorId_fkey'
  ) THEN
    ALTER TABLE "Inspecao"
      ADD CONSTRAINT "Inspecao_colaboradorId_fkey"
      FOREIGN KEY ("colaboradorId") REFERENCES "Collaborator"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
