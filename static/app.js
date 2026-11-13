const list = document.querySelector('#list');
const select = document.querySelector('#edition');
const periodSelect = document.querySelector('#period');
const updated = document.querySelector('#updated');
const title = document.querySelector('#board-title');
const rankingLabel = document.querySelector('#ranking-label');
const starsHeading = document.querySelector('#stars-heading');
const method = document.querySelector('#method');
const number = new Intl.NumberFormat('en-US');
const escapeHTML = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const periods = {
  daily: {title: '每日升星榜', label: 'DAILY RANKING'},
  weekly: {title: '近7日榜', label: '7-DAY RANKING', days: 7},
  '30day': {title: '近30日榜', label: '30-DAY RANKING', days: 30}
};
let controller;

async function load(date) {
  if (controller) controller.abort();
  controller = new AbortController();
  const currentRequest = controller;
  const period = periodSelect.value;
  const params = new URLSearchParams({period});
  if (date) params.set('date', date);
  try {
    const response = await fetch('./api/editions?' + params, {signal: currentRequest.signal});
    if (!response.ok) throw new Error('request failed');
    const data = await response.json();
    if (currentRequest !== controller) return;
    const details = periods[period];
    const aggregated = period !== 'daily';
    title.innerHTML = details.title + '<span class="title-dot">.</span>';
    rankingLabel.textContent = details.label;
    starsHeading.textContent = aggregated ? '上榜累计' : '当日升星';
    select.innerHTML = data.dates.length ? data.dates.map(d => `<option value="${escapeHTML(d)}" ${d === data.edition?.date ? 'selected' : ''}>${escapeHTML(d)}</option>`).join('') : '<option value="">暂无数据</option>';
    select.disabled = !data.dates.length;
    if (!data.edition) {
      list.innerHTML = '<div class="empty"><img src="./mark.svg" alt="" width="48" height="48"><h2>榜单还在路上</h2><p>首次采集完成后，榜单会出现在这里。</p></div>';
      updated.textContent = '等待首次采集';
      method.textContent = aggregated ? `累计近${details.days}日每日榜上的升星数。` : '按热门候选项目的当日新增星数排序，并非全站完整排名。';
      return;
    }
    updated.textContent = '采集于 ' + data.edition.collected_at.replace('T',' ').slice(0,16) + '（北京时间）';
    if (aggregated) {
      const window = data.window;
      method.textContent = `${window.start} 至 ${window.end}，已有 ${window.available_days}/${window.total_days} 天榜单。仅累计项目上榜日的升星数，未上榜日期不计入，并非全站完整排名。`;
    } else {
      method.textContent = '按热门候选项目的当日新增星数排序，并非全站完整排名。';
    }
    list.innerHTML = data.repositories.map(r => {
      const stars = aggregated ? r.period_stars : r.daily_stars;
      const appearances = aggregated ? `<span>上榜 ${number.format(r.appearances)} 天</span>` : '';
      const totalLabel = aggregated ? '最近记录的总星数' : '总星数';
      return `<article class="repo"><div class="rank ${r.rank <= 3 ? 'top-rank' : ''}">${String(r.rank).padStart(2,'0')}</div><div class="repo-main"><a class="repo-name" href="${escapeHTML(r.url)}" target="_blank" rel="noopener noreferrer">${escapeHTML(r.name)} <span>↗</span></a><p>${escapeHTML(r.description)}</p><div class="tags">${r.language ? `<span><i></i>${escapeHTML(r.language)}</span>` : ''}<span>☆ ${number.format(r.total_stars)} ${totalLabel}</span>${appearances}</div></div><div class="stars"><strong>+${number.format(stars)}</strong><small>${aggregated ? '上榜累计' : '当日升星'}</small></div></article>`;
    }).join('');
  } catch (error) {
    if (error.name === 'AbortError' || currentRequest !== controller) return;
    list.innerHTML = '<div class="empty"><h2>暂时无法加载榜单</h2><p>请检查服务是否正常运行，然后刷新页面。</p></div>';
  }
}
select.addEventListener('change', () => load(select.value));
periodSelect.addEventListener('change', () => load(select.value));
load();
