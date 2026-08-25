-- CreateEnum
CREATE TYPE "SourcePlatform" AS ENUM ('X', 'FACEBOOK', 'INSTAGRAM', 'RSS', 'WEBSITE', 'OTHER');

-- CreateEnum
CREATE TYPE "SourceCategory" AS ENUM ('POLITICIAN', 'GOVERNMENT', 'GOVERNMENT_DEPARTMENT', 'ADMINISTRATION', 'NEWS', 'PUBLIC_ORGANIZATION', 'LOCAL_INSTITUTION', 'OTHER');

-- CreateEnum
CREATE TYPE "MonitoringFrequency" AS ENUM ('HOURLY', 'EVERY_6_HOURS', 'DAILY', 'WEEKLY');

-- CreateTable
CREATE TABLE "ReferenceSource" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "platform" "SourcePlatform" NOT NULL,
    "category" "SourceCategory" NOT NULL,
    "handle" TEXT,
    "url" TEXT NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 3,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "monitoringFrequency" "MonitoringFrequency" NOT NULL DEFAULT 'DAILY',
    "lastFetchedAt" TIMESTAMP(3),
    "lastFetchStatus" TEXT,
    "lastFetchError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReferenceSource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReferencePost" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "referenceSourceId" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "title" TEXT,
    "content" TEXT,
    "url" TEXT,
    "publishedAt" TIMESTAMP(3),
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReferencePost_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ReferenceSource_organizationId_idx" ON "ReferenceSource"("organizationId");

-- CreateIndex
CREATE INDEX "ReferenceSource_platform_idx" ON "ReferenceSource"("platform");

-- CreateIndex
CREATE INDEX "ReferencePost_organizationId_idx" ON "ReferencePost"("organizationId");

-- CreateIndex
CREATE INDEX "ReferencePost_referenceSourceId_idx" ON "ReferencePost"("referenceSourceId");

-- CreateIndex
CREATE INDEX "ReferencePost_publishedAt_idx" ON "ReferencePost"("publishedAt");

-- CreateIndex
CREATE UNIQUE INDEX "ReferencePost_referenceSourceId_externalId_key" ON "ReferencePost"("referenceSourceId", "externalId");

-- AddForeignKey
ALTER TABLE "ReferenceSource" ADD CONSTRAINT "ReferenceSource_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReferencePost" ADD CONSTRAINT "ReferencePost_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReferencePost" ADD CONSTRAINT "ReferencePost_referenceSourceId_fkey" FOREIGN KEY ("referenceSourceId") REFERENCES "ReferenceSource"("id") ON DELETE CASCADE ON UPDATE CASCADE;

