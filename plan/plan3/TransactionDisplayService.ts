// ============================================
// TRANSACTION DISPLAY SERVICE
// Enhanced Transaction Details with Account Info
// ============================================

import { FinancialLogicService } from './FinancialLogicService';

export interface TransactionDetailView {
    // Basic Info
    id: string;
    type: 'income' | 'expense' | 'transfer';
    amount: number;
    category: string;
    description: string;
    date: string;
    timestamp: number;

    // Account Information
    account: {
        id: string;
        name: string;
        provider: string;
        type: string;
        icon: string;
        color: string;
        balanceBefore: number;
        balanceAfter: number;
    };

    // For Transfer
    transferInfo?: {
        fromAccount: {
            id: string;
            name: string;
            provider: string;
            icon: string;
            balanceBefore: number;
            balanceAfter: number;
        };
        toAccount: {
            id: string;
            name: string;
            provider: string;
            icon: string;
            balanceBefore: number;
            balanceAfter: number;
        };
        feeAmount?: number;
    };

    // Receipt Info
    merchant?: string;
    items?: { name: string; qty: number; price: number }[];

    // Metadata
    isReconciliation?: boolean;
    reconciliationData?: any;
    isRecurring?: boolean;
    recurringInfo?: {
        frequency: 'daily' | 'weekly' | 'monthly';
        nextExpected: string;
    };

    // Audit Trail
    createdAt: number;
    createdBy?: string;
    lastModified?: number;
}

/**
 * TransactionDisplayService
 * 
 * Enhances transaction objects with complete account information,
 * balance before/after, and formatted display data.
 */
export class TransactionDisplayService {

    /**
     * Build enhanced transaction detail for UI display
     */
    static buildTransactionDetail(
        transaction: any,
        accounts: any[],
        allTransactions: any[]
    ): TransactionDetailView {
        const account = accounts.find(a => a.id === transaction.accountId);

        if (!account) {
            throw new Error("Akun transaksi tidak ditemukan");
        }

        // Calculate balance before/after this transaction
        const balanceInfo = this.calculateBalanceBeforeAfter(
            transaction,
            account,
            allTransactions
        );

        // Basic detail
        const detail: TransactionDetailView = {
            id: transaction.id,
            type: transaction.type,
            amount: transaction.amount,
            category: transaction.category,
            description: transaction.description,
            date: transaction.date,
            timestamp: transaction.timestamp,
            merchant: transaction.merchant,
            items: transaction.items,
            isReconciliation: transaction.isReconciliation,
            reconciliationData: transaction.reconciliationData,
            isRecurring: transaction.isRecurring,
            createdAt: transaction.createdAt || transaction.timestamp,
            account: {
                id: account.id,
                name: account.name,
                provider: account.provider,
                type: account.type,
                icon: account.icon,
                color: account.color,
                balanceBefore: balanceInfo.before,
                balanceAfter: balanceInfo.after
            }
        };

        // Add transfer info if applicable
        if (this.isTransferTransaction(transaction)) {
            detail.transferInfo = this.buildTransferInfo(
                transaction,
                accounts,
                allTransactions
            );
        }

        return detail;
    }

    /**
     * Check if transaction is part of a transfer
     */
    private static isTransferTransaction(transaction: any): boolean {
        return (
            transaction.type === 'transfer' ||
            transaction.category === 'Transfer' ||
            !!transaction.toAccountId ||
            !!transaction.fromAccountId
        );
    }

    /**
     * Build transfer information
     */
    private static buildTransferInfo(
        transaction: any,
        accounts: any[],
        allTransactions: any[]
    ): any {
        const currentAccount = accounts.find(a => a.id === transaction.accountId);

        // If this is expense side of transfer (money out)
        if (transaction.type === 'expense' && transaction.toAccountId) {
            const toAccount = accounts.find(a => a.id === transaction.toAccountId);
            if (!toAccount) return undefined;

            const toBalanceInfo = this.calculateBalanceBeforeAfter(
                transaction,
                toAccount,
                allTransactions
            );

            const currentBalanceInfo = this.calculateBalanceBeforeAfter(
                transaction,
                currentAccount,
                allTransactions
            );

            return {
                fromAccount: {
                    id: currentAccount.id,
                    name: currentAccount.name,
                    provider: currentAccount.provider,
                    icon: currentAccount.icon,
                    balanceBefore: currentBalanceInfo.before,
                    balanceAfter: currentBalanceInfo.after
                },
                toAccount: {
                    id: toAccount.id,
                    name: toAccount.name,
                    provider: toAccount.provider,
                    icon: toAccount.icon,
                    balanceBefore: toBalanceInfo.before,
                    balanceAfter: toBalanceInfo.after
                }
            };
        }

        // If this is income side of transfer (money in)
        if (transaction.type === 'income' && transaction.fromAccountId) {
            const fromAccount = accounts.find(a => a.id === transaction.fromAccountId);
            if (!fromAccount) return undefined;

            const fromBalanceInfo = this.calculateBalanceBeforeAfter(
                transaction,
                fromAccount,
                allTransactions
            );

            const currentBalanceInfo = this.calculateBalanceBeforeAfter(
                transaction,
                currentAccount,
                allTransactions
            );

            return {
                fromAccount: {
                    id: fromAccount.id,
                    name: fromAccount.name,
                    provider: fromAccount.provider,
                    icon: fromAccount.icon,
                    balanceBefore: fromBalanceInfo.before,
                    balanceAfter: fromBalanceInfo.after
                },
                toAccount: {
                    id: currentAccount.id,
                    name: currentAccount.name,
                    provider: currentAccount.provider,
                    icon: currentAccount.icon,
                    balanceBefore: currentBalanceInfo.before,
                    balanceAfter: currentBalanceInfo.after
                }
            };
        }

        return undefined;
    }

    /**
     * Calculate balance before and after a specific transaction
     */
    private static calculateBalanceBeforeAfter(
        transaction: any,
        account: any,
        allTransactions: any[]
    ): { before: number; after: number } {
        // Get all transactions for this account up to (but not including) this transaction
        const txBefore = allTransactions.filter(t => 
            t.accountId === account.id && 
            t.timestamp < transaction.timestamp
        );

        const incomeBefore = txBefore
            .filter(t => t.type === 'income')
            .reduce((sum, t) => sum + Number(t.amount), 0);
        
        const expenseBefore = txBefore
            .filter(t => t.type === 'expense')
            .reduce((sum, t) => sum + Number(t.amount), 0);

        const balanceBefore = (account.balance || 0) + incomeBefore - expenseBefore;

        // Calculate after
        let balanceAfter = balanceBefore;
        
        // Only apply this transaction if it belongs to this account
        if (transaction.accountId === account.id) {
            if (transaction.type === 'income') {
                balanceAfter += Number(transaction.amount);
            } else if (transaction.type === 'expense') {
                balanceAfter -= Number(transaction.amount);
            }
        }

        return {
            before: balanceBefore,
            after: balanceAfter
        };
    }

    /**
     * Format transaction for display (human-readable summary)
     */
    static formatTransactionSummary(detail: TransactionDetailView): string {
        const formatCurrency = (val: number) => `Rp${val.toLocaleString('id-ID')}`;

        // For reconciliation
        if (detail.isReconciliation) {
            return `Rekonsiliasi Saldo ${detail.account.name}: ${formatCurrency(detail.amount)}`;
        }

        // For transfer
        if (detail.transferInfo) {
            const { fromAccount, toAccount } = detail.transferInfo;
            return `Transfer ${formatCurrency(detail.amount)} dari ${fromAccount.name} ke ${toAccount.name}`;
        }

        // For regular income/expense
        return `${detail.description} ${formatCurrency(detail.amount)} menggunakan ${detail.account.name}`;
    }

    /**
     * Get transaction icon based on category
     */
    static getTransactionIcon(category: string): string {
        const iconMap: Record<string, string> = {
            // Income
            'Gaji': '💼',
            'Bonus': '🎁',
            'Investasi': '📈',
            'Freelance': '💻',
            'Hadiah': '🎉',
            'Refund': '↩️',
            'Cashback': '💰',

            // Expense
            'Makan & Minum': '🍽️',
            'Transportasi': '🚗',
            'Belanja': '🛒',
            'Tagihan': '📄',
            'Hiburan': '🎮',
            'Kesehatan': '🏥',
            'Pendidikan': '📚',
            'Transfer': '🔄',
            'Rekonsiliasi': '⚖️',

            // Default
            'Lainnya': '📝'
        };

        return iconMap[category] || '📝';
    }

    /**
     * Get transaction color based on type
     */
    static getTransactionColor(type: string): { bg: string; text: string } {
        const colorMap: Record<string, { bg: string; text: string }> = {
            'income': { bg: 'bg-green-100', text: 'text-green-600' },
            'expense': { bg: 'bg-rose-100', text: 'text-rose-600' },
            'transfer': { bg: 'bg-indigo-100', text: 'text-indigo-600' }
        };

        return colorMap[type] || { bg: 'bg-slate-100', text: 'text-slate-600' };
    }

    /**
     * Group transactions by date for list display
     */
    static groupTransactionsByDate(
        transactions: any[]
    ): Record<string, any[]> {
        const grouped: Record<string, any[]> = {};

        transactions.forEach(tx => {
            const date = tx.date.split('T')[0];
            if (!grouped[date]) {
                grouped[date] = [];
            }
            grouped[date].push(tx);
        });

        // Sort each group by timestamp descending
        Object.keys(grouped).forEach(date => {
            grouped[date].sort((a, b) => b.timestamp - a.timestamp);
        });

        return grouped;
    }

    /**
     * Build transaction list with account info for quick display
     */
    static buildTransactionListItems(
        transactions: any[],
        accounts: any[]
    ): Array<{
        transaction: any;
        accountName: string;
        accountIcon: string;
        accountColor: string;
        categoryIcon: string;
        displayColor: { bg: string; text: string };
    }> {
        return transactions.map(tx => {
            const account = accounts.find(a => a.id === tx.accountId);
            
            return {
                transaction: tx,
                accountName: account?.name || 'Unknown',
                accountIcon: account?.icon || '❓',
                accountColor: account?.color || '#64748b',
                categoryIcon: this.getTransactionIcon(tx.category),
                displayColor: this.getTransactionColor(tx.type)
            };
        });
    }

    /**
     * Format date for display
     */
    static formatDisplayDate(dateString: string): string {
        const date = new Date(dateString);
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        const dateOnly = dateString.split('T')[0];
        const todayStr = today.toISOString().split('T')[0];
        const yesterdayStr = yesterday.toISOString().split('T')[0];

        if (dateOnly === todayStr) {
            return 'Hari Ini';
        } else if (dateOnly === yesterdayStr) {
            return 'Kemarin';
        } else {
            return date.toLocaleDateString('id-ID', { 
                weekday: 'long', 
                day: 'numeric', 
                month: 'short',
                year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined
            });
        }
    }
}
