-- CreateTable
CREATE TABLE "QuestRefreshCycle" (
    "cycleStart" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QuestRefreshCycle_pkey" PRIMARY KEY ("cycleStart")
);
