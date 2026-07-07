import { Router } from "express";
import multer from "multer";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { AuthedRequest, requireAuth } from "../middleware/auth";
import { parseCsvBuffer, pick } from "../utils/csv";
import { parseExcelBuffer } from "../utils/excel";
import { runCustomerDataAnalysis, runCustomerManualAnalysis } from "../agents/customerDataAnalysisAgent";
import { runAssessmentPipeline } from "../agents/strategyAgent";
import { recordMemory } from "../agents/memoryAgent";

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

router.use(requireAuth);

async function assertBusinessOwnership(businessId: string, userId: string) {
  const business = await prisma.business.findUnique({ where: { id: businessId } });
  if (!business || business.userId !== userId) return null;
  return business;
}

// Global tracker map for background analysis
const analysisRunning = new Map<string, boolean>();

function triggerBackgroundAnalysis(businessId: string) {
  analysisRunning.set(businessId, true);
  (async () => {
    try {
      console.log(`[BackgroundAnalysis] Starting AI analysis for business: ${businessId}`);
      await runCustomerDataAnalysis(businessId);
      await runAssessmentPipeline(businessId);
      console.log(`[BackgroundAnalysis] Completed AI analysis for business: ${businessId}`);
    } catch (err) {
      console.error(`[BackgroundAnalysis] Failed for business: ${businessId}`, err);
    } finally {
      analysisRunning.set(businessId, false);
    }
  })();
}

// Check status of background analysis
router.get("/analysis-status/:businessId", async (req: AuthedRequest, res) => {
  const business = await assertBusinessOwnership(req.params.businessId, req.userId!);
  if (!business) return res.status(404).json({ error: "Not found" });
  res.json({ running: analysisRunning.get(business.id) || false });
});

// Get customers for a business
router.get("/business/:businessId", async (req: AuthedRequest, res) => {
  const business = await assertBusinessOwnership(req.params.businessId, req.userId!);
  if (!business) return res.status(404).json({ error: "Not found" });

  const customers = await prisma.customer.findMany({
    where: { businessId: business.id },
    orderBy: { lifetimeValue: "desc" },
    include: { sales: { orderBy: { date: "desc" } } },
  });

  const now = Date.now();
  const enriched = customers.map((c: any) => {
    const inactive = c.lastPurchaseAt ? now - new Date(c.lastPurchaseAt).getTime() > 60 * 86400000 : false;
    const nextOpportunity = inactive
      ? "Re-engagement message — no purchase in 60+ days."
      : c.sales.length > 1
      ? "Upsell or loyalty offer — repeat buyer."
      : "First follow-up after initial purchase to encourage a second visit.";
    return { ...c, inactive, nextOpportunity };
  });

  res.json({ customers: enriched });
});

// Zod schemas
const manualCustomerSchema = z.object({
  businessId: z.string(),
  name: z.string().min(1),
  phone: z.string().optional().nullable(),
  email: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  // Purchase details (if added on creation)
  product: z.string().optional().nullable(),
  productCategory: z.string().optional().nullable(),
  quantity: z.number().optional().nullable(),
  amount: z.number().optional().nullable(),
  date: z.string().optional().nullable(),
  paymentMethod: z.string().optional().nullable(),
});

const notesSchema = z.object({ notes: z.string() });

const manualMetricsSchema = z.object({
  totalCustomers: z.number(),
  newCustomers: z.number(),
  repeatCustomers: z.number(),
  customerGrowthPct: z.number(),
  monthlySales: z.number(),
  revenueTrendPct: z.number(),
  averageOrderValue: z.number(),
  customerLifetimeValue: z.number(),
  topProducts: z.array(z.object({ product: z.string(), revenue: z.number() })),
  segments: z.array(z.object({ name: z.string(), count: z.number(), revenue: z.number(), percentage: z.number(), description: z.string() })),
  churnRisk: z.object({ lowRiskCount: z.number(), mediumRiskCount: z.number(), highRiskCount: z.number() }),
});

// Create a single customer manually (or merge if existing)
router.post("/", async (req: AuthedRequest, res) => {
  const parsed = manualCustomerSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const business = await assertBusinessOwnership(parsed.data.businessId, req.userId!);
  if (!business) return res.status(404).json({ error: "Not found" });

  const {
    name,
    phone,
    email,
    city,
    notes,
    product,
    productCategory,
    quantity,
    amount,
    date,
    paymentMethod,
  } = parsed.data;

  // Intelligently check for duplicate customer
  let customer: any = null;
  if (phone && phone.trim() !== "") {
    customer = await prisma.customer.findFirst({
      where: { businessId: business.id, phone: phone.trim() },
    });
  }
  if (!customer && email && email.trim() !== "") {
    customer = await prisma.customer.findFirst({
      where: { businessId: business.id, email: email.trim().toLowerCase() },
    });
  }

  if (customer) {
    // Merge info
    const updateData: any = {};
    if ((!customer.phone || customer.phone === "") && phone) updateData.phone = phone.trim();
    if ((!customer.email || customer.email === "") && email) updateData.email = email.trim().toLowerCase();
    if ((!customer.city || customer.city === "") && city) updateData.city = city.trim();
    if (notes && notes.trim() !== "") {
      updateData.notes = customer.notes ? `${customer.notes}\n${notes.trim()}` : notes.trim();
    }
    
    if (Object.keys(updateData).length > 0) {
      customer = await prisma.customer.update({
        where: { id: customer.id },
        data: updateData,
      });
    }
  } else {
    // Create new
    customer = await prisma.customer.create({
      data: {
        businessId: business.id,
        name: name.trim(),
        phone: phone ? phone.trim() : null,
        email: email ? email.trim().toLowerCase() : null,
        city: city ? city.trim() : null,
        notes: notes ? notes.trim() : null,
      },
    });
  }

  // Create Sale record if purchase metrics were entered
  if (customer && amount !== undefined && amount !== null && amount > 0) {
    const saleDate = date ? new Date(date) : new Date();
    await prisma.sale.create({
      data: {
        businessId: business.id,
        customerId: customer.id,
        amount,
        product: product ? product.trim() : "Manual Entry",
        productCategory: productCategory ? productCategory.trim() : null,
        quantity: quantity || 1,
        paymentMethod: paymentMethod || null,
        notes: notes || null,
        date: isNaN(saleDate.getTime()) ? new Date() : saleDate,
      },
    });

    // Update customer LTV and last purchase
    const sales = await prisma.sale.findMany({ where: { customerId: customer.id } });
    const lifetimeValue = sales.reduce((sum, s) => sum + s.amount, 0);
    const lastPurchaseAt = sales.reduce(
      (latest: Date, s) => (new Date(s.date) > latest ? new Date(s.date) : latest),
      new Date(0)
    );

    customer = await prisma.customer.update({
      where: { id: customer.id },
      data: { lifetimeValue, lastPurchaseAt },
    });
  }

  // Trigger AI analysis asynchronously in background
  triggerBackgroundAnalysis(business.id);

  res.json({ customer, success: true });
});

// Edit Customer Profile details
const editCustomerSchema = z.object({
  name: z.string().min(1),
  phone: z.string().optional().nullable(),
  email: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

router.patch("/:id", async (req: AuthedRequest, res) => {
  const parsed = editCustomerSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const existingCustomer = await prisma.customer.findUnique({
    where: { id: req.params.id },
    include: { business: true },
  });
  if (!existingCustomer || existingCustomer.business.userId !== req.userId) {
    return res.status(404).json({ error: "Customer not found" });
  }

  const customer = await prisma.customer.update({
    where: { id: req.params.id },
    data: {
      name: parsed.data.name.trim(),
      phone: parsed.data.phone ? parsed.data.phone.trim() : null,
      email: parsed.data.email ? parsed.data.email.trim().toLowerCase() : null,
      city: parsed.data.city ? parsed.data.city.trim() : null,
      notes: parsed.data.notes ? parsed.data.notes.trim() : null,
    },
  });

  // Trigger AI analysis asynchronously in background
  triggerBackgroundAnalysis(customer.businessId);

  res.json({ customer });
});

// Delete Customer Profile
router.delete("/:id", async (req: AuthedRequest, res) => {
  const customer = await prisma.customer.findUnique({
    where: { id: req.params.id },
    include: { business: true },
  });
  if (!customer || customer.business.userId !== req.userId) {
    return res.status(404).json({ error: "Customer not found" });
  }

  // Delete all sales associated with this customer
  await prisma.sale.deleteMany({ where: { customerId: customer.id } });
  // Delete the customer
  await prisma.customer.delete({ where: { id: customer.id } });

  // Trigger AI analysis asynchronously in background
  triggerBackgroundAnalysis(customer.businessId);

  res.json({ success: true });
});

// Add Purchase manually to an existing customer profile
const addPurchaseSchema = z.object({
  product: z.string().min(1),
  productCategory: z.string().optional().nullable(),
  quantity: z.number().min(1),
  amount: z.number().min(0),
  date: z.string(),
  paymentMethod: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

router.post("/:id/sales", async (req: AuthedRequest, res) => {
  const parsed = addPurchaseSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const existingCustomer = await prisma.customer.findUnique({
    where: { id: req.params.id },
    include: { business: true },
  });
  if (!existingCustomer || existingCustomer.business.userId !== req.userId) {
    return res.status(404).json({ error: "Customer not found" });
  }

  const { product, productCategory, quantity, amount, date, paymentMethod, notes } = parsed.data;
  const saleDate = new Date(date);

  const sale = await prisma.sale.create({
    data: {
      businessId: existingCustomer.businessId,
      customerId: existingCustomer.id,
      amount,
      product: product.trim(),
      productCategory: productCategory ? productCategory.trim() : null,
      quantity,
      paymentMethod: paymentMethod || null,
      notes: notes || null,
      date: isNaN(saleDate.getTime()) ? new Date() : saleDate,
    },
  });

  // Recalculate lifetimeValue and lastPurchaseAt
  const sales = await prisma.sale.findMany({ where: { customerId: existingCustomer.id } });
  const lifetimeValue = sales.reduce((sum, s) => sum + s.amount, 0);
  const lastPurchaseAt = sales.reduce(
    (latest: Date, s) => (new Date(s.date) > latest ? new Date(s.date) : latest),
    new Date(0)
  );

  const customer = await prisma.customer.update({
    where: { id: existingCustomer.id },
    data: { lifetimeValue, lastPurchaseAt },
  });

  // Trigger AI analysis asynchronously in background
  triggerBackgroundAnalysis(customer.businessId);

  res.json({ sale, customer });
});

// Get customer details
router.get("/:id", async (req: AuthedRequest, res) => {
  const customer = await prisma.customer.findUnique({
    where: { id: req.params.id },
    include: { sales: { orderBy: { date: "desc" } }, business: true },
  });
  if (!customer || customer.business.userId !== req.userId) return res.status(404).json({ error: "Not found" });
  res.json({ customer });
});

// Update customer notes
router.patch("/:id/notes", async (req: AuthedRequest, res) => {
  const parsed = notesSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const customer = await prisma.customer.findUnique({ where: { id: req.params.id }, include: { business: true } });
  if (!customer || customer.business.userId !== req.userId) return res.status(404).json({ error: "Not found" });

  const updated = await prisma.customer.update({ where: { id: req.params.id }, data: { notes: parsed.data.notes } });
  res.json({ customer: updated });
});

// Upload Customer/Sales File (CSV or Excel) with duplicate merging
router.post("/upload/:businessId/:type", upload.single("file"), async (req: AuthedRequest, res) => {
  const { businessId, type } = req.params;
  const business = await assertBusinessOwnership(businessId, req.userId!);
  if (!business) return res.status(404).json({ error: "Not found" });
  if (!req.file) return res.status(400).json({ error: "No file uploaded" });

  const isExcel = req.file.originalname.endsWith(".xlsx") || req.file.originalname.endsWith(".xls");
  let rows;
  try {
    if (isExcel) {
      rows = parseExcelBuffer(req.file.buffer);
    } else {
      rows = parseCsvBuffer(req.file.buffer);
    }
  } catch (e) {
    return res.status(400).json({ error: `Could not parse ${isExcel ? "Excel" : "CSV"}. Please check formatting.` });
  }

  let created = 0;

  if (type === "customer") {
    for (const row of rows) {
      const name = pick(row, "name", "customer", "customer_name");
      if (!name) continue;

      const phone = pick(row, "phone", "mobile", "contact");
      const email = pick(row, "email");
      const city = pick(row, "city", "location");
      const notes = pick(row, "notes");

      // Duplicate check
      let customer = null;
      if (phone && phone.trim() !== "") {
        customer = await prisma.customer.findFirst({ where: { businessId: business.id, phone: phone.trim() } });
      }
      if (!customer && email && email.trim() !== "") {
        customer = await prisma.customer.findFirst({ where: { businessId: business.id, email: email.trim().toLowerCase() } });
      }

      if (customer) {
        // Merge missing customer details
        const updateData: any = {};
        if ((!customer.phone || customer.phone === "") && phone) updateData.phone = phone.trim();
        if ((!customer.email || customer.email === "") && email) updateData.email = email.trim().toLowerCase();
        if ((!customer.city || customer.city === "") && city) updateData.city = city.trim();
        if (notes && notes.trim() !== "") {
          updateData.notes = customer.notes ? `${customer.notes}\n${notes.trim()}` : notes.trim();
        }
        if (Object.keys(updateData).length > 0) {
          await prisma.customer.update({ where: { id: customer.id }, data: updateData });
        }
      } else {
        await prisma.customer.create({
          data: {
            businessId: business.id,
            name: name.trim(),
            phone: phone ? phone.trim() : null,
            email: email ? email.trim().toLowerCase() : null,
            city: city ? city.trim() : null,
            notes: notes ? notes.trim() : null,
          },
        });
      }
      created++;
    }
    // Log upload in UploadedCustomerFile
    await prisma.uploadedCustomerFile.create({
      data: {
        businessId: business.id,
        fileName: req.file.originalname,
        rowCount: created,
      },
    });
  } else if (type === "sales") {
    for (const row of rows) {
      const amountStr = pick(row, "amount", "total", "invoice_amount", "price");
      if (!amountStr) continue;
      const amount = parseFloat(amountStr.replace(/[^0-9.-]/g, ""));
      if (isNaN(amount)) continue;

      const customerName = pick(row, "customer", "customer_name", "name");
      const phone = pick(row, "phone", "mobile");
      const email = pick(row, "email");
      const city = pick(row, "city", "location");

      let customerId: string | undefined;
      let customer = null;
      
      // Try to find customer by phone, email, or name to merge duplicate sales
      if (phone && phone.trim() !== "") {
        customer = await prisma.customer.findFirst({ where: { businessId: business.id, phone: phone.trim() } });
      }
      if (!customer && email && email.trim() !== "") {
        customer = await prisma.customer.findFirst({ where: { businessId: business.id, email: email.trim().toLowerCase() } });
      }
      if (!customer && customerName && customerName.trim() !== "") {
        customer = await prisma.customer.findFirst({ where: { businessId: business.id, name: customerName.trim() } });
      }

      if (!customer && customerName && customerName.trim() !== "") {
        customer = await prisma.customer.create({
          data: {
            businessId: business.id,
            name: customerName.trim(),
            phone: phone ? phone.trim() : null,
            email: email ? email.trim().toLowerCase() : null,
            city: city ? city.trim() : null,
          },
        });
      }

      if (customer) {
        customerId = customer.id;
        // Merge missing contact info
        const updateData: any = {};
        if ((!customer.phone || customer.phone === "") && phone) updateData.phone = phone.trim();
        if ((!customer.email || customer.email === "") && email) updateData.email = email.trim().toLowerCase();
        if ((!customer.city || customer.city === "") && city) updateData.city = city.trim();
        if (Object.keys(updateData).length > 0) {
          await prisma.customer.update({ where: { id: customer.id }, data: updateData });
        }
      }

      const dateStr = pick(row, "date", "invoice_date");
      const date = dateStr ? new Date(dateStr) : new Date();

      await prisma.sale.create({
        data: {
          businessId: business.id,
          customerId,
          amount,
          product: pick(row, "product", "item") || "Purchase",
          productCategory: pick(row, "category", "product_category") || null,
          quantity: pick(row, "quantity", "qty") ? parseInt(pick(row, "quantity", "qty")!, 10) : 1,
          paymentMethod: pick(row, "payment", "payment_method") || null,
          notes: pick(row, "notes") || null,
          date: isNaN(date.getTime()) ? new Date() : date,
        },
      });

      if (customerId) {
        const custSales = await prisma.sale.findMany({ where: { customerId } });
        const lifetimeValue = custSales.reduce((acc: number, s: any) => acc + s.amount, 0);
        const lastPurchaseAt = custSales.reduce(
          (latest: Date, s: any) => (new Date(s.date) > latest ? new Date(s.date) : latest),
          new Date(0)
        );
        await prisma.customer.update({ where: { id: customerId }, data: { lifetimeValue, lastPurchaseAt } });
      }
      created++;
    }
    // Log upload in UploadedSalesFile
    await prisma.uploadedSalesFile.create({
      data: {
        businessId: business.id,
        fileName: req.file.originalname,
        rowCount: created,
      },
    });
  } else {
    return res.status(400).json({ error: "Invalid upload type. Must be 'customer' or 'sales'." });
  }

  await recordMemory(business.id, "csv_uploaded", `Uploaded ${type} file: ${req.file.originalname} with ${created} rows.`);

  // Trigger AI analysis asynchronously in background
  triggerBackgroundAnalysis(business.id);

  res.json({ success: true, recordsProcessed: created });
});

// Enter manual metrics
router.post("/manual/:businessId", async (req: AuthedRequest, res) => {
  const business = await assertBusinessOwnership(req.params.businessId, req.userId!);
  if (!business) return res.status(404).json({ error: "Not found" });

  const parsed = manualMetricsSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  try {
    const { report } = await runCustomerManualAnalysis(business.id, parsed.data);
    res.json({ success: true, report });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Manual analysis failed" });
  }
});

// Get generated reports
router.get("/reports/:businessId", async (req: AuthedRequest, res) => {
  const business = await assertBusinessOwnership(req.params.businessId, req.userId!);
  if (!business) return res.status(404).json({ error: "Not found" });

  const reports = await prisma.generatedReport.findMany({
    where: { businessId: business.id },
    orderBy: { createdAt: "desc" },
  });

  res.json({ reports });
});

// Get latest report
router.get("/reports/:businessId/latest", async (req: AuthedRequest, res) => {
  const business = await assertBusinessOwnership(req.params.businessId, req.userId!);
  if (!business) return res.status(404).json({ error: "Not found" });

  const report = await prisma.generatedReport.findFirst({
    where: { businessId: business.id },
    orderBy: { createdAt: "desc" },
  });

  if (!report) return res.status(404).json({ error: "No reports found" });

  res.json({ report: { ...report, content: JSON.parse(report.contentJson) } });
});

// Get customer file upload history
router.get("/files/:businessId", async (req: AuthedRequest, res) => {
  const business = await assertBusinessOwnership(req.params.businessId, req.userId!);
  if (!business) return res.status(404).json({ error: "Not found" });

  const customerFiles = await prisma.uploadedCustomerFile.findMany({
    where: { businessId: business.id },
    orderBy: { createdAt: "desc" },
  });

  const salesFiles = await prisma.uploadedSalesFile.findMany({
    where: { businessId: business.id },
    orderBy: { createdAt: "desc" },
  });

  res.json({ customerFiles, salesFiles });
});

export default router;
