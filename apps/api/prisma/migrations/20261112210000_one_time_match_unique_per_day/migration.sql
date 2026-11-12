-- Lookup one-time matches by city and distribution day.
CREATE INDEX "matches_cityId_dayId_idx" ON "matches"("cityId", "dayId");

-- One current one-time match per elder per distribution day.
CREATE UNIQUE INDEX "matches_elderId_dayId_one_time"
ON "matches"("elderId", "dayId")
WHERE "type" = 'one_time' AND "endsAt" IS NULL AND "dayId" IS NOT NULL;
