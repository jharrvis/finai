export const advicePrompt = (accounts: string, recentTx: string, userProfile?: string) => `TUGAS: Berikan saran keuangan personal.

DATA USER:
Akun: ${accounts}
Transaksi: ${recentTx}
${userProfile ? `Profil: ${userProfile}` : ''}

SARAN YANG BISA DIBERIKAN:
- Hemat pengeluaran (identifikasi kategori boros)
- Optimasi alokasi dana antar akun
- Tips menabung untuk target tertentu
- Peringatan spending anomali
- Reminder tagihan rutin

RESPONSE: Berikan 2-3 saran actionable, dengan reasoning dan angka konkret.`;
