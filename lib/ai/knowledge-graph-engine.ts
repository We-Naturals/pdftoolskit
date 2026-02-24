/* eslint-disable */
import { modelLoader } from './model-loader';

export interface KnowledgeEntity {
    id: string;
    type: string;
    name: string;
    properties: Record<string, any>;
}

export interface KnowledgeRelationship {
    subject: string;
    predicate: string;
    object: string;
}

export interface KnowledgeGraph {
    entities: KnowledgeEntity[];
    relationships: KnowledgeRelationship[];
}

export class KnowledgeGraphEngine {
    /**
     * Extracts a structured knowledge graph from raw text using local SLM.
     */
    async extract(text: string): Promise<KnowledgeGraph> {
        try {
            const engine = await modelLoader.getEngine();
            const snippet = text.slice(0, 4000); // 4k context window

            const response = await engine.chat.completions.create({
                messages: [
                    {
                        role: 'system',
                        content: `You are a Knowledge Graph Engineer. 
                        Analyze the text and extract entities and their relationships.
                        
                        1. ENTITIES: Identify Persons, Organizations, Financial Amounts, Dates, and Locations.
                        2. RELATIONSHIPS: Connect entities (e.g., Person WORKS_FOR Organization, Organization CHARGES Financial Amount).
                        
                        Return ONLY a valid JSON object with this structure:
                        {
                          "entities": [{ "id": "e1", "type": "Person", "name": "Name", "properties": {} }],
                          "relationships": [{ "subject": "e1", "predicate": "WORKS_FOR", "object": "e2" }]
                        }`
                    },
                    { role: 'user', content: snippet }
                ],
                response_format: { type: 'json_object' },
                temperature: 0.1
            });

            const content = response.choices[0]?.message.content || '{"entities": [], "relationships": []}';
            const cleanJson = content.replace(/```json|```/g, '').trim();
            return JSON.parse(cleanJson);
        } catch (e) {
            console.error("Knowledge Graph Extraction failed", e);
            return { entities: [], relationships: [] };
        }
    }

    /**
     * Converts a KnowledgeGraph to a valid JSON-LD format.
     */
    convertToJSONLD(graph: KnowledgeGraph): any {
        return {
            "@context": "https://schema.org/",
            "@graph": graph.entities.map(entity => ({
                "@id": `#${entity.id}`,
                "@type": entity.type,
                "name": entity.name,
                ...entity.properties
            })).concat(graph.relationships.map(rel => ({
                "@id": `relationship_${rel.subject}_${rel.object}`,
                "subject": { "@id": `#${rel.subject}` },
                "predicate": rel.predicate,
                "object": { "@id": `#${rel.object}` }
            })) as any)
        };
    }
}

export const knowledgeGraphEngine = new KnowledgeGraphEngine();
