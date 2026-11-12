-- One current one-time match per elder per distribution day.
CREATE UNIQUE INDEX "matches_elderId_dayId_one_time"
ON "matches"("elderId", "dayId")
WHERE "type" = 'one_time' AND "endsAt" IS NULL AND "dayId" IS NOT NULL;
