
import 'dotenv/config';

import { MongoClient, Db } from 'mongodb';

import { Mastra } from '@mastra/core/mastra';
import { PinoLogger } from '@mastra/loggers';
import { LibSQLStore } from '@mastra/libsql';

// agents
import { weatherAgent } from './agents/weather-agent';
import { githubAgent } from './agents/github-agent';
import { planningAgent } from './agents/planning-agent';
import { synthesizeAgent } from './agents/synthesize-agent';
import { summaryTravelAgent, travelAgent } from './workflows/human-in-loop-workflow';
import { mastraDocsAgent } from './agents/mastra-docs-agent';
import { findStatusAgent } from './agents/find-status-agent';
import { orderAgentSingle } from './agents/order-agent-single';
import { orderAgentList } from './agents/order-agent-list';
import { testMCPAgent } from './agents/test-mcp-agent';

// workflows
import { orderWorkflow } from './workflows/order-workflow';
import { activityPlanningWorkflow } from './workflows/parallel-workflow';
import { conditionalWorkflow } from './workflows/conditional-workflow';
import { humanInLoopWorkflow } from './workflows/human-in-loop-workflow';
import { weatherWorkflow } from './workflows/weather-workflow';
import { recruitmentWorkflow } from './workflows/recruitment-workflow';

// mcp servers

// agent networks
import { network } from './networks/agent-network';
import { orderAgentNetwork } from './networks/order-agent-network';

const ENV = process.env.NODE_ENV || "development";

// mongo db conn url
const mongoUrl = `${process.env.MONGODB_URL}/${process.env.MONGODB_DB_NAME}`;
const mongoClient = new MongoClient(mongoUrl);
console.log('** Main server conecting to mongodb ** ', mongoUrl);
const conn = await mongoClient.connect();
const db = conn.db(process.env.MONGODB_DB_NAME);
console.log('** Main server mongodb connected **');


const mastra = new Mastra({
  workflows: { weatherWorkflow, orderWorkflow, activityPlanningWorkflow, conditionalWorkflow, humanInLoopWorkflow, recruitmentWorkflow },
  agents: { weatherAgent, planningAgent, synthesizeAgent, summaryTravelAgent, travelAgent, githubAgent, findStatusAgent, orderAgentSingle, orderAgentList, mastraDocsAgent, testMCPAgent},
  vnext_networks: {
    network,
    orderAgentNetwork
  },
  mcpServers: { },
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
  },
});

// @ts-ignore
mastra.dbCon = db;

export { mastra };