// logic.js — 純粋なゲームロジック(判定、盤面生成、目標、抽選、価格)
function addPressure(amount) {
    gameState.pressure += amount;
    if (gameState.pressure >= gameState.pressureMax) {
        gameState.pressure = 0;
        return true; 
    }
    return false;
}
function getPerkLevel(id){ return gameState.perks[id] || 0; }
function hasPerk(id){ return (gameState.perks[id] || 0) > 0; }
function getPerkDesc(id, level=1){
    const def = PERKS[id];
    let txt = currentLang==='ja' ? def.desc.ja : def.desc.en;
    txt = txt.replace(/\[Lv\]/g, level);
    txt = txt.replace(/\[4 \+ Lv\]/g, 4 + level);
    txt = txt.replace(/\[6 \- Lv\]/g, 6 - level);
    txt = txt.replace(/\[Lv x 2\]/g, level * 2);
    txt = txt.replace(/\[Lv x 3\]/g, level * 3);
    txt = txt.replace(/\[Lv x 4\]/g, level * 4);
    txt = txt.replace(/\[1 \+ Lv\]/g, 1 + level);
    txt = txt.replace(/\[2 \+ Lv\]/g, 2 + level);
    txt = txt.replace(/\[Lv x 10\]/g, level * 10);
    txt = txt.replace(/\[Lv x 15\]/g, level * 15);
    txt = txt.replace(/\[Lv x 20\]/g, level * 20);
    txt = txt.replace(/\[10 \+ Lv x 5\]/g, 10 + level * 5);
    txt = txt.replace(/\[15 \+ Lv x 5\]/g, 15 + level * 5);
    txt = txt.replace(/\[40 \+ Lv x 10\]/g, 40 + level * 10);
    return txt;
}
function tubeTop(t){ return t.length ? t[t.length-1] : null; }
function tubeFree(t){ return gameState.capacity - t.length; }
function getBoardCounts(){
    const counts = {};
    gameState.tubes.forEach(t => t.forEach(c => counts[c] = (counts[c]||0)+1));
    if (gameState.extractorHeldColor) {
        const c = gameState.extractorHeldColor;
        counts[c] = (counts[c]||0) + 1;
    }
    return counts;
}
function isCompleteTube(t, counts = null) {
    if (!t || t.length === 0) return false;
    if (!counts) counts = getBoardCounts();
    const c = t[0];
    if (!t.every(x => x === c)) return false;
    const totalOnBoard = counts[c] || 0;
    if (t.length === totalOnBoard && totalOnBoard > 0) return true;
    return t.length >= gameState.capacity;
}
function colorMeta(key){ return COLOR_POOL.find(c => c.key===key); }
function colorName(key){ const m=colorMeta(key); return currentLang==='ja' ? m.name.ja : m.name.en; }
function generateGoals(){
    const flat = gameState.tubes.flat();
    const presentColors = new Set(flat);
    presentColors.delete('K'); 
    const colors = [...presentColors];
    const roll = Math.random();
    if (roll < 0.65) { 
        gameState.primaryGoal = { type: 'completeAll' };
    } else if (roll < 0.90) { 
        const maxN = colors.length;
        const n = clamp(Math.floor(maxN / 1.5), 1, maxN);
        gameState.primaryGoal = { type:'completeN', n:n };
    } else { 
        const c = pick(colors);
        gameState.primaryGoal = { type:'completeColor', color:c };
    }
        const sroll = Math.random();
    const par = 14 + Math.floor(gameState.floor / 2) + 5; 
    if (sroll < 0.5){
        gameState.secondaryGoal = { type:'speed', limit: par };
    } else {
        gameState.secondaryGoal = { type:'combo', need:2 };
    }
    gameState.secondaryProgress = 0;
    renderHUD();
}
function checkPrimaryGoal(){
    const counts = getBoardCounts();
    if (gameState.primaryGoal.type === 'completeAll') { 
        const flat = gameState.tubes.flat();
        const colorsOnBoard = new Set(flat.filter(c => c !== 'K')).size;
        return countCompletedTubes(counts) >= colorsOnBoard;
    }
    if (gameState.primaryGoal.type === 'completeN') {
        return countCompletedTubes(counts) >= gameState.primaryGoal.n;
    }
    if (gameState.primaryGoal.type === 'completeColor'){
        return gameState.tubes.some(t => isCompleteTube(t, counts) && t[0] === gameState.primaryGoal.color);
    }
    return false;
}
function checkLevelClear(){
    const counts = getBoardCounts();
    if (checkPrimaryGoal()) return true;
    const allClean = gameState.tubes.every(t => t.length === 0 || (isCompleteTube(t, counts) && t[0] !== 'K'));
    if (allClean) return true;
    return false;
}
function checkSecondaryGoalOnComplete(){
    if (!gameState.secondaryGoal) return;
    if (gameState.secondaryGoal.type === 'speed'){
        if (gameState.turnCount <= gameState.secondaryGoal.limit){
            gameState.secondaryProgress = 1; 
        }
    } else if (gameState.secondaryGoal.type === 'combo'){
        gameState.secondaryProgress += 1;
        if(hasPerk('flow_mastery') && gameState.secondaryProgress >= 2){
            const lv = getPerkLevel('flow_mastery');
            gameState.pressure = Math.max(0, gameState.pressure - (lv * 2));
            showFloatText(0, `Flow! -${lv*2} Pressure`, '#38bdf8');
        }
    }
}
function secondarySucceeded(){
    if (!gameState.secondaryGoal) return false;
    if (gameState.secondaryGoal.type === 'speed') return gameState.secondaryProgress >= 1;
    if (gameState.secondaryGoal.type === 'combo') return gameState.secondaryProgress >= gameState.secondaryGoal.need;
    return false;
}
function isDeadlocked() {
    for (let i = 0; i < gameState.tubes.length; i++) {
        if (gameState.tubes[i].length === 0) continue;
        for (let j = 0; j < gameState.tubes.length; j++) {
            if (i === j) continue;
            const check = canPour(i, j);
            if (check.ok) return false;
        }
    }
    return true;
}
function generateBoard() {
    const floor = gameState.floor;
    gameState.tubeCount = Math.min(10, 6 + Math.floor((floor - 1) / 2));
    const numColors = gameState.tubeCount - 2;
    const maxPoolIndex = Math.min(COLOR_POOL.length, numColors + (floor > 5 ? 2 : 0));
    let availablePool = COLOR_POOL.slice(0, maxPoolIndex).map(c => c.key);
    availablePool.sort(() => Math.random() - 0.5);
    const colors = availablePool.slice(0, Math.min(numColors, availablePool.length));
    const tubes = Array.from({ length: gameState.tubeCount }, () => []);
    for (let i = 0; i < colors.length; i++) {
        for (let j = 0; j < gameState.capacity; j++) {
            tubes[i].push(colors[i]);
        }
    }
    let shuffleMoves = 0;
    const targetMoves = gameState.capacity * colors.length * 8; 
    let failsafe = 0;
    while (shuffleMoves < targetMoves && failsafe < 4000) {
        failsafe++;
        const fromIdx = randInt(gameState.tubeCount);
        const toIdx = randInt(gameState.tubeCount);
        if (fromIdx === toIdx) continue;
        const fromTube = tubes[fromIdx], toTube = tubes[toIdx];
        if (fromTube.length === 0 || toTube.length >= gameState.capacity) continue;
        const color = fromTube[fromTube.length - 1];
        let sameColorCount = 0;
        for (let i = fromTube.length - 1; i >= 0; i--) {
            if (fromTube[i] === color) sameColorCount++; else break;
        }
        const moveAmount = 1 + randInt(Math.min(sameColorCount, gameState.capacity - toTube.length));
        for (let m = 0; m < moveAmount; m++) toTube.push(fromTube.pop());
        shuffleMoves++;
    }
    const emptyTubeTargetCount = 2;
    const emptyIndices = [];
    for (let i = gameState.tubeCount - emptyTubeTargetCount; i < gameState.tubeCount; i++) emptyIndices.push(i);
    emptyIndices.forEach(targetIdx => {
        while (tubes[targetIdx].length > 0) {
            const color = tubes[targetIdx].pop();
            let placed = false;
            const checkOrder = Array.from({ length: gameState.tubeCount }, (_, i) => i).sort(() => Math.random() - 0.5);
            for (let i of checkOrder) {
                if (emptyIndices.includes(i)) continue;
                if (tubes[i].length < gameState.capacity) { tubes[i].push(color); placed = true; break; }
            }
            if (!placed) { tubes[targetIdx].push(color); break; }
        }
    });
    const boardCounts = {};
    tubes.forEach(t => t.forEach(c => boardCounts[c] = (boardCounts[c] || 0) + 1));
    for (let i = 0; i < tubes.length; i++) {
        if (tubes[i].length === 0) continue;
        let attempts = 0;
        while (isCompleteTube(tubes[i], boardCounts) && tubes[i][0] !== 'K' && attempts < 50) {
            attempts++;
            const targetIdx = randInt(gameState.tubeCount);
            if (targetIdx !== i && tubes[targetIdx].length < gameState.capacity) {
                tubes[targetIdx].push(tubes[i].pop());
            }
        }
    }
    gameState.tubes = tubes;
    updateTubeLayout();
}
function updateTubeLayout(){
    const cap = gameState.capacity;
    let segHeight = 45; 
    if(cap >= 8) segHeight = 38;
    else if(cap >= 6) segHeight = 40;
    else if(cap >= 5) segHeight = 42;
    const tubeHeight = (segHeight * cap) + 40;
    document.documentElement.style.setProperty('--segment-height', `${segHeight}px`);
    document.documentElement.style.setProperty('--tube-height', `${tubeHeight}px`);
}
function canPour(fromIdx, toIdx){
    if (fromIdx === toIdx) return {ok:false};
    const from = gameState.tubes[fromIdx], to = gameState.tubes[toIdx];
    if (!from.length || tubeFree(to) <= 0) return {ok:false};
    const top = tubeTop(from), toTop = tubeTop(to);
    if (toTop && toTop !== top) return {ok:false};
    let count = 1;
    if(!gameState.pipetteMode) { for (let i=from.length-2;i>=0;i--) if (from[i] === top) count++; else break; }
    return {ok:true, color: top, moveCount: Math.min(count, tubeFree(to))};
}
function removeOneObsidian() {
    for (let i = 0; i < gameState.tubes.length; i++) {
        const idx = gameState.tubes[i].indexOf('K');
        if (idx !== -1) {
            gameState.tubes[i].splice(idx, 1);
            return;
        }
    }
}
function countCompletedTubes(counts=null){
    if(!counts) counts = getBoardCounts();
    return gameState.tubes.filter(t => isCompleteTube(t, counts) && t[0] !== 'K').length;
}
function rarityWeight(r){
    if(r === 'epic') return 0.20;
    if(r === 'rare') return 0.80;
    return 1.00;
}
function rollPerkChoices(count = 3) {
    const ids = Object.keys(PERKS);
    const f = clamp((gameState.floor - 1) / 10, 0, 1);
    const pool = ids.slice();
    const w = pool.map(id => {
        const r = PERKS[id].rarity;
        let base = rarityWeight(r);
        if (r === 'rare') base += 0.15 * f;
        if (r === 'epic') base += 0.10 * f;
        if (getPerkLevel(id) === 0) base *= 1.10;
        return base;
    });
    const chosen = [];
    const targetCount = gameState.isExecutionDebug ? pool.length : Math.min(count, pool.length);
    while (chosen.length < targetCount) {
        const total = w.reduce((a, b) => a + b, 0);
        if (total <= 0) break;
        let r = Math.random() * total;
        let idx = 0;
        while (idx < w.length && (r -= w[idx]) > 0) idx++;
        idx = Math.min(idx, w.length - 1);
        const perkId = pool[idx];
        chosen.push(PERKS[perkId]);
        pool.splice(idx, 1);
        w.splice(idx, 1);
    }
    return chosen;
}
function generateShopOffers(n=4){
    const pool = SHOP_POOL.slice();
    const picks = [];
    while(picks.length < Math.min(n, pool.length)){
        const p = pool.splice(randInt(pool.length),1)[0];
        picks.push({ ...p, purchased:false });
    }
    return picks;
}
function findInstant(id){
    return ITEM_REGISTRY[id] || null;
}
function getPriceMultiplier() {
    const f = gameState.floor;
    if (f < 6) return 1.0;
    if (f < 11) return 1.2;
    if (f < 21) return 1.5;
    let multiplier = 2.0 * Math.pow(1.1, f - 21);
    if (f >= 31) {
        // 深淵帯: 毎階層1.3倍で逓増 (旧: 2倍で数階層のうちに購入不能になっていた)
        const abyssExponent = f - 30;
        multiplier *= Math.pow(1.3, abyssExponent);
    }
    return parseFloat(multiplier.toFixed(2));
}
function getDiscountedCost(base) {
    const multiplier = getPriceMultiplier();
    let cost = base * multiplier;
    if (hasPerk('bargain')) {
        const discount = (15 + getPerkLevel('bargain') * 5) / 100;
        cost = cost * (1 - discount);
    }
    return Math.max(1, Math.floor(cost));
}
function acquirePerk(id){ 
    if(!gameState.perks[id]) gameState.perks[id] = 0; 
    gameState.perks[id]++; 
    if(id === 'overflow') gameState.pressureMax += 4; 
    if(id === 'reflux') {
        gameState.refluxUses += 1;
        showToast(currentLang === 'ja' ? '逆流制御チャージ！' : 'Reflux Charged!', 'purple');
    }
    renderHUD(); 
    saveGame(); 
}
function getValidRandomConsumable() {
    const keys = Object.keys(ITEMS).filter(x => ITEMS[x].type === 'consumable');
    const available = keys.filter(k => (gameState.inventory[k] || 0) < INVENTORY_LIMIT);
    return available.length > 0 ? pick(available) : null;
}
function generateShareText(){
    const perkList = Object.entries(gameState.perks || {})
        .filter(([_,lv]) => (lv||0)>0)
        .map(([id,lv]) => `${(currentLang==='ja'?PERKS[id].name.ja:PERKS[id].name.en)} Lv.${lv}`)
        .join(', ');
    return `Abyss Alchemy | FLOOR ${gameState.floor} | ESSENCE ${gameState.essence} | ${perkList || 'No Mutations'}`;
}
