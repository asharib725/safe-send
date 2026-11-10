/* Safe Send · app (screens, navigation, demo panel, documentation tabs) */
(function () {
  const { h, Icon, Button, IconButton, Avatar, ContactRow, AmountField, Keypad, StatusStep, RiskBanner, SummaryRow, Checkbox, SlideToConfirm, Sheet, Toast, fmt } = UI;

  // ---------- demo data (fictional) ----------
  const CONTACTS = [
    { name: "Ammi", number: "0300 0000112", sentBefore: true, times: 14, accountAgeDays: 1900, reports: 0, tone: 1 },
    { name: "Bilal Ahmed", number: "0333 0000245", sentBefore: true, times: 6, accountAgeDays: 1200, reports: 0 },
    { name: "Hira Khan", number: "0312 0000381", sentBefore: true, times: 3, accountAgeDays: 800, reports: 0 },
    { name: "Zain Qureshi", number: "0301 0000467", sentBefore: true, times: 2, accountAgeDays: 600, reports: 0 },
  ];
  const DIRECTORY = {
    "03210000104": { name: "M. Usman", accountAgeDays: 900, reports: 0 },
    "03450000777": { name: "K. Ahmed", accountAgeDays: 2, reports: 23 },
  };
  const SCENARIOS = [
    { id: "family", dot: "var(--color-positive-fg)", title: "Pay family", sub: "Ammi · Rs 5,000 · sent 14 times before",
      recipient: CONTACTS[0], amount: 5000, note: "" },
    { id: "new", dot: "var(--color-caution-fg)", title: "A new number", sub: "M. Usman · Rs 12,000 · first transfer",
      recipient: { name: "M. Usman", number: "0321 0000104", sentBefore: false, ...DIRECTORY["03210000104"] }, amount: 12000, note: "Car parts" },
    { id: "scam", dot: "var(--color-critical-fg)", title: "Prize-fee scam", sub: "K. Ahmed · Rs 25,000 · note mentions a prize fee",
      recipient: { name: "K. Ahmed", number: "0345 0000777", sentBefore: false, ...DIRECTORY["03450000777"] }, amount: 25000, note: "Inaam claim fee, urgent" },
  ];
  const START = 48250;

  // ---------- state ----------
  const S = {
    screen: "home", stack: [], balance: START, hide: false, lang: "en", failNext: false,
    recipient: null, amount: "", note: "", signals: [], level: null, whyOpen: false, ack: false, reported: false,
    recent: [
      { name: "Ammi", detail: "Sent · Sunday", amt: -5000, tone: 1 },
      { name: "Bilal Ahmed", detail: "Received · Friday", amt: 2500 },
      { name: "Electricity bill", detail: "Bill · Thursday", amt: -6830, tone: 4 },
    ],
  };
  const $ = (id) => document.getElementById(id);
  const amountNum = () => Number(S.amount || 0);
  const first = (n) => { const w = n.split(" ")[0]; return w.length <= 2 || w.endsWith(".") ? n : w; }; // "M. Usman" stays whole

  // ---------- navigation ----------
  let runId = 0;
  function go(name, { dir = "fwd", push = true } = {}) {
    if (push) S.stack.push(S.screen);
    S.screen = name; runId++;
    const host = $("host");
    host.querySelectorAll(".view:not(.view--out)").forEach((old) => { old.classList.add("view--out"); setTimeout(() => old.remove(), 240); });
    const v = SCREENS[name]();
    v.classList.add(dir === "back" ? "view--in-back" : "view--in-fwd");
    host.append(v);
    const target = v.querySelector("[data-focus]") || v.querySelector("h1,h2");
    if (target && document.activeElement && $("screen").contains(document.activeElement)) { target.setAttribute("tabindex", "-1"); target.focus({ preventScroll: true }); }
  }
  function back() { go(S.stack.pop() || "home", { dir: "back", push: false }); }
  function home() { S.stack = []; go("home", { dir: "back", push: false }); }
  const toast = (text, tone) => Toast({ text, tone, root: $("screen") });

  function view({ title, showBack = true, label }, body, foot) {
    return h("div", { class: "view", role: "region", "aria-label": label || title || "Screen" },
      showBack || title ? h("div", { class: "bar" },
        showBack ? IconButton({ icon: "back", label: "Back", onClick: back }) : null,
        title ? h("h1", { class: "bar__title" }, title) : null) : null,
      h("div", { class: "content" }, body),
      foot ? h("div", { class: "foot" }, foot) : null);
  }

  // ---------- screens ----------
  const SCREENS = {};

  SCREENS.home = () => {
    const balance = h("div", { class: "balance" });
    const paintBalance = () => {
      balance.replaceChildren(
        h("div", { class: "balance__label" }, "Available balance",
          IconButton({ icon: S.hide ? "eye" : "eyeOff", label: S.hide ? "Show balance" : "Hide balance", onClick: () => { S.hide = !S.hide; paintBalance(); } })),
        h("div", { class: "balance__amt", "aria-live": "polite" }, h("span", {}, "Rs"), S.hide ? "• • • • •" : fmt(S.balance)));
    };
    paintBalance();
    const soon = () => toast("Not part of this prototype. Try Send.");
    const action = (icon, label, onClick, main) => h("button", { class: `action${main ? " action--main" : ""}`, type: "button", onClick },
      h("span", { class: "action__ic" }, Icon(icon, 22)), label);
    return view({ showBack: false, label: "Home" }, [
      h("div", { class: "hello", style: "padding:8px 0 12px" },
        h("div", {}, h("small", {}, "Good evening"), h("h1", { class: "t-title", style: "font-size:22px" }, "Sana")),
        Avatar({ name: "Sana Malik", size: 40, tone: 3 })),
      balance,
      h("div", { class: "actions" },
        action("send", "Send", startSend, true), action("request", "Request", soon), action("plus", "Top up", soon), action("bill", "Bills", soon)),
      h("div", { class: "notice" }, Icon("shieldCheck", 20),
        h("div", {}, h("b", {}, "Safe Send is on"), "Every transfer is checked for common scam patterns before you confirm.")),
      h("h2", { class: "section-title" }, "Recent"),
      S.recent.slice(0, 4).map((t) => h("div", { class: "tx" }, Avatar({ name: t.name, size: 40, tone: t.tone }),
        h("div", { class: "tx__text" }, h("b", {}, t.name), h("span", {}, t.detail)),
        h("span", { class: `tx__amt${t.amt > 0 ? " tx__amt--in" : ""}` }, `${t.amt > 0 ? "+" : "−"}Rs ${fmt(Math.abs(t.amt))}`))),
    ]);
  };

  function startSend() {
    Object.assign(S, { recipient: null, amount: "", note: "", ack: false, whyOpen: false, reported: false });
    go("to");
  }

  SCREENS.to = () => {
    const list = h("div", { class: "contacts" });
    const paint = (q = "") => {
      const rows = CONTACTS.filter((c) => (c.name + c.number).toLowerCase().replace(/\s/g, "").includes(q.toLowerCase().replace(/\s/g, "")));
      list.replaceChildren(...(rows.length ? rows.map((c) => ContactRow({
        name: c.name, tone: c.tone, detail: c.times === 2 ? "Sent twice" : `Sent ${c.times} times`,
        onClick: () => { S.recipient = c; go("amount"); },
      })) : [h("p", { class: "callout", style: "padding:24px 0" }, "No contacts match. Use a new number instead.")]));
    };
    paint();
    const search = h("label", { class: "field" }, Icon("search", 20),
      h("input", { type: "search", placeholder: "Search name or number", "aria-label": "Search contacts", onInput: (e) => paint(e.target.value) }));
    const newRow = h("button", { class: "row", type: "button", onClick: newNumber },
      h("span", { class: "avatar", style: "width:40px;height:40px;background:var(--color-ink-900);color:#fff" }, Icon("plus", 20)),
      h("span", { class: "row__text" }, h("span", { class: "row__title" }, "New number"), h("span", { class: "row__detail" }, "Any wallet or bank, by mobile number")),
      Icon("chevron", 18, "row__chev"));
    return view({ title: "Send to" }, [search, h("div", { style: "margin-top:12px" }, newRow), h("h2", { class: "section-title" }, "Your contacts"), list]);
  };

  function newNumber() {
    const err = h("div", { class: "field-error", role: "alert" });
    const input = h("input", { type: "tel", inputmode: "numeric", placeholder: "03XX XXXXXXX", "aria-label": "Mobile number", maxlength: "13" });
    const field = h("label", { class: "field" }, Icon("phone", 20), input);
    const submit = (close) => {
      const d = input.value.replace(/\D/g, "");
      if (!/^03\d{9}$/.test(d)) { field.classList.add("field--error"); err.textContent = "Enter an 11-digit mobile number starting with 03."; input.focus(); return; }
      const found = DIRECTORY[d] || { name: "Wallet user", accountAgeDays: 400, reports: 0 };
      S.recipient = { ...found, number: `${d.slice(0, 4)} ${d.slice(4)}`, sentBefore: false };
      close(); setTimeout(() => go("amount"), 200);
    };
    input.addEventListener("keydown", (e) => { if (e.key === "Enter") submit(sheet.close); });
    const sheet = Sheet({
      root: $("screen"), title: "New number",
      body: [field, err, h("p", { class: "callout", style: "margin-top:12px;text-align:left" }, "Demo numbers: 0321 0000104 (new contact) or 0345 0000777 (reported).")],
      actions: [{ label: "Continue", onClick: submit }],
    });
  }

  SCREENS.amount = () => {
    const r = S.recipient;
    const slot = h("div");
    const cont = Button({ label: "Continue", size: "lg", full: true, onClick: () => valid() && go("review") });
    const valid = () => amountNum() > 0 && amountNum() <= S.balance;
    const paint = () => {
      const over = amountNum() > S.balance;
      slot.replaceChildren(AmountField({ value: amountNum(), error: over ? `That's more than your balance of Rs ${fmt(S.balance)}` : null, hint: `Balance Rs ${fmt(S.balance)}` }));
      cont.disabled = !valid();
    };
    const onKey = (k) => {
      if (k === "del") S.amount = S.amount.slice(0, -1);
      else if (S.amount.length < 7 && !(S.amount === "" && k === "0")) S.amount += k;
      paint();
    };
    paint();
    const note = h("label", { class: "field note" },
      h("input", { type: "text", placeholder: "Add a note (optional)", maxlength: "60", value: S.note, "aria-label": "Note", onInput: (e) => (S.note = e.target.value) }));
    const v = view({ title: "", label: `Send to ${r.name}` }, [
      h("div", { class: "who", "data-focus": "" }, Avatar({ name: r.name, size: 36, tone: r.tone }),
        h("div", {}, h("b", {}, r.name), h("span", {}, r.sentBefore ? r.number : `${r.number} · account title`))),
      slot, note, Keypad({ onKey }),
    ], cont);
    v._key = (e) => {
      if (e.target.tagName === "INPUT") return;
      if (/^\d$/.test(e.key)) onKey(e.key); else if (e.key === "Backspace") onKey("del"); else if (e.key === "Enter" && valid()) go("review");
    };
    return v;
  };

  SCREENS.review = () => {
    const r = S.recipient, amt = amountNum(), my = runId; // go() bumps runId before building the screen
    S.signals = Risk.detect({ recipient: r, amount: amt, note: S.note });
    S.level = Risk.level(S.signals);
    const has = (k) => S.signals.includes(k);
    const checks = [
      ["Your history with this number", has("NEW_RECIPIENT")],
      ["Amount compared with what you usually send", has("UNUSUAL_AMOUNT")],
      ["Reports and account age", has("REPORTED") || has("NEW_ACCOUNT")],
      ["Wording in your note", has("URGENT_NOTE")],
    ];
    const riskSlot = h("div", { "aria-live": "polite" });
    const foot = h("div", { style: "display:grid;gap:10px" });
    const paintSteps = (i) => riskSlot.replaceChildren(h("ul", { class: "steps", "aria-label": "Checking this transfer" },
      checks.map(([label, flag], j) => StatusStep({ label, state: j < i ? (flag ? "flag" : "done") : j === i ? "active" : "pending" }))));
    const paintBanner = () => {
      let copy = Risk.explain(S.level, S.signals, S.lang);
      if (!Risk.validate(`${copy.title} ${copy.body}`).ok) copy = Risk.COPY.check[S.lang]; // guardrail fallback
      riskSlot.replaceChildren(RiskBanner({
        level: S.level, title: copy.title, body: copy.body, lang: S.lang, open: S.whyOpen,
        signals: S.signals.map((k) => Risk.signalText(k, r, S.lang)),
        onToggle: () => { S.whyOpen = !S.whyOpen; paintBanner(); },
      }));
    };
    const paintFoot = (ready) => {
      const label = `Slide to send Rs ${fmt(amt)}`;
      if (!ready) return foot.replaceChildren(SlideToConfirm({ label: "Checking…", disabled: true }));
      if (S.level === "clear") return foot.replaceChildren(SlideToConfirm({ label, onConfirm: send }));
      if (S.level === "check") return foot.replaceChildren(
        Button({ label: `Call ${first(r.name)} first`, icon: "phone", variant: "secondary", size: "lg", full: true, onClick: () => toast("In the real app, this opens your phone's dialer.") }),
        SlideToConfirm({ label, onConfirm: send }));
      foot.replaceChildren(
        Button({ label: "Don't send", size: "lg", full: true, onClick: () => go("stopped", { push: false }) }),
        Checkbox({ label: `I know ${r.name} personally and confirmed this by phone`, checked: S.ack, onChange: (v) => { S.ack = v; paintFoot(true); } }),
        SlideToConfirm({ label: "Slide to send anyway", tone: "critical", disabled: !S.ack, onConfirm: send }));
    };
    paintSteps(0); paintFoot(false);
    let i = 0;
    const tick = () => {
      if (runId !== my) return;
      i++; paintSteps(i);
      if (i < checks.length) setTimeout(tick, 300);
      else setTimeout(() => { if (runId !== my) return; paintBanner(); paintFoot(true); }, 320);
    };
    setTimeout(tick, 360);
    const v = view({ title: "Review" }, h("div", { class: "review-stack" }, riskSlot,
      h("div", { class: "card" },
        SummaryRow({ label: "To", value: r.name }),
        SummaryRow({ label: "Mobile number", value: r.number }),
        SummaryRow({ label: "Amount", value: `Rs ${fmt(amt)}`, strong: true }),
        SummaryRow({ label: "Fee", value: "Free" }),
        SummaryRow({ label: "Arrives", value: "Instantly" }),
        S.note ? SummaryRow({ label: "Note", value: S.note }) : null)), foot);
    v._repaintLang = () => { if (riskSlot.querySelector(".risk")) paintBanner(); };
    return v;
  };

  function send() {
    go("sending", { push: false });
    const my = runId;
    setTimeout(() => {
      if (runId !== my) return;
      S.stack = [];
      if (S.failNext) { S.failNext = false; syncPanel(); go("failed", { push: false }); return; }
      S.balance -= amountNum();
      S.recent.unshift({ name: S.recipient.name, detail: "Sent · Just now", amt: -amountNum(), tone: S.recipient.tone });
      go("success", { push: false });
    }, 1300);
  }

  const result = (badge, title, body, extra, foot, label) =>
    view({ showBack: false, label }, h("div", { class: "result" }, badge, h("h2", { "data-focus": "" }, title), body, extra), foot);

  SCREENS.sending = () => result(h("div", { class: "spinner", role: "progressbar", "aria-label": "Sending" }), "Sending…",
    h("p", {}, `Rs ${fmt(amountNum())} to ${S.recipient.name}`), null, null, "Sending");

  SCREENS.success = () => {
    const ref = "SS" + String(Date.now()).slice(-8);
    const time = new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
    const badge = h("div", { class: "result__badge result__badge--ok" }, Icon("check", 44));
    badge.querySelector("svg").setAttribute("stroke-width", "2.4");
    return result(badge, "Sent",
      [h("div", { class: "big" }, `Rs ${fmt(amountNum())}`), h("p", {}, `to ${S.recipient.name}`)],
      h("div", { class: "card" }, SummaryRow({ label: "Reference", value: ref }), SummaryRow({ label: "Time", value: `Today, ${time}` }),
        SummaryRow({ label: "New balance", value: `Rs ${fmt(S.balance)}` })),
      [Button({ label: "Share receipt", icon: "share", variant: "secondary", size: "lg", full: true, onClick: () => toast("Receipt ready to share.", "positive") }),
       Button({ label: "Done", size: "lg", full: true, onClick: home })], "Sent");
  };

  SCREENS.failed = () => result(h("div", { class: "result__badge result__badge--fail" }, Icon("wifiOff", 40)), "Money not sent",
    h("p", {}, "Your connection dropped before we could send it. Nothing left your account and your balance hasn't changed."), null,
    [Button({ label: "Try again", size: "lg", full: true, onClick: send }), Button({ label: "Back to home", variant: "ghost", size: "lg", full: true, onClick: home })], "Not sent");

  SCREENS.stopped = () => {
    const prize = S.signals.includes("URGENT_NOTE");
    const report = Button({ label: S.reported ? "Reported" : "Report this number", icon: "flag", variant: "secondary", size: "lg", full: true, disabled: S.reported,
      onClick: () => { S.reported = true; report.disabled = true; report.querySelector("span").textContent = "Reported"; toast("Reported. Thanks for looking out for others.", "positive"); } });
    return result(h("div", { class: "result__badge result__badge--stop" }, Icon("shieldCheck", 40)), "Nothing was sent",
      h("p", {}, prize ? "If someone asked you to pay a fee to claim a prize, it's a known scam. Real prize programmes don't ask you to pay first."
        : "Your money is still in your account. You can come back to this anytime."), null,
      [report, Button({ label: "Back to home", size: "lg", full: true, onClick: home })], "Not sent");
  };

  // ---------- keyboard on amount screen ----------
  document.addEventListener("keydown", (e) => {
    if (S.screen !== "amount" || !$("prototype").classList.contains("on")) return;
    const v = $("host").querySelector(".view:not(.view--out)"); v && v._key && v._key(e);
  });

  // ---------- side panel ----------
  function syncPanel() { $("tgl-ur").checked = S.lang === "ur"; $("tgl-fail").checked = S.failNext; }
  function buildPanel() {
    const scn = $("scenarios");
    SCENARIOS.forEach((s) => scn.append(h("button", { type: "button", onClick: () => {
      Object.assign(S, { recipient: s.recipient, amount: String(s.amount), note: s.note, ack: false, whyOpen: false, reported: false, stack: ["home", "to", "amount"] });
      go("review", { push: false });
    } }, h("i", { style: `background:${s.dot}` }), h("b", {}, s.title), h("span", {}, s.sub))));
    $("tgl-ur").addEventListener("change", (e) => {
      S.lang = e.target.checked ? "ur" : "en";
      const v = $("host").querySelector(".view:not(.view--out)"); v && v._repaintLang && v._repaintLang();
    });
    $("tgl-fail").addEventListener("change", (e) => { S.failNext = e.target.checked; });
    $("restart").addEventListener("click", () => { S.balance = START; S.recent = S.recent.filter((t) => t.detail !== "Sent · Just now"); home(); });
  }

  // ---------- fit the phone to the window ----------
  function fit() {
    const d = $("device"), stage = $("stage");
    if (window.innerWidth <= 520) { d.style.transform = ""; stage.style.width = stage.style.height = ""; return; }
    const s = Math.max(0.68, Math.min(1, (window.innerHeight - 64 - 56) / 868));
    d.style.transform = `scale(${s})`; d.style.transformOrigin = "top left";
    stage.style.width = `${414 * s}px`; stage.style.height = `${868 * s}px`;
  }

  // ---------- tabs ----------
  function showTab(id) {
    document.querySelectorAll(".tab").forEach((t) => t.setAttribute("aria-selected", String(t.dataset.tab === id)));
    document.querySelectorAll(".panel-page").forEach((p) => p.classList.toggle("on", p.id === id));
    const want = id === "prototype" ? "" : `#${id}`;
    if (location.hash !== want) { try { history.replaceState(null, "", want || location.pathname + location.search); } catch (e) { /* sandboxed frame */ } }
    window.scrollTo(0, 0);
  }

  // ---------- design system page (rendered from the same tokens + components) ----------
  function buildSystem() {
    const T = window.TOKENS, root = $("system");
    const sec = (title, desc, ...kids) => h("section", {}, h("h2", {}, title), desc ? h("p", {}, desc) : null, ...kids);
    const tile = (label, ...kids) => h("div", { class: "tile" }, h("div", { class: "tile__label" }, label), ...kids);
    const colors = [];
    for (const [g, shades] of Object.entries(T.color)) for (const [n, v] of Object.entries(shades))
      colors.push(h("div", {}, h("div", { class: "swatch", style: `background:${v}` }), h("div", { class: "swatch-cap" }, h("b", {}, `${g}/${n}`), h("br"), h("code", {}, v))));
    const samples = { display: "Rs 25,000", title: "Check before you send", headline: "Review", body: "Every transfer is checked before you confirm.", label: "Slide to send", caption: "Balance Rs 48,250" };
    const typeRows = Object.entries(T.type).map(([n, t]) => h("div", { class: "typerow" },
      h("div", {}, h("b", { style: "font-size:13px" }, n), h("br"), h("code", {}, `${t.size}/${t.line} · ${t.weight}`)), h("div", { class: `t-${n}` }, samples[n])));
    const spaces = Object.entries(T.space).map(([n, px]) => h("div", { class: "spacebar" }, h("code", { class: "mono" }, `space/${n} · ${px}`), h("i", { style: `width:${px * 4}px` })));
    const radii = Object.entries(T.radius).map(([n, px]) => h("div", {}, h("div", { class: "radius-tile", style: `border-radius:${Math.min(px, 36)}px` }), h("div", { class: "swatch-cap" }, h("b", {}, `radius/${n}`), " ", h("code", {}, px === 999 ? "pill" : `${px}px`))));
    const motion = ["fast", "base", "slow"].map((n) => tile(`motion/${n} · ${T.motion[n]}`, h("p", { style: "font-size:13px;color:var(--color-ink-500)" },
      n === "fast" ? "Presses, toggles, hovers" : n === "base" ? "Banners, sheets closing, small moves" : "Screen changes, sheets opening, results")));
    const noop = () => {};
    const slideTile = (tone, disabled, label) => { const w = h("div"); const make = () => w.replaceChildren(SlideToConfirm({ label, tone, disabled, onConfirm: () => setTimeout(make, 700) })); make(); return w; };
    const sheetStatic = h("div", { class: "sheet", style: "animation:none;border-radius:24px;padding-bottom:20px" }, h("div", { class: "sheet__grip" }), h("h2", { class: "sheet__title t-title" }, "New number"),
      h("div", { class: "sheet__body" }, h("label", { class: "field" }, Icon("phone", 20), h("input", { placeholder: "03XX XXXXXXX", "aria-label": "Example field" }))),
      h("div", { class: "sheet__actions" }, Button({ label: "Continue", size: "lg", full: true })));
    const toastStatic = (text, tone) => { const t = h("div", { class: `toast toast--${tone}`, style: "position:static;animation:none" }, Icon(tone === "positive" ? "check" : "info", 16), text); return t; };
    const comps = h("div", { class: "grid g2" },
      tile("Button", h("div", { class: "specimen" }, Button({ label: "Primary" }), Button({ label: "Secondary", variant: "secondary" }), Button({ label: "Ghost", variant: "ghost" }), Button({ label: "Critical", variant: "critical" }), Button({ label: "Disabled", disabled: true })),
        h("div", { class: "specimen", style: "margin-top:12px" }, Button({ label: "Call Usman first", icon: "phone", variant: "secondary", size: "lg" }), Button({ label: "Done", size: "lg" }))),
      tile("Avatar · IconButton", h("div", { class: "specimen" }, Avatar({ name: "Sana Malik", size: 56, tone: 3 }), Avatar({ name: "Ammi", size: 40, tone: 1 }), Avatar({ name: "K. Ahmed", size: 32 }),
        IconButton({ icon: "back", label: "Back" }), IconButton({ icon: "eyeOff", label: "Hide", variant: "soft" }))),
      tile("ContactRow", h("div", { class: "phone-bg" }, ContactRow({ name: "Ammi", tone: 1, detail: "Sent 14 times", onClick: noop }), ContactRow({ name: "Bilal Ahmed", detail: "Sent 6 times", onClick: noop }))),
      tile("AmountField · default and error", h("div", { class: "phone-bg grid g2", style: "margin-top:0" }, AmountField({ value: 5000, hint: "Balance Rs 48,250" }), AmountField({ value: 60000, error: "More than your balance" }))),
      tile("RiskBanner · clear / check", h("div", { class: "specimen specimen--col" },
        RiskBanner({ level: "clear", ...Risk.COPY.clear.en }), RiskBanner({ level: "check", ...Risk.COPY.check.en, signals: ["You haven't sent money to this number before."], open: true }))),
      tile("RiskBanner · stop / Urdu", h("div", { class: "specimen specimen--col" },
        RiskBanner({ level: "stop", ...Risk.COPY.stop.en, signals: ["23 people reported this number in the last 7 days."] }), RiskBanner({ level: "stop", ...Risk.COPY.stop.ur, lang: "ur" }))),
      tile("StatusStep · pending / active / done / flag", h("ul", { class: "steps" }, StatusStep({ label: "Reports and account age", state: "pending" }), StatusStep({ label: "Wording in your note", state: "active" }),
        StatusStep({ label: "Your history with this number", state: "done" }), StatusStep({ label: "Amount compared with what you usually send", state: "flag" }))),
      tile("SummaryRow · Checkbox", h("div", { class: "card" }, SummaryRow({ label: "To", value: "M. Usman" }), SummaryRow({ label: "Amount", value: "Rs 12,000", strong: true }), SummaryRow({ label: "Fee", value: "Free" })),
        h("div", { style: "margin-top:12px" }, Checkbox({ label: "I know this person and confirmed by phone", checked: false, onChange: noop }), Checkbox({ label: "Checked state", checked: true, onChange: noop }))),
      tile("SlideToConfirm · default / critical / disabled (try dragging)", h("div", { class: "specimen specimen--col" }, slideTile("default", false, "Slide to send Rs 5,000"), slideTile("critical", false, "Slide to send anyway"), slideTile("default", true, "Checking…"))),
      tile("Keypad", h("div", { class: "phone-bg" }, Keypad({ onKey: noop }))),
      tile("Sheet", h("div", { class: "phone-bg" }, sheetStatic)),
      tile("Toast", h("div", { class: "specimen specimen--col" }, toastStatic("Not part of this prototype. Try Send.", "default"), toastStatic("Reported. Thanks for looking out for others.", "positive"))));
    const map = h("table", { class: "map" }, h("thead", {}, h("tr", {}, h("th", {}, "Component"), h("th", {}, "Figma component / variants"), h("th", {}, "Code"))),
      h("tbody", {}, UI.COMPONENT_MAP.map(([n, f, c]) => h("tr", {}, h("td", {}, h("b", {}, n)), h("td", {}, f), h("td", {}, h("code", {}, c))))));
    root.append(h("div", { class: "doc" },
      h("header", {}, h("h1", {}, "Design system"), h("p", {}, "Every screen in the prototype is built from these tokens and 13 components. Token and component names match the Figma library one to one, so a component in the design file and in code is the same thing.")),
      sec("Color", "Ink and warm surfaces carry the interface. Green, amber and red are reserved for risk, so they always mean something.", h("div", { class: "swatch-row" }, colors)),
      sec("Type", "Inter for text, Inter Display for amounts and titles. Tabular figures everywhere money appears. Urdu falls back to a Nastaliq face.", h("div", { style: "margin-top:12px" }, typeRows)),
      sec("Space and radius", "A 4-pt base. Controls are at least 44 px tall so every tap target passes on small phones.",
        h("div", { class: "grid g2" }, tile("space", ...spaces), tile("radius", h("div", { class: "grid g3", style: "margin-top:0;grid-template-columns:repeat(3,1fr)" }, radii)))),
      sec("Motion", "Three durations and two curves. Everything respects the reduced-motion setting.", h("div", { class: "grid g3" }, motion)),
      sec("Components", "Live components, not pictures of them. These are the same functions the prototype uses.", comps),
      sec("Figma ↔ code", "Figma variables use the same paths as the tokens (color/ink/900 → --color-ink-900). Each Figma component maps to one function.", map)));
  }

  // ---------- AI rules page (rendered from risk.js, the code that enforces it) ----------
  function buildRules() {
    const root = $("rules");
    const sec = (title, desc, ...kids) => h("section", {}, h("h2", {}, title), desc ? h("p", {}, desc) : null, ...kids);
    const ok = (good) => h("span", { class: `pill ${good ? "pill--ok" : "pill--bad"}` }, Icon(good ? "check" : "x", 14), good ? "Passes" : "Blocked");
    const shipped = [];
    for (const lvl of ["clear", "check", "stop"]) for (const lang of ["en", "ur"]) shipped.push({ lvl, lang, c: Risk.COPY[lvl][lang] });
    for (const lang of ["en", "ur"]) shipped.push({ lvl: "stop (no prize)", lang, c: Risk.COPY.stop.stopNoPrize[lang] });
    const live = h("table", { class: "map" }, h("thead", {}, h("tr", {}, h("th", {}, "Explanation"), h("th", {}, "Level"), h("th", {}, "Validator"))),
      h("tbody", {}, shipped.map(({ lvl, lang, c }) => {
        const v = Risk.validate(`${c.title} ${c.body}`);
        return h("tr", {}, h("td", { class: lang === "ur" ? "ur" : "" }, h("b", {}, c.title), h("br"), c.body), h("td", {}, `${lvl} · ${lang.toUpperCase()}`), h("td", {}, ok(v.ok)));
      }), Risk.REJECTED.map((r) => {
        const v = Risk.validate(r.text);
        return h("tr", {}, h("td", {}, h("b", {}, `“${r.text}”`), h("br"), h("span", { style: "color:var(--color-ink-500)" }, r.why)), h("td", {}, "rejected draft"),
          h("td", {}, ok(v.ok), h("div", { class: "mono", style: "margin-top:6px" }, v.failed.join(", "))));
      })));
    const never = h("table", { class: "map" }, h("thead", {}, h("tr", {}, h("th", {}, "Rule"), h("th", {}, "Check id"))),
      h("tbody", {}, Risk.NEVER.map((n) => h("tr", {}, h("td", {}, n.rule), h("td", {}, h("code", {}, n.id))))));
    const sig = h("table", { class: "map" }, h("thead", {}, h("tr", {}, h("th", {}, "Signal"), h("th", {}, "Weight"), h("th", {}, "What the user reads"))),
      h("tbody", {}, Object.entries(Risk.SIGNALS).map(([k, s]) => {
        const demo = { accountAgeDays: 2, reports: 23 };
        const en = typeof s.en === "function" ? s.en(demo) : s.en, ur = typeof s.ur === "function" ? s.ur(demo) : s.ur;
        return h("tr", {}, h("td", {}, h("code", {}, k)), h("td", {}, String(s.weight)), h("td", {}, en, h("div", { class: "ur", style: "margin-top:4px" }, ur)));
      })));
    const li = (icon, text) => h("li", {}, Icon(icon, 18), h("span", {}, text));
    root.append(h("div", { class: "doc" },
      h("header", {}, h("h1", {}, "AI rules"), h("p", {}, "Where AI belongs in this flow, what it's never allowed to say, and the check every explanation passes before anyone sees it. This page is rendered from the same code that enforces the rules, so it can't drift out of date.")),
      sec("Rules decide. AI explains.", "The split that keeps a money flow honest: risk comes from data the wallet already has, and the model only puts it into words.",
        h("div", { class: "split" },
          h("div", { class: "tile" }, h("div", { class: "tile__label" }, "detection · deterministic"), h("h3", {}, "Rules find the signals"), h("p", {}, "Transfer history, reports from other users, account age and the wording of the note. Testable, explainable and the same every time.")),
          h("div", { class: "arrow" }, Icon("chevron", 28)),
          h("div", { class: "tile" }, h("div", { class: "tile__label" }, "explanation · AI, constrained"), h("h3", {}, "AI writes one or two sentences"), h("p", {}, "In English or Urdu, from the detected signals only. It can't add a signal, change the level or block a payment.")))),
      sec("Where AI acts, and where it never does", null, h("div", { class: "grid g2" },
        h("div", { class: "tile" }, h("div", { class: "tile__label" }, "acts"), h("ul", { class: "list" }, Risk.WHERE_AI_ACTS.map((t) => li("check", t)))),
        h("div", { class: "tile" }, h("div", { class: "tile__label" }, "never acts"), h("ul", { class: "list" }, Risk.WHERE_AI_NEVER_ACTS.map((t) => li("x", t)))))),
      sec("Never generate", "Five checks run on every explanation. If one fails, the user sees the approved fallback instead.", never),
      sec("Live check", "Every approved explanation, plus four drafts I rejected, run through the validator right now in your browser.", live),
      sec("Signals and thresholds", `Stop if the number was reported, or if the weights add up to 4 or more. Check from 1. Clear at 0. Known contacts can't trigger "unusual amount", and the note filter matches scam phrases, not single words, so "school fee" to family doesn't raise a flag.`, sig),
      sec("How I'd measure it", null, h("ul", { class: "list" },
        li("check", "Share of transfers to reported numbers that end in “Don't send”."),
        li("check", "False alarms on known contacts. The design target is close to zero."),
        li("check", "Time a clear transfer adds. Target: under 1.5 seconds of checking."),
        li("check", "Whether Urdu explanations change what people do, tested with users outside Karachi, Lahore and Islamabad.")))));
  }

  // ---------- boot ----------
  document.addEventListener("DOMContentLoaded", () => {
    buildPanel(); buildSystem(); buildRules();
    go("home", { push: false });
    fit(); window.addEventListener("resize", fit);
    document.querySelectorAll(".tab").forEach((t) => t.addEventListener("click", () => showTab(t.dataset.tab)));
    const fromHash = () => { const id = location.hash.slice(1); showTab(["system", "rules"].includes(id) ? id : "prototype"); };
    fromHash(); window.addEventListener("hashchange", fromHash);
  });
  window.SafeSend = { S, go, SCENARIOS };
})();
