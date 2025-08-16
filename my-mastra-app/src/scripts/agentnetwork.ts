import EventEmitter from 'events';
import { Mastra } from '@mastra/core/mastra';
import { Memory } from '@mastra/memory';
import { randomUUID } from 'crypto';
import type { CoreMessage, UIMessage } from 'ai';
import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { Agent, MessageList, MastraLanguageModel, MastraMessageV2, AiMessageType } from '@mastra/core/agent';
// import type { MastraLanguageModel, UIMessageWithMetadata } from '../../agent';
import { MastraBase } from '@mastra/core/base';
import { RegisteredLogger } from '@mastra/core/logger';
// import type { MastraMemory } from '@mastra/memory';
import { RuntimeContext } from '@mastra/core/runtime-context';
import { createWorkflow, createStep, Workflow } from '@mastra/core/workflows';
import { Tool } from '@mastra/core/tools';

// types
type DynamicArgument<T> =
| T
  | (({ runtimeContext, mastra }: { runtimeContext: RuntimeContext; mastra?: Mastra }) => Promise<T> | T);


type UIMessageWithMetadata = UIMessage & {
    metadata?: Record<string, unknown>;
};

const EMITTER_SYMBOL = Symbol('emitter');

const emitter = new EventEmitter();

interface NewAgentNetworkConfig {
  id: string;
  name: string;
  instructions: DynamicArgument<string>;
  model: DynamicArgument<MastraLanguageModel>;
  agents: DynamicArgument<Record<string, Agent>>;
  workflows?: DynamicArgument<Record<string, Workflow>>;
  tools?: DynamicArgument<Record<string, Tool<any, any, any>>>;
  memory?: DynamicArgument<any>;
  defaultAgent?: DynamicArgument<Agent>;
}

const RESOURCE_TYPES = z.enum(['agent', 'workflow', 'none', 'tool']);

export class NewAgentNetwork extends MastraBase {
  id: string;
  name: string;
  #instructions: DynamicArgument<string>;
  #model: DynamicArgument<MastraLanguageModel>;
  #agents: DynamicArgument<Record<string, Agent>>;
  #defaultAgent: DynamicArgument<Agent> | undefined;
  #workflows: DynamicArgument<Record<string, Workflow>> | undefined;
  #tools: DynamicArgument<Record<string, Tool>> | undefined;
  #memory?: DynamicArgument<any>;
  #mastra?: Mastra;

  constructor({
    id,
    name,
    instructions,
    model,
    agents,
    workflows,
    memory,
    tools,
    defaultAgent,
  }: NewAgentNetworkConfig) {
    super({
      component: RegisteredLogger.NETWORK,
      name: name || 'NewAgentNetwork',
    });

    this.id = id;
    this.name = name;
    this.#instructions = instructions;
    this.#model = model;
    this.#agents = agents;
    this.#workflows = workflows;
    this.#memory = memory;
    this.#tools = tools;
    this.#defaultAgent = defaultAgent;
  }

  __registerMastra(mastra: Mastra) {
    this.#mastra = mastra;
  }

  private getLastMessage(messages: string | string[] | CoreMessage[] | AiMessageType[] | UIMessageWithMetadata[]) {
    let message = '';
    if (typeof messages === 'string') {
      message = messages;
    } else {
      const lastMessage = messages[messages.length - 1];
      if (typeof lastMessage === 'string') {
        message = lastMessage;
      } else if (lastMessage?.content) {
        const lastMessageContent = lastMessage.content;
        if (typeof lastMessageContent === 'string') {
          message = lastMessageContent;
        } else if (Array.isArray(lastMessageContent)) {
          const lastPart = lastMessageContent[lastMessageContent.length - 1];
          if (lastPart?.type === 'text') {
            message = lastPart.text;
          }
        }
      }
    }

    return message;
  }

  private async beforeRun({
    runtimeContext,
    threadId,
    resourceId,
    messages,
  }: {
    runtimeContext: RuntimeContext;
    threadId: string;
    resourceId: string;
    messages: string | string[] | CoreMessage[] | AiMessageType[] | UIMessageWithMetadata[];
  }) {
    const memory = await this.getMemory({ runtimeContext });
    let thread = await memory?.getThreadById({ threadId });
    if (!thread) {
      thread = await memory?.createThread({
        threadId,
        title: '',
        resourceId,
      });
    }
    if (typeof messages === 'string') {
      await memory?.saveMessages({
        messages: [
          {
            id: randomUUID(), // this.#mastra?.generateId() ||
            type: 'text',
            role: 'user',
            content: { parts: [{ type: 'text', text: messages }], format: 2 },
            createdAt: new Date(),
            threadId: thread?.id,
            resourceId: thread?.resourceId,
          },
        ] as MastraMessageV2[],
        format: 'v2',
      });
    } else {
      const messageList = new MessageList({
        threadId: thread?.id,
        resourceId: thread?.resourceId,
      });
      messageList.add(messages, 'user');
      const messagesToSave = messageList.get.all.v2();

      await memory?.saveMessages({
        messages: messagesToSave,
        format: 'v2',
      });
    }

    return thread;
  }

  async getAgents({ runtimeContext }: { runtimeContext?: RuntimeContext }) {
    let agentsToUse: Record<string, Agent>;

    if (typeof this.#agents === 'function') {
      agentsToUse = await this.#agents({ runtimeContext: runtimeContext || new RuntimeContext() });
    } else {
      agentsToUse = this.#agents;
    }

    return agentsToUse;
  }

  async getWorkflows({ runtimeContext }: { runtimeContext?: RuntimeContext }) {
    let workflowsToUse: Record<string, Workflow>;

    if (typeof this.#workflows === 'function') {
      workflowsToUse = await this.#workflows({ runtimeContext: runtimeContext || new RuntimeContext() });
    } else {
      workflowsToUse = this.#workflows || {};
    }

    return workflowsToUse;
  }

  async getTools({ runtimeContext }: { runtimeContext?: RuntimeContext }) {
    let toolsToUse: Record<string, Tool>;

    if (typeof this.#tools === 'function') {
      toolsToUse = await this.#tools({ runtimeContext: runtimeContext || new RuntimeContext() });
    } else {
      toolsToUse = this.#tools || {};
    }

    return toolsToUse;
  }

  async getMemory({ runtimeContext }: { runtimeContext?: RuntimeContext }) {
    let memoryToUse: any;

    if (!this.#memory) {
      return;
    }

    if (typeof this.#memory === 'function') {
      memoryToUse = await this.#memory({ runtimeContext: runtimeContext || new RuntimeContext() });
    } else {
      memoryToUse = this.#memory;
    }

    return memoryToUse;
  }

  async getInstructions({ runtimeContext }: { runtimeContext?: RuntimeContext }) {
    let instructionsToUse = this.#instructions;

    if (typeof instructionsToUse === 'function') {
      instructionsToUse = await instructionsToUse({ runtimeContext: runtimeContext || new RuntimeContext() });
    }

    return instructionsToUse;
  }

  async getAgentMapping({ runtimeContext }: { runtimeContext?: RuntimeContext }) {
    const agentsToUse = await this.getAgents({ runtimeContext: runtimeContext });

    if(this.#defaultAgent) {
      if(this.#defaultAgent) {
        let defaultAgentToUse: Agent;
        
        if (typeof this.#defaultAgent === 'function') {
          defaultAgentToUse = await this.#defaultAgent({ 
            runtimeContext: runtimeContext || new RuntimeContext() 
          });
        } else {
          defaultAgentToUse = this.#defaultAgent;
        }
        
        agentsToUse[defaultAgentToUse.name] = defaultAgentToUse;
      }
    }

    return agentsToUse;
  }

  async getRoutingAgent({ runtimeContext }: { runtimeContext?: RuntimeContext }) {
    const instructionsToUse = await this.getInstructions({ runtimeContext: runtimeContext || new RuntimeContext() });
    const memoryToUse = await this.getMemory({ runtimeContext: runtimeContext || new RuntimeContext() });
    const agentsToUse = await this.getAgents({ runtimeContext: runtimeContext || new RuntimeContext() });
    const workflowsToUse = await this.getWorkflows({ runtimeContext: runtimeContext || new RuntimeContext() });
    const toolsToUse = await this.getTools({ runtimeContext: runtimeContext || new RuntimeContext() });

    const agentList = Object.entries(agentsToUse)
      .map(([name, agent]) => {
        // Use agent name instead of description since description might not exist
        return ` - **${name}**: ${agent.getDescription()}`;
      })
      .join('\n');

    // console.log('##### agentList: \n', agentList);

    const workflowList = Object.entries(workflowsToUse)
      .map(([name, workflow]) => {
        return ` - **${name}**: ${workflow.description}, input schema: ${JSON.stringify(
          zodToJsonSchema(workflow.inputSchema),
        )}`;
      })
      .join('\n');

    const toolList = Object.entries(toolsToUse)
      .map(([name, tool]) => {
        return ` - **${name}**: ${tool.description}, input schema: ${JSON.stringify(
          zodToJsonSchema(tool.inputSchema || z.object({})),
        )}`;
      })
      .join('\n');

    const instructions = `
          You are a router in a network of specialized AI agents. 
          Your job is to decide which agent should handle each step of a task.

          If asking for completion of a task, make sure to follow system instructions closely.
            
          ## System Instructions
          ${instructionsToUse}

          You can only pick agents and workflows that are available in the lists below. Never call any agents or workflows that are not available in the lists below.

          ## Available Agents in Network
          ${agentList}

          ## Available Workflows in Network (make sure to use inputs corresponding to the input schema when calling a workflow)
          ${workflowList}

          ## Available Tools in Network (make sure to use inputs corresponding to the input schema when calling a tool)
          ${toolList}

          ${
            this.#defaultAgent
              ? `If none of the agents or workflows are appropriate, call the default agent: ${this.#defaultAgent.name}.` +
                `This should not be done lightly. You should only do this if you have exhausted all other options.`
              : ''
          }

          If you have multiple entries that need to be called with a workflow or agent, call them separately with each input.
          When calling a workflow, the prompt should be a JSON value that corresponds to the input schema of the workflow. The JSON value is stringified.
          When calling a tool, the prompt should be a JSON value that corresponds to the input schema of the tool. The JSON value is stringified.
          When calling an agent, the prompt should be a text value, like you would call an LLM in a chat interface.

          Keep in mind that the user only sees the final result of the task. When reviewing completion, you should know that the user will not see the intermediate results.
        `;

    // console.log('##### routing prompt: \n', instructions);

    return new Agent({
      name: 'routing-agent',
      instructions,
      model: this.#model,
      memory: memoryToUse,
      // @ts-ignore
      _agentNetworkAppend: true,
    });
  }

  async loop(
    messages: string | string[] | CoreMessage[] | AiMessageType[] | UIMessageWithMetadata[],
    {
      runtimeContext,
      maxIterations,
      threadId,
      resourceId,
    }: {
      runtimeContext?: RuntimeContext;
      maxIterations?: number;
      threadId?: string;
      resourceId?: string;
    },
  ) {
    const networkWorkflow = this.createWorkflow({ runtimeContext });

    const finalStep = createStep({
      id: 'final-step',
      inputSchema: networkWorkflow.outputSchema,
      outputSchema: networkWorkflow.outputSchema,
      execute: async ({ inputData }) => {
        if (maxIterations && inputData.iteration >= maxIterations) {
          return {
            ...inputData,
            completionReason: `Max iterations reached: ${maxIterations}`,
          };
        }

        return inputData;
      },
    });

    const mainWorkflow = createWorkflow({
      id: 'Agent-Network-Main-Workflow',
      inputSchema: z.object({
        iteration: z.number(),
        task: z.string(),
        resourceType: RESOURCE_TYPES,
        threadId: z.string().optional(),
        threadResourceId: z.string().optional(),
      }),
      outputSchema: networkWorkflow.outputSchema,
    })
      .dountil(networkWorkflow, async ({ inputData }) => {
        return inputData.isComplete || (maxIterations && inputData.iteration >= maxIterations);
      })
      .then(finalStep)
      .commit();

    const run = mainWorkflow.createRun();

    const thread = await this.beforeRun({
      runtimeContext: runtimeContext || new RuntimeContext(),
      threadId: threadId || run.runId,
      resourceId: resourceId || this.name,
      messages,
    });

    const message = this.getLastMessage(messages);

    const result = await run.start({
      inputData: {
        task: message,
        resourceType: 'none',
        iteration: 0,
        threadResourceId: thread?.resourceId,
        threadId: thread?.id,
      },
    });

    if (result.status === 'failed') {
      throw result.error;
    }

    if (result.status === 'suspended') {
      throw new Error('Workflow suspended');
    }

    return result;
  }

  async loopStream(
    messages: string | string[] | CoreMessage[] | AiMessageType[] | UIMessageWithMetadata[],
    {
      runtimeContext,
      maxIterations,
      threadId,
      resourceId,
    }: {
      runtimeContext?: RuntimeContext;
      maxIterations?: number;
      threadId?: string;
      resourceId?: string;
    },
  ) {
    const networkWorkflow = this.createWorkflow({ runtimeContext });

    const finalStep = createStep({
      id: 'final-step',
      inputSchema: networkWorkflow.outputSchema,
      outputSchema: networkWorkflow.outputSchema,
      execute: async ({ inputData }) => {
        console.log('##### finalStep inputData ', inputData);
        if (maxIterations && inputData.iteration >= maxIterations) {
          return {
            ...inputData,
            completionReason: `Max iterations reached: ${maxIterations}`,
          };
        }

        return inputData;
      },
    });

    const mainWorkflow = createWorkflow({
      id: 'Agent-Network-Main-Workflow',
      inputSchema: z.object({
        iteration: z.number(),
        task: z.string(),
        resourceId: z.string(),
        resourceType: RESOURCE_TYPES,
        result: z.string().optional(),
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
        completionReason: z.string().optional(),
        iteration: z.number(),
      }),
    })
    .dountil(networkWorkflow, async ({ inputData }) => {
      return inputData.isComplete || (maxIterations && inputData.iteration >= maxIterations);
    })
    .then(finalStep)
    .commit();

    const run = mainWorkflow.createRun();

    const thread = await this.beforeRun({
      runtimeContext: runtimeContext || new RuntimeContext(),
      threadId: threadId || run.runId,
      resourceId: resourceId || this.name,
      messages,
    });

    const message = this.getLastMessage(messages);
    console.log('##### loopStream message ', messages, threadId, resourceId);

    return run.stream({
      inputData: {
        task: message,
        resourceId: '',
        resourceType: 'none',
        iteration: 0,
        threadResourceId: thread?.resourceId,
        threadId: thread?.id,
        isOneOff: false,
        verboseIntrospection: true,
      },
    });
  }

  createWorkflow({ runtimeContext }: { runtimeContext?: RuntimeContext }) {
    const runId = randomUUID(); // this.#mastra?.generateId() || 

    const runtimeContextToUse = runtimeContext || new RuntimeContext();

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
        iteration: z.number(),
      }),
      execute: async ({ inputData, getInitData }) => {
        console.log('##### routingStep inputData ', inputData);
        const initData = await getInitData();

        const routingAgent = await this.getRoutingAgent({ runtimeContext: runtimeContextToUse });

        const completionSchema = z.object({
          isComplete: z.boolean(),
          finalResult: z.string(),
          completionReason: z.string(),
        });
        let completionResult;
        if (inputData.resourceType !== 'none' && inputData?.result) {
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
          
          console.log('##### completionPrompt ', completionPrompt);

          completionResult = await routingAgent.generate([{ role: 'assistant', content: completionPrompt }], {
            output: completionSchema,
            threadId: initData?.threadId ?? runId,
            resourceId: initData?.threadResourceId ?? this.name,
            runtimeContext: runtimeContextToUse,
          });

          console.log('##### completionResult ', completionResult.object);

          if (completionResult.object.isComplete) {
            return {
              task: inputData.task,
              resourceId: '',
              resourceType: 'none' as z.infer<typeof RESOURCE_TYPES>,
              prompt: '',
              result: completionResult.object.finalResult,
              isComplete: true,
              selectionReason: completionResult.object.completionReason,
              iteration: inputData.iteration + 1,
            };
          }
        }

        const routingPrompt = `
          ${inputData.isOneOff ? 'You are executing just one primitive based on the user task. Make sure to pick the primitive that is the best suited to accomplish the whole task. Primitives that execute only part of the task should be avoided.' : 'You will be calling just *one* primitive at a time to accomplish the user task, every call to you is one decision in the process of accomplishing the user task. Make sure to pick primitives that are the best suited to accomplish the whole task. Completeness is the highest priority.'}

          The user has given you the following task: 
          ${inputData.task}
          ${completionResult ? `\n\n${completionResult.object.finalResult}` : ''}

          Please select the most appropriate primitive to handle this task and the prompt to be sent to the primitive.
          If you are calling the same agent again, make sure to adjust the prompt to be more specific.

          {
              "resourceId": string,
              "resourceType": "agent",
              "prompt": string,
              "selectionReason": string
          }

          The 'selectionReason' property should explain why you picked the primitive${inputData.verboseIntrospection ? ', as well as why the other primitives were not picked.' : '.'}
          `
        console.log('##### routingPrompt ', routingPrompt);
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
            threadId: initData?.threadId ?? runId,
            resourceId: initData?.threadResourceId ?? this.name,
            runtimeContext: runtimeContextToUse,
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
          iteration: inputData.iteration + 1,
        };
      },
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
        iteration: z.number(),
      }),
      outputSchema: z.object({
        task: z.string(),
        resourceId: z.string(),
        resourceType: RESOURCE_TYPES,
        result: z.string(),
        isComplete: z.boolean().optional(),
        iteration: z.number(),
      }),
      //@ts-ignore
      execute: async (context) => {
        const { inputData, getInitData } = context;
        console.log('##### agentStep inputData ', inputData);
        // const emitter = (rest as any)[EMITTER_SYMBOL];
        const agentsMap = await this.getAgentMapping({ runtimeContext: runtimeContextToUse });
        const agentId = inputData.resourceId;

        // console.log('##### agentsMap: \n', agentsMap);
        const agent = agentsMap[inputData.resourceId];

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
        const toolData = {
          name: agent.name,
          args: inputData,
        };
        await emitter.emit('watch-v2', {
          type: 'tool-call-streaming-start',
          ...toolData,
        });
        const { fullStream } = await agent.stream(inputData.prompt, {
          // resourceId: inputData.resourceId,
          // threadId: inputData.threadId,
          runtimeContext: runtimeContextToUse,
          onFinish: result => {
            streamPromise.resolve(result.text);
          },
        });

        for await (const chunk of fullStream) {
          switch (chunk.type) {
            case 'text-delta':
              await emitter.emit('watch-v2', {
                type: 'tool-call-delta',
                ...toolData,
                argsTextDelta: chunk.textDelta,
              });
              break;

            case 'step-start':
            case 'step-finish':
            case 'finish':
            case 'tool-call':
            case 'tool-result':
            case 'tool-call-streaming-start':
            case 'tool-call-delta':
              break;
            case 'source':
            case 'file':
            default:
              await emitter.emit('watch-v2', chunk);
              break;
          }
        }

        const finalResult = await streamPromise.promise;

        const memory = await this.getMemory({ runtimeContext: runtimeContext || new RuntimeContext() });
        const initData = await getInitData();
        await memory?.saveMessages({
          messages: [
            {
              id: randomUUID(), // this.#mastra?.generateId() || 
              type: 'text',
              role: 'assistant',
              content: { parts: [{ type: 'text', text: finalResult }], format: 2 },
              createdAt: new Date(),
              threadId: initData.threadId || runId,
              resourceId: initData.threadResourceId || this.name,
            },
          ] as MastraMessageV2[],
          format: 'v2',
        });

        const returnResult = {
          task: inputData.task,
          resourceId: inputData.resourceId,
          resourceType: inputData.resourceType,
          result: finalResult,
          isComplete: false,
          iteration: inputData.iteration,
        };

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
        iteration: z.number(),
      }),
      outputSchema: z.object({
        task: z.string(),
        result: z.string(),
        isComplete: z.boolean(),
        iteration: z.number(),
      }),
      execute: async ({ inputData }) => {
        console.log('##### finishStep inputData ', inputData);
        return {
          task: inputData.task,
          result: inputData.result,
          isComplete: !!inputData.isComplete,
          iteration: inputData.iteration,
        };
      },
    });

    const networkWorkflow = createWorkflow({
      id: 'Agent-Network-Outer-Workflow',
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
        completionReason: z.string().optional(),
        iteration: z.number(),
        threadId: z.string().optional(),
        threadResourceId: z.string().optional(),
        isOneOff: z.boolean(),
      }),
    });

    networkWorkflow
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
        isOneOff: {
          initData: networkWorkflow,
          path: 'isOneOff',
        },
        threadId: {
          initData: networkWorkflow,
          path: 'threadId',
        },
        threadResourceId: {
          initData: networkWorkflow,
          path: 'threadResourceId',
        },
      })
      .commit();

    return networkWorkflow;
  }

  async generate(
    messages: string | string[] | CoreMessage[] | AiMessageType[] | UIMessageWithMetadata[],
    {
      runtimeContext,
      threadId,
      resourceId,
    }: { runtimeContext?: RuntimeContext; threadId?: string; resourceId?: string },
  ) {
    const networkWorkflow = this.createWorkflow({ runtimeContext });
    const run = networkWorkflow.createRun();

    const thread = await this.beforeRun({
      runtimeContext: runtimeContext || new RuntimeContext(),
      threadId: threadId || run.runId,
      resourceId: resourceId || this.name,
      messages,
    });

    const message = this.getLastMessage(messages);

    const result = await run.start({
      inputData: {
        task: message,
        resourceId: '',
        resourceType: 'none',
        iteration: 0,
        threadId: thread?.id,
        threadResourceId: thread?.resourceId,
        isOneOff: true,
        verboseIntrospection: true,
      },
    });

    if (result.status === 'failed') {
      throw result.error;
    }

    if (result.status === 'suspended') {
      throw new Error('Workflow suspended');
    }

    return {
      task: result.result.task,
      result: result.result.result,
      resourceId: result.result.resourceId,
      resourceType: result.result.resourceType,
    };
  }

  async stream(
    messages: string | string[] | CoreMessage[] | AiMessageType[] | UIMessageWithMetadata[],
    {
      runtimeContext,
      threadId,
      resourceId,
    }: { runtimeContext?: RuntimeContext; resourceId?: string; threadId?: string },
  ) {
    const networkWorkflow = this.createWorkflow({ runtimeContext });
    const run = networkWorkflow.createRun();

    const thread = await this.beforeRun({
      runtimeContext: runtimeContext || new RuntimeContext(),
      threadId: threadId || run.runId,
      resourceId: resourceId || this.name,
      messages,
    });

    const message = this.getLastMessage(messages);

    return run.stream({
      inputData: {
        task: `You are executing just one primitive based on the following: ${message}`,
        resourceId: '',
        resourceType: 'none',
        iteration: 0,
        threadResourceId: thread?.resourceId,
        threadId: thread?.id,
        isOneOff: true,
        verboseIntrospection: true,
      },
    });
  }
}