import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

export const orderTool = createTool({
  id: 'get-order-info',
  description: 'Get order information by order ID',
  inputSchema: z.object({
    orderId: z.string().describe('Order ID to fetch information for'),
  }),
  outputSchema: z.object({
    orderId: z.string(),
    status: z.string(),
    date: z.string(),
  }),
  execute: async ({ context, runtimeContext }) => {
    // console.log('runtimeContext', runtimeContext);
    return await getOrderInfo(context.orderId);
  },
});

const getOrderInfo = async (orderId: string) => {
  // Simulate API call delay
  await new Promise(resolve => setTimeout(resolve, 100));
  
  // Return dummy order information
  // In a real implementation, this would fetch from a database or API
  const dummyOrders: Record<string, { orderId: string; status: string; date: string }> = {
    'ABC123': {
      orderId: 'ABC123',
      status: 'completed',
      date: '23-07-2024',
    },
    'DEF456': {
      orderId: 'DEF456',
      status: 'pending',
      date: '24-07-2024',
    },
    'GHI789': {
      orderId: 'GHI789',
      status: 'shipped',
      date: '25-07-2024',
    },
  };

  const order = dummyOrders[orderId];
  
  if (!order) {
    // Return a default order if the specific orderId is not found
    return {
      orderId: orderId,
      status: 'not_found',
      date: '01-01-2024',
    };
  }

  return order;
}; 