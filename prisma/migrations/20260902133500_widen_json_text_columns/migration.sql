-- Widen JSON-blob columns from VARCHAR(191) to TEXT.
-- These columns store serialized JSON (Meeting.advancedSettings, AuditLog.metadata)
-- which regularly exceeds 191 characters. MySQL TEXT columns cannot carry a
-- DEFAULT, so the previous `@default("{}")` was dropped from the schema —
-- every write path already sets these fields explicitly.
ALTER TABLE `Meeting` MODIFY `advancedSettings` TEXT NOT NULL;
ALTER TABLE `AuditLog` MODIFY `metadata` TEXT NOT NULL;
