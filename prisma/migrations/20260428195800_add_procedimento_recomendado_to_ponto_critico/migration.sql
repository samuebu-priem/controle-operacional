ALTER TABLE "PontoCritico"
ADD COLUMN "procedimentoRecomendado" TEXT NOT NULL DEFAULT 'Nao informado';

ALTER TABLE "PontoCritico"
ALTER COLUMN "procedimentoRecomendado" DROP DEFAULT;
