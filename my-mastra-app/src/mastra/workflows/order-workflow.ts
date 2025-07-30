import { createStep, createWorkflow } from '@mastra/core/workflows';
import { z } from 'zod';
import { findStatusAgent } from '../agents/find-status-agent';


const orderInfoSchema = z.object({
  orderId: z.string(),
  status: z.string(),
  date: z.string(),
});


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
  description: 'This workflow is used to get a list of orders. First it will fetch status ID from the suer query. And then it will fetch the list of orders based on the provided filters.',
  inputSchema: z.object({
    query: z.string().describe('user query from which the status value should be found'),
  }),
  outputSchema: z.object({
  }),
})
.then(fetchStatusIdStep);

orderWorkflow.commit();

export { orderWorkflow }; 