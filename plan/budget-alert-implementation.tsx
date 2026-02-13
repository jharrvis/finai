// ============================================
// CONTOH IMPLEMENTASI: BUDGET ALERT FEATURE
// ============================================

import { useState, useEffect } from 'react';

// --- TYPES ---
interface Budget {
    id: string;
    category: string;
    amount: number;
    period: 'daily' | 'weekly' | 'monthly';
    userId: string;
}

interface BudgetAlert {
    category: string;
    spent: number;
    budget: number;
    percentage: number;
    status: 'safe' | 'warning' | 'critical' | 'over';
    message: string;
    suggestions: string[];
}

interface BudgetAnalysis {
    alerts: BudgetAlert[];
    overall_status: 'safe' | 'warning' | 'critical';
    total_budget: number;
    total_spent: number;
    days_remaining: number;
    projection: {
        estimated_end_of_month: number;
        will_exceed: boolean;
        excess_amount?: number;
    };
}

// --- BUDGET CHECKER SERVICE ---
class BudgetAlertService {
    
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
        daysRemaining: number,
        historicalData: any[]
    ): Promise<string[]> {
        const overspent = spent - budget;
        const dailyAverage = spent / (30 - daysRemaining || 1);
        
        const prompt = `User sudah spending Rp${spent.toLocaleString('id-ID')} untuk kategori ${category}, dari budget Rp${budget.toLocaleString('id-ID')} (${((spent/budget)*100).toFixed(0)}%).

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
            const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    "model": "google/gemini-2.0-flash-thinking-exp-01-21",
                    "messages": [
                        { "role": "user", "content": prompt }
                    ],
                    "temperature": 0.7
                })
            });

            const result = await response.json();
            const aiText = result.choices?.[0]?.message?.content || "";
            
            // Parse AI response
            const jsonMatch = aiText.match(/\[[\s\S]*\]/);
            if (jsonMatch) {
                const suggestions = JSON.parse(jsonMatch[0]);
                return suggestions.slice(0, 3); // Max 3 suggestions
            }

            // Fallback: parse from text
            const lines = aiText.split('\n').filter(line => 
                line.trim() && !line.includes('```')
            );
            return lines.slice(0, 3);

        } catch (error) {
            console.error('Error generating suggestions:', error);
            
            // Fallback suggestions
            const fallbackSuggestions: Record<string, string[]> = {
                'Makanan': [
                    'Masak di rumah 3-4x seminggu untuk hemat Rp200-300rb',
                    'Bawa bekal ke kantor, hindari makan di luar setiap hari',
                    'Manfaatkan promo delivery app hanya untuk weekend'
                ],
                'Transport': [
                    'Gunakan transportasi umum atau carpool 2-3x seminggu',
                    'Jalan kaki atau naik sepeda untuk jarak dekat (<2km)',
                    'Gabungkan perjalanan agar tidak bolak-balik'
                ],
                'Hiburan': [
                    'Cari free activities: jogging di taman, nonton film di rumah',
                    'Batasi nongkrong di kafe max 2x/bulan',
                    'Manfaatkan trial gratis sebelum subscribe layanan baru'
                ],
                'Belanja': [
                    'Buat list sebelum belanja, stick to the list',
                    'Tunda pembelian impulsif 24-48 jam dulu',
                    'Cari promo atau tunggu sale untuk barang non-urgent'
                ]
            };

            return fallbackSuggestions[category] || [
                'Review pengeluaran harian dan identifikasi yang bisa dikurangi',
                'Tunda pembelian non-esensial hingga bulan depan',
                'Set spending limit harian untuk sisa bulan ini'
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

        // Process each budget
        for (const budget of budgets) {
            const startDate = this.getPeriodStartDate(budget.period);
            const endDate = this.getPeriodEndDate(budget.period);
            const spent = this.calculateSpending(transactions, budget.category, startDate, endDate);
            const percentage = (spent / budget.amount) * 100;
            const status = this.getAlertStatus(percentage);
            const daysRemaining = this.getDaysRemaining(budget.period);

            totalBudget += budget.amount;
            totalSpent += spent;

            // Generate message
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

            // Generate suggestions (only for warning/critical/over)
            let suggestions: string[] = [];
            if (status !== 'safe') {
                suggestions = await this.generateSuggestions(
                    budget.category,
                    spent,
                    budget.amount,
                    daysRemaining,
                    transactions
                );
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

        // Calculate overall status
        const overallPercentage = (totalSpent / totalBudget) * 100;
        let overall_status: 'safe' | 'warning' | 'critical';
        if (overallPercentage >= 90) overall_status = 'critical';
        else if (overallPercentage >= 75) overall_status = 'warning';
        else overall_status = 'safe';

        // Project end-of-month spending
        const now = new Date();
        const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
        const daysPassed = now.getDate();
        const dailyAverage = totalSpent / daysPassed;
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

// --- REACT COMPONENT ---
export const BudgetAlertWidget: React.FC<{
    budgets: Budget[];
    transactions: any[];
    onViewDetails: (category: string) => void;
}> = ({ budgets, transactions, onViewDetails }) => {
    const [analysis, setAnalysis] = useState<BudgetAnalysis | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const analyzeData = async () => {
            setLoading(true);
            try {
                const result = await BudgetAlertService.analyzeBudgets(budgets, transactions);
                setAnalysis(result);
            } catch (error) {
                console.error('Budget analysis failed:', error);
            } finally {
                setLoading(false);
            }
        };

        analyzeData();
    }, [budgets, transactions]);

    if (loading) {
        return <div className="animate-pulse">Menganalisis budget...</div>;
    }

    if (!analysis) {
        return <div>Gagal memuat data budget</div>;
    }

    // Status colors
    const statusColors = {
        safe: 'bg-green-100 text-green-800',
        warning: 'bg-yellow-100 text-yellow-800',
        critical: 'bg-orange-100 text-orange-800',
        over: 'bg-red-100 text-red-800'
    };

    return (
        <div className="space-y-4">
            {/* Overall Summary */}
            <div className={`p-4 rounded-lg ${statusColors[analysis.overall_status]}`}>
                <h3 className="font-bold text-lg mb-2">
                    Ringkasan Budget Bulan Ini
                </h3>
                <div className="space-y-1">
                    <p>
                        Total Budget: Rp{analysis.total_budget.toLocaleString('id-ID')}
                    </p>
                    <p>
                        Sudah Terpakai: Rp{analysis.total_spent.toLocaleString('id-ID')} 
                        ({((analysis.total_spent / analysis.total_budget) * 100).toFixed(0)}%)
                    </p>
                    <p className="text-sm">
                        Sisa {analysis.days_remaining} hari
                    </p>

                    {/* Projection Warning */}
                    {analysis.projection.will_exceed && (
                        <div className="mt-2 pt-2 border-t border-current">
                            <p className="font-semibold">⚠️ Proyeksi Akhir Bulan:</p>
                            <p className="text-sm">
                                Jika pola spending tetap sama, kamu akan over budget 
                                Rp{analysis.projection.excess_amount?.toLocaleString('id-ID')}
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* Individual Category Alerts */}
            <div className="space-y-3">
                {analysis.alerts
                    .filter(alert => alert.status !== 'safe') // Only show warnings
                    .map((alert, index) => (
                        <div 
                            key={index}
                            className={`p-4 rounded-lg ${statusColors[alert.status]}`}
                        >
                            <div className="flex justify-between items-start mb-2">
                                <h4 className="font-semibold">{alert.category}</h4>
                                <span className="text-sm font-bold">
                                    {alert.percentage.toFixed(0)}%
                                </span>
                            </div>

                            {/* Progress Bar */}
                            <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                                <div 
                                    className={`h-2 rounded-full ${
                                        alert.status === 'over' ? 'bg-red-600' :
                                        alert.status === 'critical' ? 'bg-orange-600' :
                                        'bg-yellow-600'
                                    }`}
                                    style={{ width: `${Math.min(alert.percentage, 100)}%` }}
                                />
                            </div>

                            <p className="text-sm mb-2">{alert.message}</p>

                            {/* Suggestions */}
                            {alert.suggestions.length > 0 && (
                                <div className="mt-3 pt-3 border-t border-current">
                                    <p className="font-semibold text-sm mb-1">💡 Saran:</p>
                                    <ul className="text-sm space-y-1">
                                        {alert.suggestions.map((suggestion, idx) => (
                                            <li key={idx} className="flex items-start">
                                                <span className="mr-2">•</span>
                                                <span>{suggestion}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            <button
                                onClick={() => onViewDetails(alert.category)}
                                className="mt-3 text-sm underline hover:no-underline"
                            >
                                Lihat detail transaksi →
                            </button>
                        </div>
                    ))
                }

                {/* All safe message */}
                {analysis.alerts.every(a => a.status === 'safe') && (
                    <div className="p-4 rounded-lg bg-green-100 text-green-800">
                        <p className="font-semibold">🎉 Semua budget masih aman!</p>
                        <p className="text-sm mt-1">
                            Keep up the good work! Spending kamu terkontrol dengan baik.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};

// --- USAGE EXAMPLE ---
/*
import { BudgetAlertWidget } from './BudgetAlertFeature';

function MyFinanceApp() {
    const budgets = [
        { id: '1', category: 'Makanan', amount: 1500000, period: 'monthly', userId: 'user123' },
        { id: '2', category: 'Transport', amount: 500000, period: 'monthly', userId: 'user123' },
        { id: '3', category: 'Hiburan', amount: 300000, period: 'monthly', userId: 'user123' }
    ];

    return (
        <BudgetAlertWidget 
            budgets={budgets}
            transactions={transactions}
            onViewDetails={(category) => {
                console.log('View details for:', category);
                // Navigate to transaction list filtered by category
            }}
        />
    );
}
*/

export default BudgetAlertService;
