-- CreateEnum
CREATE TYPE "TipoInspecao" AS ENUM ('ANTES_LAVAGEM', 'APOS_LAVAGEM');

-- CreateEnum
CREATE TYPE "StatusInspecao" AS ENUM ('APROVADO', 'REPROVADO', 'COM_OBSERVACAO');

-- CreateEnum
CREATE TYPE "Severidade" AS ENUM ('LEVE', 'MEDIA', 'GRAVE');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Frota" (
    "id" TEXT NOT NULL,
    "numeroFrota" TEXT NOT NULL,
    "placa" TEXT NOT NULL,
    "tipoEquipamento" TEXT NOT NULL,
    "material" TEXT NOT NULL,
    "capacidade" TEXT NOT NULL,
    "observacoesFixas" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Frota_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Inspecao" (
    "id" TEXT NOT NULL,
    "frotaId" TEXT NOT NULL,
    "userId" TEXT,
    "dataInspecao" TIMESTAMP(3) NOT NULL,
    "tipoInspecao" "TipoInspecao" NOT NULL,
    "status" "StatusInspecao" NOT NULL,
    "observacoesGerais" TEXT,
    "nomeInspetor" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Inspecao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PontoCritico" (
    "id" TEXT NOT NULL,
    "inspecaoId" TEXT NOT NULL,
    "categoria" TEXT NOT NULL,
    "localizacao" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "severidade" "Severidade" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PontoCritico_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FotoInspecao" (
    "id" TEXT NOT NULL,
    "inspecaoId" TEXT NOT NULL,
    "pontoCriticoId" TEXT,
    "imageUrl" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "legenda" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FotoInspecao_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Frota_numeroFrota_key" ON "Frota"("numeroFrota");

-- CreateIndex
CREATE INDEX "Frota_numeroFrota_idx" ON "Frota"("numeroFrota");

-- CreateIndex
CREATE INDEX "Frota_placa_idx" ON "Frota"("placa");

-- CreateIndex
CREATE INDEX "Inspecao_frotaId_dataInspecao_idx" ON "Inspecao"("frotaId", "dataInspecao");

-- CreateIndex
CREATE INDEX "Inspecao_tipoInspecao_idx" ON "Inspecao"("tipoInspecao");

-- CreateIndex
CREATE INDEX "Inspecao_status_idx" ON "Inspecao"("status");

-- CreateIndex
CREATE INDEX "PontoCritico_inspecaoId_idx" ON "PontoCritico"("inspecaoId");

-- CreateIndex
CREATE INDEX "PontoCritico_categoria_idx" ON "PontoCritico"("categoria");

-- CreateIndex
CREATE INDEX "PontoCritico_localizacao_idx" ON "PontoCritico"("localizacao");

-- CreateIndex
CREATE INDEX "FotoInspecao_inspecaoId_idx" ON "FotoInspecao"("inspecaoId");

-- CreateIndex
CREATE INDEX "FotoInspecao_pontoCriticoId_idx" ON "FotoInspecao"("pontoCriticoId");

-- AddForeignKey
ALTER TABLE "Inspecao" ADD CONSTRAINT "Inspecao_frotaId_fkey" FOREIGN KEY ("frotaId") REFERENCES "Frota"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Inspecao" ADD CONSTRAINT "Inspecao_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PontoCritico" ADD CONSTRAINT "PontoCritico_inspecaoId_fkey" FOREIGN KEY ("inspecaoId") REFERENCES "Inspecao"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FotoInspecao" ADD CONSTRAINT "FotoInspecao_inspecaoId_fkey" FOREIGN KEY ("inspecaoId") REFERENCES "Inspecao"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FotoInspecao" ADD CONSTRAINT "FotoInspecao_pontoCriticoId_fkey" FOREIGN KEY ("pontoCriticoId") REFERENCES "PontoCritico"("id") ON DELETE SET NULL ON UPDATE CASCADE;
