# Vega &mdash; personal AI assistant (version 3.2)

**Vega** is the new name of the assistant inside `assistant.html` (she was Nova in 3.0 and Sophia before that). She is the
same helper you already know, with a new name and a lot more to do: she opens
ChatGPT, Grok and Antigravity exactly like she opens YouTube, she can carry a
question into them for you, and when the internet is off she plays five
different games with you.

This page is a complete rewrite of the old file: it keeps the same look, but
one brain now runs both the big console and the "Vega (Discovery & Life Hub)"
window, and it can really control your Windows laptop when you start it the
right way. Her files still live under their old names (`sophia_helper.py`,
`Start_Sophia.bat`) so that your saved memories and shortcuts keep working.

It is made for your laptop: Windows 10 Pro, Intel Core i3-4005U, 4 GB RAM,
1366 x 768. Nothing is installed, nothing is downloaded, and it works offline
except for the things that need the internet (websites, Wikipedia, voice).

---

## 1. What goes on the laptop

Vega is six small files that sit together in one folder:

| File | What it is |
| --- | --- |
| `assistant.html` | Vega herself. This is the page you open. |
| `sophia_helper.py` | A small helper that lets Vega use Windows. |
| `Start_Sophia.bat` | Double-click this to start Vega. |
| `vega.ico` | Her icon: the tab, and the shortcut on your Desktop. |
| `INSTALL_SOPHIA.bat` | The one-step installer. |
| `Install_Sophia.ps1` | The script the installer runs. |

You do not need to place them by hand: **`INSTALL_SOPHIA.bat`** copies them to
the right folder, keeps a backup of the old page and makes a Desktop shortcut.
See section 8.

---

## 2. How to start her

**Best way (full control):** double-click **`Start_Sophia.bat`**.

A black window opens, then your browser opens Vega. Keep the black window
open while you use her; close it when you are done. The address will be
`http://127.0.0.1:8765/assistant.html` and the tag at the top says
**Laptop control active**.

**Simple way (no Python):** double-click **`assistant.html`**.

The page opens straight from the file. Websites, the calculator, the camera,
Windows settings and your delivery app still work. Opening other apps,
changing the volume or brightness, closing apps and taking screenshots need
the helper, so Vega will tell you to use `Start_Sophia.bat` instead of
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

## 2a. What changed in this pass (3.1.1)

These were real defects, found by sending about 130 ordinary sentences through her
and reading every answer. No new features were added to hide them.

| What was wrong | What she does now |
| --- | --- |
| "can you drive" opened **Google Drive** | questions about her own ability are answered, never turned into a website |
| "can you hack", "do you spy on me", "can you read my gmail" went to a Google search | honest answers, and the privacy answer lists exactly what she can and cannot see |
| "my mother is ill" got "Rest and water", as if it were about you | she notices it is someone else, and answers for them |
| keyboard mash ("asdkjhasd", "asdf asdf") offered a Google search | she says she did not catch it and asks again |
| "open", "what", "why" on their own got a search offer | "Open what?" / "tell me the rest" |
| "good morning" was treated as a mood report | it is a greeting |
| "who is the president of India" answered with an unrelated India fact | she says plainly that the name changes and her notes are frozen, then offers the live page |
| "remind me to ..." only stored a sentence | it now lands in the "for you, right now" card with the right day |
| "help me study", "teach me something" went to a search | real study advice |
| "spell ...", "meaning of ...", "synonym of ...", "translate ... in hindi" did nothing | a small hand-written word book answers them, and says so when a word is missing |
| "you there?", "test", "testing 123" went to a search | "I am here" |
| some Hinglish ("mujhe padhai karni hai", "khana kha liya", "kya tum mere ho") was not understood | they are understood |

---

## 2f. Her icon

![Vega icon](icons/icon-512.png)

One mark is used everywhere, so she looks like herself in every place you meet her:

| Where | What you see |
| --- | --- |
| The browser tab | the V mark, at 32 px |
| Pinned to the taskbar or start menu | the same mark, from the page's own icon |
| The `Vega` shortcut on your Desktop | `vega.ico`, six sizes inside one file (16 to 256 px) |
| The top-left corner of her page | the same mark, 46 px, in a rounded tile |

The icon is a `V` built from two ribbons of light, cyan meeting teal, inside three
thin orbit rings on deep navy &mdash; the same two colours her page already uses.
The full set lives in `icons/` (`icon-16.png` up to `icon-512.png`, plus
`vega.ico`). Only `vega.ico` travels into the installed folder; the rest are here
so the mark stays the same if you ever need it bigger.

## 2g. Opening a file by its name (new in 3.2)

This is the thing she could not do before: find a real file on the laptop from the
name you say, and open it.

Say any of these:

```
open my resume
open the physics project file
open resume.pdf
where is my marksheet
find my assignment
open the file called holiday photos
```

**With Python** (the full version, started with `Start_Sophia.bat`):

1. She looks through **Desktop, Downloads, Documents, Pictures, Music, Videos and OneDrive**, four folders deep.
2. She ranks what she finds: an exact name first, then a name that starts the same, then a name that contains the words.
3. **One clear match:** she opens it and tells you where it was &mdash; "Opening physics notes.pdf from Downloads."
4. **Several matches:** she shows a numbered list with folder and size, then waits:

```
I found 2 files called something like "physics project". Which one?
1. physics project.docx  - Documents > College (1.2 MB)
2. physics notes.pdf  - Downloads (900 KB)
Say the number, or say "first", "second", or "cancel".
```

5. **Nothing found:** she says where she looked and offers a web search. She never guesses and opens the wrong file.
6. **The file moved:** "That file moved or was renamed since I found it." She does not pretend it opened.

**Without Python** (double-clicked `assistant.html`): she cannot look through the
folder herself, so she asks for the folder **once**, then puts a real button under
the message that opens it. Say `how do I install python` and she gives the exact
steps, including the "Add python.exe to PATH" box most people miss.

### What the search will never do

- It never opens, reads, moves, renames or deletes a file while searching. It only lists names, sizes and folder positions.
- It never returns programs (`.exe`, `.dll`, `.msi`, `.bat`, scripts) or Windows internals.
- It never returns anything whose name contains "password", or a browser's saved-login file.
- It stops after 2.5 seconds or 20,000 files and says so, rather than freezing the laptop.

Tests: `tests/test_helper.py` builds a fake home folder and proves the rules above
&mdash; exact match first, no programs, no password files, honest empty answer,
human-readable sizes.

---

## 3. What Vega can do

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

Vega always asks **"Say yes to confirm"** before shutting down, restarting,
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

## 3a. ChatGPT, Gemini, Grok, Claude and Antigravity (new)

These are now ordinary places on her list, exactly like YouTube. Ask her to
open one, or give her a question and she carries it over:

```
open chatgpt                    open grok
open gemini                     open antigravity
open claude                     open copilot

ask chatgpt how do rockets work
ask grok why is the sky blue
tell claude to explain photosynthesis
ask gemini about black holes
```

How it really works, with no pretending:

| Site | What she does with your question |
| --- | --- |
| ChatGPT | opens `chatgpt.com` with the question already typed in |
| Grok | opens `grok.com` with the question already typed in |
| Claude | opens `claude.ai/new` with the question already typed in |
| Gemini | copies the question to the clipboard, opens Gemini, you press Ctrl + V |
| Antigravity | copies the question, opens it, you press Ctrl + V |
| Copilot | opens it, then you type or paste |

She does **not** log in as you, does not fake an account and does not answer
in their voice. Your question goes into **their** page in **your** browser, and
you talk to them there. That is the honest meaning of "a direct connection":
one command, the right page, the question already in place.

If you would rather have an AI answer **inside** Vega's own window, use
**Settings -> AI model**, paste a key you own, and she will answer there
instead. That path is optional; everything above works with no key at all.

---

## 3b. Security, and what she can and cannot see (new)

There is a small **(i)** button in the top right, next to the gear. It opens
**Security and privacy**, and it is written to be useful rather than scary.

It answers four things:

* **What Vega can and cannot reach.** She never opens Gmail, never reads a
  message, and cannot get the password of any account. No program on a laptop
  can count your Google accounts from outside, because Google does not allow
  it, so she says that plainly instead of pretending.
* **Check this laptop.** One button reads real Windows settings: firewall,
  virus protection, Windows Update, disk encryption, the sign-in accounts,
  and remote-access rules. It then counts the saved sign-ins in Chrome, Edge
  and Brave. It reads **a number only**: never a saved password, never a site
  name from that list, and the temporary copy it makes is deleted straight
  away.
* **Your accounts, honestly.** It tells you where to look: the account
  switcher at myaccount.google.com, the Password Manager in your browser, and
  account.microsoft.com. Only you can open those.
* **If you are worried.** Change that one password from the site itself, turn
  on two-step login, sign out of all devices, and tell a trusted adult the
  same day if money or a threat is involved.

Her helper already listens on **127.0.0.1 only**, so another machine cannot
send it orders, and it checks every request's Host, Origin and a random token
that is new on each start. That is real, not decoration.

---

## 3c. Feeling and caring (new)

She is still a program and still says so, but she no longer answers a heavy
sentence with "should I search Google?".

```
why do I feel like this        do you care about me
am I a burden                  nobody cares about me
i can't sleep                  nothing matters anymore
how are you                    i have not slept in three days
```

Two things happen. **Care answers** handle the questions people actually ask
at night, and **hidden weight** catches the sentences that never use a feeling
word ("nothing matters", "i let everyone down again") and answers them
gently instead of searching. If the week has been heavy, or it is late at
night, her replies get a softer opener. She never claims to love you, and
never says she is human.

## 3d-bis. Planning, study and "for you, right now" (new in 3.1)

She remembers dates now, not just words. Tell her a real date and she keeps it:

```
remember that my maths exam is on friday
remember to submit the physics project on 20 November
what is coming up
make me a study plan
how many days until friday
i keep forgetting things i read
```

A card called **For you, right now** sits on the page. It shows the three
nearest dated things you told her, how many days away each is, and a short,
specific line for each one ("Close. Say make me a study plan"). It updates the
moment you remember something new.

The study plan is short and honest: what to do each day, one thing that works
better than re-reading, and a reminder to sleep. It never promises marks.

**Learning help** answers the real problem instead of lecturing: active recall
for forgetting, 25-minute blocks for distraction, doing maths with the book
closed, and studying before midnight rather than after.

## 3d. Games when the internet is off

Say **"play a game"** and she offers five, and she keeps playing turn by turn
while you just type your answer:

| # | Game | How it plays |
| --- | --- | --- |
| 1 | Guess the number | she picks 1-100, tells you higher or lower, 8 tries |
| 2 | Word chain | your word must start with the last letter of hers |
| 3 | Riddles | a clue, then hints, then the answer |
| 4 | Story game | you write one sentence, she writes the next, six turns, then she reads the whole story back |
| 5 | Word scramble | she mixes a word up, you put it back, she keeps your score |

```
play a game            4                i found a door in the garden wall
end story              5                hint
stop game
```

They need no internet, no key and no helper: the words and the story lines are
inside `assistant.html` itself. Everything she says can also be read aloud.

---

## 3e. Feelings and knowledge

**Talking about feelings.** Vega reads the *words* you use and answers
gently. She is not a doctor and she cannot see your face or hear your voice
tone, so this is pattern matching, not mind reading. Say any of these:

```
i am sad                     i feel lonely
i am stressed about my exam  my parents are fighting
i am angry at my friend      i cannot sleep
i feel like a failure        i miss my grandmother
nobody talks to me at school i am so tired of everything
i am happy today             i topped my class
i am hungry                  i have a headache
```

She answers with one short, kind line, then usually asks **one** question or
offers **one** small step, such as a breathing round, a glass of water, or
"tell a parent". She does not lecture and she does not pretend to be a person.

Some things get a different answer on purpose:

- If you say something like **"i want to die"** or you are hurting yourself,
  Vega stops being a chatbot and asks you to talk to a real adult **today**.
  She gives the free Indian helplines: **Tele-MANAS 14416**, **Childline 1098**
  and **112** if you are in danger.
- If someone is hurting you, she tells you it is not your fault and asks you to
  tell one adult you trust, and to keep the messages or screenshots as proof.
- She says clearly that she is an AI program, so she is not a replacement for a
  parent, a teacher or a counsellor.

**How your week looked.** Tap a face in the *How are you feeling right now?*
card (or in the Vega Hub). The little bars under it show the last dozen
feelings, and **Settings > How your week has felt** shows a simple count.
Everything stays in this browser on this laptop. **Forget my feelings** clears
it. Vega uses that history only to be a little gentler, for example asking
about sleep if you have been tired lately.

**Knowledge without internet.** She carries her own notes so she can still
answer when the Wi-Fi is down. Right now that is:

- **30 topics** with about **190 honest notes**, for example the solar system,
  photosynthesis, the human body, the water cycle, atoms, electricity,
  computers, AI, India, Indian history, India's freedom fighters, world
  history, world geography, maths, English, languages, animals, earthquakes,
  matter and forces, health, sports, inventions, space missions, the
  environment, money, coding and how the body works.
- **60 quick facts** ("tell me a fact" gives a new one each time).
- **12 riddles** with hints.
- **96 quiz questions**, five per round, with a score and a streak.
- **60+ country capitals**, unit conversion (km/miles, kg/pounds, cm/inches,
  litres/ml, Celsius/Fahrenheit) and averages.

Try:

```
tell me about the solar system     quiz me on space
tell me a fact                     tell me a riddle
capital of australia               convert 10 km to miles
average of 12 18 25                my laptop is hanging
play a game                        play word chain
```

If she does not know, she says so, then offers Wikipedia, then Google. She
never invents a fact to look clever. When she answers from her own notes she
says so, so you always know where an answer came from.

---

## 4. The voice button

Voice input uses your browser's speech recognition, so it needs the internet
and works best in **Chrome or Edge**. The first time you click the orb, the
browser asks for microphone permission; click **Allow**.

If you see "Microphone blocked", click the small padlock in the address bar,
allow the microphone, then reload the page.

Vega stops listening while she is speaking, so she never hears herself and
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

When a model is connected, Vega gets much better at open questions and can
explain things in her own words. The privacy tag in her window changes to say
that questions go to that service. Your key is stored only in this browser.

The model can also ask Vega to **open** things while she answers (for
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
  or Vega herself.
* It never force-closes an app; if a program will not close politely, Vega
  says so and asks you to close it.
* Nothing is sent anywhere by default.

---

## 7. If something goes wrong

| Problem | What to do |
| --- | --- |
| "Could not start Vega on 127.0.0.1:8765" | She is probably already running. Look for the black window, or just open `http://127.0.0.1:8765/assistant.html`. |
| The tag says **Browser mode** | You opened `assistant.html` directly. Use `Start_Sophia.bat` for full control. |
| Nothing happens when she opens a site | The browser blocked the new tab. Click the blue link she gives you, or allow pop-ups for this page. |
| "I cannot find index.html" | Copy your delivery app's `index.html` into the same folder as `assistant.html`. |
| No sound from the microphone | Allow the microphone (padlock icon), and check Windows Settings &rarr; Privacy &rarr; Microphone. |
| She says "this screen does not let Windows change its brightness" | Some laptop screens (and many external monitors) block brightness control. Use the keyboard brightness keys. |
| An app will not open | Vega looks in the Start Menu and in the Microsoft Store. If it still fails, pin it to Start or tell me the exact name. |

---

## 8. Putting Vega on the laptop (one step)

I cannot reach your laptop from here: nothing on my side can open your folders
or install anything for you. So the download installs itself.

1. Download **`Vega-3.2.zip`** from GitHub and unzip it.
2. Double-click **`INSTALL_SOPHIA.bat`** inside the unzipped folder. (If you
   prefer one single file, download `Vega_Install_One_File.bat` instead and
   double-click that; it does the same thing and unpacks itself.)
3. It finds your delivery app folder, asks once to confirm, then:
   * copies `assistant.html`, `sophia_helper.py` and `Start_Sophia.bat`,
   * keeps your old page as `assistant-old-<date>.html`,
   * puts a **Vega** shortcut on your Desktop,
   * offers to start her straight away.

If Windows shows "Windows protected your PC", click **More info** then
**Run anyway**; that box appears for every downloaded file. You can also
right-click `Install_Sophia.ps1` and choose **Run with PowerShell**.

To undo everything: rename `assistant-old-<date>.html` back to
`assistant.html`. Nothing else on the laptop is touched.

---

## 9. Files in this repository

| File | Purpose |
| --- | --- |
| `assistant.html` | Vega: the brain, the page, the look. One file, no build step. |
| `sophia_helper.py` | Local Windows helper and tiny web server (Python standard library only). Also finds files by name. |
| `Start_Sophia.bat` | Double-click starter. Finds Python, then opens Vega. |
| `INSTALL_SOPHIA.bat` | One-step installer: copies the files and makes a Desktop shortcut. |
| `Install_Sophia.ps1` | The PowerShell script behind the installer. |
| `vega.ico` | Her icon, in six sizes. The installer puts it in the folder and on the shortcut. |
| `tests/brain.test.js` | 68 tests for what Vega understands. `node --test tests/brain.test.js` |
| `tests/test_helper.py` | 46 tests for the helper, the file search, the installer and the server. `python3 -m unittest discover tests` |

Old versions: `git show 09ca826:assistant.html` is the file exactly as you
first uploaded it, and `git show 5cd7650:assistant.html` is version 2.2 (before
the Vega name, the AI connections and the games).

---

## 10. Honest limits

* Vega is a program, not a person. She has no feelings, no body, and she
  cannot really "think" like a human. The "human intelligence" part is a
  carefully written set of rules (her brain) plus, if you connect one, an AI
  language model. That is how every assistant works.
* She understands the commands in this guide well. Ask her something far away
  from those patterns and she will use Wikipedia, the AI model if you
  connected one, or offer a Google search.
* Her feeling reader is **text only**. She reads the words you type or dictate,
  not your face, your voice tone, or your heartbeat, and she does not diagnose
  anything. If something feels really heavy, a real adult is always better than
  a program, and she says so.
* Her offline knowledge is a fixed set of notes (30 topics, about 190 notes).
  It is real, checked-by-hand information, but it is not the whole internet.
  Anything outside it goes to Wikipedia, then a Google search.
* Timers, reminders, weather readings inside the app, and controlling other
  phones or printers are not built yet.
* A real AI key needs an adult's account and may cost money. Ask a parent.
* Windows-only for laptop control. On a Mac or Linux the helper runs in
  preview mode only.

---

Made for Kartikey Raj. If you want a new command, just tell me what you would
type, and I will add it.
