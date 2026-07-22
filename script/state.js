// state.js — ゲーム状態、セーブ/ロード、履歴(Undo用)
const SAVE_KEY = 'abyssal_alchemy_save_v1';
function saveGame() {
    try {
        const data = JSON.stringify(gameState);
        localStorage.setItem(SAVE_KEY, data);
    } catch (e) {
        console.error("Save failed:", e);
        showToast("Save failed (Storage Full?)", "red");
    }
}
function loadGame() {
    try {
        const data = localStorage.getItem(SAVE_KEY);
        if (data) {
            const loadedState = JSON.parse(data);
            Object.assign(gameState, loadedState);
            gameState.busy = false; 
            gameState.selectedIdx = null;
            gameState.targetMode = null;
            gameState.pipetteMode = false;
            gameState.pendingSkill = null;
            gameState.extractorHeldColor = null;
            if (!gameState.completedFlags) gameState.completedFlags = [];
            if (!gameState.temporaryInventory) gameState.temporaryInventory = {};
            if (typeof gameState.bossState === 'undefined') gameState.bossState = null;
            if (gameState.floor % BOSS_INTERVAL === 0) {
                gameState.bossState = Object.assign(createBossState(gameState.floor), gameState.bossState || {});
            } else {
                gameState.bossState = null;
                gameState.temporaryInventory = {};
            }
            if (gameState.bossState?.pendingIntro) gameState.busy = true;
            updateTubeLayout();
            startScreen.classList.add('hidden');
            renderHUD();
            renderBoard(true);
            if (checkLevelClear()) {
                openPerkScreen(false);
            } else {
                perkScreen.classList.add('hidden');
            }
            if (gameState.bossState?.pendingIntro) {
                setTimeout(openBossIntro, 100);
            }
            showToast(currentLang==='ja'?'再開しました':'Game Loaded', 'emerald');
            return true;
        }
    } catch (e) {
        console.error("Load failed:", e);
    }
    return false;
}
function clearSave() {
    localStorage.removeItem(SAVE_KEY);
}
function hasSaveData() {
    return !!localStorage.getItem(SAVE_KEY);
}
const gameState = {
    floor: 1,
    essence: 0,
    hp: 3,
    maxHp: 3,
    turnCount: 0, 
    capacity: 4,
    tubeCount: 0,
    selectedIdx: null,
    tubes: [],
    busy: false,
    perks: {},
    inventory: IS_DEBUG ? Object.keys(ITEMS).reduce((acc, key) => ({ ...acc, [key]: 3 }), {}) : {},
    pressure: 0,
    pressureMax: PRESSURE_MAX_BASE,
    catalystAvailable: true,
    refluxUses: 0,
    momentumTurns: 0,
    history: [],
    primaryGoal: null,
    secondaryGoal: null,
    secondaryProgress: 0,
    focusIdx: null, 
    currentPerkChoices: null,
    currentShopOffers: null,
    pipetteMode: false,
    targetMode: null, 
    pendingSkill: null, 
    extractorHeldColor: null, 
    rerollCoupons: 0,
    pendingPerkId: null,
    completedFlags: [],
    isExecutionDebug: false,
    bossState: null,
    temporaryInventory: {},
};
function pushHistory(){
    gameState.history.push({
        tubes: deepCopy(gameState.tubes), 
        turnCount: gameState.turnCount, 
        pressure: gameState.pressure, 
        hp: gameState.hp,
        secondaryProgress: gameState.secondaryProgress, 
        catalystAvailable: gameState.catalystAvailable, 
        essence: gameState.essence,
        inventory: {...gameState.inventory}, 
        tubeCount: gameState.tubeCount, 
        capacity: gameState.capacity,
        momentumTurns: gameState.momentumTurns, 
        refluxUses: gameState.refluxUses,
        completedFlags: [...gameState.completedFlags],
        extractorHeldColor: gameState.extractorHeldColor,
        extractorSourceIdx: gameState.extractorSourceIdx,
        bossState: gameState.bossState ? deepCopy(gameState.bossState) : null,
        temporaryInventory: {...gameState.temporaryInventory}
    });
    if (gameState.history.length > 50) gameState.history.shift();
}
