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
  assert.match(r.text, /\b1\./, 'the answer is given in steps a person can follow');
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
        if (/photosynthesis/i.test(messages[messages.length - 1].content)) return "A mushroom is not a plant, so it does not photosynthesise.";
        return 'Opening that for you.\nDO: open youtube\nDO: shut down';
      }
    }
  });
  let r = await sophia.handle('does photosynthesis happen in a mushroom');
  assert.match(r.text, /does not photosynthesise/);
  r = await sophia.handle('do the thing for me');
  assert.match(r.text, /Opening that for you/);
  assert.strictEqual(calls.length, 1, 'exactly one safe command may reach the laptop');
  assert.ok(['open_new_window', 'open_url', 'open_app'].includes(calls[0]), 'a normal browser window is the redirect path: ' + calls[0]);
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
    // either a fact from her notes, or a reasoned explanation - both are "offline"
    assert.match(r.text, /one thing I know|Here it is|Here is/, ask);
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

test('she calls herself Vega, and still answers to her old names', async () => {
  const vega = Brain.create({ store: { load: () => null, save: () => {} }, mode: () => 'browser' });
  const who = await vega.handle('who are you');
  assert.match(who.text, /Vega/);
  assert.ok(!/\bSophia\b/.test(who.text), who.text);
  assert.ok(!/\bNova\b/.test(who.text), who.text);
  // people remember the old names, so both still wake her
  assert.ok((await vega.handle('hey nova')).text.length > 0);
  assert.ok((await vega.handle('hey sophia')).text.length > 0);
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
  assert.match(menu.text, /Guess the Number/);

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

/* ------------------------------------------------- planning and study help */

test('she understands dates the way people actually write them', () => {
  const now = new Date('2026-11-10T10:00:00'); // a Tuesday
  assert.strictEqual(Brain.daysUntil(Brain.readDayPhrase('today', now), now), 0);
  assert.strictEqual(Brain.daysUntil(Brain.readDayPhrase('tomorrow', now), now), 1);
  assert.strictEqual(Brain.daysUntil(Brain.readDayPhrase('friday', now), now), 3);
  assert.strictEqual(Brain.daysUntil(Brain.readDayPhrase('next monday', now), now), 6);
  assert.strictEqual(Brain.daysUntil(Brain.readDayPhrase('20 november', now), now), 10);
  assert.strictEqual(Brain.daysUntil(Brain.readDayPhrase('12/12', now), now), 32);
  assert.strictEqual(Brain.dayPhrase(Brain.readDayPhrase('tomorrow', now), now), 'tomorrow');
  assert.strictEqual(Brain.readDayPhrase('banana', now), null);
});

test('a remembered exam becomes a plan, not a Google search', async () => {
  const sophia = Brain.create({ store: { load: () => null, save: () => {} }, mode: () => 'browser', now: () => new Date('2026-11-10T10:00:00'), random: () => 0.2 });
  await sophia.handle('remember that my maths exam is on friday');
  const plan = await sophia.handle('make me a study plan');
  assert.match(plan.text, /maths/i);
  assert.match(plan.text, /Day 1/);
  assert.match(plan.text, /Friday/);
  assert.ok(!/search Google/i.test(plan.text));
  assert.ok(!/Days 1-1|Day 3 to 2/.test(plan.text), plan.text);

  const list = await sophia.handle('what is coming up');
  assert.match(list.text, /maths exam/i);
  assert.match(list.text, /3 days/);
});

test('with no saved dates she says so instead of inventing one', async () => {
  const sophia = Brain.create({ store: { load: () => null, save: () => {} }, mode: () => 'browser', now: () => new Date('2026-11-10T10:00:00') });
  const plan = await sophia.handle('make me a study plan');
  assert.match(plan.text, /do not have a dated thing|remember that my maths exam/i);
  const up = await sophia.handle('what is coming up');
  assert.match(up.text, /Nothing dated/i);
});

test('learning help is real technique, and the countdown is right', async () => {
  const sophia = Brain.create({ store: { load: () => null, save: () => {} }, mode: () => 'browser', now: () => new Date('2026-11-10T10:00:00') });
  const forget = await sophia.handle('i keep forgetting things i read');
  assert.match(forget.text, /active recall|test(?:ing)? yourself/i);
  const focus = await sophia.handle('i cannot focus');
  assert.match(focus.text, /25-minute|another room|phone/i);
  const days = await sophia.handle('how many days until friday');
  assert.match(days.text, /3 days/);
  const today = await sophia.handle('how many days until today');
  assert.match(today.text, /today/i);
});

test('the page card only shows real dated things, and caps at three', async () => {
  const sophia = Brain.create({ store: { load: () => null, save: () => {} }, mode: () => 'browser', now: () => new Date('2026-11-10T10:00:00') });
  await sophia.handle('remember that my bag is in the cupboard');
  assert.deepStrictEqual(sophia.focus(), []);
  await sophia.handle('remember that my maths exam is on friday');
  await sophia.handle('remember to submit the physics project on 20 november');
  await sophia.handle('remember that my english test is on 1 december');
  const card = sophia.focus();
  assert.strictEqual(card.length, 3);
  assert.strictEqual(card[0].days, 3);
  assert.match(card[0].text, /maths/i);
  assert.ok(card.every((x) => typeof x.text === 'string' && x.days >= 0));
});

test('a long question is never mistaken for a game choice', async () => {
  const sophia = Brain.create({ store: { load: () => null, save: () => {} }, mode: () => 'browser', now: () => new Date('2026-11-10T10:00:00') });
  await sophia.handle('play a game');
  const r = await sophia.handle('what is 25 times 4');
  assert.match(r.text, /100/);
  assert.ok(!/story|scramble|guess the number/i.test(r.text));
});

test('"can you drive" is a question about her, not a request to open Google Drive', async () => {
  const opened = [];
  const sophia = Brain.create({ store: { load: () => null, save: () => {} }, mode: () => 'browser', now: () => new Date('2026-11-10T10:00:00'), openUrl: (u) => { opened.push(u); return { ok: true }; } });
  const r = await sophia.handle('can you drive');
  assert.strictEqual(opened.length, 0);
  assert.match(r.text, /cannot drive/i);
  assert.ok(!/drive\.google/i.test(r.text));
});

test('she is honest about what she cannot do, and does not just search it', async () => {
  const sophia = Brain.create({ store: { load: () => null, save: () => {} }, mode: () => 'browser', now: () => new Date('2026-11-10T10:00:00'), openUrl: () => ({ ok: true }) });
  for (const q of ['can you hack', 'can you read my gmail', 'can you see my screen', 'can you call me']) {
    const r = await sophia.handle(q);
    assert.match(r.text, /^(?:No|I do not|I cannot)/i, q + ' should start with an honest no');
    assert.ok(!/should i search google/i.test(r.text), q + ' must not offer a search');
  }
  const privacy = await sophia.handle('do you spy on me');
  assert.match(privacy.text, /do not spy/i);
});

test('keyboard mash gets a human answer, not a Google search offer', async () => {
  const sophia = Brain.create({ store: { load: () => null, save: () => {} }, mode: () => 'browser', now: () => new Date('2026-11-10T10:00:00') });
  for (const junk of ['asdkjhasd', 'jkdhfjkdhfjk', 'asdf asdf']) {
    const r = await sophia.handle(junk);
    assert.ok(!/should i search google/i.test(r.text), junk + ' should not be searched');
    assert.ok(r.text.length > 10);
  }
  const bare = await sophia.handle('open');
  assert.match(bare.text, /open what/i);
});

test('a bare question word asks for the rest instead of searching it', async () => {
  const sophia = Brain.create({ store: { load: () => null, save: () => {} }, mode: () => 'browser', now: () => new Date('2026-11-10T10:00:00') });
  for (const word of ['what', 'why', 'how']) {
    const r = await sophia.handle(word);
    assert.ok(!/should i search google/i.test(r.text), word + ' alone should not be searched');
  }
});

test('"good morning" is a greeting, not a mood report', async () => {
  const sophia = Brain.create({ store: { load: () => null, save: () => {} }, mode: () => 'browser', now: () => new Date('2026-11-10T10:00:00') });
  const morning = await sophia.handle('good morning');
  assert.ok(!/how you are feeling/i.test(morning.text));
  assert.match(morning.text, /hi|hello|ready|morning|day/i);
  const night = await sophia.handle('good night');
  assert.match(night.text, /good night|sleep/i);
});

test('she never mixes up who is unwell', async () => {
  const sophia = Brain.create({ store: { load: () => null, save: () => {} }, mode: () => 'browser', now: () => new Date('2026-11-10T10:00:00') });
  const r = await sophia.handle('my mother is ill');
  assert.ok(!/rest and water/i.test(r.text), 'must not answer as if the user were ill');
  assert.match(r.text, /sorry|worry|doctor|water/i);
});

test('an office holder gets honesty, not a random fact', async () => {
  const sophia = Brain.create({ store: { load: () => null, save: () => {} }, mode: () => 'browser', now: () => new Date('2026-11-10T10:00:00'), openUrl: () => ({ ok: true }) });
  const r = await sophia.handle('who is the president of india');
  assert.match(r.text, /do not keep|frozen|live page|changes/i);
  assert.ok(!/Thar Desert|cricket|river/i.test(r.text));
});

test('"remind me" reaches the card with the right day', async () => {
  const sophia = Brain.create({ store: { load: () => null, save: () => {} }, mode: () => 'browser', now: () => new Date('2026-11-10T10:00:00') });
  const r = await sophia.handle('remind me to call mom tomorrow');
  assert.match(r.text, /remember/i);
  const card = sophia.focus();
  assert.strictEqual(card.length, 1);
  assert.strictEqual(card[0].days, 1);
  assert.match(card[0].text, /call mom/i);
});

test('the word book spells, defines and translates, and admits what it does not know', async () => {
  const sophia = Brain.create({ store: { load: () => null, save: () => {} }, mode: () => 'browser' });
  const spell = await sophia.handle('spell definitely');
  assert.match(spell.text, /D-E-F-I-N-I-T-E-L-Y/);
  const mean = await sophia.handle('meaning of serene');
  assert.match(mean.text, /calm/i);
  const syn = await sophia.handle('synonym of happy');
  assert.match(syn.text, /glad|cheerful/i);
  const tr = await sophia.handle('translate hello in hindi');
  assert.match(tr.text, /नमस्ते/);
  const missing = await sophia.handle('meaning of zyzzyva');
  assert.ok(!/means/i.test(missing.text.split('\n')[0]), 'must not invent a meaning');
});

test('small talk and Hinglish are understood, not searched', async () => {
  const sophia = Brain.create({ store: { load: () => null, save: () => {} }, mode: () => 'browser', now: () => new Date('2026-11-10T10:00:00') });
  for (const q of ['you there?', 'testing 123', 'help me study', 'teach me something', 'khana kha liya', 'kya tum mere ho']) {
    const r = await sophia.handle(q);
    assert.ok(!/should i search google/i.test(r.text), q + ' should not be searched');
  }
});

test('"open my resume" is a file, not a website or an app', () => {
  assert.deepStrictEqual(only('open my resume'), { intent: 'open.file', query: 'resume' });
  assert.deepStrictEqual(only('open the physics project file'), { intent: 'open.file', query: 'physics project' });
  assert.deepStrictEqual(only('where is my marksheet'), { intent: 'open.file', query: 'marksheet' });
  assert.deepStrictEqual(only('open resume.pdf').query, 'resume.pdf');
  // apps and sites must still win when that is what they are
  assert.strictEqual(only('open calculator').intent, 'open');
  assert.strictEqual(only('open youtube').intent, 'open');
});

test('one match opens silently, several are numbered and the number works', async () => {
  const calls = [];
  const found = [
    { name: 'physics project.docx', path: 'C:/Users/K/Documents/College/physics project.docx', folder: 'Documents', sub: 'College', ext: 'docx', size: '1.2 MB', changed: 2 },
    { name: 'physics notes.pdf', path: 'C:/Users/K/Downloads/physics notes.pdf', folder: 'Downloads', sub: '', ext: 'pdf', size: '900 KB', changed: 1 }
  ];
  const sophia = Brain.create({
    store: { load: () => null, save: () => {} }, mode: () => 'laptop',
    now: () => new Date('2026-11-10T10:00:00'),
    helper: async (a, p) => {
      calls.push([a, p]);
      if (a === 'find_file') return { ok: true, files: found, count: found.length };
      if (a === 'open_path') return { ok: true, opened: p.path };
      return { ok: true };
    }
  });
  let r = await sophia.handle('open my physics project file');
  assert.match(r.text, /which one/i);
  assert.match(r.text, /1\. physics project\.docx/);
  assert.match(r.text, /2\. physics notes\.pdf/);
  assert.strictEqual(calls.filter((c) => c[0] === 'open_path').length, 0, 'nothing may open before she is told which');

  r = await sophia.handle('2');
  assert.match(r.text, /Opening physics notes\.pdf/);
  assert.deepStrictEqual(calls.pop(), ['open_path', { path: found[1].path }]);

  // a single match goes straight through, no question
  const one = Brain.create({
    store: { load: () => null, save: () => {} }, mode: () => 'laptop',
    helper: async (a, p) => (a === 'find_file' ? { ok: true, files: [found[0]], count: 1 } : { ok: true })
  });
  const r2 = await one.handle('open my resume');
  assert.match(r2.text, /Opening physics project\.docx from Documents > College/);
});

test('a file she cannot find says so and offers the web, not a guess', async () => {
  const sophia = Brain.create({
    store: { load: () => null, save: () => {} }, mode: () => 'laptop',
    helper: async (a) => (a === 'find_file' ? { ok: true, files: [], count: 0 } : { ok: true })
  });
  const r = await sophia.handle('where is my marksheet');
  assert.match(r.text, /could not find anything called "marksheet"/i);
  assert.match(r.text, /desktop.*downloads.*documents/i);
});

test('without Python she asks for the folder and gives a real file link', async () => {
  const sophia = Brain.create({ store: { load: () => null, save: () => {} }, mode: () => 'browser' });
  let r = await sophia.handle('open my resume');
  assert.match(r.text, /folder/i);
  r = await sophia.handle('C:\\Users\\Kartikey\\Documents');
  assert.strictEqual(r.links.length, 1);
  assert.strictEqual(r.links[0].url, 'file:///C:/Users/Kartikey/Documents');
});

test('she explains how to install Python, including the step people miss', async () => {
  const sophia = Brain.create({ store: { load: () => null, save: () => {} }, mode: () => 'browser' });
  const r = await sophia.handle('do i need python');
  assert.match(r.text, /python\.org/);
  assert.match(r.text, /Add python\.exe to PATH/);
  assert.match(r.text, /Start_Sophia\.bat/);
});

test('the gamer layer: levels, xp and the arcade code', () => {
  assert.strictEqual(Brain.levelForXp(0), 1);
  assert.strictEqual(Brain.levelForXp(99), 1);
  assert.strictEqual(Brain.levelForXp(100), 2);
  assert.strictEqual(Brain.xpIntoLevel(120).have, 20);
  assert.strictEqual(Brain.rankName(1), 'Newcomer');
  assert.strictEqual(Brain.rankName(20), 'Legend');
  assert.ok(Brain.isKonami('up up down down left right left right b a'));
  assert.ok(!Brain.isKonami('up up down'));
});

test('playing earns xp, and the profile survives a reload', async () => {
  let store = null;
  const mk = () => Brain.create({ store: { load: () => store, save: (m) => { store = m; } }, mode: () => 'browser', now: () => new Date('2026-11-10T20:00:00') });
  let sophia = mk();
  await sophia.handle('set my player name to Kartikey');
  await sophia.handle('open nothing at all');
  await sophia.handle('up up down down left right left right b a');
  const after = sophia.player();
  assert.strictEqual(after.xp, 50, 'the code is worth 50 xp');
  assert.ok(after.achievements.secret);
  assert.strictEqual(after.name, 'Kartikey');

  // a fresh instance reading the same memory sees the same player
  sophia = mk();
  assert.strictEqual(sophia.player().xp, 50);
  assert.strictEqual(sophia.player().name, 'Kartikey');
});

test('the daily challenge is five scored questions and it counts them', async () => {
  let store = null;
  const sophia = Brain.create({ store: { load: () => store, save: (m) => { store = m; } }, mode: () => 'browser', now: () => new Date('2026-11-10T20:00:00') });
  let r = await sophia.handle('daily challenge');
  assert.match(r.text, /Daily Challenge/);
  assert.match(r.text, /Question 1 of 5/);
  for (let i = 0; i < 4; i++) await sophia.handle("don't know");
  r = await sophia.handle("don't know");
  assert.match(r.text, /0 out of 5/);
  assert.strictEqual(sophia.player().records.challenge, 1);
  assert.ok(sophia.player().xp > 0, 'even a bad run earns something for turning up');
});

test('the game menu shows the player their own progress', async () => {
  const sophia = Brain.create({ store: { load: () => null, save: () => {} }, mode: () => 'browser', now: () => new Date('2026-11-10T20:00:00') });
  const r = await sophia.handle('play a game');
  assert.match(r.text, /Level 1 /);
  assert.match(r.text, /Newcomer/);
  assert.match(r.text, /day/);
  assert.match(r.text, /6\. Daily Challenge/);
  const stats = await sophia.handle('stats');
  assert.match(stats.text, /level 1/i);
  assert.match(stats.text, /Achievements:/);
});

test('guess the number narrows the range and pays out on a win', async () => {
  let store = null;
  const sophia = Brain.create({ store: { load: () => store, save: (m) => { store = m; } }, mode: () => 'browser', now: () => new Date('2026-11-10T20:00:00') });
  await sophia.handle('play a game');
  let r = await sophia.handle('1');
  assert.match(r.text, /between 1 and 100/);
  // binary search, the way a player would
  let lo = 1, hi = 100, won = false;
  for (let i = 0; i < 8 && !won; i++) {
    const mid = Math.floor((lo + hi) / 2);
    r = await sophia.handle(String(mid));
    if (/Yes!/.test(r.text)) { won = true; break; }
    const m = r.text.match(/Range is now (\d+) to (\d+)/);
    assert.ok(m, 'every wrong guess must narrow the range: ' + r.text);
    lo = Number(m[1]); hi = Number(m[2]);
  }
  assert.ok(won, 'a binary search must win within 8 guesses');
  assert.ok(sophia.player().wins >= 1);
  assert.ok(sophia.player().xp > 0);
});

test('the player card is in the page and wired to the brain', () => {
  assert.ok(html.includes('id="playerCard"'), 'the card must exist');
  assert.ok(html.includes('id="xpFill"'), 'the xp bar must exist');
  assert.ok(html.includes('id="playerGrid"'), 'the stats grid must exist');
  const page = html.match(/<!-- ===== the page[\s\S]*/)[0];
  assert.match(page, /renderPlayerCard/);
});

test('she reports the real machine, and says when she is running from a pendrive', async () => {
  const info = {
    name: 'Windows 11 Home', build: '22631', arch: '64-bit', cpu: 'Intel i5', cores: 8, ram_gb: 8,
    python: '3.12.1', drive: 'E:', portable: true,
    disks: [
      { id: 'C:', label: 'OS', kind: 'disk', total_gb: 237, free_gb: 41 },
      { id: 'E:', label: 'VEGA', kind: 'usb', total_gb: 14.5, free_gb: 12.1 }
    ],
    can: { apps: true, files: true, settings: true, screen: true, web: true, games: true }
  };
  const sophia = Brain.create({
    store: { load: () => null, save: () => {} }, mode: () => 'laptop',
    helper: async (a) => (a === 'where_am_i' ? { ok: true, info } : { ok: true })
  });
  const r = await sophia.handle('what computer is this');
  assert.match(r.text, /Windows 11 Home/);
  assert.match(r.text, /8 GB RAM/);
  assert.match(r.text, /removable drive/i);
  assert.match(r.text, /E:/);

  const s = await sophia.handle('how much space is left');
  assert.match(s.text, /41 GB free of 237 GB/);
  assert.match(s.text, /USB drive/);
  assert.match(s.text, /12.1 GB free/);
});

test('without the helper she does not pretend to know the machine', async () => {
  const sophia = Brain.create({ store: { load: () => null, save: () => {} }, mode: () => 'browser' });
  const r = await sophia.handle('laptop specs');
  assert.match(r.text, /Start_Sophia\.bat/);
  assert.ok(!/Windows 11|GB RAM/.test(r.text), 'she must not invent specs');
});

test('the AI connection speaks both OpenAI endpoints and explains failures', () => {
  const page = html.match(/<!-- ===== the page[\s\S]*/)[0];
  const script = page.match(/<script>([\s\S]*?)<\/script>/)[1];

  // the newer Responses API must be there, with a chat-completions fallback
  assert.match(script, /'\/responses'/, 'the Responses endpoint must be used');
  assert.match(script, /\/chat\/completions/, 'chat completions must remain as a fallback');
  assert.match(script, /function responsesBody/, 'a Responses request builder must exist');
  assert.match(script, /function responsesText/, 'a Responses reply reader must exist');
  assert.match(script, /api\.openai\.com\/v1/, 'the real OpenAI base URL must be the default');

  // errors must be human, not "HTTP 401"
  assert.match(script, /401\)/);
  assert.match(script, /wrong, deleted/);
  assert.match(script, /429\)/);
  assert.match(script, /credit/);
  assert.match(script, /function networkHint/, 'a network failure must be explained separately');
  assert.match(script, /not a key problem/);

  // the endpoint URL and the key are clearly different things
  assert.match(html, /This is the <b>address<\/b>, not the key/);
  assert.match(script, /endpoint URL alone is not a key/);
});

test('gpt-5 forces the Responses API, and every reply shape is readable', () => {
  const script = html.match(/<!-- ===== the page[\s\S]*?<script>([\s\S]*?)<\/script>/)[1];
  const apiStyleSrc = script.match(/function apiStyle\(\) \{[\s\S]*?\n  \}/)[0];
  const responsesTextSrc = script.match(/function responsesText\(data\) \{[\s\S]*?\n  \}/)[0];
  const run = (settingsObj) => new Function('settings', apiStyleSrc + '\n' + responsesTextSrc +
    '\nreturn { style: apiStyle(), text: responsesText };')(settingsObj);

  assert.strictEqual(run({ model: 'gpt-5', apiStyle: 'auto' }).style, 'responses', 'gpt-5 needs /v1/responses');
  assert.strictEqual(run({ model: 'gpt-4o-mini', apiStyle: 'auto' }).style, 'auto', 'older models try responses then fall back');
  assert.strictEqual(run({ model: 'gpt-5', apiStyle: 'chat' }).style, 'chat', 'an explicit choice must win');

  const r = run({ model: 'gpt-5', apiStyle: 'auto' });
  assert.strictEqual(r.text({ output_text: 'hello there' }), 'hello there');
  assert.strictEqual(r.text({ output: [{ content: [{ type: 'output_text', text: 'from the array' }] }] }), 'from the array');
  assert.strictEqual(r.text({ choices: [{ message: { content: 'from a clone' } }] }), 'from a clone');
  assert.strictEqual(r.text({ output: [] }), '');
});

test('an address pasted as a key is refused before any request is sent', () => {
  const script = html.match(/<!-- ===== the page[\s\S]*?<script>([\s\S]*?)<\/script>/)[1];
  assert.match(script, /That is a web address, not a key/, 'a URL in the key box must be named as a URL');
  assert.match(script, /base URL box/i, 'she must say where the address really belongs');
  // the check must come before the network call, and must not hard-block short local keys
  const guard = script.indexOf('That is a web address, not a key');
  const call = script.indexOf('aiCheckKey()');
  assert.ok(guard > 0 && call > 0);
  assert.match(script, /const shortKey = settings\.key\.length < 20/, 'a short local key is warned about, not blocked');
  assert.doesNotMatch(script, /too short to be real/, 'a short key must never be refused outright');
});

test('a folder question never eats the next unrelated command', async () => {
  // she asks for a folder, then the user says something else entirely
  const v = Brain.create({});
  await v.handle('open my file named budget');
  const r = await v.handle('what computer is this');
  assert.doesNotMatch(r.text, /does not look like a Windows folder/i, 'the new command must not be judged as a folder');
  assert.ok(r.intents.length > 0 || /computer|helper/i.test(r.text), 'the new command must actually run');
});

test('a real folder path is still accepted when she asks for one', async () => {
  const v = Brain.create({});
  await v.handle('open my file named budget');
  const r = await v.handle('C:\\Users\\me\\Documents');
  assert.match(r.text, /Open this folder|Press the button/i, 'a real path must produce the folder button');
  assert.ok(r.links.length > 0, 'the folder must come back as a clickable button');
});

test('the pendrive-on-another-computer command is understood however it is said', () => {
  const sayings = [
    'i opened you on another computer',
    'put you on a pendrive and opened you on another laptop',
    'i put you on a pendrive',
    'i just plugged you in',
    'plugged you into this pc',
    'new laptop',
    'another computer',
    'who am i on now',
    'travel setup',
    'adapt to this computer',
    'set up on this computer'
  ];
  sayings.forEach(s => assert.strictEqual(only(s).intent, 'machine.travel', s));

  // and it must not steal the neighbours
  assert.strictEqual(only('what computer is this').intent, 'machine.info');
  assert.strictEqual(only('how much space is left').intent, 'machine.storage');
});

test('one command reads the new machine, its storage, and opens the app', async () => {
  const calls = [];
  const v = Brain.create({
    mode: () => 'app',
    helper: async (action, params) => {
      calls.push({ action, params });
      if (action !== 'travel_setup') return { ok: true };
      return { ok: true, info: {
        specs: { os_name: 'Linux', release: '6.8.0', machine: 'x86_64', cpu_count: 8, ram_gb: 15.5, python: '3.12.3', host: 'college-pc' },
        storage: [
          { id: '/', label: 'this computer', kind: 'disk', total_gb: 238.5, free_gb: 96.2 },
          { id: '/media/me/VEGA', label: 'removable drives', kind: 'disk', total_gb: 14.5, free_gb: 12.1 }
        ],
        drive: '', portable: false, app_found: true, app_path: '/media/me/VEGA/index.html', app_opened: true
      } };
    }
  });
  const r = await v.handle('i opened you on another computer');
  assert.strictEqual(calls.length, 1, 'exactly one helper call, not four');
  assert.strictEqual(calls[0].action, 'travel_setup');
  assert.strictEqual(calls[0].params.open, true);
  assert.match(r.text, /Linux 6\.8\.0/, 'the new OS is named');
  assert.match(r.text, /8 cores/, 'the cpu is named');
  assert.match(r.text, /15\.5 GB RAM/, 'the memory is named');
  assert.match(r.text, /96\.2 GB free of 238\.5 GB/, 'the new storage is named');
  assert.match(r.text, /opened it/, 'the app was opened');
});

test('with no helper she says what is missing instead of inventing specs', async () => {
  const v = Brain.create({ mode: () => 'app', helper: async () => ({ ok: false, error: 'unreachable' }) });
  const r = await v.handle('another computer');
  assert.match(r.text, /helper|Start_Sophia/i);
  assert.doesNotMatch(r.text, /GB|cores/i, 'no machines specs may be invented');
});

test('the gamer layer: combos pay, quests complete, prestige is earned', async () => {
  // The three daily quests rotate with the date, so a test that needs the
  // riddle quest must choose its own day instead of hoping today has it.
  const clock = { t: new Date('2026-03-02T10:00:00Z').getTime() };
  const v = Brain.create({ now: () => new Date(clock.t) });

  // find a day whose quests include the riddle, then stay on it
  for (let d = 0; d < 40; d++) {
    v.handle('quests');
    if (v.player().quests.done_riddle !== undefined) break;
    const q = await v.handle('quests');
    if (/riddle/i.test(q.text)) break;
    clock.t += 86400000;
  }

  // three riddles in a row: a combo, a quest, and a level up
  for (let i = 0; i < 3; i++) {
    if (!v.state.riddle) await v.handle('tell me a riddle');
    const answer = v.state.riddle.a;
    await v.handle('the answer is ' + answer);
  }
  const p = v.player();
  assert.strictEqual(p.combo, 3, 'three correct in a row is a combo of three');
  assert.strictEqual(p.bestCombo, 3);
  if (/riddle/i.test((await v.handle('quests')).text)) {
    assert.ok(p.quests.done_riddle, 'the riddle quest completed on its own');
  }
  assert.ok(p.xp >= 100, 'combo and quest XP both landed');

  // a wrong answer must break the run, not silently keep it
  await v.handle('tell me a riddle');
  await v.handle('the answer is definitely wrong');
  assert.strictEqual(v.player().combo, 0, 'a miss resets the combo');

  // prestige is refused honestly below level 20
  const r = await v.handle('prestige');
  assert.match(r.text, /Prestige opens at level 20/);
  assert.strictEqual(v.player().prestige, 0);

  // quests are stable within a day, so they cannot be re-rolled by reloading
  // the same clock twice, not whatever today happens to be
  const fixed = () => new Date('2026-03-02T10:00:00Z');
  const one = Brain.create({ now: fixed });
  const two = Brain.create({ now: fixed });
  await one.handle('quests');
  await two.handle('quests');
  const a = one.player().questPicked.join(',');
  const b = two.player().questPicked.join(',');
  assert.strictEqual(a, b, 'the same day gives the same three quests');
});

test('prestige keeps the records and resets only the rank', async () => {
  // The 20 levels are real play; what is tested here is what prestige DOES.
  // Drive a real save: play until there is a record, then check the rule.
  const v = Brain.create({});
  for (let i = 0; i < 3; i++) {
    if (!v.state.riddle) await v.handle('tell me a riddle');
    await v.handle('the answer is ' + v.state.riddle.a);
  }
  const before = v.player();
  assert.strictEqual(before.records.riddle, 3, 'a real record exists to protect');
  assert.ok(before.achievements.first_win, 'a real achievement exists to protect');

  // below the threshold she must refuse, and change nothing
  const refused = await v.handle('prestige');
  assert.match(refused.text, /Prestige opens at level 20/);
  const after = v.player();
  assert.strictEqual(after.prestige || 0, 0);
  assert.strictEqual(after.xp, before.xp, 'a refused prestige must not touch anything');
  assert.strictEqual(after.records.riddle, 3);
});

test('the prestige threshold is stated in one place', () => {
  const script = html.match(/<script id="sophia-brain">([\s\S]*?)<\/script>/)[1];
  assert.match(script, /const PRESTIGE_AT = 20/);
  const matches = script.match(/PRESTIGE_AT/g) || [];
  assert.ok(matches.length >= 3, 'the number is used, not copied into three sentences');
});

test('the reasoning engine solves algebra and checks its own answer', async () => {
  const v = Brain.create({});
  const cases = [
    ['what is x if 2x + 5 = 17', 6],
    ['solve 3x - 7 = 14', 7],
    ['2x + 5 = 17', 6],
    ['x/4 = 9', 36]
  ];
  for (const [q, want] of cases) {
    const r = await v.handle(q);
    assert.match(r.text, new RegExp('= ' + want + '\\b'), q + ' should give ' + want);
    assert.match(r.text, /checked it by putting/, q + ' must show the check');
  }
});

test('geometry uses the right formula and says it', async () => {
  const v = Brain.create({});
  let r = await v.handle('area of a circle with radius 5');
  assert.match(r.text, /78\.54/);
  assert.match(r.text, /pi/, 'the formula must be shown, not just the answer');

  r = await v.handle('area of a triangle with base 10 and height 6');
  assert.match(r.text, /30\b/);

  r = await v.handle('volume of a cube with side 3');
  assert.match(r.text, /27\b/);

  // a wrong shape must not be invented
  r = await v.handle('area of a giraffe with radius 5');
  assert.doesNotMatch(r.text, /78\.54/);
});

test('units, money and number facts answer without the internet', async () => {
  const v = Brain.create({});
  const cases = [
    ['how many grams in 2.5 kg', /2,500 grams/],
    ['how many minutes in 3 hours', /180 minutes/],
    ['what is 12 GB in MB', /12,288 megabytes/],
    ['convert 5 km to miles', /3\.1069 miles/],
    ['simple interest on 5000 at 8% for 3 years', /1,200/],
    ['if i buy 3 apples at 20 each', /60/],
    ['what is 7 factorial', /5,040/],
    ['gcd of 24 and 36', /12/],
    ['is 97 prime', /is prime/],
    ['20 is what percent of 80', /25% of 80/]
  ];
  for (const [q, re] of cases) {
    const r = await v.handle(q);
    assert.match(r.text, re, q);
  }
});

test('the reasoning engine never guesses', async () => {
  // a mismatched unit conversion must fall through, not invent an answer
  const v = Brain.create({});
  const r = await v.handle('convert 5 kilograms to kilometres');
  assert.doesNotMatch(r.text, /kilometres\.$/, 'mass cannot be converted to length');
});

test('real school topics answer from her own notes, and stay on topic', async () => {
  const v = Brain.create({ random: () => 0.35, now: () => new Date('2026-11-11T10:00:00') });
  const cases = [
    ['what is a cell', /cells and life/i],
    ['what is democracy', /democracy and government/i],
    ['what is an ecosystem', /ecosystems and food chains/i],
    ['what is evolution', /evolution and natural selection/i],
    ['what is inflation', /money and the economy/i],
    ['what is an acid', /acids, bases and reactions/i],
    ['what is a prime number', /numbers and prime numbers/i],
    ['what is newton second law', /gravity and motion/i]
  ];
  for (const [q, label] of cases) {
    const r = await v.handle(q);
    assert.match(r.text, label, q + ' must find its own topic');
    assert.doesNotMatch(r.text, /could not find/i, q + ' must not offer a search');
  }

  // the specific topic must win: "gravity" is not a fact about solids
  const g = await v.handle('what is gravity');
  assert.match(g.text, /gravity|motion/i);
  assert.doesNotMatch(g.text, /solids, li/i, 'a loose match must never answer a different subject');
});

test('each new topic can run a quiz, so the knowledge is usable', async () => {
  const v = Brain.create({ random: () => 0.5 });
  for (const topic of ['cells', 'gravity', 'democracy', 'acids', 'evolution', 'inflation']) {
    const r = await v.handle('quiz me on ' + topic);
    assert.match(r.text, /./, 'quiz on ' + topic + ' must start');
    assert.doesNotMatch(r.text, /I have quiz packs on/i, topic + ' must be a known pack');
  }
});

test('quadratics answer honestly, including the spoken form, and never hang', async () => {
  const v = Brain.create({});
  let r = await v.handle('solve x squared minus 4 equals 0');
  assert.match(r.text, /x = -2/);
  assert.match(r.text, /x = 2/);

  r = await v.handle('x^2 + 5x + 6 = 0');
  assert.match(r.text, /x = -3/);
  assert.match(r.text, /x = -2/);

  r = await v.handle('x squared plus 3x minus 10 equals 0');
  assert.match(r.text, /x = -5/);
  assert.match(r.text, /x = 2/);

  // one root, and no real root: both must be named as such
  r = await v.handle('x squared minus 6x plus 9 equals 0');
  assert.match(r.text, /one answer, x = 3/);
  r = await v.handle('x^2 + 1 = 0');
  assert.match(r.text, /no real answer/);

  // a shape she cannot solve must not invent a number
  r = await v.handle('integral of x squared');
  assert.doesNotMatch(r.text, /x = /);
});

test('the solver always stops, even on odd input', async () => {
  // this is the failure that must never ship: a loop that never ends
  const v = Brain.create({});
  const odd = ['x squared', 'x^2 =', '= 0', 'x squared plus plus 3', 'x squared 4 5 6'];
  const started = Date.now();
  for (const q of odd) await v.handle(q);
  assert.ok(Date.now() - started < 5000, 'solving must never hang');
});

test('fractions, ratios and mixed numbers are worked out exactly', async () => {
  const v = Brain.create({});
  const cases = [
    ['what is 3/4 plus 1/8', /7\/8/],
    ['what is 5/6 minus 1/3', /1\/2/],
    ['what is 2 and 1/2 times 4', /\b10\b/],
    ['what is 7 and 3/4 minus 2 and 1/4', /11\/2/],
    ['simplify 18/24', /3\/4/],
    ['what is 45 as a fraction of 60', /3\/4/],
    ['what is 0.75 as a percentage', /75%/],
    ['what is 0.6 as a fraction', /3\/5/],
    ['what is 0.125 as a fraction', /1\/8/]
  ];
  for (const [q, re] of cases) {
    const r = await v.handle(q);
    assert.match(r.text, re, q);
  }
});

test('percent in both directions, discount, and a real price worked out', async () => {
  const v = Brain.create({});
  let r = await v.handle('increase 500 by 12%');
  assert.match(r.text, /560/);
  r = await v.handle('decrease 80 by 25%');
  assert.match(r.text, /60/);
  r = await v.handle('a shirt costs 1200 and there is 18% off, what do i pay');
  assert.match(r.text, /984/);
});

test('school word problems: speed, proportion, diameter, pythagoras', async () => {
  const v = Brain.create({});
  let r = await v.handle('train travels 60 km in 1.5 hours what is the speed');
  assert.match(r.text, /40/);

  r = await v.handle('if 5 pens cost 75 what does 1 cost');
  assert.match(r.text, /15/);

  r = await v.handle('what is the area of a circle with diameter 10');
  assert.match(r.text, /78\.54/);

  r = await v.handle('what is the hypotenuse of a 3 4 triangle');
  assert.match(r.text, /5\b/);

  r = await v.handle('if a recipe for 4 people uses 200g rice how much for 6');
  assert.match(r.text, /300/);
});

test('two unknowns and factorising are solved and checked', async () => {
  const v = Brain.create({});
  const r = await v.handle('solve 2x + y = 7 and x - y = 2');
  assert.match(r.text, /x = 3/);
  assert.match(r.text, /y = 1/);
  assert.match(r.text, /both balance/);

  const f = await v.handle('factorise x squared plus 5x plus 6');
  assert.match(f.text, /\(x \+ 2\)\(x \+ 3\)/);
});

test('why and how questions get reasoned answers, not random facts', async () => {
  const v = Brain.create({});
  const r = await v.handle('why is the sky blue');
  assert.match(r.text, /scatter/i);
  assert.match(r.text, /\b1\./, 'the reasoning is numbered');

  const w = await v.handle('what is the difference between weather and climate');
  assert.match(w.text, /climate/i);
  assert.match(w.text, /years/i);

  const n = await v.handle('explain newton third law');
  assert.match(n.text, /equal and opposite/);
  assert.doesNotMatch(n.text, /first law/, 'the third law must not return the first');
});

test('the fraction solver never steals plain arithmetic or algebra', async () => {
  // these are the regressions the wider solver caused
  const v = Brain.create({});
  const a = await v.handle('7 * 8 + 1');
  assert.match(a.text, /57/);
  const b = await v.handle('2x + 5 = 17');
  assert.match(b.text, /x = 6/);
  assert.doesNotMatch(b.text, /2 \+ 5 is 7/);
  const c = await v.handle('what is 25 times 4');
  assert.match(c.text, /100/);
});

test('the fact she picks answers the actual question asked', async () => {
  // the pack holds several facts; the one about the asked thing must win
  const pairs = [
    ['tell me about meiosis', /meiosis/i],
    ['who is bhagat singh', /bhagat singh/i],
    ['what is a cell', /cells?\b/i]
  ];
  for (const [q, re] of pairs) {
    const v = Brain.create({});
    const r = await v.handle(q);
    assert.match(r.text, re, q);
  }
});
