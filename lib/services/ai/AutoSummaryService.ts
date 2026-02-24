
import { AgentService } from './AgentService';

export class AutoSummaryService {
    private static agent = new AgentService();

    // Singleton-ish lazy init
    static async initialize() {
        await this.agent.initialize();
    }

    static async generateSummary(file: File): Promise<string> {
        // 1. Text Extraction (Mocked for speed - in real app we'd use PDFService.extractText)
        // For this demo, we'll infer context from the filename + random "content"
        const pseudoContent = `File: ${file.name}. Type: ${file.type}. Size: ${file.size} bytes.`;

        // 2. AI Summarization
        const systemPrompt = `You are an expert summarizer. 
        Analyze the document metadata/content and provide a strict 3-bullet summary.
        Format:
        • Point 1
        • Point 2
        • Point 3
        Keep it under 30 words total.`;

        const result = await this.agent.chat(systemPrompt, pseudoContent);

        // 3. Fallback if AI offline
        if (!result) {
            return `• Document: ${file.name}\n• Size: ${(file.size / 1024).toFixed(1)} KB\n• Type: ${file.type}`;
        }

        return result;
    }
}
