import { buildServer } from "./server.js";

const PORT = parseInt(process.env.PORT ?? "3001", 10);
const HOST = process.env.HOST ?? "0.0.0.0";

const server = await buildServer();

try {
  await server.listen({ port: PORT, host: HOST });
  console.log(`Support Hub API running on http://${HOST}:${PORT}`);
} catch (err) {
  server.log.error(err);
  process.exit(1);
}
