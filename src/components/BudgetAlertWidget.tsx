import React, { useState, useEffect } from 'react';
import { Budget, BudgetAnalysis } from '../types/budget.types';
import { BudgetService } from '../services/financial/BudgetService';

interface BudgetAlertWidgetProps {
    budgets: Budget[];
    transactions: any[];
    onViewDetails?: (category: string) => void;
    onEditBudget?: () => void;
}

export const BudgetAlertWidget: React.FC<BudgetAlertWidgetProps> = ({
    budgets,
    transactions,
    onViewDetails,
    onEditBudget
}) => {
    const [analysis, setAnalysis] = useState<BudgetAnalysis | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const analyzeData = async () => {
            setLoading(true);
            try {
                const result = await BudgetService.analyzeBudgets(budgets, transactions);
                setAnalysis(result);
            } catch (error) {
                console.error('Budget analysis failed:', error);
            } finally {
                setLoading(false);
            }
        };

        if (budgets.length > 0) {
            analyzeData();
        } else {
            setLoading(false);
        }
    }, [budgets, transactions]);

    if (loading) {
        return <div className="animate-pulse p-4 bg-gray-50 rounded-lg">Menganalisis budget...</div>;
    }

    if (!analysis || budgets.length === 0) {
        return null; // Don't show if no budgets
    }

    // Status colors
    const statusColors: any = {
        safe: 'bg-green-50 text-green-800 border-green-100',
        warning: 'bg-yellow-50 text-yellow-800 border-yellow-100',
        critical: 'bg-orange-50 text-orange-800 border-orange-100',
        over: 'bg-red-50 text-red-800 border-red-100'
    };

    return (
        <div className="space-y-4">
            {/* Overall Summary */}
            <div className={`p-4 rounded-lg border ${statusColors[analysis.overall_status]}`}>
                <h3 className="font-bold text-lg mb-2 flex items-center justify-between">
                    <span className="flex items-center gap-2">📊 Ringkasan Budget</span>
                    {onEditBudget && (
                        <button
                            onClick={onEditBudget}
                            className="text-xs font-bold text-slate-500 hover:text-indigo-600 bg-white/50 hover:bg-white px-3 py-1.5 rounded-lg transition-colors"
                        >
                            Edit
                        </button>
                    )}
                </h3>
                <div className="space-y-1">
                    <div className="flex justify-between">
                        <span>Total Budget:</span>
                        <span className="font-medium">Rp{analysis.total_budget.toLocaleString('id-ID')}</span>
                    </div>
                    <div className="flex justify-between">
                        <span>Terpakai:</span>
                        <span className="font-bold">
                            Rp{analysis.total_spent.toLocaleString('id-ID')}
                            <span className="text-xs ml-1 opacity-75">
                                ({((analysis.total_spent / analysis.total_budget) * 100).toFixed(0)}%)
                            </span>
                        </span>
                    </div>
                    <p className="text-sm mt-2 opacity-75">
                        Sisa {analysis.days_remaining} hari lagi bulan ini.
                    </p>

                    {/* Projection Warning */}
                    {analysis.projection.will_exceed && (
                        <div className="mt-3 pt-3 border-t border-current/20">
                            <p className="font-semibold text-sm flex items-center gap-1">
                                ⚠️ Proyeksi Akhir Bulan:
                            </p>
                            <p className="text-sm opacity-90">
                                Berpotensi over budget
                                <span className="font-bold mx-1">
                                    Rp{analysis.projection.excess_amount?.toLocaleString('id-ID')}
                                </span>
                                jika pola spending berlanjut.
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
                            className={`p-4 rounded-lg border ${statusColors[alert.status]}`}
                        >
                            <div className="flex justify-between items-start mb-2">
                                <h4 className="font-bold">{alert.category}</h4>
                                <span className="text-sm font-bold px-2 py-0.5 rounded bg-white/50">
                                    {alert.percentage.toFixed(0)}%
                                </span>
                            </div>

                            {/* Progress Bar */}
                            <div className="w-full bg-black/5 rounded-full h-2.5 mb-2 overflow-hidden">
                                <div
                                    className={`h-full rounded-full transition-all duration-500 ${alert.status === 'over' ? 'bg-red-500' :
                                        alert.status === 'critical' ? 'bg-orange-500' :
                                            'bg-yellow-500'
                                        }`}
                                    style={{ width: `${Math.min(alert.percentage, 100)}%` }}
                                />
                            </div>

                            <p className="text-sm mb-3 font-medium">{alert.message}</p>

                            {/* Suggestions */}
                            {alert.suggestions.length > 0 && (
                                <div className="mt-3 pt-3 border-t border-current/20">
                                    <p className="font-semibold text-xs uppercase opacity-70 mb-2">💡 Saran AI:</p>
                                    <ul className="text-sm space-y-2">
                                        {alert.suggestions.map((suggestion, idx) => (
                                            <li key={idx} className="flex items-start gap-2">
                                                <span className="mt-1 block w-1.5 h-1.5 rounded-full bg-current opacity-60"></span>
                                                <span className="opacity-90 leading-snug">{suggestion}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {onViewDetails && (
                                <button
                                    onClick={() => onViewDetails(alert.category)}
                                    className="mt-3 text-sm underline hover:no-underline opacity-80 hover:opacity-100"
                                >
                                    Lihat detail →
                                </button>
                            )}
                        </div>
                    ))
                }

                {/* All safe message */}
                {analysis.alerts.every(a => a.status === 'safe') && (
                    <div className="p-4 rounded-lg bg-green-50 border border-green-100 text-green-800 flex items-center gap-3">
                        <div className="text-2xl">🎉</div>
                        <div>
                            <p className="font-bold">Semua Aman!</p>
                            <p className="text-sm opacity-80">
                                Spending terkontrol dengan baik. Keep it up!
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
