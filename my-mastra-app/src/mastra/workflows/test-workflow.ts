/** 
 * This is a test workflow to test the workflow functionality
 * https://mastra.ai/en/docs/workflows/overview
*/

import { createStep, createWorkflow } from '@mastra/core/workflows';
import { openai } from '@ai-sdk/openai';
import { Agent } from '@mastra/core/agent';
import { z} from 'zod';

const agent1 = new Agent({
    name: 'Blog Post Agent',
    instructions: 'You are a helpful assistant that creates blog posts when given a topic.',
    model: openai('gpt-4o-mini'),
});
const agent2 = new Agent({
    name: 'Blog Post Editor',
    instructions: 'You are a helpful assistant that edits blog posts when given a blog post. Edit the blog post to make it more engaging and interesting.',
    model: openai('gpt-4o-mini'),
});

// create a blog post
const step1 = createStep({
    id: 'step1',
    description: 'Create a blog post for a given topic',
    inputSchema: z.object({
        topic: z.string().describe('The topic for the blog post'),
    }),
    outputSchema: z.object({
        blogPost: z.string(),
    }),
    execute: async ({ inputData }) => {
        if (!inputData) {
            throw new Error("Trigger data not found");
        }

        // call the agent
        const response = await agent1.stream([
            {
                role: 'user',
                content: `Create a blog post for the topic: ${inputData.topic}. Use no more than 50 words.`,
            },
        ]);

        let blogPost = '';
        for await (const chunk of response.textStream) {
            blogPost += chunk;
        }

        console.log('##### original blogPost', blogPost);

        return {
            blogPost
        };
    },
});

const step2 = createStep({
    id: 'step2',
    description: 'Edit a given blog post',
    inputSchema: z.object({
        blogPost: z.string(),
    }),
    outputSchema: z.object({
        blogPost: z.string(),
    }),
    execute: async ({ inputData }) => {
        if (!inputData) {
            throw new Error("Trigger data not found");
        }

        // call the agent
        const response = await agent2.stream([
            {
                role: 'user',
                content: `Edit the following blog post to make it more engaging and interesting. Try to use the same words and phrases as the original blog post and try to keep the same length. ${inputData.blogPost}`,
            },
        ]);

        let blogPost = ''; 
        for await (const chunk of response.textStream) {
            blogPost += chunk;
        }

        console.log('\n\n#####edited blogPost', blogPost);

        return {
            blogPost
        };
    },
});

const testWorkflow = createWorkflow({
    id: 'test-workflow',
    // description: 'Test workflow',
    steps: [step1, step2],
    inputSchema: z.object({
        topic: z.string(),
    }),
    outputSchema: z.object({
        blogPost: z.string(),
    }),
})
//.parallel([step1, step2]).commit();
.then(step1).then(step2).commit();

export { testWorkflow };