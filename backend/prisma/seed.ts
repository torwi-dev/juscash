import { PrismaClient } from '@prisma/client';
import { createScraperUser } from './seeds/scraper-user';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  // Create scraper service user
  await createScraperUser();

  // Add other seeds here as needed
  // await createAdminUser();
  // await createTestData();

  console.log('🎉 Database seeding completed!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });