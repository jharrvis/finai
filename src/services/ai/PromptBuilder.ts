import { Intent } from '../../types/ai.types';
import { basePrompt } from '../../config/prompts/base.prompts';
import { transactionPrompt } from '../../config/prompts/transaction.prompts';
import { queryPrompt } from '../../config/prompts/query.prompts';
import { advicePrompt } from '../../config/prompts/advice.prompts';
import { planningPrompt } from '../../config/prompts/planning.prompts';
import { analysisPrompt } from '../../config/prompts/analysis.prompts';
import { CATEGORIES } from '../../config/financial.config';

export const buildContext = (
    intent: Intent,
    accounts: any[],
    transactions: any[],
    isoDate: string,
    categories: string[] = CATEGORIES // Default to static config if not provided
): string => {
    // 1. Format Accounts List with Real-time Balances
    const accountsList = accounts.map(a => {
        const accTx = transactions.filter(t => t.accountId === a.id);
        const income = accTx.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
        const expense = accTx.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
        const balance = (a.balance || 0) + income - expense;
        return `- ${a.name} (Saldo: Rp${balance.toLocaleString('id-ID')}, ID: ${a.id}, Tipe: ${a.type})`;
    }).join('\n');

    const today = new Date();
    const dateString = today.toLocaleDateString('id-ID', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });

    // 2. Base System Prompt
    let systemPrompt = basePrompt(dateString, isoDate) + '\n\n';

    // 3. For transaction, we only need account list
    if (intent.type === 'transaction') {
        return systemPrompt + transactionPrompt(accountsList, isoDate, categories.join(', '));
    }

    // 4. For other intents, we need transaction history
    const txCount = (intent.type === 'analysis' || intent.type === 'advice') ? 50 : 20;
    const recentTx = transactions
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()) // Sort by date desc
        .slice(0, txCount)
        .map(t =>
            `- ${t.date.split('T')[0]}: ${t.type} Rp${t.amount.toLocaleString('id-ID')} (${t.category}) - ${t.description}`
        ).join('\n');

    // 5. Append Specific Task Prompt
    switch (intent.type) {
        case 'query':
            return systemPrompt + queryPrompt(accountsList, recentTx);
        case 'advice':
            return systemPrompt + advicePrompt(accountsList, recentTx);
        case 'planning':
            return systemPrompt + planningPrompt(accountsList, recentTx);
        case 'analysis':
            return systemPrompt + analysisPrompt(accountsList, recentTx);
        default:
            return systemPrompt + queryPrompt(accountsList, recentTx); // Fallback
    }
};
