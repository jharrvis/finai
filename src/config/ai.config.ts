import { AIConfig } from '../types/ai.types';

export const AI_CONFIG: AIConfig = {
    models: {
        // Untuk extraction & classification (cepat, murah)
        fast: "google/gemini-2.0-flash-001",
        // Untuk analisis & advice (lebih pintar)
        smart: "google/gemini-2.0-flash-001",
        // Untuk vision (OCR struk)
        vision: "google/gemini-2.0-flash-001"
    },
    maxRetries: 3,
    timeout: 30000,
    maxHistoryTurns: 10,
    maxContextTokens: 8000
};
