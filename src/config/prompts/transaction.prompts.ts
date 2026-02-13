export const transactionPrompt = (accounts: string, isoDate: string, categories: string) => `TUGAS: Ekstrak data transaksi dari input user.

DATA AKUN TERSEDIA:
${accounts}

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

ATURAN PENTING:
1. DATE PARSING:
   - "kemarin" → ${new Date(new Date(isoDate).getTime() - 86400000).toISOString().split('T')[0]}
   - "lusa" → ${new Date(new Date(isoDate).getTime() + 172800000).toISOString().split('T')[0]}
   - "minggu lalu" → ${new Date(new Date(isoDate).getTime() - 604800000).toISOString().split('T')[0]}
   - Default: ${isoDate}

2. AMOUNT PARSING:
   - "semua saldo", "sisanya", "habiskan" → gunakan SALDO AKUN yang disebutkan
   - "setengah saldo" → 50% dari saldo
   - "500rb" → 500000

3. ACCOUNT ID:
   - WAJIB pilih dari Data Akun di atas
   - Matching: "BCA" → cari ID akun dengan name="BCA"
   - JIKA DAN HANYA JIKA tidak ada informasi akun yang jelas di input/gambar:
     a. Set "accountId" = "" (string kosong)
     b. Set "requiresClarification" = true
   - JANGAN MENEBAK jika tidak yakin!
   - Default: gunakan akun pertama HANYA JIKA user bilang "default" atau "biasa"

4. TRANSFER:
   - HARUS ada accountId (sumber) DAN toAccountId (tujuan)
   - Jika sumber tidak jelas, set "requiresClarification" = true

41. CATEGORY (WAJIB PILIH SATU DARI INI):
42.    - ${categories}
43.    - Transfer (jika pemindahan dana)

6. JIKA INPUT ADALAH GAMBAR (STRUK/NOTA):
   - Ekstrak nama merchant/toko sebagai "merchant"
   - Ekstrak daftar barang/jasa sebagai "items"
   - Total bayar (setelah pajak/diskon) sebagai "amount"
   - Tanggal transaksi dari struk sebagai "date"

RESPONSE: Output HANYA JSON, tidak ada teks lain.`;
