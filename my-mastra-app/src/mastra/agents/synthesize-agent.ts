import { Agent } from "@mastra/core/agent";
import { openai } from "@ai-sdk/openai";
 
const llm = openai("gpt-4o-mini");
 
// Define the synthesize agent that combines indoor and outdoor activity plans
// into a comprehensive report, considering weather conditions and alternatives
const synthesizeAgent = new Agent({
  name: "synthesizeAgent",
  model: llm,
  instructions: `
  You are given two different blocks of text, one about indoor activities and one about outdoor activities.
  Make this into a full report about the day and the possibilities depending on whether it rains or not.
  `,
});
 
export { synthesizeAgent };