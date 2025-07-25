import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

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

  const authToken = await getAuthToken();

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

// Function to get authorization token
async function getAuthToken(): Promise<string> {
  try {
    console.log('Attempting to get authorization token...');

    if (!process.env.HUB_API_URL) {
      throw new Error('HUB_API_URL environment variable is not set');
    }

    if (!process.env.HUB_USER_EMAIL || !process.env.HUB_USER_PASSWORD) {
      throw new Error(
        'HUB_USER_EMAIL and HUB_USER_PASSWORD environment variables are required'
      );
    }

    const response = await fetch(`${process.env.HUB_API_URL}/api/auth/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: process.env.HUB_USER_EMAIL,
        password: process.env.HUB_USER_PASSWORD,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Authentication failed: ${response.status} ${response.statusText} - ${errorText}`
      );
    }

    const data = await response.json();
    console.log('Authentication response:', data);
    const token = data.data.token;
    if (!token) {
      throw new Error('No token received in authentication response');
    }

    console.log('Successfully obtained authorization token');
    return token;
  } catch (error) {
    console.error('Error getting auth token:', error);
    throw new Error(
      `Authentication failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}
