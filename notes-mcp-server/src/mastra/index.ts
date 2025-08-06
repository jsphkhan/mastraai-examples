import { Mastra } from '@mastra/core/mastra';
import { PinoLogger } from '@mastra/loggers';
import { LibSQLStore } from '@mastra/libsql';
import { notes } from './mcp/server';
import { mcpAgent } from './agents/mcp-agent';
 
export const mastra = new Mastra({
  storage: new LibSQLStore({
    // stores telemetry, evals, ... into memory storage, if it needs to persist, change to file:../mastra.db
    url: ":memory:",
  }),
  logger: new PinoLogger({
    name: 'Mastra',
    level: 'info',
  }),
  mcpServers: { notes },
  agents: { mcpAgent },
  server: {
    cors: {
      origin: ["*"], // Allow specific origins or '*' for all
      allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
      allowHeaders: ["Content-Type", "Authorization"],
      credentials: false,
    },
    port: 3000
  }
});
