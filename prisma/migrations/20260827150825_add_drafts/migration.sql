-- CreateEnum
CREATE TYPE "Platform" AS ENUM ('X', 'FACEBOOK', 'INSTAGRAM');

-- CreateEnum
CREATE TYPE "DraftStatus" AS ENUM ('DRAFT', 'FACT_CHECK', 'NEEDS_REVIEW', 'APPROVED', 'SCHEDULED', 'PUBLISHED', 'REJECTED', 'FAILED');

-- CreateEnum
CREATE TYPE "FactCheckStatus" AS ENUM ('VERIFIED', 'PARTIALLY_VERIFIED', 'UNVERIFIED', 'CONFLICTING');

-- CreateTable
CREATE TABLE "Draft" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "researchReportId" TEXT,
    "contentOpportunityId" TEXT,
    "platform" "Platform" NOT NULL,
    "format" TEXT NOT NULL,
    "language" "ContentLanguage" NOT NULL,
    "tone" "Tone" NOT NULL,
    "body" TEXT NOT NULL,
    "hashtags" TEXT[],
    "cta" TEXT,
    "status" "DraftStatus" NOT NULL DEFAULT 'DRAFT',
    "rejectionReason" TEXT,
    "createdById" TEXT,
    "approvedById" TEXT,
    "approvedAt" TIMESTAMP(3),
    "rejectedById" TEXT,
    "rejectedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Draft_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DraftRevision" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "draftId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "changeType" TEXT NOT NULL,
    "changeSummary" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DraftRevision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FactCheck" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "draftId" TEXT NOT NULL,
    "claim" TEXT NOT NULL,
    "status" "FactCheckStatus" NOT NULL,
    "explanation" TEXT NOT NULL,
    "source" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FactCheck_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Draft_researchReportId_key" ON "Draft"("researchReportId");

-- CreateIndex
CREATE INDEX "Draft_organizationId_idx" ON "Draft"("organizationId");

-- CreateIndex
CREATE INDEX "Draft_status_idx" ON "Draft"("status");

-- CreateIndex
CREATE INDEX "DraftRevision_organizationId_idx" ON "DraftRevision"("organizationId");

-- CreateIndex
CREATE INDEX "DraftRevision_draftId_idx" ON "DraftRevision"("draftId");

-- CreateIndex
CREATE INDEX "FactCheck_organizationId_idx" ON "FactCheck"("organizationId");

-- CreateIndex
CREATE INDEX "FactCheck_draftId_idx" ON "FactCheck"("draftId");

-- AddForeignKey
ALTER TABLE "Draft" ADD CONSTRAINT "Draft_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Draft" ADD CONSTRAINT "Draft_researchReportId_fkey" FOREIGN KEY ("researchReportId") REFERENCES "ResearchReport"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Draft" ADD CONSTRAINT "Draft_contentOpportunityId_fkey" FOREIGN KEY ("contentOpportunityId") REFERENCES "ContentOpportunity"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Draft" ADD CONSTRAINT "Draft_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Draft" ADD CONSTRAINT "Draft_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Draft" ADD CONSTRAINT "Draft_rejectedById_fkey" FOREIGN KEY ("rejectedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DraftRevision" ADD CONSTRAINT "DraftRevision_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DraftRevision" ADD CONSTRAINT "DraftRevision_draftId_fkey" FOREIGN KEY ("draftId") REFERENCES "Draft"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DraftRevision" ADD CONSTRAINT "DraftRevision_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FactCheck" ADD CONSTRAINT "FactCheck_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FactCheck" ADD CONSTRAINT "FactCheck_draftId_fkey" FOREIGN KEY ("draftId") REFERENCES "Draft"("id") ON DELETE CASCADE ON UPDATE CASCADE;

