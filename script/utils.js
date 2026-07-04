// utils.js — 汎用ヘルパー(DOM取得、乱数、トースト、ツールチップ)
function clamp(val, min, max){ return Math.min(Math.max(val, min), max); }
function randInt(n){ return Math.floor(Math.random()*n); }
function pick(arr){ return arr[randInt(arr.length)]; }
function deepCopy(x){ return JSON.parse(JSON.stringify(x)); }
function ui(id){ return document.getElementById(id); }
function setText(id, text){
    const el = document.getElementById(id);
    if(el) el.textContent = text;
}
const tooltipEl = document.getElementById('global-tooltip');
function showGlobalTooltip(targetEl, title, desc) {
    if(!targetEl || !title) {
        hideGlobalTooltip();
        return;
    }
    tooltipEl.innerHTML = `<div class="font-bold text-sky-300 text-xs mb-1">${title}</div><div class="text-slate-300 text-[10px] leading-tight whitespace-pre-wrap">${desc}</div>`;
    const rect = targetEl.getBoundingClientRect();
    tooltipEl.style.opacity = '1';
    const ttWidth = tooltipEl.offsetWidth;
    const ttHeight = tooltipEl.offsetHeight;
    let left = rect.left + (rect.width / 2);
    let top = rect.top - ttHeight - 8;
    if (left - (ttWidth/2) < 4) left = 4 + (ttWidth/2);
    if (left + (ttWidth/2) > window.innerWidth - 4) left = window.innerWidth - 4 - (ttWidth/2);
    tooltipEl.style.left = `${left}px`;
    tooltipEl.style.top = `${top}px`;
}
function hideGlobalTooltip() {
    tooltipEl.style.opacity = '0';
}
function showToast(msg, color='sky'){
    const container = ui('toast-container');
    const el = document.createElement('div');
    el.className = `toast-msg text-${color}-300 border-${color}-500/30`;
    el.innerHTML = `<span>◈</span> ${msg}`;
    container.appendChild(el);
    setTimeout(() => {
        el.classList.add('fade-out');
        setTimeout(() => el.remove(), 300);
    }, 3000);
}
function closeModal(id) {
    const el = document.getElementById(id);
    if(el) el.classList.replace('flex', 'hidden');
}
