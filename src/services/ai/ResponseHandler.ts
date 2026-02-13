import { AIResponse, TransactionData, Intent } from '../../types/ai.types';

export const handleAIResponse = (
    responseText: string,
    intent: Intent
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
        return {
            success: false,
            error: "Gagal membaca format data transaksi. Coba ulangi.",
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
            if (!txData.accountId || !txData.toAccountId) {
                throw new Error("Transfer harus punya akun asal dan tujuan");
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
