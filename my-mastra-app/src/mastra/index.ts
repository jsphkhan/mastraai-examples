
import { Mastra } from '@mastra/core/mastra';
import { PinoLogger } from '@mastra/loggers';
import { LibSQLStore } from '@mastra/libsql';
import { weatherWorkflow } from './workflows/weather-workflow';
import { weatherAgent } from './agents/weather-agent';
import { orderWorkflow } from './workflows/order-workflow';
import { activityPlanningWorkflow } from './workflows/parallel-workflow';
import { conditionalWorkflow } from './workflows/conditional-workflow';
import { humanInLoopWorkflow } from './workflows/human-in-loop-workflow';
import { orderAgent } from './agents/order-agent';
import { planningAgent } from './agents/planning-agent';
import { synthesizeAgent } from './agents/synthesize-agent';
import { summaryTravelAgent, travelAgent } from './workflows/human-in-loop-workflow';
import { network } from './networks/agent-network';

export const mastra = new Mastra({
  workflows: { weatherWorkflow, orderWorkflow, activityPlanningWorkflow, conditionalWorkflow, humanInLoopWorkflow },
  agents: { weatherAgent, orderAgent, planningAgent, synthesizeAgent, summaryTravelAgent, travelAgent },
  vnext_networks: {
    network,
  },
  storage: new LibSQLStore({
    // stores telemetry, evals, ... into memory storage, if it needs to persist, change to file:../mastra.db
    url: ":memory:",
  }),
  logger: new PinoLogger({
    name: 'Mastra',
    level: 'info',
  }),
});
