import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Admin user
  const adminPassword = await bcrypt.hash('admin123', 10);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@apocrifo.game' },
    update: {},
    create: {
      email: 'admin@apocrifo.game',
      passwordHash: adminPassword,
      nickname: 'Admin',
      role: Role.ADMIN,
    },
  });
  console.log('✅ Created admin:', admin.email);

  // Sample words - MOLTE DI PIÙ!
  const words = [
    {
      lemma: 'BISLACCO',
      definition: 'Strambo, bizzarro, che ha comportamenti strani o insoliti',
      partOfSpeech: 'aggettivo',
    },
    {
      lemma: 'REDIMERE',
      definition: 'Liberare da una condizione negativa, riscattare',
      partOfSpeech: 'verbo',
    },
    {
      lemma: 'SGANGHERATO',
      definition: 'Sconnesso, mal funzionante, che non sta insieme bene',
      partOfSpeech: 'aggettivo',
    },
    {
      lemma: 'PERIPLO',
      definition: 'Lungo viaggio intorno a qualcosa, specialmente per mare',
      partOfSpeech: 'sostantivo',
    },
    {
      lemma: 'LINDO',
      definition: 'Estremamente pulito e ordinato',
      partOfSpeech: 'aggettivo',
    },
  ];

  for (const wordData of words) {
    const word = await prisma.word.upsert({
      where: { lemma: wordData.lemma },
      update: {},
      create: wordData,
    });
    console.log('✅ Created word:', word.lemma);
  }

  console.log('🌱 Seeding complete!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
