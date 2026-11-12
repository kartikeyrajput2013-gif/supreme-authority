# Vega &mdash; personal AI assistant (version 3.5)

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

**What 3.5 changed.** She can now work out about twice as much school maths on
her own &mdash; fractions with mixed numbers, ratio and proportion, percent in
both directions, discounts, speed, averages, a circle given only its diameter,
Pythagoras and pairs of equations &mdash; and she answers *why* and *how*
questions with a numbered argument instead of a single stored fact. The file
you download is still **`Vega_Install_One_File.bat`**. Section 2j has the
before-and-after examples.

---

## 0. The file to download, named exactly, and the steps

**Download `Vega_Install_One_File.bat`. That is the whole answer.** One file,
one double-click, nothing to unzip.

There are **two files on the GitHub page**. You only need one of them, and the
first one is the one almost everybody wants.

| The file | Size | Use it when |
| --- | --- | --- |
| **`Vega_Install_One_File.bat`** | about 1.5 MB | **Normal case.** One file, nothing to unzip, no folder to lose. |
| **`Vega-3.5.zip`** | about 360 KB | A browser or antivirus refuses `.bat` downloads, or you want to read the files first. |

Everything else on the page (the `.html`, the `.py`, the `.ps1`) is the same
content **for reading**, not for clicking. If you download those separately you
will get six files that do not know each other.

### Downloading `Vega_Install_One_File.bat` from GitHub

1. Open the repository page:
   `https://github.com/kartikeyrajput2013-gif/supreme-authority`
2. Look at the file list in the middle of the page. It is the long list that
   starts with a folder called `icons`.
3. Find the line that says **`Vega_Install_One_File.bat`**. If you cannot see
   it, press `Ctrl + F` and type `Vega_Install_One_File`.
4. **Click that name once.** The file opens as a page, and at the top right of
   that page there is a **download icon** (a small arrow pointing down into a
   tray).
5. Click the **download icon**. Your browser saves the file. It usually lands in
   `C:\Users\YourName\Downloads`.
6. If the browser says *"this type of file can harm your computer"*, choose
   **Keep**. That warning appears for every `.bat` file that exists, including
   harmless ones, because it is a script. You can read it: it is plain text.
7. Go to `Downloads`, **right-click** `Vega_Install_One_File.bat`, and choose
   **Run as administrator** if the normal double-click does nothing.
8. It asks where to install her (press Enter to accept `C:\Users\You\Vega`),
   unpacks everything, makes the Desktop shortcut, and offers to start her.

### Downloading `Vega-3.5.zip` instead

1. Same page. Find **`Vega-3.5.zip`** in the list.
2. Click it, then click the **download icon** at the top right.
3. In `Downloads`, **right-click the zip and choose Extract All**, then Extract.
   Do not run anything from inside the zip; Windows cannot install from there.
4. Open the extracted folder and double-click **`INSTALL_SOPHIA.bat`**.

### If you cannot find the download button at all

You are probably looking at the **README** (the long page with all this text)
rather than the **file list**. The file list is reached by clicking the
repository name at the top, or by going to
`https://github.com/kartikeyrajput2013-gif/supreme-authority/tree/main`.
The README has no download button; the file list does, on each file's own page.

### What the file does, before you run it

It carries four files inside itself as text, unpacks them with the `certutil`
program that is already part of Windows, keeps a backup as
`assistant-old.html` if you had an older one, and makes a Desktop shortcut with
her icon. It does not go online, does not install a service, does not ask for
administrator rights to write anywhere except the folder you choose, and
nothing is uploaded. If `certutil` is missing it says so and tells you to use
the zip instead. That is the whole installer.

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

## 2h. Putting her on a pendrive (new in 3.3)

Vega is a page and a small Python file. That means she can live on a USB stick and
run on **any Windows computer** you plug it into, without installing anything.

### How to do it

1. Copy the whole folder &mdash; `assistant.html`, `sophia_helper.py`, `Start_Sophia.bat`, `vega.ico` &mdash; onto the pendrive.
2. On any other Windows computer, open the stick and double-click **`Start_Sophia.bat`**.
3. She reads that computer herself and tells you what it is.

### What she works out on each new computer

- Which **Windows version** it is, and the build number
- The **processor** and how many cores it has
- How much **RAM** it has
- Every **drive** and how much space is left on each, including the stick she is running from
- Whether she is on **removable storage** or the computer's own disk
- Whether **Python** is here, which decides what she can do

She says all of this plainly, in her own words:

> **Windows 11 Home** &middot; build 22631 &middot; 64-bit &middot; Intel i5-1135G7 &middot; 8 cores &middot; 8 GB RAM
> I am running from a removable drive (E:). That is fine: my files travel with me, and I adapt to each new computer instead of assuming it is yours.

### If the new computer has no Python

She still starts. She opens websites, plays every game and talks normally. She
cannot open your files or change Windows settings, and she says so instead of
failing silently. Ask her `how do i install python` for the exact steps.

### The honest part

- Her **memory does not travel**. Saved notes, the player card and reminders live in the browser on each computer, because that is where a browser keeps them. Same stick, different machine, fresh memory.
- She does **not** copy or search the other computer's files unless you ask her a file question there.
- Games, chat, facts and websites work the same everywhere. Laptop control depends on Windows and Python, and she tells you which one is missing.

Ask her any of these on a new machine:

```
what computer is this
how much space is left
am i running you from a pendrive
laptop specs
```

---

## 2h-bis. "Pendrive, another computer, and open my app" &mdash; one command (new in 3.4)

3.3 could *read* the new machine. 3.4 does the whole arrival in **one command**:

```
You: i opened you on another computer
```

Everything below happens from that one sentence, in one request to the helper:

```
Vega: This machine: Linux 6.8.0-45-generic, x86_64, 8 cores, 15.5 GB RAM, called college-pc.
      Python 3.12.3 is here, so I can open apps and files on it straight away.
      Storage here:
        / this computer: 96.2 GB free of 238.5 GB
        /media/me/VEGA removable drives: 12.1 GB free of 14.5 GB
      Your app was next to me on this stick, so I opened it: /media/me/VEGA/index.html.
```

### What "configure the specs of that OS" actually means

It is not installation, and she will not pretend it is. It means she **looks at
this machine and changes what she offers you**, in the same way a game changes
its settings when it sees new hardware:

| She finds | So she does |
| --- | --- |
| Windows, macOS or Linux | uses the right way to open things on each; names the one she found |
| Python present | opens apps, your files, folders and settings |
| No Python | says so plainly, and keeps to websites, memory and games |
| A pendrive | keeps her own memory, quests and records on the stick, installs nothing |
| A disk | says so, so you know nothing is leaving that machine |
| `index.html` next to her | opens **your app** on this computer, without you hunting for it |
| No `index.html` | says there is no app of yours to open, instead of opening the wrong thing |

### The words that work

Any of these is the same one command:

```
i opened you on another computer      i put you on a pendrive
put you on a pendrive and opened you on another laptop
i just plugged you in                 plugged you into this pc
another computer                      new laptop
adapt to this computer                set up on this computer
who am i on now                       travel setup
```

### The honest limits of a pendrive

- **Windows, macOS and Linux** are all read correctly. The actions that need
  Windows &mdash; volume, brightness, screenshots, closing apps &mdash; only work on
  Windows, and she says so on the machines where they do not.
- On a **school or office computer** the stick may be read-only, antivirus may
  block a `.bat`, and Python is often not installed. The page itself still opens
  in any browser with nothing installed; only the laptop actions wait for Python.
- **Your memory, quests and records travel with the stick** because they live in
  that browser's storage on that machine. If you use a different browser there,
  she starts fresh on it. Nothing is uploaded, and nothing is synced.
- She **does not install herself** on someone else's computer and leaves no
  program behind. Only the browser's own data for that page remains.

---

## 2i. Games, the way a gamer expects (new in 3.3)

The games are now a small arcade with a player card, not five toys that forget you.

### Your player

Every game feeds one profile: a name, **XP**, a **level**, a **daily streak**, wins,
and a record for each game. It is on the page as a card, and it survives a reload.

| Level | Rank | XP to reach it |
| --- | --- | --- |
| 1 | Newcomer | 0 |
| 3 | Rookie | 250 |
| 6 | Regular | 700 |
| 10 | Veteran | 1,750 |
| 15 | Champion | 3,750 |
| 20 | Legend | 6,250 |

Each level costs a little more than the last: 100, then 150, then 200, and so on.

### What earns XP

| You do | You get |
| --- | --- |
| Turn up and play on a new day | 15 XP, plus 5 more for each day in a row (up to +20) |
| Solve a word scramble | 20 XP, or 35 if you got it first try |
| Win Guess the Number | 35 XP in 3 guesses or fewer, otherwise 20 |
| Win a word chain | 20 XP, plus 2 for every word in the chain |
| Solve a riddle | 30 XP first try, 20 with a hint |
| Finish the story | 20 XP, plus 4 per turn |
| Finish the Daily Challenge | 5 XP, plus 18 per correct answer, plus 35 for a perfect run |

### The daily challenge

Five questions, one sitting, scored out of five. The set is picked from the date,
so **the same day gives the same set** and tomorrow gives a new one. It never
repeats a question inside a run, and it comes from her own notes, not the internet.

```
you> daily challenge
Daily Challenge for 2026-11-10: five questions, one point each.
Question 1 of 5: How many hearts does an octopus have?
you> three
Right. Three. One point. (1 so far)
Question 2 of 5: ...
```

Say `don't know` to move on with no penalty. At the end she gives a verdict and
your XP, and records your best.

### The other upgrades

- **Guess the Number** shows the narrowing range (`Range is now 51 to 100`) and how many guesses are left, so it plays like a real game instead of guesses into the dark.
- **Word Chain** now has an end: she runs out of words and you win, with your chain length scored and recorded.
- **Word Scramble** tells you how many tries are left and never repeats a word in one round.
- **Riddles** keep a session going, and `next riddle` skips one.
- **`play again`** starts the same game again without going through the menu.
- **`stats`**, `records` and `achievements` work at any time, even mid-game.

### Badges

`First Win`, `Three Days Running`, `Level 5`, `Three-Guess Wonder`, `Ten-Word Chain`,
`Riddle Master`, `Word Smith`, `Challenger`, and one more you can find yourself.

<details><summary>If you know the old code</summary>

Type `up up down down left right left right b a` anywhere. It is worth 50 XP and a badge.
It only pays once.

</details>

### Honest limits

- The profile is stored **in the browser on this computer**. Moving her to a pendrive does not move the scores.
- There is no online leaderboard and no account. Nothing is uploaded.
- The Daily Challenge questions come from her built-in notes, so the set is finite and stays the same length each day.

---

## 2i-bis. Combos, quests and prestige (new in 3.4)

3.3 gave you a player card. 3.4 gives you a reason to look at it twice a day.

### Combos: a good run is worth more than a good answer

Three correct answers in a row pays **+5 XP**, five pays **+10**, and every
fourth after eight pays **+15**. A miss ends the run, which is the whole point:
a combo is a thing you can lose. Your best ever is kept, so a lucky run is
never forgotten.

```
You: the answer is a coin
Vega: Combo x3! +5 XP for solving it.
      Yes! The answer is A coin. Well done. +30 XP. Riddles solved: 3.
      Level up! You are level 2 now.
```

### Daily quests: three goals, new every day

Every morning she picks three jobs from a pool of eight, using the date as a
seed so they are the same all day and cannot be re-rolled by reloading the page.
They sit under your player card with a tick box each.

| Quest | What counts | XP |
| --- | --- | --- |
| Play two games today | any two starts | 20 |
| Win one game today | a real win | 25 |
| Beat Guess the Number in 6 tries or fewer | the guess game | 25 |
| Reach a chain of 6 words | the word chain | 20 |
| Solve two riddles | riddles | 20 |
| Solve two scrambles | scrambles | 20 |
| Finish the Daily Challenge | the challenge | 30 |
| Build a combo of 5 | combos | 25 |

Say **"quests"** at any time. She answers even in the middle of the menu.

### Prestige: what happens after Legend

Level 20 is where the ladder currently ends, and a gamer knows that is not an
ending, it is a door. At level 20 say **"prestige"**:

- your XP goes back to zero **on purpose**
- your records, achievements, badges and best combo all stay
- your name gains a star for each prestige, shown on the card as `*1`, `*2`
- your best ever run is remembered and told back to you

Below level 20 she refuses, says exactly how far away it is, and takes nothing.
That is deliberate: a prestige you can buy is not a prestige.

Try: `play a game`, `quests`, `combo`, `prestige`, `stats`.

---

## 2j. The reasoning engine: what she works out herself (new in 3.4, doubled in 3.5)

3.4 added a real solver under her conversation, so a large class of school
questions is answered **on the laptop, with no key, no internet and no waiting**.
The important part is not just the answer, it is the working.

3.5 roughly **doubled the number of things she can work out** and added a second
engine for *why* and *how* questions, which 3.4 answered with a stored fact.

### Algebra

```
You: what is x if 2x + 5 = 17

Vega: Let us solve it properly. There is only one unknown, x, so one answer is enough.
      Step 1: move everything with x to one side and the plain numbers to the other.
      Step 2: divide, and x = 6.
      I checked it by putting 6 back in: both sides come out at 17, so it is right.
```

It handles the linear shapes: `3x - 7 = 14`, `x/4 = 9`, `5x + 2 = 3x + 10`.
It solves them numerically **and then verifies** by substituting the answer back
into both sides; if the two sides disagree it refuses instead of printing a
wrong number.

Quadratics are handled by the real formula, and it tells you how many answers
exist instead of forcing two:

```
x^2 + 5x + 6 = 0                    -> x = -3 and x = -2, both put back and checked
solve x squared minus 4 equals 0    -> x = -2 and x = 2
x squared plus 3x minus 10 equals 0 -> x = -5 and x = 2
x squared minus 6x plus 9 equals 0  -> one answer, x = 3, because the root part is zero
x^2 + 1 = 0                         -> no real answer, the part under the root is negative
```

Two unknowns at once are solved as a pair and both answers are put back in:

```
solve 2x + y = 7 and x - y = 2

x = 3, y = 1. Put both back in: 2x + y gives 7 and x - y gives 2, so both balance.
```

Factorising a quadratic goes the other way, and explains the numbers it chose:

```
factorise x squared plus 5x plus 6
It factorises to (x + 2)(x + 3), because 2 x 3 is 6 and 2 + 3 is 5.
```

### Fractions, ratio and proportion (new in 3.5)

```
what is 3/4 plus 1/8              -> 7/8 (0.875)
what is 5/6 minus 1/3             -> 1/2 (0.5)
what is 2 and 1/2 times 4         -> 5/2 times 4 is 10
what is 7 and 3/4 minus 2 and 1/4 -> 11/2 (5.5)
simplify 18/24                    -> 3/4, because 6 divides both
what is 45 as a fraction of 60    -> 3/4, which is 75%
what is 0.75 as a percentage      -> 75% (multiply by 100)
```

Mixed numbers are read the way people say them &mdash; `2 and 1/2`, `2 1/2` and
`2 and a half` are the same thing. The four rules are done in whole numbers, so
`1/3 + 1/3` is exactly `2/3` and not `0.6666`.

### Percent in both directions, and a real price (new in 3.5)

```
increase 500 by 12%                                -> adds 60, giving 560
decrease 80 by 25%                                 -> takes off 20, giving 60
a shirt costs 1200 and there is 18% off            -> takes off 216, so you pay 984
```

### Speed, proportion and the rest of the word problems (new in 3.5)

| You ask | She works out |
| --- | --- |
| `a train travels 60 km in 1.5 hours, what is the speed` | `distance divided by time: 60 / 1.5 = 40 km per hour` |
| `if 5 pens cost 75, what does 1 cost` | `75 divided by 5 is 15 each` |
| `if a recipe for 4 people uses 200g rice, how much for 6` | `for one it is 50g, so for 6 you need 300g` |
| `what is the area of a circle with diameter 10` | `the radius is half of 10, so 5; pi x 5 x 5 = 78.54` |
| `what is the hypotenuse of a 3 4 triangle` | `3 squared plus 4 squared is 25, and the root of 25 is 5` |
| `what is the average of 10 20 and 30` | `the total is 60 and there are 3, so 20` |

### Why and how questions get reasoning instead of a fact (new in 3.5)

In 3.4, `why is the sky blue` was answered by picking a stored fact about
light. 3.5 has eleven written explanations that argue the answer in numbered
steps, and it chooses between them by the most specific match, so the third law
of motion no longer returns the first:

```
why is the sky blue
Here it is in steps, so you can follow the reasoning.
  1. Sunlight looks white but it is every colour mixed together.
  2. Air is full of molecules much smaller than the wavelength of light.
  3. ...
```

The eleven are: blue sky, photosynthesis, earthquakes, seasons, wi-fi and radio,
dreams, weather against climate, rain, sound and thunder, the phases of the Moon,
why ice floats, and Newton's three laws.

### The rest of school: trigonometry, logs, combinations, matrices, derivatives

```
sin 30                      -> 0.5 (exactly 1/2)
tan 90                      -> not defined, and why
log 100                     -> 2, because 10 to the power 2 is 100
log base 2 of 8             -> 3, because 2 to the power 3 is 8
5c2  /  5 choose 2          -> 10
5p2                         -> 20
determinant of 1 2 3 4      -> -2
dot product of 1 2 3 and 4 5 6 -> 32, with the working and the angle
derivative of 3x^2 + 5x + 7 -> 6x + 5
derivative of 7             -> 0, a plain number does not change
```

The trig values come from a table written by hand, so they can be checked
against a textbook. Anything outside the table is refused rather than rounded
into a plausible-looking answer.

### Geometry

| You ask | She says |
| --- | --- |
| `area of a circle with radius 5` | `Working out a circle with radius 5. The formula is pi x 5 x 5, which gives 78.54.` |
| `area of a triangle with base 10 and height 6` | `... the formula is half of 10 x 6, which gives 30.` |
| `volume of a cube with side 3` | `... 3 x 3 x 3 ... 27.` |
| `volume of a sphere with radius 4` | `... (4/3) x pi x 4^3 ...` |
| `area of a rectangle 8 by 5` | `... 8 x 5 ... 40.` |

Circles, spheres, cylinders, squares, rectangles, triangles and boxes. The
formula is printed with the numbers already in it, so it doubles as a check.

### Units, with one table instead of a pile of special cases

Length (mm, cm, m, km, inches, feet, yards, miles, nautical miles), mass
(mg, g, kg, tonnes, pounds, ounces), volume (ml, litres, cups, gallons), time
(seconds to weeks) and data (bytes to terabytes).

```
how many grams in 2.5 kg        -> 2.5 kilograms is 2,500 grams.
what is 12 GB in MB             -> 12 gigabytes is 12,288 megabytes.
how many minutes in 3 hours     -> 3 hours is 180 minutes.
convert 5 km to miles           -> 5 kilometres is 3.1069 miles.
```

A conversion between two different kinds of thing is refused: mass is never
turned into length just because both look like a word she knows.

### Percentages, money and number facts

```
what is 15% of 240                          -> 15% of 240 is 36.
20 is what percent of 80                    -> 20 is 25% of 80.
simple interest on 5000 at 8% for 3 years   -> ... is 1,200, so you pay back 6,200.
compound interest on 5000 at 8% for 3 years -> ... so the total is 6,298.56.
if i buy 3 apples at 20 each                -> 3 at 20 each is 60.
what is 7 factorial                         -> 7 factorial is 5,040.
gcd of 24 and 36                            -> The GCD of 24 and 36 is 12.
is 97 prime                                 -> 97 is prime. Nothing divides it but 1 and itself.
```

Numbers come back grouped (`12,288`, not `12288`), because the point of an
answer is that a person can read it.

### Nine new knowledge packs

Her own notes now cover **cells and life**, **gravity and motion**,
**democracy and government**, **ecosystems and food chains**,
**acids and bases**, **evolution**, **inflation and interest**,
**prime numbers**, and **how memory and study work** &mdash; each with facts and a
quiz, so `quiz me on cells` works. That is 38 topics in total, all offline.

A relevance bug went with it: asking about *gravity* used to return a fact
about solids, because the old matcher picked whichever topic name was longest
rather than whichever matched best. She now answers the subject you actually
named, and a test holds it there.

### The honest boundary

This engine is **rule-based, not a language model**. It is excellent inside its
shapes and blind outside them. Ask it for the integral of x squared and it will
not invent one; it will offer the web search or your own connected AI model.
That is the correct behaviour: a wrong confident answer is worse than an honest
"I cannot work that out".

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
**Settings -> AI key**, explained next. That path is optional; everything above
works with no key at all.

---

## 3a-bis. Putting real ChatGPT inside the window (new in 3.4)

There are two different things and people mix them up constantly:

| Thing | What it looks like | Where it comes from |
| --- | --- | --- |
| The **address** | `https://api.openai.com/v1` | nobody gives this to you; it is the same for everyone |
| The **key** | `sk-proj-Ab3x...` about 50-160 characters | platform.openai.com, your own account |

`https://api.openai.com/v1/responses` is an **address**, not a key. Pasting an
address into the key box cannot work, no matter how many times you try, because
there is no secret in it. Vega now says exactly that in the settings panel
instead of failing quietly.

To get a real key:

1. Open `platform.openai.com`, sign in, and add a few dollars of credit under
   **Billing**. A new account with zero credit gets a valid key that still
   refuses every question.
2. Open **API keys -> Create new secret key**, name it `vega`, and press Create.
3. Copy it immediately. It starts with `sk-` and is shown **once**; after you
   close that box nobody, including OpenAI's support, can show it again.
4. In Vega press **Settings**, choose **OpenAI (ChatGPT)**, paste the key,
   leave the address alone, and press **Test connection**.

What the test really does, in three steps, and says out loud:

```
Step 1 of 3: asking OpenAI which models this key can use...
Step 2 of 3: asking gpt-5 a one-line question...
Step 3 of 3: connected. The key is valid and the model answered:
"I am connected to Vega and ready." Using gpt-5.
```

If step 1 fails with **401**, the key itself is wrong, deleted, or was copied
with a character missing. If it fails with **429**, the key is real but the
account has no credit or is going too fast. If it never reaches OpenAI at all,
the message says that plainly: *that is a network problem, not a key problem*,
and lists the four usual causes - offline, a blocked host or firewall, a school
Wi-Fi, or a browser extension.

### Why there are two endpoints

OpenAI has an older way to ask, `/v1/chat/completions`, and a newer one,
`/v1/responses`, which is what the newest models such as `gpt-5` expect. Vega
speaks both:

- **Automatic** (default) picks `/v1/responses` for `gpt-5`-family models and
  for anything with `-responses-` in the name, and otherwise tries Responses
  first and quietly falls back to chat completions.
- **Responses API** or **Chat completions** pins one, for people running a
  clone or a local server that only speaks one of them.

Both use the same key, and both are billed the same way. The reply is read from
`output_text`, from `output[].content[].text`, or from the old
`choices[].message.content`, so whichever shape comes back she can read it.

Why this matters for you: a chatbot on a website forgets you when the tab
closes, and it cannot see your files. This one sits in her memory, so "explain
that again, simpler" still knows what *that* was, and questions about your
files are answered from your own machine before any request leaves it.

**The honest limits.** A key is a spending credential. Anyone holding it can
spend your credit, so keep it on your own machine and never paste it into a
chat, a screenshot or a school computer. Vega stores it in your browser's local
storage on your own laptop, in plain text - protected by your Windows login and
nothing more. Do not put a key on a shared or borrowed machine. And with no
key, everything else in Vega still works: the built-in brain, games, files,
apps, the pendrive mode. The key only adds a smarter answer to open questions.

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

1. Download **`Vega-3.5.zip`** from GitHub and unzip it.
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
| `tests/brain.test.js` | 106 tests for what Vega understands. `node --test tests/brain.test.js` |
| `tests/page.test.mjs` | 4 tests that load the real `assistant.html` and type into the real box. Needs `npm i jsdom`; skips politely without it. |
| `tests/test_helper.py` | 57 tests for the helper, the file search, the installer and the server. `python3 -m unittest discover tests` |

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

**The full list, in a table, is in [`LIMITATIONS.md`](LIMITATIONS.md)** — the
disadvantages ordered from lowest to supreme, with the root cause last and how
each one could be fixed. It is written to be read by you, not to make the
project look good.

---

Made for Kartikey Raj. If you want a new command, just tell me what you would
type, and I will add it.
