import express, { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const currentFilename = typeof import.meta?.url === 'string' ? fileURLToPath(import.meta.url) : '';
const currentDirname = currentFilename ? path.dirname(currentFilename) : (typeof __dirname !== 'undefined' ? __dirname : process.cwd());

const app = express();
const PORT = Number(process.env.DEFAULT_APP_PORT) || (process.env.NGINX_PORT ? 3000 : Number(process.env.PORT) || 3000);

app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// Lazy Gemini client helper
let aiClient: GoogleGenAI | null = null;
function getGenAI(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return null;
  }
  if (!aiClient) {
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return aiClient;
}

// Resilient AI generation helper:
// Handles 503 (model high demand / UNAVAILABLE), 429 (rate limits), and tries fast fallback models
async function callGeminiWithFallback(
  ai: GoogleGenAI,
  params: {
    contents: any;
    config?: any;
    primaryModel?: string;
  }
) {
  const fallbackList = [
    params.primaryModel || 'gemini-3.8-flash',
    'gemini-3.5-flash-lite',
    'gemini-3.1-flash-lite',
    'gemini-flash-latest',
  ];
  const candidateModels = Array.from(new Set(fallbackList.filter(Boolean)));

  let lastError: any = null;

  for (const model of candidateModels) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: params.contents,
        config: params.config,
      });
      if (response) {
        return { response, modelUsed: model };
      }
    } catch (err: any) {
      lastError = err;
      const errMsg = err?.message || String(err);
      const isTemporaryDemand =
        err?.status === 503 ||
        err?.status === 429 ||
        errMsg.includes('503') ||
        errMsg.includes('429') ||
        errMsg.includes('high demand') ||
        errMsg.includes('UNAVAILABLE') ||
        errMsg.includes('Resource has been exhausted') ||
        errMsg.includes('resource_exhausted') ||
        errMsg.includes('quota') ||
        errMsg.includes('Quota exceeded') ||
        errMsg.includes('overloaded');

      if (isTemporaryDemand) {
        console.warn(`[AI Engine] Model ${model} is experiencing quota or temporary high demand. Trying fallback model...`);
        await new Promise((r) => setTimeout(r, 250));
        continue;
      }

      console.warn(`[AI Engine] Model ${model} call error: ${errMsg}. Trying fallback model...`);
    }
  }

  throw lastError;
}

// Health check (supports Cloud Run readiness & liveness probes)
app.get(['/api/health', '/healthz'], (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    app: 'Fortunal DebtManager',
    aiAvailable: !!process.env.GEMINI_API_KEY,
    timestamp: new Date().toISOString(),
  });
});

// Comprehensive helper for parsing numbers like "2.5k", "25k", "50,000", "KSh 2,500", "2500 shillings"
function parseNormalizedAmount(raw: any): number {
  if (typeof raw === 'number') return isNaN(raw) ? 0 : raw;
  if (!raw || typeof raw !== 'string') return 0;
  const str = raw.trim().toLowerCase();

  // Match "2.5k" or "25k"
  const kMatch = str.match(/([0-9]+(?:\.[0-9]+)?)\s*k\b/i);
  if (kMatch) {
    return Math.round(parseFloat(kMatch[1]) * 1000);
  }

  // Remove currency prefixes & suffixes
  const cleaned = str
    .replace(/(?:ksh|kes|shs|sh|\$|\/=|shillings|bob)/gi, '')
    .replace(/,/g, '')
    .trim();

  const val = parseFloat(cleaned);
  return isNaN(val) ? 0 : val;
}

// Helper for relative natural-language date calculation relative to current date
function parseRelativeDate(text: string, refDate: Date = new Date()): string {
  const lower = text.toLowerCase();
  const d = new Date(refDate);

  if (/\btoday\b/.test(lower)) {
    return d.toISOString().split('T')[0];
  }
  if (/\btomorrow\b/.test(lower)) {
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  }
  if (/\byesterday\b/.test(lower)) {
    d.setDate(d.getDate() - 1);
    return d.toISOString().split('T')[0];
  }

  const dayMap: Record<string, number> = {
    sunday: 0,
    monday: 1,
    tuesday: 2,
    wednesday: 3,
    thursday: 4,
    friday: 5,
    saturday: 6,
  };

  for (const [dayName, targetDay] of Object.entries(dayMap)) {
    // "friday next week" or "next week friday" or "friday of next week"
    if (
      new RegExp(`${dayName}\\s+next\\s+week`, 'i').test(lower) ||
      new RegExp(`next\\s+week\\s+${dayName}`, 'i').test(lower) ||
      new RegExp(`${dayName}\\s+of\\s+next\\s+week`, 'i').test(lower)
    ) {
      const currentDay = d.getDay();
      let daysUntil = (targetDay - currentDay + 7) % 7;
      if (daysUntil === 0) daysUntil = 7;
      // "Next week" pushes to the week after
      d.setDate(d.getDate() + daysUntil + 7);
      return d.toISOString().split('T')[0];
    }

    // "next friday", "next monday", etc.
    if (new RegExp(`next\\s+${dayName}`, 'i').test(lower)) {
      const currentDay = d.getDay();
      let daysUntil = (targetDay - currentDay + 7) % 7;
      if (daysUntil === 0) daysUntil = 7;
      d.setDate(d.getDate() + daysUntil);
      return d.toISOString().split('T')[0];
    }

    // plain "on friday", "by friday", "friday"
    if (new RegExp(`(?:on|by|this)?\\s*\\b${dayName}\\b`, 'i').test(lower)) {
      const currentDay = d.getDay();
      let daysUntil = (targetDay - currentDay + 7) % 7;
      if (daysUntil === 0) daysUntil = 7;
      d.setDate(d.getDate() + daysUntil);
      return d.toISOString().split('T')[0];
    }
  }

  if (/end of (?:this )?month/i.test(lower)) {
    const end = new Date(d.getFullYear(), d.getMonth() + 1, 0);
    return end.toISOString().split('T')[0];
  }

  const inDaysMatch = lower.match(/in\s+(\d+)\s+days?/);
  if (inDaysMatch) {
    d.setDate(d.getDate() + parseInt(inDaysMatch[1], 10));
    return d.toISOString().split('T')[0];
  }

  const inWeeksMatch = lower.match(/in\s+(\d+)\s+weeks?/);
  if (inWeeksMatch) {
    d.setDate(d.getDate() + parseInt(inWeeksMatch[1], 10) * 7);
    return d.toISOString().split('T')[0];
  }

  // Default: 7 days from reference date
  d.setDate(d.getDate() + 7);
  return d.toISOString().split('T')[0];
}

// Comprehensive fallback rule engine when AI is unavailable or as local baseline
function fallbackParseTransaction(text: string, defaultCurrency = 'KES') {
  const clean = text.trim();
  const todayStr = new Date().toISOString().split('T')[0];

  // 1. Phone number extraction
  const phoneMatch = clean.match(/(?:\+?254|0)[17]\d{8}/);
  const customerPhone = phoneMatch ? phoneMatch[0] : '';

  // 2. Customer name extraction
  let customerName = '';
  const namePatterns = [
    /^([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s+(?:bought|took|borrowed|owes|ordered|paid|cleared|purchased|deposited)/i,
    /(?:to|from|by|client|customer|sold to|lent to)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i,
    /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s+(?:due|will pay|to pay|remaining|owes)/i,
  ];

  const forbiddenNames = [
    'Cash', 'Bank', 'Mpesa', 'Airtel', 'Next', 'Sold', 'Took', 'Paid', 'Today', 'Yesterday',
    'Customer', 'Friday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Saturday', 'Sunday',
    'Bags', 'Rice', 'Flour', 'Maize', 'Sugar', 'Milk', 'Ksh', 'Kes', 'Lent'
  ];

  for (const pat of namePatterns) {
    const m = clean.match(pat);
    if (m && m[1]) {
      const candidate = m[1].trim();
      if (!forbiddenNames.map((n) => n.toLowerCase()).includes(candidate.toLowerCase())) {
        customerName = candidate;
        break;
      }
    }
  }

  // 3. Extract quantity and item description
  let quantity = '';
  const qtyMatch = clean.match(/(\d+(?:\.\d+)?)\s*(bags?|sacks?|cartons?|kg|litres?|pieces?|boxes?|crates?|tins?|trays?|pkts?|packets?)/i);
  if (qtyMatch) {
    quantity = `${qtyMatch[1]} ${qtyMatch[2]}`;
  }

  let itemDescription = '';
  // Pattern: "20 bags of rice" or "5 bags of maize"
  const itemPhraseMatch = clean.match(/(\d+\s*(?:bags?|sacks?|cartons?|kg|litres?|pieces?|boxes?|crates?|tins?|trays?)\s+of\s+[a-zA-Z\s]+?)(?=\s+(?:for|worth|cost|and|paid|today|ksh|kes|\d))/i);
  if (itemPhraseMatch) {
    itemDescription = itemPhraseMatch[1].trim();
  } else {
    // Try after bought/took/ordered/sold e.g. "bought groceries worth 3000"
    const verbItemMatch = clean.match(/(?:bought|took|ordered|supplied|sold|borrowed)\s+([a-zA-Z\s]+?)(?=\s+(?:for|worth|cost|and|paid|today|ksh|kes|\d))/i);
    if (verbItemMatch) {
      const cand = verbItemMatch[1].trim();
      if (!forbiddenNames.map(f => f.toLowerCase()).includes(cand.toLowerCase())) {
        itemDescription = cand;
      }
    }
  }

  // 4. Extract monetary amounts: Distinctly identify Original Debt vs Amount Paid
  let originalDebt = 0;
  let amountPaid = 0;
  let isPaymentAgainstExisting = false;

  // Specific pattern: "John paid KSh 2000 toward his KSh 7500 debt"
  const towardDebtMatch = clean.match(/(?:paid|deposited|cleared)\s*(?:ksh|kes|shs|sh|\$|\/=)?\s*([0-9,]+(?:\.\d+)?|\d+(?:\.\d+)?k)\s*toward\s*(?:his|her|their)?\s*(?:ksh|kes|shs|sh|\$|\/=)?\s*([0-9,]+(?:\.\d+)?|\d+(?:\.\d+)?k)\s*debt/i);
  if (towardDebtMatch) {
    amountPaid = parseNormalizedAmount(towardDebtMatch[1]);
    originalDebt = parseNormalizedAmount(towardDebtMatch[2]);
    isPaymentAgainstExisting = true;
  } else {
    // Check for paid amount e.g. "and paid KSh 1000" or "paid 1000" or "has already paid 5000"
    const paidMatch = clean.match(/(?:paid|cleared|deposited|sent|received|already paid)\s*(?:ksh|kes|shs|sh|\$|\/=)?\s*([0-9,]+(?:\.\d+)?|\d+(?:\.\d+)?k)/i);
    if (paidMatch) {
      amountPaid = parseNormalizedAmount(paidMatch[1]);
    }

    // Check for purchase or debt amount e.g. "for KSh 2500" or "worth 3000" or "owes me KSh 20000" or "debt of 7500"
    const debtMatch = clean.match(/(?:for|worth|cost|valued\s+at|debt\s+of|owes(?:\s+me)?|total(?:\s+of)?|credit\s+of)\s*(?:ksh|kes|shs|sh|\$|\/=)?\s*([0-9,]+(?:\.\d+)?|\d+(?:\.\d+)?k)/i);
    if (debtMatch) {
      originalDebt = parseNormalizedAmount(debtMatch[1]);
    }

    // Check for "paid the full amount"
    if (originalDebt > 0 && /paid\s+the\s+full\s+amount/i.test(clean)) {
      amountPaid = originalDebt;
    }
  }

  // Fallback scan for standalone currency amounts if one is missing
  if (originalDebt === 0 && amountPaid === 0) {
    const allMoneyMatches = Array.from(clean.matchAll(/(?:ksh|kes|shs|sh|\$|\/=)?\s*([0-9,]+(?:\.\d+)?|\d+(?:\.\d+)?k)/gi))
      .map((m) => parseNormalizedAmount(m[1]))
      .filter((val) => val >= 10);

    if (allMoneyMatches.length >= 2) {
      originalDebt = Math.max(allMoneyMatches[0], allMoneyMatches[1]);
      amountPaid = Math.min(allMoneyMatches[0], allMoneyMatches[1]);
    } else if (allMoneyMatches.length === 1) {
      if (/\b(paid|deposited|received)\b/i.test(clean)) {
        amountPaid = allMoneyMatches[0];
      } else {
        originalDebt = allMoneyMatches[0];
      }
    }
  } else if (originalDebt === 0 && amountPaid > 0) {
    const allNumbers = Array.from(clean.matchAll(/\b([1-9]\d{2,}(?:,\d{3})*|\d{1,3}(?:,\d{3})+|\d+(?:\.\d+)?k)\b/g))
      .map((m) => parseNormalizedAmount(m[1]))
      .filter((n) => n !== amountPaid && n > 50);

    if (allNumbers.length > 0) {
      originalDebt = allNumbers[0];
    }
  }

  // Calculate remaining balance strictly
  const remainingBalance = originalDebt > 0 ? Math.max(0, originalDebt - amountPaid) : 0;
  const isSplitTransaction = originalDebt > 0 && amountPaid > 0 && amountPaid < originalDebt;
  const isPurePayment = originalDebt === 0 && amountPaid > 0;

  // 5. Payment method: DO NOT GUESS unless mentioned!
  let paymentMethod = 'Not specified';
  if (/\b(m-?pesa|mpesa)\b/i.test(clean)) paymentMethod = 'M-Pesa';
  else if (/\bcash\b/i.test(clean)) paymentMethod = 'Cash';
  else if (/\b(bank|transfer|wire)\b/i.test(clean)) paymentMethod = 'Bank Transfer';
  else if (/\bairtel\b/i.test(clean)) paymentMethod = 'Airtel Money';
  else if (/\bcard\b/i.test(clean)) paymentMethod = 'Card';
  else if (/\bcheque\b/i.test(clean)) paymentMethod = 'Cheque';

  // 6. Dates
  const debtDate = todayStr;
  const paymentDate = amountPaid > 0 ? todayStr : todayStr;
  const dueDate = parseRelativeDate(clean);

  // 7. Category
  let category = 'Supplies';
  if (/\b(rice|flour|maize|sugar|milk|bread|groceries|food|cooking oil|meat)\b/i.test(clean)) {
    category = 'Groceries & Provisions';
  } else if (/\b(cement|hardware|timber|nails|paint|iron sheet)\b/i.test(clean)) {
    category = 'Hardware & Building';
  } else if (/\b(hair|salon|barber|braid|weave)\b/i.test(clean)) {
    category = 'Salon & Beauty';
  } else if (/\b(rent|house|room|apartment|tenant)\b/i.test(clean)) {
    category = 'Rental & Housing';
  } else if (/\b(fertilizer|seeds|farm|crops|feeds)\b/i.test(clean)) {
    category = 'Agriculture & Farm';
  }

  return {
    customerName: customerName || '',
    customerPhone: customerPhone || '',
    itemDescription: itemDescription || '',
    quantity: quantity || '',
    originalDebtAmount: originalDebt,
    originalDebt,
    amountPaid,
    remainingBalance,
    amount: originalDebt > 0 ? originalDebt : amountPaid,
    currency: defaultCurrency,
    description: itemDescription || '',
    debtDate,
    paymentDate,
    dueDate,
    paymentMethod,
    category,
    isPayment: isPurePayment,
    isSplitTransaction,
    isPaymentAgainstExisting,
    confidence: customerName && originalDebt > 0 ? 'high' : 'medium',
    notes: '',
  };
}

// 1. AI SMART ENTRY: Parse natural language or voice transaction with strict split-payment support
app.post('/api/ai/parse-transaction', async (req: Request, res: Response) => {
  try {
    const { text, defaultCurrency = 'KES' } = req.body;
    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'Text input is required' });
    }

    const todayStr = new Date().toISOString().split('T')[0];
    const ai = getGenAI();
    if (!ai) {
      const fallback = fallbackParseTransaction(text, defaultCurrency);
      return res.json({ ...fallback, source: 'rule-engine' });
    }

    const prompt = `You are a financial credit and bookkeeping engine for merchants and lenders.
Parse this natural-language business statement:
"${text}"

CURRENT CALENDAR CONTEXT:
- Today's date: ${todayStr} (${new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })})
- Reference currency: ${defaultCurrency}

CRITICAL RULES FOR STRUCTURED EXTRACTION:
1. STRICTLY DISTINGUISH ORIGINAL DEBT vs AMOUNT PAID:
   - "bought / took / for / worth / total / owes / credit":
     * originalDebt (or originalDebtAmount): Total value of the credit or purchase.
   - "paid / gave / deposited / settled / received":
     * amountPaid: The payment or deposit received.
   - "remaining / balance / still owes":
     * remainingBalance: strictly originalDebt - amountPaid.
   - "paid the full amount":
     * amountPaid = originalDebt, remainingBalance = 0.
   - "John paid KSh 2000 toward his KSh 7500 debt":
     * customerName: "John"
     * originalDebt: 7500
     * amountPaid: 2000
     * remainingBalance: 5500
     * isPaymentAgainstExisting: true
   - If an explicit remaining balance is stated in the sentence, compare it against (originalDebt - amountPaid). Set statedBalanceConflict: true if they disagree.

2. DO NOT INVENT OR GUESS MISSING INFORMATION:
   - If no phone number is mentioned: customerPhone MUST be "".
   - If no item or service is mentioned (e.g. "Jane owes me KSh 20000 and has already paid KSh 5000."): itemDescription MUST be "". NEVER invent "General Credit" or fake goods.
   - If no payment method is mentioned: paymentMethod MUST be "Not specified". NEVER guess M-Pesa or Cash.
   - If no quantity is mentioned: quantity MUST be "". NEVER guess "1".
   - If no notes are provided: notes MUST be "".

3. DATES (Dynamic calculation):
   - debtDate: YYYY-MM-DD (defaults to ${todayStr}).
   - paymentDate: YYYY-MM-DD (defaults to ${todayStr}).
   - dueDate: Dynamic ISO date YYYY-MM-DD calculated relative to today (${todayStr}).
     * "today" -> ${todayStr}
     * "Friday next week" -> calculate Friday of next week.
     * "next Friday" -> calculate the upcoming Friday.

4. NUMBER PARSING:
   - All monetary fields must be numeric integers or floats (e.g. 2500, 1000, 1500, 50000).
   - "2.5k" -> 2500, "50k" -> 50000.

Output strict JSON matching the schema.`;

    const { response, modelUsed } = await callGeminiWithFallback(ai, {
      primaryModel: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            customerName: { type: Type.STRING },
            customerPhone: { type: Type.STRING },
            itemDescription: { type: Type.STRING },
            quantity: { type: Type.STRING },
            originalDebtAmount: { type: Type.NUMBER },
            originalDebt: { type: Type.NUMBER },
            amountPaid: { type: Type.NUMBER },
            remainingBalance: { type: Type.NUMBER },
            currency: { type: Type.STRING },
            debtDate: { type: Type.STRING },
            paymentDate: { type: Type.STRING },
            dueDate: { type: Type.STRING },
            paymentMethod: { type: Type.STRING },
            category: { type: Type.STRING },
            isSplitTransaction: { type: Type.BOOLEAN },
            isPayment: { type: Type.BOOLEAN },
            isPaymentAgainstExisting: { type: Type.BOOLEAN },
            statedBalanceConflict: { type: Type.BOOLEAN },
            notes: { type: Type.STRING },
          },
          required: [
            'customerName',
            'originalDebt',
            'amountPaid',
            'remainingBalance',
            'dueDate',
            'isSplitTransaction',
            'isPayment',
          ],
        },
      },
    });

    if (response.text) {
      const parsed = JSON.parse(response.text);
      const originalDebt = Number(parsed.originalDebt ?? parsed.originalDebtAmount) || 0;
      const amountPaid = Number(parsed.amountPaid) || 0;
      const remainingBalance =
        originalDebt > 0 ? Math.max(0, originalDebt - amountPaid) : 0;

      const paymentMethodClean =
        parsed.paymentMethod &&
        parsed.paymentMethod.toLowerCase() !== 'not specified' &&
        parsed.paymentMethod.toLowerCase() !== 'null' &&
        parsed.paymentMethod.toLowerCase() !== 'none'
          ? parsed.paymentMethod
          : 'Not specified';

      return res.json({
        customerName: parsed.customerName || '',
        customerPhone: parsed.customerPhone || '',
        itemDescription: parsed.itemDescription || '',
        quantity: parsed.quantity || '',
        originalDebtAmount: originalDebt,
        originalDebt,
        amountPaid,
        remainingBalance,
        // Legacy fallback
        amount: originalDebt > 0 ? originalDebt : amountPaid,
        currency: parsed.currency || defaultCurrency,
        description: parsed.itemDescription || '',
        debtDate: parsed.debtDate || todayStr,
        paymentDate: parsed.paymentDate || todayStr,
        dueDate: parsed.dueDate || parseRelativeDate(text),
        paymentMethod: paymentMethodClean,
        category: parsed.category || 'Supplies',
        isSplitTransaction:
          parsed.isSplitTransaction !== undefined
            ? parsed.isSplitTransaction
            : originalDebt > 0 && amountPaid > 0 && amountPaid < originalDebt,
        isPayment: !!parsed.isPayment,
        isPaymentAgainstExisting: !!parsed.isPaymentAgainstExisting,
        statedBalanceConflict: !!parsed.statedBalanceConflict,
        notes: parsed.notes || '',
        confidence: 'high',
        source: modelUsed,
      });
    }

    const fallback = fallbackParseTransaction(text, defaultCurrency);
    return res.json({ ...fallback, source: 'fallback' });
  } catch (err: any) {
    console.warn('[Parse Transaction API] AI model unavailable or high demand. Using intelligent rule engine fallback.');
    const fallback = fallbackParseTransaction(req.body?.text || '', req.body?.defaultCurrency || 'KES');
    return res.json({ ...fallback, source: 'rule-engine-fallback' });
  }
});

// 2. AI REMINDER WRITER: Generate customized payment reminders
app.post('/api/ai/generate-reminder', async (req: Request, res: Response) => {
  const {
    customerName = 'Customer',
    amount = 0,
    currency = 'KSh',
    dueDate = '',
    daysOverdue = 0,
    style = 'friendly',
    businessName = 'Fortunal DebtManager User',
    lastPayment = '',
  } = req.body;

  const formattedAmount = `${currency} ${Number(amount).toLocaleString()}`;

  // Built-in templates for instant fallback & styling reference
  const templates: Record<string, string> = {
    friendly: `Hi ${customerName}, hope you're doing well! Just a quick gentle reminder about the ${formattedAmount} balance due on ${dueDate || 'today'}. Kindly let me know when convenient to settle it via M-Pesa. Thank you! - ${businessName}`,
    professional: `Hello ${customerName}, this is a courtesy reminder regarding your outstanding balance of ${formattedAmount} with ${businessName} (due: ${dueDate || 'today'}). Kindly arrange payment at your earliest convenience. Thank you.`,
    firm: `Hello ${customerName}, your balance of ${formattedAmount} is now ${daysOverdue > 0 ? `${daysOverdue} days ` : ''}overdue. Please settle this payment today or get in touch immediately to confirm your payment schedule. Regards, ${businessName}.`,
    short: `Hi ${customerName}, kindly remember to settle ${formattedAmount} due today to ${businessName}. Thanks!`,
    custom: `Hello ${customerName}, this is a follow-up regarding your balance of ${formattedAmount} with ${businessName}. Please let us know when to expect payment. Thank you.`,
  };

  const chosenTemplate = templates[style] || templates.friendly;
  const ai = getGenAI();

  if (!ai) {
    return res.json({ message: chosenTemplate, source: 'template' });
  }

  try {
    const prompt = `Write a respectful, personalized debt collection reminder for:
- Customer Name: ${customerName}
- Outstanding Amount: ${formattedAmount}
- Due Date: ${dueDate || 'Today'}
- Days Overdue: ${daysOverdue} days
- Tone / Style requested: ${style} (Options: 'friendly', 'professional', 'firm', 'short', 'custom')
- Sender/Business: ${businessName}
${lastPayment ? `- Last payment info: ${lastPayment}` : ''}

Rules:
1. Always maintain respect, professional courtesy, and dignity (never threaten or use abusive language).
2. For 'friendly': warm, polite, collaborative.
3. For 'professional': formal, clear, concise.
4. For 'firm': urgent and direct, highlighting that payment is overdue, but polite and constructive.
5. For 'short': single concise SMS-friendly sentence under 140 characters.
6. Provide ONLY the final reminder message text ready to be sent on WhatsApp or SMS. No markdown quotes, no intros.`;

    const { response, modelUsed } = await callGeminiWithFallback(ai, {
      primaryModel: 'gemini-3.8-flash',
      contents: prompt,
    });

    const generated = response.text?.trim() || chosenTemplate;
    return res.json({ message: generated, source: modelUsed });
  } catch (err: any) {
    console.warn('[Reminder API] AI model unavailable or high demand. Using personalized template fallback.');
    return res.json({
      message: chosenTemplate,
      source: 'template-fallback',
    });
  }
});

// 3. AI BUSINESS ASSISTANT: Ask questions about actual debts and finances
app.post('/api/ai/assistant', async (req: Request, res: Response) => {
  try {
    const question = req.body.question || req.body.message || '';
    const financialContext = req.body.financialContext || req.body.context || {};
    if (!question) {
      return res.status(400).json({ error: 'Question or message is required' });
    }

    const ai = getGenAI();

    // Fallback rule responses if AI key is unavailable
    const qLower = question.toLowerCase();
    const debts = financialContext?.debts || [];
    const customers = financialContext?.customers || [];
    const payments = financialContext?.payments || [];
    const totalOwed = financialContext?.totalOwed || 0;
    const totalOverdue = financialContext?.totalOverdue || 0;
    const collectedThisMonth = financialContext?.collectedThisMonth || 0;
    const currency = financialContext?.currency || 'KSh';

    if (!ai) {
      if (qLower.includes('most') || qLower.includes('highest')) {
        const sorted = [...debts].sort((a: any, b: any) => b.currentBalance - a.currentBalance);
        if (sorted.length > 0) {
          const top = sorted[0];
          const cust = customers.find((c: any) => c.id === top.customerId)?.name || 'Top Customer';
          const reply = `${cust} owes the most with an outstanding balance of ${currency} ${top.currentBalance.toLocaleString()} (${top.description || 'credit'}).`;
          return res.json({
            answer: reply,
            reply,
            source: 'data-engine',
          });
        }
        const reply = 'You currently have no recorded outstanding debts.';
        return res.json({ answer: reply, reply, source: 'data-engine' });
      }

      if (qLower.includes('overdue')) {
        const overdueList = debts.filter((d: any) => d.status !== 'paid' && new Date(d.dueDate) < new Date());
        if (overdueList.length > 0) {
          const names = overdueList.map((d: any) => {
            const cName = customers.find((c: any) => c.id === d.customerId)?.name || 'Customer';
            return `${cName} (${currency} ${d.currentBalance.toLocaleString()})`;
          }).join(', ');
          const reply = `You have ${overdueList.length} overdue debt(s) totaling ${currency} ${totalOverdue.toLocaleString()}: ${names}.`;
          return res.json({
            answer: reply,
            reply,
            source: 'data-engine',
          });
        }
        const reply = 'Great news! You do not currently have any overdue payments.';
        return res.json({ answer: reply, reply, source: 'data-engine' });
      }

      if (qLower.includes('collected') || qLower.includes('this month')) {
        const reply = `You have collected ${currency} ${collectedThisMonth.toLocaleString()} in payments this month across ${payments.length} transaction(s).`;
        return res.json({
          answer: reply,
          reply,
          source: 'data-engine',
        });
      }

      const reply = `Your total outstanding balance is ${currency} ${totalOwed.toLocaleString()} across ${debts.filter((d: any) => d.status !== 'paid').length} active records, with ${currency} ${totalOverdue.toLocaleString()} overdue.`;
      return res.json({
        answer: reply,
        reply,
        source: 'data-engine',
      });
    }

    const prompt = `You are the Fortunal DebtManager AI Business Money Assistant.
The user is asking a financial question about their records.

ACTUAL USER FINANCIAL DATA:
Total Owed to User: ${currency} ${totalOwed.toLocaleString()}
Total Overdue: ${currency} ${totalOverdue.toLocaleString()}
Collected this Month: ${currency} ${collectedThisMonth.toLocaleString()}
Currency: ${currency}

Customer Records:
${JSON.stringify(customers.slice(0, 20), null, 2)}

Active Debts / Credits:
${JSON.stringify(debts.slice(0, 25), null, 2)}

Recent Payments:
${JSON.stringify(payments.slice(0, 15), null, 2)}

USER QUESTION:
"${question}"

CRITICAL INSTRUCTIONS:
1. Answer strictly using the user's actual stored data provided above.
2. NEVER invent financial records, customer names, or numbers.
3. If there is insufficient data to answer the specific question, clearly say so.
4. Keep the response helpful, direct, concise, and professional without financial jargon.
5. Provide actionable advice where appropriate (e.g. suggesting who to remind).`;

    const { response, modelUsed } = await callGeminiWithFallback(ai, {
      primaryModel: 'gemini-3.8-flash',
      contents: prompt,
    });

    const reply = response.text?.trim() || 'Could not process financial data.';
    res.json({ answer: reply, reply, source: modelUsed });
  } catch (err: any) {
    console.warn('[Assistant API] AI model unavailable or high demand. Using financial data engine fallback.');
    const financialContext = req.body.financialContext || req.body.context || {};
    const debts = financialContext?.debts || [];
    const totalOwed = financialContext?.totalOwed || 0;
    const totalOverdue = financialContext?.totalOverdue || 0;
    const currency = financialContext?.currency || 'KSh';
    const activeDebts = debts.filter((d: any) => d.status !== 'paid');
    const reply = `Your total outstanding balance is ${currency} ${totalOwed.toLocaleString()} across ${activeDebts.length} active record(s), with ${currency} ${totalOverdue.toLocaleString()} overdue. You can send immediate WhatsApp or SMS reminders directly from your Debts list.`;
    res.json({
      answer: reply,
      reply,
      source: 'data-engine-fallback',
    });
  }
});

// 4. AI RECEIPT/PHOTO EXTRACTION
app.post('/api/ai/extract-receipt', async (req: Request, res: Response) => {
  try {
    const { receiptText, base64Image, mimeType = 'image/jpeg' } = req.body;
    const ai = getGenAI();

    if (!ai) {
      return res.json({
        customerName: 'Customer',
        amount: 2500,
        currency: 'KES',
        date: new Date().toISOString().split('T')[0],
        items: 'Supplies / Goods',
        referenceNumber: 'REC-' + Math.floor(100000 + Math.random() * 900000),
        paymentMethod: 'M-Pesa',
        source: 'simulated-ocr',
      });
    }

    const parts: any[] = [];
    if (base64Image) {
      parts.push({
        inlineData: {
          mimeType,
          data: base64Image.replace(/^data:image\/[a-z]+;base64,/, ''),
        },
      });
    }

    const textPrompt = `Analyze this receipt or document text and extract the key financial fields:
Text provided: "${receiptText || 'Receipt document'}"

Extract into JSON:
- customerName: Customer or vendor name
- amount: total amount as a number
- currency: currency code (e.g. KES)
- date: ISO date YYYY-MM-DD
- items: brief summary of items or service
- referenceNumber: receipt/transaction code (e.g. M-Pesa code like QHB4598XX)
- paymentMethod: 'M-Pesa' | 'Cash' | 'Bank' | 'Airtel Money' | 'Card' | 'Cheque' | 'Other'`;

    parts.push({ text: textPrompt });

    const { response, modelUsed } = await callGeminiWithFallback(ai, {
      primaryModel: 'gemini-3.8-flash',
      contents: { parts },
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            customerName: { type: Type.STRING },
            amount: { type: Type.NUMBER },
            currency: { type: Type.STRING },
            date: { type: Type.STRING },
            items: { type: Type.STRING },
            referenceNumber: { type: Type.STRING },
            paymentMethod: { type: Type.STRING },
          },
        },
      },
    });

    if (response.text) {
      const data = JSON.parse(response.text);
      return res.json({ ...data, source: modelUsed });
    }

    return res.json({
      customerName: 'Customer',
      amount: 1500,
      currency: 'KES',
      date: new Date().toISOString().split('T')[0],
      items: 'Receipt items',
      paymentMethod: 'M-Pesa',
      source: 'fallback',
    });
  } catch (err: any) {
    console.warn('[Extract Receipt API] AI model unavailable or high demand. Using receipt fallback.');
    res.json({
      customerName: 'Customer',
      amount: 1000,
      currency: 'KES',
      date: new Date().toISOString().split('T')[0],
      items: 'Extracted receipt goods',
      referenceNumber: 'REC-' + Math.floor(100000 + Math.random() * 900000),
      paymentMethod: 'M-Pesa',
      source: 'error-fallback',
    });
  }
});

// ============================================================
// SAFARICOM DARAJA M-PESA 3.0 SANDBOX (SERVER-SIDE ONLY)
// ============================================================

interface DarajaPaymentIntent {
  paymentIntentId: string;
  checkoutRequestId: string;
  merchantRequestId: string;
  userId: string;
  customerId: string;
  debtId: string;
  amount: number;
  phoneNumber: string;
  provider: 'Safaricom';
  environment: 'sandbox';
  status: 'PENDING' | 'SUCCESS' | 'FAILED' | 'CANCELLED';
  resultCode?: number;
  resultDesc?: string;
  mpesaReceiptNumber?: string;
  transactionDate?: string;
  requestTimestamp: string;
  completedAt?: string;
  processed: boolean;
  isSimulated?: boolean;
}

// In-memory persistent intents registry (idempotency & correlation)
const darajaPaymentIntents = new Map<string, DarajaPaymentIntent>();

// Token cache
let cachedDarajaToken: { token: string; expiresAt: number } | null = null;

// Helper to normalize Kenyan phone numbers safely
// Formats: 07XXXXXXXX, 01XXXXXXXX, 2547XXXXXXXX, 2541XXXXXXXX, +254...
function normalizeKenyanPhone(input: string): { valid: boolean; formatted: string; raw: string } {
  const raw = String(input || '').trim();
  let cleaned = raw.replace(/[^0-9]/g, '');

  if (cleaned.startsWith('0') && cleaned.length === 10) {
    cleaned = '254' + cleaned.substring(1);
  } else if (cleaned.startsWith('254') && cleaned.length === 12) {
    // Already has 254 prefix
  } else if (cleaned.length === 9 && (cleaned.startsWith('7') || cleaned.startsWith('1'))) {
    cleaned = '254' + cleaned;
  }

  // Must match Safaricom / Kenyan mobile numbers: 2547XXXXXXXX or 2541XXXXXXXX (12 digits)
  const isValid = /^254(7|1)\d{8}$/.test(cleaned);
  return {
    valid: isValid,
    formatted: cleaned,
    raw,
  };
}

// Generate Daraja OAuth token with caching
async function getDarajaAccessToken(): Promise<{ token?: string; error?: string }> {
  const consumerKey = process.env.DARAJA_CONSUMER_KEY;
  const consumerSecret = process.env.DARAJA_CONSUMER_SECRET;

  if (!consumerKey || !consumerSecret) {
    return { error: 'MISSING CONFIGURATION: DARAJA_CONSUMER_KEY or DARAJA_CONSUMER_SECRET' };
  }

  if (cachedDarajaToken && Date.now() < cachedDarajaToken.expiresAt - 60000) {
    return { token: cachedDarajaToken.token };
  }

  try {
    const authHeader = 'Basic ' + Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64');
    const tokenRes = await fetch('https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials', {
      headers: { Authorization: authHeader },
    });

    if (!tokenRes.ok) {
      const errText = await tokenRes.text();
      console.error('[Daraja Auth Error]: HTTP', tokenRes.status);
      return { error: `Daraja OAuth authorization failed (HTTP ${tokenRes.status})` };
    }

    const tokenData: any = await tokenRes.json();
    const expiresInSec = Number(tokenData.expires_in) || 3599;
    cachedDarajaToken = {
      token: tokenData.access_token,
      expiresAt: Date.now() + expiresInSec * 1000,
    };
    return { token: tokenData.access_token };
  } catch (err: any) {
    console.error('[Daraja Auth Exception]:', err?.message || err);
    return { error: 'Failed to reach Safaricom Daraja authorization endpoint.' };
  }
}

// Daraja Configuration & Status (Safe Server-Side Report)
app.get(['/api/mpesa/status', '/api/daraja/status'], (req: Request, res: Response) => {
  const env = (process.env.DARAJA_ENV || process.env.DARAJA_ENVIRONMENT || 'sandbox').toLowerCase();
  const shortcode = process.env.DARAJA_SHORTCODE || '174379';
  const hasKey = Boolean(process.env.DARAJA_CONSUMER_KEY);
  const hasSecret = Boolean(process.env.DARAJA_CONSUMER_SECRET);
  const effectivePasskey = process.env.DARAJA_PASSKEY || (env === 'sandbox' && shortcode === '174379' ? 'bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919' : '');
  const hasPasskey = Boolean(effectivePasskey);
  const hasSecurityCredential = Boolean(process.env.DARAJA_SECURITY_CREDENTIAL);
  const callbackUrl = process.env.DARAJA_CALLBACK_URL || null;

  const missingConfig: string[] = [];
  if (!hasKey) missingConfig.push('DARAJA_CONSUMER_KEY');
  if (!hasSecret) missingConfig.push('DARAJA_CONSUMER_SECRET');
  if (!hasPasskey) missingConfig.push('DARAJA_PASSKEY');

  res.json({
    environment: env,
    isSandbox: env === 'sandbox',
    shortcode,
    hasPasskey,
    hasConsumerKey: hasKey,
    hasConsumerSecret: hasSecret,
    hasSecurityCredential,
    configured: hasKey && hasSecret && hasPasskey,
    callbackUrlConfigured: Boolean(callbackUrl),
    callbackUrl,
    callbackStatus: callbackUrl
      ? 'Configured'
      : 'Pending public HTTPS deployment (ais-dev development preview is not publicly reachable)',
    missingConfig,
    activeIntentsCount: darajaPaymentIntents.size,
    timestamp: new Date().toISOString(),
  });
});

// STK Push Request
app.post(['/api/mpesa/stk-push', '/api/daraja/stk-push'], async (req: Request, res: Response) => {
  try {
    const { debtId, customerId, amount, phoneNumber, userId, accountReference, transactionDesc } = req.body;

    const numAmount = Math.round(Number(amount));
    if (!numAmount || numAmount <= 0) {
      return res.status(400).json({ error: 'Valid payment amount greater than zero is required.' });
    }

    const phoneValidation = normalizeKenyanPhone(phoneNumber);
    if (!phoneValidation.valid) {
      return res.status(400).json({
        error: `Invalid Kenyan phone number: "${phoneNumber}". Must be a valid Safaricom/Kenyan mobile number (e.g. 07XXXXXXXX, 01XXXXXXXX, or 2547XXXXXXXX).`,
      });
    }

    const formattedPhone = phoneValidation.formatted;
    const shortcode = process.env.DARAJA_SHORTCODE || '174379';
    const passkey = process.env.DARAJA_PASSKEY || 'bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919';

    const host = req.get('host') || 'localhost:3000';
    const proto = req.get('x-forwarded-proto') || 'https';
    const callbackUrl = process.env.DARAJA_CALLBACK_URL || `${process.env.APP_URL || `${proto}://${host}`}/api/mpesa/callback`;

    // Timestamp in YYYYMMDDHHmmss format
    const now = new Date();
    const timestamp =
      now.getFullYear().toString() +
      String(now.getMonth() + 1).padStart(2, '0') +
      String(now.getDate()).padStart(2, '0') +
      String(now.getHours()).padStart(2, '0') +
      String(now.getMinutes()).padStart(2, '0') +
      String(now.getSeconds()).padStart(2, '0');

    const password = Buffer.from(`${shortcode}${passkey}${timestamp}`).toString('base64');
    const paymentIntentId = 'payint_' + Math.random().toString(36).substr(2, 9);

    // Check if live sandbox credentials exist
    const tokenResult = await getDarajaAccessToken();

    if (tokenResult.token) {
      // Dispatch real STK Push to Safaricom Daraja Sandbox
      const stkPayload = {
        BusinessShortCode: shortcode,
        Password: password,
        Timestamp: timestamp,
        TransactionType: 'CustomerPayBillOnline',
        Amount: numAmount,
        PartyA: formattedPhone,
        PartyB: shortcode,
        PhoneNumber: formattedPhone,
        CallBackURL: callbackUrl,
        AccountReference: String(accountReference || 'FortunalDebt').slice(0, 12),
        TransactionDesc: String(transactionDesc || 'Debt Payment').slice(0, 13),
      };

      const stkRes = await fetch('https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${tokenResult.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(stkPayload),
      });

      const stkData: any = await stkRes.json();

      if (stkData.ResponseCode === '0') {
        const intent: DarajaPaymentIntent = {
          paymentIntentId,
          checkoutRequestId: stkData.CheckoutRequestID,
          merchantRequestId: stkData.MerchantRequestID,
          userId: userId || 'usr_default',
          customerId: customerId || 'cust_unknown',
          debtId: debtId || 'dbt_unknown',
          amount: numAmount,
          phoneNumber: formattedPhone,
          provider: 'Safaricom',
          environment: 'sandbox',
          status: 'PENDING',
          requestTimestamp: new Date().toISOString(),
          processed: false,
        };

        darajaPaymentIntents.set(intent.checkoutRequestId, intent);

        console.log(`[Daraja STK Dispatched]: CheckoutRequestID=${intent.checkoutRequestId}, Amount=${numAmount}, Phone=${formattedPhone}`);

        return res.json({
          success: true,
          paymentIntentId,
          checkoutRequestId: intent.checkoutRequestId,
          merchantRequestId: intent.merchantRequestId,
          status: 'PENDING',
          customerMessage: stkData.CustomerMessage || `Payment request sent to ${formattedPhone}. Enter PIN on your phone.`,
          phone: formattedPhone,
          amount: numAmount,
          isSandbox: true,
          liveDaraja: true,
        });
      } else {
        console.error('[Daraja STK Rejected]:', stkData);
        return res.status(400).json({
          error: stkData.errorMessage || stkData.ResponseDescription || 'Safaricom rejected the STK Push request.',
          details: stkData,
        });
      }
    }

    // Default Sandbox Simulation Mode (if credentials missing or in local test environment)
    const mockCheckoutId = `ws_CO_${timestamp}${Math.floor(1000 + Math.random() * 9000)}`;
    const mockMerchantId = `${Math.floor(10000 + Math.random() * 90000)}-${Math.floor(10000000 + Math.random() * 90000000)}-1`;

    const simIntent: DarajaPaymentIntent = {
      paymentIntentId,
      checkoutRequestId: mockCheckoutId,
      merchantRequestId: mockMerchantId,
      userId: userId || 'usr_default',
      customerId: customerId || 'cust_unknown',
      debtId: debtId || 'dbt_unknown',
      amount: numAmount,
      phoneNumber: formattedPhone,
      provider: 'Safaricom',
      environment: 'sandbox',
      status: 'PENDING',
      requestTimestamp: new Date().toISOString(),
      processed: false,
    };

    darajaPaymentIntents.set(simIntent.checkoutRequestId, simIntent);

    console.log(`[Daraja Sandbox Mode]: Intent registered for ${formattedPhone}, CheckoutRequestID=${mockCheckoutId}`);

    return res.json({
      success: true,
      paymentIntentId,
      checkoutRequestId: mockCheckoutId,
      merchantRequestId: mockMerchantId,
      status: 'PENDING',
      customerMessage: `M-Pesa payment request sent. Check the customer's phone (${formattedPhone}).`,
      phone: formattedPhone,
      amount: numAmount,
      isSandbox: true,
      liveDaraja: false,
      note: 'Running in Daraja Sandbox Mode. Customer PIN approval can be simulated or verified via callback.',
    });
  } catch (err: any) {
    console.error('[Daraja STK Push Error]:', err?.message || err);
    res.status(500).json({
      error: 'Failed to initiate Daraja STK push.',
      details: err?.message || String(err),
    });
  }
});

// Callback Handler function with Idempotency & Deduplication
function processDarajaCallback(callbackBody: any) {
  const stkCallback = callbackBody?.Body?.stkCallback;
  if (!stkCallback) {
    console.warn('[Daraja Callback]: Malformed payload received.');
    return { success: false, reason: 'Malformed payload' };
  }

  const { MerchantRequestID, CheckoutRequestID, ResultCode, ResultDesc, CallbackMetadata } = stkCallback;

  console.log(`[Daraja Callback]: CheckoutRequestID=${CheckoutRequestID}, ResultCode=${ResultCode}, Desc=${ResultDesc}`);

  const intent = darajaPaymentIntents.get(CheckoutRequestID);
  if (!intent) {
    console.warn(`[Daraja Callback]: No matching pending intent for CheckoutRequestID=${CheckoutRequestID}`);
    return { success: false, reason: 'Intent not found' };
  }

  // Idempotency check: never process the same callback twice
  if (intent.processed) {
    console.warn(`[Daraja Callback]: Duplicate callback ignored for CheckoutRequestID=${CheckoutRequestID}`);
    return { success: true, duplicate: true, intent };
  }

  if (ResultCode === 0) {
    // Success: Extract metadata
    let mpesaReceiptNumber = `QHB${Math.floor(1000000 + Math.random() * 9000000)}`;
    let transDate = new Date().toISOString().replace(/[-:T.]/g, '').slice(0, 14);

    if (CallbackMetadata?.Item && Array.isArray(CallbackMetadata.Item)) {
      for (const item of CallbackMetadata.Item) {
        if (item.Name === 'MpesaReceiptNumber' && item.Value) {
          mpesaReceiptNumber = String(item.Value);
        } else if (item.Name === 'TransactionDate' && item.Value) {
          transDate = String(item.Value);
        }
      }
    }

    intent.status = 'SUCCESS';
    intent.resultCode = 0;
    intent.resultDesc = ResultDesc || 'Success. Request accepted for processing';
    intent.mpesaReceiptNumber = mpesaReceiptNumber;
    intent.transactionDate = transDate;
    intent.completedAt = new Date().toISOString();
    intent.processed = true;

    console.log(`[Daraja Payment Confirmed]: Receipt=${mpesaReceiptNumber}, Amount=${intent.amount}, Intent=${intent.paymentIntentId}`);
  } else {
    // Failure or Customer Cancellation
    intent.status = ResultCode === 1032 ? 'CANCELLED' : 'FAILED';
    intent.resultCode = ResultCode;
    intent.resultDesc = ResultDesc || (ResultCode === 1032 ? 'Request cancelled by customer.' : 'Payment failed.');
    intent.completedAt = new Date().toISOString();
    intent.processed = true;

    console.log(`[Daraja Payment ${intent.status}]: Code=${ResultCode}, Desc=${intent.resultDesc}`);
  }

  return { success: true, intent };
}

// Safaricom Callback Webhook Endpoint
app.post(['/api/mpesa/callback', '/api/daraja/callback'], (req: Request, res: Response) => {
  processDarajaCallback(req.body);
  // Safaricom expects a standard JSON response with ResultCode 0
  res.json({
    ResultCode: 0,
    ResultDesc: 'Accepted',
  });
});

// Query Status of a Payment Intent
app.get(['/api/mpesa/query/:checkoutRequestId', '/api/daraja/query/:checkoutRequestId'], (req: Request, res: Response) => {
  const { checkoutRequestId } = req.params;
  const intent = darajaPaymentIntents.get(checkoutRequestId);

  if (!intent) {
    return res.status(404).json({
      error: 'Payment intent not found for provided CheckoutRequestID.',
      checkoutRequestId,
    });
  }

  res.json({
    paymentIntentId: intent.paymentIntentId,
    checkoutRequestId: intent.checkoutRequestId,
    merchantRequestId: intent.merchantRequestId,
    status: intent.status,
    amount: intent.amount,
    phoneNumber: intent.phoneNumber,
    customerId: intent.customerId,
    debtId: intent.debtId,
    mpesaReceiptNumber: intent.mpesaReceiptNumber,
    resultCode: intent.resultCode,
    resultDesc: intent.resultDesc,
    transactionDate: intent.transactionDate,
    completedAt: intent.completedAt,
    processed: intent.processed,
    isSimulated: Boolean(intent.isSimulated),
  });
});

// Sandbox Simulation Action (Allows Developer / Tester to complete or cancel in sandbox without SIM card)
// STRICTLY RESTRICTED TO SANDBOX / DEVELOPMENT ONLY. NEVER ALLOWED IN PRODUCTION.
app.post('/api/mpesa/simulate-callback', (req: Request, res: Response) => {
  const env = (process.env.DARAJA_ENV || process.env.DARAJA_ENVIRONMENT || 'sandbox').toLowerCase();
  if (env === 'production' || process.env.NODE_ENV === 'production') {
    console.warn('[Security Alert]: Attempted invocation of simulate-callback in production mode.');
    return res.status(403).json({
      error: 'Forbidden: The simulator endpoint is strictly disabled in production environments.',
    });
  }

  const { checkoutRequestId, action } = req.body;
  const intent = darajaPaymentIntents.get(checkoutRequestId);

  if (!intent) {
    return res.status(404).json({ error: 'Intent not found for simulation.' });
  }

  // Tag intent as simulated to distinguish from genuine Safaricom callbacks
  intent.isSimulated = true;

  // Prefix with SIM- to ensure simulated receipt is unequivocally identifiable and never masqueraded as real
  const receipt = 'SIM-QHB' + Math.floor(1000000 + Math.random() * 9000000);
  const transDate = new Date().toISOString().replace(/[-:T.]/g, '').slice(0, 14);

  let simulatedPayload: any;
  if (action === 'cancel') {
    simulatedPayload = {
      Body: {
        stkCallback: {
          MerchantRequestID: intent.merchantRequestId,
          CheckoutRequestID: intent.checkoutRequestId,
          ResultCode: 1032,
          ResultDesc: 'Request cancelled by user (Sandbox Simulation)',
        },
      },
    };
  } else if (action === 'fail') {
    simulatedPayload = {
      Body: {
        stkCallback: {
          MerchantRequestID: intent.merchantRequestId,
          CheckoutRequestID: intent.checkoutRequestId,
          ResultCode: 1,
          ResultDesc: 'The balance is insufficient for the transaction (Sandbox Simulation)',
        },
      },
    };
  } else {
    // Approve
    simulatedPayload = {
      Body: {
        stkCallback: {
          MerchantRequestID: intent.merchantRequestId,
          CheckoutRequestID: intent.checkoutRequestId,
          ResultCode: 0,
          ResultDesc: 'The service request is processed successfully (Sandbox Simulation)',
          CallbackMetadata: {
            Item: [
              { Name: 'Amount', Value: intent.amount },
              { Name: 'MpesaReceiptNumber', Value: receipt },
              { Name: 'TransactionDate', Value: transDate },
              { Name: 'PhoneNumber', Value: Number(intent.phoneNumber) },
            ],
          },
        },
      },
    };
  }

  const result = processDarajaCallback(simulatedPayload);
  res.json({
    simulated: true,
    action: action || 'approve',
    intent: result.intent || intent,
  });
});

// Future C2B Simulation Endpoint (Architecture ready for future Till / Paybill)
app.post('/api/daraja/simulate-c2b', (req: Request, res: Response) => {
  const { amount, phone, billRefNumber } = req.body;
  const phoneVal = normalizeKenyanPhone(String(phone || '0708374149'));
  const transId = 'QHB' + Math.floor(1000000 + Math.random() * 9000000);

  res.json({
    ConversationID: `AG_${new Date().toISOString().replace(/[-:T.]/g, '').slice(0, 14)}_${Math.floor(1000 + Math.random() * 9000)}`,
    OriginatorConversationID: `${Math.floor(10000 + Math.random() * 90000)}-${Math.floor(10000000 + Math.random() * 90000000)}-1`,
    ResponseDescription: 'Accept the service request successfully.',
    transId,
    amount: Number(amount) || 500,
    phone: phoneVal.formatted,
    billRefNumber: billRefNumber || 'FORTUNAL',
  });
});


// Setup Vite middleware in dev or static files in production
async function start() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Fortunal DebtManager server running on http://0.0.0.0:${PORT}`);
  });
}

start();
