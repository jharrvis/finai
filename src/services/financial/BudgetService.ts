import { Budget, BudgetAlert, BudgetAnalysis } from '../../types/budget.types';
import { AIService } from '../ai/AIService';

export class BudgetService {

    /**
     * Calculate spending for a specific period
     */
    static calculateSpending(
        transactions: any[],
        category: string,
        startDate: Date,
        endDate: Date
    ): number {
        return transactions
            .filter(tx =>
                tx.type === 'expense' &&
                tx.category === category &&
                new Date(tx.date) >= startDate &&
                new Date(tx.date) <= endDate
            )
            .reduce((sum, tx) => sum + tx.amount, 0);
    }

    /**
     * Get start date based on period
     */
    static getPeriodStartDate(period: 'daily' | 'weekly' | 'monthly'): Date {
        const now = new Date();

        switch (period) {
            case 'daily':
                return new Date(now.getFullYear(), now.getMonth(), now.getDate());
            case 'weekly':
                const dayOfWeek = now.getDay();
                const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Monday as start
                return new Date(now.getTime() - diff * 24 * 60 * 60 * 1000);
            case 'monthly':
                return new Date(now.getFullYear(), now.getMonth(), 1);
            default:
                return now;
        }
    }

    /**
     * Get end date based on period
     */
    static getPeriodEndDate(period: 'daily' | 'weekly' | 'monthly'): Date {
        const now = new Date();

        switch (period) {
            case 'daily':
                return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
            case 'weekly':
                const startOfWeek = this.getPeriodStartDate('weekly');
                return new Date(startOfWeek.getTime() + 7 * 24 * 60 * 60 * 1000 - 1);
            case 'monthly':
                return new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
            default:
                return now;
        }
    }

    /**
     * Calculate days remaining in period
     */
    static getDaysRemaining(period: 'daily' | 'weekly' | 'monthly'): number {
        const now = new Date();
        const endDate = this.getPeriodEndDate(period);
        const diff = endDate.getTime() - now.getTime();
        return Math.ceil(diff / (24 * 60 * 60 * 1000));
    }

    /**
     * Determine alert status based on percentage
     */
    static getAlertStatus(percentage: number): 'safe' | 'warning' | 'critical' | 'over' {
        if (percentage >= 100) return 'over';
        if (percentage >= 90) return 'critical';
        if (percentage >= 75) return 'warning';
        return 'safe';
    }

    /**
     * Generate AI-powered suggestions
     */
    static async generateSuggestions(
        category: string,
        spent: number,
        budget: number,
        daysRemaining: number
    ): Promise<string[]> {
        const dailyAverage = spent / (30 - daysRemaining || 1);

        const prompt = `User sudah spending Rp${spent.toLocaleString('id-ID')} untuk kategori ${category}, dari budget Rp${budget.toLocaleString('id-ID')} (${((spent / budget) * 100).toFixed(0)}%).

Sisa waktu: ${daysRemaining} hari.
Rata-rata harian: Rp${dailyAverage.toLocaleString('id-ID')}

TUGAS: Berikan 2-3 saran praktis dan spesifik untuk:
${spent > budget ? 'mengurangi overspending' : 'menjaga agar tidak melebihi budget'}

ATURAN:
- Saran harus actionable (bisa langsung dilakukan)
- Sebutkan angka konkret (misal: "hemat Rp50rb dengan...")
- Fokus pada kategori ${category}
- Bahasa Indonesia casual dan supportive

OUTPUT: Array of strings (max 3 saran), TANPA numbering.

Contoh:
["Masak di rumah 3x seminggu bisa hemat Rp300rb", "Gunakan promo GrabFood max 2x/minggu"]`;

        try {
            // Use the new simple process method
            const aiText = await AIService.processSimple(prompt);

            // Parse AI response
            const jsonMatch = aiText.match(/\[[\s\S]*\]/);
            if (jsonMatch) {
                const suggestions = JSON.parse(jsonMatch[0]);
                return suggestions.slice(0, 3);
            }

            const lines = aiText.split('\n').filter((line: string) =>
                line.trim() && !line.includes('```') && !line.startsWith('[') && !line.startsWith(']')
            );
            return lines.slice(0, 3);

        } catch (error) {
            console.error('Error generating suggestions:', error);
            return [
                `Kurangi pengeluaran kategori ${category} untuk sisa bulan ini.`,
                'Evaluasi ulang budget Anda bulan depan.'
            ];
        }
    }

    /**
     * Main function: Analyze budgets and generate alerts
     */
    static async analyzeBudgets(
        budgets: Budget[],
        transactions: any[]
    ): Promise<BudgetAnalysis> {
        const alerts: BudgetAlert[] = [];
        let totalBudget = 0;
        let totalSpent = 0;

        for (const budget of budgets) {
            const startDate = this.getPeriodStartDate(budget.period);
            const endDate = this.getPeriodEndDate(budget.period);
            const spent = this.calculateSpending(transactions, budget.category, startDate, endDate);
            const percentage = (spent / budget.amount) * 100;
            const status = this.getAlertStatus(percentage);
            const daysRemaining = this.getDaysRemaining(budget.period);

            totalBudget += budget.amount;
            totalSpent += spent;

            let message = '';
            if (status === 'over') {
                const excess = spent - budget.amount;
                message = `Budget ${budget.category} sudah over Rp${excess.toLocaleString('id-ID')}! 🚨`;
            } else if (status === 'critical') {
                const remaining = budget.amount - spent;
                message = `Hati-hati! Budget ${budget.category} tinggal Rp${remaining.toLocaleString('id-ID')} (${daysRemaining} hari lagi) ⚠️`;
            } else if (status === 'warning') {
                message = `Budget ${budget.category} sudah ${percentage.toFixed(0)}% terpakai. Mulai hemat ya! 💡`;
            } else {
                message = `Budget ${budget.category} masih aman (${percentage.toFixed(0)}%) ✅`;
            }

            let suggestions: string[] = [];
            // Only generate suggestions if warning/critical, to save AI calls
            if (status !== 'safe' && status !== 'over') {
                // In real app, maybe debounce or limit this call
                // For now, let's keep it simple or maybe skip distinct AI call per item to save tokens
                // We can implement batch suggestion later
            }

            alerts.push({
                category: budget.category,
                spent,
                budget: budget.amount,
                percentage,
                status,
                message,
                suggestions
            });
        }

        const overallPercentage = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;
        let overall_status: 'safe' | 'warning' | 'critical';
        if (overallPercentage >= 90) overall_status = 'critical';
        else if (overallPercentage >= 75) overall_status = 'warning';
        else overall_status = 'safe';

        const now = new Date();
        const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
        const daysPassed = now.getDate();
        const dailyAverage = totalSpent / (daysPassed || 1);
        const estimatedEndOfMonth = dailyAverage * daysInMonth;
        const willExceed = estimatedEndOfMonth > totalBudget;

        return {
            alerts,
            overall_status,
            total_budget: totalBudget,
            total_spent: totalSpent,
            days_remaining: daysInMonth - daysPassed,
            projection: {
                estimated_end_of_month: estimatedEndOfMonth,
                will_exceed: willExceed,
                excess_amount: willExceed ? estimatedEndOfMonth - totalBudget : undefined
            }
        };
    }
}
