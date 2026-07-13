-- Preserve audit records when a fleet has yard data.
ALTER TABLE "YardLocation" DROP CONSTRAINT "YardLocation_fleetId_fkey";
ALTER TABLE "YardLocationHistory" DROP CONSTRAINT "YardLocationHistory_fleetId_fkey";

ALTER TABLE "YardLocation"
  ADD CONSTRAINT "YardLocation_fleetId_fkey"
  FOREIGN KEY ("fleetId") REFERENCES "Frota"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "YardLocationHistory"
  ADD CONSTRAINT "YardLocationHistory_fleetId_fkey"
  FOREIGN KEY ("fleetId") REFERENCES "Frota"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- Defense in depth: coordinates must always stay proportional to the image.
ALTER TABLE "YardLocation"
  ADD CONSTRAINT "YardLocation_xPercent_check" CHECK ("xPercent" >= 0 AND "xPercent" <= 1),
  ADD CONSTRAINT "YardLocation_yPercent_check" CHECK ("yPercent" >= 0 AND "yPercent" <= 1);

ALTER TABLE "YardLocationHistory"
  ADD CONSTRAINT "YardLocationHistory_xPercent_check" CHECK ("xPercent" >= 0 AND "xPercent" <= 1),
  ADD CONSTRAINT "YardLocationHistory_yPercent_check" CHECK ("yPercent" >= 0 AND "yPercent" <= 1);
