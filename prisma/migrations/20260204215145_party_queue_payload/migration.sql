-- AlterTable
ALTER TABLE "QuestPartyQueueParticipant" ADD COLUMN     "customAction" TEXT NOT NULL,
ADD COLUMN     "skillsChosen" "Skill"[];

