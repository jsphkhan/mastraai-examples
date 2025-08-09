import { createStep } from '@mastra/core/workflows';
import { z } from 'zod';
import { memeTemplateSchema, captionsSchema } from '../schemas';

export const generateMemeStep = createStep({
  id: 'generate-meme',
  description: "Create a meme using Imgflip's API",
  inputSchema: z.object({
    baseTemplate: memeTemplateSchema,
    captions: captionsSchema,
  }),
  outputSchema: z.object({
    imageUrl: z.string(),
    pageUrl: z.string().optional(),
    captions: z.object({
      topText: z.string(),
      bottomText: z.string(),
    }),
    baseTemplate: z.string(),
    memeStyle: z.string(),
    humorLevel: z.string(),
    analysis: z.object({
      message: z.string(),
    }),
  }),
  execute: async ({ inputData }) => {
    try {
      console.log('🎨 Creating your meme...');

      const username = process.env.IMGFLIP_USERNAME || 'imgflip_hubot';
      const password = process.env.IMGFLIP_PASSWORD || 'imgflip_hubot';

      const formData = new URLSearchParams();
      formData.append('template_id', inputData.baseTemplate.id);
      formData.append('username', username);
      formData.append('password', password);
      formData.append('text0', inputData.captions.topText);
      formData.append('text1', inputData.captions.bottomText);

      const response = await fetch('https://api.imgflip.com/caption_image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData,
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(`Imgflip API error: ${result.error_message}`);
      }

      console.log('✅ Meme created successfully!');

      return {
        imageUrl: result.data.url,
        pageUrl: result.data.page_url,
        captions: {
          topText: inputData.captions.topText,
          bottomText: inputData.captions.bottomText,
        },
        baseTemplate: inputData.baseTemplate.name,
        memeStyle: inputData.captions.memeStyle,
        humorLevel: inputData.captions.humorLevel,
        analysis: {
          message: `Created ${inputData.captions.memeStyle} meme with ${inputData.captions.humorLevel} humor level`,
        },
      };
    } catch (error) {
      console.error('Error generating meme:', error);
      throw new Error('Failed to generate meme');
    }
  },
});