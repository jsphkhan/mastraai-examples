import { openai } from '@ai-sdk/openai';
import { Agent } from '@mastra/core/agent';
import { Memory } from '@mastra/memory';
import { LibSQLStore } from '@mastra/libsql';
import { orderTool, orderListTool } from '../tools/order-tool';
import { weatherTool } from '../tools/weather-tool';
import { readFileSync } from 'fs';
import { join } from 'path';

export const orderAgent = new Agent({
  name: 'Order Agent',
  instructions: readFileSync(join(__dirname, 'instructions/order_management_instructions.md'), 'utf-8'),
  model: openai('gpt-4o-mini'),
  tools: { orderTool, weatherTool, orderListTool },
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