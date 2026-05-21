-- CreateEnum
CREATE TYPE "ResultadoPosLavagem" AS ENUM ('APROVADO', 'REPROVADO');

-- CreateEnum
CREATE TYPE "MotivoNaoConformidade" AS ENUM ('FERRUGEM', 'MANCHA', 'AMARELAMENTO', 'ODOR', 'PRODUTO_RESIDUAL', 'VALVULA_CONTAMINADA', 'OUTRO');

-- CreateTable
CREATE TABLE "Collaborator" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Collaborator_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "Inspecao" ADD COLUMN "colaboradorId" TEXT,
ADD COLUMN "resultadoPosLavagem" "ResultadoPosLavagem",
ADD COLUMN "motivoNaoConformidade" "MotivoNaoConformidade";

-- CreateIndex
CREATE INDEX "Collaborator_nome_idx" ON "Collaborator"("nome");

-- CreateIndex
CREATE INDEX "Collaborator_ativo_idx" ON "Collaborator"("ativo");

-- CreateIndex
CREATE INDEX "Inspecao_colaboradorId_dataInspecao_idx" ON "Inspecao"("colaboradorId", "dataInspecao");

-- CreateIndex
CREATE INDEX "Inspecao_resultadoPosLavagem_idx" ON "Inspecao"("resultadoPosLavagem");

-- CreateIndex
CREATE INDEX "Inspecao_motivoNaoConformidade_idx" ON "Inspecao"("motivoNaoConformidade");

-- AddForeignKey
ALTER TABLE "Inspecao" ADD CONSTRAINT "Inspecao_colaboradorId_fkey" FOREIGN KEY ("colaboradorId") REFERENCES "Collaborator"("id") ON DELETE SET NULL ON UPDATE CASCADE;
