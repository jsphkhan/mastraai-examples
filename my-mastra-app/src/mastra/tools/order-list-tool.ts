import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { getHubAuthToken } from './utils/authentication';


const getOrderList = async (filters: {
  productType: string | undefined;
  status: string | undefined;
  customerEmail: string | undefined;
}, dbCon: any) => {
  const authToken = await getHubAuthToken(dbCon);
  const { productType, status, customerEmail } = filters;
  console.log('Fetching list of orders for given filters:', {
    productType,
    status,
    customerEmail,
  });

  const STATUS: Record<string, string> = {
    "new": "10",
    "confirm decision": "50",
    "mixed": "1000",
    "booking in progress": "18",
    "unprocessed": "89",
    "refund cannot be processed": "102",
    "failed": "91",
    "cancelled": "94",
    "duplicate": "100",
    "reorder": "200",
    "refunded": "95",
    "manually cancelled": "96",
    "smart booking cancelled": "201",
    "manual payment": "64",
    "manually ordered": "51",
    "manual confirm queue": "52",
    "reprice confirm queue": "65",
    "auto confirm started": "54",
    "auto confirm queue": "55",
    "auto confirm in progress": "56",
    "auto confirmed partial booking": "57",
    "auto confirmed": "58",
    "auto confirm failed": "60",
    "auto confirm cancelled": "61",
    "auto confirm deleted": "62",
    "cancellation under process": "101",
    "pending": "44",
    "tour code in progress": "15",
    "manually confirmed": "53",
    "new tf booking": "40",
    "incomplete tf booking": "41",
    "unconfirmed tf booking": "42",
    "contact tf support": "43",
    "pnr in progress": "25",
    "tst in progress": "35",
    "tst created": "39",
    "tst error": "30",
    "unavailable": "59",
    "partially cancelled": "97",
    "partially amended": "98",
    "amended": "99"
  };

  const productTypeFilter = productType ? `&product_type=${encodeURIComponent(productType)}` : '';
  const statusFilter = status ? `&status[]=${STATUS[status.toLowerCase()]}` : '';
  const emailFilter = customerEmail ? `&column_name=email&column_value=${encodeURIComponent(customerEmail)}` : '';
  const filtersString = `${statusFilter}${emailFilter}`;

  const limit = 5; // this can come from user query and can come as param to the tool
  const url = `${process.env.HUB_API_URL}/api/order-list?${productTypeFilter}&limit=${limit}&page=1${filtersString}`;
  console.log('url', url);
  const response = await fetch(url, {
    headers: {
      authorization: `Bearer ${authToken}`,
      'Content-Type': 'application/json',
    },
  });
  const data = await response.json();
//   console.log('data', data);

  if (!data) {
    return {
      orders: [],
    };
  }

  return {
    orders: data.data.map((order: any) => ({
      orderId: order.orderNumber,
      status: order.statusText,
      date: order.createdAt,
      customerEmail: order.contact.email,
    })),
  };
};

/**
 * Tool to get list of orders for given filters
 * @param productType - The product type of the order
 * @param status - The status of the order
 * @param customerEmail - The email of the customer
 * @returns The list of orders
 */

const productTypeEnum = z.enum(['flight', 'hotel', 'activities']);
const statusEnum = z.enum([
  "New",
  "Confirm Decision",
  "Mixed",
  "Booking in Progress",
  "Unprocessed",
  "Refund cannot be processed",
  "Failed",
  "Cancelled",
  "Duplicate",
  "Reorder",
  "Refunded",
  "Manually Cancelled",
  "Smart Booking Cancelled",
  "Manual Payment",
  "Manually Ordered",
  "Manual Confirm Queue",
  "Reprice Confirm Queue",
  "Auto Confirm Started",
  "Auto Confirm Queue",
  "Auto Confirm in Progress",
  "Auto Confirmed Partial Booking",
  "Auto Confirmed",
  "Auto Confirm Failed",
  "Auto Confirm Cancelled",
  "Auto Confirm Deleted",
  "Cancellation under process",
  "Pending",
  "Tour Code in Progress",
  "Manually Confirmed",
  "New TF Booking",
  "Incomplete TF booking",
  "Unconfirmed TF Booking",
  "Contact TF Support",
  "PNR in Progress",
  "TST in Progress",
  "TST Created",
  "TST Error",
  "Unavailable",
  "Partially Cancelled",
  "Partially Amended",
  "Amended"
]);

export const orderListTool = createTool({
  id: 'get-order-list',
  description: 'Get list of orders for given filters. Fetches the first 5 orders from the database. Return a maximum of 5 orders.',
  inputSchema: z.object({
    productType: productTypeEnum.optional().describe('The product type of the order'),
    status: statusEnum.optional().describe('The status of the order.'),
    customerEmail: z.string().optional().describe('The email of the customer.'),
  }),
  outputSchema: z.object({
    orders: z.array(
      z.object({
        orderId: z.string(),
        status: z.string(),
        date: z.string(),
      })
    ),
  }),
  execute: async ({ context, mastra }) => {
    // console.log('runtimeContext', runtimeContext);
    return await getOrderList({
      productType: context.productType,
      status: context.status,
      customerEmail: context.customerEmail,
      // @ts-ignore
    }, mastra?.dbCon);
  },
});
