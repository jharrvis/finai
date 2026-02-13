// ============================================
// FINANCIAL LOGIC SERVICE
// Core Financial Accounting & Personal Finance Concepts
// ============================================

import { AIService } from '../ai/AIService';

export interface AccountBalance {
    accountId: string;
    accountName: string;
    initialBalance: number;
    currentBalance: number;
    totalIncome: number;
    totalExpense: number;
    lastUpdated: Date;
}

export interface CashFlowAnalysis {
    period: string;
    totalInflow: number;
    totalOutflow: number;
    netCashFlow: number;
    incomeSources: { category: string; amount: number }[];
    expenseCategories: { category: string; amount: number }[];
    biggestIncome: { description: string; amount: number };
    biggestExpense: { description: string; amount: number };
}

export interface TransferValidation {
    isValid: boolean;
    error?: string;
    warning?: string;
    sourceBalance: number;
    requiredAmount: number;
}

export interface RecurringTransaction {
    merchant: string;
    category: string;
    averageAmount: number;
    frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
    lastOccurrence: Date;
    nextExpected: Date;
    confidence: number;
}

/**
 * FinancialLogicService
 * 
 * Implements core financial accounting principles for personal finance:
 * - Double-entry bookkeeping for transfers
 * - Account balance tracking
 * - Cash flow analysis
 * - Transaction validation
 * - Recurring expense detection
 */
export class FinancialLogicService {

    // ========================================
    // 1. ACCOUNT BALANCE CALCULATIONS
    // ========================================

    /**
     * Calculate real-time balance for a specific account.
     * Formula: InitialBalance + TotalIncome - TotalExpense
     */
    static calculateAccountBalance(
        account: any,
        transactions: any[]
    ): AccountBalance {
        const accountTx = transactions.filter(t => t.accountId === account.id);
        
        const income = accountTx
            .filter(t => t.type === 'income')
            .reduce((sum, t) => sum + Number(t.amount), 0);
        
        const expense = accountTx
            .filter(t => t.type === 'expense')
            .reduce((sum, t) => sum + Number(t.amount), 0);
        
        const currentBalance = (account.balance || 0) + income - expense;

        return {
            accountId: account.id,
            accountName: account.name,
            initialBalance: account.balance || 0,
            currentBalance,
            totalIncome: income,
            totalExpense: expense,
            lastUpdated: new Date()
        };
    }

    /**
     * Calculate balances for all accounts.
     */
    static calculateAllBalances(
        accounts: any[],
        transactions: any[]
    ): AccountBalance[] {
        return accounts.map(acc => this.calculateAccountBalance(acc, transactions));
    }

    /**
     * Get total net worth across all accounts.
     */
    static calculateNetWorth(
        accounts: any[],
        transactions: any[]
    ): number {
        const balances = this.calculateAllBalances(accounts, transactions);
        return balances.reduce((sum, bal) => sum + bal.currentBalance, 0);
    }

    // ========================================
    // 2. TRANSFER VALIDATION (Double-Entry)
    // ========================================

    /**
     * Validate a transfer between accounts BEFORE execution.
     * Ensures source account has sufficient funds.
     */
    static validateTransfer(
        sourceAccountId: string,
        targetAccountId: string,
        amount: number,
        accounts: any[],
        transactions: any[]
    ): TransferValidation {
        // Find accounts
        const sourceAccount = accounts.find(a => a.id === sourceAccountId);
        const targetAccount = accounts.find(a => a.id === targetAccountId);

        if (!sourceAccount) {
            return {
                isValid: false,
                error: "Akun sumber tidak ditemukan",
                sourceBalance: 0,
                requiredAmount: amount
            };
        }

        if (!targetAccount) {
            return {
                isValid: false,
                error: "Akun tujuan tidak ditemukan",
                sourceBalance: 0,
                requiredAmount: amount
            };
        }

        if (sourceAccountId === targetAccountId) {
            return {
                isValid: false,
                error: "Tidak bisa transfer ke akun yang sama",
                sourceBalance: 0,
                requiredAmount: amount
            };
        }

        // Calculate source balance
        const balance = this.calculateAccountBalance(sourceAccount, transactions);

        if (balance.currentBalance < amount) {
            return {
                isValid: false,
                error: `Saldo ${sourceAccount.name} tidak cukup. Saldo: Rp${balance.currentBalance.toLocaleString('id-ID')}, Dibutuhkan: Rp${amount.toLocaleString('id-ID')}`,
                sourceBalance: balance.currentBalance,
                requiredAmount: amount
            };
        }

        // Warning for large transfers
        let warning;
        if (amount > balance.currentBalance * 0.5) {
            warning = `Transfer ini akan menghabiskan ${((amount / balance.currentBalance) * 100).toFixed(0)}% saldo ${sourceAccount.name}`;
        }

        return {
            isValid: true,
            warning,
            sourceBalance: balance.currentBalance,
            requiredAmount: amount
        };
    }

    /**
     * Generate double-entry transactions for a transfer.
     * Returns [expenseTransaction, incomeTransaction]
     */
    static createTransferTransactions(
        sourceAccountId: string,
        targetAccountId: string,
        amount: number,
        description: string,
        date: string,
        accounts: any[]
    ): [any, any] {
        const sourceAccount = accounts.find(a => a.id === sourceAccountId);
        const targetAccount = accounts.find(a => a.id === targetAccountId);

        const expenseTransaction = {
            type: 'expense',
            amount,
            category: 'Transfer',
            description: description || `Transfer ke ${targetAccount?.name || 'Akun Lain'}`,
            date,
            accountId: sourceAccountId,
            toAccountId: targetAccountId, // Reference for tracking
            timestamp: new Date(date).getTime()
        };

        const incomeTransaction = {
            type: 'income',
            amount,
            category: 'Transfer',
            description: description || `Transfer dari ${sourceAccount?.name || 'Akun Lain'}`,
            date,
            accountId: targetAccountId,
            fromAccountId: sourceAccountId, // Reference for tracking
            timestamp: new Date(date).getTime()
        };

        return [expenseTransaction, incomeTransaction];
    }

    // ========================================
    // 3. CASH FLOW ANALYSIS
    // ========================================

    /**
     * Analyze cash flow for a specific period.
     * Provides income vs expense breakdown.
     */
    static analyzeCashFlow(
        transactions: any[],
        startDate: Date,
        endDate: Date
    ): CashFlowAnalysis {
        const periodTx = transactions.filter(t => {
            const txDate = new Date(t.date);
            return txDate >= startDate && txDate <= endDate;
        });

        const incomeTx = periodTx.filter(t => t.type === 'income');
        const expenseTx = periodTx.filter(t => t.type === 'expense');

        const totalInflow = incomeTx.reduce((sum, t) => sum + Number(t.amount), 0);
        const totalOutflow = expenseTx.reduce((sum, t) => sum + Number(t.amount), 0);

        // Group by category
        const incomeByCategory: Record<string, number> = {};
        incomeTx.forEach(t => {
            incomeByCategory[t.category] = (incomeByCategory[t.category] || 0) + Number(t.amount);
        });

        const expenseByCategory: Record<string, number> = {};
        expenseTx.forEach(t => {
            expenseByCategory[t.category] = (expenseByCategory[t.category] || 0) + Number(t.amount);
        });

        const incomeSources = Object.entries(incomeByCategory).map(([cat, amt]) => ({
            category: cat,
            amount: amt
        })).sort((a, b) => b.amount - a.amount);

        const expenseCategories = Object.entries(expenseByCategory).map(([cat, amt]) => ({
            category: cat,
            amount: amt
        })).sort((a, b) => b.amount - a.amount);

        // Biggest transactions
        const biggestIncome = incomeTx.reduce((max, t) => 
            t.amount > max.amount ? { description: t.description, amount: t.amount } : max,
            { description: '', amount: 0 }
        );

        const biggestExpense = expenseTx.reduce((max, t) => 
            t.amount > max.amount ? { description: t.description, amount: t.amount } : max,
            { description: '', amount: 0 }
        );

        return {
            period: `${startDate.toISOString().split('T')[0]} - ${endDate.toISOString().split('T')[0]}`,
            totalInflow,
            totalOutflow,
            netCashFlow: totalInflow - totalOutflow,
            incomeSources,
            expenseCategories,
            biggestIncome,
            biggestExpense
        };
    }

    /**
     * Get monthly cash flow summary.
     */
    static getMonthlyAnalysis(
        transactions: any[],
        year: number,
        month: number
    ): CashFlowAnalysis {
        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0, 23, 59, 59);
        return this.analyzeCashFlow(transactions, startDate, endDate);
    }

    // ========================================
    // 4. RECURRING TRANSACTION DETECTION
    // ========================================

    /**
     * Detect recurring transactions (subscriptions, bills).
     * Uses pattern matching on merchant/description + amount + date frequency.
     */
    static detectRecurringTransactions(
        transactions: any[],
        minOccurrences: number = 3
    ): RecurringTransaction[] {
        // Group by merchant/description (normalized)
        const groups: Record<string, any[]> = {};

        transactions.forEach(tx => {
            const key = (tx.merchant || tx.description || '').toLowerCase().trim();
            if (key.length < 3) return; // Skip very short keys

            if (!groups[key]) groups[key] = [];
            groups[key].push(tx);
        });

        const recurring: RecurringTransaction[] = [];

        Object.entries(groups).forEach(([key, txs]) => {
            if (txs.length < minOccurrences) return;

            // Sort by date
            txs.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

            // Calculate average amount
            const amounts = txs.map(t => Number(t.amount));
            const avgAmount = amounts.reduce((a, b) => a + b, 0) / amounts.length;
            const amountVariance = Math.max(...amounts) - Math.min(...amounts);

            // If amount varies too much, skip
            if (amountVariance > avgAmount * 0.2) return; // 20% tolerance

            // Calculate date intervals
            const intervals: number[] = [];
            for (let i = 1; i < txs.length; i++) {
                const prev = new Date(txs[i - 1].date);
                const curr = new Date(txs[i].date);
                const daysDiff = Math.round((curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24));
                intervals.push(daysDiff);
            }

            const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;

            // Determine frequency
            let frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
            if (avgInterval <= 2) frequency = 'daily';
            else if (avgInterval <= 9) frequency = 'weekly';
            else if (avgInterval <= 35) frequency = 'monthly';
            else frequency = 'yearly';

            const lastTx = txs[txs.length - 1];
            const lastDate = new Date(lastTx.date);

            // Calculate next expected date
            let nextExpected = new Date(lastDate);
            if (frequency === 'daily') nextExpected.setDate(nextExpected.getDate() + 1);
            else if (frequency === 'weekly') nextExpected.setDate(nextExpected.getDate() + 7);
            else if (frequency === 'monthly') nextExpected.setMonth(nextExpected.getMonth() + 1);
            else nextExpected.setFullYear(nextExpected.getFullYear() + 1);

            // Confidence based on consistency
            const intervalVariance = Math.max(...intervals) - Math.min(...intervals);
            const confidence = Math.max(0.5, 1 - (intervalVariance / avgInterval));

            recurring.push({
                merchant: txs[0].merchant || txs[0].description,
                category: txs[0].category,
                averageAmount: Math.round(avgAmount),
                frequency,
                lastOccurrence: lastDate,
                nextExpected,
                confidence: Math.round(confidence * 100) / 100
            });
        });

        return recurring.sort((a, b) => b.confidence - a.confidence);
    }

    // ========================================
    // 5. ANOMALY DETECTION
    // ========================================

    /**
     * Detect unusual spending patterns.
     * Returns transactions that are outliers.
     */
    static detectAnomalies(
        transactions: any[],
        lookbackDays: number = 90
    ): any[] {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - lookbackDays);

        const recentTx = transactions.filter(t => 
            new Date(t.date) >= cutoffDate && t.type === 'expense'
        );

        if (recentTx.length < 10) return []; // Not enough data

        // Calculate statistics per category
        const categoryStats: Record<string, { amounts: number[]; mean: number; stdDev: number }> = {};

        recentTx.forEach(t => {
            if (!categoryStats[t.category]) {
                categoryStats[t.category] = { amounts: [], mean: 0, stdDev: 0 };
            }
            categoryStats[t.category].amounts.push(Number(t.amount));
        });

        // Calculate mean and std deviation
        Object.keys(categoryStats).forEach(cat => {
            const amounts = categoryStats[cat].amounts;
            const mean = amounts.reduce((a, b) => a + b, 0) / amounts.length;
            const variance = amounts.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / amounts.length;
            const stdDev = Math.sqrt(variance);

            categoryStats[cat].mean = mean;
            categoryStats[cat].stdDev = stdDev;
        });

        // Detect outliers (>2 standard deviations from mean)
        const anomalies: any[] = [];

        recentTx.forEach(t => {
            const stats = categoryStats[t.category];
            if (!stats) return;

            const zScore = Math.abs((Number(t.amount) - stats.mean) / stats.stdDev);

            if (zScore > 2) { // 2 sigma rule
                anomalies.push({
                    ...t,
                    anomalyReason: `Jumlah Rp${Number(t.amount).toLocaleString('id-ID')} jauh lebih tinggi dari rata-rata kategori ${t.category} (Rp${Math.round(stats.mean).toLocaleString('id-ID')})`,
                    zScore: Math.round(zScore * 100) / 100,
                    severity: zScore > 3 ? 'high' : 'medium'
                });
            }
        });

        return anomalies.sort((a, b) => b.zScore - a.zScore);
    }

    // ========================================
    // 6. AI-POWERED FINANCIAL INSIGHTS
    // ========================================

    /**
     * Generate comprehensive financial health report using AI.
     */
    static async generateFinancialHealthReport(
        accounts: any[],
        transactions: any[],
        budgets: any[]
    ): Promise<string> {
        const balances = this.calculateAllBalances(accounts, transactions);
        const netWorth = this.calculateNetWorth(accounts, transactions);
        
        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const cashFlow = this.analyzeCashFlow(transactions, monthStart, now);
        
        const recurring = this.detectRecurringTransactions(transactions);
        const anomalies = this.detectAnomalies(transactions);

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
            console.error("[FinancialLogic] Error generating report:", error);
            return "Gagal menganalisis kesehatan keuangan. Silakan coba lagi nanti.";
        }
    }

    // ========================================
    // 7. SMART SAVINGS GOAL PLANNER
    // ========================================

    /**
     * Calculate feasibility of a savings goal.
     */
    static analyzeSavingsGoal(
        goalAmount: number,
        targetMonths: number,
        accounts: any[],
        transactions: any[]
    ): {
        currentSavings: number;
        requiredMonthlySavings: number;
        currentMonthlySavings: number;
        gap: number;
        isFeasible: boolean;
        recommendation: string;
    } {
        const netWorth = this.calculateNetWorth(accounts, transactions);
        
        // Calculate average monthly savings (last 3 months)
        const now = new Date();
        const threeMonthsAgo = new Date(now);
        threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
        
        const recentCashFlow = this.analyzeCashFlow(transactions, threeMonthsAgo, now);
        const avgMonthlySavings = recentCashFlow.netCashFlow / 3;

        const requiredMonthlySavings = goalAmount / targetMonths;
        const gap = requiredMonthlySavings - avgMonthlySavings;
        const isFeasible = gap <= (recentCashFlow.totalInflow / 3) * 0.3; // Gap < 30% of income

        let recommendation = '';
        if (isFeasible) {
            recommendation = `Goal bisa dicapai! Kamu perlu menabung Rp${Math.round(requiredMonthlySavings).toLocaleString('id-ID')}/bulan. Saat ini rata-rata Rp${Math.round(avgMonthlySavings).toLocaleString('id-ID')}/bulan. Tambah Rp${Math.round(gap).toLocaleString('id-ID')}/bulan dengan mengurangi pengeluaran non-esensial.`;
        } else {
            const realisticMonths = Math.ceil(goalAmount / avgMonthlySavings);
            recommendation = `Goal cukup sulit dengan pola saving saat ini. Pertimbangkan extend target jadi ${realisticMonths} bulan, atau tingkatkan saving rate dengan mengurangi pengeluaran hingga Rp${Math.round(gap).toLocaleString('id-ID')}/bulan.`;
        }

        return {
            currentSavings: netWorth,
            requiredMonthlySavings: Math.round(requiredMonthlySavings),
            currentMonthlySavings: Math.round(avgMonthlySavings),
            gap: Math.round(gap),
            isFeasible,
            recommendation
        };
    }
}
