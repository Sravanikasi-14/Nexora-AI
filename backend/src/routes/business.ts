import { Router } from "express";
import multer from "multer";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { AuthedRequest, requireAuth } from "../middleware/auth";
import { parseCsvBuffer, pick } from "../utils/csv";
import { recordMemory } from "../agents/memoryAgent";

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

router.use(requireAuth);

// Get the current user's business (Nexora MVP: one business per user)
router.get("/me", async (req: AuthedRequest, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.userId! } });
  if (!user) return res.status(404).json({ error: "User not found" });

  const business = await prisma.business.findFirst({ where: { userId: req.userId! }, orderBy: { createdAt: "desc" } });
  res.json({
    business,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      passwordSetupRequired: !user.password,
    }
  });
});

const discoverySchema = z.object({
  name: z.string().min(1, "Business name is required"),
  industry: z.string().min(1, "Industry is required"),
  category: z.string().optional(),
  location: z.string().optional(),
  employees: z.string().optional(),
  yearsInBusiness: z.string().optional(),
  products: z.string().optional(),
  services: z.string().optional(),
  avgDailySales: z.number().optional().nullable(),
  avgMonthlyRevenue: z.number().optional().nullable(),
  googleBusiness: z.string().optional(),
  instagram: z.string().optional(),
  facebook: z.string().optional(),
  website: z.string().optional(),
  whatsappBiz: z.string().optional(),
  linkedin: z.string().optional(),
  goals: z.string().optional(),
  discoveryComplete: z.boolean().optional(),
  businessId: z.string().optional(),
});

// Create or update business discovery info. Only name + industry are required;
// everything else the owner may skip.
router.post("/", async (req: AuthedRequest, res) => {
  const parsed = discoverySchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const { businessId, ...data } = parsed.data;

  const business = businessId
    ? await prisma.business.update({ where: { id: businessId }, data })
    : await prisma.business.create({ data: { ...data, userId: req.userId! } });

  await recordMemory(business.id, "discovery_updated", `Business discovery info updated for "${business.name}".`);

  res.json({ business });
});

router.get("/:id", async (req: AuthedRequest, res) => {
  const business = await prisma.business.findUnique({ where: { id: req.params.id } });
  if (!business || business.userId !== req.userId) return res.status(404).json({ error: "Not found" });
  res.json({ business });
});

// CSV uploads: customer | sales | invoice | product
router.post("/:id/upload/:type", upload.single("file"), async (req: AuthedRequest, res) => {
  const business = await prisma.business.findUnique({ where: { id: req.params.id } });
  if (!business || business.userId !== req.userId) return res.status(404).json({ error: "Not found" });
  if (!req.file) return res.status(400).json({ error: "No file uploaded" });

  const { type } = req.params;
  let rows;
  try {
    rows = parseCsvBuffer(req.file.buffer);
  } catch (e) {
    return res.status(400).json({ error: "Could not parse CSV. Please check the file format." });
  }

  let created = 0;

  if (type === "customer") {
    for (const row of rows) {
      const name = pick(row, "name", "customer", "customer_name");
      if (!name) continue;
      await prisma.customer.create({
        data: {
          businessId: business.id,
          name,
          phone: pick(row, "phone", "mobile", "contact"),
          email: pick(row, "email"),
          notes: pick(row, "notes"),
        },
      });
      created++;
    }
  } else if (type === "sales" || type === "invoice") {
    for (const row of rows) {
      const amountStr = pick(row, "amount", "total", "invoice_amount", "price");
      if (!amountStr) continue;
      const amount = parseFloat(amountStr.replace(/[^0-9.-]/g, ""));
      if (isNaN(amount)) continue;

      const customerName = pick(row, "customer", "customer_name", "name");
      let customerId: string | undefined;
      if (customerName) {
        const existing = await prisma.customer.findFirst({ where: { businessId: business.id, name: customerName } });
        const customer =
          existing || (await prisma.customer.create({ data: { businessId: business.id, name: customerName } }));
        customerId = customer.id;
      }

      const dateStr = pick(row, "date", "invoice_date");
      const date = dateStr ? new Date(dateStr) : new Date();

      const sale = await prisma.sale.create({
        data: {
          businessId: business.id,
          customerId,
          amount,
          product: pick(row, "product", "item"),
          date: isNaN(date.getTime()) ? new Date() : date,
        },
      });

      if (customerId) {
        const custSales = await prisma.sale.findMany({ where: { customerId } });
        const lifetimeValue = custSales.reduce((acc: number, s: { amount: number }) => acc + s.amount, 0);
        const lastPurchaseAt = custSales.reduce(
          (latest: Date, s: { date: Date }) => (new Date(s.date) > latest ? new Date(s.date) : latest),
          new Date(0)
        );
        await prisma.customer.update({ where: { id: customerId }, data: { lifetimeValue, lastPurchaseAt } });
      }
      created++;
    }
  } else if (type === "product") {
    for (const row of rows) {
      const name = pick(row, "name", "product", "product_name");
      if (!name) continue;
      const priceStr = pick(row, "price");
      const unitsStr = pick(row, "units_sold", "units", "quantity");
      await prisma.product.create({
        data: {
          businessId: business.id,
          name,
          price: priceStr ? parseFloat(priceStr.replace(/[^0-9.-]/g, "")) : undefined,
          unitsSold: unitsStr ? parseInt(unitsStr, 10) : undefined,
        },
      });
      created++;
    }
  } else {
    return res.status(400).json({ error: "Unknown upload type" });
  }

  await recordMemory(business.id, "csv_uploaded", `Uploaded ${type} CSV with ${created} record(s) processed.`);

  res.json({ success: true, recordsProcessed: created });
});

export default router;
