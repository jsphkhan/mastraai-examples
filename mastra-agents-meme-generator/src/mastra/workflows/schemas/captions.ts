import { z } from 'zod';

export const captionsSchema = z.object({
  topText: z.string().describe('Text for the top of the meme'),
  bottomText: z.string().describe('Text for the bottom of the meme'),
  memeStyle: z
    .enum(['witty', 'sarcastic', 'relatable', 'exaggerated', 'deadpan'])
    .describe('The style of humor to use'),
  humorLevel: z
    .enum(['mild', 'medium', 'spicy'])
    .describe('How edgy the humor should be'),
});