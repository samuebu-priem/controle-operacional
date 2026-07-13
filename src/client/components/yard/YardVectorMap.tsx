import { yardMapConfig, type MapPoint, type ParkingRow, type YardSectorId } from "../../../shared/yardMapConfig";

type YardVectorMapProps = {
  svgRef?: any;
  activeSector?: YardSectorId | null;
  onSectorSelect?: (sector: YardSectorId) => void;
};

function points(pointsValue: readonly MapPoint[]) {
  return pointsValue.map(([x, y]) => `${x},${y}`).join(" ");
}

function parkingTicks(row: ParkingRow) {
  const dx = row.end[0] - row.start[0];
  const dy = row.end[1] - row.start[1];
  const length = Math.max(1, Math.hypot(dx, dy));
  const normalX = (-dy / length) * 14;
  const normalY = (dx / length) * 14;
  return Array.from({ length: row.slots + 1 }, (_, index) => {
    const ratio = index / row.slots;
    const x = row.start[0] + dx * ratio;
    const y = row.start[1] + dy * ratio;
    return { x1: x - normalX, y1: y - normalY, x2: x + normalX, y2: y + normalY };
  });
}

export default function YardVectorMap({ svgRef, activeSector = null, onSectorSelect }: YardVectorMapProps) {
  const config = yardMapConfig;

  return (
    <svg
      ref={svgRef}
      className="yard-vector-map"
      viewBox={`0 0 ${config.viewBox.width} ${config.viewBox.height}`}
      role="img"
      aria-label="Mapa vetorial do pátio Cavalinho em Paulínia"
      preserveAspectRatio="xMidYMid meet"
    >
      <defs>
        <filter id="yard-boundary-glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="5" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>

      <rect width={config.viewBox.width} height={config.viewBox.height} fill={config.colors.background} />

      <g className="yard-vector-map__areas">
        {config.areas.map((area) => (
          <polygon key={area.id} points={points(area.points)} fill={config.colors.yardFill} />
        ))}
      </g>

      <g className="yard-vector-map__sectors">
        {config.yardSectors.map((sector) => {
          const selected = activeSector === sector.sector;
          return (
            <polygon
              key={sector.id}
              className={`yard-vector-sector${selected ? " yard-vector-sector--active" : ""}`}
              points={points(sector.points)}
              fill={selected ? config.colors.sectorHighlight : config.colors.sectorFill}
              data-sector={sector.sector}
              onClick={() => onSectorSelect?.(sector.sector)}
            />
          );
        })}
      </g>

      <g className="yard-vector-map__parking" pointerEvents="none">
        {config.parkingRows.map((row) => (
          <g key={row.id}>
            <line x1={row.start[0]} y1={row.start[1]} x2={row.end[0]} y2={row.end[1]} />
            {parkingTicks(row).map((tick, index) => <line key={`${row.id}_${index}`} {...tick} />)}
          </g>
        ))}
      </g>

      <g className="yard-vector-map__roads">
        {config.roads.map((road) => (
          <polyline
            key={road.id}
            points={points(road.points)}
            fill="none"
            stroke={road.kind === "PUBLIC" ? config.colors.roadPublic : config.colors.roadInternal}
            strokeWidth={road.width}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ))}
      </g>

      <g className="yard-vector-map__buildings">
        {config.buildings.map((building) => (
          <polygon key={building.id} points={points(building.points)} fill={config.colors.building} stroke={config.colors.buildingRoof} strokeWidth="6" />
        ))}
      </g>

      <g className="yard-vector-map__sector-labels">
        {config.yardSectors.map((sector) => (
          <g key={`${sector.id}_label`} transform={`translate(${sector.labelPoint[0]} ${sector.labelPoint[1]})`} pointerEvents="none">
            <text className="yard-vector-sector__letter" textAnchor="middle" y="-5">{sector.sector}</text>
            <text className="yard-vector-sector__name" textAnchor="middle" y="28">{sector.name}</text>
          </g>
        ))}
      </g>

      <g className="yard-vector-map__labels" pointerEvents="none">
        {config.labels.map((label) => (
          <text
            key={label.id}
            className={`yard-vector-label yard-vector-label--${label.kind.toLowerCase()}`}
            x={label.point[0]}
            y={label.point[1]}
            textAnchor="middle"
          >
            {label.text}
          </text>
        ))}
      </g>

      <g className="yard-vector-map__boundaries" pointerEvents="none">
        {config.areas.map((area) => (
          <polygon
            key={`${area.id}_boundary`}
            points={points(area.points)}
            fill="none"
            stroke={config.colors.boundary}
            strokeWidth="4"
            vectorEffect="non-scaling-stroke"
            filter="url(#yard-boundary-glow)"
          />
        ))}
      </g>
    </svg>
  );
}
