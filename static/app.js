const list = document.querySelector('#list');
const select = document.querySelector('#edition');
const updated = document.querySelector('#updated');
const number = new Intl.NumberFormat('en-US');
const escapeHTML = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
async function load(date) {
  try {
    const response = await fetch('/api/editions' + (date ? '?date=' + encodeURIComponent(date) : ''));
    if (!response.ok) throw new Error('request failed');
    const data = await response.json();
    select.innerHTML = data.dates.length ? data.dates.map(d => `<option value="${escapeHTML(d)}" ${d === data.edition?.date ? 'selected' : ''}>${escapeHTML(d)}</option>`).join('') : '<option>暂无数据</option>';
    select.disabled = !data.dates.length;
    if (!data.edition) { list.innerHTML = '<div class="empty"><span class="empty-icon">✳</span><h3>榜单还在路上</h3><p>首次采集完成后，今天的开源发现会出现在这里。</p></div>'; updated.textContent = '等待首次采集'; return; }
    updated.textContent = '采集于 ' + data.edition.collected_at.replace('T',' ').slice(0,16) + '（北京时间）';
    list.innerHTML = data.repositories.map(r => `<article class="repo"><div class="rank ${r.rank <= 3 ? 'top-rank' : ''}">${String(r.rank).padStart(2,'0')}</div><div class="repo-main"><a class="repo-name" href="${escapeHTML(r.url)}" target="_blank" rel="noopener noreferrer">${escapeHTML(r.name)} <span>↗</span></a><p>${escapeHTML(r.description)}</p><div class="tags">${r.language ? `<span><i></i>${escapeHTML(r.language)}</span>` : ''}<span>☆ ${number.format(r.total_stars)} 总星数</span></div></div><div class="stars"><strong>+${number.format(r.daily_stars)}</strong><small>STARS TODAY</small></div></article>`).join('');
  } catch (_) { list.innerHTML = '<div class="empty"><h3>暂时无法加载榜单</h3><p>请检查服务是否正常运行，然后刷新页面。</p></div>'; }
}
select.addEventListener('change', () => load(select.value));
load();
