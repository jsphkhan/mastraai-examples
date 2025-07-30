import { NewAgentNetwork } from '@mastra/core/network/vNext';
import { Memory } from '@mastra/memory';
import { openai } from '@ai-sdk/openai';
import { LibSQLStore } from '@mastra/libsql';
import { orderAgentSingle } from '../agents/order-agent-single';
import { orderAgentList } from '../agents/order-agent-list';
import { orderWorkflow } from '../workflows/order-workflow';


const memory = new Memory({
    storage: new LibSQLStore({
      url: 'file:../mastra.db', // Or your database URL
    }),
});


// create a network
const orderAgentNetwork = new NewAgentNetwork({
    id: 'order-agent-network',
    name: 'Order Agent Network',
    instructions: `You are a network of helpful agents that can answer questions and help with relevant information.`,
    //'You can research cities. You can also synthesize research material. You can also write a full report based on the researched material. If a city is not found, you should politely say that you research only about cities.',
    model: openai('gpt-4o'),
    agents: {
        orderAgentSingle,
        orderAgentList
    },
    workflows: {
        orderWorkflow
    },
    memory: memory,
});

export { orderAgentNetwork };
       