import { MCPClient } from "@mastra/mcp";

// connect to Github & Youtube MCP Servers hosted on Klavis AI
const mcp = new MCPClient({
    servers: {
      github: {
        url: new URL("https://github-mcp-server.klavis.ai/mcp/?instance_id=14725952-b7d0-405e-bc03-5af7c75c8cfb"),
      },
      youtube: {
        url: new URL("https://youtube-mcp-server.klavis.ai/mcp/?instance_id=0ad6d75c-f569-4a19-a2e7-b406eb008ca4"),
      },
    },
});

// returns an array of all tools across all servers
const mcpTools = await mcp.getTools();

// console.log('##### mcpTools: ', mcpTools);

export { mcpTools };

  