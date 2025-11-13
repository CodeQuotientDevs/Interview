import "@root/libs/dynamic-env";
import "./services/mongodb";
import { RedisStore } from "connect-redis"
import { logger, argsMap } from "./libs";
import { createServer } from "./server";
import sharedRedis from "./services/sharedRedis"
import listEndpoints from "express-list-endpoints";
const port = argsMap.get('port') ?? process.env.PORT ?? 4000;
const frontendUrl = process.env.FRONTEND_URL || "";

logger.info({ port });

const sessionStore = new RedisStore({
	client: sharedRedis,
});

const server = createServer(sessionStore, {
	frontendUrl: frontendUrl,
	enableMetrics: true,
});

const endpoints = listEndpoints(server);
logger.info({ endpoints }, 'Registered HTTP endpoints');

export const listener = server.listen(port, (err) => {
	if (!err) {
		return;
	}
	logger.error({ err });
	process.exit(1);
});

process.on('SIGTERM', () => {
	listener.close();
});
