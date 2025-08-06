import { notes } from './src/mastra/mcp/server';

async function runServer() {
    try {
      console.log('** Starting MCP server...');
      await notes.startStdio();
      console.log('**MCP Server started');
    } catch (error) {
      console.error('**Failed to start MCP server', error);
      process.exit(1);
    }
}

runServer().catch((error) => {
    console.error('** Fatal error running MCP server', error);
    process.exit(1);
});