import { AI_CONFIG } from '../../config/ai.config';
import { AIResponse } from '../../types/ai.types';
import { classifyIntent } from './IntentClassifier';
import { buildContext } from './PromptBuilder';
import { handleAIResponse } from './ResponseHandler';

export class AIService {

    /**
     * Main entry point to process user input
     */
    static async process(
        text: string,
        base64Image: string | null,
        accounts: any[],
        transactions: any[],
        categories: string[] = [] // Default to empty if not provided
    ): Promise<AIResponse> {
        const isoDate = new Date().toISOString().split('T')[0];

        try {
            // STEP 1: Classify Intent
            const intent = await classifyIntent(text, !!base64Image);
            console.log('[AIService] Intent:', intent);

            // STEP 2: Select Model
            let model = AI_CONFIG.models.fast;
            if (base64Image) {
                model = AI_CONFIG.models.vision;
            } else if (intent.type === 'advice' || intent.type === 'analysis') {
                model = AI_CONFIG.models.smart;
            }

            // STEP 3: Build Context & System Prompt
            const systemPrompt = buildContext(intent, accounts, transactions, isoDate, categories);

            // STEP 4: Prepare Messages
            let userContent: any = text;
            if (base64Image) {
                userContent = [
                    { "type": "text", "text": text || "Tolong catat transaksi dari gambar ini." },
                    { "type": "image_url", "image_url": { "url": `data:image/jpeg;base64,${base64Image}` } }
                ];
            }

            // STEP 5: Call API (OpenRouter) with Retry
            const responseText = await AIService.callOpenRouter(
                model,
                systemPrompt,
                userContent,
                intent.type === 'transaction'
            );

            // STEP 6: Handle Response & Parse JSON
            return handleAIResponse(responseText, intent);

        } catch (error: any) {
            console.error('[AIService] Error:', error);
            return {
                success: false,
                error: error.message || "Terjadi kesalahan pada sistem AI.",
            };
        }
    }

    /**
     * Process a simple prompt (e.g. for advice or analysis) without full context building
     */
    static async processSimple(prompt: string): Promise<string> {
        return await AIService.callOpenRouter(
            AI_CONFIG.models.fast,
            "You are a helpful financial assistant.",
            prompt,
            false // Not extraction, so use higher temperature
        );
    }

    /**
     * Private helper to call OpenRouter API
     */
    private static async callOpenRouter(
        model: string,
        systemPrompt: string,
        userContent: any,
        isExtraction: boolean
    ): Promise<string> {
        let lastError;

        for (let attempt = 1; attempt <= AI_CONFIG.maxRetries; attempt++) {
            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), AI_CONFIG.timeout);

                const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
                    method: "POST",
                    headers: {
                        "Authorization": `Bearer ${import.meta.env.VITE_OPENROUTER_API_KEY || ''}`, // Use import.meta.env for Vite
                        "HTTP-Referer": window.location.origin,
                        "X-Title": "FinAI Assistant",
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        "model": model,
                        "messages": [
                            { "role": "system", "content": systemPrompt },
                            { "role": "user", "content": userContent }
                        ],
                        // Temperature: 0 for extraction (deterministic), 0.7 for creative writing
                        "temperature": isExtraction ? 0 : 0.7,
                        "max_tokens": 2000
                    }),
                    signal: controller.signal
                });

                clearTimeout(timeoutId);

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error?.message || `HTTP ${response.status}`);
                }

                const result = await response.json();
                return result.choices?.[0]?.message?.content || "";

            } catch (error: any) {
                lastError = error;
                console.warn(`[AIService] Attempt ${attempt} failed:`, error.message);

                if (attempt < AI_CONFIG.maxRetries) {
                    // Exponential backoff: 1s, 2s, 4s
                    await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempt - 1)));
                }
            }
        }

        throw lastError;
    }
}
