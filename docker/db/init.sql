CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TYPE "Color" AS ENUM ('brown','dark_brown','yellow','green','black','red');
CREATE TYPE "Volume" AS ENUM ('small','medium','large');
CREATE TYPE "AlertType" AS ENUM ('constipation','diarrhea','custom');

CREATE TABLE IF NOT EXISTS "User" (
  "id" TEXT PRIMARY KEY,
  "email" TEXT UNIQUE NOT NULL,
  "passwordHash" TEXT,
  "provider" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "Device" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "deviceFingerprint" TEXT NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_device_user ON "Device"("userId");

CREATE TABLE IF NOT EXISTS "StoolEntry" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "timestampMinute" TIMESTAMPTZ NOT NULL,
  "bristolType" INT NOT NULL CHECK ("bristolType" BETWEEN 1 AND 7),
  "smellScore" INT NOT NULL CHECK ("smellScore" BETWEEN 1 AND 5),
  "color" "Color" NOT NULL,
  "volume" "Volume" NOT NULL,
  "symptoms" TEXT[] NOT NULL,
  "notes" TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "version" INT NOT NULL DEFAULT 1
);
CREATE INDEX IF NOT EXISTS idx_stool_user ON "StoolEntry"("userId");
CREATE INDEX IF NOT EXISTS idx_stool_time ON "StoolEntry"("timestampMinute");

CREATE TABLE IF NOT EXISTS "DietLog" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "timestamp" TIMESTAMPTZ NOT NULL,
  "items" JSONB NOT NULL,
  "tags" TEXT[] NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_diet_user_time ON "DietLog"("userId","timestamp");

CREATE TABLE IF NOT EXISTS "AnalyticsCache" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "period" TEXT NOT NULL,
  "metrics" JSONB NOT NULL,
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_analytics_user_period ON "AnalyticsCache"("userId","period");

CREATE TABLE IF NOT EXISTS "Alert" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "type" "AlertType" NOT NULL,
  "status" TEXT NOT NULL,
  "triggeredAt" TIMESTAMPTZ NOT NULL,
  "metadata" JSONB NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_alert_user_type ON "Alert"("userId","type");

CREATE TABLE IF NOT EXISTS "PrivacyRequest" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "type" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "requestedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "processedAt" TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_privacy_user_status ON "PrivacyRequest"("userId","status");
