import { buildServer } from "./server.js";
import { migrate } from "./db/migrate.js";

const PORT = parseInt(process.env.PORT ?? "3001", 10);
const HOST = process.env.HOST ?? "0.0.0.0";

if (process.env.RUN_MIGRATIONS_ON_STARTUP !== "false") {
  await migrate({ closePoolWhenDone: false });
}

const server = await buildServer();

try {
  await server.listen({ port: PORT, host: HOST });
  console.log(`Support Hub API running on http://${HOST}:${PORT}`);
} catch (err) {
  server.log.error(err);
  process.exit(1);
}
