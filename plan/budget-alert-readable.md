# 🎯 BUDGET ALERT IMPLEMENTATION
## Complete TypeScript/React Code

---

## 📦 Overview

Implementasi lengkap fitur **Budget Alert** dengan:
- ✅ AI-powered suggestions (via OpenRouter)
- ✅ Real-time budget monitoring
- ✅ Projection end-of-month spending
- ✅ Status-based alerts (safe/warning/critical/over)
- ✅ Full TypeScript support

---

## 🏗️ Architecture

```
BudgetAlertService (Static Class)
├── calculateSpending()      → Hitung total spending per kategori
├── getPeriodStartDate()     → Get start date (daily/weekly/monthly)
├── getPeriodEndDate()       → Get end date
├── getDaysRemaining()       → Hitung sisa hari
├── getAlertStatus()         → Determine status berdasarkan %
├── generateSuggestions()    → AI-powered tips (OpenRouter API)
└── analyzeBudgets()         → Main analyzer function

BudgetAlertWidget (React Component)
├── useState: analysis, loading
├── useEffect: auto-analyze on mount
└── Render: alerts dengan color-coded UI
```

---

## 📋 Type Definitions

```typescript
interface Budget {
    id: string;
    category: string;
    amount: number;
    period: 'daily' | 'weekly' | 'monthly';
    userId: string;
}

interface BudgetAlert {
    category: string;
    spent: number;
    budget: number;
    percentage: number;
    status: 'safe' | 'warning' | 'critical' | 'over';
    message: string;
    suggestions: string[];
}

interface BudgetAnalysis {
    alerts: BudgetAlert[];
    overall_status: 'safe' | 'warning' | 'critical';
    total_budget: number;
    total_spent: number;
    days_remaining: number;
    projection: {
        estimated_end_of_month: number;
        will_exceed: boolean;
        excess_amount?: number;
    };
}
```

---

## 🔧 Core Functions

### 1. Calculate Spending
```typescript
static calculateSpending(
    transactions: any[],
    category: string,
    startDate: Date,
    endDate: Date
): number {
    return transactions
        .filter(tx => 
            tx.type === 'expense' &&
            tx.category === category &&
            new Date(tx.date) >= startDate &&
            new Date(tx.date) <= endDate
        )
        .reduce((sum, tx) => sum + tx.amount, 0);
}
```

**Function:** Filter transaksi berdasarkan kategori & periode, lalu sum amounts.

---

### 2. Get Period Dates
```typescript
static getPeriodStartDate(period: 'daily' | 'weekly' | 'monthly'): Date {
    const now = new Date();
    
    switch (period) {
        case 'daily':
            return new Date(now.getFullYear(), now.getMonth(), now.getDate());
        case 'weekly':
            const dayOfWeek = now.getDay();
            const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
            return new Date(now.getTime() - diff * 24 * 60 * 60 * 1000);
        case 'monthly':
            return new Date(now.getFullYear(), now.getMonth(), 1);
    }
}
```

**Function:** Calculate start date untuk daily/weekly/monthly period.  
**Note:** Weekly start = Monday (bukan Sunday).

---

### 3. Get Alert Status
```typescript
static getAlertStatus(percentage: number): 'safe' | 'warning' | 'critical' | 'over' {
    if (percentage >= 100) return 'over';
    if (percentage >= 90) return 'critical';
    if (percentage >= 75) return 'warning';
    return 'safe';
}
```

**Logic:**
- 0-74%: safe ✅
- 75-89%: warning ⚠️
- 90-99%: critical 🚨
- 100%+: over 💥

---

### 4. AI-Powered Suggestions ⭐

```typescript
static async generateSuggestions(
    category: string,
    spent: number,
    budget: number,
    daysRemaining: number,
    historicalData: any[]
): Promise<string[]>
```

**How it works:**

1. **Build AI Prompt:**
```
User sudah spending Rp1,650,000 untuk kategori Makanan,
dari budget Rp1,500,000 (110%).

Sisa waktu: 10 hari.
Rata-rata harian: Rp165,000

TUGAS: Berikan 2-3 saran praktis...
```

2. **Call OpenRouter API:**
```typescript
const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
        "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json"
    },
    body: JSON.stringify({
        "model": "google/gemini-2.0-flash-thinking-exp-01-21",
        "messages": [{ "role": "user", "content": prompt }],
        "temperature": 0.7
    })
});
```

3. **Parse Response:**
   - Try to parse JSON array
   - Fallback: parse text lines
   - Fallback 2: use hardcoded suggestions per category

4. **Return 2-3 actionable tips**

**Example Output:**
```javascript
[
  "Masak di rumah 3-4x seminggu untuk hemat Rp200-300rb",
  "Bawa bekal ke kantor, hindari makan di luar setiap hari",
  "Manfaatkan promo delivery app hanya untuk weekend"
]
```

---

### 5. Main Analyzer Function

```typescript
static async analyzeBudgets(
    budgets: Budget[],
    transactions: any[]
): Promise<BudgetAnalysis>
```

**Process:**

1. **Loop setiap budget category:**
   - Calculate spent amount
   - Calculate percentage
   - Determine status
   - Generate message
   - Call AI for suggestions (if not safe)

2. **Calculate overall status:**
   - Sum total budget & spent
   - Determine overall status

3. **Project end-of-month:**
   - Calculate daily average
   - Extrapolate to end of month
   - Check if will exceed budget

4. **Return complete analysis**

---

## 🎨 React Component

### Usage Example

```tsx
import { BudgetAlertWidget } from './BudgetAlertFeature';

function MyFinanceApp() {
    const budgets = [
        { 
            id: '1', 
            category: 'Makanan', 
            amount: 1500000, 
            period: 'monthly', 
            userId: 'user123' 
        },
        { 
            id: '2', 
            category: 'Transport', 
            amount: 500000, 
            period: 'monthly', 
            userId: 'user123' 
        }
    ];

    return (
        <BudgetAlertWidget 
            budgets={budgets}
            transactions={transactions}
            onViewDetails={(category) => {
                console.log('View details for:', category);
                // Navigate to filtered transaction list
            }}
        />
    );
}
```

### Component Features

**Auto-analysis on mount:**
```typescript
useEffect(() => {
    const analyzeData = async () => {
        setLoading(true);
        const result = await BudgetAlertService.analyzeBudgets(budgets, transactions);
        setAnalysis(result);
        setLoading(false);
    };
    analyzeData();
}, [budgets, transactions]);
```

**Color-coded status:**
```typescript
const statusColors = {
    safe: 'bg-green-100 text-green-800',
    warning: 'bg-yellow-100 text-yellow-800',
    critical: 'bg-orange-100 text-orange-800',
    over: 'bg-red-100 text-red-800'
};
```

**Progressive UI:**
- Loading state
- Overall summary card
- Individual category alerts (only warnings)
- AI suggestions expandable
- "View details" button per category

---

## 💡 Key Features

### 1. Smart Filtering
- Hanya tampilkan alerts yang bukan "safe"
- All-safe message jika semua budget aman

### 2. Projection Warning
```tsx
{analysis.projection.will_exceed && (
    <div className="warning">
        ⚠️ Proyeksi Akhir Bulan:
        Jika pola spending tetap sama, kamu akan over budget 
        Rp{excess_amount}
    </div>
)}
```

### 3. Progress Bar Visual
```tsx
<div className="w-full bg-gray-200 rounded-full h-2">
    <div 
        className={`h-2 rounded-full bg-${color}-600`}
        style={{ width: `${Math.min(percentage, 100)}%` }}
    />
</div>
```

### 4. AI Suggestions
- Contextual tips per kategori
- Actionable dengan angka konkret
- Bahasa Indonesia casual
- Fallback jika AI gagal

---

## 🔐 Security Notes

### Environment Variables
```bash
# .env.local
OPENROUTER_API_KEY=your_api_key_here
```

**NEVER** hardcode API key di frontend!

### Best Practice:
```typescript
// ❌ BAD
const API_KEY = "sk-or-v1-abc123";

// ✅ GOOD
const API_KEY = process.env.OPENROUTER_API_KEY;

// ✅ BETTER (with validation)
const API_KEY = process.env.OPENROUTER_API_KEY;
if (!API_KEY) {
    throw new Error('OPENROUTER_API_KEY not configured');
}
```

---

## 📊 Cost Estimation

**Assumptions:**
- 1 user = 30 budget checks/month
- 20% checks trigger AI suggestions
- Average: 500 input tokens, 200 output tokens

**Model:** Gemini 2.0 Flash Thinking  
**Cost:** $0.10 input / $0.40 output per 1M tokens

**Calculation:**
```
Monthly requests = 30 × 0.20 = 6 AI calls
Tokens per request = 500 input + 200 output = 700 total
Monthly tokens = 6 × 700 = 4,200 tokens

Cost = (4200/1M) × $0.40 = $0.00168 per user
```

**For 1000 users:** ~$1.68/month 🎉

---

## 🧪 Testing Scenarios

### Test Case 1: All Safe
```typescript
budgets = [
    { category: 'Makanan', amount: 1500000, spent: 500000 } // 33%
]
// Expected: Green card, "Semua budget masih aman"
```

### Test Case 2: Warning
```typescript
budgets = [
    { category: 'Makanan', amount: 1500000, spent: 1200000 } // 80%
]
// Expected: Yellow card, 2-3 AI suggestions
```

### Test Case 3: Critical
```typescript
budgets = [
    { category: 'Transport', amount: 500000, spent: 470000 } // 94%
]
// Expected: Orange card, urgent suggestions
```

### Test Case 4: Over Budget
```typescript
budgets = [
    { category: 'Hiburan', amount: 300000, spent: 350000 } // 117%
]
// Expected: Red card, "sudah over Rp50,000"
```

### Test Case 5: Projection Warning
```typescript
// Day 10 of month, spent 1M from 2M budget
// Projection: (1M/10) × 30 = 3M > 2M budget
// Expected: Projection warning displayed
```

---

## 🚀 Deployment Checklist

- [ ] Set `OPENROUTER_API_KEY` in environment
- [ ] Test with real transaction data
- [ ] Verify AI suggestions quality
- [ ] Add error boundary around component
- [ ] Implement loading skeleton
- [ ] Add analytics tracking
- [ ] Test mobile responsive
- [ ] Add retry logic for API failures
- [ ] Implement caching for repeated queries
- [ ] Add unit tests for BudgetAlertService

---

## 🐛 Common Issues & Fixes

### Issue 1: API Key Error
```
Error: OPENROUTER_API_KEY not configured
```
**Fix:** Set environment variable

### Issue 2: Suggestions Always Same
**Fix:** Check AI prompt, increase temperature

### Issue 3: Slow Response
**Fix:** Implement caching, reduce API calls

### Issue 4: Wrong Percentage
**Fix:** Verify transaction date filtering

---

## 📚 Resources

- OpenRouter Docs: https://openrouter.ai/docs
- Gemini Flash Thinking: https://openrouter.ai/google/gemini-2.0-flash-thinking-exp-01-21
- React TypeScript: https://react-typescript-cheatsheet.netlify.app/

---

**Built with ❤️ for FinAI**
