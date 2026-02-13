import { AIService } from '../ai/AIService';
import { CATEGORIES } from '../../config/financial.config';

export class CategorizationService {
    /**
     * Suggests a category for a given transaction description using AI.
     * @param description The transaction description (e.g. "Starbucks Coffee")
     * @param specificCategories Optional list of categories to choose from
     * @returns The suggested category name
     */
    static async suggestCategory(description: string, specificCategories?: string[]): Promise<string> {
        if (!description || description.trim().length < 2) return 'Lainnya';

        const categoryList = specificCategories || CATEGORIES;

        // Context for the AI
        const prompt = `
        Tugas: Klasifikasikan deskripsi transaksi keuangan ke dalam satu kategori yang paling tepat.
        Daftar Kategori: [${categoryList.join(', ')}]
        
        Deskripsi Transaksi: "${description}"
        
        Instruksi:
        1. Pilih SATU kategori dari daftar di atas.
        2. Jika deskripsi membingungkan atau tidak cocok, pilih "Lainnya".
        3. JANGAN berikan penjelasan, hanya nama kategorinya saja.
        `;

        try {
            console.log(`[CategorizationService] Suggesting for: "${description}"`);
            const result = await AIService.processSimple(prompt);

            // Clean up result (remove quotes, trim, remove periods)
            const cleanedResult = result.trim().replace(/^["']|["']$/g, '').replace(/\.$/, '');

            // Find exact or case-insensitive match
            const match = categoryList.find(c => c.toLowerCase() === cleanedResult.toLowerCase());

            if (match) {
                return match;
            } else {
                // Return 'Lainnya' if AI hallucinates a new category
                console.warn(`[CategorizationService] AI suggested unknown category: "${cleanedResult}". Defaulting to Lainnya.`);
                return 'Lainnya';
            }
        } catch (error) {
            console.error("[CategorizationService] Error suggesting category:", error);
            return 'Lainnya';
        }
    }
}
