-- AlterTable
ALTER TABLE "SocialPost" ADD COLUMN     "analyticsUpdatedAt" TIMESTAMP(3),
ADD COLUMN     "comments" INTEGER,
ADD COLUMN     "impressions" INTEGER,
ADD COLUMN     "likes" INTEGER,
ADD COLUMN     "shares" INTEGER;
