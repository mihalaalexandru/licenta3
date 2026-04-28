const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function cleanOldHistory() {
  console.log('⏳ Incepem curatenia de primavara in baza de date...');
  
  const limitDate = new Date();
  limitDate.setHours(limitDate.getHours() - 24);

  try {
    const result = await prisma.priceHistory.deleteMany({
      where: {
        createdAt: {
          lt: limitDate
        }
      }
    });
    
    console.log(`✅ SUCCES: Am sters ${result.count} inregistrari inutile!`);
    console.log('Aplicația ta ar trebui sa se miste instantaneu acum.');
  } catch (error) {
    console.error('Eroare la stergere:', error.message);
  }
}

cleanOldHistory()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));