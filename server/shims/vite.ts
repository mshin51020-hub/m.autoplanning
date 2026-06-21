// Production shim: vite is not needed at runtime (only in dev mode)
export const createServer = async () => {
  console.error("[shim] Vite createServer called in production — ensure NODE_ENV=production in Railway Variables");
  process.exit(1);
};
export const defineConfig = (config: unknown) => config;
