# Vega 3.5 — the disadvantages, in one table

Nothing here is a guess. Each line was checked against the code in
`assistant.html` and `sophia_helper.py` on this branch. Where a limit is a
deliberate trade-off it says so; where it is simply missing it says that too.

## 1. The main table

| # | Disadvantage / impurity | What it actually means for you | Why it is like this | How bad |
| --- | --- | --- | --- | --- |
| 1 | **Not a real language model** | Without a key she answers from ~9 knowledge packs, 11 written explanations and a set of maths solvers. Ask about 2026 news, a film, or calculus and she says *"I could not find that… should I search Google?"* | The whole point was to work with no key, no internet and no install. A real model needs one of those. | **High** — this is the biggest single gap |
| 2 | **Needs your own API key for open questions** | Free-form answers, essays, translation and "explain this paragraph" only work after you paste an `sk-…` key from OpenAI (or a compatible service) | She has no server of her own, and I do not have one to give you | **High** if you want a general assistant |
| 3 | **The API key sits in the browser** | It is stored in this browser's `localStorage` on this laptop and sent straight to the AI service. It is not encrypted | There is no back end to keep a secret in | **Medium** — do not use a shared or college computer |
| 4 | **Each question costs you money** | With a key, every message is billed to your account. The key test button (`/models`) is free; talking is not | That is how the AI services price | **Medium** |
| 5 | **Windows only for laptop control** | Shutdown, restart, sleep, lock, volume, brightness, opening apps, and reading files need Windows **and** Python. On a phone or a Mac she can only open websites | Those actions go through `sophia_helper.py`, which is Windows/Python | **Medium** |
| 6 | **The helper is genuinely powerful** | Whatever can reach `127.0.0.1` while it runs could ask it to shut the machine down. It is protected by a random token, a host check, an origin check and a site check, and it listens only on localhost | It has to be able to do those things or it is useless | **Low–Medium** — close the black window when finished |
| 7 | **Shutdown / restart / sleep are irreversible** | She asks "say yes to confirm" first and warns that unsaved work will be lost, but after you say yes there is no undo | The operating system has no undo for these | **Low** (guarded) but real |
| 8 | **No Gmail login, no account counting** | She can open Gmail in your browser. She cannot log in, read your mail, or count your saved accounts | Doing that needs your password, which she must never have | **By design** |
| 9 | **Feelings are inferred from text** | "You sound tired" is a guess from wording, time of day and streak. She cannot see your face or hear your voice tone | Only text reaches her | **Low**, but do not treat it as fact |
| 10 | **One 600 KB HTML file** | All her logic lives in `assistant.html` (~8,970 lines). Editing one half risks breaking the other, and there is no build step to catch it | It is what makes "one file, double-click, no install" possible | **Medium** for maintenance, invisible to you |
| 11 | **Daily quests rotate with the date** | The three quests change each day; a quest you wanted may not be offered today. Two of my own tests silently depended on today's date | A fixed set would be boring; a rotating set is harder to test | **Low** — found and fixed in this pass |
| 12 | **Memory can be lost with the browser** | Name, notes, shortcuts and progress live in `localStorage`. Clearing site data, a different browser, or private mode starts her blank | No cloud account, by design | **Medium** |
| 13 | **No voice without the browser's voices** | Speech uses `speechSynthesis`. On a machine with no English voice installed she falls back to text only | The voice belongs to Windows, not to Vega | **Low** |
| 14 | **Wikipedia lookups need the internet** | Offline, an unknown topic goes straight to "should I search Google?" | The lookup is a live web call | **Low** |
| 15 | **Maths has a ceiling** | She now does arithmetic, fractions, ratio, percent, speed, averages, circles, Pythagoras, linear and quadratic equations, 2×2 systems and factorising. She does **not** do calculus, trigonometry, matrices, or 3-D vectors, and she returns `null` instead of guessing | Each solver is written by hand and verified; none of them guess | **Medium** |
| 16 | **Whole-number fractions only** | `1/3 + 1/3` is exactly `2/3`. But a fraction with a decimal inside, like `2.5/3`, is refused rather than rounded | Exactness was chosen over coverage | **Low** |
| 17 | **Currency conversion is not answered** | "500 rupees in dollars" gets an honest "I have no live rate" and a search offer | A frozen rate would be a lie | **Low** — deliberate |
| 18 | **No tests run in a browser** | 102 node tests and 57 Python tests exercise the same brain and helper the page loads, but nothing renders the page in a real browser in this environment | The sandbox has no browser and cannot download one | **Medium** — a layout bug could slip through |
| 19 | **Built for one specific laptop** | Windows 10, i3-4005U, 4 GB RAM, 1366×768. It will run elsewhere but was tuned for that screen and that little memory | It was written for your machine | **Low** |
| 20 | **No updates, no crash reporting** | If 3.5 has a fault, nothing tells me. You have to notice and say so | No server, no telemetry | **Medium** |

## 2. The three that matter most

If you only fix three things, fix these:

1. **The key and the cost (rows 2–4).** Everything else is a feature limit; this
   one is a money limit. Check the price on your account before you use a key
   for a long conversation.
2. **The helper's power (rows 5–7).** It is the only part that can lose work
   that is not saved. Close the black window when you are done, and never leave
   it running on a shared machine.
3. **The offline ceiling (row 1).** She is a very good calculator and a small
   encyclopedia, not a general assistant. For a general assistant she needs a
   key; there is no honest way around that.

## 3. What is *not* a disadvantage

These are often mistaken for faults. They are deliberate:

- **She says "I could not find that" instead of inventing an answer.** That is
  the honesty rule, not a bug.
- **She refuses to treat a URL as an API key.** `api.openai.com/v1/responses`
  is an address she already knows; the key is the `sk-…` string. She will not
  pretend a URL is a key, and she will not claim a key works when none was given.
- **She will not log in to Gmail or count your accounts.** No password, no
  pretending.
- **Prestige is refused below level 20.** Earned, not granted.
