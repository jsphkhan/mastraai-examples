/** 
 * Recruitment Workflow that can help with recruiting tasks
 * https://mastra.ai/en/guides/guide/ai-recruiter
*/

import { createWorkflow, createStep } from '@mastra/core/workflows';
import { z } from 'zod';
import { recruiterAgent } from '../agents/recruiter-agent';

const gatherCandidateInfoStep = createStep({
    id: "gatherCandidateInfo",
    description: "Gathers information from the candidate's resume",
    inputSchema: z.object({
      resumeText: z.string(),
    }),
    outputSchema: z.object({
      candidateName: z.string(),
      isTechnical: z.boolean(),
      specialty: z.string(),
      resumeText: z.string(),
    }),
    execute: async ({ inputData }) => {
      const resumeText = inputData?.resumeText;
   
      const prompt = `Extract details from the resume text: "${resumeText}"`;
   
      // generate structured output
      const res = await recruiterAgent.generate(prompt, {
        output: z.object({
          candidateName: z.string(),
          isTechnical: z.boolean(),
          specialty: z.string(),
          resumeText: z.string(),
        }),
      });

    //   console.log('##### res1: ', res);
   
      return res.object;
    },
});

const askAboutSpecialtyStep = createStep({
    id: "askAboutSpecialty",
    description: "Asks a question about the candidate's specialty if the candidate is technical",
    inputSchema: z.object({
      candidateName: z.string(),
      isTechnical: z.boolean(),
      specialty: z.string(),
      resumeText: z.string(),
    }),
    outputSchema: z.object({
      question: z.string(),
    }),
    execute: async ({ inputData }) => {
      const candidateInfo = inputData;
   
      const prompt = `You are a recruiter. Given the resume below, craft a short question
      for ${candidateInfo?.candidateName} about how they got into "${candidateInfo?.specialty}".
      Resume: ${candidateInfo?.resumeText}`;

      const res = await recruiterAgent.generate(prompt);

    //   console.log('##### res2: ', res);
   
      return { question: res?.text?.trim() || "" };
    },
});


const askAboutRoleStep = createStep({
    id: "askAboutRole",
    description: "Asks a question about the candidate's role if the candidate is non technical",
    inputSchema: z.object({
      candidateName: z.string(),
      isTechnical: z.boolean(),
      specialty: z.string(),
      resumeText: z.string(),
    }),
    outputSchema: z.object({
      question: z.string(),
    }),
    execute: async ({ inputData }) => {
      const candidateInfo = inputData;
   
      const prompt = `You are a recruiter. Given the resume below, craft a short question 
      for ${candidateInfo?.candidateName} asking what interests them most about this role.
      Resume: ${candidateInfo?.resumeText}`;

      const res = await recruiterAgent.generate(prompt);

      console.log('##### res3: ', res);

      return { question: res?.text?.trim() || "" };
    },
});

// define the workflow
const recruitmentWorkflow = createWorkflow({
    id: "recruitment-workflow",
    inputSchema: z.object({
      resumeText: z.string(),
    }),
    outputSchema: z.object({
      question: z.string(),
    }),
})
.then(gatherCandidateInfoStep)
.branch([
    // Branch for technical candidates
    [
      async ({ inputData }) => {
        return inputData?.isTechnical;
      },
      askAboutSpecialtyStep,
    ],
    // Branch for non-technical candidates
    [
      async ({ inputData }) => {
        return !inputData?.isTechnical;
      },
      askAboutRoleStep,
    ],
]);
   
recruitmentWorkflow.commit();

export { recruitmentWorkflow };
  
