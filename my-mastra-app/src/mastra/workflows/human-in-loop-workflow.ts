/** 
 * Human in loop workflow
 * https://mastra.ai/en/examples/workflows/human-in-the-loop
*/

import { Agent } from "@mastra/core/agent";
import { createWorkflow, createStep } from "@mastra/core/workflows";
import { z } from "zod";
import { openai } from "@ai-sdk/openai";
 
const llm = openai("gpt-4o-mini");
 
// Agent that generates multiple holiday options
// Returns a JSON array of locations and descriptions
export const summaryTravelAgent = new Agent({
  name: "summaryTravelAgent",
  model: llm,
  instructions: `
  You are a travel agent who is given a user prompt about what kind of holiday they want to go on.
  You then generate 3 different options for the holiday. Return the suggestions as a JSON array {"location": "string", "description": "string"}[]. Don't format as markdown.
  Make the options as different as possible from each other.
  Also make the plan very short and summarized.
  `,
});
 
// Agent that creates detailed travel plans
// Takes the selected option and generates a comprehensive itinerary
export const travelAgent = new Agent({
  name: "travelAgent",
  model: llm,
  instructions: `
  You are a travel agent who is given a user prompt about what kind of holiday they want to go on. A summary of the plan is provided as well as the location.
  You then generate a detailed travel plan for the holiday.
  `,
});

// Step that generates multiple holiday options based on user's vacation description
// Uses the summaryTravelAgent to create diverse travel suggestions
const generateSuggestionsStep = createStep({
    id: "generate-suggestions",
    description: "Generates multiple holiday options based on user's vacation description",
    inputSchema: z.object({
      vacationDescription: z.string().describe("The description of the vacation"),
    }),
    outputSchema: z.object({
      suggestions: z.array(z.string()),
      vacationDescription: z.string(),
    }),
    execute: async ({ inputData, mastra }) => {
      if (!mastra) {
        throw new Error("Mastra is not initialized");
      }
   
      const { vacationDescription } = inputData;
      const result = await mastra.getAgent("summaryTravelAgent").generate([
        {
          role: "user",
          content: vacationDescription,
        },
      ]);
      console.log(result.text);
      return { suggestions: JSON.parse(result.text), vacationDescription };
    },
});


// Step that pauses the workflow to get user input
// Allows the user to select their preferred holiday option from the suggestions
// Uses suspend/resume mechanism to handle the interaction
const humanInputStep = createStep({
    id: "human-input",
    description: "Pauses the workflow to get user input",
    inputSchema: z.object({
      suggestions: z.array(z.string()),
      vacationDescription: z.string(),
    }),
    outputSchema: z.object({
      selection: z.string().describe("The selection of the user"),
      vacationDescription: z.string(),
    }),
    resumeSchema: z.object({
      selection: z.string().describe("The selection of the user"),
    }),
    suspendSchema: z.object({
      suggestions: z.array(z.string()),
    }),
    execute: async ({ inputData, resumeData, suspend, getInitData }) => {
      if (!resumeData?.selection) {
        return suspend({ suggestions: inputData?.suggestions });
      }
   
      return {
        selection: resumeData?.selection,
        vacationDescription: inputData?.vacationDescription,
      };
    },
});


// Step that creates a detailed travel plan based on the user's selection
// Uses the travelAgent to generate comprehensive holiday details
const travelPlannerStep = createStep({
    id: "travel-planner",
    description: "Creates a detailed travel plan based on the user's selection",
    inputSchema: z.object({
      selection: z.string().describe("The selection of the user"),
      vacationDescription: z.string(),
    }),
    outputSchema: z.object({
      travelPlan: z.string(),
    }),
    execute: async ({ inputData, mastra }) => {
      const travelAgent = mastra?.getAgent("travelAgent");
      if (!travelAgent) {
        throw new Error("Travel agent is not initialized");
      }
   
      const { selection, vacationDescription } = inputData;
      const result = await travelAgent.generate([
        { role: "assistant", content: vacationDescription },
        { role: "user", content: selection || "" },
      ]);
      return { travelPlan: result.text };
    },
});

// Main workflow that orchestrates the holiday planning process:
// 1. Generates multiple options
// 2. Gets user input
// 3. Creates detailed plan
const humanInLoopWorkflow = createWorkflow({
    id: "Human in the Loop",
    inputSchema: z.object({
      vacationDescription: z.string().describe("The description of the vacation"),
    }),
    outputSchema: z.object({
      travelPlan: z.string(),
    }),
})
.then(generateSuggestionsStep)
.then(humanInputStep)
.then(travelPlannerStep);
   
humanInLoopWorkflow.commit();
   
export { humanInLoopWorkflow };