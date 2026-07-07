import "dotenv/config";
import bcrypt from "bcryptjs";
import { prisma } from "../src/lib/prisma";
import { runAssessmentPipeline } from "../src/agents/strategyAgent";

const DEMO_EMAIL = "demo@nexora.ai";
const DEMO_PASSWORD = "demo1234";

function daysAgo(n: number): Date {
  return new Date(Date.now() - n * 24 * 60 * 60 * 1000);
}

async function main() {
  console.log("Seeding Nexora demo data...");

  // Clean up any previous demo run so this script is safely re-runnable.
  const existingUser = await prisma.user.findUnique({ where: { email: DEMO_EMAIL } });
  if (existingUser) {
    const businesses = await prisma.business.findMany({ where: { userId: existingUser.id } });
    for (const b of businesses) {
      await prisma.chatMessage.deleteMany({ where: { businessId: b.id } });
      await prisma.automationDraft.deleteMany({ where: { businessId: b.id } });
      await prisma.mission.deleteMany({ where: { businessId: b.id } });
      await prisma.insight.deleteMany({ where: { businessId: b.id } });
      await prisma.memoryEvent.deleteMany({ where: { businessId: b.id } });
      await prisma.assessment.deleteMany({ where: { businessId: b.id } });
      await prisma.sale.deleteMany({ where: { businessId: b.id } });
      await prisma.customer.deleteMany({ where: { businessId: b.id } });
      await prisma.product.deleteMany({ where: { businessId: b.id } });
      await prisma.business.delete({ where: { id: b.id } });
    }
    await prisma.user.delete({ where: { id: existingUser.id } });
  }

  const hashed = await bcrypt.hash(DEMO_PASSWORD, 10);
  const user = await prisma.user.create({
    data: { name: "Priya Sharma", email: DEMO_EMAIL, password: hashed },
  });

  const business = await prisma.business.create({
    data: {
      userId: user.id,
      name: "Coastal Coffee Co.",
      industry: "Food & Beverage",
      category: "Café",
      location: "Kochi, Kerala",
      employees: "6-10",
      yearsInBusiness: "4",
      products: "Filter Coffee, Cold Brew, Pastries, Coffee Beans (retail)",
      services: "Dine-in, Takeaway, Catering",
      avgDailySales: 18500,
      avgMonthlyRevenue: 550000,
      googleBusiness: "https://g.page/coastalcoffeeco",
      instagram: "@coastalcoffeeco",
      website: "https://coastalcoffee.example.com",
      whatsappBiz: "+91 98765 43210",
      goals: "Increase repeat customers and grow catering orders for corporate clients.",
      discoveryComplete: true,
    },
  });

  const customerDefs = [
    { name: "Anjali Menon", phone: "+91 90000 00001", email: "anjali@example.com", daysSinceLast: 3, purchases: 6 },
    { name: "Ravi Kumar", phone: "+91 90000 00002", email: "ravi@example.com", daysSinceLast: 12, purchases: 4 },
    { name: "Sneha Pillai", phone: "+91 90000 00003", email: "sneha@example.com", daysSinceLast: 75, purchases: 2 },
    { name: "Thomas George", phone: "+91 90000 00004", email: "thomas@example.com", daysSinceLast: 90, purchases: 1 },
    { name: "Fatima Rasheed", phone: "+91 90000 00005", email: "fatima@example.com", daysSinceLast: 1, purchases: 9 },
    { name: "Arjun Nair", phone: "+91 90000 00006", email: "arjun@example.com", daysSinceLast: 40, purchases: 1 },
    { name: "Meera Iyer", phone: "+91 90000 00007", email: "meera@example.com", daysSinceLast: 5, purchases: 3 },
    { name: "Vishnu Prasad", phone: "+91 90000 00008", email: "vishnu@example.com", daysSinceLast: 65, purchases: 2 },
  ];

  const products = ["Filter Coffee", "Cold Brew", "Pastries", "Coffee Beans (retail)"];

  for (const def of customerDefs) {
    const customer = await prisma.customer.create({
      data: { businessId: business.id, name: def.name, phone: def.phone, email: def.email },
    });

    let lifetimeValue = 0;
    let lastPurchaseAt = new Date(0);

    for (let i = 0; i < def.purchases; i++) {
      // spread purchases backwards in time, most recent = daysSinceLast
      const daysBack = def.daysSinceLast + i * 18;
      const amount = Math.round(150 + Math.random() * 650);
      const product = products[Math.floor(Math.random() * products.length)];
      const date = daysAgo(daysBack);

      await prisma.sale.create({
        data: { businessId: business.id, customerId: customer.id, amount, product, date },
      });

      lifetimeValue += amount;
      if (date > lastPurchaseAt) lastPurchaseAt = date;
    }

    await prisma.customer.update({
      where: { id: customer.id },
      data: { lifetimeValue, lastPurchaseAt },
    });
  }

  for (const p of products) {
    await prisma.product.create({
      data: { businessId: business.id, name: p, price: Math.round(150 + Math.random() * 400), unitsSold: Math.floor(20 + Math.random() * 200) },
    });
  }

  console.log("Running assessment pipeline on seeded data...");
  await runAssessmentPipeline(business.id);

  console.log("\nDone! Demo login:");
  console.log(`  Email:    ${DEMO_EMAIL}`);
  console.log(`  Password: ${DEMO_PASSWORD}`);
  console.log(`\nBusiness: ${business.name} (${business.id})`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
