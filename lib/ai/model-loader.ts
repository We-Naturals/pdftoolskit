
import * as webllm from '@mlc-ai/web-llm';

export interface ModelProgress {
    status: string;
    progress: number;
    totalBytes?: number;
    loadedBytes?: number;
}

export type ModelId =
    | 'Llama-3-8B-Instruct-q4f16_1-MLC'
    | 'Phi-3-mini-4k-instruct-q4f16_1-MLC'
    | 'TinyLlama-1.1B-Chat-v0.4-q4f16_1-MLC';

/**
 * Model Loader Service
 * Orchestrates WebLLM engine initialization and model weight caching.
 */
export class ModelLoader {
    private static instance: ModelLoader;
    private engine: webllm.MLCEngineInterface | null = null;
    private currentModelId: string | null = null;
    private onProgressCallbacks: ((progress: ModelProgress) => void)[] = [];

    private constructor() { }

    static getInstance(): ModelLoader {
        if (!ModelLoader.instance) {
            ModelLoader.instance = new ModelLoader();
        }
        return ModelLoader.instance;
    }

    onProgress(callback: (progress: ModelProgress) => void) {
        this.onProgressCallbacks.push(callback);
    }

    private emitProgress(progress: ModelProgress) {
        this.onProgressCallbacks.forEach(cb => cb(progress));
    }

    async getEngine(modelId: ModelId = 'Phi-3-mini-4k-instruct-q4f16_1-MLC'): Promise<webllm.MLCEngineInterface> {
        if (this.engine && this.currentModelId === modelId) {
            return this.engine;
        }

        // Initialize new engine
        this.emitProgress({ status: 'Initializing Engine...', progress: 0 });

        const initProgressCallback = (report: webllm.InitProgressReport) => {
            this.emitProgress({
                status: report.text,
                progress: report.progress,
            });
        };

        const engine = await webllm.CreateMLCEngine(modelId, {
            initProgressCallback,
        });

        this.engine = engine;
        this.currentModelId = modelId;
        this.emitProgress({ status: 'Ready', progress: 1 });

        return engine;
    }

    async chat(messages: webllm.ChatCompletionMessageParam[], modelId?: ModelId) {
        const engine = await this.getEngine(modelId);
        return await engine.chat.completions.create({
            messages,
            stream: true,
        });
    }

    async unload() {
        if (this.engine) {
            await this.engine.unload();
            this.engine = null;
            this.currentModelId = null;
        }
    }
}

export const modelLoader = ModelLoader.getInstance();
