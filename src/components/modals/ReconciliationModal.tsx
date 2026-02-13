import React, { useState, useEffect } from 'react';
import { X, Check } from 'lucide-react';
import { FinancialCore } from '../../services/financial/FinancialCore';
import { ReconciliationService, ReconciliationData } from '../../services/financial/ReconciliationService';

interface ReconciliationModalProps {
    isOpen: boolean;
    onClose: () => void;
    account: any;
    accounts: any[];
    transactions: any[];
    onSave: (transaction: any) => void;
}

export const ReconciliationModal: React.FC<ReconciliationModalProps> = ({
    isOpen,
    onClose,
    account,
    accounts,
    transactions,
    onSave
}) => {
    const [actualBalance, setActualBalance] = useState<string>('');
    const [notes, setNotes] = useState('');
    const [reconciliationData, setReconciliationData] = useState<ReconciliationData | null>(null);
    const [suggestions, setSuggestions] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (isOpen && account) {
            // Reset state when opening
            setActualBalance('');
            setNotes('');
            setReconciliationData(null);
            setSuggestions([]);
        }
    }, [isOpen, account]);

    const handleCalculate = async () => {
        if (!account || !actualBalance) return;

        const numericBalance = parseFloat(actualBalance.replace(/[^\d.-]/g, ''));
        if (isNaN(numericBalance)) return;

        try {
            setIsLoading(true);
            const data = ReconciliationService.calculateReconciliation(
                account.id,
                numericBalance,
                accounts,
                transactions
            );
            data.notes = notes;
            setReconciliationData(data);

            // Get suggestions if there is a difference
            if (data.difference !== 0) {
                // Get recent transactions for this account
                const recentTx = transactions
                    .filter(t => t.accountId === account.id)
                    .sort((a, b) => b.timestamp - a.timestamp)
                    .slice(0, 10);

                const aiSuggestions = await ReconciliationService.generateReconciliationSuggestions(
                    data,
                    recentTx
                );
                setSuggestions(aiSuggestions);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleConfirm = () => {
        if (!reconciliationData) return;

        const transaction = ReconciliationService.createReconciliationTransaction(
            reconciliationData,
            accounts
        );

        onSave(transaction);
        onClose();
    };

    if (!isOpen || !account) return null;

    const formatCurrency = (val: number) =>
        new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(val);

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl overflow-hidden">
                {/* Header */}
                <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                    <h3 className="font-semibold text-slate-800">Rekonsiliasi Saldo</h3>
                    <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                        <X size={20} className="text-slate-500" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 space-y-6">
                    {/* Account Info */}
                    <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl border border-slate-100">
                        <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center text-2xl shadow-sm">
                            {account.icon}
                        </div>
                        <div>
                            <p className="text-sm text-slate-500">{account.provider}</p>
                            <h4 className="font-semibold text-slate-800">{account.name}</h4>
                            <p className="text-xs text-slate-400 mt-0.5">
                                Tercatat: {formatCurrency(FinancialCore.calculateAccountBalance(account, transactions).currentBalance)}
                            </p>
                        </div>
                    </div>

                    {/* Input */}
                    {!reconciliationData ? (
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    Saldo Aktual (Cek Mobile Banking)
                                </label>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-medium">Rp</span>
                                    <input
                                        type="number"
                                        value={actualBalance}
                                        onChange={(e) => setActualBalance(e.target.value)}
                                        className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all font-medium text-lg"
                                        placeholder="0"
                                        autoFocus
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    Catatan (Opsional)
                                </label>
                                <textarea
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    className="w-full p-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm"
                                    placeholder="Contoh: Selisih karena biaya admin bulanan..."
                                    rows={2}
                                />
                            </div>

                            <button
                                onClick={handleCalculate}
                                disabled={!actualBalance || isLoading}
                                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2"
                            >
                                {isLoading ? 'Menganalisis...' : 'Cek Selisih'}
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                            {/* Result Card */}
                            <div className={`p-5 rounded-xl border ${reconciliationData.difference === 0
                                    ? 'bg-green-50 border-green-100'
                                    : 'bg-amber-50 border-amber-100'
                                }`}>
                                <div className="flex justify-between items-start mb-2">
                                    <span className="text-sm font-medium text-slate-600">Selisih</span>
                                    <span className={`text-lg font-bold ${reconciliationData.difference === 0 ? 'text-green-600' : 'text-amber-600'
                                        }`}>
                                        {formatCurrency(Math.abs(reconciliationData.difference))}
                                    </span>
                                </div>

                                {reconciliationData.difference === 0 ? (
                                    <p className="text-sm text-green-700 flex items-center gap-2">
                                        <Check size={16} /> Saldo sudah sesuai! Tidak ada penyesuaian yang diperlukan.
                                    </p>
                                ) : (
                                    <div className="space-y-2">
                                        <p className="text-sm text-amber-700">
                                            {reconciliationData.difference > 0
                                                ? 'Saldo aktual lebih BESAR dari catatan. Sistem akan mencatat sebagai Pemasukan.'
                                                : 'Saldo aktual lebih KECIL dari catatan. Sistem akan mencatat sebagai Pengeluaran.'
                                            }
                                        </p>
                                        <div className="pt-2 border-t border-amber-200/50">
                                            <p className="text-xs font-semibold text-amber-800 mb-1">Saran Perbaikan:</p>
                                            <ul className="text-xs text-amber-700 space-y-1 list-disc pl-4">
                                                {suggestions.length > 0 ? (
                                                    suggestions.map((s, i) => <li key={i}>{s}</li>)
                                                ) : (
                                                    <li>Cek kembali mutasi rekening Anda.</li>
                                                )}
                                            </ul>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Actions */}
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setReconciliationData(null)}
                                    className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-medium transition-colors"
                                >
                                    Ubah Input
                                </button>
                                <button
                                    onClick={handleConfirm}
                                    className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-colors"
                                >
                                    {reconciliationData.difference === 0 ? 'Selesai' : 'Simpan Penyesuaian'}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
