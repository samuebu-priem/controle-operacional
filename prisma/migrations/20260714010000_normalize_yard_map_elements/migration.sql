CREATE TABLE "YardMapElement" (
    "id" TEXT NOT NULL,
    "mapId" TEXT NOT NULL,
    "parentId" TEXT,
    "groupId" TEXT,
    "category" TEXT NOT NULL,
    "elementType" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "layerId" TEXT NOT NULL,
    "geometry" JSONB NOT NULL,
    "style" JSONB NOT NULL,
    "properties" JSONB NOT NULL,
    "zIndex" INTEGER NOT NULL,
    "locked" BOOLEAN NOT NULL DEFAULT false,
    "visible" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "YardMapElement_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "YardMapElement_mapId_zIndex_idx" ON "YardMapElement"("mapId", "zIndex");
CREATE INDEX "YardMapElement_parentId_idx" ON "YardMapElement"("parentId");
CREATE INDEX "YardMapElement_groupId_idx" ON "YardMapElement"("groupId");
CREATE INDEX "YardMapElement_category_elementType_idx" ON "YardMapElement"("category", "elementType");

ALTER TABLE "YardMapElement" ADD CONSTRAINT "YardMapElement_mapId_fkey" FOREIGN KEY ("mapId") REFERENCES "YardMap"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "YardMapElement" ADD CONSTRAINT "YardMapElement_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "YardMapElement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Preserva mapas do formato anterior, normalizando cada item do array JSON em uma linha.
INSERT INTO "YardMapElement" (
    "id", "mapId", "parentId", "groupId", "category", "elementType", "name", "layerId",
    "geometry", "style", "properties", "zIndex", "locked", "visible", "createdAt", "updatedAt"
)
SELECT
    m."id" || ':' || COALESCE(e.value->>'id', e.ordinality::TEXT),
    m."id",
    NULL,
    NULL,
    'GENERIC',
    CASE COALESCE(e.value->>'type', '')
      WHEN 'BOUNDARY' THEN 'YARD_BOUNDARY' WHEN 'POLYGON' THEN 'OPERATIONAL_AREA'
      WHEN 'RECTANGLE' THEN 'OPERATIONAL_AREA' WHEN 'AREA' THEN 'OPERATIONAL_AREA'
      WHEN 'PARKING' THEN 'PARKING_SLOT' WHEN 'PIN' THEN 'ICON'
      WHEN 'WASH' THEN 'WASHING_AREA' WHEN 'INSPECTION' THEN 'INSPECTION_AREA'
      WHEN 'MAINTENANCE' THEN 'MAINTENANCE_AREA' ELSE COALESCE(e.value->>'type', 'GENERIC')
    END,
    COALESCE(e.value->>'name', e.value->'properties'->>'name', e.value->>'type', 'Elemento'),
    CASE
      WHEN COALESCE(e.value->>'type', '') = 'BOUNDARY' THEN 'boundaries'
      WHEN COALESCE(e.value->>'type', '') = 'SECTOR' THEN 'sectors'
      WHEN COALESCE(e.value->>'type', '') IN ('ROAD','CORRIDOR') THEN 'traffic'
      WHEN COALESCE(e.value->>'type', '') = 'PARKING' THEN 'slots'
      WHEN COALESCE(e.value->>'type', '') IN ('BUILDING','BOX','GATE','SHED') THEN 'structures'
      WHEN COALESCE(e.value->>'type', '') IN ('TEXT','PIN','MEASURE') THEN 'annotations'
      ELSE 'areas'
    END,
    COALESCE(e.value->'geometry', '{}'::JSONB),
    COALESCE(e.value->'style', '{}'::JSONB),
    COALESCE(e.value->'properties', '{}'::JSONB),
    ((CASE
      WHEN COALESCE(e.value->>'type', '') = 'BOUNDARY' THEN 1000
      WHEN COALESCE(e.value->>'type', '') IN ('POLYGON','RECTANGLE','AREA','WASH','INSPECTION','MAINTENANCE') THEN 2000
      WHEN COALESCE(e.value->>'type', '') = 'SECTOR' THEN 3000
      WHEN COALESCE(e.value->>'type', '') IN ('ROAD','CORRIDOR') THEN 4000
      WHEN COALESCE(e.value->>'type', '') = 'PARKING' THEN 5000
      WHEN COALESCE(e.value->>'type', '') IN ('BUILDING','BOX','GATE','SHED') THEN 6000
      ELSE 7000
    END) + e.ordinality)::INTEGER,
    COALESCE((e.value->>'locked')::BOOLEAN, false),
    COALESCE((e.value->>'visible')::BOOLEAN, (e.value->'properties'->>'visible')::BOOLEAN, true),
    m."createdAt",
    m."updatedAt"
FROM "YardMap" m
CROSS JOIN LATERAL jsonb_array_elements(COALESCE(m."document"->'elements', '[]'::JSONB)) WITH ORDINALITY AS e(value, ordinality);

-- Atualiza ids de pai caso um documento legado já possuísse parentId.
UPDATE "YardMapElement" child
SET "parentId" = child."mapId" || ':' || source.value->>'parentId'
FROM "YardMap" m
CROSS JOIN LATERAL jsonb_array_elements(COALESCE(m."document"->'elements', '[]'::JSONB)) AS source(value)
WHERE child."mapId" = m."id"
  AND child."id" = m."id" || ':' || source.value->>'id'
  AND NULLIF(source.value->>'parentId', '') IS NOT NULL;

UPDATE "YardMap"
SET "document" = jsonb_set(
  jsonb_set("document" - 'elements', '{schemaVersion}', '2'::JSONB, true),
  '{elements}', '[]'::JSONB, true
);
