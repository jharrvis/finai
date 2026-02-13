# 🔧 INTEGRATION GUIDE
## Financial Logic Service ke Existing Codebase

---

## 📦 File yang Perlu Diupdate

### 1. **src/services/ai/PromptBuilder.ts**

**Update:** Import dan gunakan `transactionPromptV2` dengan balance info.

```typescript
import { transactionPromptV2 } from '../../config/prompts/transaction.prompts.v2';
import { FinancialLogicService } from '../financial/FinancialLogicService';

export const buildContext = (
    intent: Intent,
    accounts: any[],
    transactions: any[],
    isoDate: string,
    categories: string[] = CATEGORIES
): string => {
    // 1. Calculate REAL-TIME Balances
    const balances = FinancialLogicService.calculateAllBalances(accounts, transactions);
    const accountBalances = balances.map(b => 
        `- ${b.accountName}: Rp${b.currentBalance.toLocaleString('id-ID')} (ID: ${b.accountId})`
    ).join('\n');

    const accountsList = accounts.map(a => {
        const balance = balances.find(b => b.accountId === a.id);
        return `- ${a.name} (Saldo: Rp${balance?.currentBalance.toLocaleString('id-ID')}, ID: ${a.id}, Tipe: ${a.type})`;
    }).join('\n');

    const today = new Date();
    const dateString = today.toLocaleDateString('id-ID', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });

    let systemPrompt = basePrompt(dateString, isoDate) + '\n\n';

    // 2. For transaction, use NEW PROMPT with financial concepts
    if (intent.type === 'transaction') {
        return systemPrompt + transactionPromptV2(
            accountsList, 
            isoDate, 
            categories.join(', '),
            accountBalances // NEW: Pass real-time balances
        );
    }

    // ... rest of code remains same
};
```

---

### 2. **src/services/ai/ResponseHandler.ts**

**Update:** Add transfer validation before returning.

```typescript
import { FinancialLogicService } from '../financial/FinancialLogicService';

export const handleAIResponse = (
    responseText: string,
    intent: Intent,
    accounts: any[], // NEW: Pass accounts for validation
    transactions: any[] // NEW: Pass transactions for balance check
): AIResponse => {
    if (intent.type !== 'transaction') {
        return {
            success: true,
            data: responseText,
            message: responseText,
            intent
        };
    }

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

        // Basic validation
        if (!txData.type || !txData.amount) {
            throw new Error("Data transaksi tidak lengkap (tipe atau jumlah hilang)");
        }

        // NEW: TRANSFER VALIDATION
        if (txData.type === 'transfer') {
            if (!txData.accountId || !txData.toAccountId) {
                throw new Error("Transfer harus punya akun asal dan tujuan");
            }

            // Validate transfer using FinancialLogicService
            const validation = FinancialLogicService.validateTransfer(
                txData.accountId,
                txData.toAccountId,
                txData.amount,
                accounts,
                transactions
            );

            if (!validation.isValid) {
                throw new Error(validation.error || "Transfer tidak valid");
            }

            // Add warning if exists
            if (validation.warning) {
                return {
                    success: true,
                    data: txData,
                    intent,
                    warning: validation.warning // NEW: Pass warning to UI
                };
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
```

Update `AIResponse` type:

```typescript
// In src/types/ai.types.ts
export interface AIResponse {
    success: boolean;
    data?: any;
    message?: string;
    error?: string;
    warning?: string; // NEW
    intent?: Intent;
}
```

---

### 3. **src/services/ai/AIService.ts**

**Update:** Pass accounts & transactions to ResponseHandler.

```typescript
export class AIService {
    static async process(
        text: string,
        base64Image: string | null,
        accounts: any[],
        transactions: any[],
        categories: string[] = []
    ): Promise<AIResponse> {
        const isoDate = new Date().toISOString().split('T')[0];

        try {
            const intent = await classifyIntent(text, !!base64Image);
            console.log('[AIService] Intent:', intent);

            let model = AI_CONFIG.models.fast;
            if (base64Image) {
                model = AI_CONFIG.models.vision;
            } else if (intent.type === 'advice' || intent.type === 'analysis') {
                model = AI_CONFIG.models.smart;
            }

            const systemPrompt = buildContext(intent, accounts, transactions, isoDate, categories);

            let userContent: any = text;
            if (base64Image) {
                userContent = [
                    { "type": "text", "text": text || "Tolong catat transaksi dari gambar ini." },
                    { "type": "image_url", "image_url": { "url": `data:image/jpeg;base64,${base64Image}` } }
                ];
            }

            const responseText = await AIService.callOpenRouter(
                model,
                systemPrompt,
                userContent,
                intent.type === 'transaction'
            );

            // UPDATED: Pass accounts & transactions for validation
            return handleAIResponse(responseText, intent, accounts, transactions);

        } catch (error: any) {
            console.error('[AIService] Error:', error);
            return {
                success: false,
                error: error.message || "Terjadi kesalahan pada sistem AI.",
            };
        }
    }
}
```

---

### 4. **src/App.tsx**

**Update:** Handle transfer with FinancialLogicService & show warnings.

```typescript
import { FinancialLogicService } from './services/financial/FinancialLogicService';

// Inside the handleAIProcess function:
const handleAIProcess = async (text: string, imageBase64: string | null) => {
    setIsProcessing(true);
    try {
        const response = await AIService.process(
            text,
            imageBase64,
            accounts,
            transactions,
            categories
        );

        if (!response.success) {
            throw new Error(response.error);
        }

        // Handle Transaction Response
        if (response.intent?.type === 'transaction' && response.data) {
            const txData = response.data;

            // NEW: Show warning if exists
            if (response.warning) {
                showNotification(response.warning, 'info');
            }

            // Handle Transfer with FinancialLogicService
            if (txData.type === 'transfer') {
                const fromAcc = accounts.find(a => a.id === txData.accountId);
                const toAcc = accounts.find(a => a.id === txData.toAccountId);

                if (fromAcc && toAcc) {
                    // Use FinancialLogicService to create double-entry transactions
                    const [expenseTx, incomeTx] = FinancialLogicService.createTransferTransactions(
                        txData.accountId,
                        txData.toAccountId,
                        txData.amount,
                        txData.description,
                        txData.date,
                        accounts
                    );

                    // Save both transactions
                    await addTransaction(expenseTx);
                    await addTransaction(incomeTx);

                    const msg = `✅ Transfer Rp${txData.amount.toLocaleString('id-ID')} dari ${fromAcc.name} ke ${toAcc.name} berhasil!`;
                    setMessages((prev: any) => [...prev, { role: 'ai', content: msg, id: Date.now() }]);
                    if (aiMode === 'voice') speak(msg);
                } else {
                    throw new Error("Akun transfer tidak valid");
                }
            }
            // Handle Income/Expense
            else {
                await addTransaction(txData);
                const msg = `✅ ${txData.description} Rp${txData.amount.toLocaleString('id-ID')} berhasil dicatat.`;
                setMessages((prev: any) => [...prev, { role: 'ai', content: msg, id: Date.now() }]);
                if (aiMode === 'voice') speak(msg);
            }
        }
        // Handle Other Intents
        else {
            const aiText = response.data || response.message;
            setMessages((prev: any) => [...prev, { role: 'ai', content: aiText, id: Date.now() }]);
            if (aiMode === 'voice') speak(aiText);
        }

    } catch (error: any) {
        console.error('AI Processing Error:', error);
        const errMsg = error.message || "Maaf, terjadi kesalahan saat memproses permintaan Anda.";
        setMessages((prev: any) => [...prev, { role: 'ai', content: errMsg, id: Date.now() }]);
        if (aiMode === 'voice') speak(errMsg);
    } finally {
        setIsProcessing(false);
    }
};
```

---

### 5. **NEW TAB: Financial Insights (Optional but Recommended)**

Add a new tab in Dashboard to show financial health report.

```typescript
// In App.tsx, add this state:
const [financialReport, setFinancialReport] = useState<string | null>(null);
const [isGeneratingReport, setIsGeneratingReport] = useState(false);

// Add this button in Dashboard or Reports tab:
<button
    onClick={async () => {
        setIsGeneratingReport(true);
        try {
            const report = await FinancialLogicService.generateFinancialHealthReport(
                accounts,
                transactions,
                budgets
            );
            setFinancialReport(report);
        } catch (e) {
            showNotification("Gagal generate laporan keuangan", 'error');
        } finally {
            setIsGeneratingReport(false);
        }
    }}
    className="..."
    disabled={isGeneratingReport}
>
    {isGeneratingReport ? 'Generating...' : '📊 Laporan Kesehatan Keuangan'}
</button>

{financialReport && (
    <div className="bg-white p-6 rounded-xl shadow">
        <FormattedMessage content={financialReport} isUser={false} />
    </div>
)}
```

---

### 6. **NEW: Recurring Transactions Widget**

Add to Dashboard to show detected subscriptions/bills.

```typescript
// In Dashboard tab:
{(() => {
    const recurring = FinancialLogicService.detectRecurringTransactions(transactions, 2);
    
    if (recurring.length === 0) return null;

    return (
        <div className="bg-white dark:bg-slate-900 p-5 rounded-[24px] border border-slate-100 dark:border-slate-800 shadow-sm">
            <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                🔁 Tagihan Rutin Terdeteksi ({recurring.length})
            </h3>
            <div className="space-y-3">
                {recurring.slice(0, 5).map((r, idx) => (
                    <div key={idx} className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-800 rounded-xl">
                        <div>
                            <p className="font-bold text-sm">{r.merchant}</p>
                            <p className="text-xs text-slate-500">{r.category} • {r.frequency}</p>
                        </div>
                        <div className="text-right">
                            <p className="font-bold text-sm">Rp{r.averageAmount.toLocaleString('id-ID')}</p>
                            <p className="text-[10px] text-slate-400">Next: {r.nextExpected.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
})()}
```

---

### 7. **NEW: Anomaly Detector Widget**

Warn user about unusual spending.

```typescript
{(() => {
    const anomalies = FinancialLogicService.detectAnomalies(transactions, 60);
    
    if (anomalies.length === 0) return null;

    const highSeverity = anomalies.filter(a => a.severity === 'high');

    return (
        <div className="bg-rose-50 dark:bg-rose-900/20 p-5 rounded-[24px] border border-rose-200 dark:border-rose-800">
            <h3 className="font-bold text-rose-700 dark:text-rose-400 mb-3 flex items-center gap-2">
                🚨 Pengeluaran Tidak Biasa ({anomalies.length})
            </h3>
            <div className="space-y-2">
                {(highSeverity.length > 0 ? highSeverity : anomalies).slice(0, 3).map((a, idx) => (
                    <div key={idx} className="text-sm">
                        <p className="font-bold text-rose-800 dark:text-rose-300">{a.description}</p>
                        <p className="text-xs text-rose-600 dark:text-rose-400">{a.anomalyReason}</p>
                    </div>
                ))}
            </div>
        </div>
    );
})()}
```

---

## 🧪 Testing Checklist

### Test Case 1: Transfer dengan Saldo Cukup
```
Input: "Transfer 100rb dari BCA ke GoPay"
Expected:
- ✅ AI validates balance
- ✅ Creates 2 transactions (expense BCA, income GoPay)
- ✅ Both balances updated correctly
```

### Test Case 2: Transfer dengan Saldo Tidak Cukup
```
Input: "Transfer 10jt dari Tunai ke BCA" (Tunai saldo hanya 500rb)
Expected:
- ❌ AI returns error: "Saldo Tunai tidak cukup. Saldo: Rp500,000, Dibutuhkan: Rp10,000,000"
- ❌ No transaction created
```

### Test Case 3: Recurring Detection
```
Setup: Add 3 monthly Netflix transactions (Rp54,000 each)
Expected:
- ✅ Widget shows "Netflix: Rp54,000/monthly"
- ✅ Next expected date calculated correctly
```

### Test Case 4: Anomaly Detection
```
Setup: User normally spends Rp100k-200k on "Makan", suddenly Rp2jt
Expected:
- ✅ Anomaly widget shows warning
- ✅ Severity = "high"
- ✅ Reason explains it's 10x higher than average
```

### Test Case 5: Financial Health Report
```
Action: Click "Laporan Kesehatan Keuangan"
Expected:
- ✅ Shows net worth
- ✅ Shows saving rate
- ✅ AI gives 3 actionable recommendations
- ✅ Warns if saving rate < 10%
```

---

## 🚀 Deployment Steps

1. **Copy New Files:**
   ```bash
   cp FinancialLogicService.ts src/services/financial/
   cp transaction.prompts.v2.ts src/config/prompts/
   ```

2. **Update Existing Files** (as per guide above):
   - PromptBuilder.ts
   - ResponseHandler.ts
   - AIService.ts
   - App.tsx

3. **Add Widgets to Dashboard:**
   - Recurring Transactions Widget
   - Anomaly Detector Widget
   - Financial Health Report Button

4. **Test All Scenarios** (see Testing Checklist)

5. **Deploy!**

---

## 📊 Expected Improvements

After integration, you should see:

✅ **Transfer validation** - No more overdraft errors  
✅ **Real-time balance awareness** - AI knows exact saldo  
✅ **Recurring bill detection** - Never miss a subscription  
✅ **Anomaly alerts** - Catch unusual spending early  
✅ **Better categorization** - AI understands merchant context  
✅ **Comprehensive financial report** - AI-powered insights  
✅ **Savings goal planner** - Realistic goal feasibility check  

---

## 🎯 Next Steps (Future Enhancements)

Once core financial logic is stable, consider:

1. **Auto-categorization ML Model** - Train on user's historical data
2. **Budget Recommendations** - AI suggests optimal budget per category
3. **Multi-currency Support** - For international transactions
4. **Investment Tracking** - Link to stocks/crypto portfolios
5. **Tax Deduction Finder** - Identify claimable expenses
6. **Bill Negotiation Advisor** - Suggest cheaper alternatives

---

**Good luck with integration! 🚀**
