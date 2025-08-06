// create an agent that uses the MCP tools
// For live changes and debugging
// npm run dev:mcp-server
// npm run dev

import { Agent } from "@mastra/core/agent";
import { openai } from "@ai-sdk/openai";
import { MCPClient } from "@mastra/mcp";

// Configure MCP with the docs server
// const mcp = new MCPClient({
//   servers: {
//     mastra: {
//       command: 'npx',
//       args: ['-y', '@mastra/mcp-docs-server'],
//     },
//   },
// });

// connect to the MCP server using Stdio protocol
// Build the MCP server using tsup first to see the changes
// npm run build:mcp-server
const mcp = new MCPClient({
  id: "mcp-client",
  servers: {
    notesmcpserver: {
      command: 'node',
      args: ['/Users/joseph.khan/htdocs/javascript-projects/mastraai-examples/notes-mcp-server/dist/run-mcp-server.js'],
      logger: (logMessage: any) => {
        const timestamp = new Date().toISOString();
        const message = typeof logMessage === 'string' ? logMessage : JSON.stringify(logMessage);
        console.log(`\n[MCP Tool] ${timestamp}: ${message}`);
      },
    },
  },
});
  
// console.log('mcp tools: ', await mcp.getTools());


const mcpAgent = new Agent({
    name: "MCP Agent",
    instructions: "You are a helpful assistant that can use the MCP tools to help the user.",
    tools: await mcp.getTools(),
    model: openai("gpt-4o-mini"),
});

export { mcpAgent };