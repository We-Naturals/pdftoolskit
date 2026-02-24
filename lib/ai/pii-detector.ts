
/**
 * PII Detector & Redaction Engine
 * Scans text locally for sensitive patterns using high-precision regex.
 * Designed for privacy-first enterprise workflows.
 */
export interface PIIEntity {
    type: 'EMAIL' | 'PHONE' | 'CREDIT_CARD' | 'SSN' | 'IBAN';
    text: string;
    index: number;
    length: number;
}

const PII_PATTERNS = {
    EMAIL: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
    PHONE: /(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g,
    CREDIT_CARD: /\b(?:\d[ -]*?){13,16}\b/g,
    SSN: /\b\d{3}-\d{2}-\d{4}\b/g,
    IBAN: /[A-Z]{2}\d{2}[A-Z0-9]{4}\d{7}([A-Z0-9]?){0,16}/g
};

export class PIIDetector {
    /**
     * Scan text for common PII entities.
     */
    detect(text: string): PIIEntity[] {
        const entities: PIIEntity[] = [];

        for (const [type, pattern] of Object.entries(PII_PATTERNS)) {
            let match;
            // Reset regex state for global search
            pattern.lastIndex = 0;

            while ((match = pattern.exec(text)) !== null) {
                entities.push({
                    type: type as PIIEntity['type'],
                    text: match[0],
                    index: match.index,
                    length: match[0].length
                });
            }
        }

        return entities.sort((a, b) => a.index - b.index);
    }

    /**
     * Automatically redact detected entities with a mask.
     */
    redact(text: string, entities: PIIEntity[]): string {
        let result = text;
        // Sort in reverse to avoid index shifts during replacement
        const sorted = [...entities].sort((a, b) => b.index - a.index);

        for (const entity of sorted) {
            const mask = `[REDACTED ${entity.type}]`;
            result = result.slice(0, entity.index) + mask + result.slice(entity.index + entity.length);
        }

        return result;
    }
}

export const piiDetector = new PIIDetector();
