import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { getHubAuthToken } from './utils/authentication';

/**
 * Tool to get detailed information about an order by order number
 * @param orderNumber - The order number to fetch information for
 * @returns The order information
 */
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

/**
 * Tool to get list of orders for given filters
 * @param productType - The product type of the order
 * @param status - The status of the order
 * @param customerEmail - The email of the customer
 * @returns The list of orders
 */
export const orderListTool = createTool({
  id: 'get-order-list',
  description: 'Get list of orders for given filters',
  inputSchema: z.object({
    productType: z.string().describe('The product type of the order'),
    status: z.string().optional().describe('The status of the order'),
    customerEmail: z.string().optional().describe('The email of the customer'),
  }),
  outputSchema: z.object({
    orders: z.array(
      z.object({
        orderNumber: z.string(),
        status: z.string(),
        date: z.string(),
      })
    ),
  }),
  execute: async ({ context, runtimeContext }) => {
    // console.log('runtimeContext', runtimeContext);
    return await getOrderList({
      productType: context.productType,
      status: context.status,
      customerEmail: context.customerEmail,
    });
  },
});

const getOrderList = async (filters: {
  productType: string;
  status: string | undefined;
  customerEmail: string | undefined;
}) => {
  const authToken = await getHubAuthToken();
  const { productType, status, customerEmail } = filters;
  console.log('Fetching list of orders for given filters:', {
    productType,
    status,
    customerEmail,
  });

  const STATUS: Record<string, string> = {
    cancelled: '94',
    confirmed: '95',
    new: '96',
  };

  const statusFilter = status ? `&status[]=${STATUS[status.toLowerCase()]}` : '';
  const emailFilter = customerEmail ? `&column_name=logged_in_email&column_value=${encodeURIComponent(customerEmail)}` : '';
  const filtersString = `${statusFilter}${emailFilter}`;

  const url = `${process.env.HUB_API_URL}/api/order-list?product_type=${encodeURIComponent(productType)}&limit=10&page=1${filtersString}`;
  const response = await fetch(url, {
    headers: {
      authorization: `Bearer ${authToken}`,
      'Content-Type': 'application/json',
    },
  });
  const data = await response.json();

  if (!data) {
    return {
      orders: [],
    };
  }

  return {
    orders: data.data.map((order: any) => ({
      orderNumber: order.orderNumber,
      status: order.statusText,
      date: order.createdAt,
      customerEmail: order.contact.email,
    })),
  };
};
