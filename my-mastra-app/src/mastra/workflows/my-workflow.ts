/** 
 * Sample workflow that simulates setting up an event in Calendar
*/

import { Agent } from "@mastra/core/agent";
import { openai } from "@ai-sdk/openai";
import { createWorkflow, createStep } from "@mastra/core/workflows";
import { z } from "zod";

// an agent to identify email address from the user query
const emailAgent = new Agent({
    name: 'Email Agent',
    description: 'An agent that identifies email address from the user query',
    instructions: `You are a helpful assistant that can identify and filter email address from a user query`,
    model: openai('gpt-4.1-nano')
})

const queryStep = createStep({
    id: 'get-query',
    description: 'Read the user query passed to the workflow',
    inputSchema: z.object({
        query: z.string().describe('The query from the user'),
    }),
    outputSchema: z.array(z.string().describe('Email address')),
    execute: async ({ inputData }) => {
        if (!inputData) {
            throw new Error("Trigger data not found");
        }
        console.log('** Step1 execute: ', inputData);

        // call the email agent to identify email address from the user query
        // generate structured output
        const response = await emailAgent.generate([
            {
                role: 'user',
                content: `Identify email address from the user query: ${inputData.query}`
            }
        ], {
            output: z.array(z.string().describe('Email address'))
        });

        const emails = response?.object;

        if (emails.length === 0) {
            throw new Error("No email address found");
        }

        console.log('** Step1 response: ', emails);

        return emails;
    }
});

const emailStep = createStep({
    id: 'send-email',
    description: 'Send meeting invites to the identified email addresses',
    inputSchema: z.array(z.string().describe('Email address')),
    outputSchema: z.object({
        confirmed: z.string(),
        // message: z.string().describe('The message to the user'),
    }),
    resumeSchema: z.object({
        confirm: z.enum(['yes', 'no']),
    }),
    suspendSchema: z.object({
        message: z.string(),
    }),
    execute: async ({ inputData, resumeData, suspend }) => {
        console.log('** Step2 execute: ', inputData);
        console.log('** Step2 resumeData: ', resumeData);

        // Ask for a confirmation from the user
        // suspend the workflow and wait for the user to confirm
        if(!resumeData?.confirm) {
            await suspend({
                message: "Please confirm if everything looks good? (yes/no)"
            });
            return {
                confirmed: "no",
                // message: "Could not set up the meeting as you did not confirm"
            };
        }

        return {
            confirmed: resumeData?.confirm,
            // message: resumeData?.confirm === "yes" ? "Setting up the meeting now..." : "Could not set up the meeting as you did not confirm"
        };
        
    }
});

const workflow = createWorkflow({
    id: 'my-workflow',
    description: 'A workflow that can set up an event in Calendar. It can also identify email address from the user query, and then send an email to the identified email address.',
    inputSchema: z.object({
        query: z.string().describe('The query from the user'),
    }),
    outputSchema: z.object({}),
    steps: [queryStep, emailStep],
})
.then(queryStep)
.then(emailStep);


workflow.commit();

export { workflow };