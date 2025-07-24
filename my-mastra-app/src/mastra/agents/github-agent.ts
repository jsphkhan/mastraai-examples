/** 
 * Github MCP Agent that connects to the Github MCP Server
 * Tools come from mcpTools.ts
*/

import { openai } from '@ai-sdk/openai';
import { Agent } from '@mastra/core/agent';
import { Memory } from '@mastra/memory';
import { LibSQLStore } from '@mastra/libsql';
import { mcpTools } from '../tools/mcp-tools';

// const { github_github_search_repositories } = mcpTools;

export const githubAgent = new Agent({
  name: 'Github Agent',
  description: 'A helpful assistant that can help with Github related tasks',
  instructions: `You are a helpful assistant that can help with Github related tasks. Use the provided tools to handle user queries.
`,
  model: openai('gpt-4o-mini'),
  tools: mcpTools,
  // tools: {
  //   github_github_search_repositories,
  // },
  memory: new Memory({
    storage: new LibSQLStore({
      url: 'file:../mastra.db', // path is relative to the .mastra/output directory
    }),
  }),
});
