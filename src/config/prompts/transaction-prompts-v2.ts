// ============================================
// UPDATED TRANSACTION PROMPT
// Dengan Konsep Akuntansi & Keuangan Personal
// ============================================

export const transactionPromptV2 = (
    accounts: string,
    isoDate: string,
    categories: string,
    accountBalances: string // NEW: Real-time balances
) => `TUGAS: Ekstrak data transaksi dari input user dengan PRINSIP AKUNTANSI KEUANGAN PERSONAL.

=== KONSEP DASAR AKUNTANSI ===
1. BALANCE = Initial Balance + Total Income - Total Expense
2. Transfer = Double-Entry (Debit satu akun, Kredit akun lain)
3. Setiap transaksi HARUS terkait dengan AKUN tertentu
4. Validasi: Pengeluaran tidak boleh melebihi saldo akun

DATA AKUN TERSEDIA:
${accounts}

SALDO REAL-TIME:
${accountBalances}

KATEGORI VALID:
${categories}

OUTPUT FORMAT (JSON):
{
    "type": "expense" | "income" | "transfer",
    "amount": number,
    "category": string,
    "description": string,
    "date": "YYYY-MM-DD",
    "accountId": string,
    "toAccountId": string (HANYA untuk transfer),
    "merchant": string (opsional),
    "items": [{"name": string, "qty": number, "price": number}] (opsional)
}

=== ATURAN PENTING ===

1. DATE PARSING:
   - "kemarin" → ${new Date(new Date(isoDate).getTime() - 86400000).toISOString().split('T')[0]}
   - "lusa" → ${new Date(new Date(isoDate).getTime() + 172800000).toISOString().split('T')[0]}
   - "minggu lalu" → ${new Date(new Date(isoDate).getTime() - 604800000).toISOString().split('T')[0]}
   - Default: ${isoDate}

2. AMOUNT PARSING:
   - "500rb" → 500000
   - "1.5jt" → 1500000
   - "semua saldo BCA" → Gunakan SALDO REAL-TIME dari akun BCA
   - "setengah saldo" → 50% dari saldo akun yang disebutkan

3. ACCOUNT ID (WAJIB):
   - HARUS pilih dari Data Akun di atas berdasarkan nama
   - Jika user menyebut "BCA" → cari ID akun dengan name="BCA"
   - Jika user menyebut "GoPay" → cari ID akun dengan provider="GoPay"
   - Default: gunakan akun PERTAMA jika tidak disebutkan eksplisit

4. TRANSFER (Double-Entry Accounting):
   Format input: "transfer 100rb dari BCA ke Tunai" atau "pindahkan 500rb ke GoPay dari BCA"
   
   WAJIB:
   - type = "transfer"
   - accountId = ID akun SUMBER (dari mana uang keluar)
   - toAccountId = ID akun TUJUAN (ke mana uang masuk)
   - category = "Transfer"
   - description = "Transfer ke [Nama Akun Tujuan]"
   
   VALIDASI TRANSFER:
   - Cek apakah saldo akun sumber mencukupi
   - Jika tidak cukup, return ERROR dengan pesan: "Saldo [Nama Akun] tidak cukup. Saldo: Rp[X], Dibutuhkan: Rp[Y]"

5. EXPENSE (Pengeluaran):
   Format input: "beli kopi 45rb pakai GoPay" atau "bayar listrik 350rb"
   
   WAJIB:
   - type = "expense"
   - accountId = ID akun yang dipakai (jika disebutkan)
   - category = pilih dari kategori valid
   - Jika amount > saldo akun → return WARNING (tapi tetap buat transaksi)

6. INCOME (Pemasukan):
   Format input: "terima gaji 5jt ke BCA" atau "bonus 1jt"
   
   WAJIB:
   - type = "income"
   - accountId = ID akun tujuan
   - category = "Gaji", "Bonus", "Investasi", dll

7. KATEGORI CERDAS:
   - "Starbucks", "KFC", "Indomaret snack" → "Makan & Minum"
   - "Grab", "Gojek", "Bensin", "Parkir" → "Transportasi"
   - "Shopee", "Tokopedia", "Alfamart" → "Belanja"
   - "Netflix", "Spotify", "Bioskop" → "Hiburan"
   - "PLN", "PDAM", "Internet" → "Tagihan"
   - "Transfer antar akun → "Transfer"
   - Default → "Lainnya"

8. OCR STRUK (Jika Input Gambar):
   - Ekstrak nama merchant sebagai "merchant"
   - Ekstrak daftar barang sebagai "items" array
   - Total bayar (setelah tax/diskon) sebagai "amount"
   - Tanggal dari struk sebagai "date"
   - Pilih kategori berdasarkan jenis merchant

9. RECURRING TRANSACTIONS:
   Jika user menyebut "langganan", "subscription", "rutin", "bulanan":
   - Tambahkan flag "isRecurring: true" di JSON
   - Untuk tagihan rutin seperti "listrik", "internet", "netflix" → auto-detect as recurring

=== CONTOH INPUT & OUTPUT ===

Input: "Transfer 500rb dari BCA ke GoPay"
Output:
{
    "type": "transfer",
    "amount": 500000,
    "category": "Transfer",
    "description": "Transfer ke GoPay",
    "date": "${isoDate}",
    "accountId": "ID_AKUN_BCA",
    "toAccountId": "ID_AKUN_GOPAY"
}

Input: "Beli kopi 45rb di Starbucks pakai GoPay"
Output:
{
    "type": "expense",
    "amount": 45000,
    "category": "Makan & Minum",
    "description": "Kopi Starbucks",
    "date": "${isoDate}",
    "accountId": "ID_AKUN_GOPAY",
    "merchant": "Starbucks"
}

Input: "Gaji 8jt masuk ke BCA"
Output:
{
    "type": "income",
    "amount": 8000000,
    "category": "Gaji",
    "description": "Gaji bulanan",
    "date": "${isoDate}",
    "accountId": "ID_AKUN_BCA"
}

=== ERROR HANDLING ===
Jika ada masalah, return JSON dengan field tambahan:
{
    "error": true,
    "errorMessage": "Penjelasan error dalam bahasa natural",
    ...
}

Contoh error:
- Akun tidak ditemukan
- Saldo tidak cukup untuk transfer
- Format input tidak jelas
- Kategori tidak valid

RESPONSE: Output HANYA JSON, tidak ada teks lain.`;
