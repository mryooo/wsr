// actions.js — プレイヤー操作の実行(注ぐ、アイテム、完成処理、Undo、階層遷移)
let preExtractionState = null; // two_stepアイテムの抽出前スナップショット
function onLevelClear(){
    if (gameState.busy) return;
    gameState.busy = true;
    const baseReward = FLOOR_CLEAR_BASE_REWARD;
    const floorBonus = Math.min(FLOOR_CLEAR_BONUS_CAP, gameState.floor - 1);
    const subGoalBonus = secondarySucceeded() ? SUBGOAL_REWARD : 0;
    const totalGained = baseReward + floorBonus + subGoalBonus;
    gameState.essence += totalGained;
    renderHUD(); 
    renderBoard();
    const msg = currentLang === 'ja' 
        ? `階層クリア! ✨+${totalGained} (基本:${baseReward}${floorBonus > 0 ? ` 階層:+${floorBonus}` : ''}${subGoalBonus > 0 ? ` サブ:+${subGoalBonus}` : ''})`
        : `Floor Cleared! ✨+${totalGained} (Base:${baseReward}${floorBonus > 0 ? ` Floor:+${floorBonus}` : ''}${subGoalBonus > 0 ? ` SubGoal:+${subGoalBonus}` : ''})`;
    showToast(msg, subGoalBonus > 0 ? 'emerald' : 'sky');
    saveGame();
    setTimeout(() => {
        gameState.busy = false;
        openPerkScreen(false);
    }, 1500);
}
function useItem(key) {
    if (gameState.busy) return;
    if (gameState.extractorHeldColor) {
        cancelInteraction(); 
        return;
    }
    const item = ITEM_REGISTRY[key];
    if (!item) return;
    if (gameState.pendingSkill !== key) {
        gameState.pendingSkill = key;
        gameState.targetMode = null;
        gameState.pipetteMode = false;
        const name = currentLang === 'ja' ? item.name.ja : item.name.en;
        const msg = currentLang === 'ja' ? `${name}: もう一度タップして使用` : `${name}: Tap again to use`;
        showToast(msg, 'yellow');
        renderSkills();
        renderBoard(); 
        return; 
    }
    if (item.type !== 'tool' && (!gameState.inventory[key] || gameState.inventory[key] <= 0)) {
        return;
    }
    gameState.pendingSkill = null; 
    if (item.behaviorType === 'instant') {
        const result = item.effect(gameState);
        if (result.success) {
            if (item.type !== 'tool' && item.cost > 0) gameState.inventory[key]--;
            showToast(currentLang === 'ja' ? result.msg.ja : result.msg.en, result.color || 'emerald');
            if (result.requiresRender) {
                updateTubeLayout();
                renderBoard();
            }
            if (result.isMystery) {
                refreshRerollUI();
                updateShopButtons();
                const sc = document.getElementById('shop-cards');
                if (sc && gameState.currentShopOffers) {
                    sc.innerHTML = '';
                    gameState.currentShopOffers.forEach(o => sc.appendChild(buildShopCard(o)));
                }
            }
            renderHUD();
            saveGame();
        } else {
            showToast(currentLang === 'ja' ? result.msg.ja : result.msg.en, result.color || 'yellow');
        }
        renderSkills();
        return;
    }
    if (item.behaviorType === 'target_effect' || item.behaviorType === 'two_step') {
        gameState.targetMode = key;
        if (key === 'pipette') gameState.pipetteMode = true;
        showToast(currentLang === 'ja' ? "対象を選択してください" : "Select target", 'sky');
        renderSkills(); 
        renderBoard();  
    }
}
function cancelInteraction() {
    if (gameState.extractorHeldColor !== null && gameState.extractorSourceIdx !== null) {
        const sourceTube = gameState.tubes[gameState.extractorSourceIdx];
        if (gameState.targetMode === 'quantum_pipette') {
            sourceTube.unshift(gameState.extractorHeldColor);
        } else {
            sourceTube.push(gameState.extractorHeldColor);
        }
        const msg = currentLang === 'ja' ? '操作をキャンセルしました' : 'Action Cancelled';
        showToast(msg, 'slate');
    }
    gameState.extractorHeldColor = null;
    gameState.extractorSourceIdx = null;
    gameState.targetMode = null;
    gameState.pipetteMode = false;
    preExtractionState = null;
    renderBoard();
    renderSkills();
}
async function applyItemToTube(idx) {
    const key = gameState.targetMode;
    const item = ITEM_REGISTRY[key];
    if (!item) return;
    if (gameState.completedFlags[idx]) {
        showFloatText(idx, "Locked!", "#94a3b8");
        return;
    }
    const tube = gameState.tubes[idx];
    if (item.behaviorType === 'two_step') {
        if (!gameState.extractorHeldColor) {
            if (tube.length === 0) { showFloatText(idx, "Empty!", "#ef4444"); return; }
            preExtractionState = deepCopy(gameState.tubes);
            gameState.extractorHeldColor = item.extractLogic(tube);
            gameState.extractorSourceIdx = idx;
            showFloatText(idx, "Extracted!", "#22c55e");
            showToast(currentLang === 'ja' ? '配置先を選択' : 'Select Target', 'emerald');
            renderBoard(); renderSkills();
            return;
        } else {
            if (tubeFree(tube) <= 0) { showFloatText(idx, "Full!", "#ef4444"); return; }
            pushHistory();
            gameState.history[gameState.history.length - 1].tubes = preExtractionState;
            item.placeLogic(tube, gameState.extractorHeldColor);
            const placedColor = gameState.extractorHeldColor;
            gameState.extractorHeldColor = null; gameState.extractorSourceIdx = null;
            consumeItem(key, item);
            showFloatText(idx, "Placed!", "#22c55e");
            await finalizeItemAction(idx, placedColor);
            preExtractionState = null;
            return;
        }
    }
    if (item.behaviorType === 'target_effect') {
        const check = item.canUseOn(tube, gameState.capacity);
        if (!check.ok) { showFloatText(idx, check.msg || "Invalid!", "#ef4444"); return; }
        pushHistory(); gameState.busy = true;
        try {
            const result = item.apply(tube);
            if (result.success) {
                showFloatText(idx, result.floatText, result.color);
                if (result.essenceDelta) gameState.essence += result.essenceDelta;
                consumeItem(key, item);
                let checkColor = tube.length > 0 ? tube[0] : null;
                if (result.removedColor) checkColor = result.removedColor;
                await finalizeItemAction(idx, checkColor);
            }
        } catch (e) { console.error(e); gameState.history.pop(); gameState.busy = false; }
    }
}
function consumeItem(key, item) {
    if (item.type === 'tool') return;
    if (hasPerk('recycler') && Math.random() < getPerkLevel('recycler') * 0.1) { showToast("Recycled!", 'purple'); return; }
    gameState.inventory[key]--;
    gameState.targetMode = null; gameState.pendingSkill = null;
    if (key === 'pipette') gameState.pipetteMode = false;
}
async function finalizeItemAction(idx, colorHint) {
    gameState.busy = false; renderHUD(); renderBoard(); saveGame();
    const tube = gameState.tubes[idx];
    if (tube && isCompleteTube(tube)) { await handleCompletion(idx, tube[0] || colorHint); }
    if (checkLevelClear()) { onLevelClear(); }
}
async function handleTubeClick(idx) {
    hideGlobalTooltip();
    if (gameState.busy) return;
    if (gameState.targetMode) {
        await applyItemToTube(idx);
        renderSkills(); 
        return;
    }
    if (gameState.pendingSkill !== null) {
        gameState.pendingSkill = null;
        renderSkills();
    }
    const content = gameState.tubes[idx];
    if (gameState.selectedIdx === idx) {
        gameState.selectedIdx = null;
        renderBoard();
        return;
    }
    if (gameState.selectedIdx === null) {
        if (content.length === 0 || isCompleteTube(content)) return;
        gameState.selectedIdx = idx;
        renderBoard();
    } else {
        await tryPour(gameState.selectedIdx, idx);
    }
}
async function tryPour(fromIdx, toIdx) {
    const check = canPour(fromIdx, toIdx);
    if (!check.ok) {
        const content = gameState.tubes[toIdx];
        gameState.selectedIdx = (content.length > 0 && !isCompleteTube(content)) ? toIdx : null;
        renderBoard();
        return;
    }
    gameState.busy = true;
    try {
        pushHistory();
        const steadyHandActive = (hasPerk('steady_hand') && gameState.turnCount < getPerkLevel('steady_hand') * 3);
        const momentumActive = (gameState.momentumTurns > 0);
        let pressureImmune = steadyHandActive || momentumActive;
        if (!steadyHandActive && momentumActive) {
            gameState.momentumTurns--;
        }
        let isOverloaded = false;
        if (!pressureImmune) {
            isOverloaded = addPressure(PRESSURE_PER_POUR);
        }
        gameState.turnCount += 1;
        await animatePour(fromIdx, toIdx, check.color, check.moveCount);
        const from = gameState.tubes[fromIdx], to = gameState.tubes[toIdx];
        for (let i = 0; i < check.moveCount; i++) to.push(from.pop());
        if (isOverloaded) {
            await applyPressureDamage(false);
        }
        const counts = getBoardCounts();
        if (isCompleteTube(to, counts)) {
            await handleCompletion(toIdx, to[0]);
        } else if (gameState.secondaryGoal?.type === 'combo' && !secondarySucceeded()) {
            gameState.secondaryProgress = 0;
        }
        saveGame();
    } catch (e) {
        console.error("Pour logic error:", e);
    } finally {
        gameState.selectedIdx = null;
        gameState.busy = false;
        renderHUD();
        renderBoard();
        if (gameState.hp <= 0) {
            gameState.hp = 0;
            renderHUD();
            clearSave();
            openPerkScreen(true);
        } else if (checkLevelClear()) {
            onLevelClear();
        }
    }
}
async function handleCompletion(tubeIdx, colorKey) {
    const tubeEls = document.querySelectorAll(`.tube[data-idx="${tubeIdx}"]`);
    if (colorKey === 'K') {
        gameState.busy = true;
        const segmentCount = gameState.tubes[tubeIdx].length;
        const reward = Math.floor(segmentCount * 1.0); 
        gameState.essence += reward;
        showToast(`Purged! ✨+${reward}`, 'slate');
        if (hasPerk('purification')) {
            const lv = getPerkLevel('purification');
            gameState.pressure = Math.max(0, gameState.pressure - (2 + lv));
            gameState.essence += (1 + lv);
        }
        tubeEls.forEach(el => el.classList.add('evaporating'));
        await new Promise(r => setTimeout(r, 800));
        gameState.tubes[tubeIdx] = []; 
        gameState.completedFlags[tubeIdx] = false;
        tubeEls.forEach(el => {
            el.classList.remove('evaporating');
            const water = el.querySelector('.water-container');
            if (water) delete water.dataset.lastState;
        });
        gameState.busy = false;
        renderHUD(); 
        renderBoard(); 
        if (checkLevelClear()) onLevelClear(); 
        return; 
    }
    if (hasPerk('catalyst') && gameState.catalystAvailable) {
        const lv = getPerkLevel('catalyst'); 
        gameState.pressure = Math.max(0, gameState.pressure - (4 + lv));
        gameState.catalystAvailable = false; 
        showToast("Catalyst! Pressure Down", 'sky');
    }
    if (hasPerk('efficiency') && Math.random() < getPerkLevel('efficiency') * 0.20) {
        gameState.essence += 1;
        showToast("Efficient! +1 Essence", 'yellow');
    }
    if (colorKey === 'R' && hasPerk('crimson_resonance')) {
        gameState.hp = Math.min(gameState.maxHp, gameState.hp + 1);
        showToast("Resonance! HP+1 / Pressure Up", 'rose');
        const cost = Math.max(0, 6 - getPerkLevel('crimson_resonance'));
        if (addPressure(cost)) {
            await applyPressureDamage();
        }
    }
    if (colorKey === 'B' && hasPerk('azure_cycle')) {
        const amount = getPerkLevel('azure_cycle') * 3;
        gameState.pressure = Math.max(0, gameState.pressure - amount);
        showToast(`Cycle! -${amount} Pressure`, 'blue');
    }
    if (colorKey === 'Y' && hasPerk('amber_greed')) {
        const amount = getPerkLevel('amber_greed') * 2;
        gameState.essence += amount;
        showToast(`Alchemy! +${amount} Essence`, 'amber');
    }
    if (colorKey === 'W' && hasPerk('ivory_sanctuary')) {
        const amount = getPerkLevel('ivory_sanctuary');
        for(let i=0; i<amount; i++) removeOneObsidian();
        showToast("Sanctuary! Purged", 'slate');
    }
    if (colorKey === 'G' && hasPerk('emerald_vitality')) {
        const lv = getPerkLevel('emerald_vitality');
        const ratio = Math.min(0.9, 0.4 + (lv * 0.1));
        const percentReduction = Math.floor(gameState.pressure * ratio);
        const totalReduction = percentReduction + lv;
        gameState.pressure = Math.max(0, gameState.pressure - totalReduction);
        showToast(`Emerald Vitality! -${totalReduction} Pressure`, 'emerald');
    }
    if (colorKey === 'P' && hasPerk('amethyst_surge')) {
        const amount = getPerkLevel('amethyst_surge');
        gameState.refluxUses += amount;
        showToast(`Surge! Undo+${amount}`, 'purple');
    }
    if (colorKey === 'O' && hasPerk('orange_drive')) {
        const turns = getPerkLevel('orange_drive') * 2;
        gameState.momentumTurns += turns;
        showToast(`Drive! Momentum+${turns}`, 'orange');
    }
    if (colorKey === 'T' && hasPerk('teal_equilibrium')) {
        gameState.secondaryProgress += 1;
        showToast("Analysis! Goal+1", 'cyan');
    }
    if (colorKey === 'M' && hasPerk('pink_luck')) {
        if(Math.random() < getPerkLevel('pink_luck') * 0.10){
            const k = getValidRandomConsumable();
            if (k) {
                gameState.inventory[k] = (gameState.inventory[k] || 0) + 1;
                const item = ITEMS[k];
                const itemName = currentLang === 'ja' ? item.name.ja : item.name.en;
                const msg = currentLang === 'ja' ? `${item.icon} ${itemName} を獲得` : `${item.icon} ${itemName} Obtained`;
                showFloatText(tubeIdx, msg, '#f472b6');
                showToast(msg, 'pink');
            }else {
                const reward = 5;
                gameState.essence += reward;
                const msg = currentLang === 'ja' ? `所持数上限: ✨+${reward}` : `Max Inventory: ✨+${reward}`;
                showToast(msg, 'slate');
        }
        }
    }
    if(hasPerk('heavy_mastery') && gameState.capacity >= 5){
        const lv = getPerkLevel('heavy_mastery'); 
        gameState.pressure = Math.max(0, gameState.pressure - (2 + lv));
        showToast("Heavy Mastery! Pressure Down", 'indigo');
    }
if(hasPerk('momentum')) {
        const lv = getPerkLevel('momentum'); 
        gameState.momentumTurns += lv;
        showToast(`Momentum! +${lv} Turns`, 'violet');
    }
    checkSecondaryGoalOnComplete(); 
    renderHUD();
    renderBoard();
    saveGame(); 
    await showCompletionEvent(colorKey);
    if (checkLevelClear()) onLevelClear();
}
async function applyPressureDamage(visualOnly = false) {
    if (!visualOnly) {
        if (hasPerk('void_shield') && Math.random() < getPerkLevel('void_shield') * 0.15) {
            showToast("Void Shield!", "#a855f7");
            return;
        }
        gameState.hp -= 1;
    }
    const container = ui('game-container');
    container.classList.remove('animate-shake');
    void container.offsetWidth;
    container.classList.add('animate-shake');
    await corruptRandomSegment();
    const msg = currentLang === 'ja' ? "オーバーロード！ HP-1" : "Pressure Overload! HP -1";
    showToast(msg, "#ef4444");
    renderHUD();
    renderBoard();
    await new Promise(r => setTimeout(r, 500));
}
function corruptRandomSegment() {
    return new Promise((resolve) => {
        const candidates = gameState.tubes
            .map((t, i) => ({ idx: i, length: t.length }))
            .filter(t => {
                if (gameState.completedFlags[t.idx]) return false;
                if (t.length >= gameState.capacity) return false;
                const top = gameState.tubes[t.idx].length > 0 ? gameState.tubes[t.idx][gameState.tubes[t.idx].length - 1] : null;
                return top !== 'K';
            });
        const shuffledCandidates = candidates.sort(() => Math.random() - 0.5);
        let placed = false;
        for (let candidate of shuffledCandidates) {
            gameState.tubes[candidate.idx].push('K');
            if (!isDeadlocked()) {
                placed = true;
                renderBoard();
                showFloatText(candidate.idx, "CORRUPTED", "#ef4444");
                break;
            } else {
                gameState.tubes[candidate.idx].pop();
            }
        }
        if (!placed) {
            const loss = 5;
            if (gameState.essence > 0) {
                gameState.essence = Math.max(0, gameState.essence - loss);
                renderHUD();
                const msg = currentLang === 'ja' 
                    ? `行き場のない呪いがエッセンスを蝕んだ -${loss}` 
                    : `Corruption overflow! Essence -${loss}`;
                showToast(msg, 'purple');
            } else {
                const msg = currentLang === 'ja' 
                    ? "奇跡的に呪いを回避した..." 
                    : "Miraculously avoided corruption...";
                showToast(msg, 'slate');
            }
        }
        resolve();
    });
}
function startNewRun() {
    clearSave();
    let startFloor = 1;
    let effectiveDebug = IS_DEBUG;
    if (IS_DEBUG) {
        const input = ui('debug-floor-input');
        startFloor = parseInt(input.value) || 0;
        if (startFloor <= 0) {
            effectiveDebug = false;
            startFloor = 1;
        }
    }
    gameState.isExecutionDebug = effectiveDebug;
    startScreen.classList.add('hidden');
    let initialCapacity = 4;
    if (startFloor >= 12) initialCapacity = 8;
    else if (startFloor >= 8) initialCapacity = 6;
    else if (startFloor >= 4) initialCapacity = 5;
    Object.assign(gameState, {
        floor: startFloor,
        essence: effectiveDebug ? 9999 : 0,
        hp: 3,
        maxHp: 3,
        capacity: initialCapacity,
        perks: {},
        pressure: 0,
        pressureMax: PRESSURE_MAX_BASE,
        history: [],
        inventory: effectiveDebug ? Object.keys(ITEMS).reduce((acc, key) => ({ ...acc, [key]: 3 }), {}) : {},
        catalystAvailable: true,
        refluxUses: 0, // perksは同時にリセットされるため必ず0から開始
        momentumTurns: 0,
        rerollCoupons: 0,
        completedFlags: []
    });
    perkScreen.classList.add('hidden');
    generateBoard();
    generateGoals();
    renderHUD();
    renderBoard(true);
    saveGame();
    if (effectiveDebug) {
        showToast(`Debug Start: Floor ${startFloor}`, 'rose');
    } else {
    }
}
function nextFloor(isFirst=false){
    const rewards = [];
    if(!isFirst) {
        gameState.floor++; 
        if (gameState.floor >= 12) gameState.capacity = 8;
        else if (gameState.floor >= 8) gameState.capacity = 6; 
        else if (gameState.floor >= 4) gameState.capacity = 5; 
        else gameState.capacity = 4;
        gameState.completedFlags = [];
        if (hasPerk('scavenger') && Math.random() < (0.10 + getPerkLevel('scavenger') * 0.05)) {
            const k = getValidRandomConsumable();
            if (k) {
                gameState.inventory[k] = (gameState.inventory[k] || 0) + 1;
                rewards.push({ key: k, source: 'scavenger' });
            }
        }
        if (hasPerk('transmutation')) {
            for (let i = 0; i < getPerkLevel('transmutation'); i++) {
                const k = getValidRandomConsumable();
                if (k) {
                    gameState.inventory[k] = (gameState.inventory[k] || 0) + 1;
                    rewards.push({ key: k, source: 'transmutation' });
                }
            }
        }
        if(hasPerk('coupon')) gameState.rerollCoupons += getPerkLevel('coupon');
    }
    const baseMaxHp = 3; 
    let bonusHp = 0;
    if(hasPerk('deep_adapt') && gameState.capacity > 4){ 
        bonusHp = getPerkLevel('deep_adapt'); 
    }
    const oldMaxHp = gameState.maxHp;
    gameState.maxHp = baseMaxHp + bonusHp;
    if (gameState.maxHp > oldMaxHp) {
        gameState.hp += (gameState.maxHp - oldMaxHp);
    }
    gameState.hp = Math.min(gameState.hp, gameState.maxHp);
    const defaultPressureMax = PRESSURE_MAX_BASE;
    const nextPressure = isFirst ? 0 : gameState.pressure;
    Object.assign(gameState, { 
        turnCount:0, 
        pressure: nextPressure, 
        pressureMax: defaultPressureMax, 
        catalystAvailable:true, 
        momentumTurns:0, 
        refluxUses:getPerkLevel('reflux'), 
        currentPerkChoices:null, 
        currentShopOffers:null, 
        selectedIdx:null, 
        busy:false, 
        targetMode:null, 
        pipetteMode:false, 
        pendingSkill:null, 
        extractorHeldColor:null,
        history: [],
        completedFlags: [] 
    });
    if(hasPerk('overflow')) {
        gameState.pressureMax = defaultPressureMax + (getPerkLevel('overflow') * 4);
    }
    generateBoard(); 
    generateGoals(); 
    renderHUD(); 
    renderBoard(true);
    saveGame();
    setTimeout(() => {
        showFloorStartSequence(rewards);
    }, 600);
}
function showFloorStartSequence(rewards) {
    const floorMsg = currentLang === 'ja' ? `第 ${gameState.floor} 階層` : `FLOOR ${gameState.floor}`;
    showToast(floorMsg, 'sky');
    if (rewards.length === 0) return;
    const summary = rewards.reduce((acc, curr) => {
        acc[curr.key] = (acc[curr.key] || 0) + 1;
        return acc;
    }, {});
    setTimeout(() => {
        Object.entries(summary).forEach(([key, count], index) => {
            const item = ITEMS[key];
            const itemName = currentLang === 'ja' ? item.name.ja : item.name.en;
            const msg = currentLang === 'ja' 
                ? `${item.icon} ${itemName} を獲得 (x${count})` 
                : `${item.icon} ${itemName} Obtained (x${count})`;
            setTimeout(() => {
                showToast(msg, 'emerald');
                if (index === 0) {
                    showFloatTextAtCenter(msg, '#10b981');
                }
            }, index * 300);
        });
    }, 500);
}
function tryUndo(){
    if (gameState.busy) return;
    if (!gameState.history.length) return;
    const prev = gameState.history[gameState.history.length - 1];
    let isFree = gameState.refluxUses > 0;
    if(!isFree && gameState.essence < UNDO_COST) {
        showToast(currentLang==='ja'?'エッセンス不足で戻れません':'Not enough Essence in past state', 'rose');
        return;
    }
    gameState.history.pop();
    const currentHP = gameState.hp;
    const currentEssence = gameState.essence;
    const currentPressure = gameState.pressure;
    const currentTurn = gameState.turnCount;
    Object.assign(gameState, { 
        tubes: deepCopy(prev.tubes), 
        hp: currentHP,
        essence: currentEssence,
        pressure: currentPressure,
        turnCount: currentTurn,
        secondaryProgress: prev.secondaryProgress, 
        catalystAvailable: prev.catalystAvailable, 
        inventory: {...prev.inventory}, 
        tubeCount: prev.tubeCount, 
        capacity: prev.capacity || 4, 
        momentumTurns: prev.momentumTurns, 
        refluxUses: prev.refluxUses,
        completedFlags: prev.completedFlags ? [...prev.completedFlags] : [],
        targetMode: null, 
        pendingSkill: null, 
        extractorHeldColor: null, 
        extractorSourceIdx: null,
        pipetteMode: false,
        selectedIdx: null
    });
    if(isFree){ 
        gameState.pressure += 2; 
        gameState.refluxUses--; 
        showFloatText(0, `Reflux Used (${gameState.refluxUses} left)`, "#a855f7");
    } else { 
        gameState.essence -= UNDO_COST; 
    }
    document.querySelectorAll('.water-container').forEach(el => {
        delete el.dataset.lastState;
    });
    updateTubeLayout(); 
    renderHUD(); 
    renderBoard(); 
    saveGame();
}
