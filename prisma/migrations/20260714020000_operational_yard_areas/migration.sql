-- O modelo CAD anterior permanece fisicamente preservado para auditoria/rollback,
-- mas deixa de ser usado pela aplicação. A nova operação trabalha apenas com áreas.
CREATE TABLE "Patio" (
    "id" TEXT NOT NULL,
    "branch" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Patio_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PatioArea" (
    "id" TEXT NOT NULL,
    "patioId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "capacidade" INTEGER NOT NULL,
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "x" DOUBLE PRECISION NOT NULL,
    "y" DOUBLE PRECISION NOT NULL,
    "cor" TEXT NOT NULL DEFAULT '#22c55e',
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PatioArea_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "PatioArea_capacidade_check" CHECK ("capacidade" > 0),
    CONSTRAINT "PatioArea_x_check" CHECK ("x" >= 0 AND "x" <= 1),
    CONSTRAINT "PatioArea_y_check" CHECK ("y" >= 0 AND "y" <= 1),
    CONSTRAINT "PatioArea_cor_check" CHECK ("cor" ~ '^#[0-9A-Fa-f]{6}$')
);

CREATE TABLE "PatioAllocation" (
    "id" TEXT NOT NULL,
    "fleetId" TEXT NOT NULL,
    "areaId" TEXT NOT NULL,
    "registeredById" TEXT NOT NULL,
    "releasedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "releasedAt" TIMESTAMP(3),
    "note" TEXT,
    "releaseNote" TEXT,
    CONSTRAINT "PatioAllocation_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Patio_branch_nome_key" ON "Patio"("branch", "nome");
CREATE INDEX "Patio_branch_ativo_ordem_idx" ON "Patio"("branch", "ativo", "ordem");
CREATE UNIQUE INDEX "PatioArea_patioId_nome_key" ON "PatioArea"("patioId", "nome");
CREATE INDEX "PatioArea_patioId_ativo_ordem_idx" ON "PatioArea"("patioId", "ativo", "ordem");
CREATE INDEX "PatioAllocation_areaId_releasedAt_createdAt_idx" ON "PatioAllocation"("areaId", "releasedAt", "createdAt");
CREATE INDEX "PatioAllocation_fleetId_releasedAt_createdAt_idx" ON "PatioAllocation"("fleetId", "releasedAt", "createdAt");
CREATE INDEX "PatioAllocation_registeredById_idx" ON "PatioAllocation"("registeredById");
CREATE INDEX "PatioAllocation_releasedById_idx" ON "PatioAllocation"("releasedById");
CREATE UNIQUE INDEX "PatioAllocation_active_fleet_key" ON "PatioAllocation"("fleetId") WHERE "releasedAt" IS NULL;

ALTER TABLE "PatioArea" ADD CONSTRAINT "PatioArea_patioId_fkey" FOREIGN KEY ("patioId") REFERENCES "Patio"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PatioAllocation" ADD CONSTRAINT "PatioAllocation_fleetId_fkey" FOREIGN KEY ("fleetId") REFERENCES "Frota"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PatioAllocation" ADD CONSTRAINT "PatioAllocation_areaId_fkey" FOREIGN KEY ("areaId") REFERENCES "PatioArea"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PatioAllocation" ADD CONSTRAINT "PatioAllocation_registeredById_fkey" FOREIGN KEY ("registeredById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PatioAllocation" ADD CONSTRAINT "PatioAllocation_releasedById_fkey" FOREIGN KEY ("releasedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

INSERT INTO "Patio" ("id", "branch", "nome", "ordem", "updatedAt") VALUES
('patio-paulinia-1', 'PAULINIA', '1º Pátio', 1, CURRENT_TIMESTAMP),
('patio-paulinia-2', 'PAULINIA', '2º Pátio', 2, CURRENT_TIMESTAMP),
('patio-paulinia-3', 'PAULINIA', '3º Pátio', 3, CURRENT_TIMESTAMP);

INSERT INTO "PatioArea" ("id", "patioId", "nome", "capacidade", "ordem", "x", "y", "cor", "updatedAt") VALUES
('area-p1-barracao', 'patio-paulinia-1', 'Atrás do Barracão e Trucks', 12, 1, 0.23, 0.22, '#22c55e', CURRENT_TIMESTAMP),
('area-p1-muro-pista', 'patio-paulinia-1', 'Muro Pista', 32, 2, 0.12, 0.45, '#22c55e', CURRENT_TIMESTAMP),
('area-p1-muro-egsa', 'patio-paulinia-1', 'Muro EGSA', 26, 3, 0.35, 0.52, '#22c55e', CURRENT_TIMESTAMP),
('area-p1-meio', 'patio-paulinia-1', 'Meio', 26, 4, 0.27, 0.38, '#22c55e', CURRENT_TIMESTAMP),
('area-p2-muro-lavador', 'patio-paulinia-2', 'Muro Lavador', 32, 1, 0.50, 0.30, '#22c55e', CURRENT_TIMESTAMP),
('area-p2-refeitorio', 'patio-paulinia-2', 'Refeitório', 8, 2, 0.57, 0.46, '#22c55e', CURRENT_TIMESTAMP),
('area-p2-muro-motos', 'patio-paulinia-2', 'Muro Motos', 6, 3, 0.66, 0.36, '#22c55e', CURRENT_TIMESTAMP),
('area-p2-posto', 'patio-paulinia-2', 'Posto de Combustível', 8, 4, 0.72, 0.49, '#22c55e', CURRENT_TIMESTAMP),
('area-p3-atras-lavador', 'patio-paulinia-3', 'Atrás do Lavador', 16, 1, 0.46, 0.66, '#22c55e', CURRENT_TIMESTAMP),
('area-p3-meio', 'patio-paulinia-3', 'Meio', 20, 2, 0.59, 0.70, '#22c55e', CURRENT_TIMESTAMP),
('area-p3-muro', 'patio-paulinia-3', 'Muro', 32, 3, 0.73, 0.73, '#22c55e', CURRENT_TIMESTAMP),
('area-p3-alojamento', 'patio-paulinia-3', 'Alojamento', 12, 4, 0.82, 0.61, '#22c55e', CURRENT_TIMESTAMP);
