// ============================================================
// app.js — интеграция Web App с API. Загружай ПОСЛЕ основного <script>
// ============================================================

const API_BASE = 'https://lyricist-thud-manicure.ngrok-free.dev';

(function init() {
    const tg = window.Telegram && window.Telegram.WebApp;
    if (tg) { tg.ready(); tg.expand(); tg.setBackgroundColor('#f8fafc'); }
    document.addEventListener('DOMContentLoaded', loadUserData);
    if (document.readyState !== 'loading') loadUserData();
})();

async function loadUserData() {
    const urlParams = new URLSearchParams(window.location.search);
    const tgId = urlParams.get('tg_id');
    const initData = (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.initData) || '';

    const url = new URL(API_BASE + '/api/me');
    if (initData) url.searchParams.set('init_data', initData);
    else if (tgId) url.searchParams.set('tg_id', tgId);
    else { console.warn('[app.js] нет tg_id и нет initData'); return; }

    try {
        const res = await fetch(url, {
            headers: {
                'ngrok-skip-browser-warning': 'true',
                ...(initData ? { 'X-Telegram-Init-Data': initData } : {})
            }
        });
        if (!res.ok) { console.error('[app.js] API error:', res.status, await res.text()); return; }
        const data = await res.json();
        console.log('[app.js] User data:', data);
        applyUserData(data);
    } catch (e) {
        console.error('[app.js] fetch failed:', e);
    }
}

function setText(selector, value) {
    const el = document.querySelector(selector);
    if (el && value != null) el.textContent = value;
}

function applyUserData(data) {
    const pharm = data.pharmacies && data.pharmacies[0];
    if (!pharm) return;
    const d = pharm.dashboard || {};

    // Шапка аптеки
    setText('.pharmacy-name', pharm.business || pharm.name);
    if (d.city) setText('.pharmacy-details', d.city);
    setText('.pharmacy-inn', 'ИНН: ' + (pharm.inn || '—'));

    // Доход за квартал
    if (d.income_quarter) setText('.income-amount', d.income_quarter);

    // Stats (✅ / ⚠️ / 🔴)
    if (d.stats) {
        const nums = document.querySelectorAll('.stats-grid .stat-number');
        if (nums[0]) nums[0].textContent = d.stats.completed ?? 0;
        if (nums[1]) nums[1].textContent = d.stats.partial ?? 0;
        if (nums[2]) nums[2].textContent = d.stats.critical ?? 0;
    }

    // Месяцы (январь/февраль/март)
    if (d.months) {
        const blocks = document.querySelectorAll('.month-block');
        ['january', 'february', 'march'].forEach((key, i) => {
            const m = d.months[key];
            const block = blocks[i];
            if (!m || !block) return;
            const vals = block.querySelectorAll('.month-stat-value');
            if (vals[0]) vals[0].textContent = m.fact;
            if (vals[1]) vals[1].textContent = m.plan;
            const fill = block.querySelector('.progress-fill');
            const pct = block.querySelector('.month-percent');
            if (fill) fill.style.width = m.percent + '%';
            if (pct) pct.textContent = m.percent + '%';
        });
    }

    // Проекты — мутируем глобальный allProjects (не пересоздаём const)
    if (Array.isArray(d.projects) && typeof allProjects !== 'undefined') {
        allProjects.length = 0;
        d.projects.forEach(p => allProjects.push(p));
        if (typeof filterProjects === 'function') filterProjects();
    }

    // Бонусы (3 блока: accrued/potential/completed)
    if (d.bonuses) {
        const boxes = document.querySelectorAll('.bonus-box');
        ['accrued', 'potential', 'completed'].forEach((key, i) => {
            const b = d.bonuses[key];
            const box = boxes[i];
            if (!b || !box) return;
            const amt = box.querySelector('.bonus-amount');
            const desc = box.querySelector('.bonus-desc');
            if (amt && b.amount) amt.textContent = b.amount;
            if (desc && b.desc) desc.textContent = b.desc;
        });
    }
}
