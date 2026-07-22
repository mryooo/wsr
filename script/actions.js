// actions.js — プレイヤー操作の実行(注ぐ、アイテム、完成処理、Undo、階層遷移)
let preExtractionState = null; // two_stepアイテムの抽出前スナップショット
function onLevelClear(){
    if (gameState.busy) return;
    gameState.busy = true;
    const systemResult = resolveFloorSystems();
    const baseReward = FLOOR_CLEAR_BASE_REWARD;
    const floorBonus = Math.min(FLOOR_CLEAR_BONUS_CAP, gameState.floor - 1);
    const subGoalBonus = secondarySucceeded() ? SUBGOAL_REWARD : 0;
    const bossBonus = gameState.bossState?.defeated
        ? BOSS_CLEAR_REWARD + (gameState.bossState.usedItemTypes.length * BOSS_ITEM_VARIETY_REWARD)
        : 0;
    const contractMultiplier = getContractRewardMultiplier();
    const standardReward = baseReward + floorBonus + subGoalBonus + bossBonus;
    const totalGained = Math.round(standardReward * contractMultiplier) + systemResult.anomalyReward;
    gameState.essence += totalGained;
    renderHUD(); 
    renderBoard();
    const msg = currentLang === 'ja' 
        ? `階層クリア! ✨+${totalGained} (基本:${baseReward}${floorBonus > 0 ? ` 階層:+${floorBonus}` : ''}${subGoalBonus > 0 ? ` サブ:+${subGoalBonus}` : ''})`
        : `Floor Cleared! ✨+${totalGained} (Base:${baseReward}${floorBonus > 0 ? ` Floor:+${floorBonus}` : ''}${subGoalBonus > 0 ? ` SubGoal:+${subGoalBonus}` : ''}${bossBonus > 0 ? ` Boss:+${bossBonus}` : ''})`;
    const localizedMsg = currentLang === 'ja' && bossBonus > 0
        ? `ボス撃破! ✨+${totalGained} (ボス報酬:+${bossBonus})`
        : msg;
    showToast(localizedMsg, bossBonus > 0 ? 'rose' : (subGoalBonus > 0 ? 'emerald' : 'sky'));
    if (systemResult.anomalyReward > 0) {
        showToast(currentLang === 'ja' ? `異常階層を安定化 ✨+${systemResult.anomalyReward}` : `Anomaly stabilized ✨+${systemResult.anomalyReward}`, 'purple');
    }
    if (systemResult.scheduledAnomaly) {
        const def = getAnomalyDefinition(systemResult.scheduledAnomaly);
        showToast(currentLang === 'ja' ? `深淵脈動を検知：${def.name.ja}` : `Abyssal Pulse detected: ${def.name.en}`, 'rose');
        if (typeof triggerAbyssVfx === 'function') triggerAbyssVfx('warning', def.color);
    }
    saveGame();
    setTimeout(() => {
        gameState.busy = false;
        if (gameState.bossState?.defeated) clearTemporaryBossItems();
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
            if (item.type !== 'tool') consumeInventoryUnit(key);
            registerBossItemUse(key);
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
    const recycled = hasPerk('recycler') && Math.random() < getPerkLevel('recycler') * 0.1;
    if (recycled) showToast("Recycled!", 'purple');
    else consumeInventoryUnit(key);
    gameState.targetMode = null; gameState.pendingSkill = null;
    if (key === 'pipette') gameState.pipetteMode = false;
    registerBossItemUse(key);
}
function consumeInventoryUnit(key) {
    gameState.inventory[key] = Math.max(0, (gameState.inventory[key] || 0) - 1);
    if ((gameState.temporaryInventory[key] || 0) > 0) {
        gameState.temporaryInventory[key]--;
        if (gameState.temporaryInventory[key] <= 0) delete gameState.temporaryInventory[key];
    }
}
function grantTemporaryBossItem(key) {
    gameState.inventory[key] = (gameState.inventory[key] || 0) + 1;
    gameState.temporaryInventory[key] = (gameState.temporaryInventory[key] || 0) + 1;
}
function clearTemporaryBossItems() {
    Object.entries(gameState.temporaryInventory || {}).forEach(([key, count]) => {
        gameState.inventory[key] = Math.max(0, (gameState.inventory[key] || 0) - count);
        if (gameState.inventory[key] <= 0) delete gameState.inventory[key];
    });
    gameState.temporaryInventory = {};
    renderSkills();
}
function registerBossItemUse(key) {
    gameState.floorItemsUsed = (gameState.floorItemsUsed || 0) + 1;
    if (gameState.anomaly) {
        gameState.anomaly.countdown = Math.min((getAnomalyDefinition()?.interval || 5) + 2, gameState.anomaly.countdown + 2);
        if (gameState.anomaly.sealTurns > 0) {
            gameState.anomaly.sealTurns = 0;
            gameState.anomaly.sealedTubeIdx = null;
        }
        showToast(currentLang === 'ja' ? '道具で異常反応を遅延' : 'Item delayed the anomaly', 'yellow');
        if (typeof triggerAbyssVfx === 'function') triggerAbyssVfx('item', '#fbbf24');
        renderAbyssSystems();
        renderBoard();
    }
    if (!isBossActive()) return;
    const bs = gameState.bossState;
    bs.itemsUsed++;
    if (!bs.usedItemTypes.includes(key)) bs.usedItemTypes.push(key);
    bs.actionCountdown = Math.min(bs.actionInterval + 2, bs.actionCountdown + 2);
    if (!bs.coreOpen) {
        bs.coreOpen = true;
        bs.armorProgress = 0;
    }
    if (bs.sealTurns > 0) {
        bs.sealTurns = 0;
        bs.sealedTubeIdx = null;
    }
    bs.telegraphTubeIdx = null;
    showToast(currentLang === 'ja' ? '道具共鳴！ 核が露出した' : 'Tool Resonance! Core Exposed', 'yellow');
    renderBossHUD();
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
        if (isBossActive() && gameState.bossState.sealTurns > 0 && gameState.bossState.sealedTubeIdx === idx) {
            showFloatText(idx, currentLang === 'ja' ? '封印中' : 'SEALED', '#c084fc');
            return;
        }
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
        const nextTurn = gameState.turnCount + 1;
        let isOverloaded = false;
        if (!pressureImmune) {
            const movePressure = PRESSURE_PER_POUR + getContractPressureForMove(nextTurn);
            isOverloaded = addPressure(movePressure);
        }
        const strainPressure = getOverdriveStrainPressure(nextTurn);
        if (strainPressure > 0) {
            isOverloaded = addPressure(strainPressure) || isOverloaded;
            showFloatText(fromIdx, currentLang === 'ja' ? `暴走負荷 +${strainPressure}` : `STRAIN +${strainPressure}`, '#f472b6');
        }
        gameState.turnCount += 1;
        // Reflect the pressure result before the pour animation starts. Without
        // this update an overload can look as if it happened at max - 1.
        renderHUD();
        await animatePour(fromIdx, toIdx, check.color, check.moveCount);
        const from = gameState.tubes[fromIdx], to = gameState.tubes[toIdx];
        for (let i = 0; i < check.moveCount; i++) to.push(from.pop());
        const counts = getBoardCounts();
        const purgesBlackAtDestination = check.color === 'K' && isCompleteTube(to, counts);
        if (isOverloaded) {
            // A Black purge already removes the moved ink. Do not immediately
            // redraw it as new corruption in the source tube on the same move.
            await applyPressureDamage(false, purgesBlackAtDestination ? fromIdx : null);
        }
        if (isCompleteTube(to, counts)) {
            await handleCompletion(toIdx, to[0]);
        } else if (gameState.secondaryGoal?.type === 'combo' && !secondarySucceeded()) {
            gameState.secondaryProgress = 0;
        }
        if (isBossActive()) {
            recordBossMovePattern(fromIdx);
            await advanceBossTurn();
        } else if (gameState.anomaly) {
            await advanceAnomalyTurn();
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
        // The pour animation temporarily owns both tube DOMs. Synchronize the
        // moved state first so the source ink cannot reappear during evaporation.
        renderBoard();
        const tubeEls = document.querySelectorAll(`.tube[data-idx="${tubeIdx}"]`);
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
    const tubeEls = document.querySelectorAll(`.tube[data-idx="${tubeIdx}"]`);
    if (gameState.anomaly?.targetTubeIdx === tubeIdx) {
        const def = getAnomalyDefinition();
        gameState.anomaly.avoidedCount = (gameState.anomaly.avoidedCount || 0) + 1;
        gameState.anomaly.countdown = def?.interval || 5;
        gameState.anomaly.targetTubeIdx = chooseHazardTube(tubeIdx);
        showFloatText(tubeIdx, currentLang === 'ja' ? '予兆回避' : 'OMEN AVERTED', '#22d3ee');
    }
    if (gameState.anomaly?.id === 'unstable_reaction') {
        gameState.essence += 2;
        showFloatText(tubeIdx, currentLang === 'ja' ? '反応報酬 ✨+2' : 'REACTION ✨+2', '#fbbf24');
    }
    if (typeof triggerTubeCompletionVfx === 'function') triggerTubeCompletionVfx(tubeIdx, colorMeta(colorKey)?.hex || '#38bdf8');
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
    if (isBossActive()) {
        await handleBossColorCompletion(tubeIdx, colorKey);
        return;
    }
    await showCompletionEvent(colorKey);
    if (checkLevelClear()) onLevelClear();
}
async function handleBossColorCompletion(tubeIdx, colorKey) {
    const bs = gameState.bossState;
    if (!bs || bs.defeated) return;
    if (bs.coreOpen) {
        bs.hp = Math.max(0, bs.hp - 1);
        bs.coreOpen = false;
        bs.armorProgress = 0;
        bs.phase = Math.min(bs.maxHp, (bs.maxHp - bs.hp) + 1);
        bs.phaseAttackCount = 0;
        bs.actionCountdown = Math.min(bs.actionInterval + 1, bs.actionCountdown + 1);
        bs.telegraphTubeIdx = null;
        showFloatTextAtCenter(currentLang === 'ja' ? `核へ命中！ 残り${bs.hp}` : `CORE HIT! ${bs.hp} LEFT`, '#fbbf24');
        if (bs.hp <= 0) {
            bs.defeated = true;
            bs.sealedTubeIdx = null;
            bs.sealTurns = 0;
            showToast(currentLang === 'ja' ? '深淵の主を撃破した！' : 'Abyssal Boss Defeated!', 'rose');
        } else {
            showToast(currentLang === 'ja' ? `フェーズ${bs.phase}へ移行` : `Entering Phase ${bs.phase}`, 'rose');
        }
    } else {
        bs.armorProgress++;
        if (bs.armorProgress >= 2) {
            bs.armorProgress = 0;
            bs.coreOpen = true;
            showFloatTextAtCenter(currentLang === 'ja' ? '装甲解析完了：核が露出' : 'ARMOR ANALYZED: CORE OPEN', '#38bdf8');
        } else {
            showFloatText(tubeIdx, currentLang === 'ja' ? '装甲に阻まれた' : 'BLOCKED', '#94a3b8');
        }
    }
    renderHUD();
    renderBoard();
    saveGame();
}
function recordBossMovePattern(fromIdx) {
    const bs = gameState.bossState;
    if (!bs || bs.bossId !== 'observer') return;
    if (gameState.lastBossSourceIdx === fromIdx) gameState.repeatedBossSourceCount++;
    else gameState.repeatedBossSourceCount = 1;
    gameState.lastBossSourceIdx = fromIdx;
    bs.observedTubeIdx = fromIdx;
    bs.observationStacks = gameState.repeatedBossSourceCount;
    if (bs.observationStacks >= 3) {
        bs.actionCountdown = Math.max(1, bs.actionCountdown - 1);
        showFloatText(fromIdx, currentLang === 'ja' ? `観測 ${bs.observationStacks}` : `OBSERVED x${bs.observationStacks}`, '#67e8f9');
    }
}
function resetAnomalyCycle() {
    const anomaly = gameState.anomaly;
    const def = getAnomalyDefinition();
    if (!anomaly || !def) return;
    anomaly.countdown = def.interval;
    anomaly.targetTubeIdx = anomaly.id === 'pressure_tide' || anomaly.id === 'unstable_reaction'
        ? null
        : chooseHazardTube(anomaly.targetTubeIdx);
}
async function advanceAnomalyTurn() {
    const anomaly = gameState.anomaly;
    if (!anomaly) return;
    if (anomaly.sealTurns > 0) {
        anomaly.sealTurns--;
        if (anomaly.sealTurns <= 0) {
            anomaly.sealedTubeIdx = null;
            showToast(currentLang === 'ja' ? '異常封鎖が解除された' : 'Anomaly seal released', 'cyan');
        }
    }
    anomaly.countdown--;
    if (anomaly.countdown > 0) {
        renderAbyssSystems();
        renderBoard();
        return;
    }
    const def = getAnomalyDefinition();
    anomaly.effectCount = (anomaly.effectCount || 0) + 1;
    if (consumeOverdriveGuard('anomaly')) {
        resetAnomalyCycle();
        renderHUD();
        renderBoard();
        return;
    }
    if (typeof triggerAbyssVfx === 'function') triggerAbyssVfx('anomaly', def?.color || '#a855f7');
    if (anomaly.id === 'pressure_tide') {
        showToast(currentLang === 'ja' ? '異常発生：圧力津波 +6' : 'Anomaly: Pressure Tide +6', 'rose');
        if (addPressure(6)) await applyPressureDamage(false);
    } else if (anomaly.id === 'void_omen') {
        showToast(currentLang === 'ja' ? '異常発生：黒潮注入' : 'Anomaly: Void Injection', 'purple');
        await corruptPreferredSegment(anomaly.targetTubeIdx);
    } else if (anomaly.id === 'sealed_resonance') {
        const targetIdx = anomaly.targetTubeIdx ?? chooseHazardTube();
        if (targetIdx !== null) {
            anomaly.sealedTubeIdx = targetIdx;
            anomaly.sealTurns = 2;
            showFloatText(targetIdx, currentLang === 'ja' ? '異常封鎖 2手' : 'SEALED 2T', '#67e8f9');
        }
    } else if (anomaly.id === 'unstable_reaction') {
        showToast(currentLang === 'ja' ? '異常反応：プレッシャー +3' : 'Unstable Reaction: Pressure +3', 'yellow');
        if (addPressure(3)) await applyPressureDamage(false);
    }
    resetAnomalyCycle();
    renderHUD();
    renderBoard();
}
function setBossSeal(targetIdx, turns = 2) {
    const bs = gameState.bossState;
    if (!bs || targetIdx === null) return false;
    bs.sealedTubeIdx = targetIdx;
    bs.sealTurns = turns;
    showFloatText(targetIdx, currentLang === 'ja' ? `${turns}手封印` : `SEALED ${turns}T`, '#c084fc');
    return true;
}
function transformTubeSafely(targetIdx, mode = 'reverse') {
    if (targetIdx === null || !gameState.tubes[targetIdx] || gameState.tubes[targetIdx].length < 2) return false;
    const before = [...gameState.tubes[targetIdx]];
    if (mode === 'cycle') gameState.tubes[targetIdx].push(gameState.tubes[targetIdx].shift());
    else gameState.tubes[targetIdx].reverse();
    if (isDeadlocked()) {
        gameState.tubes[targetIdx] = before;
        return false;
    }
    showFloatText(targetIdx, currentLang === 'ja' ? '重力反転' : 'GRAVITY FLIP', '#c084fc');
    return true;
}
function swapRandomSurfacesSafely() {
    const candidates = gameState.tubes
        .map((tube, idx) => ({tube, idx}))
        .filter(({tube, idx}) => tube.length > 0 && !gameState.completedFlags[idx]);
    if (candidates.length < 2) return false;
    const first = pick(candidates);
    const remaining = candidates.filter(x => x.idx !== first.idx);
    const second = pick(remaining);
    const a = first.tube[first.tube.length - 1];
    const b = second.tube[second.tube.length - 1];
    first.tube[first.tube.length - 1] = b;
    second.tube[second.tube.length - 1] = a;
    if (isDeadlocked()) {
        first.tube[first.tube.length - 1] = a;
        second.tube[second.tube.length - 1] = b;
        return false;
    }
    showFloatText(first.idx, currentLang === 'ja' ? '液面変異' : 'SURFACE SHIFT', '#f472b6');
    showFloatText(second.idx, currentLang === 'ja' ? '液面変異' : 'SURFACE SHIFT', '#f472b6');
    return true;
}
function ensureBossTelegraph() {
    const bs = gameState.bossState;
    if (!bs || bs.telegraphTubeIdx !== null) return;
    if (bs.bossId === 'observer' && bs.observedTubeIdx !== null) bs.telegraphTubeIdx = bs.observedTubeIdx;
    else bs.telegraphTubeIdx = chooseHazardTube();
}
async function addBossPressure(amount) {
    showToast(currentLang === 'ja' ? `ボス攻撃：圧力 +${amount}` : `Boss Attack: Pressure +${amount}`, 'rose');
    if (addPressure(amount)) await applyPressureDamage(false);
}
async function executeBossAttack() {
    const bs = gameState.bossState;
    if (!bs || bs.defeated) return;
    ensureBossTelegraph();
    if (consumeOverdriveGuard('boss')) return;
    if (typeof triggerAbyssVfx === 'function') triggerAbyssVfx('boss', getBossDefinition().color);
    const target = bs.telegraphTubeIdx;
    if (bs.bossId === 'crucible') {
        if (bs.phase === 1) await corruptPreferredSegment(target);
        else if (bs.phase === 2) await addBossPressure(5);
        else {
            await addBossPressure(3);
            await corruptPreferredSegment(target);
        }
    } else if (bs.bossId === 'gravity_vat') {
        if (bs.phase === 1) setBossSeal(target, 2);
        else if (bs.phase === 2) {
            if (!transformTubeSafely(target, 'reverse')) setBossSeal(target, 2);
        } else {
            if (!transformTubeSafely(target, 'cycle')) setBossSeal(target, 2);
            else setBossSeal(chooseHazardTube(target), 1);
        }
    } else if (bs.bossId === 'observer') {
        const stacks = Math.max(1, bs.observationStacks || 1);
        if (bs.phase === 1) setBossSeal(target, 2);
        else if (bs.phase === 2) await corruptPreferredSegment(target);
        else {
            await addBossPressure(Math.min(6, 2 + stacks));
            setBossSeal(target, 1);
        }
        bs.observationStacks = 0;
        gameState.repeatedBossSourceCount = 0;
    } else {
        if (bs.phase === 1) await corruptPreferredSegment(target);
        else if (bs.phase === 2) {
            if (!swapRandomSurfacesSafely()) await corruptPreferredSegment(target);
        } else {
            swapRandomSurfacesSafely();
            await corruptPreferredSegment(target);
        }
    }
}
async function advanceBossTurn() {
    const bs = gameState.bossState;
    if (!bs || bs.defeated) return;
    if (bs.sealTurns > 0) {
        bs.sealTurns--;
        if (bs.sealTurns <= 0) {
            bs.sealedTubeIdx = null;
            showToast(currentLang === 'ja' ? 'チューブの封印が解けた' : 'Tube Seal Released', 'purple');
        }
    }
    bs.actionCountdown--;
    if (bs.actionCountdown <= 2) ensureBossTelegraph();
    if (bs.actionCountdown > 0) {
        renderBossHUD();
        renderBoard();
        return;
    }
    bs.attackCount++;
    bs.phaseAttackCount = (bs.phaseAttackCount || 0) + 1;
    await executeBossAttack();
    bs.actionCountdown = bs.actionInterval;
    bs.telegraphTubeIdx = null;
    renderHUD();
    renderBoard();
}
async function applyPressureDamage(visualOnly = false, excludedCorruptionTubeIdx = null) {
    // addPressure() has already reset an overloaded gauge to zero. Update it
    // before any shake/corruption animation so max - 1 is never shown as hit.
    renderHUD();
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
    await corruptRandomSegment(excludedCorruptionTubeIdx);
    const msg = currentLang === 'ja' ? "オーバーロード！ HP-1" : "Pressure Overload! HP -1";
    showToast(msg, "#ef4444");
    renderHUD();
    renderBoard();
    await new Promise(r => setTimeout(r, 500));
}
function corruptPreferredSegment(preferredIdx = null, excludedIdx = null) {
    return new Promise((resolve) => {
        const candidates = gameState.tubes
            .map((t, i) => ({ idx: i, length: t.length }))
            .filter(t => {
                if (t.idx === excludedIdx) return false;
                if (gameState.completedFlags[t.idx]) return false;
                if (t.length >= gameState.capacity) return false;
                const top = gameState.tubes[t.idx].length > 0 ? gameState.tubes[t.idx][gameState.tubes[t.idx].length - 1] : null;
                return top !== 'K';
            });
        const shuffledCandidates = candidates.sort((a, b) => {
            if (a.idx === preferredIdx) return -1;
            if (b.idx === preferredIdx) return 1;
            return Math.random() - 0.5;
        });
        let placed = false;
        for (let candidate of shuffledCandidates) {
            gameState.tubes[candidate.idx].push('K');
            if (!isDeadlocked()) {
                placed = true;
                renderBoard();
                showFloatText(candidate.idx, "CORRUPTED", "#ef4444");
                if (typeof triggerTubeCorruptionVfx === 'function') triggerTubeCorruptionVfx(candidate.idx);
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
function corruptRandomSegment(excludedIdx = null) {
    return corruptPreferredSegment(null, excludedIdx);
}
function startNewRun() {
    clearSave();
    let startFloor = 1;
    let effectiveDebug = IS_DEBUG;
    let debugAnomalyId = null;
    let debugContractId = null;
    let debugOverdrivePerkId = null;
    let debugOverdriveMode = null;
    if (IS_DEBUG) {
        const input = ui('debug-floor-input');
        startFloor = parseInt(input.value) || 0;
        if (startFloor <= 0) {
            effectiveDebug = false;
            startFloor = 1;
        }
        if (effectiveDebug) {
            debugAnomalyId = ui('debug-anomaly-input')?.value || null;
            debugContractId = ui('debug-contract-input')?.value || null;
            const debugOverdriveValue = ui('debug-overdrive-input')?.value || '';
            [debugOverdrivePerkId, debugOverdriveMode] = debugOverdriveValue.split(':');
            debugOverdrivePerkId ||= null;
            debugOverdriveMode ||= null;
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
        perks: debugOverdrivePerkId
            ? {[debugOverdrivePerkId]: debugOverdriveMode ? PERK_LEVEL_CAP : OVERDRIVE_UNLOCK_LEVEL}
            : {},
        pressure: 0,
        pressureMax: PRESSURE_MAX_BASE,
        history: [],
        inventory: effectiveDebug ? Object.keys(ITEMS).reduce((acc, key) => ({ ...acc, [key]: 3 }), {}) : {},
        catalystAvailable: true,
        refluxUses: 0, // perksは同時にリセットされるため必ず0から開始
        momentumTurns: 0,
        rerollCoupons: 0,
        completedFlags: [],
        bossState: null,
        temporaryInventory: {},
        abyssAttention: 0,
        attentionPeak: 0,
        pendingAnomalyId: debugAnomalyId,
        anomaly: null,
        anomalyHistory: [],
        anomaliesCleared: 0,
        routeContract: debugContractId ? {id: debugContractId, startFloor, endFloor: startFloor + 4} : null,
        contractHistory: [],
        overdrives: debugOverdriveMode ? {[debugOverdrivePerkId]: debugOverdriveMode} : {},
        pendingOverdriveMode: null,
        floorStartHp: 3,
        floorItemsUsed: 0,
        overdriveGuards: 0,
        lastBossSourceIdx: null,
        repeatedBossSourceCount: 0,
        saveSchemaVersion: SAVE_SCHEMA_VERSION,
        runVersion: GAME_VERSION,
        turnCount: 0,
        selectedIdx: null,
        focusIdx: null,
        busy: false,
        primaryGoal: null,
        secondaryGoal: null,
        secondaryProgress: 0,
        currentPerkChoices: null,
        currentShopOffers: null,
        pendingPerkId: null,
        targetMode: null,
        pipetteMode: false,
        pendingSkill: null,
        extractorHeldColor: null,
        extractorSourceIdx: null
    });
    if (isBossFloor(startFloor)) {
        gameState.bossState = createBossState(startFloor);
        gameState.busy = true;
    }
    perkScreen.classList.add('hidden');
    generateBoard();
    prepareFloorSystems();
    generateGoals();
    renderHUD();
    renderBoard(true);
    saveGame();
    if (isBossActive() && gameState.bossState.pendingIntro) {
        setTimeout(openBossIntro, 300);
    }
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
    clearTemporaryBossItems();
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
    const enteringBoss = isBossFloor(gameState.floor);
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
        busy:enteringBoss,
        targetMode:null, 
        pipetteMode:false, 
        pendingSkill:null, 
        extractorHeldColor:null,
        history: [],
        completedFlags: [],
        bossState: enteringBoss ? createBossState(gameState.floor) : null,
        temporaryInventory: {},
        anomaly: null,
        pendingOverdriveMode: null,
        lastBossSourceIdx: null,
        repeatedBossSourceCount: 0
    });
    if(hasPerk('overflow')) {
        gameState.pressureMax = defaultPressureMax + (getPerkLevel('overflow') * 4);
    }
    generateBoard(); 
    prepareFloorSystems();
    generateGoals(); 
    renderHUD(); 
    renderBoard(true);
    saveGame();
    setTimeout(() => {
        showFloorStartSequence(rewards);
        if (enteringBoss) openBossIntro();
    }, 600);
}
function showFloorStartSequence(rewards) {
    const floorMsg = currentLang === 'ja' ? `第 ${gameState.floor} 階層` : `FLOOR ${gameState.floor}`;
    showToast(floorMsg, 'sky');
    if (gameState.routeContract?.startFloor === gameState.floor) {
        const contract = getCurrentContract();
        setTimeout(() => showToast(currentLang === 'ja' ? `${contract.name.ja} 開始` : `${contract.name.en} begins`, contract.id === 'forbidden' ? 'rose' : contract.id === 'volatile' ? 'yellow' : 'sky'), 250);
    }
    if (gameState.anomaly) {
        const anomaly = getAnomalyDefinition();
        setTimeout(() => {
            showToast(currentLang === 'ja' ? `異常階層：${anomaly.name.ja}` : `ANOMALY: ${anomaly.name.en}`, 'purple');
            if (typeof triggerAbyssVfx === 'function') triggerAbyssVfx('anomaly', anomaly.color);
        }, 450);
    }
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
async function tryUndo(){
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
        bossState: prev.bossState ? deepCopy(prev.bossState) : gameState.bossState,
        temporaryInventory: prev.temporaryInventory ? {...prev.temporaryInventory} : {...gameState.temporaryInventory},
        anomaly: prev.anomaly ? deepCopy(prev.anomaly) : gameState.anomaly,
        abyssAttention: typeof prev.abyssAttention === 'number' ? prev.abyssAttention : gameState.abyssAttention,
        overdriveGuards: typeof prev.overdriveGuards === 'number' ? prev.overdriveGuards : gameState.overdriveGuards,
        lastBossSourceIdx: prev.lastBossSourceIdx ?? gameState.lastBossSourceIdx,
        repeatedBossSourceCount: prev.repeatedBossSourceCount ?? gameState.repeatedBossSourceCount,
        pipetteMode: false,
        selectedIdx: null
    });
    let refluxOverloaded = false;
    if(isFree){ 
        refluxOverloaded = addPressure(2);
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
    if (refluxOverloaded) {
        gameState.busy = true;
        try {
            await applyPressureDamage(false);
        } finally {
            gameState.busy = false;
        }
        if (gameState.hp <= 0) {
            gameState.hp = 0;
            renderHUD();
            clearSave();
            openPerkScreen(true);
            return;
        }
    }
    saveGame();
}
