/** 
 * Agent that can help with Mastra documentation
 * Consumes the tools from the Mastra Docs MCP Server @mastra/mcp-docs-server 
 * https://github.com/mastra-ai/mastra/tree/main/packages/mcp-docs-server
*/

import { openai } from '@ai-sdk/openai';
import { Agent } from '@mastra/core/agent';
import { Memory } from '@mastra/memory';
import { LibSQLStore } from '@mastra/libsql';
import { mastraDocsMCPTools } from '../tools/mastra-docs-mcp-tool';

export const mastraDocsAgent = new Agent({
    name: 'Mastra Docs Agent',
    description: 'A helpful assistant that can help with Mastra documentation',
    instructions: `You are a helpful assistant that can help with Mastra documentation. Use the provided tools to handle user queries.
  `,
    model: openai('gpt-4o-mini'),
    tools: mastraDocsMCPTools,
    memory: new Memory({
      storage: new LibSQLStore({
        url: 'file:../mastra.db', // path is relative to the .mastra/output directory
      }),
    }),
  });