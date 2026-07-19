const { PrismaClient } = require('@prisma/client');
const { calcPricePerHour } = require('../utils/pricing');

const prisma = new PrismaClient();

async function main() {
  const products = await prisma.product.findMany({
    select: { id: true, pricePerDay: true, pricePerHour: true },
  });
  let updated = 0;
  for (const row of products) {
    if (Number(row.pricePerHour) > 0) continue;
    await prisma.product.update({
      where: { id: row.id },
      data: { pricePerHour: calcPricePerHour(row.pricePerDay) },
    });
    updated += 1;
  }
  console.log(`Backfilled hourly prices for ${updated} products`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
