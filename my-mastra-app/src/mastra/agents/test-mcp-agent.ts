/** 
 * This agent is used to test the MCP server
*/

import { Agent } from "@mastra/core/agent";
import { openai } from '@ai-sdk/openai';
import { MCPClient } from "@mastra/mcp";

// connect to the MCP server using Streamable HTTP
const mcp = new MCPClient({
    id: "mcp-client",
    servers: {
        notesmcpserver: {
            url: new URL("http://localhost:3000/api/mcp/notes/mcp"), // this is the MCP server running inside /notes-mcp-server
        }
    }
});

const testMCPAgent = new Agent({
    name: 'Test MCP Agent',
    instructions: 'A test MCP agent',
    model: openai('gpt-4o-mini'),
    tools: await mcp.getTools(),
    workflows: {}
});

export { testMCPAgent };