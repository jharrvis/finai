import { AIService } from '../ai/AIService';
import { FinancialCore } from './FinancialCore';

export class FinancialReportService {
    /**
     * Generate comprehensive financial health report using AI.
     */
    static async generateFinancialHealthReport(
        accounts: any[],
        transactions: any[],

    ): Promise<string> {
        const balances = FinancialCore.calculateAllBalances(accounts, transactions);
        const netWorth = FinancialCore.calculateNetWorth(accounts, transactions);

        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const cashFlow = FinancialCore.analyzeCashFlow(transactions, monthStart, now);

        const recurring = FinancialCore.detectRecurringTransactions(transactions);
        const anomalies = FinancialCore.detectAnomalies(transactions);

        const savingRate = cashFlow.totalInflow > 0
            ? Math.round((cashFlow.netCashFlow / cashFlow.totalInflow) * 100)
            : 0;

        const context = `
LAPORAN KESEHATAN KEUANGAN

1. NET WORTH: Rp${netWorth.toLocaleString('id-ID')}
   
2. AKUN (${accounts.length}):
${balances.map(b => `   - ${b.accountName}: Rp${b.currentBalance.toLocaleString('id-ID')}`).join('\n')}

3. CASH FLOW BULAN INI:
   - Total Pemasukan: Rp${cashFlow.totalInflow.toLocaleString('id-ID')}
   - Total Pengeluaran: Rp${cashFlow.totalOutflow.toLocaleString('id-ID')}
   - Net Cash Flow: Rp${cashFlow.netCashFlow.toLocaleString('id-ID')}
   - Saving Rate: ${savingRate}%

4. TOP PENGELUARAN:
${cashFlow.expenseCategories.slice(0, 5).map(c => `   - ${c.category}: Rp${c.amount.toLocaleString('id-ID')}`).join('\n')}

5. TAGIHAN RUTIN TERDETEKSI (${recurring.length}):
${recurring.slice(0, 5).map(r => `   - ${r.merchant}: Rp${r.averageAmount.toLocaleString('id-ID')}/${r.frequency} (next: ${r.nextExpected.toLocaleDateString('id-ID')})`).join('\n')}

6. ANOMALI SPENDING (${anomalies.length}):
${anomalies.slice(0, 3).map(a => `   - ${a.description}: ${a.anomalyReason}`).join('\n')}

TUGAS AI:
Berikan analisis komprehensif tentang kesehatan keuangan user:
1. Evaluasi saving rate dan cash flow
2. Identifikasi area yang perlu perbaikan
3. Berikan 3 saran konkret untuk meningkatkan keuangan
4. Warning jika ada red flags (saving rate <10%, anomali high severity, dll)

Gunakan bahasa ramah tapi profesional. Output dalam format markdown.
        `;

        try {
            return await AIService.processSimple(context);
        } catch (error) {
            console.error("[FinancialReportService] Error generating report:", error);
            return "Gagal menganalisis kesehatan keuangan. Silakan coba lagi nanti.";
        }
    }
}
