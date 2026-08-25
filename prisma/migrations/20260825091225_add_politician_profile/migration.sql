-- CreateEnum
CREATE TYPE "Tone" AS ENUM ('FORMAL', 'WARM', 'PUBLIC_SERVICE', 'CONVERSATIONAL', 'CELEBRATORY', 'CONDOLENCE', 'INFORMATIONAL');

-- CreateEnum
CREATE TYPE "ContentLanguage" AS ENUM ('HINDI', 'ENGLISH', 'HINGLISH');

-- CreateTable
CREATE TABLE "Constituency" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "state" TEXT,
    "country" TEXT NOT NULL DEFAULT 'India',
    "description" TEXT,
    "population" INTEGER,
    "keyIssues" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Constituency_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PoliticianProfile" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "publicDesignation" TEXT,
    "politicalParty" TEXT,
    "bio" TEXT,
    "officialWebsite" TEXT,
    "xHandle" TEXT,
    "facebookHandle" TEXT,
    "instagramHandle" TEXT,
    "preferredTone" "Tone" NOT NULL DEFAULT 'INFORMATIONAL',
    "preferredLanguages" "ContentLanguage"[],
    "commonPhrases" TEXT[],
    "wordsToAvoid" TEXT[],
    "hashtagPreferences" TEXT[],
    "contentPillars" TEXT[],
    "importantProjects" TEXT[],
    "publicAchievements" TEXT[],
    "officialPositions" TEXT[],
    "frequentTopics" TEXT[],
    "approvedFacts" TEXT[],
    "constituencyId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PoliticianProfile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PoliticianProfile_organizationId_key" ON "PoliticianProfile"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "PoliticianProfile_constituencyId_key" ON "PoliticianProfile"("constituencyId");

-- CreateIndex
CREATE INDEX "PoliticianProfile_organizationId_idx" ON "PoliticianProfile"("organizationId");

-- AddForeignKey
ALTER TABLE "PoliticianProfile" ADD CONSTRAINT "PoliticianProfile_constituencyId_fkey" FOREIGN KEY ("constituencyId") REFERENCES "Constituency"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PoliticianProfile" ADD CONSTRAINT "PoliticianProfile_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

