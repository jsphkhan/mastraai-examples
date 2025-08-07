import { MCPClient } from '@mastra/mcp';

// configure the MCP server URL
const mcpServerUrl = `${process.env.MCP_SERVER_BASE_URL}:${process.env.MCP_SERVER_PORT}/mcp`;

// Create an MCP client to connect to our local MCP server via HTTP/SSE
export const mcpClient = new MCPClient({
  servers: {
    // Connect to local MCP server via HTTP/SSE
    localTools: {
      url: new URL(mcpServerUrl),
    },
  },
});
