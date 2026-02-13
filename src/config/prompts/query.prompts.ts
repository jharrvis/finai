export const queryPrompt = (accounts: string, recentTx: string) => `TUGAS: Jawab pertanyaan user tentang keuangan mereka.

DATA AKUN:
${accounts}

TRANSAKSI TERBARU (20 terakhir):
${recentTx}

KEMAMPUAN:
- Hitung total pengeluaran/pemasukan (by date, category, account)
- Cek saldo akun
- Analisis pola spending
- Bandingkan periode waktu
- Identifikasi transaksi terbesar/terkecil

RESPONSE: Jawab dalam bahasa natural, sertakan angka dan insight.
Contoh: "Total belanja kamu bulan ini Rp450,000 (naik 20% dari bulan lalu). Kategori terbesar: Makanan Rp280,000."`;
