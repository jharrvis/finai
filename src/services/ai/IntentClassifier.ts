import { Intent } from '../../types/ai.types';

export const classifyIntent = async (userInput: string, hasImage: boolean): Promise<Intent> => {
    // Jika ada gambar, pasti transaction
    if (hasImage) {
        return { type: 'transaction', confidence: 1.0 };
    }

    // Simple rule-based classification (bisa di-upgrade ke LLM)
    const lowerInput = userInput.toLowerCase();

    // Transaction keywords
    if (/catat|beli|bayar|transfer|pindah|belanja|byr|tf|jajan/i.test(lowerInput)) {
        return { type: 'transaction', confidence: 0.9 };
    }

    // Query keywords
    if (/berapa|total|saldo|riwayat|transaksi|pengeluaran|pemasukan|sisa|habis/i.test(lowerInput)) {
        return { type: 'query', confidence: 0.9 };
    }

    // Advice keywords
    if (/saran|tips|gimana|bagus|sebaiknya|rekomendasi|hemat/i.test(lowerInput)) {
        return { type: 'advice', confidence: 0.8 };
    }

    // Planning keywords
    if (/rencana|target|nabung|investasi|budget/i.test(lowerInput)) {
        return { type: 'planning', confidence: 0.8 };
    }

    // Analysis keywords
    if (/analisis|laporan|report|grafik|trend|pola/i.test(lowerInput)) {
        return { type: 'analysis', confidence: 0.8 };
    }

    // Default fallback
    return { type: 'query', confidence: 0.5 };
};
