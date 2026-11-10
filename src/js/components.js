/* Safe Send · components
 * Plain functions that return DOM nodes. Each one maps 1:1 to a Figma component
 * (see COMPONENT_MAP at the bottom, rendered on the Design system tab).
 */
(function () {
  // ---------- tiny DOM helper ----------
  function h(tag, props, ...kids) {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(props || {})) {
      if (v === undefined || v === null || v === false) continue;
      if (k === "class") el.className = v;
      else if (k === "style") el.style.cssText = v;
      else if (k.startsWith("on")) el.addEventListener(k.slice(2).toLowerCase(), v);
      else if (k === "html") el.innerHTML = v;
      else el.setAttribute(k, v === true ? "" : v);
    }
    for (const kid of kids.flat(Infinity)) {
      if (kid === null || kid === undefined || kid === false) continue;
      el.append(kid instanceof Node ? kid : document.createTextNode(String(kid)));
    }
    return el;
  }

  // ---------- icons (24px grid, 1.8 stroke) ----------
  const P = {
    send: '<path d="M12 19V5M6 11l6-6 6 6"/>',
    request: '<path d="M12 5v14M6 13l6 6 6-6"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    bill: '<path d="M6 3h12v18l-3-2-3 2-3-2-3 2z"/><path d="M9 8h6M9 12h6"/>',
    back: '<path d="M15 5l-7 7 7 7"/>',
    chevron: '<path d="M9 5l7 7-7 7"/>',
    search: '<circle cx="11" cy="11" r="6.5"/><path d="M20 20l-4.2-4.2"/>',
    eye: '<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3"/>',
    eyeOff: '<path d="M3 3l18 18"/><path d="M10.6 5.6A9.6 9.6 0 0 1 12 5.5c6 0 9.5 6.5 9.5 6.5a16 16 0 0 1-3.1 3.8M6.2 7.4A16.4 16.4 0 0 0 2.5 12S6 18.5 12 18.5a9 9 0 0 0 4.1-1"/>',
    check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
    alert: '<path d="M12 4l9 16H3z"/><path d="M12 10v4M12 17.2v.1"/>',
    shield: '<path d="M12 3l7.5 3v5.5c0 4.6-3.2 8.2-7.5 9.5-4.3-1.3-7.5-4.9-7.5-9.5V6z"/>',
    shieldCheck: '<path d="M12 3l7.5 3v5.5c0 4.6-3.2 8.2-7.5 9.5-4.3-1.3-7.5-4.9-7.5-9.5V6z"/><path d="M8.5 12l2.5 2.5 4.5-5"/>',
    stop: '<path d="M8.2 3h7.6L21 8.2v7.6L15.8 21H8.2L3 15.8V8.2z"/><path d="M12 8v5M12 16.2v.1"/>',
    phone: '<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2"/>',
    x: '<path d="M6 6l12 12M18 6L6 18"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 7.8v.1"/>',
    share: '<path d="M12 3v12M7 8l5-5 5 5"/><path d="M5 14v5a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-5"/>',
    flag: '<path d="M5 21V4h11l-2 4 2 4H5"/>',
    del: '<path d="M9 6h11v12H9l-6-6z"/><path d="M12.5 9.5l5 5M17.5 9.5l-5 5"/>',
    wifiOff: '<path d="M3 3l18 18"/><path d="M8.5 16.5a5 5 0 0 1 7 0M5 13a10 10 0 0 1 4.3-2.5M19 13a10 10 0 0 0-3-2M2 9.5a15 15 0 0 1 4.4-2.7M22 9.5A15 15 0 0 0 12 5.5c-.8 0-1.6 0-2.4.2"/><path d="M12 20v.1"/>',
  };
  function Icon(name, size = 20, cls = "") {
    const s = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    s.setAttribute("viewBox", "0 0 24 24"); s.setAttribute("width", size); s.setAttribute("height", size);
    s.setAttribute("fill", "none"); s.setAttribute("stroke", "currentColor"); s.setAttribute("stroke-width", "1.8");
    s.setAttribute("stroke-linecap", "round"); s.setAttribute("stroke-linejoin", "round"); s.setAttribute("aria-hidden", "true");
    if (cls) s.setAttribute("class", cls);
    s.innerHTML = P[name] || "";
    return s;
  }

  // ---------- Button ----------
  function Button({ label, variant = "primary", size = "md", icon, full, disabled, onClick, ariaLabel }) {
    return h("button", {
      class: `btn btn--${variant} btn--${size}${full ? " btn--full" : ""}`, type: "button",
      disabled, onClick, "aria-label": ariaLabel,
    }, icon ? Icon(icon, size === "lg" ? 20 : 18) : null, h("span", {}, label));
  }

  function IconButton({ icon, label, onClick, variant = "plain" }) {
    return h("button", { class: `iconbtn iconbtn--${variant}`, type: "button", "aria-label": label, title: label, onClick }, Icon(icon, 22));
  }

  // ---------- Avatar ----------
  const TONES = [["#E9EDFF", "#2F45C8"], ["#FDECE3", "#A4410E"], ["#E6F4EC", "#0E7A50"], ["#F3E8FF", "#6B2FB3"], ["#ECEBE6", "#3A3C42"]];
  function Avatar({ name, size = 40, tone }) {
    const initials = name.replace(/[^A-Za-z0-9 ]/g, "").split(" ").filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase() || "#";
    const i = tone ?? [...name].reduce((a, c) => a + c.charCodeAt(0), 0) % TONES.length;
    return h("span", { class: "avatar", "aria-hidden": "true",
      style: `width:${size}px;height:${size}px;background:${TONES[i][0]};color:${TONES[i][1]};font-size:${Math.round(size * 0.36)}px` }, initials);
  }

  // ---------- ContactRow ----------
  function ContactRow({ name, detail, onClick, tone, trailing }) {
    return h("button", { class: "row", type: "button", onClick },
      Avatar({ name, tone }),
      h("span", { class: "row__text" }, h("span", { class: "row__title" }, name), detail ? h("span", { class: "row__detail" }, detail) : null),
      trailing || Icon("chevron", 18, "row__chev"));
  }

  // ---------- AmountField ----------
  const fmt = (n) => Number(n || 0).toLocaleString("en-US");
  function AmountField({ value, error, hint }) {
    return h("div", { class: `amount${error ? " amount--error" : ""}`, role: "status", "aria-live": "polite" },
      h("div", { class: "amount__value t-display" }, h("span", { class: "amount__cur" }, "Rs"), fmt(value)),
      h("div", { class: "amount__hint t-caption" }, error || hint || ""));
  }

  // ---------- Keypad ----------
  function Keypad({ onKey }) {
    const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "del"];
    return h("div", { class: "keypad", role: "group", "aria-label": "Amount keypad" },
      keys.map((k) => k === "" ? h("span") :
        h("button", { class: "key", type: "button", "aria-label": k === "del" ? "Delete" : k, onClick: () => onKey(k) },
          k === "del" ? Icon("del", 24) : k)));
  }

  // ---------- StatusStep ----------
  function StatusStep({ label, state = "pending" }) {
    const icon = state === "done" ? Icon("check", 14) : state === "flag" ? Icon("alert", 14) : null;
    return h("li", { class: `step step--${state}` }, h("span", { class: "step__dot" }, icon), h("span", {}, label));
  }

  // ---------- RiskBanner ----------
  const LEVEL_ICON = { clear: "shieldCheck", check: "alert", stop: "stop" };
  function RiskBanner({ level, title, body, signals = [], lang = "en", open = false, onToggle }) {
    const rtl = lang === "ur";
    const why = rtl ? "یہ کیوں دکھایا گیا؟" : "Why am I seeing this?";
    return h("section", { class: `risk risk--${level}${rtl ? " risk--ur" : ""}`, role: level === "stop" ? "alert" : "status", dir: rtl ? "rtl" : "ltr", lang: rtl ? "ur" : "en" },
      h("div", { class: "risk__head" }, Icon(LEVEL_ICON[level], 20, "risk__icon"), h("h3", { class: "risk__title" }, title)),
      h("p", { class: "risk__body" }, body),
      signals.length ? h("button", { class: "risk__why", type: "button", "aria-expanded": String(open), onClick: onToggle }, why, Icon("chevron", 14, "risk__chev")) : null,
      signals.length && open ? h("ul", { class: "risk__signals" }, signals.map((s) => h("li", {}, s))) : null);
  }

  // ---------- SummaryRow ----------
  function SummaryRow({ label, value, strong }) {
    return h("div", { class: "sum" }, h("span", { class: "sum__label" }, label), h("span", { class: `sum__value${strong ? " sum__value--strong" : ""}` }, value));
  }

  // ---------- Checkbox ----------
  function Checkbox({ label, checked, onChange }) {
    const id = "cb" + Math.random().toString(36).slice(2, 7);
    return h("label", { class: "check", for: id },
      h("input", { type: "checkbox", id, checked, onChange: (e) => onChange(e.target.checked) }),
      h("span", { class: "check__box", "aria-hidden": "true" }, Icon("check", 14)),
      h("span", { class: "check__label" }, label));
  }

  // ---------- SlideToConfirm (with keyboard + screen-reader alternative) ----------
  function SlideToConfirm({ label, tone = "default", disabled, onConfirm }) {
    const knob = h("button", { class: "slide__knob", type: "button", disabled,
      "aria-label": disabled ? label : `${label}. Press Enter to confirm.` }, Icon("send", 22));
    const fill = h("span", { class: "slide__fill" });
    const text = h("span", { class: "slide__label" }, label);
    const track = h("div", { class: `slide slide--${tone}${disabled ? " slide--disabled" : ""}` }, fill, text, knob);
    let startX = 0, x = 0, max = 0, dragging = false, done = false;
    const set = (v, anim) => {
      knob.style.transition = anim ? "transform var(--motion-base) var(--motion-spring)" : "none";
      fill.style.transition = anim ? "width var(--motion-base) var(--motion-spring)" : "none";
      knob.style.transform = `translateX(${v}px)`; fill.style.width = `${v + 56}px`;
      text.style.opacity = String(Math.max(0, 1 - v / (max * 0.6)));
    };
    const finish = () => { done = true; set(max, true); track.classList.add("slide--done"); setTimeout(onConfirm, 260); };
    knob.addEventListener("pointerdown", (e) => {
      if (disabled || done) return;
      dragging = true; startX = e.clientX - x; max = track.clientWidth - knob.offsetWidth - 8;
      knob.setPointerCapture(e.pointerId);
    });
    knob.addEventListener("pointermove", (e) => { if (!dragging) return; x = Math.max(0, Math.min(max, e.clientX - startX)); set(x); });
    const end = () => {
      if (!dragging) return; dragging = false;
      if (x > max * 0.85) finish(); else { x = 0; set(0, true); }
    };
    knob.addEventListener("pointerup", end); knob.addEventListener("pointercancel", end);
    // Keyboard / assistive tech: Enter or Space confirms without a drag.
    knob.addEventListener("keydown", (e) => {
      if (disabled || done) return;
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); max = track.clientWidth - knob.offsetWidth - 8; finish(); }
    });
    // A plain click (no drag) on the knob nudges instead of sending, so a tap can't send by accident.
    knob.addEventListener("click", (e) => {
      if (disabled || done || e.detail === 0) return;
      if (x === 0) { track.classList.remove("slide--nudge"); void track.offsetWidth; track.classList.add("slide--nudge"); }
    });
    return track;
  }

  // ---------- Sheet ----------
  function Sheet({ title, body, actions = [], onClose, root }) {
    const close = () => { wrap.classList.add("sheet-wrap--out"); setTimeout(() => { wrap.remove(); onClose && onClose(); }, 220); };
    const panel = h("div", { class: "sheet", role: "dialog", "aria-modal": "true", "aria-label": title },
      h("div", { class: "sheet__grip", "aria-hidden": "true" }),
      h("h2", { class: "sheet__title t-title" }, title),
      h("div", { class: "sheet__body" }, body),
      h("div", { class: "sheet__actions" }, actions.map((a) => Button({ ...a, full: true, size: "lg", onClick: () => a.onClick(close) }))));
    const wrap = h("div", { class: "sheet-wrap" }, h("div", { class: "sheet__scrim", onClick: close }), panel);
    root.append(wrap);
    setTimeout(() => { const f = panel.querySelector("input,button"); f && f.focus(); }, 240);
    return { close };
  }

  // ---------- Toast ----------
  function Toast({ text, tone = "default", root }) {
    const t = h("div", { class: `toast toast--${tone}`, role: "status" }, tone === "positive" ? Icon("check", 16) : Icon("info", 16), text);
    root.append(t);
    setTimeout(() => t.classList.add("toast--out"), 2400);
    setTimeout(() => t.remove(), 2700);
  }

  // ---------- Figma <-> code map (rendered on the Design system tab) ----------
  const COMPONENT_MAP = [
    ["Button", "Button / Primary · Secondary · Ghost · Critical / Md · Lg", "Button({ variant, size, icon, full })"],
    ["IconButton", "Icon button / Plain · Soft", "IconButton({ icon, label, variant })"],
    ["Avatar", "Avatar / Initials / 32 · 40 · 56", "Avatar({ name, size, tone })"],
    ["ContactRow", "List / Contact row", "ContactRow({ name, detail, onClick })"],
    ["AmountField", "Amount / Default · Error", "AmountField({ value, error, hint })"],
    ["Keypad", "Keypad / Numeric", "Keypad({ onKey })"],
    ["StatusStep", "Status step / Pending · Active · Done · Flag", "StatusStep({ label, state })"],
    ["RiskBanner", "Risk banner / Clear · Check · Stop / EN · UR", "RiskBanner({ level, title, body, signals, lang })"],
    ["SummaryRow", "Summary / Row", "SummaryRow({ label, value, strong })"],
    ["Checkbox", "Checkbox / Off · On", "Checkbox({ label, checked, onChange })"],
    ["SlideToConfirm", "Slide to confirm / Default · Critical · Disabled", "SlideToConfirm({ label, tone, disabled, onConfirm })"],
    ["Sheet", "Sheet / Bottom", "Sheet({ title, body, actions })"],
    ["Toast", "Toast / Default · Positive", "Toast({ text, tone })"],
  ];

  window.UI = { h, Icon, Button, IconButton, Avatar, ContactRow, AmountField, Keypad, StatusStep, RiskBanner, SummaryRow, Checkbox, SlideToConfirm, Sheet, Toast, fmt, COMPONENT_MAP };
})();
