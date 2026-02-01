import { PrismaClient, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  const adminPassword = await bcrypt.hash(process.env.ADMIN_PASSWORD || 'admin123', 10);
  const admin = await prisma.user.upsert({
    where: { email: process.env.ADMIN_EMAIL || 'admin@apocrifo.game' },
    update: {},
    create: {
      email: process.env.ADMIN_EMAIL || 'admin@apocrifo.game',
      passwordHash: adminPassword,
      nickname: 'Admin',
      role: UserRole.ADMIN,
    },
  });
  console.log('✅ Admin user created:', admin.email);

  const sampleWords = [
    {
      lemma: 'ABBALLARE',
      partOfSpeech: 'verbo transitivo',
      definition: 'Fare balle di fieno o di paglia, legandole e compattandole per il trasporto o la conservazione.',
      tags: ['agricoltura', 'arcaico'],
      difficulty: 3,
    },
    {
      lemma: 'ACCOZZAGLIA',
      partOfSpeech: 'sostantivo femminile',
      definition: 'Insieme disordinato e confuso di persone o cose di poco valore; marmaglia.',
      tags: ['dispregiativo'],
      difficulty: 2,
    },
    {
      lemma: 'BISLACCO',
      partOfSpeech: 'aggettivo',
      definition: 'Strano, stravagante, eccentrico; che si comporta o ragiona in modo poco sensato.',
      tags: ['carattere'],
      difficulty: 1,
    },
  ];

  for (const wordData of sampleWords) {
    await prisma.word.upsert({
      where: { lemma: wordData.lemma },
      update: {},
      create: wordData,
    });
  }
  console.log(`✅ ${sampleWords.length} sample words created`);

  console.log('✨ Seeding completed!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
