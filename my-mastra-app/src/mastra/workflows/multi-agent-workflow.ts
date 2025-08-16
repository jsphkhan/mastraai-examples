/** 
 * Dummy Multi Agentic Workflow
*/

import { Agent} from '@mastra/core/agent';
import { createStep, createWorkflow } from '@mastra/core/workflows';
import { Memory } from '@mastra/memory';
import { LibSQLStore } from '@mastra/libsql';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';

// import agents
import { orderAgentSingle } from '../agents/order-agent-single';
import { orderAgentList } from '../agents/order-agent-list';

// enums
const RESOURCE_TYPES = z.enum(['agent', 'workflow', 'none', 'tool']);

// LLM models
const routingModel = openai('gpt-4o');

// create a Memory
const memoryToUse = new Memory({
    storage: new LibSQLStore({
      url: 'file:../mastra.db' // path is relative to the .mastra/output directory
    })
});

// create a default agent
const defaultAgent = new Agent({
    name: 'default-agent',
    description: 'You are a default agent that can handle any task.',
    instructions: 'You are a default agent that can handle any task.',
    model: openai('gpt-4.1-nano'),
    // memory: memoryToUse
});

// create Agent mapping
const agentMapping = [orderAgentSingle, orderAgentList, defaultAgent];

const getAgentList = () => {
    return agentMapping.map((agent) => {
      // Use agent name instead of description since description might not exist
      return ` - **${agent.name}**: ${agent.getDescription()}`;
    })
    .join('\n');
}
const agentList = getAgentList();

// console.log(agentList);

// create a Routing Agent
const getRoutingAgent = () => {
    const instructions = `
          You are a router in a network of specialized AI agents. 
          Your job is to decide which agent should handle each step of a task.

          You can only pick agents that are available in the lists below. Never call any agents that are not available in the lists below.

          ## Available Agents in Network
          ${agentList}

          ${
            defaultAgent
              ? `If none of the agents or workflows are appropriate, call the default agent: ${defaultAgent.name}.` +
                `This should not be done lightly. You should only do this if you have exhausted all other options.`
              : ''
          }

          If you have multiple entries that need to be called with an agent, call them separately with each input.
          When calling an agent, the prompt should be a text value, like you would call an LLM in a chat interface.

          Keep in mind that the user only sees the final result of the task. When reviewing completion, you should know that the user will not see the intermediate results.
        `;

    return new Agent({
      name: 'routing-agent',
      instructions,
      model: routingModel,
      memory: memoryToUse
    });
}

// Create Steps
const routingStep = createStep({
    id: 'routing-step',
    inputSchema: z.object({
        task: z.string(),
        resourceId: z.string(),
        resourceType: RESOURCE_TYPES,
        result: z.string().optional(),
        iteration: z.number(),
        threadId: z.string().optional(),
        threadResourceId: z.string().optional(),
        isOneOff: z.boolean(),
        verboseIntrospection: z.boolean(),
    }),
    outputSchema: z.object({
        task: z.string(),
        resourceId: z.string(),
        resourceType: RESOURCE_TYPES,
        prompt: z.string(),
        result: z.string(),
        isComplete: z.boolean().optional(),
        selectionReason: z.string(),
        // iteration: z.number(),
    }),
    execute: async ({ inputData }) => {
        const routingAgent = getRoutingAgent();
        const isOneOff = false;
        console.log('##### routingStep inputData ', inputData);

        // check for completeness
        const completionSchema = z.object({
            isComplete: z.boolean(),
            finalResult: z.string(),
            completionReason: z.string(),
        });
        let completionResult;
        if (inputData.resourceType !== 'none' && inputData?.result) {
            console.log('##### routingStep checking for completeness');
            // Check if the task is complete
            const completionPrompt = `
                The ${inputData.resourceType} ${inputData.resourceId} has contributed to the task.
                This is the result from the agent: ${inputData.result}

                You need to evaluate that our task is complete. Pay very close attention to the SYSTEM INSTRUCTIONS for when the task is considered complete. Only return true if the task is complete according to the system instructions. Pay close attention to the finalResult and completionReason.
                Original task: ${inputData.task}

                {
                    "isComplete": boolean,
                    "completionReason": string,
                    "finalResult": string
                }
            `;
  
            completionResult = await routingAgent.generate([{ role: 'assistant', content: completionPrompt }], {
              output: completionSchema
            });

            console.log('##### routingStep task complete? ', completionResult.object.isComplete);
  
            if (completionResult.object.isComplete) {
                const returnResult = {
                    task: inputData.task,
                    resourceId: '',
                    resourceType: 'none' as z.infer<typeof RESOURCE_TYPES>,
                    prompt: '',
                    result: completionResult.object.finalResult,
                    isComplete: true,
                    selectionReason: completionResult.object.completionReason,
                    // iteration: inputData.iteration + 1,
                };

                console.log('##### routingStep completionResult ', returnResult);
                return returnResult;
            }
        }

        const routingPrompt = `
            ${isOneOff ? 
            'You are executing just one primitive based on the user task. Make sure to pick the primitive that is the best suited to accomplish the whole task. Primitives that execute only part of the task should be avoided.' : 
            'You will be calling just *one* primitive at a time to accomplish the user task, every call to you is one decision in the process of accomplishing the user task. Make sure to pick primitives that are the best suited to accomplish the whole task. Completeness is the highest priority.'}

            The user has given you the following task: 
            ${inputData.task}
            ${completionResult ? `\n\n${completionResult.object.finalResult}` : ''}

            Please select the most appropriate primitive to handle this task and the prompt to be sent to the primitive.
            If you are calling the same agent again, make sure to adjust the prompt to be more specific.

            {
                "resourceId": string,
                "resourceType": "agent" | "workflow" | "tool",
                "prompt": string,
                "selectionReason": string
            }

            The 'selectionReason' property should explain why you picked the primitive${inputData.verboseIntrospection ? ', as well as why the other primitives were not picked.' : '.'}
        `;

        console.log('##### routingPrompt ', routingPrompt);

        // console.log('##### routingPrompt ', routingPrompt);
        const result = await routingAgent.generate(
            [
              {
                role: 'assistant',
                content: routingPrompt,
              },
            ],
            {
              output: z.object({
                resourceId: z.string(),
                resourceType: RESOURCE_TYPES,
                prompt: z.string(),
                selectionReason: z.string(),
              }),
            },
        );
  
        console.log('##### routingStep result ', result.object);

        return {
            task: inputData.task,
            result: '',
            resourceId: result.object.resourceId,
            resourceType: result.object.resourceType,
            prompt: result.object.prompt,
            isComplete: result.object.resourceId === 'none' && result.object.resourceType === 'none' ? true : false,
            selectionReason: result.object.selectionReason,
            // iteration: inputData.iteration + 1,
        };
    }
});

const agentStep = createStep({
    id: 'agent-step',
    inputSchema: z.object({
      task: z.string(),
      resourceId: z.string(),
      resourceType: RESOURCE_TYPES,
      prompt: z.string(),
      result: z.string(),
      isComplete: z.boolean().optional(),
      selectionReason: z.string(),
    //   iteration: z.number(),
    }),
    outputSchema: z.object({
        task: z.string(),
        resourceId: z.string(),
        resourceType: RESOURCE_TYPES,
        result: z.string(),
        isComplete: z.boolean().optional(),
        // iteration: z.number(),
    }),
    execute: async (context) => {
        const { inputData } = context;
        console.log('##### agentStep inputData ', inputData);
        const agentId = inputData.resourceId;

        const agent = agentMapping.find((agent) => agent.name === agentId);

        if (!agent) {
            throw new Error(`Agent ${agentId} not found`);
        }

        let streamPromise = {} as {
            promise: Promise<string>;
            resolve: (value: string) => void;
            reject: (reason?: any) => void;
        };
  
        streamPromise.promise = new Promise((resolve, reject) => {
            streamPromise.resolve = resolve;
            streamPromise.reject = reject;
        });

        const stream = await agent.stream(inputData.prompt, {
            onFinish: (result) => {
                // console.log('##### agentStep onFinish ');
                streamPromise.resolve(result.text);
            }
        });
        
        for await (const chunk of stream.fullStream) {
            // console.log('##### agentStep chunk ');
        }

        const finalResult = await streamPromise.promise;
        // console.log('##### agentStep finalResult ', finalResult);

        const returnResult = {
            task: inputData.task,
            resourceId: inputData.resourceId,
            resourceType: inputData.resourceType,
            result: finalResult,
            isComplete: false,
            // iteration: inputData.iteration,
        }

        console.log('##### agentStep result ', returnResult);

        return returnResult;
    },
});

const finishStep = createStep({
    id: 'finish-step',
    inputSchema: z.object({
      task: z.string(),
      resourceId: z.string(),
      resourceType: RESOURCE_TYPES,
      prompt: z.string(),
      result: z.string(),
      isComplete: z.boolean().optional(),
      selectionReason: z.string(),
    //   iteration: z.number(),
    }),
    outputSchema: z.object({
      task: z.string(),
      result: z.string(),
      isComplete: z.boolean(),
    //   iteration: z.number(),
    }),
    execute: async ({ inputData }) => {
        console.log('##### finishStep inputData ', inputData);
        return {
            task: inputData.task,
            result: inputData.result,
            isComplete: !!inputData.isComplete,
            // iteration: inputData.iteration,
        };
    },
});

// Define Main Workflow
const multiAgentWorkflow = createWorkflow({
    id: 'multi-agent-workflow',
    inputSchema: z.object({
        task: z.string(),
        resourceId: z.string(),
        resourceType: RESOURCE_TYPES,
        result: z.string().optional(),
        // iteration: z.number(),
        // threadId: z.string().optional(),
        // threadResourceId: z.string().optional(),
        // isOneOff: z.boolean(),
        verboseIntrospection: z.boolean(),
    }),
    outputSchema: z.object({
        task: z.string(),
        resourceId: z.string(),
        resourceType: RESOURCE_TYPES,
        prompt: z.string(),
        result: z.string(),
        isComplete: z.boolean().optional(),
        completionReason: z.string().optional(),
        iteration: z.number(),
        threadId: z.string().optional(),
        threadResourceId: z.string().optional(),
        isOneOff: z.boolean(),
    }),
    steps: [routingStep, agentStep, finishStep],
});

multiAgentWorkflow
.then(routingStep)
.branch([
    [async ({ inputData }) => !inputData.isComplete && inputData.resourceType === 'agent', agentStep],
    [async ({ inputData }) => inputData.isComplete, finishStep],
])
.map({
    task: {
      step: [routingStep, agentStep],
      path: 'task',
    },
    isComplete: {
      step: [agentStep, finishStep],
      path: 'isComplete',
    },
    completionReason: {
      step: [routingStep, agentStep, finishStep],
      path: 'completionReason',
    },
    result: {
      step: [agentStep, finishStep],
      path: 'result',
    },
    resourceId: {
      step: [routingStep, agentStep],
      path: 'resourceId',
    },
    resourceType: {
      step: [routingStep, agentStep],
      path: 'resourceType',
    },
    iteration: {
      step: [routingStep, agentStep],
      path: 'iteration',
    },
})
multiAgentWorkflow.commit();

const finalStep = createStep({
    id: 'final-step',
    inputSchema: multiAgentWorkflow.outputSchema,
    outputSchema: multiAgentWorkflow.outputSchema,
    execute: async ({ inputData }) => {
        return {
          ...inputData
        };
    }
});

// looping workflow
const mainWorkflow = createWorkflow({
        id: 'Agent-Network-Main-Workflow',
        inputSchema: z.object({
            // iteration: z.number(),
            task: z.string(),
            resourceType: RESOURCE_TYPES,
        }),
        outputSchema: multiAgentWorkflow.outputSchema,
    })
    .dountil(multiAgentWorkflow, async ({ inputData }) => {
        return inputData.isComplete;
    })
    .then(finalStep)
    .commit();


export { multiAgentWorkflow, mainWorkflow };