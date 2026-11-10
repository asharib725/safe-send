/* Safe Send · risk engine
 *
 * Split of responsibilities (the core design decision):
 *   - DETECTION is deterministic. Signals come from data the wallet already has
 *     (history, reports, account age, note text). No model decides risk on its own.
 *   - LANGUAGE is where AI helps. In production a model phrases the explanation,
 *     but only from the detected signals and only if it passes validate() below.
 *     In this prototype the phrasing comes from approved templates, which are run
 *     through the same validator, so the AI Rules page shows exactly what the code enforces.
 */
(function () {
  const USUAL_AMOUNT = 4000;          // the user's median transfer (demo data)
  // Phrases, not single words: a bare "fee" would flag every "school fee" sent to family.
  const URGENT_WORDS = ["urgent", "prize", "lottery", "winner", "inaam", "claim fee", "processing fee",
    "otp", "verification code", "refund", "wrong transfer", "galti se", "bisp", "jaldi", "fori"];

  // ---------- signals ----------
  const SIGNALS = {
    NEW_RECIPIENT: {
      weight: 1,
      en: "You haven't sent money to this number before.",
      ur: "آپ نے اس نمبر پر پہلے کبھی رقم نہیں بھیجی۔",
    },
    UNUSUAL_AMOUNT: {
      weight: 1,
      en: "This is much more than you usually send.",
      ur: "یہ رقم آپ کی عام ٹرانسفر سے کافی زیادہ ہے۔",
    },
    NEW_ACCOUNT: {
      weight: 2,
      en: (r) => `This account was opened ${r.accountAgeDays} days ago.`,
      ur: (r) => `یہ اکاؤنٹ صرف ${r.accountAgeDays} دن پہلے کھولا گیا ہے۔`,
    },
    REPORTED: {
      weight: 3,
      en: (r) => `${r.reports} people reported this number in the last 7 days.`,
      ur: (r) => `پچھلے 7 دنوں میں ${r.reports} صارفین نے اس نمبر کی شکایت کی ہے۔`,
    },
    URGENT_NOTE: {
      weight: 2,
      en: "The note mentions a prize, fee or urgent payment.",
      ur: "نوٹ میں انعام، فیس یا فوری ادائیگی کا ذکر ہے۔",
    },
  };

  function detect({ recipient, amount, note }) {
    const s = [];
    if (!recipient.sentBefore) s.push("NEW_RECIPIENT");
    if (amount >= USUAL_AMOUNT * 2.5 && !recipient.sentBefore) s.push("UNUSUAL_AMOUNT");
    if (recipient.accountAgeDays !== undefined && recipient.accountAgeDays < 30) s.push("NEW_ACCOUNT");
    if (recipient.reports > 0) s.push("REPORTED");
    const n = (note || "").toLowerCase();
    if (URGENT_WORDS.some((w) => n.includes(w))) s.push("URGENT_NOTE");
    return s;
  }

  function level(signals) {
    const score = signals.reduce((a, k) => a + SIGNALS[k].weight, 0);
    if (signals.includes("REPORTED") || score >= 4) return "stop";
    if (score >= 1) return "check";
    return "clear";
  }

  // ---------- approved explanation templates (what the model is allowed to say) ----------
  const COPY = {
    clear: {
      en: { title: "No warning signs found", body: "We checked this transfer against common scam patterns." },
      ur: { title: "کوئی خطرے کی علامت نہیں ملی", body: "ہم نے اس ٹرانسفر کو عام دھوکہ دہی کے طریقوں سے جانچا ہے۔" },
    },
    check: {
      en: { title: "Check before you send", body: "If you know this person, a quick call to confirm is worth it." },
      ur: { title: "بھیجنے سے پہلے تصدیق کر لیں", body: "اگر آپ اس شخص کو جانتے ہیں تو بھیجنے سے پہلے فون پر تصدیق کر لیں۔" },
    },
    stop: {
      en: { title: "This matches a known scam pattern", body: "Being asked to pay a fee to receive a prize is a common scam. Sent money usually can't be reversed." },
      ur: { title: "یہ ایک عام دھوکے جیسا لگتا ہے", body: "انعام وصول کرنے کے لیے فیس مانگنا ایک عام دھوکہ ہے۔ بھیجی گئی رقم عام طور پر واپس نہیں ہوتی۔" },
      stopNoPrize: {
        en: { title: "This matches a known scam pattern", body: "Several warning signs showed up together. Sent money usually can't be reversed." },
        ur: { title: "یہ ایک عام دھوکے جیسا لگتا ہے", body: "کئی خطرے کی علامات ایک ساتھ ملی ہیں۔ بھیجی گئی رقم عام طور پر واپس نہیں ہوتی۔" },
      },
    },
  };

  function explain(lvl, signals, lang) {
    if (lvl === "stop" && !signals.includes("URGENT_NOTE")) return COPY.stop.stopNoPrize[lang];
    return COPY[lvl][lang];
  }

  function signalText(key, recipient, lang) {
    const v = SIGNALS[key][lang];
    return typeof v === "function" ? v(recipient) : v;
  }

  // ---------- guardrails: every explanation must pass before it is shown ----------
  const NEVER = [
    { id: "no-safety-claims", rule: "Never call a transfer or a person safe, verified or guaranteed.",
      test: (t) => /\b(safe|secure|verified|guarantee[ds]?)\b/i.test(t) || /محفوظ|تصدیق شدہ/.test(t) },
    { id: "no-accusations", rule: "Never call a person a scammer or fraudster. Describe the pattern, not the person.",
      test: (t) => /\b(scammer|fraudster|thief|criminal)\b/i.test(t) || /دھوکے باز|چور/.test(t) },
    { id: "no-amounts", rule: "Never suggest an amount. The user decides how much to send.",
      test: (t) => /\b(rs\.?|pkr)\s?\d/i.test(t) || /\b\d{1,3}(,\d{3})+\b|\b\d{4,}\b/.test(t) },
    { id: "no-certainty", rule: "Never claim certainty. Patterns can be wrong.",
      test: (t) => /100\s?%|\b(definitely|certainly|for sure|always)\b/i.test(t) },
    { id: "short", rule: "Two sentences at most. People read this mid-payment.",
      test: (t) => (t.match(/[.!?۔](\s|$)/g) || []).length > 2 },
  ];

  function validate(text) {
    const failed = NEVER.filter((r) => r.test(text)).map((r) => r.id);
    return { ok: failed.length === 0, failed };
  }

  const WHERE_AI_ACTS = [
    "Writes the one-line explanation, in English or Urdu, from the signals detection found.",
    "Matches the tone to the level: calm when nothing was found, firm when a scam pattern shows up.",
  ];
  const WHERE_AI_NEVER_ACTS = [
    "Deciding the risk level. That's rules on data the wallet already has.",
    "Blocking a payment. The user can always send after confirming they know the person.",
    "Anything about money: amounts, fees, balances or limits.",
  ];

  const REJECTED = [
    { text: "You're safe to send this.", why: "Promises safety the system can't know." },
    { text: "K. Ahmed is a scammer, don't pay him.", why: "Accuses a named person instead of describing a pattern." },
    { text: "Try sending Rs 2,000 instead.", why: "Suggests an amount. That's the user's decision." },
    { text: "Our AI is 100% sure this is fraud.", why: "Claims certainty. Patterns can be wrong." },
  ];

  window.Risk = { detect, level, explain, signalText, validate, NEVER, WHERE_AI_ACTS, WHERE_AI_NEVER_ACTS, REJECTED, COPY, SIGNALS, URGENT_WORDS, USUAL_AMOUNT };
})();
