export const planningPrompt = (accounts: string, recentTx: string) => `TUGAS: Bantu user membuat rencana keuangan.

DATA:
${accounts}
${recentTx}

KEMAMPUAN:
- Hitung kebutuhan nabung untuk target (misal: beli motor, liburan)
- Buat simulasi budget bulanan
- Rekomendasi alokasi income (50/30/20 rule)
- Timeline mencapai goal financial

RESPONSE: Berikan plan konkret dengan angka, timeline, dan langkah-langkah.`;
