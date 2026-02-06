#!/usr/bin/env node
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const demoAgents = await prisma.agent.findMany({
    where: { username: { startsWith: "demo_" } },
    select: { id: true }
  });

  const demoIds = demoAgents.map((agent) => agent.id);
  if (demoIds.length === 0) {
    console.log("No demo agents found.");
    return;
  }

  const guilds = await prisma.guild.findMany({
    where: {
      OR: [{ leaderId: { in: demoIds } }, { members: { some: { id: { in: demoIds } } } }]
    },
    select: { id: true }
  });
  const guildIds = guilds.map((guild) => guild.id);

  await prisma.$transaction(async (tx) => {
    if (guildIds.length > 0) {
      await tx.agent.updateMany({
        where: { guildId: { in: guildIds } },
        data: { guildId: null }
      });
      await tx.guild.deleteMany({ where: { id: { in: guildIds } } });
    }

    await tx.agent.deleteMany({ where: { id: { in: demoIds } } });

    // Cleanup any runs left without participants after deleting demo agents.
    const orphanRuns = await tx.questRun.findMany({
      where: { participants: { none: {} } },
      select: { id: true }
    });
    const orphanRunIds = orphanRuns.map((run) => run.id);
    if (orphanRunIds.length > 0) {
      await tx.questRun.deleteMany({ where: { id: { in: orphanRunIds } } });
    }
  });

  console.log(`Deleted demo agents: ${demoIds.length}`);
  console.log(`Deleted related guilds: ${guildIds.length}`);
}

main()
  .catch(async (error) => {
    console.error("Failed to reset demo data.");
    console.error(error instanceof Error ? error.message : String(error));
    await prisma.$disconnect();
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

