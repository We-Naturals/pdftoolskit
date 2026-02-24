
import { v4 as uuidv4 } from 'uuid';
import { useJobStore, Job } from '@/lib/stores/job-store';
import { executeWorkflow, WorkflowStep } from '@/lib/workflow-engine';
import { tempStorage } from './storage/temp-storage';

export interface JobOptions {
    onProgress?: (progress: number) => void;
    onComplete?: (result: File[]) => void;
    onError?: (error: Error) => void;
}

class JobQueueService {
    private activeJobs: Set<string> = new Set();

    async enqueue(
        files: File[],
        steps: WorkflowStep[],
        toolName: string,
        options?: JobOptions & { type?: 'client' | 'server' }
    ): Promise<string> {
        const jobId = uuidv4();
        const jobStore = useJobStore.getState();
        const type = options?.type || 'client';

        const job: Omit<Job, 'status' | 'progress'> = {
            id: jobId,
            fileName: files.length === 1 ? files[0].name : `${files.length} files`,
            tool: toolName,
            type
        };

        jobStore.addJob(job);
        this.activeJobs.add(jobId);

        if (type === 'client') {
            this.processJob(jobId, files, steps, options).catch(console.error);
        } else {
            this.dispatchServerJob(jobId, files, steps, options).catch(console.error);
        }

        return jobId;
    }

    private async dispatchServerJob(
        jobId: string,
        files: File[],
        steps: WorkflowStep[],
        _options?: JobOptions
    ) {
        const jobStore = useJobStore.getState();
        jobStore.updateJob(jobId, { status: 'processing', progress: 0 });

        try {
            // 1. Upload files to temp storage
            jobStore.updateJob(jobId, { error: 'Uploading files for processing...' });
            const uploads = await Promise.all(files.map(f => tempStorage.upload(f)));

            // 2. Trigger Inngest function via internal API
            const response = await fetch('/api/inngest/dispatch', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    jobId,
                    files: uploads.map(u => ({ id: u.id, url: u.url, name: u.fileName })),
                    steps,
                    // eslint-disable-next-line security/detect-object-injection
                    tool: jobStore.jobs[jobId as keyof typeof jobStore.jobs]?.tool
                })
            });

            if (!response.ok) {
                throw new Error('Failed to dispatch server job');
            }

            jobStore.updateJob(jobId, { error: 'Processing on server...' });

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Upload failed';
            jobStore.updateJob(jobId, { status: 'failed', error: errorMessage });
        }
    }

    private async processJob(
        jobId: string,
        files: File[],
        steps: WorkflowStep[],
        options?: JobOptions
    ) {
        const jobStore = useJobStore.getState();
        jobStore.updateJob(jobId, { status: 'processing', progress: 0 });

        try {
            const results = await executeWorkflow(files, steps, (current, total, _status) => {
                const progress = Math.round((current / total) * 100);
                jobStore.updateJob(jobId, { progress, error: _status });
                if (options?.onProgress) options.onProgress(progress);
            });

            // Auto-save to local workspace if configured (Phase 4)
            const { fileSystem } = await import('@/lib/services/file-system');
            if (fileSystem.getWorkspaceName()) {
                await Promise.all(results.map(f => fileSystem.saveToWorkspace(f)));
            }

            // Convert Files to Blobs for storage if needed, or just mark as completed
            // Note: JobStore.Job.result is a Blob.
            const resultBlob = results.length === 1 ? results[0] : new Blob([JSON.stringify({ count: results.length })], { type: 'application/json' });

            jobStore.updateJob(jobId, {
                status: 'completed',
                progress: 100,
                result: resultBlob
            });

            // Add to history
            await jobStore.addToHistory({
                id: jobId,
                // eslint-disable-next-line security/detect-object-injection
                fileName: jobStore.jobs[jobId as keyof typeof jobStore.jobs]?.fileName || 'Unknown',
                // eslint-disable-next-line security/detect-object-injection
                tool: jobStore.jobs[jobId as keyof typeof jobStore.jobs]?.tool || 'Unknown',
                size: files.reduce((acc, f) => acc + f.size, 0),
                blob: resultBlob
            });

            if (options?.onComplete) options.onComplete(results);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            jobStore.updateJob(jobId, { status: 'failed', error: errorMessage });
            if (options?.onError) options.onError(error instanceof Error ? error : new Error(errorMessage));
        } finally {
            this.activeJobs.delete(jobId);
        }
    }

    cancelJob(jobId: string) {
        // Implementation for cancellation would require abort signals in strategies
        this.activeJobs.delete(jobId);
        useJobStore.getState().updateJob(jobId, { status: 'failed', error: 'Cancelled by user' });
    }

    getActiveJobCount(): number {
        return this.activeJobs.size;
    }
}

export const jobQueue = new JobQueueService();
