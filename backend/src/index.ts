import "dotenv/config";
import express from "express";
import cors from "cors";

import authRoutes from "./routes/auth";
import businessRoutes from "./routes/business";
import assessmentRoutes from "./routes/assessment";
import dashboardRoutes from "./routes/dashboard";
import customerRoutes from "./routes/customers";
import chatRoutes from "./routes/chat";
import growthRoutes from "./routes/growth";
import { isAiEnabled } from "./services/gemini";

const app = express();

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);

    const allowedOrigins = [
      "http://localhost:3000",
      "http://localhost:3001",
      process.env.CLIENT_ORIGIN,
    ];

    if (
      allowedOrigins.includes(origin) ||
      origin.endsWith(".vercel.app")
    ) {
      return callback(null, true);
    }

    return callback(new Error("Not allowed by CORS"));
  },
  credentials: true,
}));
app.use(express.json({ limit: "5mb" }));

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", aiEnabled: isAiEnabled() });
});

app.use("/api/auth", authRoutes);
app.use("/api/business", businessRoutes);
app.use("/api/assessment", assessmentRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/customers", customerRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api", growthRoutes); // /api/insights/:id, /api/missions/:id, /api/automation/:id

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
});

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 4000;
app.listen(PORT, () => {
  console.log(`Nexora backend running on http://localhost:${PORT}`);
  console.log(`AI (Gemini) enabled: ${isAiEnabled()}`);
});
