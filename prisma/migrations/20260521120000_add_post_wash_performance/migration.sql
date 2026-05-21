-- CreateEnum
CREATE TYPE "PostWashInspectionResult" AS ENUM ('APROVADO', 'REPROVADO');

-- CreateEnum
CREATE TYPE "PostWashFailureReason" AS ENUM ('FERRUGEM', 'MANCHA', 'AMARELAMENTO', 'ODOR', 'PRODUTO_RESIDUAL', 'VALVULA_CONTAMINADA', 'OUTRO');

-- CreateTable
CREATE TABLE "Collaborator" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Collaborator_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PostWashInspection" (
    "id" TEXT NOT NULL,
    "frota" TEXT NOT NULL,
    "colaboradorId" TEXT NOT NULL,
    "inspetor" TEXT NOT NULL,
    "resultado" "PostWashInspectionResult" NOT NULL,
    "motivo" "PostWashFailureReason",
    "observacao" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PostWashInspection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PostWashInspectionMedia" (
    "id" TEXT NOT NULL,
    "inspectionId" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "legenda" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PostWashInspectionMedia_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Collaborator_nome_idx" ON "Collaborator"("nome");

-- CreateIndex
CREATE INDEX "Collaborator_ativo_idx" ON "Collaborator"("ativo");

-- CreateIndex
CREATE INDEX "PostWashInspection_frota_idx" ON "PostWashInspection"("frota");

-- CreateIndex
CREATE INDEX "PostWashInspection_colaboradorId_createdAt_idx" ON "PostWashInspection"("colaboradorId", "createdAt");

-- CreateIndex
CREATE INDEX "PostWashInspection_resultado_idx" ON "PostWashInspection"("resultado");

-- CreateIndex
CREATE INDEX "PostWashInspection_motivo_idx" ON "PostWashInspection"("motivo");

-- CreateIndex
CREATE INDEX "PostWashInspectionMedia_inspectionId_idx" ON "PostWashInspectionMedia"("inspectionId");

-- AddForeignKey
ALTER TABLE "PostWashInspection" ADD CONSTRAINT "PostWashInspection_colaboradorId_fkey" FOREIGN KEY ("colaboradorId") REFERENCES "Collaborator"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostWashInspectionMedia" ADD CONSTRAINT "PostWashInspectionMedia_inspectionId_fkey" FOREIGN KEY ("inspectionId") REFERENCES "PostWashInspection"("id") ON DELETE CASCADE ON UPDATE CASCADE;
