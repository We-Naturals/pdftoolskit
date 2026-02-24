
import { modelLoader } from './model-loader';

/**
 * Intelligent Automation Engine
 * Powers "Invisible AI" features like Auto-Rename and Smart Summaries.
 */
export class AutomationEngine {
    /**
     * Generate a 3-bullet summary of the text.
     */
    async summarize(text: string): Promise<string[]> {
        const prompt = `Summarize the following text in exactly 3 concise bullet points. Focus on key themes and data.
        Text: ${text.slice(0, 4000)}`;

        const response = await modelLoader.chat([
            { role: 'user', content: prompt }
        ]);

        let fullText = '';
        for await (const chunk of response) {
            fullText += chunk.choices[0]?.delta?.content || '';
        }

        return fullText.split('\n')
            .filter(line => line.trim().startsWith('-') || line.trim().startsWith('*'))
            .map(line => line.replace(/^[-*]\s*/, '').trim())
            .slice(0, 3);
    }

    /**
     * Suggest a professional filename based on document content.
     */
    async suggestFilename(text: string): Promise<string> {
        const prompt = `Based on the following document snippet, suggest a professional, descriptive filename (slug-style, no extension). 
        Example: "Invoice_Apple_Oct2024" or "CreativeProtcol_Q3_Review".
        Snippet: ${text.slice(0, 2000)}`;

        const response = await modelLoader.chat([
            { role: 'user', content: prompt }
        ]);

        let fullText = '';
        for await (const chunk of response) {
            fullText += chunk.choices[0]?.delta?.content || '';
        }

        // Clean up response: take last line or quoted text
        const cleaned = fullText.replace(/['"]/g, '').trim().split('\n').pop() || 'Untitled_Document';
        return cleaned.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_-]/g, '');
    }
}

export const automationEngine = new AutomationEngine();
