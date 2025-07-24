/** 
 * Recruiter Agent that can help with recruiting tasks
 * https://mastra.ai/en/guides/guide/ai-recruiter
*/

import { openai } from '@ai-sdk/openai';
import { Agent } from '@mastra/core/agent';
import { Memory } from '@mastra/memory';
import { LibSQLStore } from '@mastra/libsql';

export const recruiterAgent = new Agent({
  name: 'Recruiter Agent',
  description: 'A helpful assistant that can help with recruiting tasks',
  instructions: `You are a helpful assistant that can help with recruiting tasks. `,
  model: openai('gpt-4o-mini')
});