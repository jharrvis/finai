import { FinancialCore } from '../financial/FinancialCore';
import { transactionPromptV2 } from '../../config/prompts/transaction-prompts-v2';
import { Intent } from '../../types/ai.types';
import { CATEGORIES } from '../../config/financial.config';
import { basePrompt } from '../../config/prompts/base.prompts';
import { queryPrompt } from '../../config/prompts/query.prompts';
import { advicePrompt } from '../../config/prompts/advice.prompts';
import { planningPrompt } from '../../config/prompts/planning.prompts';
import { analysisPrompt } from '../../config/prompts/analysis.prompts';

export const buildContext = (
    intent: Intent,
    accounts: any[],
    transactions: any[],
    isoDate: string,
    categories: string[] = CATEGORIES // Default to static config if not provided
): string => {
    // 1. Calculate REAL-TIME Balances using FinancialCore
    const balances = FinancialCore.calculateAllBalances(accounts, transactions);

    // Format for Prompt (simple list)
    const accountsList = accounts.map(a => {
        const bal = balances.find(b => b.accountId === a.id);
        const balanceVal = bal ? bal.currentBalance : (a.balance || 0);
        return `- ${a.name} (Saldo: Rp${balanceVal.toLocaleString('id-ID')}, ID: ${a.id}, Tipe: ${a.type})`;
    }).join('\n');

    // Format for Transaction Prompt (detailed)
    const accountBalances = balances.map(b =>
        `- ${b.accountName}: Rp${b.currentBalance.toLocaleString('id-ID')} (ID: ${b.accountId})`
    ).join('\n');

    const today = new Date();
    const dateString = today.toLocaleDateString('id-ID', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });

    // 2. Base System Prompt
    let systemPrompt = basePrompt(dateString, isoDate) + '\n\n';

    // 3. For transaction, use NEW PROMPT with financial concepts
    if (intent.type === 'transaction') {
        return systemPrompt + transactionPromptV2(
            accountsList,
            isoDate,
            categories.join(', '),
            accountBalances // NEW: Pass real-time balances
        );
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
