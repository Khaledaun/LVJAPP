const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function upsertDevUser() {
  const email = 'dev@example.com';
  const name = 'Dev User';
  const role = 'STAFF'; // or 'ADMIN'
  return prisma.user.upsert({
    where: { email },
    update: { name, role },
    create: { email, name, role },
  });
}

function makeInvoiceNumber(prefix='INV', n=1) {
  const y = new Date().getFullYear();
  return `${prefix}-${y}-${String(n).padStart(4, '0')}`;
}

async function main() {
  const dev = await upsertDevUser();

  const title = 'Tourist Extension – Ali Ahmad';
  const applicantEmail = 'ali@example.com';

  // Create/find a demo case
  let kase = await prisma.case.findFirst({ where: { title, applicantEmail } });
  if (!kase) {
    try {
      kase = await prisma.case.create({
        data: {
          title,
          applicantName: 'Ali Ahmad',
          applicantEmail,
          stage: 'Intake',
          clientId: dev.id,
          assigneeId: dev.id,
        },
      });
    } catch (e1) {
      // If your schema requires a string status, set a generic one:
      kase = await prisma.case.create({
        data: {
          title,
          applicantName: 'Ali Ahmad',
          applicantEmail,
          stage: 'Intake',
          status: process.env.SEED_CASE_STATUS || 'OPEN',
          clientId: dev.id,
          assigneeId: dev.id,
        },
      });
    }
  }

  // Document: use fields your schema actually exposes (no filename/contentType/size/storageKey)
  try {
    await prisma.document.upsert({
      where: { id: 'seed-doc-1' },
      update: {},
      create: {
        id: 'seed-doc-1',
        caseId: kase.id,
        name: 'Passport',
        mimeType: 'application/pdf',                // ✅ your schema shows mimeType?
        sizeBytes: 12345,                           // ✅ your schema shows sizeBytes?
        gcsBucket: process.env.GCS_BUCKET || 'dev', // ✅ optional but useful
        gcsObject: `case_${kase.id}/passport.pdf`,  // ✅ path in bucket
        // state: 'UPLOADED',                        // leave out if state is enum/optional
        uploadedById: dev.id,                       // optional if your model has it
        url: null,                                  // optional; many schemas allow null
      },
    });
  } catch (e) {
    console.warn('Document upsert skipped/failed:', e?.message);
  }

  // Payment: include required invoiceNumber
  try {
    const count = await prisma.payment.count();
    await prisma.payment.upsert({
      where: { id: 'seed-pay-1' },
      update: {},
      create: {
        id: 'seed-pay-1',
        caseId: kase.id,
        description: 'Filing Fee',
        amountCents: 9900,
        currency: 'USD',
        invoiceNumber: makeInvoiceNumber('INV', count + 1),
        // status: 'UNPAID', // uncomment if your schema requires a string status
      },
    });
  } catch (e) {
    console.warn('Payment upsert skipped/failed:', e?.message);
  }

  console.log('Seed OK:', { caseId: kase.id, devUserId: dev.id });
}

main()
  .then(async () => { await prisma.$disconnect(); })
  .catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });
