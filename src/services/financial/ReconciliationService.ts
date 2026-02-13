// ============================================
// RECONCILIATION SERVICE
// Balance Adjustment & Account Reconciliation
// ============================================

import { FinancialCore } from './FinancialCore';
import { AIService } from '../ai/AIService';

export interface ReconciliationData {
    accountId: string;
    recordedBalance: number;
    actualBalance: number;
    difference: number;
    reconciliationDate: string;
    notes?: string;
}

export interface ReconciliationHistory {
    totalReconciliations: number;
    averageDifference: number;
    lastReconciliation: Date | null;
    frequentReasons: string[];
}

/**
 * ReconciliationService
 * 
 * Handles balance reconciliation between app records and actual bank/e-wallet balance.
 * Prevents data drift and maintains accuracy.
 */
export class ReconciliationService {

    /**
     * Calculate difference between recorded and actual balance
     */
    static calculateReconciliation(
        accountId: string,
        actualBalance: number,
        accounts: any[],
        transactions: any[]
    ): ReconciliationData {
        const account = accounts.find(a => a.id === accountId);
        if (!account) {
            throw new Error("Akun tidak ditemukan");
        }

        // Get recorded balance from FinancialCore
        const balanceInfo = FinancialCore.calculateAccountBalance(
            account,
            transactions
        );

        const recordedBalance = balanceInfo.currentBalance;
        const difference = actualBalance - recordedBalance;

        return {
            accountId,
            recordedBalance,
            actualBalance,
            difference,
            reconciliationDate: new Date().toISOString().split('T')[0],
            notes: ''
        };
    }

    /**
     * Create adjustment transaction to reconcile balance
     */
    static createReconciliationTransaction(
        reconciliationData: ReconciliationData,
        accounts: any[]
    ): any {
        const account = accounts.find(a => a.id === reconciliationData.accountId);
        const { difference, reconciliationDate, notes } = reconciliationData;

        // If difference is positive → income (there's money we didn't record)
        // If difference is negative → expense (there's spending we didn't record)
        const type = difference >= 0 ? 'income' : 'expense';
        const amount = Math.abs(difference);

        const description = notes
            ? `Penyesuaian Saldo ${account?.name} - ${notes}`
            : `Penyesuaian Saldo ${account?.name}`;

        return {
            id: crypto.randomUUID(),
            type,
            amount,
            category: 'Rekonsiliasi',
            description,
            date: reconciliationDate,
            accountId: reconciliationData.accountId,
            isReconciliation: true, // Special flag
            reconciliationData: {
                recordedBalance: reconciliationData.recordedBalance,
                actualBalance: reconciliationData.actualBalance,
                difference: reconciliationData.difference
            },
            timestamp: new Date().getTime() // Use current time for sorting
        };
    }

    /**
     * Analyze reconciliation history to detect patterns
     */
    static analyzeReconciliationHistory(
        accountId: string,
        transactions: any[]
    ): ReconciliationHistory {
        const reconTx = transactions.filter(
            t => t.accountId === accountId && t.isReconciliation === true
        );

        if (reconTx.length === 0) {
            return {
                totalReconciliations: 0,
                averageDifference: 0,
                lastReconciliation: null,
                frequentReasons: []
            };
        }

        const totalDiff = reconTx.reduce((sum, t) => {
            const diff = t.reconciliationData?.difference || 0;
            return sum + Math.abs(diff);
        }, 0);

        const avgDiff = totalDiff / reconTx.length;

        const sorted = reconTx.sort((a, b) =>
            new Date(b.date).getTime() - new Date(a.date).getTime()
        );
        const lastRecon = new Date(sorted[0].date);

        // Extract reasons from notes
        const reasons = reconTx
            .map(t => t.description)
            .filter(d => d && d.includes(' - '))
            .map(d => d.split(' - ')[1]);

        // Count frequency
        const reasonCount: Record<string, number> = {};
        reasons.forEach(r => {
            reasonCount[r] = (reasonCount[r] || 0) + 1;
        });

        const frequentReasons = Object.entries(reasonCount)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 3)
            .map(([reason]) => reason);

        return {
            totalReconciliations: reconTx.length,
            averageDifference: Math.round(avgDiff),
            lastReconciliation: lastRecon,
            frequentReasons
        };
    }

    /**
     * AI-powered reconciliation suggestions
     */
    static async generateReconciliationSuggestions(
        reconciliationData: ReconciliationData,
        recentTransactions: any[]
    ): Promise<string[]> {
        const { difference } = reconciliationData;
        const absDiff = Math.abs(difference);

        // Rule-based suggestions for common scenarios
        const suggestions: string[] = [];

        // Small difference (< Rp10,000)
        if (absDiff < 10000) {
            suggestions.push("💡 Kemungkinan selisih kecil karena pembulatan atau biaya admin bank");
            suggestions.push("💡 Cek apakah ada transaksi kecil yang lupa dicatat (parkir, tip, dll)");
        }

        // Medium difference (Rp10,000 - Rp100,000)
        else if (absDiff < 100000) {
            suggestions.push("💡 Periksa transaksi e-commerce yang mungkin belum tercatat");
            suggestions.push("💡 Cek apakah ada biaya subscription/langganan yang auto-debit");
            suggestions.push("💡 Review transaksi non-tunai yang dilakukan keluarga (jika shared account)");
        }

        // Large difference (> Rp100,000)
        else {
            suggestions.push("⚠️ PENTING: Selisih besar terdeteksi! Segera cek mutasi bank");
            suggestions.push("⚠️ Kemungkinan ada transaksi besar yang tidak tercatat");
            suggestions.push("⚠️ Periksa apakah ada transaksi fraud/tidak sah di rekening");
            suggestions.push("📄 Download mutasi bank dan cocokkan satu per satu");
        }

        // Add context-aware suggestion using AI
        if (recentTransactions.length > 0) {
            try {
                const aiSuggestion = await this.getAISuggestion(difference, recentTransactions);
                if (aiSuggestion) {
                    suggestions.push(`🤖 ${aiSuggestion}`);
                }
            } catch (error) {
                console.error('AI suggestion failed:', error);
            }
        }

        return suggestions;
    }

    /**
     * Get AI-powered contextual suggestion
     */
    private static async getAISuggestion(
        difference: number,
        recentTransactions: any[]
    ): Promise<string> {
        const txSummary = recentTransactions
            .slice(0, 10)
            .map(t => `${t.date}: ${t.description} (${t.category}) Rp${Number(t.amount).toLocaleString('id-ID')}`)
            .join('\n');

        const prompt = `Analisis selisih rekonsiliasi saldo:
Selisih: Rp${Math.abs(difference).toLocaleString('id-ID')} ${difference > 0 ? '(kelebihan)' : '(kekurangan)'}

Transaksi terakhir user:
${txSummary}

Berdasarkan pola transaksi di atas, berikan 1 saran spesifik kenapa bisa terjadi selisih ini.
Jawab singkat dalam 1 kalimat (max 100 karakter).

Contoh output yang baik:
- "Kemungkinan lupa catat tagihan internet atau subscription"
- "Mungkin ada cashback atau refund yang belum dicatat"
- "Periksa transaksi Shopee/Tokopedia yang pending"`;

        try {
            const response = await AIService.processSimple(prompt);
            return response.trim().substring(0, 150); // Max 150 chars
        } catch (error) {
            return '';
        }
    }

    /**
     * Validate reconciliation before execution
     */
    static validateReconciliation(
        accountId: string,
        actualBalance: number,
        accounts: any[]
    ): { isValid: boolean; error?: string; warning?: string } {
        const account = accounts.find(a => a.id === accountId);

        if (!account) {
            return {
                isValid: false,
                error: "Akun tidak ditemukan"
            };
        }

        if (actualBalance < 0) {
            return {
                isValid: false,
                error: "Saldo actual tidak boleh negatif"
            };
        }

        // Warning for very large difference
        if (actualBalance > 100000000) { // > 100 juta
            return {
                isValid: true,
                warning: "Saldo sangat besar. Pastikan input sudah benar."
            };
        }

        return { isValid: true };
    }

    /**
     * Get reconciliation recommendation frequency
     */
    static getRecommendedReconciliationInterval(
        account: any,
        transactions: any[]
    ): { interval: string; reason: string } {
        // Calculate transaction frequency
        const accTx = transactions.filter(t => t.accountId === account.id);
        const daysSinceFirstTx = accTx.length > 0
            ? Math.ceil((Date.now() - Math.min(...accTx.map(t => t.timestamp))) / (1000 * 60 * 60 * 24))
            : 0;

        const txPerDay = daysSinceFirstTx > 0 ? accTx.length / daysSinceFirstTx : 0;

        if (txPerDay > 5) {
            return {
                interval: 'weekly',
                reason: 'Akun ini sangat aktif (>5 transaksi/hari). Rekonsiliasi mingguan direkomendasikan.'
            };
        } else if (txPerDay > 1) {
            return {
                interval: 'bi-weekly',
                reason: 'Akun cukup aktif (1-5 transaksi/hari). Rekonsiliasi 2 minggu sekali direkomendasikan.'
            };
        } else {
            return {
                interval: 'monthly',
                reason: 'Akun tidak terlalu aktif (<1 transaksi/hari). Rekonsiliasi bulanan cukup.'
            };
        }
    }
}
