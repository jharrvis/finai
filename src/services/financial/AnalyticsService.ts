import { AIService } from '../ai/AIService';
import { analysisPrompt } from '../../config/prompts/analysis.prompts';

export class AnalyticsService {
    /**
     * Generates a monthly financial insight report using AI.
     * @param transactions List of transactions for the specific month
     * @param month The month string (YYYY-MM)
     * @returns MD-formatted insight string
     */
    static async generateMonthlyInsight(transactions: any[], month: string): Promise<string> {
        if (!transactions || transactions.length === 0) {
            return "Belum ada data transaksi untuk bulan ini.";
        }

        // 1. Calculate Summary Stats
        const incomeTx = transactions.filter(t => t.type === 'income');
        const expenseTx = transactions.filter(t => t.type === 'expense');

        const totalIncome = incomeTx.reduce((a, t) => a + Number(t.amount), 0);
        const totalExpense = expenseTx.reduce((a, t) => a + Number(t.amount), 0);
        const netSavings = totalIncome - totalExpense;
        const savingRate = totalIncome > 0 ? Math.round((netSavings / totalIncome) * 100) : 0;

        // 2. Group by Category
        const expensesByCategory: Record<string, number> = {};
        expenseTx.forEach(t => {
            expensesByCategory[t.category] = (expensesByCategory[t.category] || 0) + Number(t.amount);
        });
        // Get Top 3 Categories
        const topCategories = Object.entries(expensesByCategory)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 3)
            .map(([cat, amount]) => `${cat} (Rp${amount.toLocaleString('id-ID')})`)
            .join(', ');

        // 3. Prepare Context for AI
        const contextData = `
        PERIODE: ${month}
        
        RINGKASAN:
        - Total Pemasukan: Rp${totalIncome.toLocaleString('id-ID')}
        - Total Pengeluaran: Rp${totalExpense.toLocaleString('id-ID')}
        - Sisa Tabungan: Rp${netSavings.toLocaleString('id-ID')}
        - Saving Rate: ${savingRate}%
        
        TOP PENGELUARAN: ${topCategories}
        
        LIST TRANSAKSI (Sample 50 Terbesar):
        ${transactions
                .sort((a, b) => b.amount - a.amount)
                .slice(0, 50)
                .map(t => `- ${t.date}: ${t.description} (${t.type}) Rp${Number(t.amount).toLocaleString('id-ID')} [${t.category}]`)
                .join('\n')}
        `;

        // 4. Construct Prompt
        // We use the base analysis prompt but inject our pre-calculated summary for better context
        const fullPrompt = `${analysisPrompt("", "")}
        
        KONTEKS KHUSUS:
        ${contextData}
        
        INSTRUKSI TAMBAHAN:
        - Berikan komentar tentang saving rate user.
        - Identifikasi keborosan berdasarkan data Top Pengeluaran.
        - Berikan 1 saran konkret untuk bulan depan.
        - Gunakan bahasa santai tapi profesional.
        `;

        try {
            console.log(`[AnalyticsService] Generating insight for ${month}...`);
            return await AIService.processSimple(fullPrompt);
        } catch (error) {
            console.error("[AnalyticsService] Error:", error);
            return "Maaf, gagal menganalisis data keuangan Anda saat ini.";
        }
    }
}
