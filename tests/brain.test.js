// Sophia's brain: what does she understand and what does she reply?
// Run with:  node --test tests/brain.test.js
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const html = fs.readFileSync(path.join(__dirname, '..', 'assistant.html'), 'utf8');
const brainSrc = html.match(/<script id="sophia-brain">([\s\S]*?)<\/script>/)[1];
// The brain block must not touch the page: this fake window proves it.
const fakeWindow = {};
const Brain = new Function('window', brainSrc + '\nreturn SophiaBrain;')(fakeWindow);

function stepsOf(text, ctx) {
  return Brain.parse(text, ctx || {}).steps;
}
function only(text, ctx) {
  const steps = stepsOf(text, ctx);
  assert.strictEqual(steps.length, 1, 'expected one step for: ' + text + ' but got ' + JSON.stringify(steps.map(s => s.intent)));
  return steps[0];
}

test('the brain block never touches the page', () => {
  assert.ok(Brain && typeof Brain.parse === 'function');
  assert.strictEqual(fakeWindow.SophiaBrain, Brain);
});

test('opens websites, including several at once', () => {
  assert.deepStrictEqual(only('open youtube').targets.map(t => t.id), ['youtube']);
  assert.deepStrictEqual(only('Open YouTube please').targets.map(t => t.id), ['youtube']);
  assert.deepStrictEqual(only('hey sophia open gmail').targets.map(t => t.id), ['gmail']);
  assert.deepStrictEqual(only('open chrome and notepad').targets.map(t => t.id), ['chrome', 'notepad']);
  assert.deepStrictEqual(only('open gmail and github').targets.map(t => t.id), ['gmail', 'github']);
  assert.deepStrictEqual(only('launch notepad').targets.map(t => t.id), ['notepad']);
});

test('knows windows settings, folders and links typed by the user', () => {
  const wifi = only('open wifi settings');
  assert.strictEqual(wifi.targets[0].kind, 'setting');
  assert.strictEqual(wifi.targets[0].uri, 'ms-settings:network-wifi');
  assert.strictEqual(only('open my downloads folder').targets[0].id, 'downloads');
  assert.strictEqual(only('open recycle bin').targets[0].id, 'recyclebin');
  const site = only('open github.com').targets[0];
  assert.strictEqual(site.kind, 'url');
  assert.strictEqual(site.url, 'https://github.com');
});

test('finds apps even when the name is misspelt', () => {
  assert.strictEqual(only('open notpad').targets[0].id, 'notepad');
  assert.strictEqual(only('open youtub').targets[0].id, 'youtube');
  // "ram" inside "instagram" must not turn into a laptop specs question
  assert.strictEqual(only('open instagram').targets[0].id, 'instagram');
});

test('the delivery app is always one command away', () => {
  assert.strictEqual(only('open delivery app').targets[0].kind, 'delivery');
  assert.strictEqual(only('open railpure').targets[0].kind, 'delivery');
  assert.strictEqual(only('order food').targets[0].kind, 'delivery');
  assert.strictEqual(only('open my app').targets[0].href, 'index.html');
});

test('searches the right website', () => {
  assert.deepStrictEqual([only('search youtube for lofi music').site, only('search youtube for lofi music').query], ['youtube', 'lofi music']);
  assert.strictEqual(only('google the capital of france').site, 'google');
  assert.strictEqual(only('search for python tutorials on youtube').site, 'youtube');
  assert.strictEqual(only('search gmail for exam').site, 'gmail');
  const play = only('play arijit singh songs');
  assert.strictEqual(play.site, 'youtube');
  assert.ok(play.play);
  // "and" inside a search must not split the sentence
  assert.strictEqual(only('search for tom and jerry').query, 'tom and jerry');
});

test('opening a site and searching it becomes one action', () => {
  const s = only('open youtube and search for cats');
  assert.strictEqual(s.intent, 'search');
  assert.strictEqual(s.site, 'youtube');
  assert.strictEqual(s.query, 'cats');
});

test('two different commands in one sentence still both run', () => {
  const steps = stepsOf('open youtube then open gmail');
  assert.deepStrictEqual(steps.map(s => s.intent), ['open', 'open']);
  assert.deepStrictEqual(steps.map(s => s.targets[0].id), ['youtube', 'gmail']);
});

test('volume, brightness and music keys', () => {
  assert.deepStrictEqual(only('volume up').dir, 'up');
  assert.deepStrictEqual(only('turn it down').dir, 'down');
  assert.deepStrictEqual(only('set volume to 40').amount, 40);
  assert.deepStrictEqual(only('volume 150').amount, 100);
  assert.strictEqual(only('mute').dir, 'mute');
  assert.strictEqual(only('unmute').dir, 'unmute');
  assert.strictEqual(only('brightness 10').amount, 10);
  assert.strictEqual(only('dim the screen').dir, 'down');
  assert.strictEqual(only('next song').key, 'next');
  assert.strictEqual(only('pause the music').key, 'playpause');
});

test('laptop actions are understood but never run by accident', () => {
  assert.strictEqual(only('shut down the laptop').intent, 'shutdown');
  assert.strictEqual(only('restart').intent, 'restart');
  assert.strictEqual(only('lock laptop').intent, 'lock');
  assert.strictEqual(only('take a screenshot').intent, 'screenshot');
  assert.strictEqual(only('cancel shutdown').intent, 'power.cancel');
  assert.strictEqual(only('turn off bluetooth').intent, 'toggle');
  assert.strictEqual(only('turn off bluetooth').on, false);
});

test('time, date, day, battery and specs', () => {
  assert.strictEqual(only('what time is it').intent, 'time');
  assert.strictEqual(only('what is the date').intent, 'date');
  assert.strictEqual(only('what day is today').intent, 'day');
  assert.strictEqual(only('battery').intent, 'battery');
  assert.strictEqual(only('how much ram').intent, 'specs');
  assert.strictEqual(only('my laptop specs').intent, 'specs');
});

test('maths is worked out safely, without eval', () => {
  assert.strictEqual(only('what is 25 times 4').value, 100);
  assert.strictEqual(only('calculate 15% of 250').value, 37.5);
  assert.strictEqual(only('sqrt of 144').value, 12);
  assert.strictEqual(only('7 * 8 + 1').value, 57);
  assert.strictEqual(only('2 to the power of 10').value, 1024);
  assert.strictEqual(only('what is 100/0').error, 'div0');
  assert.strictEqual(Brain.tryMath('open youtube'), null);
});

test('remembers things and answers questions about them', async () => {
  let saved = null;
  const env = {
    store: { load: () => saved, save: (m) => { saved = m; } },
    now: () => new Date('2026-11-10T09:30:00'),
    random: () => 0.5,
    mode: () => 'preview',
    helper: async () => ({ ok: true, preview: true })
  };
  const sophia = Brain.create(env);
  let r = await sophia.handle('remember that my bag is in the cupboard');
  assert.match(r.text, /remember/i);
  r = await sophia.handle('where is my bag');
  assert.match(r.text, /cupboard/);
  r = await sophia.handle('my name is kartikey');
  assert.match(r.text, /Kartikey/);
  r = await sophia.handle('what is my name');
  assert.match(r.text, /Kartikey/);
  r = await sophia.handle('what is my favourite colour');
  assert.match(r.text, /do not know/i);
  r = await sophia.handle('my favourite colour is blue');
  r = await sophia.handle('what is my favourite colour');
  assert.match(r.text, /blue/i);
  r = await sophia.handle('what do you remember');
  assert.match(r.text, /bag/i);
  assert.match(r.text, /colour/i);
  r = await sophia.handle('forget my bag');
  r = await sophia.handle('where is my bag');
  assert.match(r.text, /do not know/i);
  // memory survives a restart because it was saved
  const again = Brain.create(env);
  r = await again.handle('what is my name');
  assert.match(r.text, /Kartikey/);
});

test('taught shortcuts run when the phrase is typed', async () => {
  let saved = null;
  const sophia = Brain.create({
    store: { load: () => saved, save: (m) => { saved = m; } },
    mode: () => 'preview', helper: async () => ({ ok: true, preview: true })
  });
  let r = await sophia.handle('when I say study time open youtube');
  assert.match(r.text, /study time/);
  r = await sophia.handle('study time');
  assert.match(r.text, /YouTube/i);
  r = await sophia.handle('what are my shortcuts');
  assert.match(r.text, /study time/);
  r = await sophia.handle('forget shortcut study time');
  r = await sophia.handle('study time');
  assert.doesNotMatch(r.text, /YouTube/i);
});

test('asks before closing apps, and needs laptop mode', async () => {
  const calls = [];
  const sophia = Brain.create({
    store: { load: () => null, save: () => {} },
    mode: () => 'browser',
    helper: async (a, p) => { calls.push([a, p]); return { ok: true }; }
  });
  let r = await sophia.handle('close chrome');
  assert.match(r.text, /Start_Sophia\.bat/);
  assert.strictEqual(calls.length, 0, 'nothing may be sent to the helper in browser mode');
  r = await sophia.handle('open youtube');
  assert.match(r.text, /browser/i);
});

test('laptop mode sends the right actions to the helper', async () => {
  const calls = [];
  const sophia = Brain.create({
    store: { load: () => null, save: () => {} },
    mode: () => 'laptop',
    hostBrowser: 'chrome',
    helper: async (a, p) => {
      calls.push([a, p]);
      if (a === 'open_app') return { ok: true };
      if (a === 'volume') return { ok: true, level: 40 };
      return { ok: true };
    }
  });
  let r = await sophia.handle('open notepad');
  assert.match(r.text, /Notepad/);
  assert.deepStrictEqual(calls.pop(), ['open_app', { name: 'notepad' }]);
  r = await sophia.handle('volume up');
  assert.deepStrictEqual(calls.pop(), ['volume', { dir: 'up', amount: null }]);
  r = await sophia.handle('set volume to 40');
  assert.match(r.text, /40%/);
  calls.length = 0;
  r = await sophia.handle('shut down the laptop');
  assert.match(r.text, /confirm/i);
  assert.strictEqual(calls.length, 0, 'shutdown must wait for yes');
  r = await sophia.handle('yes');
  assert.strictEqual(calls.pop()[0], 'shutdown');
});

test('says yes and no answers correctly, and forgets them afterwards', async () => {
  const calls = [];
  const sophia = Brain.create({
    store: { load: () => null, save: () => {} },
    mode: () => 'laptop',
    helper: async (a) => { calls.push(a); return { ok: true }; }
  });
  await sophia.handle('shut down the laptop');
  let r = await sophia.handle('no');
  assert.match(r.text, /did not do anything|Okay/i);
  assert.strictEqual(calls.length, 0);
  r = await sophia.handle('yes');
  assert.match(r.text, /yes to what/i, 'a bare yes with nothing pending must not do anything');
});

test('talks like a person, and is honest about being an AI', async () => {
  const sophia = Brain.create({ store: { load: () => null, save: () => {} }, mode: () => 'browser', random: () => 0 });
  let r = await sophia.handle('hi');
  assert.match(r.text, /morning|afternoon|evening|hello|hi/i);
  r = await sophia.handle('are you a human');
  assert.match(r.text, /not a human/i);
  r = await sophia.handle('i am sad');
  assert.match(r.text, /sorry|tell me/i);
  r = await sophia.handle('tell me a joke');
  assert.ok(r.text.length > 10);
  r = await sophia.handle('what can you do');
  assert.match(r.text, /open youtube/i);
});

test('a child in danger is given real phone numbers, not a chat', async () => {
  const sophia = Brain.create({ store: { load: () => null, save: () => {} }, mode: () => 'browser' });
  const r = await sophia.handle('I want to die');
  assert.match(r.text, /14416/);
  assert.match(r.text, /1098/);
  assert.match(r.text, /112/);
});

test('hindi-english mix works', async () => {
  assert.strictEqual(only('youtube kholo').targets[0].id, 'youtube');
  assert.strictEqual(only('instagram kholo').targets[0].id, 'instagram');
  assert.strictEqual(only('volume badhao').dir, 'up');
  assert.strictEqual(only('awaaz kam karo').dir, 'down');
  assert.strictEqual(only('time kya hai').intent, 'time');
  assert.strictEqual(only('tum kaun ho').intent, 'talk.whoareyou');
  assert.strictEqual(only('mujhe bhookh lagi hai').mood, 'hunger');
  assert.strictEqual(only('shukriya').intent, 'talk.thanks');
  assert.strictEqual(only('screenshot lo').intent, 'screenshot');
});

test('offline knowledge answers school questions, with more on request', async () => {
  const sophia = Brain.create({ store: { load: () => null, save: () => {} }, mode: () => 'browser' });
  const r = await sophia.handle('what is photosynthesis');
  assert.match(r.text, /photosynthesis|chlorophyll|oxygen|sunlight/i);
  assert.match(r.text, /quiz me/i);
  const more = await sophia.handle('more about photosynthesis');
  assert.ok(more.text.length > 20, 'another fact about the same topic');
  assert.notStrictEqual(more.text, r.text);
});

test('unknown questions go to Wikipedia, then offer a Google search', async () => {
  // a topic that is not in the offline pack must use the lookup
  let wikiCalls = [];
  const sophia = Brain.create({
    store: { load: () => null, save: () => {} },
    mode: () => 'browser',
    wiki: async (q) => { wikiCalls.push(q); return { title: 'Photosynthesis', extract: 'Plants make food from sunlight.', url: 'https://en.wikipedia.org/wiki/Photosynthesis' }; }
  });
  const r = await sophia.handle('who was the rani of jhansi');
  assert.match(r.text, /Plants make food/);
  assert.strictEqual(wikiCalls[0], 'the rani of jhansi');
  assert.ok(r.links.length === 1);
  assert.match(r.links[0].url, /wikipedia/);
});

test('a connected AI model can answer and run safe commands, but not power actions', async () => {
  const calls = [];
  const answers = [];
  const sophia = Brain.create({
    store: { load: () => null, save: () => {} },
    mode: () => 'laptop',
    helper: async (a, p) => { calls.push(a); return { ok: true }; },
    ai: {
      enabled: () => true,
      chat: async (messages) => {
        answers.push(messages[messages.length - 1].content);
        if (/newton/i.test(messages[messages.length - 1].content)) return "Newton's third law says every action has an equal and opposite reaction.";
        return 'Opening that for you.\nDO: open youtube\nDO: shut down';
      }
    }
  });
  let r = await sophia.handle('who is newton');
  assert.match(r.text, /equal and opposite/);
  r = await sophia.handle('do the thing for me');
  assert.match(r.text, /Opening that for you/);
  assert.strictEqual(calls.length, 1, 'exactly one safe command may reach the laptop');
  assert.ok(['open_url', 'open_app'].includes(calls[0]));
  assert.ok(!calls.includes('shutdown'), 'the model may never shut the laptop down');
});

test('small local questions are never sent to the AI model', async () => {
  let used = 0;
  const sophia = Brain.create({
    store: { load: () => null, save: () => {} },
    mode: () => 'browser',
    ai: { enabled: () => true, chat: async () => { used++; return 'should not be used'; } }
  });
  await sophia.handle('what time is it');
  await sophia.handle('what is 2+2');
  await sophia.handle('volume up');
  await sophia.handle('hi');
  assert.strictEqual(used, 0);
});

test('javascript in a message is treated as text, never as code', async () => {
  const sophia = Brain.create({ store: { load: () => null, save: () => {} }, mode: () => 'browser' });
  const r = await sophia.handle('<img src=x onerror=alert(1)>');
  assert.ok(typeof r.text === 'string', 'she answers with text, never with markup objects');
  assert.strictEqual(only('<img src=x onerror=alert(1)>').intent, 'unknown');
});

test('a bare "sophia" wakes her up, and a leading name is ignored', () => {
  assert.strictEqual(only('sophia').intent, 'talk.greet');
  assert.strictEqual(only('hey sophia').intent, 'talk.greet');
  assert.strictEqual(only('sophia what time is it').intent, 'time');
});

test('she never claims to be human or to have a body', async () => {
  const sophia = Brain.create({ store: { load: () => null, save: () => {} }, mode: () => 'browser' });
  for (const q of ['are you real', 'do you have feelings', 'i love you']) {
    const r = await sophia.handle(q);
    assert.match(r.text, /AI|not a human|kind of you/i, q);
  }
});

test('the catalogue has no duplicate names pointing at different things', () => {
  const c = Brain.catalog;
  const seen = new Map();
  const lists = [c.SITES, c.APPS, c.FOLDERS, [c.DELIVERY]];
  for (const list of lists) {
    for (const entry of list) {
      for (const name of entry.names) {
        assert.ok(!seen.has(name), 'duplicate name: ' + name);
        seen.set(name, entry.id);
      }
    }
  }
  // every search site has a {q} placeholder and an https link
  for (const site of c.SITES) {
    if (site.search) assert.match(site.search, /\{q\}/, site.id);
    assert.match(site.url, /^https:\/\//, site.id);
  }
  // the AI sites this version adds are ordinary sites: a real address, no second-class handling
  for (const id of ['chatgpt', 'gemini', 'grok', 'antigravity', 'claude']) {
    const site = c.SITES.find((x) => x.id === id);
    assert.ok(site, 'missing AI site: ' + id);
    assert.match(site.url, /^https:\/\//, id);
  }
});

/* ---------------------------------------------- feelings and knowledge */

test('every feeling family is recognised', () => {
  const cases = {
    'i am sad': 'sadness',
    'i feel lonely': 'loneliness',
    'i am so stressed about my exam': 'anxiety',
    'i am angry at my friend': 'anger',
    'i am tired': 'tiredness',
    'i am bored': 'boredom',
    'i have a headache': 'illness',
    'i cannot sleep': 'sleep',
    'i am hungry': 'hunger',
    'i miss my grandmother': 'grief',
    'i feel like a failure': 'shame',
    'my parents are fighting': 'family',
    'i am happy today': 'happy',
    'i feel much better now': 'hope',
    'i am fine': 'fine'
  };
  for (const [phrase, mood] of Object.entries(cases)) {
    const step = only(phrase);
    assert.strictEqual(step.intent, 'talk.feeling', phrase);
    assert.strictEqual(step.mood, mood, phrase + ' -> ' + JSON.stringify(step));
  }
});

test('feelings are not read out of commands', () => {
  assert.strictEqual(only('play sad songs').intent, 'search');
  assert.strictEqual(only('search youtube for sad songs').intent, 'search');
  assert.strictEqual(only('open youtube').intent, 'open');
  const two = stepsOf('open youtube, i am bored').map(s => s.intent);
  assert.deepStrictEqual(two, ['open', 'talk.feeling']);
});

test('crisis and safety always win over small talk', () => {
  assert.strictEqual(only('i want to die').intent, 'talk.crisis');
  assert.strictEqual(only('i feel like ending it all').intent, 'talk.crisis');
  assert.strictEqual(only('i want to disappear').intent, 'talk.crisis');
  assert.strictEqual(only('my brother hits me').intent, 'talk.safety');
  assert.strictEqual(only('my uncle touched me').intent, 'talk.safety');
});

test('crisis replies give a real helpline and a real adult', async () => {
  const sophia = Brain.create({ store: { load: () => null, save: () => {} }, mode: () => 'browser' });
  const r = await sophia.handle('i want to die');
  assert.match(r.text, /14416|1098/);
  assert.match(r.text, /adult|parent/i);
  assert.match(r.text, /112/);
});

test('a feeling reply is short, kind, and asks at most one question', async () => {
  const sophia = Brain.create({ store: { load: () => null, save: () => {} }, mode: () => 'browser' });
  const r = await sophia.handle('i am sad');
  assert.ok(r.text.length < 300, 'not a wall of text');
  assert.ok((r.text.match(/\?/g) || []).length <= 2, 'not an interrogation');
  assert.match(r.text, /here|sorry|tell/i);
});

test('moods are remembered and can be summarised and cleared', async () => {
  const store = { data: null, load() { return this.data; }, save(v) { this.data = v; } };
  const s1 = Brain.create({ store, mode: () => 'browser' });
  await s1.handle('i am sad');
  await s1.handle('i am happy today');
  assert.ok(s1.memory().moods.length >= 2, 'mood history saved');
  const summary = await s1.handle('how am i feeling');
  assert.strictEqual(summary.text.length > 0, true);
  await s1.handle('forget my feelings');
  assert.strictEqual(s1.memory().moods.length, 0);
});

test('the knowledge pack is big, unique, and well formed', () => {
  const K = Brain.catalog.KNOWLEDGE;
  assert.ok(K.length >= 30, 'at least 30 topics, got ' + K.length);
  const names = new Set();
  let facts = 0;
  let quiz = 0;
  for (const topic of K) {
    assert.ok(topic.label && topic.facts.length >= 4 && topic.quiz.length >= 2, topic.id);
    for (const n of topic.names) {
      assert.ok(!names.has(n), 'duplicate topic name: ' + n);
      names.add(n);
    }
    for (const f of topic.facts) { assert.ok(f.length > 20, topic.id + ': ' + f); facts++; }
    for (const q of topic.quiz) { assert.ok(q.q && q.a, topic.id); quiz++; }
  }
  assert.ok(facts >= 150, 'facts: ' + facts);
  assert.ok(quiz >= 80, 'quiz questions: ' + quiz);
  assert.ok(Brain.catalog.QUICK_FACTS.length >= 50);
});

test('"tell me about X" answers offline and says where it came from', async () => {
  const sophia = Brain.create({ store: { load: () => null, save: () => {} }, mode: () => 'browser' });
  for (const ask of ['tell me about bhagat singh', 'what is climate change', 'tell me about the ozone layer', 'who is subhas chandra bose']) {
    const r = await sophia.handle(ask);
    assert.match(r.text, /one thing I know|Here is/, ask);
    assert.doesNotMatch(r.text, /could not find/i, ask);
  }
});

test('a quiz round runs five questions and keeps score', async () => {
  const store = { data: null, load() { return this.data; }, save(v) { this.data = v; } };
  const sophia = Brain.create({ store, mode: () => 'browser' });
  const start = await sophia.handle('quiz me on space');
  assert.match(start.text, /Question 1 of/);
  const total = Number(start.text.match(/Question 1 of (\d+)/)[1]);
  for (let i = 1; i < total; i++) {
    const r = await sophia.handle('i do not know');
    assert.match(r.text, /Question|That is|Final score|over/i);
  }
  const done = await sophia.handle('i do not know');
  assert.match(done.text, /score|You got|out of/i);
});

test('games, riddles and capitals work', async () => {
  const sophia = Brain.create({ store: { load: () => null, save: () => {} }, mode: () => 'browser' });
  assert.match((await sophia.handle('play a game')).text, /guess|chain|game/i);
  assert.match((await sophia.handle('tell me a riddle')).text.length > 20 ? 'ok' : '', /ok/);
  assert.match((await sophia.handle('capital of australia')).text, /Canberra/);
  assert.match((await sophia.handle('convert 10 km to miles')).text, /6\.2/);
  assert.match((await sophia.handle('what is the average of 12 18 25')).text, /18\.3/);
  assert.match((await sophia.handle('average of 12, 18 and 25')).text, /18\.3/);
});

test('asking an AI opens its own page with the question already in it', async () => {
  const opened = [];
  const asked = [];
  const sophia = Brain.create({
    store: { load: () => null, save: () => {} },
    mode: () => 'browser',
    openUrl: async (url) => { opened.push(url); return { ok: true }; },
    copy: (t) => asked.push(t),
    now: () => new Date('2026-11-10T09:30:00')
  });
  const a = await sophia.handle('ask chatgpt how do rockets work');
  assert.match(a.text, /ChatGPT/i);
  assert.ok(opened.some((u) => u === 'https://chatgpt.com/?q=how%20do%20rockets%20work'), opened.join(' '));

  const b = await sophia.handle('ask grok why is the sky blue');
  assert.ok(opened.some((u) => /^https:\/\/grok\.com\/\?q=why/.test(u)), opened.join(' '));
  assert.match(b.text, /Grok/i);

  const c = await sophia.handle('open antigravity');
  assert.ok(opened.some((u) => /antigravity/.test(u)), opened.join(' '));
  assert.strictEqual(c.text.length > 0, true);

  // Gemini has no ask-address, so she copies the question and says so plainly
  const d = await sophia.handle('ask gemini to explain photosynthesis');
  assert.match(d.text, /Ctrl \+ V/);
  assert.deepStrictEqual(asked, ['explain photosynthesis']);
});

test('the new games keep playing when you just type your turn', async () => {
  const env = { store: { load: () => null, save: () => {} }, mode: () => 'browser', random: () => 0.42, now: () => new Date('2026-11-10T10:00:00') };
  const sophia = Brain.create(env);

  const menu = await sophia.handle('play a game');
  assert.match(menu.text, /story/i);
  assert.match(menu.text, /scramble/i);

  // story game: my sentence is taken, she answers with one of hers
  await sophia.handle('4');
  const turn = await sophia.handle('I heard a knock at the door');
  assert.match(turn.text, /Your turn|story/i);
  const told = await sophia.handle('end story');
  assert.match(told.text, /Here is our story/);
  assert.match(told.text, /I heard a knock at the door/);

  // scramble: a hint names the first letter and the answer moves the game on
  await sophia.handle('play a game');
  const start = await sophia.handle('5');
  assert.match(start.text, /Unscramble/);
  const hint = await sophia.handle('hint');
  assert.match(hint.text, /starts with/);
  await sophia.handle('stop the game');

  // guess the number: free typing is understood as a guess
  await sophia.handle('play a game');
  await sophia.handle('1');
  const guess = await sophia.handle('50');
  assert.match(guess.text, /higher|lower|Yes|close/i);
  const stopped = await sophia.handle('stop game');
  assert.match(stopped.text, /stopped/i);
});

test('she calls herself Nova, and still answers to Sophia', async () => {
  const sophia = Brain.create({ store: { load: () => null, save: () => {} }, mode: () => 'browser' });
  const who = await sophia.handle('who are you');
  assert.match(who.text, /Nova/);
  assert.ok(!/\bSophia\b/.test(who.text), who.text);
  const old = await sophia.handle('hey sophia');
  assert.ok(old.text.length > 0);
});

/* ------------------------------------------------ caring, security, privacy */

test('a heavy sentence is met with care, never with a Google search', async () => {
  const sophia = Brain.create({ store: { load: () => null, save: () => {} }, mode: () => 'browser', now: () => new Date('2026-11-10T23:30:00') });
  for (const q of ['nothing matters anymore', 'i have not slept in three days', 'i let everyone down again']) {
    const r = await sophia.handle(q);
    assert.ok(!/search Google/i.test(r.text), q + ' -> ' + r.text);
    assert.ok(r.text.length > 30, q);
  }
});

test('the questions people ask at night get a real answer', async () => {
  const sophia = Brain.create({ store: { load: () => null, save: () => {} }, mode: () => 'browser', now: () => new Date('2026-11-10T22:00:00') });
  const cases = {
    'why do i feel like this': /more than one cause|cannot see inside your head/i,
    'do you care about me': /program|not a person|cannot love/i,
    'am i a burden': /burden|worthless|hard time/i,
    'i cant sleep': /breathe|brain|thought|awake/i,
    'nobody cares about me': /here right now|not invisible/i
  };
  for (const [q, re] of Object.entries(cases)) {
    const r = await sophia.handle(q);
    assert.match(r.text, re, q + ' -> ' + r.text);
    assert.ok(!/search Google/i.test(r.text), q);
  }
});

test('the caring layer never answers for a command or a game', async () => {
  const opened = [];
  const sophia = Brain.create({
    store: { load: () => null, save: () => {} },
    mode: () => 'browser',
    now: () => new Date('2026-11-10T22:00:00'),
    openUrl: async (u) => { opened.push(u); return { ok: true }; }
  });
  const open = await sophia.handle('open youtube');
  assert.match(open.text, /YouTube/);
  assert.ok(opened.some((u) => /youtube/i.test(u)));

  const menu = await sophia.handle('play a game');
  assert.match(menu.text, /Guess the number/);

  const maths = await sophia.handle('what is 25 times 4');
  assert.match(maths.text, /\b100\b/);

  const fact = await sophia.handle('tell me a fact about space');
  assert.ok(!/more than one cause/i.test(fact.text));
});

test('she stays honest about being a program when asked about caring', async () => {
  const sophia = Brain.create({ store: { load: () => null, save: () => {} }, mode: () => 'browser' });
  const r = await sophia.handle('do you love me');
  assert.match(r.text, /not a person|program|cannot love|will not pretend/i);
});

test('the security panel text never claims she can read mail or accounts', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'assistant.html'), 'utf8');
  const panel = html.slice(html.indexOf('id="infoDrawer"'), html.indexOf('id="toast"'));
  assert.ok(panel.length > 1000, 'the info panel is missing');
  assert.match(panel, /never opens Gmail/i);
  assert.match(panel, /Run the check/i);
  assert.match(panel, /Password Manager/);
  // it must not promise to list someone's accounts for them
  assert.ok(!/I can list (?:all|your) (?:gmail|google) accounts/i.test(panel));
  assert.ok(!/\bpassword:\s/i.test(panel));
});

test('the helper only reports counts, never passwords', () => {
  const py = fs.readFileSync(path.join(__dirname, '..', 'sophia_helper.py'), 'utf8');
  const fn = py.slice(py.indexOf('def action_security_check'), py.indexOf('def action_open_path'));
  assert.match(fn, /SELECT COUNT\(\*\) FROM logins/);
  assert.ok(!/SELECT \* FROM logins/i.test(fn), 'the helper must not read rows of saved logins');
  assert.ok(!/password_value/i.test(fn));
  assert.ok(!/cookies/i.test(fn));
  assert.match(fn, /os\.remove\(tmp\)/);
});
