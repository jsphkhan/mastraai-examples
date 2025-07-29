/** 
 * https://github.com/mastra-ai/mastra/tree/main/packages/mcp-docs-server
*/

import { MCPClient } from "@mastra/mcp";

// connect to Mastra Docs MCP Server
const mcpClient = new MCPClient({
    servers: {
      mastra: {
        command: "npx",
        args: ["-y", "@mastra/mcp-docs-server"],
      }
    },
});

// returns an array of all tools across all servers
const mastraDocsMCPTools = await mcpClient.getTools();

// console.log('##### mcpTools: ', githubMCPTools);

export { mastraDocsMCPTools };

  