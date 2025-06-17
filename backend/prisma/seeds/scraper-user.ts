import { PrismaClient, UserRole } from '@prisma/client';
import bcrypt from 'bcryptjs'; // Mudou para bcryptjs

const prisma = new PrismaClient();

export async function createScraperUser() {
  console.log('🤖 Creating scraper service user...');

  // Check if scraper user already exists
  const existingUser = await prisma.user.findUnique({
    where: { email: 'scraper@juscash.com' }
  });

  if (existingUser) {
    console.log('✅ Scraper user already exists');
    return existingUser;
  }

  // Create scraper user
  const scraperUser = await prisma.user.create({
    data: {
      id: 999,
      name: 'Scraper Service',
      email: 'scraper@juscash.com',
      passwordHash: await bcrypt.hash('ScraperPass@123', 12),
      role: UserRole.scraper_service,
      isActive: true,
    }
  });

  console.log('✅ Scraper user created successfully');
  return scraperUser;
}