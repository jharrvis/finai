// ============================================
// AI FINANCIAL ASSISTANT - IMPROVED LOGIC
// ============================================

// --- 1. CONSTANTS & CONFIGURATION ---
const AI_CONFIG = {
    // Gunakan model yang tepat untuk use case
    models: {
        // Untuk extraction & classification (cepat, murah)
        fast: "google/gemini-2.0-flash-thinking-exp-01-21", // Flash Thinking lebih akurat
        // Untuk analisis & advice (lebih pintar)
        smart: "anthropic/claude-3.5-sonnet", // Claude lebih baik untuk financial reasoning
        // Untuk vision (OCR struk)
        vision: "google/gemini-2.0-flash-exp-001"
    },
    maxRetries: 3,
    timeout: 30000,
    maxHistoryTurns: 10,
    maxContextTokens: 8000
};

// --- 2. INTENT CLASSIFICATION ---
interface Intent {
    type: 'transaction' | 'query' | 'advice' | 'planning' | 'analysis';
    confidence: number;
    entities?: any;
}

const classifyIntent = async (userInput: string, hasImage: boolean): Promise<Intent> => {
    // Jika ada gambar, pasti transaction
    if (hasImage) {
        return { type: 'transaction', confidence: 1.0 };
    }

    // Simple rule-based classification (bisa di-upgrade ke LLM)
    const lowerInput = userInput.toLowerCase();

    // Transaction keywords
    if (/catat|beli|bayar|transfer|pindah|belanja|byr|tf/i.test(lowerInput)) {
        return { type: 'transaction', confidence: 0.9 };
    }

    // Query keywords
    if (/berapa|total|saldo|riwayat|transaksi|pengeluaran|pemasukan/i.test(lowerInput)) {
        return { type: 'query', confidence: 0.9 };
    }

    // Advice keywords
    if (/saran|tips|gimana|bagus|sebaiknya|rekomendasi/i.test(lowerInput)) {
        return { type: 'advice', confidence: 0.8 };
    }

    // Planning keywords
    if (/rencana|target|nabung|investasi|budget/i.test(lowerInput)) {
        return { type: 'planning', confidence: 0.8 };
    }

    // Analysis keywords
    if (/analisis|laporan|report|grafik|trend|pola/i.test(lowerInput)) {
        return { type: 'analysis', confidence: 0.8 };
    }

    // Default
    return { type: 'query', confidence: 0.5 };
};

// --- 3. MODULAR SYSTEM PROMPTS ---
const PROMPTS = {
    base: (dateString: string, isoDate: string) => `Anda adalah FinAI, asisten keuangan pribadi yang cerdas dan ramah.
Hari ini: ${dateString} (${isoDate}).
Gunakan Bahasa Indonesia yang natural dan empati.`,

    // addTransaction({accounts: string, isoDate: string) => `TUGAS: Ekstrak data transaksi dari input user.

    DATA AKUN TERSEDIA:
        ${ accounts }

OUTPUT FORMAT(JSON):
{
    "type": "expense" | "income" | "transfer",
        "amount": number,
            "category": string,
                "description": string,
                    "date": "YYYY-MM-DD",
                        "accountId": string,
                            "toAccountId": string(HANYA untuk transfer),
                                "merchant": string(opsional),
                                    "items": [{ "name": string, "qty": number, "price": number }](opsional)
}

ATURAN PENTING:
1. DATE PARSING:
- "kemarin" → ${ new Date(new Date(isoDate).getTime() - 86400000).toISOString().split('T')[0] }
- "lusa" → ${ new Date(new Date(isoDate).getTime() + 172800000).toISOString().split('T')[0] }
- "minggu lalu" → ${ new Date(new Date(isoDate).getTime() - 604800000).toISOString().split('T')[0] }
- Default: ${ isoDate }

2. AMOUNT PARSING:
- "semua saldo", "sisanya", "habiskan" → gunakan SALDO AKUN yang disebutkan
    - "setengah saldo" → 50 % dari saldo
        - "500rb" → 500000

3. ACCOUNT ID:
- WAJIB pilih dari Data Akun di atas
    - Matching: "BCA" → cari ID akun dengan name = "BCA"
        - Default: gunakan akun pertama jika tidak disebutkan

4. TRANSFER:
- HARUS ada accountId(sumber) DAN toAccountId(tujuan)
    - Contoh: "transfer 100rb dari BCA ke Tunai"
     → accountId: ID_BCA, toAccountId: ID_TUNAI

5. CATEGORY:
- expense: Makanan, Transport, Belanja, Tagihan, Hiburan, Kesehatan, Pendidikan, Lainnya, Transfer
    - income: Gaji, Bonus, Hadiah, Investasi, Lainnya, Transfer

RESPONSE: Output HANYA JSON, tidak ada teks lain.`,

    query: (accounts: string, recentTx: string) => `TUGAS: Jawab pertanyaan user tentang keuangan mereka.

DATA AKUN:
${ accounts }

TRANSAKSI TERBARU(20 terakhir):
${ recentTx }

KEMAMPUAN:
- Hitung total pengeluaran / pemasukan(by date, category, account)
    - Cek saldo akun
        - Analisis pola spending
            - Bandingkan periode waktu
                - Identifikasi transaksi terbesar / terkecil

RESPONSE: Jawab dalam bahasa natural, sertakan angka dan insight.
    Contoh: "Total belanja kamu bulan ini Rp450,000 (naik 20% dari bulan lalu). Kategori terbesar: Makanan Rp280,000."`,

    advice: (accounts: string, recentTx: string, userProfile?: string) => `TUGAS: Berikan saran keuangan personal.

DATA USER:
Akun: ${ accounts }
Transaksi: ${ recentTx }
${ userProfile ? `Profil: ${userProfile}` : '' }

SARAN YANG BISA DIBERIKAN:
- Hemat pengeluaran(identifikasi kategori boros)
    - Optimasi alokasi dana antar akun
        - Tips menabung untuk target tertentu
            - Peringatan spending anomali
                - Reminder tagihan rutin

RESPONSE: Berikan 2 - 3 saran actionable, dengan reasoning dan angka konkret.`,

    planning: (accounts: string, recentTx: string) => `TUGAS: Bantu user membuat rencana keuangan.

    DATA:
${ accounts }
${ recentTx }

KEMAMPUAN:
- Hitung kebutuhan nabung untuk target(misal: beli motor, liburan)
    - Buat simulasi budget bulanan
        - Rekomendasi alokasi income(50 / 30 / 20 rule)
            - Timeline mencapai goal financial

RESPONSE: Berikan plan konkret dengan angka, timeline, dan langkah - langkah.`,

    analysis: (accounts: string, transactions: string) => `TUGAS: Analisis mendalam pola keuangan user.

DATA LENGKAP:
${ accounts }
${ transactions }

ANALISIS:
- Trend pengeluaran(harian, mingguan, bulanan)
    - Kategori dominan
        - Anomali spending
            - Cash flow pattern
                - Proyeksi future spending

RESPONSE: Berikan insight data - driven dengan visualisasi verbal(misal: "70% pengeluaran ke Makanan").`
};

// --- 4. SMART CONTEXT BUILDER ---
const buildContext = (
    intent: Intent,
    accounts: any[],
    transactions: any[],
    isoDate: string
): string => {
    const accountsList = accounts.map(a => {
        const accTx = transactions.filter(t => t.accountId === a.id);
        const income = accTx.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
        const expense = accTx.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
        const balance = (a.balance || 0) + income - expense;
        return `- ${ a.name } (Saldo: Rp${ balance.toLocaleString('id-ID')}, ID: ${ a.id }, Tipe: ${ a.type })`;
    }).join('\n');

    // Untuk transaction, cukup kirim data akun
    if (intent.type === 'transaction') {
        return PROMPTS.transaction(accountsList, isoDate);
    }

    // Untuk yang lain, kirim transaksi juga
    const txCount = intent.type === 'analysis' ? 100 : 20; // Analisis butuh data lebih banyak
    const recentTx = transactions.slice(0, txCount).map(t =>
        `- ${ t.date.split('T')[0] }: ${ t.type } Rp${ t.amount.toLocaleString('id-ID') } (${ t.category }) - ${ t.description } `
    ).join('\n');

    switch (intent.type) {
        case 'query':
            return PROMPTS.query(accountsList, recentTx);
        case 'advice':
            return PROMPTS.advice(accountsList, recentTx);
        case 'planning':
            return PROMPTS.planning(accountsList, recentTx);
        case 'analysis':
            return PROMPTS.analysis(accountsList, recentTx);
        default:
            return PROMPTS.query(accountsList, recentTx);
    }
};

// --- 5. IMPROVED AI PROCESSOR ---
const processAIInput = async (
    text: string,
    base64Image: string | null,
    user: any,
    accounts: any[],
    transactions: any[],
    addTransaction: Function,
    setMessages: Function,
    showNotification: Function,
    speak: Function,
    aiMode: string
) => {
    const today = new Date();
    const dateString = today.toLocaleDateString('id-ID', { 
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
    });
    const isoDate = today.toISOString().split('T')[0];

    // STEP 1: Classify Intent
    const intent = await classifyIntent(text, !!base64Image);
    console.log('[AI] Intent detected:', intent);

    // STEP 2: Select Model
    let selectedModel = AI_CONFIG.models.fast;
    if (base64Image) {
        selectedModel = AI_CONFIG.models.vision;
    } else if (intent.type === 'advice' || intent.type === 'analysis') {
        selectedModel = AI_CONFIG.models.smart; // Claude for complex reasoning
    }

    // STEP 3: Build Context
    const systemPrompt = PROMPTS.base(dateString, isoDate) + '\n\n' + 
                        buildContext(intent, accounts, transactions, isoDate);

    // STEP 4: Prepare Messages
    let userContent: any = text;
    if (base64Image) {
        userContent = [
            { "type": "text", "text": text || "Tolong catat transaksi dari gambar ini." },
            { "type": "image_url", "image_url": { "url": `data: image / jpeg; base64, ${ base64Image } ` } }
        ];
    }

    // STEP 5: Call API with Retry Logic
    let lastError;
    for (let attempt = 1; attempt <= AI_CONFIG.maxRetries; attempt++) {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), AI_CONFIG.timeout);

            const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${ process.env.OPENROUTER_API_KEY } `, // Use env var
                    "HTTP-Referer": window.location.origin,
                    "X-Title": "FinAI Assistant",
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    "model": selectedModel,
                    "messages": [
                        { "role": "system", "content": systemPrompt },
                        { "role": "user", "content": userContent }
                    ],
                    "temperature": intent.type === 'transaction' ? 0.1 : 0.7, // Low temp for extraction
                    "max_tokens": 2000
                }),
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error?.message || `HTTP ${ response.status } `);
            }

            const aiText = result.choices?.[0]?.message?.content || "Maaf, saya tidak mengerti.";

            // STEP 6: Handle Response Based on Intent
            if (intent.type === 'transaction') {
                return await handleTransactionResponse(
                    aiText, accounts, addTransaction, isoDate, showNotification, speak, aiMode
                );
            } else {
                // Query/Advice/Planning/Analysis - langsung return text
                setMessages((prev: any) => [...prev, { 
                    role: 'ai', 
                    content: aiText, 
                    id: Date.now() 
                }]);
                if (aiMode === 'voice') speak(aiText);
                return aiText;
            }

        } catch (error: any) {
            lastError = error;
            console.error(`[AI] Attempt ${ attempt } failed: `, error.message);
            
            if (attempt < AI_CONFIG.maxRetries) {
                // Exponential backoff
                await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempt)));
            }
        }
    }

    // All retries failed
    const errMsg = `⚠️ Koneksi AI bermasalah setelah ${ AI_CONFIG.maxRetries } percobaan: ${ lastError?.message } `;
    setMessages((prev: any) => [...prev, { role: 'ai', content: errMsg, id: Date.now() }]);
    showNotification(errMsg, 'error');
    if (aiMode === 'voice') speak(errMsg);
    throw lastError;
};

// --- 6. TRANSACTION RESPONSE HANDLER ---
const handleTransactionResponse = async (
    aiText: string,
    accounts: any[],
    addTransaction: Function,
    isoDate: string,
    showNotification: Function,
    speak: Function,
    aiMode: string
) => {
    const jsonMatch = aiText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
        return "Maaf, saya tidak bisa mengenali data transaksi. Coba ulangi dengan format yang lebih jelas.";
    }

    try {
        const txData = JSON.parse(jsonMatch[0]);

        // Validate required fields
        if (!txData.type || !txData.amount) {
            throw new Error("Data transaksi tidak lengkap (type atau amount tidak ada)");
        }

        // Handle Transfer
        if (txData.type === 'transfer') {
            if (!txData.accountId || !txData.toAccountId) {
                throw new Error("Transfer butuh accountId (sumber) dan toAccountId (tujuan)");
            }

            const fromAcc = accounts.find(a => a.id === txData.accountId);
            const toAcc = accounts.find(a => a.id === txData.toAccountId);

            if (!fromAcc || !toAcc) {
                throw new Error("Akun sumber atau tujuan tidak ditemukan");
            }

            // Check sufficient balance
            const fromBalance = calculateAccountBalance(fromAcc, transactions);
            if (fromBalance < txData.amount) {
                showNotification(`Saldo ${ fromAcc.name } tidak cukup(Rp${ fromBalance.toLocaleString('id-ID') })`, 'error');
                return `Gagal transfer: Saldo ${ fromAcc.name } tidak cukup.`;
            }

            // Execute transfer (2 transactions)
            await addTransaction({
                ...txData,
                type: 'expense',
                accountId: txData.accountId,
                description: `Transfer ke ${ toAcc.name } `,
                category: 'Transfer'
            });
            await addTransaction({
                ...txData,
                type: 'income',
                accountId: txData.toAccountId,
                description: `Transfer dari ${ fromAcc.name } `,
                category: 'Transfer'
            });

            const successMsg = `✅ Berhasil transfer Rp${ txData.amount.toLocaleString('id-ID') } dari ${ fromAcc.name } ke ${ toAcc.name }.`;
            showNotification(successMsg, 'success');
            return successMsg;
        }

        // Handle Income/Expense
        if (txData.type === 'income' || txData.type === 'expense') {
            if (!txData.accountId) {
                // Default to first account if not specified
                txData.accountId = accounts[0]?.id;
            }

            await addTransaction(txData);

            const dateInfo = txData.date === isoDate ? "hari ini" : `tanggal ${ txData.date } `;
            const itemCount = txData.items?.length ? ` (${ txData.items.length } item)` : "";
            const successMsg = `✅ ${ txData.description } Rp${ txData.amount.toLocaleString('id-ID') } dicatat untuk ${ dateInfo }${ itemCount }.`;
            
            showNotification(successMsg, 'success');
            return successMsg;
        }

        throw new Error("Tipe transaksi tidak valid");

    } catch (error: any) {
        console.error("[AI] Transaction parsing error:", error);
        const errMsg = `❌ ${ error.message } `;
        showNotification(errMsg, 'error');
        return errMsg;
    }
};

// Helper: Calculate account balance
const calculateAccountBalance = (account: any, transactions: any[]): number => {
    const accTx = transactions.filter(t => t.accountId === account.id);
    const income = accTx.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
    const expense = accTx.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
    return (account.balance || 0) + income - expense;
};

// --- 7. EXPORT ---
export {
    processAIInput,
    classifyIntent,
    AI_CONFIG,
    PROMPTS
};
