
import { MacroAction, Workflow } from '../stores/macro-store';
// We will import services here as we refactor them
// import { rotatePDF } from '../services/pdf/rotateService'; 

export class WorkflowEngine {
    static async executeWorkflow(file: File, workflow: Workflow | MacroAction[]): Promise<File> {
        let currentFile = file;
        const actions = Array.isArray(workflow) ? workflow : workflow.actions;

        // console.log(`Starting Workflow Execution: ${actions.length} steps`);

        for (const action of actions) {
            // console.log(`Executing step: ${action.type}`, action.params);

            try {
                switch (action.type) {
                    case 'ROTATE': {
                        // Dynamic import to avoid circular dependencies if any
                        const { RotateService } = await import('../services/pdf/rotateService');
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        const rotatedBlob = await RotateService.rotate(currentFile, action.params as any);
                        currentFile = new File([rotatedBlob], currentFile.name, { type: 'application/pdf' });
                        break;
                    }

                    case 'SPLIT':
                        // Placeholder for Split Service integration
                        console.warn("SPLIT action replay not yet implemented fully");
                        break;

                    default:
                        console.warn(`Unknown action type: ${action.type}`);
                }
            } catch (error) {
                console.error(`Step ${action.id} failed:`, error);
                throw new Error(`Workflow failed at step: ${action.description}`);
            }
        }

        return currentFile;
    }
}
