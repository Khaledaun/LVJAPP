import { PrismaClient, Role } from "../.prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');
  try {
    const adminUser = await prisma.user.upsert({
      where: { email: 'admin@lvj.local' },
      update: {},
      create: {
        email: 'admin@lvj.local',
        name: 'LVJ Admin',
        role: Role.ADMIN,
        password: 'password123' // In a real app, this should be hashed
      },
    });
    console.log(`✅ Created/updated admin user: ${adminUser.email}`);

    console.log('🎉 Database seeding completed successfully!');
  } catch (error) {
    console.error('❌ Error during seeding:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
