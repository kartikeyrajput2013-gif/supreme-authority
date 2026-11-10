# Sophia &mdash; personal AI assistant

Sophia is the assistant inside `assistant.html`. This page is a complete
rewrite of the old file: it keeps the same look, but one brain now runs both
the big console and the "Sophia (Discovery & Life Hub)" window, and it can
really control your Windows laptop when you start it the right way.

It is made for your laptop: Windows 10 Pro, Intel Core i3-4005U, 4 GB RAM,
1366 x 768. Nothing is installed, nothing is downloaded, and it works offline
except for the things that need the internet (websites, Wikipedia, voice).

---

## 1. What you need to copy

Put these three files **in the same folder as your delivery app**
(`DELIVERY APP STUFF`):

| File | What it is |
| --- | --- |
| `assistant.html` | Sophia herself. This is the page you open. |
| `sophia_helper.py` | A small helper that lets Sophia control Windows. |
| `Start_Sophia.bat` | Double-click this to start Sophia. |

Your delivery app stays exactly where it is. Sophia looks for `index.html` in
that same folder when you say "open delivery app".

> Important: keep the files in the folder. If you move `Start_Sophia.bat` to
> the desktop without the other two files, it will not work.

---

## 2. How to start her

**Best way (full control):** double-click **`Start_Sophia.bat`**.

A black window opens, then your browser opens Sophia. Keep the black window
open while you use her; close it when you are done. The address will be
`http://127.0.0.1:8765/assistant.html` and the tag at the top says
**Laptop control active**.

**Simple way (no Python):** double-click **`assistant.html`**.

The page opens straight from the file. Websites, the calculator, the camera,
Windows settings and your delivery app still work. Opening other apps,
changing the volume or brightness, closing apps and taking screenshots need
the helper, so Sophia will tell you to use `Start_Sophia.bat` instead of
pretending it worked.

If Windows shows a blue "Windows protected your PC" box for the `.bat` file:
click **More info** then **Run anyway**. The file is only a few lines of text
and you can open it in Notepad to read it.

### Do you have Python?

The helper needs Python 3. If `Start_Sophia.bat` says Python was not found,
install it once from <https://www.python.org/downloads/windows/> and tick
**Add python.exe to PATH** during setup. Then double-click the `.bat` again.
Without Python everything except laptop control still works.

---

## 3. What Sophia can do

**Open things**

```
open youtube                    open notepad
open gmail and github           open chrome and spotify
open github.com                 open my downloads folder
open wifi settings              open delivery app
```

**Search and play**

```
search youtube for lofi music   google the capital of France
play arijit singh songs         search gmail for exam
show me pictures of cats        latest news about isro
weather in patna
```

**Control the laptop** (needs `Start_Sophia.bat`)

```
volume up                       set volume to 40        mute
brightness down                 set brightness to 60    dim the screen
next song                       pause the music
take a screenshot               lock my laptop
shut down the laptop            restart                 sleep
```

Sophia always asks **"Say yes to confirm"** before shutting down, restarting,
sleeping or signing out, and she never lets an AI model do those things.

**Remember things**

```
remember that my bag is in the cupboard
where is my bag
my exam is on monday            when is my exam
remember that my favourite colour is blue
what do you remember            forget my bag
```

Memory is saved in this browser on this laptop only.

**Teach her shortcuts**

```
when I say study time open youtube and gmail
study time
what are my shortcuts
```

**Ask things**

```
what time is it                 what is the date
what is 25 times 4              calculate 15% of 250
how much ram                    laptop specs
who is APJ Abdul Kalam          what is photosynthesis
tell me a joke                  i am bored
```

**Talk, in English or Hindi-English**

```
hi                              how are you
i am sad                        i am hungry
youtube kholo                   instagram kholo
volume badhao                   awaaz kam karo
time kya hai                    mera naam kya hai
screenshot lo                   shukriya
```

**Type or speak.** Everything works both ways: the text box, the orb, the
microphone button and the 8 launcher buttons all use the same brain.

---

## 4. The voice button

Voice input uses your browser's speech recognition, so it needs the internet
and works best in **Chrome or Edge**. The first time you click the orb, the
browser asks for microphone permission; click **Allow**.

If you see "Microphone blocked", click the small padlock in the address bar,
allow the microphone, then reload the page.

Sophia stops listening while she is speaking, so she never hears herself and
answers her own sentence.

---

## 5. Settings (the gear button)

* **Your name** &mdash; what she should call you.
* **Speak replies out loud** and **voice language** (English India, UK, US,
  Hindi).
* **AI model for open questions** &mdash; this is optional:

| Choice | What it means |
| --- | --- |
| Built-in brain only | Works with no account and no internet. Handles all commands, maths, memory, time, and small talk. Unknown facts are looked up on Wikipedia. |
| Google Gemini | Free key from <https://aistudio.google.com>. Ask a parent first. |
| OpenAI-compatible | Any service with an API key (OpenAI, Groq, OpenRouter, a local Ollama). |

When a model is connected, Sophia gets much better at open questions and can
explain things in her own words. The privacy tag in her window changes to say
that questions go to that service. Your key is stored only in this browser.

The model can also ask Sophia to **open** things while she answers (for
example "open youtube and play lofi"), but it can never shut down or restart
the laptop.

---

## 6. Is it safe?

* The helper listens on **127.0.0.1 only**, which means only this laptop can
  talk to it. Other computers on your Wi-Fi cannot reach it.
* It refuses requests that come from other websites, and each page load gets a
  fresh secret token.
* It only runs a fixed list of actions. It cannot open `file://` links, run
  commands, or delete files.
* It can never close Explorer, Task Manager, your browser, `cmd`, PowerShell
  or Sophia herself.
* It never force-closes an app; if a program will not close politely, Sophia
  says so and asks you to close it.
* Nothing is sent anywhere by default.

---

## 7. If something goes wrong

| Problem | What to do |
| --- | --- |
| "Could not start Sophia on 127.0.0.1:8765" | She is probably already running. Look for the black window, or just open `http://127.0.0.1:8765/assistant.html`. |
| The tag says **Browser mode** | You opened `assistant.html` directly. Use `Start_Sophia.bat` for full control. |
| Nothing happens when she opens a site | The browser blocked the new tab. Click the blue link she gives you, or allow pop-ups for this page. |
| "I cannot find index.html" | Copy your delivery app's `index.html` into the same folder as `assistant.html`. |
| No sound from the microphone | Allow the microphone (padlock icon), and check Windows Settings &rarr; Privacy &rarr; Microphone. |
| She says "this screen does not let Windows change its brightness" | Some laptop screens (and many external monitors) block brightness control. Use the keyboard brightness keys. |
| An app will not open | Sophia looks in the Start Menu and in the Microsoft Store. If it still fails, pin it to Start or tell me the exact name. |

---

## 8. Files in this repository

| File | Purpose |
| --- | --- |
| `assistant.html` | Sophia: the brain, the page, the look. One file, no build step. |
| `sophia_helper.py` | Local Windows helper and tiny web server (Python standard library only). |
| `Start_Sophia.bat` | Double-click starter. Falls back to browser mode without Python. |
| `tests/brain.test.js` | 27 tests for what Sophia understands. `node --test tests/brain.test.js` |
| `tests/test_helper.py` | 23 tests for the helper's safety and server. `python3 -m unittest discover tests` |

Old versions: `git show 09ca826:assistant.html` is the file exactly as you
first uploaded it.

---

## 9. Honest limits

* Sophia is a program, not a person. She has no feelings, no body, and she
  cannot really "think" like a human. The "human intelligence" part is a
  carefully written set of rules (her brain) plus, if you connect one, an AI
  language model. That is how every assistant works.
* She understands the commands in this guide well. Ask her something far away
  from those patterns and she will use Wikipedia, the AI model if you
  connected one, or offer a Google search.
* Timers, reminders, weather readings inside the app, and controlling other
  phones or printers are not built yet.
* A real AI key needs an adult's account and may cost money. Ask a parent.
* Windows-only for laptop control. On a Mac or Linux the helper runs in
  preview mode only.

---

Made for Kartikey Raj. If you want a new command, just tell me what you would
type, and I will add it.
