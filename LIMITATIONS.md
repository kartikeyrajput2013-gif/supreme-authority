# Vega 3.5 — the disadvantages, ordered from lowest to supreme

Read this table from the top down: everything near the top is small and mostly
fixed, and the rows at the **bottom** are the ones that actually matter. The
last row is the supreme problem, the one that cannot be engineered away.

**How bad** is a judgement, not a measurement, but every rating below is pinned
to something checkable in the code. Where a limit was *reduced* in 3.5 the row
says so and gives the before/after.

## The table: low → supreme

| Order | # | Disadvantage / impurity | What it actually means for you | How bad | Can it be fixed? |
| --- | --- | --- | --- | --- | --- |
| 1 | 1 | **Daily quests rotate with the date** | A quest you wanted may not be offered today. This had silently broken one of my own tests, which passed on one date and failed the next. | **Lowest** — now fixed, and the test pins its own clock | **Yes — done.** The test no longer depends on today. |
| 2 | 2 | **No voice without Windows voices installed** | Speech uses the browser's `speechSynthesis`. On a machine with no English voice she falls back to text only. | **Low** — cosmetic, and the text is always there | Yes, by installing a Windows voice. Not worth bundling. |
| 3 | 3 | **Wikipedia needs the internet** | Offline, an unknown topic goes straight to *"should I search Google?"* | **Low** — she says so rather than inventing | Only with a large offline corpus. |
| 4 | 4 | **No currency conversion** | "500 rupees in dollars" gets an honest *"I have no live rate"* and a search offer. | **Low** — deliberate | Yes, but only with a live rate; a frozen rate would be a lie, so it stays refused. |
| 5 | 5 | **Whole-number fractions only** | `1/3 + 1/3` is exactly `2/3`. A fraction with a decimal inside, like `2.5/3`, is refused rather than rounded. | **Low** — exactness was chosen over coverage | Yes, but the exact path is the better one. |
| 6 | 6 | **Feelings are inferred from text** | "You sound tired" is a guess from wording, time of day and streak. She cannot see your face or hear your tone. | **Low** — and she never diagnoses | No. Text is all she receives. |
| 7 | 7 | **Memory dies with the browser** | Name, notes, shortcuts and progress live in `localStorage`. Clearing site data, a different browser, or private mode starts her blank. | **Low–Medium** — real, but you control it | Yes — the next version should write a backup file through the helper. Not built yet. |
| 8 | 8 | **No updates, no crash reporting** | If 3.5 has a fault, nothing tells me. You have to notice and say so. | **Medium** — this is how two bugs survived into a release | Yes, with a version check. Not built yet. |
| 9 | 9 | **Tuned for one laptop** | Windows 10, i3-4005U, 4 GB RAM, 1366×768. It runs elsewhere but was optimised for that screen and that little memory. | **Medium** — it is your machine, so the tuning fits | Yes, but there is no reason to. |
| 10 | 10 | **One 602 KB HTML file** | All her logic is in `assistant.html` (~8,970 lines). Editing one half can break the other, and no build step catches it. | **Medium** — invisible to you, painful to maintain | **Partly done.** Two new tools (`rebuild_installer.py`, `verify_payloads.py`) stop the release from drifting. |
| 11 | 11 | **Shutdown / restart / sleep have no undo** | She asks "say yes to confirm" and warns that unsaved work is lost, but after yes there is no undo. | **Medium** — guarded, but irreversible | No. The operating system has no undo. |
| 12 | 12 | **The helper is genuinely powerful** | Shutdown, volume, brightness, apps, files. Protected by a random token, a host check, an origin check and a site check, and it listens on localhost only — but close the black window when done. | **Medium** — the most powerful part of the app | Partly. Keep the checks; never run it on a shared machine. |
| 13 | 13 | **No Gmail login, no account counting** | She can open Gmail in your browser. She cannot log in, read your mail, or count your saved accounts. | **Medium** — but by design | No, and it should not be. It would need your password. |
| 14 | 14 | **Windows + Python only for laptop control** | Shutdown, restart, sleep, lock, volume, brightness, opening apps and reading files need Windows **and** Python. On a phone or a Mac she can only open websites. | **Medium** | Only by rewriting the helper per platform. |
| 15 | 15 | **Maths still has a ceiling** | 3.5 added trigonometry, logs, roots, `nCr`/`nPr`, 2×2 determinants, 3-D dot products and a polynomial derivative. Still missing: integration, 3×3 matrices, sine/cosine rules, statistics beyond the mean, and proof writing. She returns *null* rather than guessing. | **Medium** — the ceiling moved up a lot, but it is still a ceiling | Yes, one solver at a time. |
| 16 | 16 | **Every message with a real key costs money** | The `/models` test button is free; talking is billed to your account. | **Medium–High** — it is a money limit, not a feature limit | No. That is how AI services price. Check the price first. |
| 17 | 17 | **The API key sits in the browser** | Stored in this browser's `localStorage` on this laptop and sent straight to the AI service. Not encrypted. | **High** — fine at home, wrong on a shared or college PC | No, without a server to keep the secret. |
| 18 | 18 | **Not a real language model, and it needs your own key for open questions** | Without a key she answers from ~9 knowledge packs, 11 written explanations and the maths solvers. "Who won the world cup" → *"I cannot answer that by myself yet."* With a key, free-form answers work — at your cost, with your key. | **High to start, reduced in 3.5** | **Partly.** The offline answer set roughly doubled, but a general assistant still needs a key. |
| **19** | **19** | **THE SUPREME LIMIT: she has no model of her own** | Everything above is a consequence of this one line. She cannot learn from a conversation, cannot hold a long argument, cannot write an essay from a blank page, and cannot know anything that was not written into her by hand or fetched live. The maths solvers are exact because they are narrow; the moment a question leaves their shape, the intelligence stops. | **Supreme — this is the root cause, not a symptom** | **Not without a server and a budget.** A key borrows somebody else's model; it does not give her one. Any claim of "10000% more intelligence" would be a lie, because this row would still be true. |

## Reading the table honestly

- **Rows 1–6 are close to gone.** They are cosmetic, deliberate, or already
  fixed. Together they would not change how the app feels.
- **Rows 7–15 are real engineering debt.** Each has a clear fix; none of them
  stops you using her today. Two of them (the installer drift and the
  date-dependent test) were *found* while writing this table, not assumed.
- **Rows 16–18 are the price of borrowing an intelligence.** The money, the key
  on disk, and the need for a key at all all come from the same place.
- **Row 19 is the truth underneath all of it.** It is at the bottom because it
  is the largest, not because it is the easiest to ignore.

### What 3.5 actually raised

| Was | Now |
| --- | --- |
| `sin 30` → *"I am not sure what you mean"* | `0.5` (exactly 1/2) |
| `log base 2 of 8` → *"2 out of 8 is 25%"* (**wrong**) | `3`, because 2³ = 8 |
| `5c2` → *"I am not sure what you mean"* | `10` |
| `determinant of 1 2 3 4` → *"could not find"* | `-2` |
| `dot product of 1 2 3 and 4 5 6` → *"could not find"* | `32`, with the working |
| `derivative of 3x^2 + 5x + 7` → *"could not find"* | `6x + 5` |
| No page test at all | 4 tests that load the real file, type into the real box and read the real chat log |
| Canvas failure killed the whole page | The wave is optional; the page survives without it |

The last two are why row 10 and row 15 can be rated lower than they were when
the first version of this table was written.

## What is *not* a disadvantage

- **She says "I could not find that" instead of inventing an answer.** That is
  the honesty rule, not a bug.
- **She refuses to treat a URL as an API key.** `api.openai.com/v1/responses`
  is an address she already knows; the key is the `sk-…` string.
- **She will not log in to Gmail or count your accounts.**
- **Prestige is refused below level 20.** Earned, not granted.
