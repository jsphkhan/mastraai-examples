import { Mastra } from '@mastra/core';
import { storage } from './memory';
import { memeGeneratorAgent } from './agents/meme-generator';
import { memeGenerationWorkflow } from './workflows/meme-generation';

export const mastra = new Mastra({
  storage,
  agents: {
    memeGenerator: memeGeneratorAgent,
  },
  workflows: {
    'meme-generation': memeGenerationWorkflow,
  },
  telemetry: {
    enabled: true,
  },
});