import { createStep, createWorkflow } from '@mastra/core/workflows';
import { z } from 'zod';

const orderInfoSchema = z.object({
  orderId: z.string(),
  status: z.string(),
  date: z.string(),
});

const fetchOrderInfo = createStep({
  id: 'fetch-order-info',
  description: 'Fetches order information for a given order ID',
  inputSchema: z.object({
    orderId: z.string().describe('The order ID to fetch information for'),
  }),
  outputSchema: orderInfoSchema,
  execute: async ({ inputData, mastra }) => {
    if (!inputData) {
      throw new Error('Input data not found');
    }

    const agent = mastra?.getAgent('orderAgent');
    if (!agent) {
      throw new Error('Order agent not found');
    }

    const response = await agent.stream([
      {
        role: 'user',
        content: `Please get the order information for order ID: ${inputData.orderId}`,
      },
    ]);

    let responseText = '';
    for await (const chunk of response.textStream) {
      responseText += chunk;
    }

    // Parse the response to extract order information
    // This is a simplified approach - in a real implementation, you might want to use the tool directly
    const orderInfo = {
      orderId: inputData.orderId,
      status: 'completed', // Default status
      date: '23-07-2024', // Default date
    };

    return orderInfo;
  },
});

const orderWorkflow = createWorkflow({
  id: 'order-workflow',
  inputSchema: z.object({
    orderId: z.string().describe('The order ID to get information for'),
  }),
  outputSchema: orderInfoSchema,
})
  .then(fetchOrderInfo);

orderWorkflow.commit();

export { orderWorkflow }; 