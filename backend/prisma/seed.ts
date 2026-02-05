import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database with full word list...');

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

  // Full word list
  const words = [
    { lemma: 'ABBACARE', definition: 'Vagare con la mente, fantasticare', partOfSpeech: 'verbo' },
    { lemma: 'ABBAMBINARE', definition: 'Trasportare oggetti pesanti alternando il peso sugli spigoli', partOfSpeech: 'verbo' },
    { lemma: 'ABBALLARE', definition: 'Fare balle di paglia o fieno legandole per la conservazione', partOfSpeech: 'verbo' },
    { lemma: 'ABBURATTARE', definition: 'Setacciare la farina per separarla dalla crusca', partOfSpeech: 'verbo' },
    { lemma: 'ALETTE', definition: 'Lembi ripiegati all\'interno della sopracopertina di un libro', partOfSpeech: 'sostantivo' },
    { lemma: 'ARCOSOLIO', definition: 'Nicchia sepolcrale ad arco', partOfSpeech: 'sostantivo' },
    { lemma: 'BROSCIA', definition: 'Brodaglia annacquata e insipida', partOfSpeech: 'sostantivo' },
    { lemma: 'BROLO', definition: 'Terreno coltivato recintato, posto intorno a una casa', partOfSpeech: 'sostantivo' },
    { lemma: 'BRULOTTO', definition: 'Imbarcazione imbottita di esplosivo e diretta verso navi nemiche', partOfSpeech: 'sostantivo' },
    { lemma: 'BRUZZAGLIA', definition: 'Accozzaglia di gente da poco, marmaglia', partOfSpeech: 'sostantivo' },
    { lemma: 'BURBANZA', definition: 'Boria, alterigia vanitosa e sprezzante', partOfSpeech: 'sostantivo' },
    { lemma: 'CABOTAGGIO', definition: 'Navigazione marittima costiera con piccole navi', partOfSpeech: 'sostantivo' },
    { lemma: 'CACHINNO', definition: 'Risata irrefrenabile e sguaiata', partOfSpeech: 'sostantivo' },
    { lemma: 'CARACCA', definition: 'Grande veliero mercantile e da guerra', partOfSpeech: 'sostantivo' },
    { lemma: 'CARAMOGIO', definition: 'Nano di corte deforme e grottesco', partOfSpeech: 'sostantivo' },
    { lemma: 'CHIETINERIA', definition: 'Devozione falsa, ostentata e ipocrita', partOfSpeech: 'sostantivo' },
    { lemma: 'CODRIONE', definition: 'Parte del dorso degli uccelli in cui si impianta la coda', partOfSpeech: 'sostantivo' },
    { lemma: 'GABBANUCCIO', definition: 'Corto mantello da lavoro rustico e povero', partOfSpeech: 'sostantivo' },
    { lemma: 'GAGLIOTTO', definition: 'Sciocco presuntuoso che ostenta sapere che non possiede', partOfSpeech: 'sostantivo' },
    { lemma: 'GIACCHIO', definition: 'Rete da pesca circolare lanciata a mano', partOfSpeech: 'sostantivo' },
    { lemma: 'GINNETTO', definition: 'Cavallo di razza spagnola, agile e snello', partOfSpeech: 'sostantivo' },
    { lemma: 'GUADINO', definition: 'Retino conico e dal lungo manico per il recupero del pesce all\'amo', partOfSpeech: 'sostantivo' },
    { lemma: 'KORE', definition: 'Scultura arcaica che rappresenta la grazia femminile', partOfSpeech: 'sostantivo' },
    { lemma: 'LABBREGGIARE', definition: 'Parlare mormorando sottovoce', partOfSpeech: 'verbo' },
    { lemma: 'MAGANZÉSE', definition: 'Traditore, fellone', partOfSpeech: 'sostantivo' },
    { lemma: 'MATE', definition: 'Arbusto sudamericano, le cui foglie si usano per infusi', partOfSpeech: 'sostantivo' },
    { lemma: 'MELANGOLA', definition: 'Arancio amaro dalla scorza aromatica', partOfSpeech: 'sostantivo' },
    { lemma: 'MOLAZZA', definition: 'Macchinario per triturare e macinare', partOfSpeech: 'sostantivo' },
    { lemma: 'MATRACCIO', definition: 'Recipiente di vetro da laboratorio, di forma sferica e collo lungo', partOfSpeech: 'sostantivo' },
    { lemma: 'NAU', definition: 'Veliero portoghese per rotte commerciali di lunga percorrenza', partOfSpeech: 'sostantivo' },
    { lemma: 'NIQUITOSO', definition: 'Malvagio, pieno di malizia e vizi', partOfSpeech: 'aggettivo' },
    { lemma: 'PABOLO', definition: 'Foraggio per animali domestici', partOfSpeech: 'sostantivo' },
    { lemma: 'PECORAGGINE', definition: 'Comportamento servile per viltà o mancanza di intelligenza', partOfSpeech: 'sostantivo' },
    { lemma: 'PEPLO', definition: 'Indumento femminile a drappo lasciato cadere in pieghe dalle spalle', partOfSpeech: 'sostantivo' },
    { lemma: 'PELTA', definition: 'Nell\'antica Grecia, piccolo scudo a mezzaluna', partOfSpeech: 'sostantivo' },
    { lemma: 'PIATTONATA', definition: 'Colpo dato con la parte piatta della lama di una spada', partOfSpeech: 'sostantivo' },
    { lemma: 'PITTIMA', definition: 'Persona fastidiosa pagata per seguire i debitori', partOfSpeech: 'sostantivo' },
    { lemma: 'POLEOGRAFIA', definition: 'Disciplina che studia la genesi e lo sviluppo delle città', partOfSpeech: 'sostantivo' },
    { lemma: 'RISGUARDI', definition: 'Prima e ultima pagina incollate alla copertina di un libro', partOfSpeech: 'sostantivo' },
    { lemma: 'SALACCAIO', definition: 'Venditore ambulante di pesce conservato sotto sale', partOfSpeech: 'sostantivo' },
    { lemma: 'SALAPUZIO', definition: 'Uomo di piccola statura, saccente e presuntuoso', partOfSpeech: 'sostantivo' },
    { lemma: 'SERTO', definition: 'Corona circolare intrecciata, ghirlanda', partOfSpeech: 'sostantivo' },
    { lemma: 'SIROCCHIA', definition: 'Sorella', partOfSpeech: 'sostantivo' },
    { lemma: 'SOLATIO', definition: 'Luogo soleggiato, esposto a mezzogiorno', partOfSpeech: 'sostantivo' },
    { lemma: 'UROPIGIO', definition: 'Ghiandola sebacea posta nella coda degli uccelli', partOfSpeech: 'sostantivo' },
    { lemma: 'VARROCCHIO', definition: 'Argano medievale per sollevare pesi notevoli', partOfSpeech: 'sostantivo' },
    { lemma: 'ZINZINAIRE', definition: 'Bere a piccoli sorsi', partOfSpeech: 'verbo' },
  ];

  let count = 0;
  for (const wordData of words) {
    try {
      const word = await prisma.word.upsert({
        where: { lemma: wordData.lemma },
        update: {},
        create: wordData,
      });
      console.log(`✅ Created word: ${word.lemma}`);
      count++;
    } catch (error) {
      console.error(`❌ Error creating word ${wordData.lemma}:`, error);
    }
  }

  console.log(`\n🌱 Seeding complete! Added ${count}/${words.length} words`);
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
