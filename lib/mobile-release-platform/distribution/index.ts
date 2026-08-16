import { prisma } from "@/lib/prisma";

export async function listTesters() {
  return prisma.mobileReleaseTester.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      assignments: { include: { release: true } },
    },
  });
}

export async function upsertTester(input: {
  email: string;
  name?: string;
  deviceModel?: string;
  androidVersion?: string;
  status?: string;
}) {
  return prisma.mobileReleaseTester.upsert({
    where: { email: input.email.toLowerCase() },
    create: {
      email: input.email.toLowerCase(),
      name: input.name,
      deviceModel: input.deviceModel,
      androidVersion: input.androidVersion,
      status: input.status ?? "invited",
    },
    update: {
      name: input.name,
      deviceModel: input.deviceModel,
      androidVersion: input.androidVersion,
      status: input.status,
    },
  });
}

export async function assignTesterToRelease(testerId: string, releaseId: string) {
  return prisma.mobileReleaseTesterAssignment.upsert({
    where: { testerId_releaseId: { testerId, releaseId } },
    create: { testerId, releaseId },
    update: {},
  });
}

export async function recordTesterFeedback(testerId: string, feedback: string) {
  return prisma.mobileReleaseTester.update({
    where: { id: testerId },
    data: { feedback, status: "active" },
  });
}

export async function getClosedAlphaDistribution(releaseId: string) {
  const release = await prisma.mobileReleaseVersion.findUnique({ where: { id: releaseId } });
  const assignments = await prisma.mobileReleaseTesterAssignment.findMany({
    where: { releaseId },
    include: { tester: true },
  });

  return {
    release,
    testers: assignments.map((a) => a.tester),
    invitationReady: Boolean(release?.downloadUrl && release.status === "PUBLISHED"),
  };
}
