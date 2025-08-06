import { MCPServer } from "@mastra/mcp";
import { writeNoteTool } from "../tools/write-note";
 
export const notes = new MCPServer({
    name: "notes",
    version: "1.0.0",
    tools: { 
        write: writeNoteTool,
    }
});

