import { createStep, createWorkflow } from '@mastra/core/workflows';
import { z } from 'zod';
import { findStatusAgent } from '../agents/find-status-agent';


const orderInfoSchema = z.object({
  orderId: z.string(),
  status: z.string(),
  date: z.string(),
});

const mapQueryToFilterStep = createStep({
    id: 'map-query-to-filter',
    description: 'Maps the user query to a filter object',
    inputSchema: z.object({
        query: z.string().describe('user query from which the filter should be found'),
    }),
    outputSchema: z.object({
        status_value: z.string(),
        id: z.string(),
        follow_up_question: z.string()
    }),
    execute: async ({ inputData, mastra }) => {
        if (!inputData) {
            throw new Error('Input data not found');
        }
        

        // make LLM call to find the status value and id
        const response = await findStatusAgent.generate([
            {
                role: 'user',
                content: inputData?.query
            }
        ]);

        const responseData = JSON.parse(response?.text);
        console.log('Response 1:', responseData);

        return {
            status_value: responseData?.status_value,
            id: responseData?.id,
            follow_up_question: responseData?.follow_up_question
        };
    }
});

const humanInLoopStep = createStep({
    id: 'human-in-loop',
    description: 'Summarizes the order information',
    inputSchema: z.object({
        status_value: z.string(),
        id: z.string(),
        follow_up_question: z.string()
    }),
    suspendSchema: z.object({
        follow_up_question: z.string()
    }),
    resumeSchema: z.object({
        status_value: z.string(),
    }),
    outputSchema: z.object({}),
    execute: async ({ inputData, resumeData, suspend, mastra }) => {
        if (!inputData) {
            throw new Error('Input data not found');
        }

        console.log("inputData", inputData);
        console.log("resumeData", resumeData);

        if(!resumeData?.status_value) {
            return suspend({ follow_up_question: inputData?.follow_up_question });
        }

        return {
            status_value: resumeData?.status_value,
        };
    }
})

const summarizeStep = createStep({
    id: 'summarize',
    description: 'Summarizes the order information',
    inputSchema: z.object({
        status_value: z.string(),
        id: z.string(),
        follow_up_question: z.string()
    }),
    outputSchema: z.object({}),
    execute: async ({ inputData, mastra }) => {
        if (!inputData) {
            throw new Error('Input data not found');
        }
        return "Hello";
    }
})


const fetchStatusIdStep = createStep({
    id: 'fetch-status-id',
    description: 'Fetches the status ID for a given user query',
    inputSchema: z.object({
        query: z.string().describe('user query from which the status value should be found'),
    }),
    outputSchema: z.object({
    }),
    execute: async ({ inputData, mastra }) => {
        if (!inputData) {
            throw new Error('Input data not found');
        }

        // console.log("inputData", inputData);

        const response = await findStatusAgent.generate([
            {
                role: 'user',
                content: inputData?.query
            }
        ]);

        console.log('Response 1:', response.text);

        return response.text;
    }
});

// const fetchOrderListStep = createStep({
//     id: 'fetch-order-list',
//     description: 'Fetches the list of orders for a given status ID',
//     inputSchema: z.object({
//         id: z.string().describe('The status ID to fetch orders for'),
//     })
// });


// const fetchOrderInfo = createStep({
//   id: 'fetch-order-info',
//   description: 'Fetches order information for a given order ID',
//   inputSchema: z.object({
//     orderId: z.string().describe('The order ID to fetch information for'),
//   }),
//   outputSchema: orderInfoSchema,
//   execute: async ({ inputData, mastra }) => {
//     if (!inputData) {
//       throw new Error('Input data not found');
//     }

//     const agent = mastra?.getAgent('orderAgent');
//     if (!agent) {
//       throw new Error('Order agent not found');
//     }

//     const response = await agent.stream([
//       {
//         role: 'user',
//         content: `Please get the order information for order ID: ${inputData.orderId}`,
//       },
//     ]);

//     let responseText = '';
//     for await (const chunk of response.textStream) {
//       responseText += chunk;
//     }

//     // Parse the response to extract order information
//     // This is a simplified approach - in a real implementation, you might want to use the tool directly
//     const orderInfo = {
//       orderId: inputData.orderId,
//       status: 'completed', // Default status
//       date: '23-07-2024', // Default date
//     };

//     return orderInfo;
//   },
// });

const orderWorkflow = createWorkflow({
  id: 'order-workflow',
  description: 'This workflow is used to get a list of orders. First it will fetch status ID from the user query. And then it will fetch the list of orders based on the provided filters.',
  inputSchema: z.object({
    query: z.string().describe('user query to fetch the data for'),
  }),
  outputSchema: z.object({
  }),
  steps: [mapQueryToFilterStep, humanInLoopStep, summarizeStep],
})
.then(mapQueryToFilterStep)
.then(humanInLoopStep)
// .branch([
//     [
//         async ({ inputData }) => {
//             return inputData?.follow_up_question;
//         },
//         humanInLoopStep,
//     ],
//     [
//         async ({ inputData }) => {
//             return inputData?.status_value;
//         },
//         summarizeStep,
//     ],
// ]);

orderWorkflow.commit();

export { orderWorkflow }; 