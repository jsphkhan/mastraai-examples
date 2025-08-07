/** 
 * This is an example of a MCP server that is started via node script with HTTP/SSE transport on port: 4111
 * This MCP server is used to connect to a local MCP Client and then consume it inside a Agent. 
 * 
 * You can connect MCP Inspector to the MCP Server using this URL: http://localhost:4111/mcp (SEE/HTTP)
*/

import { MCPServer } from '@mastra/mcp';
import { docsTool } from '../tools/docs-tool';

import { config } from 'dotenv';
config();

// Create MCP server with tools and agents for HTTP/SSE transport
export const mcpServer = new MCPServer({
  name: 'Kepler docs chatbot MCP server',
  version: '1.0.0',
  description: 'Provides access to documentation, planet information tools and intelligent agents via HTTP/SSE',

  // Expose individual tools
  tools: {
    docsTool,
  },
});

// Export a function to start the server via HTTP/SSE manually
export async function startHttpServer(port: number = 4111) {
  const { createServer } = await import('http');

  const baseUrl = `${process.env.MCP_SERVER_BASE_URL}:${port}`;

  const httpServer = createServer(async (req, res) => {
    const url = new URL(req.url || '', baseUrl);

    // Handle CORS for web clients
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    await mcpServer.startSSE({
      url,
      ssePath: '/mcp',
      messagePath: '/mcp/message',
      req,
      res,
    });
  });

  httpServer.listen(port, () => {
    console.log(`** MCP server running on ${baseUrl}/mcp`);
  });

  // Graceful shutdown
  process.on('SIGINT', async () => {
    console.log('** Shutting down MCP server...');
    await mcpServer.close();
    httpServer.close(() => {
      console.log('** MCP server shut down complete');
      process.exit(0);
    });
  });

  return httpServer;
}

// If this file is run directly, start the HTTP server
// When Mastra playground runs, it will start the MCP server
if (import.meta.url === `file://${process.argv[1]}`) {
  const port = parseInt(process.env.MCP_SERVER_PORT || '4111', 10);
  console.log('** Starting MCP server when Mastra playground runs. MCP Server Port: ', port);
  startHttpServer(port).catch(console.error);
}
