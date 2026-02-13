import { AIService } from '../ai/AIService';
import { AIResponse } from '../../types/ai.types';

export class OCRService {
    /**
     * Scans a receipt image and extracts transaction data.
     * @param imageBase64 Base64 encoded image string (without data:image/ prefix)
     * @param accounts List of available accounts for context
     * @returns AIResponse containing the extracted transaction data
     */
    static async scanReceipt(imageBase64: string, accounts: any[] = []): Promise<AIResponse> {
        // We pass a specific instruction to ensure the intent is understood as "extract data from image"
        const prompt = "Analisis struk belanja ini. Ekstrak nama merchant, items, dan total total bayar.";

        return await AIService.process(
            prompt,
            imageBase64,
            accounts,
            [] // Transactions history not strictly needed for OCR, but could help with context if added
        );
    }
}
