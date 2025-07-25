import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { getHubAuthToken } from './utils/authentication';

export const orderTool = createTool({
  id: 'get-order-details',
  description: 'Get detailed information about an order by order number',
  inputSchema: z.object({
    orderNumber: z.string().describe('Order Number to fetch information for'),
  }),
  outputSchema: z.object({
    orderNumber: z.string(),
    status: z.string(),
    date: z.string(),
  }),
  execute: async ({ context, runtimeContext }) => {
    // console.log('runtimeContext', runtimeContext);
    return await getOrderInfo(context.orderNumber);
  },
});

const getOrderInfo = async (orderNumber: string) => {
  console.log('Fetching order information for order number:', orderNumber);

  const authToken = await getHubAuthToken();

  const response = await fetch(
    `${process.env.HUB_API_URL}/api/order-list/${orderNumber}`,
    {
      headers: {
        authorization: `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
    }
  );
  const data = await response.json();

  if (!data) {
    // Return a default order if the specific orderId is not found
    return {
      orderNumber: '',
      status: 'not_found',
      date: '',
    };
  }

  return {
    orderNumber: data.orderNumber,
    status: data.statusText,
    date: data.createdAt,
  };
};

