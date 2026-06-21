import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { registerStorageProxy } from "./storageProxy";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  const server = createServer(app);
  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  registerStorageProxy(app);
  registerOAuthRoutes(app);

  // 旧ドメイン（manus.space）から独自ドメインへ301リダイレクト
  const OLD_DOMAINS = ["mdotautoplanning.manus.space", "muscleapp-cwy8imwt.manus.space"];
  app.use((req, res, next) => {
    const host = req.hostname;
    if (OLD_DOMAINS.includes(host)) {
      return res.redirect(301, `https://m-autoplanning.com${req.originalUrl}`);
    }
    next();
  });

  // sitemap.xml
  app.get("/sitemap.xml", (req, res) => {
    const host = req.hostname;
    const baseUrl = OLD_DOMAINS.includes(host)
      ? "https://m-autoplanning.com"
      : `https://${host}`;
    const pages = [
      { url: "/", changefreq: "weekly", priority: "1.0" },
      { url: "/about", changefreq: "monthly", priority: "0.8" },
      { url: "/contact", changefreq: "monthly", priority: "0.7" },
      { url: "/privacy", changefreq: "monthly", priority: "0.5" },
      { url: "/terms", changefreq: "monthly", priority: "0.5" },
    ];
    const now = new Date().toISOString().split("T")[0];
    const xml = [
      `<?xml version="1.0" encoding="UTF-8"?>`,
      `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
      ...pages.map(
        (p) =>
          `  <url>\n    <loc>${baseUrl}${p.url}</loc>\n    <lastmod>${now}</lastmod>\n    <changefreq>${p.changefreq}</changefreq>\n    <priority>${p.priority}</priority>\n  </url>`
      ),
      `</urlset>`,
    ].join("\n");
    res.header("Content-Type", "application/xml");
    res.send(xml);
  });
  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);
