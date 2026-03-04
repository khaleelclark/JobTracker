-- Remove legacy interested status by mapping it to applied.
UPDATE "applications"
SET "generic_status" = 'applied'
WHERE "generic_status" = 'interested';
