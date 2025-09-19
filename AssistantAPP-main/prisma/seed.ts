import { PrismaClient, Role, CaseStatus, DocState, PaymentStatus } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Start seeding...');

  const user = await prisma.user.upsert({
    where: { email: 'ali@example.com' },
    update: {},
    create: {
      email: 'ali@example.com',
      name: 'Ali Ahmad',
      role: Role.CLIENT,
    },
  });
  console.log(`Created user: ${user.name}`);

  await prisma.case.create({
    data: {
      title: 'Tourist Extension – Ali Ahmad',
      caseNumber: 'LVJ-SEED-001',
      totalFee: 75000,
      currency: 'USD',
      applicantName: 'Ali Ahmad',
      applicantEmail: 'ali@example.com',
      overallStatus: CaseStatus.documents_pending,
      stage: 'Intake',
      urgencyLevel: 'MEDIUM',
      completionPercentage: 10,
      clientId: user.id,
      caseManagerId: user.id,
      documents: {
        create: [
          { name: 'Passport Scan', state: DocState.uploaded },
          { name: 'Visa Application', state: DocState.requested },
        ],
      },
      payments: {
        create: [
          { description: 'Service Fee – Filing', amount: 75000, currency: 'USD', status: PaymentStatus.unpaid, invoiceNumber: 'INV-1001' }
        ],
      },
    },
  });
  console.log('Seeding finished.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
