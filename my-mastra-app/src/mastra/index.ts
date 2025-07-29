
import { Mastra } from '@mastra/core/mastra';
import { PinoLogger } from '@mastra/loggers';
import { LibSQLStore } from '@mastra/libsql';

// agents
import { weatherAgent } from './agents/weather-agent';
import { githubAgent } from './agents/github-agent';
import { orderAgent } from './agents/order-agent';
import { planningAgent } from './agents/planning-agent';
import { synthesizeAgent } from './agents/synthesize-agent';
import { summaryTravelAgent, travelAgent } from './workflows/human-in-loop-workflow';
import { mastraDocsAgent } from './agents/mastra-docs-agent';

// workflows
import { orderWorkflow } from './workflows/order-workflow';
import { activityPlanningWorkflow } from './workflows/parallel-workflow';
import { conditionalWorkflow } from './workflows/conditional-workflow';
import { humanInLoopWorkflow } from './workflows/human-in-loop-workflow';
import { weatherWorkflow } from './workflows/weather-workflow';
import { recruitmentWorkflow } from './workflows/recruitment-workflow';

// agent networks
import { network } from './networks/agent-network';

const ENV = process.env.NODE_ENV || "development";

export const mastra = new Mastra({
  workflows: { weatherWorkflow, orderWorkflow, activityPlanningWorkflow, conditionalWorkflow, humanInLoopWorkflow, recruitmentWorkflow },
  agents: { weatherAgent, orderAgent, planningAgent, synthesizeAgent, summaryTravelAgent, travelAgent, githubAgent},
  vnext_networks: {
    network,
  },
  mcpServers: {},
  storage: new LibSQLStore({
    // stores telemetry, evals, ... into memory storage, if it needs to persist, change to file:../mastra.db
    url: ":memory:",
  }),
  logger: new PinoLogger({
    name: 'Mastra',
    level: 'info',
  }),
  server: {
    cors: ENV === "development" ? {
      origin: "*",
      allowMethods: ["*"],
      allowHeaders: ["*"],
    } : undefined,
  }
});
