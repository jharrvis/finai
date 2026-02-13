# 🔄 FITUR TAMBAHAN: REKONSILIASI & DETAIL TRANSAKSI
## Personal Finance Management - Advanced Features

---

## 📋 TABLE OF CONTENTS

1. [Rekonsiliasi Saldo](#1-rekonsiliasi-saldo)
2. [Detail Transaksi Lengkap](#2-detail-transaksi-lengkap)
3. [Jenis-Jenis Transaksi](#3-jenis-jenis-transaksi)
4. [Implementation Guide](#4-implementation-guide)
5. [UI/UX Design](#5-uiux-design)

---

## 1. REKONSILIASI SALDO

### 1.1 Konsep Rekonsiliasi

**Rekonsiliasi** adalah proses penyesuaian saldo yang tercatat di aplikasi dengan saldo real di bank/e-wallet.

**Kenapa Perlu Rekonsiliasi?**
- Ada transaksi yang tidak tercatat (lupa input)
- Ada selisih pembulatan
- Ada biaya admin/bunga yang tidak tercatat
- Cek apakah ada transaksi fraud/tidak sah

### 1.2 Tipe Rekonsiliasi

#### A. Manual Reconciliation
User input saldo real, sistem hitung selisih dan buat adjustment transaction.

```typescript
interface ReconciliationData {
    accountId: string;
    recordedBalance: number;    // Balance di app
    actualBalance: number;      // Balance di bank (real)
    difference: number;         // actualBalance - recordedBalance
    reconciliationDate: string; // Tanggal rekonsiliasi
    notes?: string;             // Catatan user
}
```

#### B. Automatic Reconciliation (Future Enhancement)
Integrate dengan open banking API untuk auto-sync balance.

### 1.3 Reconciliation Logic

```typescript
export class ReconciliationService {
    
    /**
     * Calculate difference between recorded and actual balance
     */
    static calculateReconciliation(
        accountId: string,
        actualBalance: number,
        accounts: any[],
        transactions: any[]
    ): ReconciliationData {
        const account = accounts.find(a => a.id === accountId);
        if (!account) {
            throw new Error("Akun tidak ditemukan");
        }

        // Get recorded balance from FinancialLogicService
        const balanceInfo = FinancialLogicService.calculateAccountBalance(
            account,
            transactions
        );

        const recordedBalance = balanceInfo.currentBalance;
        const difference = actualBalance - recordedBalance;

        return {
            accountId,
            recordedBalance,
            actualBalance,
            difference,
            reconciliationDate: new Date().toISOString().split('T')[0],
            notes: ''
        };
    }

    /**
     * Create adjustment transaction to reconcile balance
     */
    static createReconciliationTransaction(
        reconciliationData: ReconciliationData,
        accounts: any[]
    ): any {
        const account = accounts.find(a => a.id === reconciliationData.accountId);
        const { difference, reconciliationDate, notes } = reconciliationData;

        // If difference is positive → income (there's money we didn't record)
        // If difference is negative → expense (there's spending we didn't record)
        const type = difference >= 0 ? 'income' : 'expense';
        const amount = Math.abs(difference);

        return {
            type,
            amount,
            category: 'Rekonsiliasi',
            description: notes || `Penyesuaian Saldo ${account?.name}`,
            date: reconciliationDate,
            accountId: reconciliationData.accountId,
            isReconciliation: true, // Special flag
            reconciliationData: {
                recordedBalance: reconciliationData.recordedBalance,
                actualBalance: reconciliationData.actualBalance,
                difference: reconciliationData.difference
            },
            timestamp: new Date(reconciliationDate).getTime()
        };
    }

    /**
     * Analyze reconciliation history to detect patterns
     */
    static analyzeReconciliationHistory(
        accountId: string,
        transactions: any[]
    ): {
        totalReconciliations: number;
        averageDifference: number;
        lastReconciliation: Date | null;
        frequentReasons: string[];
    } {
        const reconTx = transactions.filter(
            t => t.accountId === accountId && t.isReconciliation === true
        );

        if (reconTx.length === 0) {
            return {
                totalReconciliations: 0,
                averageDifference: 0,
                lastReconciliation: null,
                frequentReasons: []
            };
        }

        const totalDiff = reconTx.reduce((sum, t) => {
            const diff = t.reconciliationData?.difference || 0;
            return sum + Math.abs(diff);
        }, 0);

        const avgDiff = totalDiff / reconTx.length;

        const sorted = reconTx.sort((a, b) => 
            new Date(b.date).getTime() - new Date(a.date).getTime()
        );
        const lastRecon = new Date(sorted[0].date);

        // Extract reasons from notes
        const reasons = reconTx
            .map(t => t.description)
            .filter(d => d && d !== `Penyesuaian Saldo`);

        return {
            totalReconciliations: reconTx.length,
            averageDifference: Math.round(avgDiff),
            lastReconciliation: lastRecon,
            frequentReasons: [...new Set(reasons)].slice(0, 3)
        };
    }

    /**
     * AI-powered reconciliation suggestions
     */
    static async generateReconciliationSuggestions(
        reconciliationData: ReconciliationData,
        recentTransactions: any[]
    ): Promise<string[]> {
        const { difference, accountId } = reconciliationData;
        const absDiff = Math.abs(difference);

        // Rule-based suggestions for common scenarios
        const suggestions: string[] = [];

        // Small difference (< Rp10,000)
        if (absDiff < 10000) {
            suggestions.push("Kemungkinan selisih kecil karena pembulatan atau biaya admin bank");
            suggestions.push("Cek apakah ada transaksi kecil yang lupa dicatat (parkir, tip, dll)");
        }

        // Medium difference (Rp10,000 - Rp100,000)
        else if (absDiff < 100000) {
            suggestions.push("Periksa transaksi e-commerce yang mungkin belum tercatat");
            suggestions.push("Cek apakah ada biaya subscription/langganan yang auto-debit");
            suggestions.push("Review transaksi non-tunai yang dilakukan keluarga (jika shared account)");
        }

        // Large difference (> Rp100,000)
        else {
            suggestions.push("⚠️ PENTING: Selisih besar terdeteksi! Segera cek mutasi bank");
            suggestions.push("Kemungkinan ada transaksi besar yang tidak tercatat");
            suggestions.push("Periksa apakah ada transaksi fraud/tidak sah di rekening");
            suggestions.push("Download mutasi bank dan cocokkan satu per satu");
        }

        return suggestions;
    }
}
```

### 1.4 Reconciliation Workflow

```
1. User opens Account Detail
2. Click "Rekonsiliasi Saldo"
3. Input actual balance from bank/e-wallet
4. System shows:
   - Recorded Balance: Rp5,234,000
   - Actual Balance: Rp5,150,000 (user input)
   - Difference: -Rp84,000 (missing expense)
5. User adds notes (optional): "Lupa catat makan siang 3x"
6. Click "Rekonsiliasi"
7. System creates adjustment transaction:
   - Type: expense
   - Amount: Rp84,000
   - Category: Rekonsiliasi
   - Description: "Penyesuaian Saldo BCA - Lupa catat makan siang 3x"
8. Balance updated → now matches bank
```

---

## 2. DETAIL TRANSAKSI LENGKAP

### 2.1 Enhanced Transaction Display

**Current Problem:**
Detail transaksi tidak menunjukkan AKUN mana yang dipakai.

**Example:**
```
❌ BEFORE:
"Beli kopi Rp45,000"
→ User tidak tahu: pakai BCA? GoPay? Cash?

✅ AFTER:
"Beli kopi Rp45,000"
Akun: GoPay
Saldo Sebelum: Rp127,500
Saldo Sesudah: Rp82,500
```

### 2.2 Transaction Detail Schema (Enhanced)

```typescript
interface TransactionDetailView {
    // Basic Info
    id: string;
    type: 'income' | 'expense' | 'transfer';
    amount: number;
    category: string;
    description: string;
    date: string;
    timestamp: number;

    // Account Information (NEW)
    account: {
        id: string;
        name: string;           // "BCA Tabungan"
        provider: string;       // "BCA"
        type: string;           // "bank"
        icon: string;           // "🏦"
        color: string;          // "#0060AF"
        balanceBefore: number;  // Balance before this transaction
        balanceAfter: number;   // Balance after this transaction
    };

    // For Transfer (NEW)
    transferInfo?: {
        fromAccount: {
            id: string;
            name: string;
            provider: string;
            balanceBefore: number;
            balanceAfter: number;
        };
        toAccount: {
            id: string;
            name: string;
            provider: string;
            balanceBefore: number;
            balanceAfter: number;
        };
        feeAmount?: number;     // Transfer fee (if any)
    };

    // Receipt Info
    merchant?: string;
    items?: { name: string; qty: number; price: number }[];

    // Metadata
    isReconciliation?: boolean;
    reconciliationData?: ReconciliationData;
    isRecurring?: boolean;
    recurringInfo?: {
        frequency: 'daily' | 'weekly' | 'monthly';
        nextExpected: string;
    };

    // Audit Trail (NEW)
    createdAt: number;
    createdBy?: string;         // User ID who created
    lastModified?: number;
    modificationHistory?: {
        timestamp: number;
        field: string;
        oldValue: any;
        newValue: any;
    }[];
}
```

### 2.3 Display Logic

```typescript
export class TransactionDisplayService {

    /**
     * Build enhanced transaction detail for UI
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
            ...transaction,
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

        // If transfer, add transfer info
        if (transaction.type === 'transfer' || transaction.toAccountId || transaction.fromAccountId) {
            const toAccount = accounts.find(a => a.id === transaction.toAccountId);
            const fromAccount = accounts.find(a => a.id === transaction.fromAccountId);

            if (transaction.type === 'expense' && toAccount) {
                // This is the "from" side of transfer
                const toBalanceInfo = this.calculateBalanceBeforeAfter(
                    transaction,
                    toAccount,
                    allTransactions
                );

                detail.transferInfo = {
                    fromAccount: {
                        id: account.id,
                        name: account.name,
                        provider: account.provider,
                        balanceBefore: balanceInfo.before,
                        balanceAfter: balanceInfo.after
                    },
                    toAccount: {
                        id: toAccount.id,
                        name: toAccount.name,
                        provider: toAccount.provider,
                        balanceBefore: toBalanceInfo.before,
                        balanceAfter: toBalanceInfo.after
                    }
                };
            } else if (transaction.type === 'income' && fromAccount) {
                // This is the "to" side of transfer
                const fromBalanceInfo = this.calculateBalanceBeforeAfter(
                    transaction,
                    fromAccount,
                    allTransactions
                );

                detail.transferInfo = {
                    fromAccount: {
                        id: fromAccount.id,
                        name: fromAccount.name,
                        provider: fromAccount.provider,
                        balanceBefore: fromBalanceInfo.before,
                        balanceAfter: fromBalanceInfo.after
                    },
                    toAccount: {
                        id: account.id,
                        name: account.name,
                        provider: account.provider,
                        balanceBefore: balanceInfo.before,
                        balanceAfter: balanceInfo.after
                    }
                };
            }
        }

        return detail;
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

        // After = before + this transaction
        let balanceAfter = balanceBefore;
        if (transaction.type === 'income') {
            balanceAfter += Number(transaction.amount);
        } else if (transaction.type === 'expense') {
            balanceAfter -= Number(transaction.amount);
        }

        return {
            before: balanceBefore,
            after: balanceAfter
        };
    }

    /**
     * Format transaction for display (human-readable)
     */
    static formatTransactionSummary(detail: TransactionDetailView): string {
        const formatCurrency = (val: number) => `Rp${val.toLocaleString('id-ID')}`;

        // For regular income/expense
        if (!detail.transferInfo) {
            return `${detail.description} ${formatCurrency(detail.amount)} menggunakan ${detail.account.name}`;
        }

        // For transfer
        const { fromAccount, toAccount } = detail.transferInfo;
        return `Transfer ${formatCurrency(detail.amount)} dari ${fromAccount.name} ke ${toAccount.name}`;
    }
}
```

---

## 3. JENIS-JENIS TRANSAKSI

### 3.1 Taxonomy Transaksi Personal Finance

```typescript
export enum TransactionType {
    // === CORE TYPES ===
    INCOME = 'income',           // Pemasukan
    EXPENSE = 'expense',         // Pengeluaran
    TRANSFER = 'transfer',       // Transfer antar akun

    // === INCOME SUBTYPES ===
    SALARY = 'salary',           // Gaji
    BONUS = 'bonus',             // Bonus
    INVESTMENT_RETURN = 'investment_return',  // Return investasi (dividen, bunga)
    BUSINESS_INCOME = 'business_income',      // Pendapatan bisnis/usaha
    FREELANCE = 'freelance',     // Freelance/project
    GIFT = 'gift',               // Hadiah/angpao
    REFUND = 'refund',           // Pengembalian dana
    CASHBACK = 'cashback',       // Cashback/reward
    OTHER_INCOME = 'other_income',

    // === EXPENSE SUBTYPES ===
    FOOD_DINING = 'food_dining',             // Makan & minum
    TRANSPORTATION = 'transportation',        // Transportasi
    SHOPPING = 'shopping',                   // Belanja
    BILLS_UTILITIES = 'bills_utilities',     // Tagihan (listrik, air, internet)
    ENTERTAINMENT = 'entertainment',          // Hiburan
    HEALTH_MEDICAL = 'health_medical',       // Kesehatan
    EDUCATION = 'education',                 // Pendidikan
    INSURANCE = 'insurance',                 // Asuransi
    INVESTMENT = 'investment',               // Investasi (beli saham, crypto, dll)
    LOAN_PAYMENT = 'loan_payment',           // Bayar cicilan/utang
    RENT = 'rent',                           // Sewa (rumah, kos)
    SUBSCRIPTION = 'subscription',           // Langganan (Netflix, Spotify, dll)
    DONATION = 'donation',                   // Donasi/sedekah
    GIFT_GIVEN = 'gift_given',               // Hadiah untuk orang lain
    PERSONAL_CARE = 'personal_care',         // Perawatan pribadi (salon, spa)
    HOUSEHOLD = 'household',                 // Keperluan rumah tangga
    TRAVEL = 'travel',                       // Perjalanan/liburan
    TAX = 'tax',                             // Pajak
    FEE = 'fee',                             // Biaya (admin, transfer)
    OTHER_EXPENSE = 'other_expense',

    // === SPECIAL TYPES ===
    RECONCILIATION = 'reconciliation',       // Penyesuaian saldo
    ADJUSTMENT = 'adjustment',               // Koreksi/adjustment
    INITIAL_BALANCE = 'initial_balance',     // Saldo awal akun
}
```

### 3.2 Transaction Categories Mapping

```typescript
export const TRANSACTION_CATEGORIES = {
    // Income Categories
    income: [
        { value: 'salary', label: 'Gaji', icon: '💼', color: '#10b981' },
        { value: 'bonus', label: 'Bonus', icon: '🎁', color: '#10b981' },
        { value: 'investment_return', label: 'Return Investasi', icon: '📈', color: '#10b981' },
        { value: 'business_income', label: 'Pendapatan Usaha', icon: '🏢', color: '#10b981' },
        { value: 'freelance', label: 'Freelance', icon: '💻', color: '#10b981' },
        { value: 'gift', label: 'Hadiah', icon: '🎉', color: '#10b981' },
        { value: 'refund', label: 'Refund', icon: '↩️', color: '#10b981' },
        { value: 'cashback', label: 'Cashback', icon: '💰', color: '#10b981' },
        { value: 'other_income', label: 'Lainnya', icon: '➕', color: '#10b981' },
    ],

    // Expense Categories
    expense: [
        { value: 'food_dining', label: 'Makan & Minum', icon: '🍽️', color: '#f59e0b' },
        { value: 'transportation', label: 'Transportasi', icon: '🚗', color: '#3b82f6' },
        { value: 'shopping', label: 'Belanja', icon: '🛒', color: '#ec4899' },
        { value: 'bills_utilities', label: 'Tagihan', icon: '📄', color: '#6366f1' },
        { value: 'entertainment', label: 'Hiburan', icon: '🎮', color: '#8b5cf6' },
        { value: 'health_medical', label: 'Kesehatan', icon: '🏥', color: '#ef4444' },
        { value: 'education', label: 'Pendidikan', icon: '📚', color: '#0ea5e9' },
        { value: 'insurance', label: 'Asuransi', icon: '🛡️', color: '#14b8a6' },
        { value: 'investment', label: 'Investasi', icon: '📊', color: '#10b981' },
        { value: 'loan_payment', label: 'Cicilan/Utang', icon: '💳', color: '#ef4444' },
        { value: 'rent', label: 'Sewa', icon: '🏠', color: '#f97316' },
        { value: 'subscription', label: 'Langganan', icon: '🔄', color: '#8b5cf6' },
        { value: 'donation', label: 'Donasi', icon: '🤲', color: '#10b981' },
        { value: 'gift_given', label: 'Hadiah', icon: '🎁', color: '#ec4899' },
        { value: 'personal_care', label: 'Perawatan Diri', icon: '💇', color: '#ec4899' },
        { value: 'household', label: 'Rumah Tangga', icon: '🏡', color: '#f59e0b' },
        { value: 'travel', label: 'Perjalanan', icon: '✈️', color: '#06b6d4' },
        { value: 'tax', label: 'Pajak', icon: '🏛️', color: '#6366f1' },
        { value: 'fee', label: 'Biaya Admin', icon: '💸', color: '#64748b' },
        { value: 'other_expense', label: 'Lainnya', icon: '➖', color: '#64748b' },
    ],

    // Special Categories
    special: [
        { value: 'transfer', label: 'Transfer', icon: '🔄', color: '#6366f1' },
        { value: 'reconciliation', label: 'Rekonsiliasi', icon: '⚖️', color: '#8b5cf6' },
        { value: 'adjustment', label: 'Adjustment', icon: '🔧', color: '#64748b' },
        { value: 'initial_balance', label: 'Saldo Awal', icon: '🏁', color: '#10b981' },
    ]
};
```

### 3.3 Smart Category Suggestion (AI-Enhanced)

```typescript
export class CategorySuggestionService {

    /**
     * Suggest category based on description and merchant
     */
    static suggestCategory(
        description: string,
        merchant?: string,
        amount?: number
    ): { category: string; confidence: number; reasoning: string } {
        const input = `${description} ${merchant || ''}`.toLowerCase();

        // Rule-based matching (fast, no API call)
        const rules = [
            // Food & Dining
            { keywords: ['makan', 'kopi', 'starbucks', 'kfc', 'mcd', 'resto', 'cafe', 'warteg', 'nasi', 'soto', 'bakso'], category: 'food_dining', confidence: 0.95 },
            { keywords: ['gofood', 'grabfood', 'shopeefood'], category: 'food_dining', confidence: 0.9 },

            // Transportation
            { keywords: ['goride', 'grab', 'taxi', 'bensin', 'pertamax', 'parkir', 'tol', 'spbu'], category: 'transportation', confidence: 0.95 },
            { keywords: ['ojol', 'ojek', 'angkot'], category: 'transportation', confidence: 0.9 },

            // Shopping
            { keywords: ['shopee', 'tokopedia', 'lazada', 'bukalapak', 'blibli', 'indomaret', 'alfamart'], category: 'shopping', confidence: 0.9 },

            // Bills & Utilities
            { keywords: ['listrik', 'pln', 'pdam', 'air', 'internet', 'indihome', 'wifi', 'pulsa'], category: 'bills_utilities', confidence: 0.95 },

            // Entertainment
            { keywords: ['netflix', 'spotify', 'disney', 'viu', 'youtube premium', 'bioskop', 'cgv', 'xxi'], category: 'entertainment', confidence: 0.95 },

            // Subscription
            { keywords: ['subscription', 'langganan', 'membership'], category: 'subscription', confidence: 0.9 },

            // Health
            { keywords: ['apotek', 'hospital', 'rumah sakit', 'dokter', 'klinik', 'obat'], category: 'health_medical', confidence: 0.95 },

            // Education
            { keywords: ['kursus', 'buku', 'gramedia', 'udemy', 'coursera', 'sekolah', 'spp'], category: 'education', confidence: 0.9 },

            // Income
            { keywords: ['gaji', 'salary', 'payroll', 'pendapatan'], category: 'salary', confidence: 0.95 },
            { keywords: ['bonus', 'thr'], category: 'bonus', confidence: 0.95 },
            { keywords: ['cashback', 'reward', 'poin'], category: 'cashback', confidence: 0.9 },

            // Transfer
            { keywords: ['transfer', 'tf', 'pindah'], category: 'transfer', confidence: 0.95 },
        ];

        for (const rule of rules) {
            for (const keyword of rule.keywords) {
                if (input.includes(keyword)) {
                    return {
                        category: rule.category,
                        confidence: rule.confidence,
                        reasoning: `Match keyword: "${keyword}"`
                    };
                }
            }
        }

        // Default fallback
        return {
            category: 'other_expense',
            confidence: 0.5,
            reasoning: 'No matching keywords found'
        };
    }

    /**
     * AI-powered category suggestion (for ambiguous cases)
     */
    static async suggestCategoryWithAI(
        description: string,
        merchant?: string,
        amount?: number,
        recentTransactions?: any[]
    ): Promise<{ category: string; confidence: number; reasoning: string }> {
        // First try rule-based
        const ruleBased = this.suggestCategory(description, merchant, amount);
        if (ruleBased.confidence >= 0.9) {
            return ruleBased; // High confidence, no need AI
        }

        // Use AI for ambiguous cases
        const context = recentTransactions
            ?.slice(0, 10)
            .map(t => `${t.description} → ${t.category}`)
            .join('\n');

        const prompt = `Kategorikan transaksi ini:
Deskripsi: "${description}"
Merchant: "${merchant || 'N/A'}"
Amount: Rp${amount?.toLocaleString('id-ID') || 'N/A'}

Referensi transaksi user sebelumnya:
${context}

Kategori available:
${Object.keys(TRANSACTION_CATEGORIES.expense).join(', ')}

Output JSON:
{
  "category": "kategori yang paling cocok",
  "confidence": 0.0-1.0,
  "reasoning": "penjelasan singkat"
}`;

        try {
            const response = await AIService.processSimple(prompt);
            const jsonMatch = response.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }
        } catch (error) {
            console.error('AI category suggestion failed:', error);
        }

        return ruleBased; // Fallback to rule-based
    }
}
```

---

## 4. IMPLEMENTATION GUIDE

### 4.1 File Structure

```
src/
├── services/
│   ├── financial/
│   │   ├── ReconciliationService.ts          # NEW
│   │   ├── TransactionDisplayService.ts      # NEW
│   │   ├── CategorySuggestionService.ts      # NEW
│   │   └── FinancialLogicService.ts          # Existing
│   └── ai/
│       └── AIService.ts
├── types/
│   ├── reconciliation.types.ts               # NEW
│   └── transaction.types.ts                  # UPDATED
├── components/
│   ├── ReconciliationModal.tsx               # NEW
│   ├── TransactionDetailModal.tsx            # UPDATED
│   └── CategoryPicker.tsx                    # NEW
└── App.tsx                                    # UPDATED
```

### 4.2 Step-by-Step Implementation

#### Step 1: Create Types

```typescript
// src/types/reconciliation.types.ts
export interface ReconciliationData {
    accountId: string;
    recordedBalance: number;
    actualBalance: number;
    difference: number;
    reconciliationDate: string;
    notes?: string;
}

export interface ReconciliationHistory {
    totalReconciliations: number;
    averageDifference: number;
    lastReconciliation: Date | null;
    frequentReasons: string[];
}
```

```typescript
// src/types/transaction.types.ts (UPDATED)
export interface Transaction {
    id: string;
    type: 'income' | 'expense' | 'transfer';
    amount: number;
    category: string;
    description: string;
    date: string;
    timestamp: number;
    accountId: string;
    
    // Transfer fields
    toAccountId?: string;
    fromAccountId?: string;
    
    // Reconciliation fields (NEW)
    isReconciliation?: boolean;
    reconciliationData?: ReconciliationData;
    
    // Category metadata (NEW)
    categoryConfidence?: number;
    categorySuggestion?: string;
    
    // Recurring (NEW)
    isRecurring?: boolean;
    recurringFrequency?: 'daily' | 'weekly' | 'monthly';
    
    // Audit trail (NEW)
    createdAt?: number;
    lastModified?: number;
}
```

#### Step 2: Add Reconciliation to Account Detail

```typescript
// In App.tsx, add reconciliation state and modal
const [showReconciliationModal, setShowReconciliationModal] = useState(false);
const [reconAccount, setReconAccount] = useState<any>(null);

// Function to handle reconciliation
const handleReconciliation = async (actualBalance: number, notes: string) => {
    if (!reconAccount || !user) return;

    try {
        // Calculate reconciliation
        const reconData = ReconciliationService.calculateReconciliation(
            reconAccount.id,
            actualBalance,
            accounts,
            transactions
        );

        reconData.notes = notes;

        // Create adjustment transaction
        const adjustmentTx = ReconciliationService.createReconciliationTransaction(
            reconData,
            accounts
        );

        // Save to Firestore
        await addTransaction(adjustmentTx);

        showNotification(
            `Rekonsiliasi berhasil! Selisih Rp${Math.abs(reconData.difference).toLocaleString('id-ID')} telah disesuaikan.`,
            'success'
        );

        setShowReconciliationModal(false);
        setReconAccount(null);
    } catch (error: any) {
        console.error('Reconciliation error:', error);
        showNotification(error.message || 'Gagal melakukan rekonsiliasi', 'error');
    }
};
```

#### Step 3: Update Transaction Detail Modal

```typescript
// In TransactionDetailModal
const transactionDetail = TransactionDisplayService.buildTransactionDetail(
    selectedTransaction,
    accounts,
    transactions
);

// Display account info
<div className="bg-slate-50 p-4 rounded-xl mb-4">
    <p className="text-xs font-bold text-slate-500 mb-2">DETAIL AKUN</p>
    <div className="flex items-center gap-3 mb-3">
        <div 
            className="w-10 h-10 rounded-xl flex items-center justify-center text-lg"
            style={{ backgroundColor: transactionDetail.account.color + '20' }}
        >
            {transactionDetail.account.icon}
        </div>
        <div>
            <p className="font-bold">{transactionDetail.account.name}</p>
            <p className="text-xs text-slate-500">{transactionDetail.account.provider}</p>
        </div>
    </div>
    
    <div className="space-y-1 text-sm">
        <div className="flex justify-between">
            <span className="text-slate-500">Saldo Sebelum:</span>
            <span className="font-bold">
                Rp{transactionDetail.account.balanceBefore.toLocaleString('id-ID')}
            </span>
        </div>
        <div className="flex justify-between">
            <span className="text-slate-500">Saldo Sesudah:</span>
            <span className="font-bold">
                Rp{transactionDetail.account.balanceAfter.toLocaleString('id-ID')}
            </span>
        </div>
    </div>
</div>

{/* Transfer Info */}
{transactionDetail.transferInfo && (
    <div className="bg-indigo-50 p-4 rounded-xl mb-4">
        <p className="text-xs font-bold text-indigo-600 mb-3">DETAIL TRANSFER</p>
        
        {/* From Account */}
        <div className="mb-3">
            <p className="text-xs text-slate-500 mb-1">Dari:</p>
            <div className="flex items-center gap-2">
                <span className="font-bold">{transactionDetail.transferInfo.fromAccount.name}</span>
            </div>
            <div className="text-xs space-y-0.5 mt-1">
                <div className="flex justify-between">
                    <span className="text-slate-500">Saldo Sebelum:</span>
                    <span>Rp{transactionDetail.transferInfo.fromAccount.balanceBefore.toLocaleString('id-ID')}</span>
                </div>
                <div className="flex justify-between">
                    <span className="text-slate-500">Saldo Sesudah:</span>
                    <span>Rp{transactionDetail.transferInfo.fromAccount.balanceAfter.toLocaleString('id-ID')}</span>
                </div>
            </div>
        </div>

        {/* Arrow */}
        <div className="text-center text-indigo-400 my-2">⬇️</div>

        {/* To Account */}
        <div>
            <p className="text-xs text-slate-500 mb-1">Ke:</p>
            <div className="flex items-center gap-2">
                <span className="font-bold">{transactionDetail.transferInfo.toAccount.name}</span>
            </div>
            <div className="text-xs space-y-0.5 mt-1">
                <div className="flex justify-between">
                    <span className="text-slate-500">Saldo Sebelum:</span>
                    <span>Rp{transactionDetail.transferInfo.toAccount.balanceBefore.toLocaleString('id-ID')}</span>
                </div>
                <div className="flex justify-between">
                    <span className="text-slate-500">Saldo Sesudah:</span>
                    <span>Rp{transactionDetail.transferInfo.toAccount.balanceAfter.toLocaleString('id-ID')}</span>
                </div>
            </div>
        </div>
    </div>
)}
```

---

## 5. UI/UX DESIGN

### 5.1 Reconciliation Modal

```typescript
<div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
    <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-[32px] p-6 shadow-2xl">
        <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center text-2xl">
                ⚖️
            </div>
            <div>
                <h3 className="font-bold text-lg">Rekonsiliasi Saldo</h3>
                <p className="text-sm text-slate-500">{reconAccount?.name}</p>
            </div>
        </div>

        {/* Current Balance */}
        <div className="bg-slate-50 p-4 rounded-xl mb-4">
            <p className="text-xs text-slate-500 mb-1">Saldo Tercatat di Aplikasi</p>
            <p className="text-2xl font-black">
                Rp{FinancialLogicService.calculateAccountBalance(reconAccount, transactions).currentBalance.toLocaleString('id-ID')}
            </p>
        </div>

        {/* Input Actual Balance */}
        <div className="mb-4">
            <label className="text-sm font-bold text-slate-600 mb-2 block">
                Saldo Real di Bank/E-wallet
            </label>
            <input
                type="number"
                value={actualBalance}
                onChange={(e) => setActualBalance(Number(e.target.value))}
                className="w-full bg-white border-2 border-slate-200 rounded-xl px-4 py-3 text-lg font-bold focus:border-purple-500 outline-none"
                placeholder="0"
            />
        </div>

        {/* Difference Display */}
        {actualBalance > 0 && (
            <div className={`p-4 rounded-xl mb-4 ${
                Math.abs(actualBalance - recordedBalance) < 10000 
                    ? 'bg-green-50 border border-green-200' 
                    : 'bg-orange-50 border border-orange-200'
            }`}>
                <p className="text-xs font-bold mb-1">Selisih</p>
                <p className="text-xl font-black">
                    {actualBalance > recordedBalance ? '+' : ''}
                    Rp{Math.abs(actualBalance - recordedBalance).toLocaleString('id-ID')}
                </p>
                <p className="text-xs text-slate-600 mt-1">
                    {actualBalance > recordedBalance 
                        ? '💡 Ada pemasukan yang belum tercatat' 
                        : '💡 Ada pengeluaran yang belum tercatat'}
                </p>
            </div>
        )}

        {/* Notes */}
        <div className="mb-4">
            <label className="text-sm font-bold text-slate-600 mb-2 block">
                Catatan (Opsional)
            </label>
            <textarea
                value={reconNotes}
                onChange={(e) => setReconNotes(e.target.value)}
                className="w-full bg-white border-2 border-slate-200 rounded-xl px-4 py-3 text-sm focus:border-purple-500 outline-none resize-none"
                placeholder="Contoh: Lupa catat makan siang 3x"
                rows={3}
            />
        </div>

        {/* Actions */}
        <div className="flex gap-3">
            <button
                onClick={() => { setShowReconciliationModal(false); setReconAccount(null); }}
                className="flex-1 py-3 rounded-xl bg-slate-100 font-bold"
            >
                Batal
            </button>
            <button
                onClick={() => handleReconciliation(actualBalance, reconNotes)}
                disabled={actualBalance === 0}
                className="flex-1 py-3 rounded-xl bg-purple-600 text-white font-bold disabled:opacity-50"
            >
                Rekonsiliasi
            </button>
        </div>
    </div>
</div>
```

### 5.2 Enhanced Transaction List Item

```typescript
<div className="bg-white p-4 rounded-2xl flex items-center gap-4">
    {/* Category Icon */}
    <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl`}
         style={{ backgroundColor: categoryColor + '20' }}>
        {categoryIcon}
    </div>

    {/* Info */}
    <div className="flex-1">
        <p className="font-bold text-sm">{tx.description}</p>
        <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
            <span>{tx.category}</span>
            <span>•</span>
            <div className="flex items-center gap-1">
                <span>{account?.icon}</span>
                <span>{account?.name}</span>
            </div>
        </div>
    </div>

    {/* Amount */}
    <div className="text-right">
        <p className={`font-black ${tx.type === 'income' ? 'text-green-500' : 'text-rose-500'}`}>
            {tx.type === 'income' ? '+' : '-'} {formatCurrency(tx.amount)}
        </p>
    </div>
</div>
```

---

## 6. TESTING CHECKLIST

### Reconciliation Tests

- [ ] Test 1: Reconcile with positive difference (missing income)
- [ ] Test 2: Reconcile with negative difference (missing expense)
- [ ] Test 3: Reconcile with zero difference (perfect match)
- [ ] Test 4: Multiple reconciliations on same account
- [ ] Test 5: Reconciliation history analysis

### Transaction Detail Tests

- [ ] Test 1: Display regular expense with account info
- [ ] Test 2: Display transfer with both account balances
- [ ] Test 3: Display reconciliation transaction
- [ ] Test 4: Display transaction with receipt items
- [ ] Test 5: Balance before/after calculation accuracy

### Category Suggestion Tests

- [ ] Test 1: Rule-based matching (high confidence)
- [ ] Test 2: AI-powered suggestion (ambiguous cases)
- [ ] Test 3: Learning from user's historical data
- [ ] Test 4: Custom category support

---

## 7. FUTURE ENHANCEMENTS

1. **Automatic Reconciliation via Open Banking**
   - Auto-sync with bank APIs
   - Real-time balance updates

2. **Split Transactions**
   - One transaction → multiple categories
   - Example: Indomaret shopping (50% groceries, 50% snacks)

3. **Scheduled Transactions**
   - Auto-create recurring bills
   - Reminder before due date

4. **Multi-Currency Support**
   - Foreign transactions
   - Exchange rate tracking

5. **Shared Expenses**
   - Split bill with friends
   - Track who owes whom

---

**Implementation Priority:**
1. ⚠️ HIGH: Reconciliation (prevent data drift)
2. ⚠️ HIGH: Enhanced transaction detail (better UX)
3. 🟡 MEDIUM: Smart categorization (improve accuracy)
4. 🟢 LOW: Advanced features (split, scheduled, etc.)

