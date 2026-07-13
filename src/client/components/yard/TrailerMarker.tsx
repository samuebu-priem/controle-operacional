export type TrailerMarkerProps = {
  fleetNumber: string;
  sector?: string | null;
  enabled?: boolean;
};

/** Reserved for the future detailed trailer representation. Pins remain the MVP marker. */
export default function TrailerMarker({ enabled = false }: TrailerMarkerProps) {
  if (!enabled) return null;
  return null;
}
