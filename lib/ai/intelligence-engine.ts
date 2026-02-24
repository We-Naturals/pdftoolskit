/**
 * Intelligence Engine
 * Specialized utility for browser-side pattern recognition and smart processing.
 */

export interface PIIMatch {
    text: string;
    type: 'EMAIL' | 'SSN' | 'PHONE' | 'CREDIT_CARD' | 'NAME' | 'DATE';
    confidence: number;
    startIndex: number;
    endIndex: number;
}

const PATTERNS = {
    EMAIL: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
    SSN: /\d{3}-\d{2}-\d{4}/g,
    PHONE: /(\+\d{1,2}\s?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/g,
    CREDIT_CARD: /\d{4}[\s.-]?\d{4}[\s.-]?\d{4}[\s.-]?\d{4}/g,
    // Names and Dates are more complex and might require NLP or context, 
    // but we can start with basic capitalization heuristics.
};

export class SmartPatternMatcher {
    /**
     * Scans text for PII patterns and returns a list of matches.
     */
    static async scanText(text: string): Promise<PIIMatch[]> {
        const matches: PIIMatch[] = [];

        // Scan for Emails
        this.matchPattern(text, PATTERNS.EMAIL, 'EMAIL', matches);

        // Scan for SSNs
        this.matchPattern(text, PATTERNS.SSN, 'SSN', matches);

        // Scan for Phone Numbers
        this.matchPattern(text, PATTERNS.PHONE, 'PHONE', matches);

        // Scan for Credit Cards
        this.matchPattern(text, PATTERNS.CREDIT_CARD, 'CREDIT_CARD', matches);

        return matches;
    }

    private static matchPattern(text: string, pattern: RegExp, type: PIIMatch['type'], results: PIIMatch[]) {
        let match;
        const regex = new RegExp(pattern);
        while ((match = regex.exec(text)) !== null) {
            results.push({
                text: match[0],
                type,
                confidence: 0.95,
                startIndex: match.index,
                endIndex: match.index + match[0].length
            });
        }
    }
}
