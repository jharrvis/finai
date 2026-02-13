# 🏦 REKOMENDASI FITUR LAYANAN KEUANGAN
## untuk FinAI - Personal Finance Assistant

---

## 🎯 FITUR TIER 1 - ESSENTIALS (Must Have)

### 1. **Smart Transaction Categorization**
**Deskripsi:** Auto-categorize transaksi dengan ML

**AI Logic:**
```typescript
const categorizationPrompt = `Kategorikan transaksi ini berdasarkan merchant dan description:
Input: "${merchant}" - "${description}"

Kategori yang tersedia:
- Makanan & Minuman (restoran, kafe, delivery)
- Transport (bensin, parkir, Grab, Gojek)
- Belanja (supermarket, marketplace, fashion)
- Tagihan (listrik, air, internet, pulsa)
- Hiburan (bioskop, konser, streaming)
- Kesehatan (apotek, rumah sakit, gym)
- Pendidikan (kursus, buku, sekolah)
- Lainnya

PENTING: 
- Jika "Indomaret/Alfamart" → 99% = Belanja
- Jika "Gojek/Grab" → perhatikan deskripsi:
  * "GoFood" → Makanan
  * "GoRide" → Transport
- Jika "Shopee/Tokopedia" → Belanja (kecuali disebutkan kategori spesifik)

Output JSON:
{
  "category": "kategori",
  "subcategory": "subkategori opsional",
  "confidence": 0.0-1.0,
  "reasoning": "penjelasan singkat"
}`;

// Model: gunakan Gemini Flash (cepat & murah untuk classification)
```

**Use Case:**
- User: "Catat beli kopi di Starbucks 45rb"
- AI: Auto-tag ke "Makanan & Minuman > Kafe"

---

### 2. **Receipt OCR & Auto-Entry**
**Deskripsi:** Scan struk belanja, auto-extract data

**AI Logic:**
```typescript
const receiptOCRPrompt = `Ekstrak data dari struk belanja ini.

OUTPUT JSON:
{
  "merchant": "nama toko",
  "date": "YYYY-MM-DD",
  "time": "HH:MM",
  "items": [
    {"name": "Aqua 600ml", "qty": 2, "price": 5000, "total": 10000},
    {"name": "Indomie Goreng", "qty": 5, "price": 3000, "total": 15000}
  ],
  "subtotal": 25000,
  "tax": 2500,
  "total": 27500,
  "payment_method": "Cash/Debit/QRIS",
  "suggested_category": "Belanja"
}

ATURAN:
- Jika tidak ada tanggal di struk, gunakan tanggal hari ini
- Total HARUS sama dengan sum(items.total) + tax
- Jika ada diskon, masukkan ke field "discount"
`;

// Model: Google Gemini 2.0 Flash (terbaik untuk vision)
// Alternative: GPT-4 Vision (lebih akurat tapi mahal)
```

**Use Case:**
- User: Upload foto struk Indomaret
- AI: "Berhasil mencatat 8 item senilai Rp127,500 dari Indomaret (hari ini)"

---

### 3. **Budget Alerts**
**Deskripsi:** Warning jika spending melebihi budget

**AI Logic:**
```typescript
const budgetCheckPrompt = `Analisis apakah user sudah melebihi budget:

BUDGET BULANAN:
- Makanan: Rp1,500,000
- Transport: Rp500,000
- Hiburan: Rp300,000

SPENDING BULAN INI (${currentMonth}):
${spendingData}

TUGAS:
1. Hitung persentase penggunaan budget per kategori
2. Identifikasi kategori yang >80% atau sudah over
3. Berikan warning yang ramah tapi tegas

OUTPUT:
{
  "alerts": [
    {
      "category": "Makanan",
      "spent": 1650000,
      "budget": 1500000,
      "percentage": 110,
      "status": "over",
      "message": "Budget Makanan sudah over Rp150,000! Pertimbangkan masak di rumah 3-4x seminggu untuk hemat."
    }
  ],
  "overall_status": "warning",
  "suggestion": "Fokus hemat di kategori Makanan dan Hiburan untuk sisa bulan ini."
}`;
```

**Use Case:**
- User baru saja belanja Rp200rb (Makanan)
- AI: "⚠️ Budget Makanan kamu sudah 95% terpakai (Rp1.425.000 / Rp1.500.000). Sisa Rp75.000 untuk 10 hari lagi."

---

### 4. **Recurring Transaction Detection**
**Deskripsi:** Deteksi tagihan rutin & set reminder

**AI Logic:**
```typescript
const recurringDetectionPrompt = `Analisis pola transaksi untuk deteksi tagihan rutin:

DATA TRANSAKSI 3 BULAN TERAKHIR:
${last3MonthsTransactions}

TUGAS:
1. Cari transaksi yang muncul setiap bulan dengan:
   - Merchant yang sama
   - Jumlah yang mirip (toleransi ±10%)
   - Tanggal yang konsisten (toleransi ±3 hari)

2. Klasifikasikan sebagai:
   - Subscription (Netflix, Spotify, etc)
   - Utilities (listrik, air, internet)
   - Loan/Cicilan
   - Insurance

OUTPUT JSON:
{
  "recurring_transactions": [
    {
      "merchant": "Netflix",
      "category": "Subscription",
      "amount": 54000,
      "frequency": "monthly",
      "typical_date": 15,
      "last_payment": "2024-01-15",
      "next_expected": "2024-02-15",
      "confidence": 0.95
    }
  ],
  "total_monthly_recurring": 850000,
  "suggestion": "Set reminder untuk 7 tagihan rutin (total Rp850rb/bulan)"
}`;
```

**Use Case:**
- AI (proactive): "Saya deteksi kamu punya 5 langganan rutin: Netflix (Rp54rb), Spotify (Rp55rb), Indihome (Rp350rb), Listrik (~Rp200rb), BPJS (Rp150rb). Mau saya set reminder otomatis?"

---

### 5. **Income vs Expense Summary**
**Deskripsi:** Laporan keuangan otomatis

**AI Logic:**
```typescript
const monthlySummaryPrompt = `Buat laporan keuangan bulan ${month} ${year}:

DATA:
${monthlyTransactions}

LAPORAN YANG HARUS DIBUAT:
1. Total Income vs Expense
2. Net Savings (Income - Expense)
3. Savings Rate (%)
4. Top 5 Spending Categories
5. Biggest Single Transaction
6. Comparison dengan bulan sebelumnya
7. Insight & Recommendation

OUTPUT (Natural Language):
Laporan yang mudah dipahami dengan emoji dan highlight penting.

Contoh:
"💰 LAPORAN JANUARI 2024

📈 Pemasukan: Rp8,500,000
📉 Pengeluaran: Rp6,200,000
✅ Net Saving: Rp2,300,000 (27% savings rate) 

🔝 Top 5 Kategori:
1. Makanan: Rp1,850,000 (30%)
2. Transport: Rp920,000 (15%)
3. Belanja: Rp780,000 (13%)
4. Tagihan: Rp650,000 (10%)
5. Hiburan: Rp430,000 (7%)

💡 INSIGHT:
- Saving rate kamu 27% - bagus! (ideal 20-30%)
- Pengeluaran Makanan naik 18% dari bulan lalu
- Transaksi terbesar: Beli HP Rp3,200,000

💪 SARAN:
Coba kurangi makan di luar 2-3x/minggu, bisa hemat ~Rp300rb/bulan."
`;

// Model: Claude 3.5 Sonnet (excellent di financial analysis)
```

---

## 🚀 FITUR TIER 2 - ADVANCED (Good to Have)

### 6. **Smart Savings Goal Planner**
**Deskripsi:** Bantu user nabung untuk target tertentu

**AI Logic:**
```typescript
const savingsGoalPrompt = `User ingin mencapai goal savings:

TARGET: ${goalName} - Rp${goalAmount}
DEADLINE: ${targetDate}
CURRENT SAVINGS: Rp${currentSavings}

INCOME & EXPENSE DATA (3 bulan terakhir):
${financialData}

TUGAS:
1. Hitung berapa lama untuk mencapai goal dengan savings rate saat ini
2. Hitung berapa harus nabung per bulan untuk capai deadline
3. Identifikasi kategori mana yang bisa dipotong
4. Buat action plan konkret

OUTPUT:
{
  "gap": 5000000,
  "months_remaining": 12,
  "current_monthly_savings": 1500000,
  "required_monthly_savings": 2300000,
  "additional_savings_needed": 800000,
  "cutting_recommendations": [
    {"category": "Hiburan", "current": 450000, "suggested": 250000, "savings": 200000},
    {"category": "Makanan", "current": 1850000, "suggested": 1350000, "savings": 500000}
  ],
  "action_plan": [
    "Kurangi makan di luar dari 15x → 8x/bulan (hemat Rp500rb)",
    "Pause subscription yang jarang dipakai (hemat Rp150rb)",
    "Bawa bekal 2x/minggu (hemat Rp150rb)"
  ],
  "achievability": "feasible",
  "confidence": 0.85
}`;
```

**Use Case:**
- User: "Saya mau nabung buat beli motor Rp20jt, target 1 tahun"
- AI: "Untuk capai target Rp20jt dalam 12 bulan, kamu harus nabung Rp1,67jt/bulan. Saat ini kamu nabung ~Rp800rb/bulan. Perlu tambahan Rp870rb. Saya punya 3 saran..."

---

### 7. **Anomaly Detection**
**Deskripsi:** Deteksi transaksi tidak wajar

**AI Logic:**
```typescript
const anomalyDetectionPrompt = `Deteksi transaksi yang mencurigakan/tidak biasa:

POLA NORMAL USER (6 bulan terakhir):
${historicalPattern}

TRANSAKSI BARU:
${newTransactions}

KRITERIA ANOMALI:
- Amount > 3x rata-rata kategori
- Merchant baru yang tidak pernah muncul
- Waktu transaksi tidak biasa (2-5 pagi)
- Lokasi tidak biasa (jika ada GPS data)
- Frekuensi tinggi dalam waktu singkat

OUTPUT:
{
  "anomalies": [
    {
      "transaction_id": "tx_123",
      "reason": "Amount Rp2,5jt jauh lebih tinggi dari rata-rata kategori Makanan (Rp150rb)",
      "severity": "high",
      "suggested_action": "Verifikasi apakah ini transaksi sah"
    }
  ],
  "fraud_risk_score": 0.0-1.0
}`;
```

**Use Case:**
- Tiba-tiba ada transaksi Rp5jt di Shopee jam 3 pagi (user biasanya belanja <Rp500rb)
- AI: "🚨 Transaksi mencurigakan terdeteksi: Rp5.000.000 di Shopee jam 03:15. Ini bukan pola normal kamu. Verifikasi segera!"

---

### 8. **Bill Negotiation Advisor**
**Deskripsi:** Saran negosiasi tagihan/harga

**AI Logic:**
```typescript
const negotiationAdvisorPrompt = `User membayar tagihan/subscription:

TAGIHAN SAAT INI:
- Internet Indihome: Rp350,000/bulan (paket 30 Mbps)
- Netflix Premium: Rp186,000/bulan
- Spotify Premium: Rp54,900/bulan

BENCHMARK MARKET:
${marketPriceData} // Dari scraping atau API

TUGAS:
Berikan saran negosiasi atau alternatif yang lebih murah:

OUTPUT:
{
  "opportunities": [
    {
      "service": "Internet Indihome",
      "current_cost": 350000,
      "recommendation": "Coba negosiasi upgrade ke 50 Mbps dengan harga sama, atau downgrade ke 20 Mbps (Rp280rb) jika 30 Mbps jarang terpakai penuh",
      "potential_savings": 70000,
      "action": "Hubungi 147, mention kamu customer setia 2+ tahun"
    },
    {
      "service": "Netflix Premium",
      "current_cost": 186000,
      "recommendation": "Share akun dengan 3 teman (maks 4 profil), biaya jadi Rp46.500/orang",
      "potential_savings": 139500
    }
  ],
  "total_potential_savings": 209500
}`;
```

---

### 9. **Tax Deduction Finder**
**Deskripsi:** Identifikasi pengeluaran yang bisa tax deductible

**AI Logic:**
```typescript
const taxDeductionPrompt = `Analisis transaksi untuk potensi tax deduction (Indonesia):

TRANSAKSI:
${yearlyTransactions}

KATEGORI TAX DEDUCTIBLE (PTKP):
- Zakat/Donasi (max 2.5% penghasilan bruto)
- Asuransi Kesehatan/Jiwa (max Rp3jt/tahun)
- Biaya Pendidikan (jika untuk diri sendiri/tanggungan)
- Iuran Pensiun/BPJS

OUTPUT:
{
  "deductible_items": [
    {"category": "Donasi", "amount": 2500000, "proof": "Ada 5 transaksi donasi"},
    {"category": "Asuransi", "amount": 3000000, "proof": "Pembayaran Prudential"}
  ],
  "total_deduction": 5500000,
  "estimated_tax_savings": 1375000,
  "missing_documents": ["Bukti donasi formal dari lembaga tersertifikasi"],
  "recommendation": "Upload bukti pembayaran untuk claim tax deduction"
}`;
```

---

### 10. **Investment Opportunity Detector**
**Deskripsi:** Saran investasi berdasarkan excess cash

**AI Logic:**
```typescript
const investmentAdvisorPrompt = `Analisis kondisi keuangan untuk saran investasi:

PROFILE:
- Income: Rp${monthlyIncome}
- Expense: Rp${monthlyExpense}
- Savings: Rp${totalSavings}
- Emergency Fund: Rp${emergencyFund}
- Age: ${age}
- Risk Tolerance: ${riskTolerance}

ATURAN INVESTASI:
1. Emergency fund HARUS 6x monthly expense dulu
2. Jika sudah punya emergency fund, excess cash bisa diinvestasikan
3. Rekomendasi asset allocation based on age:
   - Age 20-30: 70% saham, 20% obligasi, 10% cash
   - Age 31-40: 60% saham, 30% obligasi, 10% cash
   - Age 41-50: 40% saham, 50% obligasi, 10% cash

OUTPUT:
{
  "emergency_fund_status": "sufficient/insufficient",
  "investable_amount": 15000000,
  "recommendations": [
    {
      "instrument": "Reksadana Saham",
      "allocation": 10500000,
      "reason": "Cocok untuk jangka panjang (>5 tahun), return potensial 12-15%/tahun",
      "suggested_products": ["Reksadana Sucorinvest Equity Fund", "Bahana Dana Prima"]
    },
    {
      "instrument": "SBN (Obligasi Negara)",
      "allocation": 3000000,
      "reason": "Low risk, return 6-7%/tahun, bisa dicairkan kapan saja",
      "suggested_products": ["ORI (Obligasi Ritel Indonesia)", "Sukuk Ritel"]
    }
  ],
  "next_steps": [
    "Buka rekening sekuritas (Bibit, Ajaib, Stockbit)",
    "Mulai dengan Rp500rb dulu untuk belajar",
    "Set auto-debit Rp1jt/bulan"
  ]
}`;

// IMPORTANT: Tambahkan disclaimer
const disclaimer = "⚠️ Ini bukan saran investasi resmi. Selalu lakukan riset sendiri dan konsultasi dengan financial advisor berlisensi.";
```

---

## 💎 FITUR TIER 3 - PREMIUM (Nice to Have)

### 11. **Multi-Currency Support**
- Auto-convert transaksi luar negeri
- Track exchange rate fluctuation
- Warn jika kurs lagi bagus untuk exchange

### 12. **Debt Payoff Optimizer**
- Snowball vs Avalanche method comparison
- Hitung total interest yang bisa dihemat
- Timeline untuk debt-free

### 13. **Expense Sharing (Split Bill)**
- "Kemarin makan Rp450rb, split 3 orang"
- Auto-track siapa yang belum bayar
- Generate payment reminder

### 14. **Cashback & Promo Finder**
- "Kamu bisa hemat 15% pakai promo Shopee"
- Integrasikan dengan cashback aggregator API

### 15. **Financial Health Score**
- Score 0-100 based on:
  * Savings rate
  * Debt-to-income ratio
  * Emergency fund adequacy
  * Spending consistency
- Benchmark dengan peers (anonim)

### 16. **Spending Prediction**
- "Bulan depan kamu akan spend ~Rp6,2jt berdasarkan pola"
- Warning jika proyeksi over budget

### 17. **Receipt Storage & Search**
- "Cari struk pembelian laptop bulan lalu"
- OCR semua struk, bisa search by keyword

### 18. **Family Budget Management**
- Shared budget dengan pasangan/keluarga
- Track kontribusi masing-masing
- Kids allowance tracking

---

## 🤖 REKOMENDASI MODEL LLM

### Untuk PRODUCTION (OpenRouter):

1. **Transaction Extraction** (OCR, JSON parsing)
   - **Google Gemini 2.0 Flash Thinking** ($0.10/$0.40 per 1M tokens)
   - Kenapa: Akurat, cepat, murah, bagus untuk vision + reasoning

2. **Financial Analysis & Advice**
   - **Claude 3.5 Sonnet** ($3/$15 per 1M tokens)
   - Kenapa: Reasoning terbaik untuk financial planning, empati tinggi

3. **Classification & Simple Queries**
   - **Gemini 1.5 Flash** ($0.075/$0.30 per 1M tokens)
   - Kenapa: Paling murah, cukup untuk task sederhana

4. **Fallback/Backup**
   - **GPT-4o mini** ($0.15/$0.60 per 1M tokens)
   - Kenapa: Balance antara cost & quality

### LLM Khusus Keuangan?

❌ **TIDAK ADA LLM KHUSUS UNTUK PERSONAL FINANCE** yang production-ready.

Ada beberapa fine-tuned model untuk financial domain tapi untuk:
- Financial news analysis (Bloomberg GPT)
- Trading signal (FinGPT) - research project
- Corporate finance (FinBERT) - sentiment analysis

**SOLUSI TERBAIK:**
Pakai general LLM (Gemini/Claude/GPT) + **specialized prompting** + **RAG** dengan financial knowledge base.

---

## 📊 COST ESTIMATION (untuk 1000 users aktif/bulan)

Asumsi:
- 1 user = 150 requests/bulan
- Average: 500 tokens input, 300 tokens output

| Model | Use Case | Cost/1M tokens | Monthly Cost |
|-------|----------|----------------|--------------|
| Gemini Flash | 60% requests (simple) | $0.40 | $36 |
| Gemini Thinking | 30% requests (extraction) | $0.40 | $18 |
| Claude Sonnet | 10% requests (analysis) | $15 | $90 |
| **TOTAL** | | | **~$144/bulan** |

Atau **Rp2,2jt/bulan** (asumsi $1 = Rp15,500)

---

## 🛠️ IMPLEMENTASI ROADMAP

### Phase 1 (Bulan 1-2): Core Features
- ✅ Smart Transaction Categorization
- ✅ Receipt OCR
- ✅ Budget Alerts
- ✅ Monthly Summary

### Phase 2 (Bulan 3-4): Intelligence
- 🔄 Recurring Transaction Detection
- 🔄 Anomaly Detection
- 🔄 Savings Goal Planner

### Phase 3 (Bulan 5-6): Advanced
- ⏳ Investment Advisor
- ⏳ Tax Deduction Finder
- ⏳ Bill Negotiation

### Phase 4 (Bulan 7+): Premium
- ⏳ Multi-currency
- ⏳ Expense Sharing
- ⏳ Financial Health Score

---

## 🔒 SECURITY & PRIVACY

### Data Handling:
1. **Jangan kirim data sensitif ke AI:**
   - No credit card numbers
   - No account passwords
   - Anonymize user names jika perlu

2. **Use hashing untuk identifiers:**
   ```typescript
   const userHash = crypto.createHash('sha256')
       .update(userId)
       .digest('hex')
       .substring(0, 16);
   ```

3. **Data retention:**
   - Log AI conversations max 30 hari
   - Delete setelah proses selesai

4. **Compliance:**
   - GDPR-ready (jika expand ke EU)
   - PDP Indonesia (Peraturan Perlindungan Data Pribadi)

---

## 📈 METRICS TO TRACK

1. **AI Performance:**
   - Categorization accuracy (target >95%)
   - OCR accuracy (target >90%)
   - User correction rate
   - Response time (target <2s)

2. **User Engagement:**
   - DAU/MAU ratio
   - Feature usage rate
   - Conversation length
   - User retention

3. **Financial Impact:**
   - Average user savings
   - Budget adherence rate
   - Goal achievement rate

---

## 🎓 LEARNING RESOURCES

1. **Financial Prompting:**
   - https://github.com/AI4Finance-Foundation/FinGPT
   - Anthropic's Financial Analysis guide

2. **Indonesian Finance:**
   - OJK guidelines untuk financial literacy
   - Tax regulation (DJP)

3. **OCR Best Practices:**
   - Google Cloud Vision best practices
   - Receipt parsing challenges

---

**NEXT STEPS:**
1. Implement improved AI Logic dari file pertama
2. Pilih 3-5 fitur Tier 1 untuk MVP
3. Setup monitoring & logging
4. A/B test prompt variations
5. Collect user feedback untuk iterasi

🚀 **Good luck building FinAI!**
