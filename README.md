# Safe Send

A working prototype of a send-money flow that checks every transfer for scam patterns before you confirm.
**Rules decide the risk. AI only explains it, in English or Urdu.**

Independent concept. Not affiliated with any bank or wallet. All names, numbers and amounts are fictional.

- **Live prototype:** https://asharib725.github.io/safe-send/
- **Case study:** https://asharib725.github.io/safe-send/case-study/
- **Figma library:** https://www.figma.com/design/xwTJW8Nh2Iwuu6JytEI57r (variables, 13 components, the send flow and a Figma ↔ code map)

- **Figma library:** [Safe Send · Design system](https://www.figma.com/design/xwTJW8Nh2Iwuu6JytEI57r) (variables, 13 components, flow screens, Figma ↔ code map)
- **Live prototype:** open `dist/index.html`, or the deployed link once it's up

## What's in it

| Tab | What it shows |
| --- | --- |
| Prototype | Home → recipient → amount → risk check → review → slide to send → success, failure or "Don't send". Three scenarios (family, new number, prize-fee scam), Urdu explanations, a forced network failure. |
| Design system | Tokens and all 13 components, rendered live from the same code the prototype uses, plus the Figma ↔ code map. |
| AI rules | Where AI acts and where it never does, the five "never generate" checks, and a live validator run on every approved explanation and four rejected drafts. |

## Structure

```
tokens/tokens.json        single source of truth for color, type, space, radius, motion
src/js/components.js      13 components, each mapped 1:1 to a Figma component
src/js/risk.js            signals, thresholds, approved copy (EN + UR), guardrail validator
src/js/app.js             screens, navigation, scenario panel, docs tabs
src/styles/               tokens.css (generated), components.css, app.css
scripts/build.py          tokens → CSS, font subsetting, inlines everything into dist/index.html
scripts/test_flow.py      drives every path in headless Chrome and saves screenshots
scripts/capture_case_study.py  captures the real prototype states used in the case study
src/case-study.html       the case study page (built to dist/case-study/index.html)
assets/case-study/        screenshots used by the case study
dist/index.html           the built, self-contained page (deploy this anywhere)
```

No framework and no npm install. Build with `python3 scripts/build.py` (needs `fontTools` for the font subset; falls back to system fonts without it).

## Decisions worth reading

1. **Detection is deterministic; language is AI.** Risk comes from data the wallet already has (history, reports, account age, note wording). A model may phrase the explanation, but only from the detected signals, and only if it passes `Risk.validate()`.
2. **Friction matches risk.** A known contact gets one slide. A new number gets a "call them first" option. A scam pattern makes "Don't send" the primary action and requires a confirmation before sending anyway. The app never blocks outright.
3. **Never "safe".** The clear state says "No warning signs found", because the system can't know a transfer is safe.
4. **Phrases, not words.** The note filter matches "claim fee", not "fee", so "school fee" to family doesn't raise a flag.
5. **No drag required.** The slide-to-confirm knob confirms with Enter for keyboard and screen-reader users; a single tap only nudges, so it can't send by accident.
6. **Errors say what happened to the money.** "Nothing left your account and your balance hasn't changed."

## Figma ↔ code

The Figma file uses one variable collection whose paths match `tokens/tokens.json` (`color/ink/900` → `var(--color-ink-900)`, set as each variable's code syntax). Every component in `src/js/components.js` has a Figma component with the same name and variants; the table is in the file's Overview page and in `COMPONENT_MAP`.

## Next

- Usability test of the Urdu explanations
- 90-second walkthrough video

Built with Claude as an AI pair-programmer.
