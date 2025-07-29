import { NewAgentNetwork } from '@mastra/core/network/vNext';
import { Agent } from '@mastra/core/agent';
import { createStep, createWorkflow } from '@mastra/core/workflows';
import { Memory } from '@mastra/memory';
import { openai } from '@ai-sdk/openai';
import { LibSQLStore } from '@mastra/libsql';
import { z } from 'zod';
import { weatherAgent } from '../agents/weather-agent';
import { orderAgent } from '../agents/order-agent';
import { conditionalWorkflow } from '../workflows/conditional-workflow';


const memory = new Memory({
    storage: new LibSQLStore({
      url: 'file:../mastra.db', // Or your database URL
    }),
});

const agent1 = new Agent({
    name: 'agent1',
    instructions:
      'This agent is used to do research, but not create full responses. Answer in bullet points only and be concise. Create a maximum of 5 bullet points.',
    description:
      'This agent is used to do research, but not create full responses. Answer in bullet points only and be concise.',
    model: openai('gpt-4o'),
});

const agent2 = new Agent({
    name: 'agent2',
    description: 'This agent is used to do text synthesis on researched material. It writes articles in full paragraphs.',
    instructions:
      'This agent is used to do text synthesis on researched material. Write a full report based on the researched material. Do not use bullet points. Write full paragraphs. There should not be a single bullet point in the final report. You write articles. Use a maximum of 10 words in total.',
    model: openai('gpt-4o'),
});

const defaultAgent1 = new Agent({
  name: 'defaultAgent',
  description: 'This is the default agent that will be used if no other agent is available.',
  instructions: 'You are a helpful assistant that can answer questions and help with relevant information.',
  model: openai('gpt-4o-mini'),
});

const agentStep1 = createStep({
    id: 'agent-step',
    description: 'This step is used to do research about a city',
    inputSchema: z.object({
      city: z.string().describe('The city to research'),
    }),
    outputSchema: z.object({
      text: z.string(),
    }),
    execute: async ({ inputData }) => {
        // generate structured output
      const resp = await agent1.generate(inputData.city, {
        output: z.object({
          text: z.string(),
        }),
      });

      console.log('##### agent1 response: ', resp.object.text);
   
      return { text: resp.object.text };
    },
});

const agentStep2 = createStep({
    id: 'agent-step-two',
    description: 'This step is used to do text synthesis on the researched material.',
    inputSchema: z.object({
      text: z.string(),
    }),
    outputSchema: z.object({
      text: z.string(),
    }),
    execute: async ({ inputData }) => {
      const resp = await agent2.generate(inputData.text, {
        output: z.object({
          text: z.string(),
        }),
      });

      console.log('##### agent2 response: ', resp.object.text);
   
      return { text: resp.object.text };
    },
});

// create a workflow
const workflow1 = createWorkflow({
    id: 'workflow1',
    description: 'This workflow is perfect for researching a specific city.',
    steps: [agentStep1, agentStep2],
    inputSchema: z.object({
      city: z.string(),
    }),
    outputSchema: z.object({
      text: z.string(),
    }),
  })
    .then(agentStep1)
    .then(agentStep2)
    .commit();


// create a network
const network = new NewAgentNetwork({
    id: 'test-network',
    name: 'Test Network',
    instructions: `You are a network of helpful agents that can answer questions and help with relevant information. After every response use the summaryAgent to summarize the response.`,
    //'You can research cities. You can also synthesize research material. You can also write a full report based on the researched material. If a city is not found, you should politely say that you research only about cities.',
    model: openai('gpt-4o'),
    defaultAgent: defaultAgent1,
    agents: {
        agent1,
        agent2,
        weatherAgent,
        orderAgent,
        defaultAgent1
    },
    workflows: {
        workflow1,
        conditionalWorkflow
    },
    memory: memory,
});

export { network };
       