-- Newest-first city-scoped audit log listing (ORDER BY at DESC).
CREATE INDEX "audit_logs_cityId_at_idx" ON "audit_logs"("cityId", "at");
