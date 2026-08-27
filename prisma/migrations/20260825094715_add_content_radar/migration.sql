-- CreateEnum
CREATE TYPE "OpportunityStatus" AS ENUM ('NEW', 'RESEARCHING', 'RESEARCHED', 'DRAFTED', 'DISMISSED');

-- CreateEnum
CREATE TYPE "FactStatus" AS ENUM ('VERIFIED', 'USER_PROVIDED', 'AI_INFERENCE', 'UNVERIFIED');

-- CreateTable
CREATE TABLE "ContentOpportunity" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "referencePostId" TEXT,
    "topic" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "suggestedPlatform" TEXT NOT NULL,
    "suggestedFormat" TEXT NOT NULL,
    "relevanceScore" INTEGER NOT NULL,
    "freshnessScore" INTEGER NOT NULL,
    "localRelevanceScore" INTEGER NOT NULL,
    "publicInterestScore" INTEGER NOT NULL,
    "contentFitScore" INTEGER NOT NULL,
    "opportunityScore" INTEGER NOT NULL,
    "reasoning" TEXT NOT NULL,
    "status" "OpportunityStatus" NOT NULL DEFAULT 'NEW',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContentOpportunity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResearchReport" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "contentOpportunityId" TEXT,
    "topic" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "confidence" INTEGER NOT NULL,
    "facts" JSONB NOT NULL,
    "sources" JSONB NOT NULL,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ResearchReport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ContentOpportunity_referencePostId_key" ON "ContentOpportunity"("referencePostId");

-- CreateIndex
CREATE INDEX "ContentOpportunity_organizationId_idx" ON "ContentOpportunity"("organizationId");

-- CreateIndex
CREATE INDEX "ContentOpportunity_status_idx" ON "ContentOpportunity"("status");

-- CreateIndex
CREATE INDEX "ContentOpportunity_opportunityScore_idx" ON "ContentOpportunity"("opportunityScore");

-- CreateIndex
CREATE UNIQUE INDEX "ResearchReport_contentOpportunityId_key" ON "ResearchReport"("contentOpportunityId");

-- CreateIndex
CREATE INDEX "ResearchReport_organizationId_idx" ON "ResearchReport"("organizationId");

-- AddForeignKey
ALTER TABLE "ContentOpportunity" ADD CONSTRAINT "ContentOpportunity_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentOpportunity" ADD CONSTRAINT "ContentOpportunity_referencePostId_fkey" FOREIGN KEY ("referencePostId") REFERENCES "ReferencePost"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResearchReport" ADD CONSTRAINT "ResearchReport_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResearchReport" ADD CONSTRAINT "ResearchReport_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResearchReport" ADD CONSTRAINT "ResearchReport_contentOpportunityId_fkey" FOREIGN KEY ("contentOpportunityId") REFERENCES "ContentOpportunity"("id") ON DELETE SET NULL ON UPDATE CASCADE;

