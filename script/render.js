// render.js — 描画(盤面、HUD、スキル欄、アニメーション、無限スクロール)
const CLONE_PADDING = 30; 
function renderBoard(resetScroll = false){
    const slider = document.getElementById('board-scroll-area');
    const currentScrollPos = slider ? slider.scrollLeft : 0;
    const deadlocked = isDeadlocked();
    const allSegments = gameState.tubes.flat();
    const totalBlackCount = allSegments.filter(c => c === 'K').length;
    if (alertBanner) {
        if (deadlocked) {
            alertBanner.textContent = currentLang === 'ja' ? '1つも動かせない...' : 'NO MOVES LEFT';
            alertBanner.style.opacity = '1';
        } else {
            alertBanner.style.opacity = '0';
        }
    }
    const counts = getBoardCounts();
    const totalTubes = gameState.tubes.length;
    if (totalTubes === 0) return;
    const renderList = [];
    for(let i = 0; i < CLONE_PADDING; i++) {
        let idx = (totalTubes - CLONE_PADDING + i) % totalTubes;
        if (idx < 0) idx += totalTubes;
        renderList.push({ idx: idx, isClone: true, key: `clone-pre-${i}` });
    }
    for(let i = 0; i < totalTubes; i++) renderList.push({ idx: i, isClone: false, key: `real-${i}` });
    for(let i = 0; i < CLONE_PADDING; i++) {
        const idx = i % totalTubes; 
        renderList.push({ idx: idx, isClone: true, key: `clone-post-${i}` });
    }
    const existingTubes = Array.from(tubesContainer.children);
    const existingMap = new Map();
    existingTubes.forEach(el => {
        if (el.dataset.renderKey) existingMap.set(el.dataset.renderKey, el);
    });
    const newlyCompleted = new Set();
    const processedKeys = new Set();
    renderList.forEach((item, loopIndex) => {
        const i = item.idx;
        const segments = gameState.tubes[i];
        if (!segments) return;
        processedKeys.add(item.key);
        let tube = existingMap.get(item.key);
        if (!tube) {
            tube = document.createElement('div');
            tube.className = 'tube';
            const cap = document.createElement('div');
            cap.className = 'tube-cap';
            tube.appendChild(cap);
            const water = document.createElement('div');
            water.className = 'water-container';
            tube.appendChild(water);
        }
        tube.onclick = (e) => {
            if(isDragging) return;
            handleTubeClick(i); 
        };
        if (item.isClone) {
            tube.classList.add('is-clone');
        } else {
            tube.classList.remove('is-clone');
        }
        const currentChildAtPos = tubesContainer.children[loopIndex];
        if (currentChildAtPos !== tube) {
            tubesContainer.insertBefore(tube, currentChildAtPos);
        }
        tube.dataset.idx = String(i);
        tube.dataset.renderKey = item.key;
        const setClass = (cls, on) => on ? tube.classList.add(cls) : tube.classList.remove(cls);
        const isIsolatedBlack = (totalBlackCount === 1 && segments.length === 1 && segments[0] === 'K');
        setClass('selected', i === gameState.selectedIdx);
        setClass('tube-focused', gameState.focusIdx !== null && i === gameState.focusIdx);
        setClass('deadlock-glow', deadlocked || isIsolatedBlack);
        const isCompletedNow = (segments.length > 0 && segments[0] !== 'K' && isCompleteTube(segments, counts));
        if (isCompletedNow) {
            if (gameState.completedFlags[i]) {
                tube.classList.add('capped');
            } else if (!item.isClone) {
                newlyCompleted.add(i);
            }
            tube.style.boxShadow = `0 0 20px ${colorMeta(segments[0]).hex}`;
            tube.style.borderColor = `rgba(255,255,255,0.8)`;
        } else {
            if (!item.isClone) gameState.completedFlags[i] = false;
            tube.classList.remove('capped');
            tube.style.boxShadow = '';
            tube.style.borderColor = '';
        }
        const isTwoStepSkill = ['extractor', 'transfer', 'quantum_pipette'].includes(gameState.targetMode);
        let isTarget = false;
        if (isTwoStepSkill && gameState.extractorHeldColor) {
            isTarget = segments.length < gameState.capacity;
        } else if (gameState.targetMode) {
            isTarget = !(gameState.targetMode === 'extractor' && segments.length === 0);
        }
        setClass('target-mode', isTarget);
        setClass('source-mode', gameState.targetMode === 'extractor' && segments.length > 0);
        const water = tube.querySelector('.water-container');
        const ghostState = (gameState.extractorHeldColor && i === gameState.extractorSourceIdx) ? ("_ghost_" + gameState.extractorHeldColor + "_" + (gameState.targetMode || "pipette")) : "";
        const currentStateStr = JSON.stringify(segments) + ghostState;
        if (water.dataset.lastState !== currentStateStr) {
            water.innerHTML = '';
            let displaySegments = [...segments];
            if (gameState.extractorHeldColor !== null && i === gameState.extractorSourceIdx) {
                const isBottom = (gameState.targetMode === 'quantum_pipette' || (gameState.pipetteMode && !gameState.targetMode));
                if (isBottom) {
                    displaySegments.unshift(gameState.extractorHeldColor + "_ghost");
                } else {
                    displaySegments.push(gameState.extractorHeldColor + "_ghost");
                }
            }
            displaySegments.forEach(key => {
                const isGhost = key.endsWith("_ghost");
                const actualKey = isGhost ? key.split("_")[0] : key;
                const c = colorMeta(actualKey)?.hex || '#64748b';
                const seg = document.createElement('div');
                seg.className = 'water-segment';
                if (isGhost) seg.style.opacity = '0.5';
                seg.style.backgroundColor = c;
                if (actualKey === 'K') {
                    seg.classList.add('void-ink');
                }
                water.appendChild(seg);
            });
            water.dataset.lastState = currentStateStr;
        }
    });
    while (tubesContainer.children.length > renderList.length) {
        tubesContainer.lastChild.remove();
    }
    if (newlyCompleted.size > 0) {
        setTimeout(() => {
            newlyCompleted.forEach(idx => {
                const targets = document.querySelectorAll(`.tube[data-idx="${idx}"]`);
                targets.forEach(t => t.classList.add('capped'));
                gameState.completedFlags[idx] = true;
            });
        }, 100);
    }
    renderSkills();
    requestAnimationFrame(() => {
        adjustBoardScale();
        if (resetScroll) {
            initInfiniteScroll();
        } else {
            if(slider) slider.scrollLeft = currentScrollPos;
        }
    });
}
function adjustBoardScale() {
    if (!boardArea || !tubesContainer) return;
    const availableH = boardArea.clientHeight;
    const contentH = tubesContainer.scrollHeight;
    if (contentH === 0) return;
    const targetH = availableH * 0.95; 
    let scale = targetH / contentH;
    scale = Math.min(Math.max(scale, 0.3), 1.5);
    tubesContainer.style.transform = `scale(${scale})`;
}
function renderSkills(){
    skillsContainer.innerHTML = '';
    const isHoldingColor = gameState.extractorHeldColor !== null;
    Object.keys(gameState.inventory).forEach(key => {
        const count = gameState.inventory[key];
        const def = ITEM_REGISTRY[key]; 
        if (!def) return;
        if (count > 0 || def.type === 'tool') {
            const btn = document.createElement('button');
            const isCurrentActiveTool = (key === 'pipette' && gameState.pipetteMode) || (gameState.targetMode === key);
            btn.disabled = isHoldingColor && !isCurrentActiveTool;
            btn.className = 'skill-btn w-12 h-12 glass-panel flex items-center justify-center text-xl rounded-full border border-white/10 shrink-0 relative';
            if (btn.disabled) {
                btn.classList.add('opacity-20', 'grayscale', 'pointer-events-none');
            }
            const name = currentLang === 'ja' ? def.name.ja : def.name.en;
            const desc = currentLang === 'ja' ? def.desc.ja : def.desc.en;
            let badgeHtml = '';
            if (def.type !== 'tool' && count > 0) {
                badgeHtml = `<span class="badge-count absolute -top-2 -right-2 bg-sky-500 text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full text-white pointer-events-none shadow-sm z-10 leading-none">${count}</span>`;
            }
            btn.innerHTML = `${def.icon}${badgeHtml}`;
            if (key === 'pipette' && gameState.pipetteMode) btn.classList.add('active');
            if (gameState.pendingSkill === key) btn.classList.add('pending');
            if (gameState.targetMode === key) btn.classList.add('active-mode');
            if (['extractor', 'transfer', 'quantum_pipette'].includes(gameState.targetMode) && key === gameState.targetMode) {
                if (gameState.extractorHeldColor) {
                    btn.classList.add('extracting');
                    btn.innerHTML = `<div style="width:16px;height:16px;border-radius:50%;background:${colorMeta(gameState.extractorHeldColor).hex};border:2px solid white;"></div>` + badgeHtml;
                }
            }
            btn.onclick = () => useItem(key);
            btn.onmouseenter = () => showGlobalTooltip(btn, name, desc);
            btn.onmouseleave = () => hideGlobalTooltip();
            skillsContainer.appendChild(btn);
        }
    });
}
function showFloatText(tubeIdx, text, color = "#38bdf8") {
    const targetEl = tubeCenterEl(tubeIdx);
    if (!targetEl) return;
    const rect = targetEl.getBoundingClientRect();
    const float = document.createElement('div');
    float.textContent = text;
    float.style.position = 'fixed';
    float.style.left = (rect.left + rect.width / 2) + 'px';
    float.style.top = rect.top + 'px';
    float.style.transform = 'translateX(-50%)'; 
    float.style.color = color;
    float.style.fontWeight = 'black';
    float.style.fontSize = '18px'; 
    float.style.zIndex = '300'; 
    float.style.pointerEvents = 'none';
    float.style.textShadow = '0 0 10px rgba(0,0,0,0.9), 0 2px 4px black';
    float.style.whiteSpace = 'nowrap';
    float.animate([
        { transform: 'translate(-50%, 0)', opacity: 1 },
        { transform: 'translate(-50%, -50px)', opacity: 0 }
    ], { 
        duration: 1200, 
        easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)' 
    });
    document.body.appendChild(float);
    setTimeout(() => float.remove(), 1200);
}
function tubeCenterEl(idx) {
    const els = ui('tubes-container').querySelectorAll(`.tube[data-idx="${String(idx)}"]`);
    if (els.length === 0) return null;
    const slider = ui('board-scroll-area');
    const sliderRect = slider.getBoundingClientRect();
    const centerX = sliderRect.left + sliderRect.width / 2;
    let closest = els[0];
    let minDist = Infinity;
    els.forEach(el => {
        const rect = el.getBoundingClientRect();
        const elCenterX = rect.left + rect.width / 2;
        const dist = Math.abs(centerX - elCenterX);
        if (dist < minDist) {
            minDist = dist;
            closest = el;
        }
    });
    return closest;
}
function animatePour(fromIdx, toIdx, colorKey, count){
    return new Promise((resolve) => {
        const primaryFrom = tubeCenterEl(fromIdx);
        const primaryTo = tubeCenterEl(toIdx);
        if (!primaryFrom || !primaryTo){ resolve(); return; }
        const isRight = primaryTo.getBoundingClientRect().left > primaryFrom.getBoundingClientRect().left;
        const fromEls = document.querySelectorAll(`.tube[data-idx="${fromIdx}"]`);
        const toEls = document.querySelectorAll(`.tube[data-idx="${toIdx}"]`);
        fromEls.forEach(fromEl => {
            const fromWater = fromEl.querySelector('.water-container');
            const shrinkSegments = [];
            for(let i=0; i<count; i++) {
                if(fromWater.children.length > i) {
                    shrinkSegments.push(fromWater.children[fromWater.children.length - 1 - i]);
                }
            }
            fromEl.style.transition = 'transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)';
            fromEl.style.transform = `translateY(-10px) rotate(${isRight ? 45 : -45}deg)`;
            fromEl.style.zIndex = 50;
            setTimeout(() => {
                shrinkSegments.forEach(seg => { 
                    if(seg) { 
                        seg.style.height = '0px'; 
                        seg.style.opacity = '0'; 
                        seg.style.borderTop = 'none'; 
                    } 
                });
            }, 50);
        });
        setTimeout(() => {
            toEls.forEach(toEl => {
                const toWater = toEl.querySelector('.water-container');
                for(let i=0; i<count; i++){
                    const newSeg = document.createElement('div'); 
                    newSeg.className = 'water-segment'; 
                    if (colorKey === 'K') {
                        newSeg.classList.add('void-ink');
                    }
                    newSeg.style.backgroundColor = colorMeta(colorKey).hex;
                    newSeg.style.height = '0px'; 
                    newSeg.style.opacity = '0.5'; 
                    toWater.appendChild(newSeg); 
                    void newSeg.offsetWidth;
                    newSeg.style.height = 'var(--segment-height)'; 
                    newSeg.style.opacity = '1';
                }
            });
        }, 50);
        setTimeout(() => { 
            fromEls.forEach(fromEl => {
                fromEl.style.transform = ''; 
                fromEl.style.zIndex = ''; 
            });
            resolve(); 
        }, 400); 
    });
}
function renderHUD(){
    updateFloorDisplayEffect();
    setText('ui-floor', `${t('floor')} ${gameState.floor}`); 
    setText('ui-essence', `✨ ${gameState.essence}`); 
    const hpPct = (gameState.hp / gameState.maxHp) * 100;
    const hpStr = `HP ${gameState.hp}`;
    const hpBar = ui('ui-hp-bar');
    if(hpBar) hpBar.style.width = `${clamp(hpPct, 0, 100)}%`;
    setText('ui-hp-text', hpStr);
    const hpMobileBar = ui('ui-hp-mobile-bar');
    if(hpMobileBar) hpMobileBar.style.width = `${clamp(hpPct, 0, 100)}%`;
    setText('ui-hp-mobile-text', hpStr);
    setText('ui-floor-mobile', `B${gameState.floor}F`); 
    setText('ui-essence-mobile', `✨${gameState.essence}`); 
        const totalLevels = Object.values(gameState.perks).reduce((a,b)=>a+b, 0); 
    setText('ui-turn', `${t('turn')} ${gameState.turnCount}`); 
    const goalEl = ui('ui-goal');
    if (gameState.primaryGoal) {
        const label = currentLang === 'ja' ? "目標：" : "Goal: ";
        let goalContent = "";
        const type = gameState.primaryGoal.type;
        if (type === 'completeAll') {
            goalContent = currentLang === 'ja' ? 'すべての色を完成' : 'Complete All Colors';
        } else if (type === 'completeN') {
            const n = gameState.primaryGoal.n;
            goalContent = currentLang === 'ja' ? `いずれか${n}色を完成` : `Complete any ${n} colors`;
        } else if (type === 'completeColor') {
            const c = gameState.primaryGoal.color;
            goalContent = currentLang === 'ja' ? `${colorName(c)}を完成` : `Complete ${colorName(c)}`;
            const meta = COLOR_POOL.find(x => x.key === c);
            if (meta) {
                const icon = `<span style="color:${meta.hex}; text-shadow:0 0 12px ${meta.hex}; margin-right:4px;">■</span>`;
                goalContent = `${icon}${goalContent}`;
            }
        }
        goalEl.innerHTML = `<span class="text-slate-400 font-bold mr-1">${label}</span>${goalContent}`;
    } else {
        goalEl.textContent = '—';
    }
    const goalSubEl = ui('ui-goal-sub');
    if (gameState.secondaryGoal) {
        const isDone = secondarySucceeded();
        const type = gameState.secondaryGoal.type;
        const subLabel = currentLang === 'ja' ? "サブ：" : "Sub Goal: ";
        let contentText = "";
        if (type === 'speed') {
            const lim = gameState.secondaryGoal.limit;
            contentText = currentLang === 'ja' ? `${lim}ターン以内に1本完成` : `Complete 1 within ${lim} turns`;
        } else if (type === 'combo') {
            contentText = currentLang === 'ja' ? '連続完成（コンボ）' : 'Combo: 2 in a row';
        }
        goalSubEl.classList.remove('text-yellow-400', 'text-emerald-400', 'text-slate-500');
        goalSubEl.classList.add(isDone ? 'text-emerald-400' : 'text-yellow-400');
        let statusSuffix = isDone ? (currentLang === 'ja' ? " 【達成!!】" : " [CLEARED!]") : "";
        let progressInfo = "";
        if (!isDone && type === 'combo') {
            progressInfo = ` (${gameState.secondaryProgress}/${gameState.secondaryGoal.need})`;
        }
        goalSubEl.innerHTML = `<span class="text-slate-400 font-bold mr-1">${subLabel}</span>${contentText}${progressInfo}${statusSuffix}`;
    } else {
        goalSubEl.textContent = '—';
        goalSubEl.classList.add('text-slate-500');
    }
    const pressureLabel = ui('ui-pressure-label');
    if (pressureLabel) {
        pressureLabel.textContent = currentLang === 'ja' ? 'プレッシャー' : 'PRESSURE';
    }
    const curP = gameState.pressure;
    const maxP = gameState.pressureMax;
    const pct = Math.round((curP / maxP) * 100);
    const pBar = ui('ui-pressure-bar'); 
    if(pBar){ 
        pBar.style.width = `${clamp(pct, 0, 100)}%`; 
        if(curP >= maxP - 3){ 
            pBar.classList.remove('from-sky-400'); 
            pBar.classList.add('bg-rose-600'); 
        } else { 
            pBar.classList.add('from-sky-400'); 
            pBar.classList.remove('bg-rose-600'); 
        } 
    }
    const pSubEl = ui('ui-pressure-sub');
    if (pSubEl) {
        let displayText = `${curP} / ${maxP}`;
        const steadyHandLv = getPerkLevel('steady_hand');
        const steadyHandTurns = Math.max(0, (steadyHandLv * 3) - gameState.turnCount);
        const totalImmuneTurns = gameState.momentumTurns + steadyHandTurns;
        if (totalImmuneTurns > 0) {
            pSubEl.innerHTML = `${displayText} <span class="text-sky-400 font-black ml-1" style="text-shadow: -1px -1px 0 #024, 1px -1px 0 #024, -1px 1px 0 #024, 1px 1px 0 #024;">(${totalImmuneTurns})</span>`;
        } else {
            pSubEl.textContent = displayText;
        }
    }
    let undoCost = `✨${UNDO_COST}`;
    if (gameState.refluxUses > 0) {
        undoCost = `FREE x${gameState.refluxUses}`;
    }
    if(undoBtn){ 
        undoBtn.innerHTML=`<span>↺</span> UNDO (${undoCost})`;
        const canUndo = gameState.history.length > 0;
        undoBtn.disabled = !canUndo;
        undoBtn.style.opacity = canUndo ? '1' : '0.3';
        undoBtn.style.cursor = canUndo ? 'pointer' : 'not-allowed';
        undoBtn.style.pointerEvents = canUndo ? 'auto' : 'none';
    } 
    renderSkills();
}
function updateFloorDisplayEffect() {
    const f = gameState.floor;
    const desktopFloor = ui('ui-floor');
    const mobileFloor = ui('ui-floor-mobile');
    const targets = [desktopFloor, mobileFloor];
    const effects = ['text-sky-400', 'text-yellow-500', 'text-rose-500', 'text-purple-500', 'text-white', 'animate-pulse', 'abyss-glitch', 'border-white/10', 'border-rose-500/50', 'border-purple-500/50', 'border-white'];
    targets.forEach(el => {
        if (!el) return;
        el.classList.remove(...effects);
        if (f >= 31) {
            el.classList.add('text-white', 'abyss-glitch');
            if (el.id === 'ui-floor-mobile') el.classList.add('border-white');
        } else if (f >= 21) {
            el.classList.add('text-purple-500', 'animate-pulse');
            if (el.id === 'ui-floor-mobile') el.classList.add('border-purple-500/50');
        } else if (f >= 11) {
            el.classList.add('text-rose-500');
            if (el.id === 'ui-floor-mobile') el.classList.add('border-rose-500/50');
        } else if (f >= 6) {
            el.classList.add('text-yellow-500');
        } else {
            el.classList.add('text-sky-400');
            if (el.id === 'ui-floor-mobile') el.classList.add('border-white/10');
        }
        if (el.id === 'ui-floor') {
            el.textContent = `${t('floor')} ${f}`;
        } else {
            el.textContent = `${f}F`;
        }
    });
}
function moveFocus(dx){ if(!gameState.tubes.length) return; gameState.focusIdx = gameState.focusIdx === null ? 0 : (gameState.focusIdx + dx + gameState.tubeCount) % gameState.tubeCount; renderBoard(); }
function getBoardScale() {
    const boardArea = document.getElementById('board-area');
    const tubesContainer = document.getElementById('tubes-container');
    if (!boardArea || !tubesContainer) return 1;
    const availableH = boardArea.clientHeight;
    const contentH = tubesContainer.scrollHeight;
    if (contentH === 0) return 1;
    const targetH = availableH * 0.95;
    let scale = targetH / contentH;
    return Math.min(Math.max(scale, 0.3), 1.5);
}
function initInfiniteScroll() {
    const slider = document.getElementById('board-scroll-area');
    const tubesContainer = document.getElementById('tubes-container');
    const tubeEl = tubesContainer.querySelector('.tube');
    if(!tubeEl) return;
    const style = window.getComputedStyle(tubeEl);
    const marginLeft = parseFloat(style.marginLeft) || 0;
    const marginRight = parseFloat(style.marginRight) || 0;
    const containerStyle = window.getComputedStyle(tubesContainer);
    const gap = parseFloat(containerStyle.gap) || 0;
    const rawItemWidth = tubeEl.offsetWidth + marginLeft + marginRight + gap;
    const scale = getBoardScale();
    const scaledItemWidth = rawItemWidth * scale;
    const totalTubes = gameState.tubes.length;
    const scaledCloneWidth = scaledItemWidth * CLONE_PADDING;
    const centerOfScreen = slider.clientWidth / 2;
    const firstTubeCenter = scaledCloneWidth + (scaledItemWidth / 2);
    const initialScrollPos = firstTubeCenter - centerOfScreen;
    slider.scrollLeft = Math.round(initialScrollPos);
}
function checkInfiniteScrollLoop() {
    if(!gameState.tubes.length) return;
    const slider = document.getElementById('board-scroll-area');
    const currentScroll = slider.scrollLeft;
    const scrollWidth = slider.scrollWidth;
    const clientWidth = slider.clientWidth;
    const maxScroll = scrollWidth - clientWidth;
    const totalItems = gameState.tubeCount + (CLONE_PADDING * 2);
    const singleTubeWidth = scrollWidth / totalItems;
    const contentWidth = singleTubeWidth * gameState.tubeCount;
    const buffer = singleTubeWidth * 1.5;
    if (currentScroll >= maxScroll - buffer) {
        slider.scrollLeft = currentScroll - contentWidth;
    } 
    else if (currentScroll <= buffer) {
        slider.scrollLeft = currentScroll + contentWidth;
    }
}
function showFloatTextAtCenter(text, color = "#38bdf8") {
    const area = ui('board-area');
    if (!area) return;
    const rect = area.getBoundingClientRect();
    const float = document.createElement('div');
    float.textContent = text;
    float.style.position = 'fixed';
    float.style.left = (rect.left + rect.width / 2) + 'px';
    float.style.top = (rect.top + rect.height / 2) + 'px';
    float.style.transform = 'translateX(-50%)';
    float.style.color = color;
    float.style.fontWeight = 'black';
    float.style.fontSize = '20px';
    float.style.zIndex = '300';
    float.style.pointerEvents = 'none';
    float.style.textShadow = '0 0 10px rgba(0,0,0,0.9), 0 2px 4px black';
    float.style.whiteSpace = 'nowrap';
    float.animate([
        { transform: 'translate(-50%, 0)', opacity: 1 },
        { transform: 'translate(-50%, -50px)', opacity: 0 }
    ], { duration: 1400, easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)' });
    document.body.appendChild(float);
    setTimeout(() => float.remove(), 1400);
}
