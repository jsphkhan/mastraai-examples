import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { getHubAuthToken } from './utils/authentication';

const getOrderInfo = async (orderId: string, dbCon: any) => {
  console.log('Fetching order information for order number:', orderId);

  const authToken = await getHubAuthToken(dbCon);

  const response = await fetch(
    `${process.env.HUB_API_URL}/api/order-list/${orderId}`,
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
      orderId: '',
      status: 'not_found',
      date: '',
    };
  }

  return {
    orderId: data.orderNumber,
    status: data.statusText,
    date: data.createdAt,
  };
};

/**
 * Tool to get detailed information about an order by order number
 * @param orderId - The order number to fetch information for
 * @returns The order information
 */
export const orderTool = createTool({
  id: 'get-order-details',
  description: 'Get detailed information about an order by order ID',
  inputSchema: z.object({
    orderId: z.string().describe('Order ID to fetch information for the specific order'),
  }),
  outputSchema: z.object({
    orderId: z.string(),
    status: z.string(),
    date: z.string(),
  }),
  execute: async ({ context, mastra }) => {
    // console.log('runtimeContext', runtimeContext);
    // @ts-ignore
    return await getOrderInfo(context.orderId, mastra?.dbCon);
  },
});
