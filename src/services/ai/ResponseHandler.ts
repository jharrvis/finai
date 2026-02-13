import { AIResponse, Intent, TransactionData } from '../../types/ai.types';
import { FinancialCore } from '../financial/FinancialCore';

export const handleAIResponse = (
    responseText: string,
    intent: Intent,
    accounts: any[] = [], // New param
    transactions: any[] = [] // New param
): AIResponse => {
    // 1. If intent is NOT transaction, just return text
    if (intent.type !== 'transaction') {
        return {
            success: true,
            data: responseText,
            message: responseText,
            intent
        };
    }

    // 2. Parse JSON for Transaction
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
        // Fallback if no JSON found
        return {
            success: true,
            data: responseText,
            message: responseText,
            intent
        };
    }

    try {
        const txData = JSON.parse(jsonMatch[0]) as TransactionData;

        // 3. Validation
        if (!txData.type || !txData.amount) {
            throw new Error("Data transaksi tidak lengkap (tipe atau jumlah hilang)");
        }

        if (txData.type === 'transfer') {
            if (!txData.requiresClarification && (!txData.accountId || !txData.toAccountId)) {
                throw new Error("Transfer harus punya akun asal dan tujuan");
            }

            // NEW: Transfer Validation using FinancialCore
            if (txData.accountId && txData.toAccountId && accounts.length > 0) {
                const validation = FinancialCore.validateTransfer(
                    txData.accountId,
                    txData.toAccountId,
                    txData.amount,
                    accounts,
                    transactions
                );

                if (!validation.isValid) {
                    throw new Error(validation.error || "Transfer tidak valid");
                }

                // Return warning if exists (e.g. large transfer)
                if (validation.warning) {
                    return {
                        success: true,
                        data: txData,
                        intent,
                        warning: validation.warning
                    };
                }
            }
        }

        return {
            success: true,
            data: txData,
            intent
        };

    } catch (error: any) {
        return {
            success: false,
            error: `Gagal memproses transaksi: ${error.message}`,
            intent
        };
    }
};
