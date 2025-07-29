import { openai } from '@ai-sdk/openai';
import { Agent } from '@mastra/core/agent';
import { Memory } from '@mastra/memory';
import { LibSQLStore } from '@mastra/libsql';
import { orderTool } from '../tools/order-tool';
import { weatherTool } from '../tools/weather-tool';

export const orderAgent = new Agent({
  name: 'Order Agent',
  instructions: `
      You are a helpful order management assistant that provides order information and can help with order-related queries.

      Your primary function is to help users get order details by order ID. When responding:
      - Always ask for an order ID if none is provided
      - Provide clear and concise order information
      - If an order is not found, inform the user politely
      - Include all relevant order details like status and date
      - Be helpful and professional in your responses
      - If users ask about order status, use the orderTool to fetch the latest information
      - You can also provide weather information when relevant to order delivery or customer inquiries
      - If users ask about weather conditions that might affect their order delivery, use the weatherTool

      Use the orderTool to fetch order data and weatherTool to fetch weather data.
`,
  model: openai('gpt-4o-mini'),
  tools: { orderTool, weatherTool },
  memory: new Memory({
    options: {
        threads: {
            generateTitle: true
            // {
            //     model: openai("gpt-4.1-nano"), // Use cheaper model for titles
            //     instructions: "Generate a concise title for this conversation based on all the messages in the thread",
            // },
        }
    },
    storage: new LibSQLStore({
      url: 'file:../mastra.db', // path is relative to the .mastra/output directory
    }),
  }),
}); 