const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

class Element {
  constructor(value = '') { this.value = value; this.textContent = ''; this.listeners = {}; }
  set innerHTML(html) {
    this.html = html;
    if (this.isDateSelect) {
      const chosen = html.match(/<option value="([^"]*)" selected>/) || html.match(/<option value="([^"]*)"/);
      this.value = chosen ? chosen[1] : '';
    }
  }
  get innerHTML() { return this.html || ''; }
  addEventListener(name, callback) { this.listeners[name] = callback; }
  change() { this.listeners.change(); }
}

test('defaults to daily and preserves the selected date when switching leaderboards', async () => {
  const elements = Object.fromEntries(['#list', '#edition', '#period', '#updated', '#board-title', '#ranking-label', '#stars-heading', '#method'].map(key => [key, new Element()]));
  elements['#period'].value = 'daily';
  elements['#edition'].isDateSelect = true;
  const requests = [];
  const context = {
    document: {querySelector: key => elements[key]},
    URLSearchParams, AbortController, Intl,
    fetch: async url => {
      const params = new URLSearchParams(url.split('?')[1]);
      requests.push(params);
      const date = params.get('date') || '2026-11-13';
      const weekly = params.get('period') === 'weekly';
      return {ok: true, json: async () => ({
        dates: ['2026-11-13', '2026-11-12'],
        edition: {date, collected_at: date + 'T08:00:00+08:00'},
        window: {start:'2026-11-06', end:date, available_days:7, total_days:7},
        repositories: [{rank:1, name:'a/b', url:'https://github.com/a/b', description:'项目介绍', language:'Python', total_stars:200, daily_stars:10, period_stars:70, appearances:3}],
        period: weekly ? 'weekly' : 'daily'
      })};
    }
  };
  vm.runInNewContext(fs.readFileSync('static/app.js', 'utf8'), context);
  const flush = () => new Promise(resolve => setImmediate(resolve));
  await flush();
  assert.equal(requests[0].get('period'), 'daily');
  assert.match(elements['#list'].innerHTML, /\+10/);
  assert.equal(elements['#edition'].value, '2026-11-13');
  elements['#edition'].value = '2026-11-12';
  elements['#edition'].change();
  await flush();
  elements['#period'].value = 'weekly';
  elements['#period'].change();
  await flush();
  assert.equal(requests[2].get('date'), '2026-11-12');
  assert.equal(requests[2].get('period'), 'weekly');
  assert.equal(elements['#edition'].value, '2026-11-12');
  assert.match(elements['#board-title'].innerHTML, /近七日升星榜/);
  assert.match(elements['#list'].innerHTML, /\+70/);
  assert.match(elements['#list'].innerHTML, /上榜 3 天/);
  assert.match(elements['#method'].textContent, /未上榜日期不计入/);
});
