export interface AIConfig {
    models: {
        fast: string;
        smart: string;
        vision: string;
    };
    maxRetries: number;
    timeout: number;
    maxHistoryTurns: number;
    maxContextTokens: number;
}

export type IntentType = 'transaction' | 'query' | 'advice' | 'planning' | 'analysis';

export interface Intent {
    type: IntentType;
    confidence: number;
    entities?: Record<string, any>;
}

export interface TransactionData {
    type: 'expense' | 'income' | 'transfer';
    amount: number;
    category: string;
    description: string;
    date: string;
    accountId?: string;
    toAccountId?: string; // For transfers
    merchant?: string;
    items?: { name: string; qty: number; price: number }[];
    requiresClarification?: boolean;
    isReconciliation?: boolean;
    reconciliationData?: {
        recordedBalance: number;
        actualBalance: number;
        difference: number;
    };
    isRecurring?: boolean;
    recurringInfo?: {
        frequency: 'daily' | 'weekly' | 'monthly';
        nextExpected: string;
    };
}

export interface AIResponse {
    success: boolean;
    data?: any;
    message?: string;
    error?: string;
    warning?: string; // New field for non-blocking alerts
    intent?: Intent;
}
