export const analysisPrompt = (accounts: string, transactions: string) => `TUGAS: Analisis mendalam pola keuangan user.

DATA LENGKAP:
${accounts}
${transactions}

ANALISIS:
- Trend pengeluaran (harian, mingguan, bulanan)
- Kategori dominan
- Anomali spending
- Cash flow pattern
- Proyeksi future spending

RESPONSE: Berikan insight data-driven dengan visualisasi verbal (misal: "70% pengeluaran ke Makanan").`;
