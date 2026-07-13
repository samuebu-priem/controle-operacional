import type { YardSectorId } from "../../../shared/yardMapConfig";

export type TrailerMarkerProps = {
  fleetNumber: string;
  sector?: YardSectorId | null;
  enabled?: boolean;
};

/** Reserved for the future detailed trailer representation. Pins remain the MVP marker. */
export default function TrailerMarker({ enabled = false }: TrailerMarkerProps) {
  if (!enabled) return null;
  return null;
}
