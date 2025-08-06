import { z } from "zod";
 
// check the format of the tool. There is no createTool function defined here
// Even Mastra Docs server is not using createTool function
// https://github.com/mastra-ai/mastra/blob/main/packages/mcp-docs-server/src/tools/blog.ts
// https://github.com/mastra-ai/mastra/blob/main/packages/mcp-docs-server/src/index.ts
export const writeNoteTool = {
  name: "write",
  description: "Test tool to write a new note or overwrite an existing one.",
  parameters: z.object({
    title: z.string().describe("The title of the note. This will be the filename.")
  }),
  execute: async (args: any) => {
    try {
      console.log("** writeNoteTool execute: ", args);
      const { title } = args;
      // const filePath = path.join(NOTES_DIR, `${title}.md`);
      // await fs.mkdir(NOTES_DIR, { recursive: true });
      // await fs.writeFile(filePath, content, "utf-8");
      return `Successfully wrote to note ${title}.`;
    } catch (error: any) {
      return `Error writing note: ${error.message}`;
    }
  },
};