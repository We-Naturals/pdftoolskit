
import { CreateMLCEngine, MLCEngine } from "@mlc-ai/web-llm";

export interface AgentCommand {
    tool: string;
    args: Record<string, unknown>; // Changed any to unknown
    rationale: string;
}

export class AgentService {
    private engine: MLCEngine | null = null;
    private isInitialized = false;

    // We use Phi-3 for a good balance of speed and reasoning
    private modelId = "Phi-3-mini-4k-instruct-q4f16_1-MLC";

    async initialize(progressCallback?: (step: string) => void) {
        if (this.isInitialized) return;

        try {
            // console.log("Initializing Agent..."); // Removed console statement
            progressCallback?.("Loading AI Model (this happens once)...");

            // In a real scenario, this downloads ~2GB. 
            // For this environment, we might want to catch failure and use a mock/regex fallback
            // or rely on the user having a cached model. 
            // We'll wrap in try/catch to fallback to "Heuristic Agent" if offline/fail.
            this.engine = await CreateMLCEngine(
                this.modelId,
                { initProgressCallback: (report) => progressCallback?.(report.text) }
            );
            this.isInitialized = true;
            // console.log("Agent Initialized"); // Removed console statement
        } catch (error) {
            console.warn("Failed to load WebLLM, falling back to Heuristic Mode:", error);
            this.isInitialized = false;
            // We don't throw, we just work in fallback mode
        }
    }

    private examples: { trigger: string, action: AgentCommand }[] = [];

    teach(trigger: string, action: AgentCommand) {
        this.examples.push({ trigger, action });
        // In a real app, save to localStorage here
    }

    // async plan(goal: string): Promise<AgentCommand[]> {
    async plan(goal: string): Promise<AgentCommand[]> {
        if (!this.engine) {
            // Simple heuristic for demo: if "and", split it
            if (goal.includes('and')) {
                const parts = goal.split('and');
                const commands: AgentCommand[] = [];
                for (const part of parts) {
                    const cmd = this.heuristicParse(part.trim());
                    if (cmd) commands.push(cmd);
                }
                return commands;
            }
            const cmd = this.heuristicParse(goal);
            return cmd ? [cmd] : [];
        }

        try {
            // const stride = width * 4; // Not needed for simple gray scale conversion
            const systemPrompt = `
You are a PDF Workflow Planner. Break down the user's goal into a sequence of tools.
Available tools:
- rotate(angle: number)
- split(page: number)
- redact(text: string)
- grayscale()
- compress()

Respond ONLY with a JSON Array of commands:
[
  { "tool": "split", "args": { "page": 1 }, "rationale": "User wants to separate page 1" },
  { "tool": "rotate", "args": { "angle": 90 }, "rationale": "Then rotate it" }
]
`;
            const reply = await this.engine.chat.completions.create({
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: goal }
                ],
                temperature: 0.1,
            });

            const content = reply.choices[0].message.content || "[]";
            const jsonMatch = content.match(/\[[\s\S]*\]/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }
            return [];
        } catch (error) {
            console.error("Planning Error:", error);
            return [];
        }
    }

    async execute(prompt: string): Promise<AgentCommand | null> {
        // Legacy single-step execute, now forwards to plan() for upgrade
        const plan = await this.plan(prompt);
        return plan.length > 0 ? plan[0] : null;
    }

    async chat(systemPrompt: string, userPrompt: string): Promise<string | null> {
        if (!this.engine) return null;
        try {
            const reply = await this.engine.chat.completions.create({
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: userPrompt }
                ],
                temperature: 0.3,
            });
            return reply.choices[0].message.content || null;
        } catch (e) {
            console.error("Chat Error:", e);
            return null;
        }
    }

    private heuristicParse(prompt: string): AgentCommand | null {
        const p = prompt.toLowerCase();
        if (p.includes("rotate")) {
            return { tool: 'rotate', args: { angle: 90 }, rationale: 'Detected rotation intent' };
        }
        if (p.includes("redact")) {
            return { tool: 'redact', args: { text: 'detected' }, rationale: 'Detected redaction intent' };
        }
        if (p.includes("split")) {
            return { tool: 'split', args: {}, rationale: 'Detected split intent' };
        }
        return null;
    }
}
