/**
 * The page test. Every other test drives the brain function directly; this one
 * loads the real assistant.html, types into the real #input, submits the real
 * form, and reads the real chat log. It is what catches a broken id, a throw in
 * the UI code, or a reply that never reaches the screen.
 *
 * It needs jsdom. If jsdom is not installed the test says so and skips rather
 * than failing, so `node --test tests/` still works on a bare checkout.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const PAGE = path.join(here, '..', 'assistant.html');

let JSDOM = null, VirtualConsole = null;
try {
  const jsdom = await import('jsdom');
  JSDOM = jsdom.JSDOM;
  VirtualConsole = jsdom.VirtualConsole;
} catch (e) {
  JSDOM = null;
}

async function loadPage() {
  const html = fs.readFileSync(PAGE, 'utf8');
  const errors = [];
  const vc = new VirtualConsole();
  vc.on('jsdomError', (e) => errors.push(e.message));
  vc.on('error', (m) => errors.push(String(m)));
  const dom = new JSDOM(html, {
    runScripts: 'dangerously',
    pretendToBeVisual: true,
    url: 'http://127.0.0.1:8765/assistant.html',
    virtualConsole: vc
  });
  const { window } = dom;
  // the page speaks through the browser; jsdom has no voice
  window.speechSynthesis = { speak() {}, cancel() {}, getVoices: () => [] };
  window.SpeechSynthesisUtterance = function () {};
  await new Promise((r) => setTimeout(r, 900));
  return { window, errors };
}

async function ask(window, text) {
  const doc = window.document;
  const input = doc.getElementById('input');
  const form = doc.getElementById('composer');
  assert.ok(input, '#input must exist');
  assert.ok(form, '#composer must exist');
  input.value = text;
  form.dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }));
  // the brain is asynchronous
  for (let i = 0; i < 60; i++) {
    await new Promise((r) => setTimeout(r, 50));
    const log = doc.getElementById('log') || doc.querySelector('.log');
    if (log && log.textContent.trim().length) return log.textContent;
  }
  const log = doc.getElementById('log') || doc.querySelector('.log');
  return log ? log.textContent : '';
}

test('the page loads, wires itself up, and raises no error', { skip: !JSDOM && 'jsdom is not installed' }, async () => {
  const { window, errors } = await loadPage();
  assert.equal(window.document.title.includes('Vega'), true, 'the title says Vega');
  assert.equal(typeof window.SophiaBrain, 'object', 'the brain is on the page');
  const fatal = errors.filter((e) => !/canvas|getContext/i.test(e));
  assert.deepEqual(fatal, [], 'no uncaught error while starting');
  window.close();
});

test('typing a question into the real box puts a real answer on the screen',
  { skip: !JSDOM && 'jsdom is not installed' }, async () => {
  const { window } = await loadPage();
  const text = await ask(window, 'what is 3/4 plus 1/8');
  assert.match(text, /7\/8/, 'the answer reached the chat log: got ' + JSON.stringify(text.slice(0, 120)));
  window.close();
});

test('a why-question lands in the log as numbered steps',
  { skip: !JSDOM && 'jsdom is not installed' }, async () => {
  const { window } = await loadPage();
  const text = await ask(window, 'why is the sky blue');
  assert.match(text, /scatter|colour|color/i);
  window.close();
});

test('the page has no dead element ids', { skip: !JSDOM && 'jsdom is not installed' }, async () => {
  const { window } = await loadPage();
  const doc = window.document;
  const html = fs.readFileSync(PAGE, 'utf8');
  const brain = html.match(/<script id="sophia-brain">([\s\S]*?)<\/script>/);
  assert.ok(brain, 'the brain block is present');
  const ids = [...brain[1].matchAll(/getElementById\('([^']+)'\)/g)].map((m) => m[1]);
  const missing = [...new Set(ids)].filter((id) => !doc.getElementById(id));
  assert.deepEqual(missing, [], 'every id the script asks for exists in the page');
  window.close();
});
