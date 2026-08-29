import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import { env } from "./config/env";

import authRoutes from "./modules/auth/auth.routes";
import categoriesRoutes from "./modules/categories/categories.routes";
import accountsRoutes from "./modules/accounts/accounts.routes";
import transactionsRoutes from "./modules/transactions/transactions.routes";
import billsRoutes from "./modules/bills/bills.routes";
import dashboardRoutes from "./modules/dashboard/dashboard.routes";
import importRoutes from "./modules/import/import.routes";
import categorizerRoutes from "./modules/categorizer/categorizer.routes";

const app = express();

app.set("trust proxy", 1);

const allowedOrigins = env.CORS_ORIGIN.split(",").map((o) => o.trim());

app.use(helmet());
app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin || allowedOrigins.includes(origin)) cb(null, true);
      else cb(new Error("Not allowed by CORS"));
    },
    credentials: true,
  })
);
app.use(express.json({ limit: "2mb" }));
app.use(cookieParser());

app.use("/api/auth", authRoutes);
app.use("/api/categories", categoriesRoutes);
app.use("/api/accounts", accountsRoutes);
app.use("/api/transactions", transactionsRoutes);
app.use("/api/bills", billsRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/import", importRoutes);
app.use("/api/categorizer", categorizerRoutes);

app.use(
  (
    err: unknown,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction
  ) => {
    console.error(err);
    res.status(500).json({ error: "Erro interno" });
  }
);

export default app;
