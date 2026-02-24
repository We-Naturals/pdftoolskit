
import { chunkText } from './chunking';
import { vectorStore } from './vector-store';
import { modelLoader } from './model-loader';
import { ChatCompletionMessageParam } from '@mlc-ai/web-llm';

export interface ChatMessage {
    role: 'user' | 'assistant' | 'system';
    content: string;
}

export class RagEngine {
    private isIndexed = false;
    private currentFileHash: string | null = null;

    /**
     * Index a single document for RAG
     */
    async indexDocument(text: string, file: File) {
        const chunks = chunkText(text, { chunkSize: 800, chunkOverlap: 150 });
        const result = await vectorStore.indexChunks(chunks, file);
        this.isIndexed = true;
        // In a real scenario, we'd store the hash to check if we're chatting with the same doc
        return result;
    }

    /**
     * Answer a question based on indexed document context
     */
    async *ask(question: string, history: ChatMessage[] = []) {
        // 1. Retrieve relevant context
        const contextResults = await vectorStore.query(question, 3);
        const contextText = contextResults.map(r => r.text).join('\n---\n');

        // 2. Construct System Prompt
        const systemPrompt = `
            You are an AI Document Assistant. Use the following context from the document to answer the user's question. 
            If the answer is not in the context, say you don't know based on the document, but try to be helpful.
            
            CONTEXT:
            ${contextText}
        `.trim();

        // 3. Prepare Messages
        const messages: ChatCompletionMessageParam[] = [
            { role: 'system', content: systemPrompt },
            ...history.map(m => ({ role: m.role, content: m.content })),
            { role: 'user', content: question }
        ];

        // 4. Stream Response from Local SLM
        const chunks = await modelLoader.chat(messages);

        for await (const chunk of chunks) {
            const content = chunk.choices[0]?.delta?.content || '';
            if (content) yield content;
        }
    }
}

export const ragEngine = new RagEngine();
