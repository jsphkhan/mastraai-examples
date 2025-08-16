// import { NewAgentNetwork } from '@mastra/core/network/vNext';
import { NewAgentNetwork } from '../../scripts/agentnetwork';
import { Agent } from '@mastra/core/agent';
import { Memory } from '@mastra/memory';
import { openai } from '@ai-sdk/openai';
import { LibSQLStore } from '@mastra/libsql';
import { orderAgentSingle } from '../agents/order-agent-single';
import { orderAgentList } from '../agents/order-agent-list';


const memory = new Memory({
    storage: new LibSQLStore({
      url: 'file:../mastra.db', // Or your database URL
    }),
});

// create a default agent
const defaultAgent1 = new Agent({
    name: 'default-agent',
    description: 'A default agent that will be called to answer questions if none of the other agents was used to answer the question.',
    instructions: 'You are a helpful assistant that can answer questions if none of the other agents was used to answer the question.',
    model: openai('gpt-4.1-nano'),
    // memory: memoryToUse
});


// create a network
const orderAgentNetwork = new NewAgentNetwork({
    id: 'order-agent-network',
    name: 'Order Agent Network',
    instructions: `You are a network of helpful agents that can answer questions and help with relevant information.`,
    //'You can research cities. You can also synthesize research material. You can also write a full report based on the researched material. If a city is not found, you should politely say that you research only about cities.',
    model: openai('gpt-4o-mini'),
    defaultAgent: defaultAgent1,
    agents: {
        orderAgentSingle,
        orderAgentList,
        defaultAgent1
    },
    // workflows: {
    //     orderWorkflow
    // },
    tools: {},
    memory: memory,
});

export { orderAgentNetwork };
       