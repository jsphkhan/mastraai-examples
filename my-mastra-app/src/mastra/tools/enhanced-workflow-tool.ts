import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { workflow } from '../workflows/my-workflow';

export const enhancedWorkflowTool = createTool({
  id: 'enhanced-workflow-manager',
  description: 'Intelligently manages workflow state with automatic suspend/resume detection',
  inputSchema: z.object({
    userInput: z.string().describe('The query from the user'),
    runId: z.string().optional().describe('Optional run ID to resume existing workflow'),
  }),
  outputSchema: z.object({
    response: z.string(),
    status: z.enum(['running', 'suspended', 'completed', 'failed']),
    requiresConfirmation: z.boolean().optional(),
    runId: z.string().optional(),
  }),
  execute: async (context) => {
    const { userInput } = context.context;
    // @ts-ignore
    const { memory } = context;

    // Try to resolve thread/resource from various possible locations on the context
    // These may be provided by the Agent runtime when tools are executed
    // @ts-ignore
    const threadId: string | undefined = (context as any).threadId || (context.context as any)?.threadId || (context.runtimeContext as any)?.get?.('threadId');
    // @ts-ignore
    const resourceId: string | undefined = (context as any).resourceId || (context.context as any)?.resourceId || (context.runtimeContext as any)?.get?.('resourceId');

    const readStoredRunId = async (): Promise<string | undefined> => {
      if (!memory || !threadId) return undefined;
      try {
        // @ts-ignore
        const thread = await memory.getThreadById({ threadId });
        // @ts-ignore
        const stored = thread?.metadata?.workflowRunId as string | undefined;
        return stored;
      } catch (e) {
        return undefined;
      }
    };

    const writeStoredRunId = async (newRunId?: string) => {
      if (!memory || !threadId) return;
      try {
        // @ts-ignore
        const thread = await memory.getThreadById({ threadId });
        // @ts-ignore
        const currentMeta = (thread?.metadata as Record<string, unknown>) || {};
        const nextMeta = { ...currentMeta } as Record<string, unknown>;
        if (newRunId) {
          nextMeta.workflowRunId = newRunId;
        } else {
          delete nextMeta.workflowRunId;
        }
        // @ts-ignore
        await memory.updateThread({ id: threadId, title: thread?.title, metadata: nextMeta });
      } catch (e) {
        // swallow
      }
    };

    // Check if user input is a confirmation (yes/no)
    const isConfirmation = /^(yes|no)$/i.test(userInput.trim());

    // Resolve effective runId: preference to provided, otherwise from memory
    const storedRunId = await readStoredRunId();
    const effectiveRunId = storedRunId;

    console.log('\n\n##### check if confirmation', isConfirmation, effectiveRunId, userInput.trim());

    // If we have a runId (provided or stored) and it's a confirmation, resume the workflow
    if (effectiveRunId && isConfirmation) {
      console.log('\n\n##### resume runId', effectiveRunId);
      try {
        const run = await workflow.createRunAsync({ runId: effectiveRunId });
        const result = await run.resume({
          step: 'send-email',
          resumeData: { confirm: userInput.toLowerCase() as 'yes' | 'no' },
        });

        console.log('\n\n##### resume result', result);

        if (result.status === 'suspended') {
          // Still waiting, keep run id stored
          await writeStoredRunId(effectiveRunId);
          return {
            response: 'Workflow still suspended, waiting for confirmation.',
            status: 'suspended' as const,
            requiresConfirmation: true,
            runId: effectiveRunId,
          };
        }

        // On completion or failure, clear stored run id
        await writeStoredRunId(undefined);

        return {
          response: result.status === 'success' ? 'Workflow completed successfully!' : 'Workflow failed.',
          status: result.status === 'success' ? ('completed' as const) : ('failed' as const),
          runId: undefined,
        };
      } catch (error) {
        console.log('\n\n##### resume error', error);
        // Clear any stale stored run id
        await writeStoredRunId(undefined);
        return {
          response: 'Previous workflow session expired. Please start a new workflow.',
          status: 'failed' as const,
        };
      }
    }

    // If it's a confirmation but no runId anywhere, start fresh
    if (isConfirmation) {
      return {
        response: 'Please start a new workflow first, then respond with yes/no.',
        status: 'failed' as const,
      };
    }

    // Start new workflow
    try {
      const run = await workflow.createRunAsync();
      console.log('\n\n##### new workflow run', run.runId);
      const result = await run.start({
        inputData: { query: userInput },
      });

      console.log('\n\n##### result', result);

      if (result.status === 'suspended') {
        // Persist the new runId for later confirmations
        await writeStoredRunId(run.runId);
        return {
          response: 'Workflow suspended, waiting for confirmation. Please respond with "yes" or "no".',
          status: 'suspended' as const,
          requiresConfirmation: true,
          runId: run.runId,
        };
      }

      // On completion or failure of a fresh run, ensure no runId is stored
      await writeStoredRunId(undefined);

      return {
        response: result.status === 'success' ? 'Workflow completed successfully!' : 'Workflow failed.',
        status: result.status === 'success' ? ('completed' as const) : ('failed' as const),
        runId: undefined,
      };
    } catch (error) {
      console.log('\n\n##### new workflow error', error);
      return {
        response: `Error starting workflow: ${error instanceof Error ? error.message : 'Unknown error'}`,
        status: 'failed' as const,
      };
    }
  },
});
