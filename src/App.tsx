import { useState, useEffect, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import {
    getAuth,
    signInWithPopup,
    GoogleAuthProvider,
    onAuthStateChanged,
    signOut,
    User
} from 'firebase/auth';
import {
    getFirestore,
    collection,
    addDoc,
    updateDoc,
    deleteDoc,
    doc,
    onSnapshot,
    query,
    orderBy
} from 'firebase/firestore';
import {
    LayoutDashboard,
    MessageSquare,
    Receipt,
    Wallet,
    TrendingUp,
    Mic,
    X,
    Send,
    LogOut,
    Volume2,
    VolumeX,
    History,
    PieChart as PieChartIcon,
    Settings,
    Moon,
    Sun,
    Trash2,
    Calendar,
    Plus,
    Edit,
    Save,
    ShoppingBag,
    Bot,
    Camera,
    Image as ImageIcon,
    CheckCircle2,
    AlertCircle,
    Info,
    Activity
} from 'lucide-react';
import {
    PieChart,
    Pie,
    Cell,
    ResponsiveContainer,
    Tooltip,
    BarChart,
    Bar,
    XAxis,
    AreaChart,
    Area
} from 'recharts';

// --- Configuration ---
const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const provider = new GoogleAuthProvider();

const OPENROUTER_API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY;
const APP_ID = 'finai-assist-pwa';

interface TransactionItem {
    name: string;
    qty: number;
    price: number;
}

interface Account {
    id: string;
    name: string;              // "BCA Tabungan", "GoPay", "Cash"
    type: 'bank' | 'ewallet' | 'cash' | 'credit_card';
    provider: string;          // "BCA", "GoPay", "OVO", "Dana", "ShopeePay"
    accountNumber?: string;    // optional, can be masked
    balance: number;           // manual balance
    color: string;             // for UI card (#0060AF for BCA, etc)
    icon: string;              // provider icon emoji or name
    isActive: boolean;
    createdAt: number;
}

interface Transaction {
    id: string;
    type: 'income' | 'expense';
    amount: number;
    category: string;
    description: string;
    timestamp: number;
    date: string;
    items?: TransactionItem[];
    merchant?: string;
    accountId: string;         // reference to account
    toAccountId?: string;      // for transfers between accounts
}

interface Message {
    id: number;
    role: 'user' | 'ai';
    content: string;
    imageUrl?: string;
}

interface Notification {
    id: number;
    message: string;
    type: 'success' | 'error' | 'info';
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];
const CATEGORIES = ['Makan', 'Transport', 'Belanja', 'Tagihan', 'Hiburan', 'Lainnya', 'Gaji', 'Bonus'];

// --- Helper: Compress Image ---
const compressImage = (base64Str: string, maxWidth = 800, quality = 0.6): Promise<string> => {
    return new Promise((resolve) => {
        const img = new Image();
        img.src = `data:image/jpeg;base64,${base64Str}`;
        img.onload = () => {
            const canvas = document.createElement('canvas');
            let width = img.width;
            let height = img.height;

            if (width > maxWidth) {
                height = Math.round((height * maxWidth) / width);
                width = maxWidth;
            }

            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx?.drawImage(img, 0, 0, width, height);
            resolve(canvas.toDataURL('image/jpeg', quality).split(',')[1]);
        };
        img.onerror = () => resolve(base64Str); // Fallback
    });
};

// --- Helper: Sanitize text for TTS ---
const sanitizeForTTS = (text: string): string => {
    return text
        .replace(/\*\*(.*?)\*\*/g, '$1') // remove markdown bold
        .replace(/[{}[\]"]/g, '') // remove JSON artifacts
        .replace(/Rp\s?/g, 'Rupiah ') // speak currency
        .replace(/\d{1,3}(\.\d{3})+/g, (match) => match.replace(/\./g, '')) // flatten thousands
        .replace(/[#*_~`]/g, '') // remove markdown symbols
        .replace(/\s+/g, ' ').trim();
};

// --- Helper: Format AI message with basic markdown ---
const FormattedMessage = ({ content, isUser }: { content: string; isUser: boolean }) => {
    if (isUser) return <p className="text-sm font-medium leading-relaxed whitespace-pre-wrap">{content}</p>;

    const formatText = (text: string) => {
        return text
            .split('\n')
            .map((line) => {
                // Bold: **text**
                let f = line.replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold">$1</strong>');
                // Italic: *text*
                f = f.replace(/\*(.*?)\*/g, '<em>$1</em>');
                // Bullet points
                if (f.match(/^\s*[-•]\s/)) {
                    f = `<div class="flex gap-2 ml-1"><span class="text-indigo-400">•</span><span>${f.replace(/^\s*[-•]\s/, '')}</span></div>`;
                }
                // Numbered list
                const numMatch = f.match(/^\s*(\d+)\.\s(.*)/);
                if (numMatch) {
                    f = `<div class="flex gap-2 ml-1"><span class="text-indigo-400 font-bold">${numMatch[1]}.</span><span>${numMatch[2]}</span></div>`;
                }
                // Empty line = spacing
                if (f.trim() === '') return '<div class="h-2"></div>';
                return f;
            })
            .join('<br/>')
            .replace(/(<br\/>){3,}/g, '<br/><br/>'); // collapse excessive breaks
    };

    return (
        <div
            className="text-sm font-medium leading-relaxed"
            dangerouslySetInnerHTML={{ __html: formatText(content) }}
        />
    );
};

export default function App() {
    const [user, setUser] = useState<User | null>(null);
    const [activeTab, setActiveTab] = useState('dashboard');
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [accounts, setAccounts] = useState<Account[]>([]);
    const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [inputMessage, setInputMessage] = useState("");

    // AI & Voice State
    const [showAiMenu, setShowAiMenu] = useState(false);
    const [aiMode, setAiMode] = useState<'text' | 'voice' | null>(null);
    const [isListening, setIsListening] = useState(false);
    const [isVoiceEnabled, setIsVoiceEnabled] = useState(true);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [selectedImage, setSelectedImage] = useState<string | null>(null);

    // Filters & Modal State
    const [filterMonth, setFilterMonth] = useState(new Date().toISOString().slice(0, 7));
    const [filterCategory, setFilterCategory] = useState('All');
    const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
    const [showAccountManager, setShowAccountManager] = useState(false);
    const [accountForm, setAccountForm] = useState<Partial<Account> | null>(null);

    // UI Feedback State
    const [notification, setNotification] = useState<Notification | null>(null);
    const [confirmation, setConfirmation] = useState<{ isOpen: boolean; message: string; onConfirm: () => void } | null>(null);

    // Theme State
    const [isDarkMode, setIsDarkMode] = useState(() => {
        if (typeof window !== 'undefined') {
            return localStorage.getItem('theme') === 'dark' ||
                (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches);
        }
        return false;
    });

    const chatEndRef = useRef<HTMLDivElement>(null);
    const recognitionRef = useRef<any>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const processAIInputRef = useRef<(text: string, base64Override?: string | null) => void>();

    // --- Authentication ---
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
        });
        return () => unsubscribe();
    }, []);

    const handleLogin = async () => {
        try {
            await signInWithPopup(auth, provider);
        } catch (error) {
            console.error("Login Failed:", error);
            showNotification("Gagal masuk. Coba lagi nanti.", 'error');
        }
    };

    const handleLogout = () => signOut(auth);

    // --- Theme Logic ---
    useEffect(() => {
        if (isDarkMode) {
            document.documentElement.classList.add('dark');
            localStorage.setItem('theme', 'dark');
        } else {
            document.documentElement.classList.remove('dark');
            localStorage.setItem('theme', 'light');
        }
    }, [isDarkMode]);

    const toggleTheme = () => setIsDarkMode(!isDarkMode);

    // --- UI Helpers ---
    const showNotification = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
        setNotification({ id: Date.now(), message, type });
        setTimeout(() => setNotification(null), 3000);
    };

    // --- Firestore Data ---
    useEffect(() => {
        if (!user) return;
        const q = query(
            collection(db, 'artifacts', APP_ID, 'users', user.uid, 'transactions'),
            orderBy('timestamp', 'desc')
        );
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Transaction[];
            setTransactions(data);
        });
        return () => unsubscribe();
    }, [user]);

    // --- Fetch Accounts (Real-time) ---
    useEffect(() => {
        if (!user) return;
        const q = query(
            collection(db, 'artifacts', APP_ID, 'users', user.uid, 'accounts'),
            orderBy('createdAt', 'asc')
        );
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Account[];
            setAccounts(data);

            // Auto-create default account if absolutely no accounts exist (first run)
            if (data.length === 0) {
                ensureDefaultAccount();
            }

            // Auto-select first active account if none selected
            if (!selectedAccountId && data.length > 0) {
                const firstActive = data.find(a => a.isActive);
                if (firstActive) setSelectedAccountId(firstActive.id);
            }
        });
        return () => unsubscribe();
    }, [user, selectedAccountId]);

    // --- Scroll to bottom of chat ---
    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, aiMode]);

    // --- TTS Logic ---
    const speak = (text: string) => {
        if (!window.speechSynthesis || !isVoiceEnabled) return;

        window.speechSynthesis.cancel();
        setIsSpeaking(true);

        const cleaned = sanitizeForTTS(text);
        const utterance = new SpeechSynthesisUtterance(cleaned);
        utterance.lang = 'id-ID';
        utterance.rate = 1.0;

        const voices = window.speechSynthesis.getVoices();
        const idVoice = voices.find(v => v.lang.includes('id'));
        if (idVoice) utterance.voice = idVoice;

        utterance.onend = () => {
            setIsSpeaking(false);
            // Auto-listen after TTS finishes in voice mode
            if (aiMode === 'voice') {
                setTimeout(() => startListening(), 500);
            }
        };
        utterance.onerror = () => setIsSpeaking(false);

        window.speechSynthesis.speak(utterance);
    };

    // --- Speech Recognition Setup ---
    useEffect(() => {
        if ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window) {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            recognitionRef.current = new SpeechRecognition();
            recognitionRef.current.continuous = false;
            recognitionRef.current.lang = 'id-ID';
            recognitionRef.current.interimResults = false;

            recognitionRef.current.onstart = () => {
                console.log('[Voice] Recognition started');
            };

            recognitionRef.current.onresult = (event: any) => {
                const transcript = event.results[0][0].transcript;
                console.log('[Voice] Transcript:', transcript);
                // Use ref to avoid stale closure
                processAIInputRef.current?.(transcript);
                setTimeout(() => setInputMessage(''), 100);
            };

            recognitionRef.current.onerror = (event: any) => {
                console.error('[Voice] Error:', event.error);
                setIsListening(false);
                if (event.error === 'not-allowed') {
                    showNotification("Mikrofon diblokir! Klik ikon gembok di URL bar → Izinkan Mikrofon → Refresh", 'error');
                } else if (event.error === 'no-speech') {
                    showNotification("Tidak ada suara terdeteksi", 'info');
                } else if (event.error !== 'aborted') {
                    showNotification(`Error mikrofon: ${event.error}`, 'error');
                }
            };

            recognitionRef.current.onend = () => {
                setIsListening(false);
            };

            if (window.location.protocol === 'http:' && window.location.hostname !== 'localhost') {
                showNotification('Voice chat memerlukan HTTPS.', 'error');
            }
        } else {
            showNotification('Browser tidak mendukung voice recognition', 'error');
        }
    }, []);

    // Triggered by USER GESTURE ONLY
    const startListening = async () => {
        console.log('[Voice] startListening called');
        console.log('[Voice] recognitionRef.current:', !!recognitionRef.current);
        console.log('[Voice] isListening:', isListening);

        if (!recognitionRef.current) {
            console.error('[Voice] No recognition object!');
            showNotification("Browser tidak mendukung voice recognition", 'error');
            return;
        }

        if (isListening) {
            console.log('[Voice] Stopping...');
            recognitionRef.current.stop();
            setIsListening(false);
            return;
        }

        // CRITICAL: Request microphone permission EXPLICITLY first
        try {
            console.log('[Voice] Requesting microphone permission...');
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            console.log('[Voice] Permission granted! Stream:', stream);

            // Stop the stream immediately (we just needed permission)
            stream.getTracks().forEach(track => track.stop());
            console.log('[Voice] Stream stopped, now starting recognition...');

            // Now start SpeechRecognition
            recognitionRef.current.start();
            console.log('[Voice] Recognition start command sent');
            setIsListening(true);
        } catch (e: any) {
            console.error('[Voice] Permission/Start error:', e);
            console.error('[Voice] Error name:', e.name);
            console.error('[Voice] Error message:', e.message);

            if (e.name === 'NotAllowedError') {
                showNotification("Mikrofon ditolak. Coba refresh halaman dan izinkan lagi.", 'error');
            } else if (e.name === 'NotFoundError') {
                showNotification("Mikrofon tidak ditemukan di perangkat ini", 'error');
            } else if (e.message && e.message.includes('already started')) {
                console.log('[Voice] Already started, just updating state');
                setIsListening(true);
            } else {
                showNotification(`Error: ${e.message || e.name}`, 'error');
            }
        }
    };

    // --- Image Handling ---
    const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = async () => {
                const base64 = reader.result as string;
                const rawBase64 = base64.split(',')[1];
                const compressed = await compressImage(rawBase64);
                setSelectedImage(compressed);
                showNotification("Gambar berhasil dimuat", 'success');
            };
            reader.readAsDataURL(file);
        }
    };

    // --- AI Logic ---
    const processAIInput = async (text: string, base64Override: string | null = null) => {
        if (!user) return;
        setIsProcessing(true);

        const imageToSend = base64Override || selectedImage;
        const msgContent = text || (imageToSend ? "Menganalisa gambar..." : "...");

        const userMsg: Message = {
            role: 'user',
            content: msgContent,
            id: Date.now(),
            imageUrl: imageToSend ? `data:image/jpeg;base64,${imageToSend}` : undefined
        };
        setMessages(prev => [...prev, userMsg]);
        setSelectedImage(null);

        const today = new Date();
        const dateString = today.toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
        const isoDate = today.toISOString().split('T')[0];

        // RAG Context
        const recentTx = transactions.slice(0, 20).map(t =>
            `- ${t.date.split('T')[0]}: ${t.type} Rp${t.amount} (${t.category}) - ${t.description}`
        ).join('\n');

        const systemPrompt = `Anda adalah FinAI, asisten keuangan pribadi.
        Hari ini: ${dateString} (${isoDate}).
        
        Data Keuangan User (20 Transaksi Terakhir):
        ${recentTx}
        
        Tugas:
        1. Jika input adalah data transaksi (teks atau gambar struk):
           - Ekstrak JSON: { 
               "type": "expense"|"income", 
               "amount": number, 
               "category": string, 
               "description": string,
               "date": "YYYY-MM-DD", 
               "merchant": string (nama toko jika ada),
               "items": [{ "name": string, "qty": number, "price": number }]
             }
           - PENTING: Perhatikan kata kunci waktu ("kemarin", "lusa", "tanggal 10") dalam TEKS untuk menentukan field "date". Jika hanya gambar, gunakan tanggal di struk (jika ada) atau hari ini.
           - Default date: hari ini (${isoDate}).
        2. Jika user bertanya (misal: "Total belanja kemarin?"), hitung dari data diatas dan jawab verbal (JANGAN JSON).
        3. Gunakan Bahasa Indonesia yang ramah.`;

        let userContent: any = text;
        if (imageToSend) {
            userContent = [
                { "type": "text", "text": text || "Tolong catat transaksi dari gambar ini." },
                { "type": "image_url", "image_url": { "url": `data:image/jpeg;base64,${imageToSend}` } }
            ];
        }

        try {
            const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
                    "HTTP-Referer": window.location.origin,
                    "X-Title": "FinAI Assistant",
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    "model": "google/gemini-2.0-flash-001",
                    "messages": [
                        { "role": "system", "content": systemPrompt },
                        { "role": "user", "content": userContent }
                    ]
                })
            });

            const result = await response.json();
            console.log('[AI] Response status:', response.status, 'Result:', JSON.stringify(result).slice(0, 500));

            if (!response.ok || result.error) {
                const errorDetail = result.error?.message || result.error?.code || JSON.stringify(result.error) || `HTTP ${response.status}`;
                console.error('[AI] API Error:', errorDetail);
                const errMsg = `⚠️ Error AI: ${errorDetail}`;
                setMessages(prev => [...prev, { role: 'ai', content: errMsg, id: Date.now() + 1 }]);
                showNotification(errMsg, 'error');
                if (aiMode === 'voice') speak(errMsg);
                setIsProcessing(false);
                setIsListening(false);
                return;
            }

            const aiText = result.choices?.[0]?.message?.content || "Maaf, saya tidak mengerti.";

            const jsonMatch = aiText.match(/\{[\s\S]*\}/);
            let finalContent = aiText;

            if (jsonMatch) {
                try {
                    const txData = JSON.parse(jsonMatch[0]);
                    if ((txData.type === 'income' || txData.type === 'expense') && txData.amount) {
                        await addTransaction({ ...txData });
                        const dateInfo = txData.date === isoDate ? "hari ini" : `tanggal ${txData.date}`;
                        const itemCount = txData.items ? `${txData.items.length} item` : "";
                        finalContent = `Siap! ${txData.description} Rp${formatCurrency(txData.amount)} berhasil dicatat (${dateInfo}). ${itemCount}`;
                    }
                } catch (e) {
                    console.error("JSON Parse Error", e);
                    finalContent = "Saya mendeteksi transaksi, tapi formatnya membingungkan.";
                }
            }

            setMessages(prev => [...prev, { role: 'ai', content: finalContent, id: Date.now() + 1 }]);

            // Auto-speak ONLY in voice mode
            if (aiMode === 'voice') {
                speak(finalContent);
            }

        } catch (error) {
            console.error("AI Error:", error);
            const errMsg = "Maaf, ada gangguan koneksi ke otak AI saya.";
            setMessages(prev => [...prev, { role: 'ai', content: errMsg, id: Date.now() + 1 }]);
            showNotification(errMsg, 'error');
            if (aiMode === 'voice') speak(errMsg);
        }

        setIsProcessing(false);
        setIsListening(false);
    };

    // Keep ref in sync with latest processAIInput
    processAIInputRef.current = processAIInput;

    const addTransaction = async (data: any) => {
        if (!user) return;
        const txDate = data.date ? new Date(data.date) : new Date();
        const isoDate = data.date || new Date().toISOString();

        // Use provided accountId or default to selectedAccountId or first active account
        const accountId = data.accountId || selectedAccountId || accounts.find(a => a.isActive)?.id || 'default-cash';

        await addDoc(collection(db, 'artifacts', APP_ID, 'users', user.uid, 'transactions'), {
            ...data,
            accountId,
            date: isoDate.includes('T') ? isoDate : `${isoDate}T${new Date().toTimeString().split(' ')[0]}`,
            timestamp: txDate.getTime()
        });
        showNotification("Transaksi tersimpan!", 'success');
    };

    // Updated delete flow with Custom Confirm Modal
    const confirmDeleteTransaction = (id: string) => {
        setConfirmation({
            isOpen: true,
            message: "Apakah Anda yakin ingin menghapus transaksi ini?",
            onConfirm: () => {
                deleteTransaction(id);
                setConfirmation(null);
            }
        });
    };

    const deleteTransaction = async (id: string) => {
        if (!user) return;
        await deleteDoc(doc(db, 'artifacts', APP_ID, 'users', user.uid, 'transactions', id));
        if (selectedTransaction?.id === id) setSelectedTransaction(null);
        showNotification("Transaksi dihapus.", 'success');
    };

    // --- Account Management Functions ---
    const createAccount = async (accountData: Omit<Account, 'id' | 'createdAt'>) => {
        if (!user) return;
        await addDoc(collection(db, 'artifacts', APP_ID, 'users', user.uid, 'accounts'), {
            ...accountData,
            createdAt: Date.now()
        });
        showNotification(`Akun ${accountData.name} berhasil ditambahkan!`, 'success');
    };

    const updateAccount = async (id: string, updates: Partial<Account>) => {
        if (!user) return;
        await updateDoc(doc(db, 'artifacts', APP_ID, 'users', user.uid, 'accounts', id), updates);
        showNotification("Akun berhasil diupdate!", 'success');
    };

    const deleteAccount = async (id: string) => {
        if (!user) return;
        // Check if there are transactions linked to this account
        const linkedTx = transactions.filter(t => t.accountId === id);
        if (linkedTx.length > 0) {
            showNotification(`Tidak bisa hapus akun dengan ${linkedTx.length} transaksi terkait.`, 'error');
            return;
        }
        await deleteDoc(doc(db, 'artifacts', APP_ID, 'users', user.uid, 'accounts', id));
        if (selectedAccountId === id) setSelectedAccountId(null);
        showNotification("Akun dihapus.", 'success');
    };

    // Create default "Cash" account if none exist
    const ensureDefaultAccount = async () => {
        if (!user || accounts.length > 0) return;
        await createAccount({
            name: 'Tunai',
            type: 'cash',
            provider: 'Cash',
            balance: 0,
            color: '#10b981',
            icon: '💵',
            isActive: true
        });
    };

    // Auto-create default account on first login


    const formatCurrency = (val: number) => Number(val || 0).toLocaleString('id-ID');

    // --- Helper Functions ---
    const getExpensesByCategory = () => {
        const expenses = transactions.filter(t => t.type === 'expense');
        const grouped: { [key: string]: number } = {};
        expenses.forEach(t => { grouped[t.category] = (grouped[t.category] || 0) + t.amount; });
        return Object.keys(grouped).map(k => ({ name: k, value: grouped[k] }));
    };

    const getLast6MonthsData = () => {
        return transactions.slice(0, 6).reverse().map(t => ({
            name: t.date.substring(5, 10),
            amount: t.amount,
            type: t.type
        }));
    };

    const openAiMenu = () => {
        setShowAiMenu(true);
    };

    const openVoiceChat = () => {
        setShowAiMenu(false);
        setAiMode('voice');
        setActiveTab('ai');
        // No auto-speak to preserve user gesture for mic permission
    };

    const openTextChat = () => {
        setShowAiMenu(false);
        setAiMode('text');
        setActiveTab('ai');
    };

    const filteredTransactions = transactions.filter(t => {
        const matchesMonth = t.date.startsWith(filterMonth);
        const matchesCategory = filterCategory === 'All' || t.category === filterCategory;
        return matchesMonth && matchesCategory;
    });

    const groupedTransactions = filteredTransactions.reduce((groups, tx) => {
        const date = tx.date.split('T')[0];
        if (!groups[date]) groups[date] = [];
        groups[date].push(tx);
        return groups;
    }, {} as { [key: string]: Transaction[] });


    if (!user) {
        return (
            <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
                {/* Notification Toast (for Login specific errors if any) */}
                {notification && (
                    <div className={`fixed top-6 left-1/2 -translate-x-1/2 z-[300] flex items-center gap-3 px-6 py-3 rounded-full shadow-xl animate-in fade-in slide-in-from-top-4 ${notification.type === 'success' ? 'bg-emerald-500 text-white' :
                        notification.type === 'error' ? 'bg-rose-500 text-white' : 'bg-indigo-600 text-white'
                        }`}>
                        {notification.type === 'success' ? <CheckCircle2 size={18} /> :
                            notification.type === 'error' ? <AlertCircle size={18} /> : <Info size={18} />}
                        <span className="font-bold text-sm">{notification.message}</span>
                    </div>
                )}
                <div className="w-24 h-24 bg-indigo-600 rounded-3xl flex items-center justify-center shadow-indigo-300 shadow-xl mb-8">
                    <span className="text-4xl text-white font-black">F</span>
                </div>
                <h1 className="text-3xl font-black text-slate-900 mb-2">FinAI Assistant</h1>
                <p className="text-slate-500 mb-10 max-w-xs">Kelola keuangan Anda dengan bantuan AI pintar.</p>
                <button onClick={handleLogin} className="flex items-center gap-3 bg-white border border-slate-200 px-6 py-4 rounded-2xl shadow-sm hover:shadow-md transition-all active:scale-95">
                    <span className="font-bold text-slate-700">Masuk dengan Google</span>
                </button>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-screen max-w-md mx-auto bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white font-sans overflow-hidden border-x border-slate-200 dark:border-slate-800 transition-colors duration-300 relative">

            {/* --- UI OVERLAYS --- */}

            {/* Notification Toast */}
            {notification && (
                <div className={`fixed top-6 left-1/2 -translate-x-1/2 z-[300] flex items-center gap-3 px-6 py-3 rounded-full shadow-2xl animate-in fade-in slide-in-from-top-4 duration-300 ${notification.type === 'success' ? 'bg-emerald-500 text-white' :
                    notification.type === 'error' ? 'bg-rose-500 text-white' : 'bg-indigo-600 text-white'
                    }`}>
                    {notification.type === 'success' ? <CheckCircle2 size={18} /> :
                        notification.type === 'error' ? <AlertCircle size={18} /> : <Info size={18} />}
                    <span className="font-bold text-sm">{notification.message}</span>
                </div>
            )}

            {/* Confirmation Modal */}
            {confirmation && (
                <div className="fixed inset-0 z-[400] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-xs p-6 rounded-[24px] shadow-2xl scale-100 animate-in zoom-in-95">
                        <div className="w-12 h-12 bg-rose-100 dark:bg-rose-900/30 text-rose-500 rounded-full flex items-center justify-center mb-4 mx-auto">
                            <AlertCircle size={24} />
                        </div>
                        <h3 className="text-center font-bold text-lg mb-2">Konfirmasi</h3>
                        <p className="text-center text-slate-500 text-sm mb-6">{confirmation.message}</p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setConfirmation(null)}
                                className="flex-1 py-3 rounded-xl font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
                            >
                                Batal
                            </button>
                            <button
                                onClick={confirmation.onConfirm}
                                className="flex-1 py-3 rounded-xl font-bold bg-rose-500 text-white hover:bg-rose-600 shadow-lg shadow-rose-200"
                            >
                                Ya, Hapus
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Hidden File Input for Camera */}
            <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="image/*"
                capture="environment"
                onChange={handleImageSelect}
            />

            {/* AI Menu Overlay */}
            {showAiMenu && (
                <div onClick={() => setShowAiMenu(false)} className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex flex-col items-center justify-end pb-24 animate-in fade-in">
                    <div className="w-full max-w-xs space-y-3 p-4">
                        <h3 className="text-white text-center font-bold mb-4 opacity-80">Pilih Metode Interaksi</h3>
                        <button onClick={openTextChat} className="w-full bg-white dark:bg-slate-900 p-6 rounded-3xl flex items-center gap-4 hover:scale-105 transition-all shadow-xl">
                            <div className="p-4 bg-indigo-100 dark:bg-indigo-900 rounded-2xl text-indigo-600">
                                <MessageSquare size={24} />
                            </div>
                            <div className="text-left">
                                <h4 className="font-black text-lg">Text Chat</h4>
                                <p className="text-xs text-slate-500">Ketik manual atau upload struk</p>
                            </div>
                        </button>
                        <button onClick={openVoiceChat} className="w-full bg-white dark:bg-slate-900 p-6 rounded-3xl flex items-center gap-4 hover:scale-105 transition-all shadow-xl">
                            <div className="p-4 bg-rose-100 dark:bg-rose-900 rounded-2xl text-rose-600">
                                <Mic size={24} />
                            </div>
                            <div className="text-left">
                                <h4 className="font-black text-lg">Voice Chat</h4>
                                <p className="text-xs text-slate-500">Bicara langsung dengan AI</p>
                            </div>
                        </button>
                    </div>
                </div>
            )}

            {/* Voice Mode Overlay */}
            {aiMode === 'voice' && activeTab === 'ai' && (
                <div className="fixed inset-0 z-[150] bg-black/90 backdrop-blur-xl flex flex-col items-center justify-center p-8 transition-all duration-500 animate-in fade-in">
                    <button onClick={() => { setAiMode('text'); setShowAiMenu(false); }} className="absolute top-10 right-6 p-2 text-white/50"><X size={32} /></button>
                    <div className="flex-1 flex flex-col items-center justify-center space-y-8">
                        <div>
                            {messages.length > 0 && messages[messages.length - 1].role === 'ai' && (
                                <p className="text-white/80 text-center max-w-xs text-lg font-medium animate-in slide-in-from-bottom">
                                    "{messages[messages.length - 1].content}"
                                </p>
                            )}
                        </div>

                        <div className="relative">
                            {isListening && (
                                <div className="absolute inset-0 bg-rose-500/30 rounded-full blur-3xl animate-pulse"></div>
                            )}
                            <button
                                onClick={startListening}
                                className={`relative z-10 w-24 h-24 rounded-full flex items-center justify-center shadow-2xl transition-all duration-300 ${isListening ? 'bg-rose-600 scale-110' : 'bg-slate-800 hover:bg-slate-700'}`}
                            >
                                <Mic size={40} className="text-white" />
                            </button>
                        </div>

                        <div className="flex items-center gap-4">
                            <p className="text-white/50 text-sm font-medium animate-pulse">
                                {isListening ? "Mendengarkan..." : "Ketuk mikrofon untuk bicara"}
                            </p>
                        </div>

                        <div className="flex gap-4 mt-8">
                            <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 px-6 py-3 bg-white/10 rounded-full text-white backdrop-blur-md border border-white/10 hover:bg-white/20">
                                <Camera size={20} />
                                <span className="text-sm font-bold">Foto Struk</span>
                            </button>
                        </div>

                        {selectedImage && (
                            <div className="absolute bottom-24 bg-white/10 p-2 rounded-xl border border-white/20">
                                <div className="text-xs text-white mb-1 flex items-center gap-2"><ImageIcon size={12} /> Gambar Siap</div>
                                <img src={`data:image/jpeg;base64,${selectedImage}`} className="w-16 h-16 object-cover rounded-lg opacity-80" />
                                <button onClick={() => processAIInput("")} className="mt-2 w-full bg-indigo-600 text-white text-xs py-2 rounded-lg font-bold">Kirim</button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Transaction Detail Modal */}
            {selectedTransaction && (
                <div className="fixed inset-0 z-[160] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-[32px] p-6 shadow-2xl animate-in slide-in-from-bottom duration-300 max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-start mb-6">
                            <div>
                                <h3 className="text-lg font-bold">Detail Transaksi</h3>
                                <p className="text-xs text-slate-400">{selectedTransaction.date.split('T')[0]}</p>
                            </div>
                            <button onClick={() => setSelectedTransaction(null)} className="p-2 bg-slate-100 dark:bg-slate-800 rounded-full"><X size={18} /></button>
                        </div>

                        <div className="text-center mb-8">
                            <div className={`w-16 h-16 mx-auto rounded-full flex items-center justify-center mb-4 ${selectedTransaction.type === 'income' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
                                {selectedTransaction.type === 'income' ? <Wallet size={32} /> : <ShoppingBag size={32} />}
                            </div>
                            <h2 className={`text-3xl font-black ${selectedTransaction.type === 'income' ? 'text-emerald-500' : 'text-rose-500'}`}>
                                {selectedTransaction.type === 'income' ? '+' : '-'} {formatCurrency(selectedTransaction.amount)}
                            </h2>
                            <p className="font-medium text-slate-500 mt-2">{selectedTransaction.description}</p>
                            {selectedTransaction.merchant && <p className="text-xs font-bold uppercase tracking-widest text-indigo-500 mt-1">{selectedTransaction.merchant}</p>}
                        </div>

                        {selectedTransaction.items && selectedTransaction.items.length > 0 && (
                            <div className="mb-6">
                                <h4 className="font-bold text-sm mb-3 flex items-center gap-2"><Receipt size={14} /> Item Belanja</h4>
                                <div className="space-y-2 bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl">
                                    {selectedTransaction.items.map((item, idx) => (
                                        <div key={idx} className="flex justify-between text-sm">
                                            <span>{item.qty}x {item.name}</span>
                                            <span className="font-bold text-slate-500">{formatCurrency(item.price * item.qty)}</span>
                                        </div>
                                    ))}
                                    <div className="border-t border-slate-200 dark:border-slate-700 mt-2 pt-2 flex justify-between font-bold">
                                        <span>Total</span>
                                        <span>{formatCurrency(selectedTransaction.amount)}</span>
                                    </div>
                                </div>
                            </div>
                        )}

                        <button
                            onClick={() => confirmDeleteTransaction(selectedTransaction.id)}
                            className="w-full py-4 rounded-2xl bg-rose-50 text-rose-500 font-bold hover:bg-rose-100 transition-colors flex items-center justify-center gap-2"
                        >
                            <Trash2 size={18} /> Hapus Transaksi
                        </button>
                    </div>
                </div>
            )}

            {/* Header */}
            <header className="px-6 pt-10 pb-4 flex justify-between items-center bg-white dark:bg-slate-950/50 backdrop-blur-sm sticky top-0 z-10 transition-colors duration-300">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-indigo-600 rounded-2xl flex items-center justify-center text-white font-bold shadow-lg shadow-indigo-200">F</div>
                    <div>
                        <h2 className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">FinAI Assistant</h2>
                        <h1 className="text-lg font-extrabold capitalize">{activeTab === 'ai' ? 'Asisten Cerdas' : (activeTab === 'transactions' ? 'Riwayat' : activeTab)}</h1>
                    </div>
                </div>
                <div className="flex gap-2">
                    <button onClick={() => setIsVoiceEnabled(!isVoiceEnabled)} className={`p-2.5 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl shadow-sm ${isVoiceEnabled ? 'text-indigo-600' : 'text-slate-400'}`}>
                        {isVoiceEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
                    </button>
                    <button onClick={handleLogout} className="p-2.5 bg-white text-rose-500 dark:bg-slate-900 border border-rose-100 dark:border-slate-800 rounded-xl shadow-sm"><LogOut size={18} /></button>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 overflow-y-auto px-6 pb-32 scrollbar-hide">
                {activeTab === 'dashboard' && (
                    <div className="space-y-6 pt-4">
                        {/* Balance Card */}
                        {/* Balance Card - Monthly */}
                        {(() => {
                            const now = new Date();
                            const currentMonth = now.toISOString().slice(0, 7);
                            const monthlyTx = transactions.filter(t => t.date.startsWith(currentMonth));
                            const monthIncome = monthlyTx.filter(t => t.type === 'income').reduce((a, t) => a + t.amount, 0);
                            const monthExpense = monthlyTx.filter(t => t.type === 'expense').reduce((a, t) => a + t.amount, 0);

                            // Calculate Total Balance: Sum of all accounts' initial balance + sum of all transactions
                            const totalInitialBalance = accounts.reduce((sum, acc) => sum + (acc.balance || 0), 0);
                            const totalTransactions = transactions.reduce((a, t) => a + (t.type === 'income' ? t.amount : -t.amount), 0);
                            const totalBalance = totalInitialBalance + totalTransactions;

                            // Today's spending
                            const todayStr = now.toISOString().split('T')[0];
                            const todayExpense = transactions.filter(t => t.date.startsWith(todayStr) && t.type === 'expense').reduce((a, t) => a + t.amount, 0);
                            const daysInMonth = now.getDate();
                            const dailyAvg = daysInMonth > 0 ? Math.round(monthExpense / daysInMonth) : 0;

                            // Health Score calculation
                            const savingRatio = monthIncome > 0 ? Math.round(((monthIncome - monthExpense) / monthIncome) * 100) : 0;
                            const healthScore = Math.max(0, Math.min(100, savingRatio > 0 ? Math.round(savingRatio * 1.5 + 25) : Math.max(0, 25 + savingRatio)));
                            const healthLabel = healthScore >= 80 ? 'Sangat Baik' : healthScore >= 60 ? 'Baik' : healthScore >= 40 ? 'Cukup' : healthScore >= 20 ? 'Kurang' : 'Buruk';
                            const healthColor = healthScore >= 60 ? 'text-emerald-500' : healthScore >= 40 ? 'text-amber-500' : 'text-rose-500';

                            // 7-day cashflow
                            const last7Days = Array.from({ length: 7 }, (_, i) => {
                                const d = new Date(now);
                                d.setDate(d.getDate() - (6 - i));
                                const ds = d.toISOString().split('T')[0];
                                const dayTx = transactions.filter(t => t.date.startsWith(ds));
                                const inc = dayTx.filter(t => t.type === 'income').reduce((a, t) => a + t.amount, 0);
                                const exp = dayTx.filter(t => t.type === 'expense').reduce((a, t) => a + t.amount, 0);
                                return { name: d.toLocaleDateString('id-ID', { weekday: 'short' }), income: inc, expense: exp, net: inc - exp };
                            });

                            return (
                                <>
                                    {/* Multi-Account Carousel & Balance */}
                                    <div className="flex overflow-x-auto gap-4 pb-4 -mx-6 px-6 snap-x scrollbar-hide">
                                        {/* Total Balance Card */}
                                        <div className="relative min-w-[85%] snap-center overflow-hidden bg-slate-900 dark:bg-indigo-600 p-8 rounded-[32px] text-white shadow-2xl transition-colors duration-300">
                                            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-3xl"></div>
                                            <div className="flex justify-between items-start mb-2">
                                                <p className="opacity-70 text-xs font-medium uppercase tracking-widest">Total Saldo</p>
                                                <button onClick={() => setShowAccountManager(true)} className="p-2 bg-white/10 rounded-full hover:bg-white/20 transition-colors">
                                                    <Settings size={16} />
                                                </button>
                                            </div>
                                            <h2 className="text-3xl font-black mb-1 tracking-tight">Rp {formatCurrency(totalBalance)}</h2>
                                            <p className="text-[10px] opacity-50 mb-6 font-medium">Semua Akun ({accounts.length})</p>
                                            <div className="flex gap-4">
                                                <div className="flex-1 bg-white/10 backdrop-blur-md p-3 rounded-2xl">
                                                    <p className="text-[10px] opacity-60 mb-1">Masuk</p>
                                                    <p className="font-bold text-sm text-emerald-300">+{formatCurrency(monthIncome)}</p>
                                                </div>
                                                <div className="flex-1 bg-white/10 backdrop-blur-md p-3 rounded-2xl">
                                                    <p className="text-[10px] opacity-60 mb-1">Keluar</p>
                                                    <p className="font-bold text-sm text-rose-300">-{formatCurrency(monthExpense)}</p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Individual Account Cards */}
                                        {accounts.map(acc => {
                                            // Calculate dynamic balance for this account
                                            const accTx = transactions.filter(t => t.accountId === acc.id);
                                            const accIncome = accTx.filter(t => t.type === 'income').reduce((a, t) => a + t.amount, 0);
                                            const accExpense = accTx.filter(t => t.type === 'expense').reduce((a, t) => a + t.amount, 0);
                                            const effectiveBalance = (acc.balance || 0) + accIncome - accExpense;

                                            return (
                                                <div
                                                    key={acc.id}
                                                    onClick={() => setSelectedAccountId(acc.id === selectedAccountId ? null : acc.id)}
                                                    className={`relative min-w-[75%] snap-center overflow-hidden p-6 rounded-[32px] text-white shadow-xl transition-all duration-300 border-2 ${selectedAccountId === acc.id ? 'ring-4 ring-offset-2 ring-indigo-500 border-transparent' : 'border-transparent scale-95 opacity-80'}`}
                                                    style={{ backgroundColor: acc.color }}
                                                >
                                                    <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -mr-10 -mt-10 blur-2xl"></div>
                                                    <div className="flex justify-between items-start mb-4">
                                                        <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center text-xl backdrop-blur-sm">
                                                            {acc.icon}
                                                        </div>
                                                        <div className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${selectedAccountId === acc.id ? 'bg-white text-slate-900' : 'bg-black/20 text-white'}`}>
                                                            {selectedAccountId === acc.id ? 'Aktif' : acc.type}
                                                        </div>
                                                    </div>
                                                    <p className="opacity-80 text-xs font-bold mb-1">{acc.provider}</p>
                                                    <h3 className="text-2xl font-black mb-1 tracking-tight">{acc.name}</h3>
                                                    <p className="text-sm font-medium opacity-90">Rp {formatCurrency(effectiveBalance)}</p>
                                                </div>
                                            );
                                        })}

                                        {/* Add Account Button */}
                                        <div className="min-w-[20%] snap-center flex items-center justify-center">
                                            <button
                                                onClick={() => { setShowAccountManager(true); setAccountForm({ type: 'bank', color: '#6366f1', icon: '🏦', balance: 0, isActive: true }); }}
                                                className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 hover:bg-indigo-100 hover:text-indigo-600 transition-colors shadow-sm"
                                            >
                                                <Plus size={24} />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Today + Health Score Row */}
                                    <div className="grid grid-cols-2 gap-3">
                                        {/* Today's Spending */}
                                        <div className="bg-white dark:bg-slate-900 p-5 rounded-[24px] border border-slate-100 dark:border-slate-800 shadow-sm">
                                            <div className="flex items-center gap-2 mb-2">
                                                <Calendar size={14} className="text-slate-400" />
                                                <p className="text-[10px] text-slate-500 font-bold uppercase">Hari Ini</p>
                                            </div>
                                            <h3 className="text-lg font-black text-rose-500">-{formatCurrency(todayExpense)}</h3>
                                            <div className="mt-2 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                                <div
                                                    className={`h-full rounded-full transition-all ${todayExpense > dailyAvg ? 'bg-rose-500' : 'bg-emerald-500'}`}
                                                    style={{ width: `${Math.min(100, dailyAvg > 0 ? (todayExpense / dailyAvg) * 100 : 0)}%` }}
                                                />
                                            </div>
                                            <p className="text-[9px] text-slate-400 mt-1">Rata-rata: {formatCurrency(dailyAvg)}/hari</p>
                                        </div>

                                        {/* Real Health Score */}
                                        <div className="bg-white dark:bg-slate-900 p-5 rounded-[24px] border border-slate-100 dark:border-slate-800 shadow-sm">
                                            <div className="flex items-center gap-2 mb-2">
                                                <Activity size={14} className="text-slate-400" />
                                                <p className="text-[10px] text-slate-500 font-bold uppercase">Skor Keuangan</p>
                                            </div>
                                            <h3 className={`text-2xl font-black ${healthColor}`}>{healthScore}</h3>
                                            <p className={`text-[10px] font-bold ${healthColor}`}>{healthLabel}</p>
                                            <p className="text-[9px] text-slate-400 mt-1">Saving: {savingRatio}%</p>
                                        </div>
                                    </div>

                                    {/* 7-Day Cashflow */}
                                    <div className="bg-white dark:bg-slate-900 p-5 rounded-[24px] border border-slate-100 dark:border-slate-800 shadow-sm">
                                        <div className="flex items-center justify-between mb-3">
                                            <div className="flex items-center gap-2">
                                                <TrendingUp size={14} className="text-slate-400" />
                                                <p className="text-xs font-bold">Arus Kas 7 Hari</p>
                                            </div>
                                            <p className={`text-xs font-black ${last7Days.reduce((a, d) => a + d.net, 0) >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                                {last7Days.reduce((a, d) => a + d.net, 0) >= 0 ? '+' : ''}{formatCurrency(last7Days.reduce((a, d) => a + d.net, 0))}
                                            </p>
                                        </div>
                                        <div className="h-24">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <AreaChart data={last7Days}>
                                                    <defs>
                                                        <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                                                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                                                            <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                                        </linearGradient>
                                                        <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                                                            <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3} />
                                                            <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
                                                        </linearGradient>
                                                    </defs>
                                                    <XAxis dataKey="name" fontSize={9} tickLine={false} axisLine={false} />
                                                    <Tooltip formatter={(v: any) => formatCurrency(Number(v))} />
                                                    <Area type="monotone" dataKey="income" stroke="#10b981" fill="url(#colorIncome)" strokeWidth={2} />
                                                    <Area type="monotone" dataKey="expense" stroke="#f43f5e" fill="url(#colorExpense)" strokeWidth={2} />
                                                </AreaChart>
                                            </ResponsiveContainer>
                                        </div>
                                        <div className="flex gap-4 mt-2 justify-center">
                                            <span className="text-[9px] text-emerald-500 flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500"></span> Pemasukan</span>
                                            <span className="text-[9px] text-rose-500 flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-rose-500"></span> Pengeluaran</span>
                                        </div>
                                    </div>

                                    {/* Quick Actions */}
                                    <div className="grid grid-cols-4 gap-2">
                                        <button onClick={() => fileInputRef.current?.click()} className="flex flex-col items-center gap-2 p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-md active:scale-95 transition-all">
                                            <Camera size={20} className="text-indigo-500" />
                                            <span className="text-[9px] font-bold text-slate-500">Scan Struk</span>
                                        </button>
                                        <button onClick={openTextChat} className="flex flex-col items-center gap-2 p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-md active:scale-95 transition-all">
                                            <MessageSquare size={20} className="text-emerald-500" />
                                            <span className="text-[9px] font-bold text-slate-500">Chat AI</span>
                                        </button>
                                        <button onClick={openVoiceChat} className="flex flex-col items-center gap-2 p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-md active:scale-95 transition-all">
                                            <Mic size={20} className="text-rose-500" />
                                            <span className="text-[9px] font-bold text-slate-500">Voice</span>
                                        </button>
                                        <button onClick={() => setActiveTab('reports')} className="flex flex-col items-center gap-2 p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-md active:scale-95 transition-all">
                                            <PieChartIcon size={20} className="text-amber-500" />
                                            <span className="text-[9px] font-bold text-slate-500">Laporan</span>
                                        </button>
                                    </div>
                                </>
                            );
                        })()}

                        {/* Recent History */}
                        <div className="space-y-4">
                            <div className="flex justify-between items-center px-1">
                                <h3 className="font-black text-lg">Transaksi Terakhir</h3>
                                <button onClick={() => setActiveTab('transactions')} className="text-indigo-600 text-xs font-bold">Lihat Semua</button>
                            </div>
                            <div className="space-y-3">
                                {transactions.slice(0, 4).map(tx => (
                                    <div
                                        key={tx.id}
                                        onClick={() => setSelectedTransaction(tx)}
                                        className="group bg-white dark:bg-slate-900 hover:bg-slate-900 hover:text-white dark:hover:bg-white dark:hover:text-slate-950 p-4 rounded-3xl flex items-center justify-between border border-slate-100 dark:border-slate-800 transition-all duration-300 shadow-sm cursor-pointer"
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className={`p-3 rounded-2xl ${tx.type === 'income' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'} group-hover:bg-white/20 group-hover:text-white`}>
                                                {tx.type === 'income' ? <Wallet size={20} /> : <Receipt size={20} />}
                                            </div>
                                            <div className="max-w-[120px]">
                                                <p className="font-bold text-sm truncate">{tx.description}</p>
                                                <p className="text-[10px] opacity-50 uppercase font-bold tracking-tighter">{tx.category} • {tx.date.split('T')[0]}</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className={`font-black ${tx.type === 'income' ? 'text-emerald-500' : 'text-rose-500'} group-hover:text-white`}>
                                                {tx.type === 'income' ? '+' : '-'} {formatCurrency(tx.amount)}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* Reports Tab */}
                {activeTab === 'reports' && (
                    <div className="space-y-6 pt-4">
                        <div className="bg-white dark:bg-slate-900 p-6 rounded-[32px] shadow-sm border border-slate-100 dark:border-slate-800 transition-colors duration-300">
                            <h3 className="font-bold mb-4">Pengeluaran per Kategori</h3>
                            <div className="h-64">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={getExpensesByCategory()}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={60}
                                            outerRadius={80}
                                            fill="#8884d8"
                                            paddingAngle={5}
                                            dataKey="value"
                                        >
                                            {getExpensesByCategory().map((_, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                            <div className="grid grid-cols-2 gap-2 mt-4">
                                {getExpensesByCategory().map((entry, index) => (
                                    <div key={index} className="flex items-center gap-2 text-xs">
                                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                                        <span>{entry.name}: {formatCurrency(entry.value)}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="bg-white dark:bg-slate-900 p-6 rounded-[32px] shadow-sm border border-slate-100 dark:border-slate-800 transition-colors duration-300">
                            <h3 className="font-bold mb-4">Aktivitas Terakhir</h3>
                            <div className="h-48">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={getLast6MonthsData()}>
                                        <XAxis dataKey="name" fontSize={10} tickLine={false} axisLine={false} />
                                        <Tooltip />
                                        <Bar dataKey="amount" fill="#4f46e5" radius={[4, 4, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>
                )}

                {/* All Transactions Tab */}
                {activeTab === 'transactions' && (
                    <div className="space-y-4 pt-4">
                        {/* Filters */}
                        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                            <input
                                type="month"
                                value={filterMonth}
                                onChange={(e) => setFilterMonth(e.target.value)}
                                className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl px-3 py-2 text-xs font-bold"
                            />
                            <select
                                value={filterCategory}
                                onChange={(e) => setFilterCategory(e.target.value)}
                                className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl px-3 py-2 text-xs font-bold"
                            >
                                <option value="All">Semua Kategori</option>
                                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>

                        {Object.keys(groupedTransactions).length === 0 ? (
                            <div className="text-center py-20 opacity-50">
                                <p>Tidak ada transaksi pada periode ini.</p>
                            </div>
                        ) : (
                            Object.entries(groupedTransactions).map(([date, txs]) => (
                                <div key={date}>
                                    <h3 className="text-xs font-bold uppercase tracking-widest opacity-50 mb-3 px-2 flex items-center gap-2">
                                        <Calendar size={12} /> {date}
                                    </h3>
                                    <div className="space-y-3">
                                        {txs.map(tx => (
                                            <div
                                                key={tx.id}
                                                onClick={() => setSelectedTransaction(tx)}
                                                className="bg-white dark:bg-slate-900 p-4 rounded-3xl flex items-center justify-between border border-slate-100 dark:border-slate-800 shadow-sm transition-all active:scale-95 cursor-pointer"
                                            >
                                                <div className="flex items-center gap-4">
                                                    <div className={`p-3 rounded-2xl ${tx.type === 'income' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
                                                        {tx.type === 'income' ? <Wallet size={20} /> : <Receipt size={20} />}
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-sm">{tx.description}</p>
                                                        <p className="text-[10px] opacity-50">{tx.category}</p>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <p className={`font-black ${tx.type === 'income' ? 'text-emerald-500' : 'text-rose-500'}`}>
                                                        {tx.type === 'income' ? '+' : '-'} {formatCurrency(tx.amount)}
                                                    </p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}

                {/* Settings Tab */}
                {activeTab === 'settings' && (
                    <div className="space-y-6 pt-4">
                        <div className="bg-white dark:bg-slate-900 p-6 rounded-[32px] shadow-sm border border-slate-100 dark:border-slate-800">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-2xl">
                                        {isDarkMode ? <Moon size={24} /> : <Sun size={24} />}
                                    </div>
                                    <div>
                                        <p className="font-bold">Tema Aplikasi</p>
                                        <p className="text-xs opacity-50">{isDarkMode ? 'Mode Gelap' : 'Mode Terang'}</p>
                                    </div>
                                </div>
                                <button
                                    onClick={toggleTheme}
                                    className={`w-14 h-8 rounded-full p-1 transition-all ${isDarkMode ? 'bg-indigo-600' : 'bg-slate-200'}`}
                                >
                                    <div className={`w-6 h-6 bg-white rounded-full shadow-sm transition-all ${isDarkMode ? 'translate-x-6' : 'translate-x-0'}`}></div>
                                </button>
                            </div>
                        </div>
                    </div>
                )}


                {activeTab === 'ai' && aiMode === 'text' && (
                    <div className="h-full flex flex-col pt-4">
                        <div className="flex-1 overflow-y-auto space-y-4 pr-1 scrollbar-hide">
                            {messages.length === 0 && (
                                <div className="text-center py-20 px-10">
                                    <div className="w-20 h-20 bg-indigo-100 dark:bg-indigo-900/30 rounded-[32px] flex items-center justify-center mx-auto mb-6">
                                        <MessageSquare className="text-indigo-600" size={32} />
                                    </div>
                                    <h2 className="text-xl font-black mb-2">Halo! Saya FinAI</h2>
                                    <p className="text-sm text-slate-500">Menganalisa {transactions.length} data transaksi Anda. Tanyakan apa saja!</p>
                                </div>
                            )}
                            {messages.map(m => (
                                <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`max-w-[85%] p-5 rounded-3xl ${m.role === 'user' ? 'bg-indigo-600 text-white rounded-tr-none shadow-lg' : 'bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-tl-none shadow-sm'}`}>
                                        {m.imageUrl && (
                                            <img src={m.imageUrl} alt="Uploaded" className="mb-2 rounded-xl max-h-40 object-cover" />
                                        )}
                                        <FormattedMessage content={m.content} isUser={m.role === 'user'} />
                                    </div>
                                </div>
                            ))}
                            {isProcessing && <div className="text-xs text-indigo-500 font-bold animate-pulse">FinAI sedang berpikir...</div>}
                            {isSpeaking && !isProcessing && <div className="text-xs text-emerald-500 font-bold animate-pulse">🔊 FinAI sedang berbicara...</div>}
                            <div ref={chatEndRef} />
                        </div>

                        <div className="p-4 bg-white/50 dark:bg-slate-950/50 backdrop-blur-md">
                            {selectedImage && (
                                <div className="mb-2 flex items-center gap-2 p-2 bg-indigo-50 dark:bg-slate-800 rounded-xl">
                                    <img src={`data:image/jpeg;base64,${selectedImage}`} className="w-10 h-10 rounded-lg object-cover" />
                                    <span className="text-xs font-medium text-indigo-600">Gambar terpilih</span>
                                    <button onClick={() => setSelectedImage(null)} className="ml-auto p-1 text-slate-400"><X size={14} /></button>
                                </div>
                            )}
                            <div className="flex gap-2">
                                <button onClick={() => fileInputRef.current?.click()} className="p-3 bg-slate-100 dark:bg-slate-800 rounded-2xl text-slate-500 hover:text-indigo-600 transition-colors">
                                    <Camera size={20} />
                                </button>
                                <div className="flex-1 relative">
                                    <input
                                        className="w-full bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 px-5 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                                        placeholder="Ketik pesan..."
                                        value={inputMessage}
                                        onChange={e => setInputMessage(e.target.value)}
                                        onKeyDown={e => e.key === 'Enter' && (processAIInput(inputMessage), setInputMessage(""))}
                                    />
                                </div>
                                <button
                                    onClick={() => { processAIInput(inputMessage); setInputMessage(""); }}
                                    className="p-3 bg-indigo-600 text-white rounded-2xl shadow-lg shadow-indigo-200 hover:scale-105 active:scale-95 transition-all"
                                >
                                    <Send size={20} />
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </main>

            <nav className="fixed bottom-0 w-full max-w-md bg-white/90 dark:bg-slate-950/90 backdrop-blur-xl border-t border-slate-100 dark:border-slate-800 px-4 pt-3 pb-8 z-50 transition-colors duration-300">
                <div className="grid grid-cols-5 items-center">
                    <button onClick={() => setActiveTab('dashboard')} className={`flex flex-col items-center gap-1.5 transition-all ${activeTab === 'dashboard' ? 'text-indigo-600' : 'text-slate-400 opacity-60'}`}>
                        <LayoutDashboard size={20} className={activeTab === 'dashboard' ? 'scale-110' : ''} />
                    </button>
                    <button onClick={() => setActiveTab('transactions')} className={`flex flex-col items-center gap-1.5 transition-all ${activeTab === 'transactions' ? 'text-indigo-600' : 'text-slate-400 opacity-60'}`}>
                        <History size={20} />
                    </button>

                    {/* Central AI Button */}
                    <div className="flex justify-center -mt-10 relative">
                        <div className="absolute inset-0 bg-indigo-500/30 rounded-full blur-2xl animate-pulse"></div>
                        <button
                            onClick={openAiMenu}
                            className={`w-16 h-16 rounded-[24px] flex items-center justify-center shadow-2xl transition-all duration-300 hover:scale-110 active:scale-90 relative z-10 ${activeTab === 'ai' ? 'bg-indigo-600 text-white' : 'bg-slate-900 text-white'}`}
                        >
                            <Bot size={32} />
                        </button>
                    </div>

                    <button onClick={() => setActiveTab('reports')} className={`flex flex-col items-center gap-1.5 transition-all ${activeTab === 'reports' ? 'text-indigo-600' : 'text-slate-400 opacity-60'}`}>
                        <PieChartIcon size={20} />
                    </button>
                    <button onClick={() => setActiveTab('settings')} className={`flex flex-col items-center gap-1.5 transition-all ${activeTab === 'settings' ? 'text-indigo-600' : 'text-slate-400 opacity-60'}`}>
                        <Settings size={20} />
                    </button>
                </div>
            </nav>

            {/* Account Manager Modal */}
            {showAccountManager && (
                <div className="fixed inset-0 z-[170] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-[32px] p-6 shadow-2xl animate-in slide-in-from-bottom duration-300 max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold">Kelola Akun</h3>
                            <button onClick={() => { setShowAccountManager(false); setAccountForm(null); }} className="p-2 bg-slate-100 dark:bg-slate-800 rounded-full"><X size={20} /></button>
                        </div>

                        {!accountForm ? (
                            <>
                                <div className="space-y-4 mb-8">
                                    {accounts.map(acc => (
                                        <div key={acc.id} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 rounded-xl flex items-center justify-center text-xl shadow-sm" style={{ backgroundColor: acc.color + '20', color: acc.color }}>
                                                    {acc.icon}
                                                </div>
                                                <div>
                                                    <h4 className="font-bold">{acc.name}</h4>
                                                    <p className="text-xs text-slate-500">{acc.provider} • {formatCurrency(acc.balance)}</p>
                                                </div>
                                            </div>
                                            <div className="flex gap-2">
                                                <button onClick={() => setAccountForm(acc)} className="p-2 text-slate-400 hover:text-indigo-500"><Edit size={18} /></button>
                                                <button onClick={() => deleteAccount(acc.id)} className="p-2 text-slate-400 hover:text-rose-500"><Trash2 size={18} /></button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <button
                                    onClick={() => setAccountForm({ type: 'bank', color: '#6366f1', icon: '🏦', balance: 0, isActive: true })}
                                    className="w-full py-4 rounded-2xl bg-indigo-600 text-white font-bold shadow-lg shadow-indigo-200 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                                >
                                    <Plus size={20} /> Tambah Akun Baru
                                </button>
                            </>
                        ) : (
                            <div className="space-y-4">
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase ml-1">Nama Akun</label>
                                    <input
                                        value={accountForm.name || ''}
                                        onChange={e => setAccountForm({ ...accountForm, name: e.target.value })}
                                        className="w-full bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl mt-1 font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                                        placeholder="Contoh: BCA Utama"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-xs font-bold text-slate-500 uppercase ml-1">Tipe</label>
                                        <select
                                            value={accountForm.type || 'bank'}
                                            onChange={e => setAccountForm({ ...accountForm, type: e.target.value as any })}
                                            className="w-full bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl mt-1 font-bold focus:outline-none"
                                        >
                                            <option value="bank">Bank</option>
                                            <option value="ewallet">E-Wallet</option>
                                            <option value="cash">Tunai</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-slate-500 uppercase ml-1">Saldo Awal</label>
                                        <input
                                            type="number"
                                            value={accountForm.balance || 0}
                                            onChange={e => setAccountForm({ ...accountForm, balance: Number(e.target.value) })}
                                            className="w-full bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl mt-1 font-bold focus:outline-none"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase ml-1">Provider / Bank</label>
                                    <input
                                        value={accountForm.provider || ''}
                                        onChange={e => setAccountForm({ ...accountForm, provider: e.target.value })}
                                        className="w-full bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl mt-1 font-bold focus:outline-none"
                                        placeholder="Contoh: BCA, GoPay, Dompet"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-xs font-bold text-slate-500 uppercase ml-1">Warna</label>
                                        <input
                                            type="color"
                                            value={accountForm.color || '#6366f1'}
                                            onChange={e => setAccountForm({ ...accountForm, color: e.target.value })}
                                            className="w-full h-14 bg-slate-50 dark:bg-slate-800 p-2 rounded-2xl mt-1 cursor-pointer"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-slate-500 uppercase ml-1">Icon</label>
                                        <input
                                            value={accountForm.icon || '🏦'}
                                            onChange={e => setAccountForm({ ...accountForm, icon: e.target.value })}
                                            className="w-full bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl mt-1 font-bold text-center"
                                            placeholder="Emoji"
                                        />
                                    </div>
                                </div>
                                <div className="flex gap-3 pt-4">
                                    <button
                                        onClick={() => setAccountForm(null)}
                                        className="flex-1 py-4 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-500 font-bold hover:bg-slate-200 transition-colors"
                                    >
                                        Batal
                                    </button>
                                    <button
                                        onClick={() => {
                                            if (accountForm.id) {
                                                updateAccount(accountForm.id, accountForm);
                                            } else {
                                                createAccount(accountForm as any);
                                            }
                                            setAccountForm(null);
                                        }}
                                        className="flex-1 py-4 rounded-2xl bg-indigo-600 text-white font-bold shadow-lg shadow-indigo-200 hover:scale-[1.02] transition-all flex items-center justify-center gap-2"
                                    >
                                        <Save size={20} /> Simpan
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

        </div>
    );
}