# ⚡ QUICK PROMPT - AI Financial Assistant Refactor

## 🎯 COPY-PASTE PROMPT (Untuk Cursor/Copilot/ChatGPT)

```
TASK: Refactor kode AI Financial Assistant menjadi production-ready dengan arsitektur modular.

EXISTING CODE:
[PASTE YOUR CODE HERE]

REQUIREMENTS:

1. ARCHITECTURE - Buat struktur folder:
src/
├── services/ai/
│   ├── AIService.ts           // Main orchestrator
│   ├── IntentClassifier.ts    // Classify intent (transaction/query/advice)
│   ├── PromptBuilder.ts       // Modular prompts
│   └── OpenRouterClient.ts    // API client + retry
├── config/prompts/
│   ├── transaction.prompts.ts
│   ├── query.prompts.ts
│   └── advice.prompts.ts
└── types/ai.types.ts

2. INTENT CLASSIFICATION - Buat function:
async classifyIntent(text: string, hasImage: boolean): Promise<Intent>
// Return: { type: 'transaction'|'query'|'advice', confidence: 0-1 }
// Rule-based (no API call), keyword matching

3. MODULAR PROMPTS - Pisahkan prompts:
const PROMPTS = {
  base: (context) => "...",
  transaction: (accounts) => "...",
  query: (accounts, transactions) => "..."
}

4. SMART CONTEXT - Jangan kirim semua data:
- Transaction extraction: hanya account list
- Queries: filter relevant transactions only
- Max 20 transactions per request

5. MODEL SELECTOR - Pilih model by task:
- Gemini Flash → simple tasks
- Gemini Thinking → extraction (OCR)
- Claude Sonnet → analysis & advice

6. ERROR HANDLING - Implement:
- Retry dengan exponential backoff (max 3x)
- Timeout handling (30s)
- User-friendly error messages (Indonesian)
- Logging dengan context

7. CACHING - Cache hasil:
- Query results (TTL 5 min)
- Account balances (invalidate on transaction)
- Categorization results

8. TYPESCRIPT - Strong typing:
- No 'any' types
- Interfaces untuk semua data
- JSDoc comments

9. SECURITY:
- API key di environment variable
- Sanitize user input
- Don't log sensitive data

OUTPUT:
- Complete TypeScript code
- Self-documenting dengan comments
- Example usage
- Migration notes dari kode lama

STYLE:
- Async/await
- SOLID principles
- Functional programming
- Clean code
```

---

## 🔥 ONE-LINER PROMPTS

### Untuk Cursor AI
```
@workspace Refactor /src/ai-logic.ts menjadi modular architecture dengan intent classification, prompt system terpisah, error handling, dan caching. Target: production-ready.
```

### Untuk GitHub Copilot Chat
```
/fix Refactor this AI logic untuk production: add intent classifier, separate prompts, retry logic, caching, TypeScript strict mode
```

### Untuk ChatGPT/Claude
```
Refactor kode ini jadi production-ready dengan: 1) Intent classification 2) Modular prompts 3) Model selector 4) Error handling + retry 5) Caching 6) Full TypeScript. Generate complete code.
```

---

## 📋 STEP-BY-STEP WORKFLOW

1. **Copy prompt lengkap** dari file utama
2. **Paste di AI coding tool** (Cursor/Copilot/ChatGPT)
3. **Generate AIService.ts** terlebih dahulu
4. **Review & iterate** sampai puas
5. **Generate file lainnya** satu per satu:
   - IntentClassifier.ts
   - PromptBuilder.ts
   - OpenRouterClient.ts
   - Config files
6. **Request tests** dengan prompt: "Generate unit tests untuk semua services"
7. **Request docs** dengan prompt: "Generate README.md untuk module ini"
8. **Integration** - paste di project, test, iterate

---

## ✅ VALIDATION QUICK CHECK

Code bagus jika:
- [ ] Bisa import & run tanpa error
- [ ] Type checking pass (no `any`)
- [ ] Error handling di semua async functions
- [ ] Config terpisah dari logic
- [ ] Easy to add new feature (contoh: new intent type)
- [ ] API calls berkurang 30-50%
- [ ] Response time faster
- [ ] Code 50% lebih pendek

---

## 🚨 COMMON ISSUES & FIXES

### Issue: Generated code terlalu kompleks
**Fix:** Tambahkan di prompt: "Keep it simple, focus on core functionality first"

### Issue: Type errors everywhere
**Fix:** Prompt: "Generate dengan TypeScript strict mode dari awal, define all interfaces first"

### Issue: No example usage
**Fix:** Prompt: "Add comprehensive example usage di comment atau separate file"

### Issue: Missing error messages
**Fix:** Prompt: "Add user-friendly error messages dalam Bahasa Indonesia untuk setiap error case"

---

## 💬 EXAMPLE CONVERSATION WITH AI

**You:**
```
Refactor this code [paste code]. Requirements: modular architecture, intent classification, separate prompts, error handling, caching, full TypeScript.
```

**AI:** 
[Generates AIService.ts]

**You:**
```
Good! Sekarang generate IntentClassifier.ts dengan rule-based classification untuk keywords: catat/beli/transfer/berapa/total/saran
```

**AI:**
[Generates IntentClassifier.ts]

**You:**
```
Perfect! Generate prompt system dengan base + task-specific prompts. Format template: base(context) + transaction(accounts) + query(accounts, tx)
```

**AI:**
[Generates prompt files]

**You:**
```
Last step: Generate OpenRouterClient.ts dengan retry logic (max 3), exponential backoff, timeout 30s, error logging
```

**AI:**
[Generates OpenRouterClient.ts]

**You:**
```
Excellent! Sekarang generate:
1. types/ai.types.ts dengan semua interfaces
2. Example usage di main component
3. Migration guide dari kode lama
```

---

## 🎁 BONUS: TESTING PROMPT

```
Generate comprehensive tests untuk:
1. IntentClassifier: 20+ test cases covering all intents
2. PromptBuilder: test template rendering
3. OpenRouterClient: mock API responses, test retry logic
4. AIService: integration tests

Framework: Jest + TypeScript
Include: happy path, edge cases, error scenarios
Mock: external API calls
```

---

## 📦 FILES TO GENERATE (Checklist)

Core:
- [ ] services/ai/AIService.ts
- [ ] services/ai/IntentClassifier.ts
- [ ] services/ai/PromptBuilder.ts
- [ ] services/ai/OpenRouterClient.ts

Config:
- [ ] config/ai.config.ts
- [ ] config/prompts/base.prompts.ts
- [ ] config/prompts/transaction.prompts.ts
- [ ] config/prompts/query.prompts.ts

Types:
- [ ] types/ai.types.ts
- [ ] types/transaction.types.ts

Utils:
- [ ] utils/cache.utils.ts
- [ ] utils/logger.utils.ts

Docs:
- [ ] README.md
- [ ] MIGRATION.md
- [ ] examples/usage.example.ts

Tests (optional):
- [ ] __tests__/AIService.test.ts
- [ ] __tests__/IntentClassifier.test.ts

---

**Time to refactor: ~2-3 hours dengan AI assistance**  
**Manual coding: ~2-3 days**

🚀 **GO BUILD SOMETHING AWESOME!**
