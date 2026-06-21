// Production shim: vite is not needed at runtime (only in dev mode)
export const createServer = async () => {
  throw new Error("Vite dev server is not available in production");
};
export const defineConfig = (config: unknown) => config;
