# 🤖 PROMPT UNTUK AI CODING TOOLS
## Refactor AI Financial Assistant Logic

---

## 📋 CONTEXT

Saya punya kode AI Logic untuk Financial Assistant yang perlu di-refactor agar:
1. Lebih modular dan maintainable
2. Mudah dikembangkan untuk fitur baru
3. Efisien dalam penggunaan API
4. Error handling yang robust
5. Type-safe dengan TypeScript

---

## 🎯 PROMPT UNTUK AI CODING ASSISTANT

```
Saya butuh bantuan refactor kode AI Financial Assistant. Berikut adalah kode existing saya:

[PASTE KODE DARI DOKUMEN YANG SAYA REVIEW]

MASALAH YANG PERLU DIPERBAIKI:

1. ARCHITECTURE:
   - System prompt terlalu panjang dan kompleks
   - Tidak ada separation of concerns
   - Hard to add new features
   - No intent classification system

2. EFFICIENCY:
   - Setiap request membangun context dari scratch
   - Tidak ada caching mechanism
   - Rate limit handling tidak ada
   - Timeout handling kurang robust

3. CODE QUALITY:
   - Error handling masih basic
   - Tidak ada retry logic
   - API key hardcoded di frontend (security risk)
   - Type safety kurang

4. MAINTAINABILITY:
   - Prompt engineering campur dengan business logic
   - Sulit untuk A/B test different prompts
   - No separation antara transaction vs query handling

REQUIREMENTS:

Tolong refactor dengan ARCHITECTURE berikut:

```typescript
// STRUKTUR YANG DIINGINKAN:

src/
├── services/
│   ├── ai/
│   │   ├── AIService.ts              // Main orchestrator
│   │   ├── IntentClassifier.ts       // Classify user intent
│   │   ├── PromptBuilder.ts          // Build prompts modularly
│   │   ├── ResponseHandler.ts        // Handle AI responses
│   │   └── models/
│   │       ├── ModelSelector.ts      // Select best model for task
│   │       └── OpenRouterClient.ts   // API client with retry
│   ├── financial/
│   │   ├── TransactionService.ts     // Handle transaction logic
│   │   ├── BudgetService.ts          // Budget calculations
│   │   └── AnalyticsService.ts       // Financial analytics
│   └── cache/
│       └── CacheService.ts           // Cache frequently used data
├── types/
│   ├── ai.types.ts
│   ├── transaction.types.ts
│   └── budget.types.ts
├── config/
│   ├── ai.config.ts                  // AI configuration
│   └── prompts/
│       ├── base.prompts.ts
│       ├── transaction.prompts.ts
│       ├── query.prompts.ts
│       └── advice.prompts.ts
└── utils/
    ├── date.utils.ts
    └── currency.utils.ts
```

SPECIFIC TASKS:

1. CREATE INTENT CLASSIFIER:
   - Separate function to classify: transaction | query | advice | planning | analysis
   - Use simple rule-based first (fast, no API call)
   - Return confidence score
   - Example:
     ```typescript
     interface Intent {
       type: 'transaction' | 'query' | 'advice' | 'planning' | 'analysis';
       confidence: number;
       entities?: Record<string, any>;
     }
     
     async function classifyIntent(text: string, hasImage: boolean): Promise<Intent>
     ```

2. CREATE MODULAR PROMPT SYSTEM:
   - Separate prompts into different files
   - Base prompt + specific task prompt
   - Easy to A/B test different versions
   - Support template variables
   - Example:
     ```typescript
     const PROMPTS = {
       base: (context) => `...`,
       transaction: (context) => `...`,
       query: (context) => `...`
     }
     ```

3. CREATE SMART CONTEXT BUILDER:
   - Don't send all 20 transactions every time
   - For transaction extraction: only need account list
   - For queries: only need relevant transactions
   - Implement sliding window for history
   - Example:
     ```typescript
     function buildContext(
       intent: Intent,
       accounts: Account[],
       transactions: Transaction[],
       config: ContextConfig
     ): string
     ```

4. CREATE MODEL SELECTOR:
   - Different models for different tasks
   - Gemini Flash for simple tasks (cheap)
   - Gemini Thinking for extraction (accurate)
   - Claude Sonnet for analysis (smart)
   - Example:
     ```typescript
     function selectModel(intent: Intent, hasImage: boolean): ModelConfig {
       if (hasImage) return MODELS.vision;
       if (intent.type === 'advice') return MODELS.smart;
       return MODELS.fast;
     }
     ```

5. IMPLEMENT ROBUST ERROR HANDLING:
   - Retry logic with exponential backoff
   - Timeout handling
   - Rate limit detection
   - Graceful degradation
   - User-friendly error messages
   - Example:
     ```typescript
     async function callAIWithRetry(
       payload: any,
       options: RetryOptions
     ): Promise<AIResponse>
     ```

6. IMPLEMENT CACHING:
   - Cache frequently asked queries
   - Cache account balances (invalidate on new transaction)
   - Cache categorization results
   - Example:
     ```typescript
     class CacheService {
       get(key: string): any;
       set(key: string, value: any, ttl: number): void;
       invalidate(pattern: string): void;
     }
     ```

7. SEPARATE TRANSACTION HANDLING:
   - Extract transaction response handling to separate service
   - Validation logic
   - Business rules (e.g., check balance for transfer)
   - Transaction creation
   - Example:
     ```typescript
     class TransactionService {
       async createFromAI(aiResponse: string): Promise<Transaction>;
       async validateTransfer(from: string, to: string, amount: number): Promise<void>;
       async executeTransfer(data: TransferData): Promise<string>;
     }
     ```

8. ADD TYPESCRIPT TYPES:
   - Strong typing for all functions
   - Interfaces for AI requests/responses
   - Enums for constants
   - Generic types where appropriate

9. SECURITY IMPROVEMENTS:
   - Move API key to environment variable
   - Add request signing (if needed)
   - Sanitize user inputs before sending to AI
   - Don't log sensitive data

10. ADD MONITORING & LOGGING:
    - Log all AI requests with metadata
    - Track response times
    - Track error rates
    - Track token usage
    - Example:
      ```typescript
      interface AIMetrics {
        requestId: string;
        intent: string;
        model: string;
        tokensUsed: number;
        latency: number;
        success: boolean;
        error?: string;
      }
      ```

IMPLEMENTATION GUIDELINES:

1. Use async/await consistently
2. Follow SOLID principles
3. Use dependency injection where appropriate
4. Write self-documenting code with clear function names
5. Add JSDoc comments for public APIs
6. Use const for immutable values
7. Prefer functional programming patterns
8. Handle edge cases explicitly

OUTPUT YANG DIHARAPKAN:

1. Refactored code dengan struktur folder yang saya sebutkan
2. Setiap file fokus pada single responsibility
3. Main orchestrator (AIService.ts) yang clean dan mudah dibaca
4. Config files yang terpisah dari logic
5. Type definitions yang comprehensive
6. Error handling yang robust
7. Comments untuk complex logic
8. Example usage di setiap service

ADDITIONAL CONTEXT:

- Tech stack: React + TypeScript
- State management: useState/useContext
- API: OpenRouter.ai
- Models: Gemini 2.0 Flash, Claude 3.5 Sonnet
- Target: Production-ready code
- Users: 1000+ concurrent users expected

Tolong generate COMPLETE CODE untuk struktur yang saya request, dengan fokus pada:
- Clean architecture
- Maintainability
- Scalability
- Performance
- Developer experience

Mulai dengan file yang paling penting: AIService.ts sebagai main orchestrator.
```

---

## 🔧 PROMPT TAMBAHAN UNTUK SPESIFIK TASKS

### A. Untuk Intent Classification

```
Create a robust Intent Classification system untuk Financial Assistant dengan requirements:

INPUT: 
- User text (string)
- Has image (boolean)
- Message history (optional)

OUTPUT:
- Intent type: transaction | query | advice | planning | analysis
- Confidence score (0-1)
- Extracted entities (dates, amounts, categories, etc)

FEATURES:
1. Rule-based classification (no API call for speed)
2. Keyword matching with priority
3. Regex patterns for amounts, dates
4. Context awareness from history
5. Fallback handling

EXAMPLE INPUTS:
- "Catat beli makan 50rb" → transaction (0.95)
- "Berapa total belanja bulan ini?" → query (0.9)
- "Gimana caranya hemat?" → advice (0.85)
- "Aku mau nabung 10jt untuk beli motor" → planning (0.9)
- "Analisis pengeluaran 3 bulan terakhir" → analysis (0.95)

Generate TypeScript code dengan comprehensive test cases.
```

### B. Untuk Prompt System

```
Create a modular prompt system untuk Financial AI dengan:

STRUKTUR:
```typescript
interface PromptTemplate {
  id: string;
  name: string;
  template: (variables: Record<string, any>) => string;
  version: string;
  testCases?: TestCase[];
}
```

REQUIREMENTS:
1. Base system prompt (personality, guidelines)
2. Task-specific prompts (transaction, query, advice, etc)
3. Template variables support
4. Version control untuk A/B testing
5. Prompt composition (base + task)
6. Easy to add new prompts

FEATURES:
- Indonesian language optimized
- Examples included in prompts
- Clear output format specifications
- Error handling instructions
- Edge case handling

OUTPUT FILES:
- base.prompts.ts
- transaction.prompts.ts
- query.prompts.ts
- advice.prompts.ts
- planning.prompts.ts
- analysis.prompts.ts

Setiap file harus export const PROMPTS object.
```

### C. Untuk Error Handling

```
Create comprehensive error handling system dengan:

ERROR TYPES:
1. Network errors (timeout, connection failed)
2. API errors (rate limit, invalid key, 500)
3. Parsing errors (invalid JSON, unexpected format)
4. Business logic errors (insufficient balance, invalid account)
5. Validation errors (missing fields, invalid data)

REQUIREMENTS:
1. Custom error classes with proper inheritance
2. Retry logic with exponential backoff
3. Circuit breaker pattern for API failures
4. User-friendly error messages (in Indonesian)
5. Error logging with context
6. Error recovery strategies

FEATURES:
```typescript
class AIError extends Error {
  constructor(
    message: string,
    public code: string,
    public retryable: boolean,
    public userMessage: string,
    public context?: any
  )
}

async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions
): Promise<T>

class CircuitBreaker {
  async execute<T>(fn: () => Promise<T>): Promise<T>
}
```

Generate complete implementation dengan examples.
```

### D. Untuk Caching Strategy

```
Design dan implement caching strategy untuk Financial AI:

CACHE TYPES:
1. Query results cache (TTL: 5 minutes)
   - "Total belanja bulan ini?"
   - "Saldo akun BCA?"

2. Account balance cache (invalidate on new transaction)
   - Computed balances
   - Account summaries

3. Categorization cache (persistent)
   - Merchant → Category mapping
   - Description patterns

4. AI response cache (TTL: 1 hour)
   - Identical queries
   - Hash-based key

REQUIREMENTS:
1. Multiple storage backends (Memory, LocalStorage, Redis-ready)
2. TTL support
3. Invalidation patterns
4. Cache statistics
5. LRU eviction for memory cache

IMPLEMENTATION:
```typescript
interface CacheConfig {
  ttl: number;
  maxSize: number;
  storage: 'memory' | 'localStorage' | 'redis';
}

class CacheService {
  get<T>(key: string): T | null;
  set<T>(key: string, value: T, ttl?: number): void;
  invalidate(pattern: string): void;
  invalidateAll(): void;
  getStats(): CacheStats;
}
```

Include cache warming strategies dan monitoring.
```

---

## 📊 VALIDATION CHECKLIST

Setelah AI selesai generate code, validate dengan:

### Code Quality
- [ ] TypeScript strict mode compatible
- [ ] No `any` types (atau minimal usage)
- [ ] All functions have JSDoc
- [ ] Error handling di semua async functions
- [ ] No console.log (use proper logger)

### Architecture
- [ ] Single Responsibility per file
- [ ] Dependency injection used
- [ ] No circular dependencies
- [ ] Config separated from logic
- [ ] Easy to mock for testing

### Performance
- [ ] No unnecessary API calls
- [ ] Caching implemented
- [ ] Debouncing untuk user input
- [ ] Lazy loading where appropriate
- [ ] Memory leaks prevention

### Security
- [ ] No hardcoded secrets
- [ ] Input sanitization
- [ ] Output validation
- [ ] Rate limiting
- [ ] Error messages don't leak internals

### Developer Experience
- [ ] Clear folder structure
- [ ] Easy to add new features
- [ ] Self-documenting code
- [ ] Example usage provided
- [ ] Migration guide from old code

---

## 🚀 USAGE EXAMPLE

Setelah refactor, usage should be simple:

```typescript
// OLD (Complex & Messy)
const processAIInput = async (text, image, user, ...) => {
  // 200 lines of mixed logic
}

// NEW (Clean & Modular)
import { AIService } from '@/services/ai/AIService';

const aiService = new AIService({
  apiKey: process.env.OPENROUTER_API_KEY,
  defaultModel: 'gemini-flash',
  cache: true
});

// Simple usage
const response = await aiService.process({
  text: "Catat beli kopi 45rb",
  image: base64Image,
  userId: user.id,
  context: { accounts, transactions }
});

// Handle response
if (response.success) {
  console.log(response.data);
  console.log(response.message); // User-friendly message
} else {
  console.error(response.error);
}
```

---

## 💡 TIPS UNTUK AI CODING TOOLS

1. **Jika menggunakan Cursor/Copilot:**
   - Paste seluruh prompt di comment block
   - Highlight existing code yang perlu di-refactor
   - Use "Generate with AI" feature

2. **Jika menggunakan ChatGPT/Claude:**
   - Send prompt lengkap
   - Request file by file
   - Ask for explanation of major changes

3. **Jika menggunakan GitHub Copilot Chat:**
   - Use `/fix` untuk error handling
   - Use `/explain` untuk complex logic
   - Use `/tests` untuk generate test cases

4. **General workflow:**
   ```
   1. Paste prompt → Generate AIService.ts
   2. Review → Request adjustments
   3. Generate next file (IntentClassifier.ts)
   4. Continue until complete
   5. Request integration example
   6. Request migration guide
   ```

---

## 📝 FOLLOW-UP PROMPTS

Setelah code generated, gunakan prompts ini:

### 1. Request Tests
```
Generate comprehensive unit tests untuk:
- IntentClassifier.ts
- PromptBuilder.ts
- TransactionService.ts

Menggunakan Jest + TypeScript.
Include edge cases dan error scenarios.
```

### 2. Request Documentation
```
Generate README.md untuk AI Service module dengan:
- Architecture overview
- API documentation
- Usage examples
- Configuration guide
- Troubleshooting
```

### 3. Request Migration Guide
```
Create step-by-step migration guide dari kode lama ke kode baru:
- Breaking changes
- Code transformation examples
- Data migration (if any)
- Rollback strategy
```

### 4. Request Performance Optimization
```
Review generated code dan suggest optimizations untuk:
- Reduce API calls
- Improve response time
- Memory usage
- Bundle size
```

---

## ✅ EXPECTED OUTCOMES

Setelah selesai, kode baru harus:

1. **50% fewer API calls** (dengan caching & intent classification)
2. **2x faster response** (dengan model selection)
3. **10x easier to add features** (dengan modular architecture)
4. **Zero hardcoded configs** (semua di config files)
5. **Production-ready** (dengan error handling & monitoring)

---

**Happy Coding! 🚀**
