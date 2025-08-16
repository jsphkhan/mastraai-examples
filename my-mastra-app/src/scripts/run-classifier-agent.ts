import 'dotenv/config';
import { z } from 'zod';
import readline from "readline/promises";
import { stdin as input, stdout as output } from "process";
import { Agent } from '@mastra/core/agent';
import { openai } from '@ai-sdk/openai';

import { classifierAgent } from '../mastra/agents/classifier-agent';

// import agents
import { orderAgentSingle } from '../mastra/agents/order-agent-single';
import { orderAgentList } from '../mastra/agents/order-agent-list';

// create a default agent
const defaultAgent = new Agent({
    name: 'default-agent',
    description: 'A default agent that can handle any other user queries that do not fit into the other categories.',
    instructions: 'A default agent that can handle any other user queries that do not fit into the other categories. Be professional and concise in your response.',
    model: openai('gpt-4.1-nano'),
    // memory: memoryToUse
});

const agentMapping = {
    orderAgentSingle: orderAgentSingle,
    orderAgentList: orderAgentList,
    defaultAgent: defaultAgent
}

const schema = z.object({
    categories: z.array(z.string()),
    reasoning: z.string(),
    prompt: z.string()
});

const runClassifierAgent = async () => {
    const rl = readline.createInterface({ input, output });

    while(true) {
        const query = await rl.question("\nQuery: ");
        const prompt = `The user has given the following task. 
        ---
        Task: ${query}
        ---

        Your job is to analyze the task and assign all applicable agents from the list of available agents.
        Follow the output format below to generate the result.

        ## Output Format:
        "categories": ["orderAgentSingle", "orderAgentList"],
        "prompt": string
        "reasoning": string
        `;
        const result = await classifierAgent.generate([
            {
                role: 'assistant',
                content: prompt
            }
        ], {
            temperature: 0,
            // maxTokens: 100,
            output: schema
        });

        console.log(result.object);

        const categories = result.object?.categories;
        const reasoning = result.object?.reasoning;
        const agentPrompt = result.object?.prompt;

        // console.log(`\nCategories: ${categories.join(', ')}`);
        // console.log(`Reasoning: ${reasoning}`);

        const agent = agentMapping[categories[0] as keyof typeof agentMapping];
        
        if (agent) {
            // Use the agent here
            console.log(`Using agent: ${categories[0]}`);
            const stream = await agent.stream([
                {
                    role: 'user',
                    content: agentPrompt
                }
            ], {
                temperature: 0
            });

            for await (const chunk of stream.textStream) {
                process.stdout.write(chunk);
            }

            // console.log(agentResult.text);
        } else {
            console.log(`No agent found for category: ${categories[0]}`);
        }
    }
}

runClassifierAgent();