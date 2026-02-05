-- CreateEnum
CREATE TYPE "Skill" AS ENUM ('melee', 'ranged', 'unarmed', 'necromancy', 'elemental', 'enchantment', 'healing', 'illusion', 'summoning', 'stealth', 'lockpicking', 'poison', 'persuasion', 'deception', 'seduction');

-- CreateEnum
CREATE TYPE "LocationType" AS ENUM ('major_city', 'town', 'dungeon', 'wild', 'landmark');

-- CreateEnum
CREATE TYPE "ItemRarity" AS ENUM ('common', 'uncommon', 'rare', 'epic', 'legendary');

-- CreateEnum
CREATE TYPE "EquipmentSlot" AS ENUM ('head', 'chest', 'legs', 'boots', 'right_hand', 'left_hand');

-- CreateEnum
CREATE TYPE "QuestOutcome" AS ENUM ('success', 'partial', 'failure', 'timeout');

-- CreateEnum
CREATE TYPE "QuestStatus" AS ENUM ('active', 'archived');

-- CreateEnum
CREATE TYPE "PartyQueueStatus" AS ENUM ('waiting', 'formed', 'timed_out');

-- CreateTable
CREATE TABLE "Location" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "type" "LocationType" NOT NULL,
    "biomeTag" TEXT,
    "population" INTEGER NOT NULL DEFAULT 0,
    "x" INTEGER,
    "y" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Location_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LocationConnection" (
    "id" TEXT NOT NULL,
    "fromId" TEXT NOT NULL,
    "toId" TEXT NOT NULL,
    "distance" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LocationConnection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Guild" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "tag" TEXT NOT NULL,
    "leaderId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Guild_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Agent" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "profilePictureId" INTEGER NOT NULL DEFAULT 0,
    "level" INTEGER NOT NULL DEFAULT 1,
    "xp" INTEGER NOT NULL DEFAULT 0,
    "gold" INTEGER NOT NULL DEFAULT 0,
    "unspentSkillPoints" INTEGER NOT NULL DEFAULT 0,
    "skills" JSONB NOT NULL,
    "journeyLog" JSONB,
    "lastQuestResult" JSONB,
    "webhookUrl" TEXT,
    "locationId" TEXT NOT NULL,
    "guildId" TEXT,
    "lastActionAt" TIMESTAMP(3),
    "nextActionAvailableAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Agent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Item" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "rarity" "ItemRarity" NOT NULL,
    "slot" "EquipmentSlot" NOT NULL,
    "skillBonuses" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgentInventoryItem" (
    "id" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "acquiredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AgentInventoryItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgentEquipmentItem" (
    "id" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "slot" "EquipmentSlot" NOT NULL,
    "itemId" TEXT NOT NULL,
    "equippedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AgentEquipmentItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Quest" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" "QuestStatus" NOT NULL DEFAULT 'active',
    "originId" TEXT NOT NULL,
    "destinationId" TEXT NOT NULL,
    "failDestinationId" TEXT,
    "partySize" INTEGER NOT NULL,
    "challengeRating" INTEGER NOT NULL,
    "skillMultipliers" JSONB NOT NULL,
    "rewards" JSONB NOT NULL,
    "nearbyPois" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Quest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuestPartyQueue" (
    "id" TEXT NOT NULL,
    "questId" TEXT NOT NULL,
    "status" "PartyQueueStatus" NOT NULL DEFAULT 'waiting',
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QuestPartyQueue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuestPartyQueueParticipant" (
    "id" TEXT NOT NULL,
    "queueId" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QuestPartyQueueParticipant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuestRun" (
    "id" TEXT NOT NULL,
    "questId" TEXT NOT NULL,
    "outcome" "QuestOutcome" NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),
    "effectiveSkill" DOUBLE PRECISION,
    "randomFactor" INTEGER,
    "successLevel" DOUBLE PRECISION,
    "rewardsGranted" JSONB,

    CONSTRAINT "QuestRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuestRunParticipant" (
    "id" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "skillsChosen" "Skill"[],
    "customAction" TEXT NOT NULL,
    "contributedEffectiveSkill" DOUBLE PRECISION,
    "xpGained" INTEGER,
    "goldGained" INTEGER,
    "goldLost" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QuestRunParticipant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuestStatusUpdate" (
    "id" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "step" INTEGER NOT NULL,
    "text" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "traveling" BOOLEAN NOT NULL DEFAULT false,
    "travelingTowardId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QuestStatusUpdate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Location_name_key" ON "Location"("name");

-- CreateIndex
CREATE UNIQUE INDEX "LocationConnection_fromId_toId_key" ON "LocationConnection"("fromId", "toId");

-- CreateIndex
CREATE UNIQUE INDEX "Guild_name_key" ON "Guild"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Guild_tag_key" ON "Guild"("tag");

-- CreateIndex
CREATE UNIQUE INDEX "Guild_leaderId_key" ON "Guild"("leaderId");

-- CreateIndex
CREATE UNIQUE INDEX "Agent_username_key" ON "Agent"("username");

-- CreateIndex
CREATE INDEX "Agent_level_xp_idx" ON "Agent"("level", "xp");

-- CreateIndex
CREATE INDEX "Agent_guildId_idx" ON "Agent"("guildId");

-- CreateIndex
CREATE INDEX "Agent_locationId_idx" ON "Agent"("locationId");

-- CreateIndex
CREATE INDEX "AgentInventoryItem_itemId_idx" ON "AgentInventoryItem"("itemId");

-- CreateIndex
CREATE UNIQUE INDEX "AgentInventoryItem_agentId_itemId_key" ON "AgentInventoryItem"("agentId", "itemId");

-- CreateIndex
CREATE INDEX "AgentEquipmentItem_itemId_idx" ON "AgentEquipmentItem"("itemId");

-- CreateIndex
CREATE UNIQUE INDEX "AgentEquipmentItem_agentId_slot_key" ON "AgentEquipmentItem"("agentId", "slot");

-- CreateIndex
CREATE INDEX "Quest_status_originId_idx" ON "Quest"("status", "originId");

-- CreateIndex
CREATE UNIQUE INDEX "QuestPartyQueue_questId_key" ON "QuestPartyQueue"("questId");

-- CreateIndex
CREATE INDEX "QuestPartyQueueParticipant_agentId_idx" ON "QuestPartyQueueParticipant"("agentId");

-- CreateIndex
CREATE UNIQUE INDEX "QuestPartyQueueParticipant_queueId_agentId_key" ON "QuestPartyQueueParticipant"("queueId", "agentId");

-- CreateIndex
CREATE INDEX "QuestRun_questId_startedAt_idx" ON "QuestRun"("questId", "startedAt");

-- CreateIndex
CREATE INDEX "QuestRunParticipant_agentId_idx" ON "QuestRunParticipant"("agentId");

-- CreateIndex
CREATE UNIQUE INDEX "QuestRunParticipant_runId_agentId_key" ON "QuestRunParticipant"("runId", "agentId");

-- CreateIndex
CREATE INDEX "QuestStatusUpdate_locationId_idx" ON "QuestStatusUpdate"("locationId");

-- CreateIndex
CREATE UNIQUE INDEX "QuestStatusUpdate_runId_step_key" ON "QuestStatusUpdate"("runId", "step");

-- AddForeignKey
ALTER TABLE "LocationConnection" ADD CONSTRAINT "LocationConnection_fromId_fkey" FOREIGN KEY ("fromId") REFERENCES "Location"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LocationConnection" ADD CONSTRAINT "LocationConnection_toId_fkey" FOREIGN KEY ("toId") REFERENCES "Location"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Guild" ADD CONSTRAINT "Guild_leaderId_fkey" FOREIGN KEY ("leaderId") REFERENCES "Agent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Agent" ADD CONSTRAINT "Agent_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Agent" ADD CONSTRAINT "Agent_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "Guild"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentInventoryItem" ADD CONSTRAINT "AgentInventoryItem_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentInventoryItem" ADD CONSTRAINT "AgentInventoryItem_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentEquipmentItem" ADD CONSTRAINT "AgentEquipmentItem_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentEquipmentItem" ADD CONSTRAINT "AgentEquipmentItem_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quest" ADD CONSTRAINT "Quest_originId_fkey" FOREIGN KEY ("originId") REFERENCES "Location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quest" ADD CONSTRAINT "Quest_destinationId_fkey" FOREIGN KEY ("destinationId") REFERENCES "Location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quest" ADD CONSTRAINT "Quest_failDestinationId_fkey" FOREIGN KEY ("failDestinationId") REFERENCES "Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestPartyQueue" ADD CONSTRAINT "QuestPartyQueue_questId_fkey" FOREIGN KEY ("questId") REFERENCES "Quest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestPartyQueueParticipant" ADD CONSTRAINT "QuestPartyQueueParticipant_queueId_fkey" FOREIGN KEY ("queueId") REFERENCES "QuestPartyQueue"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestPartyQueueParticipant" ADD CONSTRAINT "QuestPartyQueueParticipant_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestRun" ADD CONSTRAINT "QuestRun_questId_fkey" FOREIGN KEY ("questId") REFERENCES "Quest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestRunParticipant" ADD CONSTRAINT "QuestRunParticipant_runId_fkey" FOREIGN KEY ("runId") REFERENCES "QuestRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestRunParticipant" ADD CONSTRAINT "QuestRunParticipant_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestStatusUpdate" ADD CONSTRAINT "QuestStatusUpdate_runId_fkey" FOREIGN KEY ("runId") REFERENCES "QuestRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestStatusUpdate" ADD CONSTRAINT "QuestStatusUpdate_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestStatusUpdate" ADD CONSTRAINT "QuestStatusUpdate_travelingTowardId_fkey" FOREIGN KEY ("travelingTowardId") REFERENCES "Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;

