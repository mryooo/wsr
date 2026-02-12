const GAME_VERSION = "0.4.12";
const IS_DEBUG = true;

function clamp(val, min, max){ return Math.min(Math.max(val, min), max); }
function addPressure(amount) {
    gameState.pressure += amount;
    if (gameState.pressure >= gameState.pressureMax) {
        gameState.pressure = 0;
        return true; 
    }
    return false;
}
function applyPressureDamage(visualOnly = false) {
    if (!visualOnly) {
        if (hasPerk('void_shield') && Math.random() < getPerkLevel('void_shield') * 0.15) {
            showToast("Void Shield!", "#a855f7");
            return;
        }
        gameState.hp -= 1;
    }
    ui('game-container').classList.add('animate-shake');
    corruptRandomSegment(); 
    const msg = currentLang === 'ja' ? "オーバーロード！ HP-1" : "Pressure Overload! HP -1";
    showToast(msg, "#ef4444");
    renderHUD();
    renderBoard();
    setTimeout(() => {
        const container = ui('game-container');
        if(container) container.classList.remove('animate-shake');
    }, 500);
}
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
            updateTubeLayout();
            startScreen.classList.add('hidden');
            renderHUD();
            renderBoard(true);
            if (checkLevelClear()) {
                openPerkScreen(false);
            } else {
                perkScreen.classList.add('hidden');
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
const translations = {
    en: {
        subtitle: "Abyss Alchemy",
        startBtn: "New Descent",
        continueBtn: "Continue",
        vitality: "HP",
        floor: "FLOOR",
        essence: "Essence",
        turn: "TURN",
        secondary: "BONUS",
        perks: "PERKS",
        hint: "Select a tube to pour",
        goalTitle: "GOAL",
        pressureTitle: "PRESSURE",
        eventKicker: "Completion Bonus",
        unavoid: "Unavoidable",
        mutationsLabel: "🧬 Skills",
        helpTitle: "How to play",
        helpText: [
            "• Pour water: Click a tube, then click another to pour.",
            "• Obsidian (Black Ink): Fill a tube with them to evaporate and clear it!",
            "• Pressure: Rises with every move. If it fills, you take 1 Damage.",
            "• Survival: No Move limit. Manage your HP and Pressure to survive.",
            "• Artifacts: Buy skills in the shop. Use them from the bottom bar.",
            "• Undo: Use the button below (Costs 5 Essence).",
        ].join("\n"),
        helpClose: "Close",
        settings: "Settings",
        continue: "Continue",
        shopTitle: "Shop",
        shopSub: "Trade Essence for survival",
        gameOver: "Consumed",
        gameOverSub: "The abyss claims another soul...",
        victory: "Mutation",
        victorySub: "Select a Skill to evolve",
        typeInstant: "Instant",
        typeItem: "Held Item",
        reroll: "Reroll",
        statusBtn: "STATUS",
        retireBtn: "Retire",
        helpBtn: "Help",
        paletteBtn: "Pallette",
        paletteTitle: "Color Palette",
        close: "Close"
    },
    ja: {
        subtitle: "錬金術の深淵",
        startBtn: "新たな探索",
        continueBtn: "つづきから",
        vitality: "HP",
        floor: "階層",
        essence: "エッセンス",
        turn: "ターン",
        secondary: "Bonus",
        perks: "ボーナス",
        hint: "チューブを選択して注ぐ",
        goalTitle: "目標",
        pressureTitle: "プレッシャー",
        eventKicker: "完成ボーナス",
        unavoid: "不可避",
        mutationsLabel: "🧬 スキル",
        helpTitle: "遊び方",
        helpText: [
            "・注ぐ：チューブを選択し、別のチューブへ注ぎます",
            "・黒インク：チューブの容量分を揃えると蒸発して消え、空き瓶になります。",
            "・プレッシャー：1手ごとに上昇します。最大になるとHPが1減ります。",
            "・生存：手数制限はありません。HPが尽きない限り探索を続けられます。",
            "・道具と秘術：ショップでアイテムを購入し、画面下部から使用します",
            "・やり直し：右下のUNDOボタンを使用します（消費：5エッセンス）",
            "・アイテム：アイコンを1回タップで選択(確認)、2回目で使用/モード移行します。",
        ].join("\n"),
        helpClose: "閉じる",
        settings: "設定",
        continue: "次へ進む",
        shopTitle: "ショップ",
        shopSub: "エッセンスを消費して安定を得る",
        gameOver: "奈落に呑まれた",
        gameOverSub: "深淵はまた一つ魂を喰らった...",
        victory: "進化",
        victorySub: "進化させる能力を選択してください",
        typeInstant: "即時実行",
        typeItem: "所持アイテム",
        reroll: "リロール",
        statusBtn: "ステータス",
        retireBtn: "リタイア",
        helpBtn: "ヘルプ",
        paletteBtn: "パレット",
        paletteTitle: "カラーパレット",
        close: "閉じる"
    }
};
let currentLang = 'ja';
function updateStartScreenButtons(){
    const hasSave = hasSaveData();
    const cbtn = ui('continue-run-btn');
    if (cbtn) cbtn.classList.toggle('hidden', !hasSave);
    setText('start-run-btn', t('startBtn'));
    setText('continue-btn-text', t('continueBtn'));
}
function setLang(lang){
    currentLang = lang;
    document.getElementById('lang-en').classList.toggle('active', lang==='en');
    document.getElementById('lang-ja').classList.toggle('active', lang==='ja');
    applyLang();
    updateStartScreenButtons();
    renderHUD();
    localStorage.setItem('abyss_alchemy_lang', lang);
}
function t(key){
    return translations[currentLang]?.[key] ?? translations.en[key] ?? key;
}
function applyLang(){
    setText('start-subtitle', t('subtitle'));
    setText('start-run-btn', t('startBtn'));
    setText('continue-btn-text', t('continueBtn'));
    setText('ui-subtitle', t('subtitle'));
    setText('ui-title', translations.en.subtitle);
    setText('ui-goal-title', t('goalTitle'));
    setText('help-text', t('helpText'));
    setText('help-close', t('helpClose'));
    setText('ui-mutations-label', t('mutationsLabel'));
    setText('btn-status-perk-text', t('statusBtn'));
    setText('btn-retire-text', t('retireBtn'));
    setText('btn-help-text', t('helpBtn'));
    setText('btn-palette-text', t('paletteBtn'));
    setText('palette-modal-title', t('paletteTitle'));
    setText('palette-close', t('close'));
    const btnText = currentLang === 'ja' ? 'ステータス' : 'Status';
    const mutationBtnLabel = document.getElementById('btn-mutations-text');
    if(mutationBtnLabel) mutationBtnLabel.textContent = btnText;
    const modalTitle = document.getElementById('mutations-modal-title');
    if(modalTitle) modalTitle.textContent = currentLang === 'ja' ? 'ボーナス・ステータス' : 'Bonus & Stats';
    const modalSub = document.getElementById('mutations-modal-subtitle');
    if(modalSub) modalSub.textContent = currentLang === 'ja' ? 'ステータス' : 'STATUS';
}
const btnStatusPerk = ui('btn-status-perk');
if (btnStatusPerk) {
    btnStatusPerk.onclick = (e) => {
        e.stopPropagation();
        openMutationsScreen();
    };
}
function initSkillScroll() {
    const sc = ui('skills-container');
    let isDown = false;
    let startX;
    let scrollLeft;
    sc.addEventListener('mousedown', (e) => {
        isDown = true;
        sc.classList.add('active');
        startX = e.pageX - sc.offsetLeft;
        scrollLeft = sc.scrollLeft;
    });
    sc.addEventListener('mouseleave', () => {
        isDown = false;
    });
    sc.addEventListener('mouseup', () => {
        isDown = false;
    });
    sc.addEventListener('mousemove', (e) => {
        if (!isDown) return;
        e.preventDefault();
        const x = e.pageX - sc.offsetLeft;
        const walk = (x - startX) * 2; 
        sc.scrollLeft = scrollLeft - walk;
    });
}
initSkillScroll();
const COLOR_POOL = [
    { key: 'R', name:{en:'Crimson', ja:'紅'}, hex:'#dc2626' }, 
    { key: 'B', name:{en:'Azure', ja:'蒼'}, hex:'#3b82f6' },
    { key: 'Y', name:{en:'Amber', ja:'琥珀'}, hex:'#fbbf24' },
    { key: 'W', name:{en:'Ivory', ja:'象牙'}, hex:'#e2e8f0' },
    { key: 'K', name:{en:'Obsidian', ja:'黒'}, hex:'#1f273a' },
    { key: 'G', name:{en:'Emerald', ja:'翠'}, hex:'#22c55e' }, 
    { key: 'P', name:{en:'Amethyst', ja:'紫'}, hex:'#a855f7' }, 
    { key: 'O', name:{en:'Orange', ja:'橙'}, hex:'#f97316' }, 
    { key: 'T', name:{en:'Teal', ja:'青緑'}, hex:'#06b6d4' }, 
    { key: 'M', name:{en:'Pink', ja:'桃'}, hex:'#d946ef' }, 
];
const PALETTES_DATA = {
    default:   ['#dc2626','#3b82f6','#fbbf24','#e2e8f0','#1f273a','#22c55e','#a855f7','#f97316','#06b6d4','#d946ef'],
    vivid:     ['#ff0000','#0044ff','#ffcc00','#ffffff','#000000','#00ff00','#9900ff','#ff6600','#00ffff','#ff00cc'],
    universal: ['#ff4b00','#005aff','#f6aa00','#f2f2f2','#222222','#03af7a','#990099','#d67b24','#4dc4ff','#ff99ff']
};
let currentPalette = 'default';
function setPalette(mode) {
    if (!PALETTES_DATA[mode]) return;
    currentPalette = mode;
    ['default', 'vivid', 'universal'].forEach(m => {
        const btn = document.getElementById(`pal-${m}`);
        if(btn) btn.classList.toggle('active', m === mode);
    });
    ['default', 'vivid', 'universal'].forEach(m => {
        const modalBtn = document.getElementById(`modal-pal-${m}`);
        if(modalBtn) {
            if(m === mode) {
                modalBtn.classList.add('border-sky-500', 'bg-sky-500/10');
                modalBtn.classList.remove('border-white/10');
            } else {
                modalBtn.classList.remove('border-sky-500', 'bg-sky-500/10');
                modalBtn.classList.add('border-white/10');
            }
        }
    });
    const colors = PALETTES_DATA[mode];
    COLOR_POOL.forEach((item, index) => {
        if (colors[index]) {
            item.hex = colors[index];
        }
    });
    const previewEl = document.getElementById('palette-preview');
    if (previewEl) {
        previewEl.innerHTML = '';
        colors.forEach(c => {
            const rect = document.createElement('div');
            rect.style.backgroundColor = c;
            rect.className = 'flex-1 h-full shadow-sm rounded-[1px]';
            previewEl.appendChild(rect);
        });
    }
    const container = document.getElementById('tubes-container');
    if (container && container.children.length > 0) {
        document.querySelectorAll('.water-container').forEach(el => {
            delete el.dataset.lastState;
        });
        renderBoard(); 
    }
    renderSkills();
    localStorage.setItem('abyss_alchemy_palette', mode);
    const modeName = mode === 'default' ? 'Standard' : (mode === 'vivid' ? 'Vivid' : 'Universal');
    showToast(`Color Mode: ${modeName}`, 'sky');
}
function closeModal(id) {
    const el = document.getElementById(id);
    if(el) el.classList.replace('flex', 'hidden');
}
const btnPalette = ui('btn-palette');
if(btnPalette){
    btnPalette.onclick = (e) => {
        e.stopPropagation();
        setPalette(currentPalette); 
        ui('palette-screen').classList.replace('hidden', 'flex');
    };
}
const btnPaletteClose = ui('palette-close');
if(btnPaletteClose){
    btnPaletteClose.onclick = (e) => {
        e.stopPropagation();
        closeModal('palette-screen');
    };
}
function initPalette() {
    const saved = localStorage.getItem('abyss_alchemy_palette');
    if (saved && PALETTES_DATA[saved]) {
        setPalette(saved);
    } else {
        setPalette('default');
    }
}
const PERKS = {
    catalyst: {id:'catalyst',name:{en:'Catalyst', ja:'触媒反応'},rarity:'epic',desc:{en:'Complete a color only once per level to reduce pressure by [4 + Lv].',                 ja:'階層ごとに1回だけ色を完成させるとプレッシャーが [4 + Lv] 下がる。'},},
    reflux: {id:'reflux',name:{en:'Reflux', ja:'逆流制御'},rarity:'common',desc:{en:'First [Lv] undos each floor are free (Pressure +2 instead).',                              ja:'各階層、最初の [Lv] 回のUndoはエッセンス無料。'},},
    overflow: {id:'overflow',name:{en:'Overflow', ja:'オーバーフロー'},rarity:'common',desc:{en:'Pressure max +[Lv x 4].',                                                      ja:'プレッシャーの最大許容量が +[Lv x 4] される。'},},
    purification: {id:'purification',name:{en:'Purification', ja:'浄化作用'},rarity:'epic',desc:{en:'Clearing Obsidian reduces Pressure by [2 + Lv] and grants [1 + Lv] Essence.', ja:'黒消滅時、プレッシャー-[2 + Lv]、エッセンス+[1 + Lv]。'},},
    scavenger: {id:'scavenger',name:{en:'Scavenger', ja:'スカベンジャー'},rarity:'rare',desc:{en:'[10 + Lv x 5]% chance to find item on new floor.',                            ja:'階層移動時、[10 + Lv x 5]% の確率でアイテムを獲得する。'},},
    recycler: {id:'recycler',name:{en:'Recycler', ja:'リサイクル'},rarity:'epic',desc:{en:'[Lv x 10]% chance to not consume item on use.',                                      ja:'アイテム使用時、[Lv x 10]% の確率で消費しない。'},},
    bargain: {id:'bargain',name:{en:'Bargain', ja:'交渉術'},rarity:'common',desc:{en:'Shop prices reduced by [15 + Lv x 5]%.',                                                  ja:'ショップ価格 [15 + Lv x 5]% OFF。'},},
    heavy_mastery: {id:'heavy_mastery',name:{en:'Heavy Mastery', ja:'大容量ボーナス'},rarity:'rare',desc:{en:'Clearing 5+ capacity tube reduces Pressure by [2 + Lv].',         ja:'容量5以上のチューブ完成でプレッシャー [2 + Lv] 減少。'},},
    void_shield: {id:'void_shield',name:{en:'Void Shield', ja:'虚空の盾'},rarity:'rare',desc:{en:'[Lv x 15]% chance to negate Pressure damage.',                                ja:'プレッシャーダメージを受けた時、[Lv x 15]% で無効化する。'},},
    transmutation: {id:'transmutation',name:{en:'Transmutation', ja:'物質変換'},rarity:'epic',desc:{en:'Start each floor with [Lv] random items.',                              ja:'階層開始時、[Lv] 個のランダムアイテムを獲得する。'},},
    steady_hand: {id:'steady_hand',name:{en:'Steady Hand', ja:'安定した手'},rarity:'rare',desc:{en:'Pressure does not rise for the first [Lv x 3] turns of a floor.',           ja:'階層開始から [Lv x 3] ターンの間、プレッシャーが上昇しない。'},},
    deep_adapt: {id:'deep_adapt',name:{en:'Deep Adapt', ja:'深層適応'},rarity:'epic',desc:{en:'Gain [Lv] Max HP if capacity > 4 at start of floor.',                            ja:'階層開始時、容量5以上なら最大HP+[Lv]。'},},
    coupon: {id: 'coupon',name: {en:'Coupon', ja:'クーポン券'},rarity: 'common',desc: {en:'Start each floor with [Lv] free Rerolls.',                                           ja:'階層開始時、無料でリロールできるクーポンを [Lv] 枚得る。'}},
    flow_mastery: {id:'flow_mastery',name:{en:'Flow Mastery', ja:'フロー熟練'},rarity:'common',desc:{en:'Combo reduces Pressure by [Lv x 2].',                                  ja:'コンボ発生時、プレッシャーが [Lv x 2] 下がる。'},},
    efficiency: {id:'efficiency',name:{en:'Efficiency', ja:'抽出効率'},rarity:'common',desc:{en:'Tube completion has [Lv x 20]% chance to grant +1 Essence.',                   ja:'色完成時、[Lv x 20]% の確率で +1 エッセンスを獲得。'},},
    momentum: {id:'momentum',name:{en:'Momentum', ja:'慣性律'},rarity:'common',desc:{en:'After completing a tube, Pressure does not rise for [Lv] turns.',                      ja:'色完成後、[Lv] ターンの間、プレッシャーが上昇しない。'},},
    crimson_resonance: {id:'crimson_resonance',name:{en:'Crimson Resonance', ja:'紅の熱量'},rarity:'rare',desc:{en:'Completing Crimson heals 1 HP but adds [6 - Lv] Pressure.', ja:'紅完成時、HPが1回復するが、プレッシャーが [6 - Lv] 上昇する。'},},
    azure_cycle: {id:'azure_cycle',name:{en:'Azure Cycle', ja:'蒼の循環'},rarity:'common',desc:{en:'Azure completion reduces Pressure by [Lv x 3] additional.',                 ja:'蒼完成時、プレッシャーが [Lv x 3] 減少する。'},},
    amber_greed: {id:'amber_greed',name:{en:'Amber Alchemy', ja:'琥珀の錬金'},rarity:'rare',desc:{en:'Amber completion grants [Lv x 2] Essence.',                               ja:'琥珀完成時、エッセンスを [Lv x 2] 獲得する。'},},
    ivory_sanctuary: {id:'ivory_sanctuary',name:{en:'Ivory Sanctuary', ja:'象牙の聖域'},rarity:'epic',desc:{en:'Ivory completion removes [Lv] Obsidian from random tubes.',     ja:'象牙完成時、ランダムなチューブから黒を [Lv] 個除去する。'},},
    emerald_vitality: {id:'emerald_vitality',name:{en:'Emerald Vitality', ja:'翠の活力'},rarity:'common',desc:{en:'Emerald completion reduces Pressure by [40 + Lv x 10]% + [Lv].',ja:'翠完成時、プレッシャーを [40 + Lv x 10]% 減少させ、さらに [Lv] 下げる。'},},
    amethyst_surge: {id:'amethyst_surge',name:{en:'Amethyst Surge', ja:'紫の脈動'},rarity:'rare',desc:{en:'Amethyst completion grants +[Lv] free Undo charges.',                ja:'紫完成時、無料Undoの回数を [Lv] 回増やす。'},},
    orange_drive: {id:'orange_drive',name:{en:'Orange Drive', ja:'橙の推進'},rarity:'common',desc:{en:'Orange completion stops Pressure rise for [Lv x 2] turns.',              ja:'橙完成時、[Lv x 2] ターンの間プレッシャーが上昇しなくなる。'},},
    teal_equilibrium: {id:'teal_equilibrium',name:{en:'Teal Analysis', ja:'青緑の分析'},rarity:'rare',desc:{en:'Teal completion progresses Secondary Goal by 1.',               ja:'青緑完成時、副目標の進行度が 1 進む。'},},
    pink_luck: {id:'pink_luck',name:{en:'Pink Luck', ja:'桃の幸運'},rarity:'rare',desc:{en:'Pink completion has [Lv x 10]% chance to drop a random item.',                      ja:'桃完成時、[Lv x 10]% の確率でアイテムを獲得する。'},}
};
const ITEMS = {
    heal: {id: 'heal', type: 'consumable', cost: 8, icon: '🩹', name: {en:'Stabilizer', ja:'安定剤'},desc: {en:'Heal +1 HP.', ja:'HPを+1回復する'}},
    panacea: {id: 'panacea', type: 'consumable', cost: 15, icon: '💊',name: {en:'Panacea', ja:'万能薬'},desc: {en:'Heal +2 HP.', ja:'HPを+2回復する'}},
    sedative: {id: 'sedative', type: 'consumable', cost: 12, icon: '💤',name: {en:'Sedative', ja:'鎮静剤'},desc: {en:'Set Pressure to 0.', ja:'プレッシャーを0にする'}},
    layer_swap: {id: 'layer_swap', type: 'consumable', cost: 12, icon: '🔗',name: {en:'Layer Swap', ja:'層交換'},desc: {en:'Swap top 2 layers.', ja:'上2つの層を入れ替え'}},
    shaker: {id: 'shaker', type: 'consumable', cost: 5, icon: '🎲',name: {en:'Shaker', ja:'シェイカー'},desc: {en:'Shuffle tube.', ja:'中身をシャッフル'}},
    cursed_sludge: {id: 'cursed_sludge', type: 'consumable', cost: 6, icon: '⚫',name: {en:'Cursed Sludge', ja:'呪いの泥'},desc: {en:'Add Obsidian if space.', ja:'空きがあれば黒を追加'}},
    void_salt: {id: 'void_salt', type: 'consumable', cost: 8, icon: '🧂',name: {en:'Void Salt', ja:'虚無の塩'},desc: {en:'Remove top Black.', ja:'一番上の【黒】を除去'}},
    transfer: {id: 'transfer', type: 'consumable', cost: 10, icon: '🧴',name: {en:'Surface Transfer', ja:'水面移送'},desc: {en:'Move top 1 segment anywhere.', ja:'一番上の色を吸い出しどこにでも注入する'}},
    vacuum: {id: 'vacuum', type: 'consumable', cost: 14, icon: '🌀',name: {en:'Obsidian Vacuum', ja:'黒吸引機'},desc: {en:'Remove all top Obsidian.', ja:'一番上の黒インクを全除去'}},
    midas: {id: 'midas', type: 'consumable', cost: 8, icon: '🖐️',name: {en:'Alchemy Stone', ja:'対黒変成'},desc: {en:'Obsidian > Essence.', ja:'一番上の黒をエッセンスに'}},
    vaporizer: {id: 'vaporizer', type: 'consumable', cost: 7, icon: '♨️',name: {en:'Vaporizer', ja:'微量蒸発'},desc: {en:'Delete top 1 segment.', ja:'一番上の1層を除去'}},
    sediment: {id: 'sediment', type: 'consumable', cost: 10, icon: '⏬',name: {en:'Sediment', ja:'沈殿'},desc: {en:'Move top to bottom.', ja:'一番上を一番下へ'}},
    quantum_pipette: {id: 'quantum_pipette', type: 'consumable', cost: 15, icon: '💉',name: {en:'Quantum Pipette', ja:'量子スポイト'},desc: {en:'Extract bottom color.', ja:'一番下の色を吸い出しどこにでも注入する'}},
    cycle_siphon: {id: 'cycle_siphon', type: 'consumable', cost: 10, icon: '⏫',name: {en:'Cycle Siphon', ja:'循環サイフォン'},desc: {en:'Move bottom to top.', ja:'一番下を一番上へ'}},
    inverter: {id: 'inverter', type: 'consumable', cost: 6, icon: '🔄',name: {en:'Gravity Coil', ja:'重力反転機'},desc: {en:'Invert contents.', ja:'中身を上下反転'}},
    separator: {id: 'separator', type: 'consumable', cost: 12, icon: '🌪️',name: {en:'Separator', ja:'遠心分離機'},desc: {en:'Sort tube contents.', ja:'中身を整理する'}},
    summon_vial: {id: 'summon_vial', type: 'consumable', cost: 20, icon: '🧪',name: {en:'Extra Vial', ja:'予備試験管'},desc: {en:'Add empty tube.', ja:'空のチューブを1つ追加'}},
};
const INSTANT_ITEMS = [
    { id:'dark_pact',   type:'stat', cost:0, name:{en:'Dark Pact', ja:'黒の契約'},  desc:{en:'HP-2, +20 Ess', ja:'HP-2, +20エッセンス'}, apply(gs){     if(gs.hp > 2){        gs.hp -= 2; gs.essence += 20;         showToast('Power at a cost...', 'purple');     } else {        showToast('Too weak...', 'red');    }}             },
    { 
        id:'mystery_box', 
        type:'stat', 
        cost:8, 
        name:{en:'Mystery Box', ja:'福袋'},    
        desc:{en:'Random Item', ja:'ランダムアイテム'}, 
        apply(gs) {
            const keys = Object.keys(ITEMS).filter(k => ITEMS[k].type === 'consumable');
            const availableKeys = keys.filter(k => (gs.inventory[k] || 0) < 3);
            if (availableKeys.length > 0) {
                const gift = pick(availableKeys);
                if (!gs.inventory[gift]) gs.inventory[gift] = 0;
                gs.inventory[gift]++;
                const item = ITEMS[gift];
                const itemName = currentLang === 'ja' ? item.name.ja : item.name.en;
                const msg = currentLang === 'ja' ? `${item.icon} ${itemName} を獲得` : `${item.icon} ${itemName} Obtained`;
                showToast(msg, 'yellow');
                refreshRerollUI();
                updateShopButtons();
                const shopContainer = document.getElementById('shop-cards');
                if (shopContainer && gs.currentShopOffers) {
                    shopContainer.innerHTML = '';
                    gs.currentShopOffers.forEach(offer => {
                        shopContainer.appendChild(buildShopCard(offer));
                    });
                }
            } else {
                showToast(currentLang === 'ja' ? 'すべてのアイテムが最大数です' : 'All items at max capacity!', 'rose');
                gs.essence += 8;
            }
        }
    }
];
const SHOP_POOL = [
    ...INSTANT_ITEMS,
    ...Object.values(ITEMS).map(i => ({ id: `buy_${i.id}`, type: 'item', ref: i }))
];
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
    pressureMax: 20,
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
};
const tubesContainer = ui('tubes-container');
const boardArea = ui('board-area');
const boardScrollArea = ui('board-scroll-area');
const skillsContainer = ui('skills-container');
const startScreen = ui('start-screen');
const perkScreen = ui('perk-screen');
const perkCards = ui('perk-cards');
const shopCards = ui('shop-cards');
const continueBtn = ui('continue-btn');
const rerollBtn = ui('reroll-btn');
const helpScreen = ui('help-screen');
const mutationsScreen = ui('mutations-screen');
const eventScreen = ui('event-screen');
const eventChoices = ui('event-choices');
const devTests = ui('dev-tests');
const alertBanner = ui('alert-banner');
const undoBtn = ui('btn-undo');
const continueRunBtn = ui('continue-run-btn');
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
function onLevelClear(){
    if (gameState.busy) return;
    gameState.busy = true;
    const baseReward = 6;
    const floorBonus = Math.floor((gameState.floor - 1) / 2);
    const subGoalBonus = secondarySucceeded() ? 4 : 0;
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
function isDeadlocked(){
    for(let i=0; i<gameState.tubes.length; i++){
        if(gameState.tubes[i].length === 0) continue; 
        for(let j=0; j<gameState.tubes.length; j++){
            if(i===j) continue;
            const check = canPour(i, j);
            if(check.ok) return false; 
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
const CLONE_PADDING = 10; 
function renderBoard(resetScroll = false){
    const slider = document.getElementById('board-scroll-area');
    const currentScrollPos = slider ? slider.scrollLeft : 0;
    const deadlocked = isDeadlocked();
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
        setClass('selected', i === gameState.selectedIdx);
        setClass('tube-focused', gameState.focusIdx !== null && i === gameState.focusIdx);
        setClass('deadlock-glow', deadlocked);
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
            if (gameState.extractorHeldColor && i === gameState.extractorSourceIdx) {
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
window.addEventListener('resize', () => {
    requestAnimationFrame(adjustBoardScale);
});
function renderSkills(){
    skillsContainer.innerHTML = '';
        const isHoldingColor = gameState.extractorHeldColor !== null;
    Object.keys(gameState.inventory).forEach(key => {
        const count = gameState.inventory[key];
        if(count > 0 || ITEMS[key].type === 'tool'){
            const def = ITEMS[key];
            const btn = document.createElement('button');
                                    const isCurrentActiveTool = (key === 'pipette' && gameState.pipetteMode) || (gameState.targetMode === key);
            btn.disabled = isHoldingColor && !isCurrentActiveTool;
            btn.className = 'skill-btn w-12 h-12 glass-panel flex items-center justify-center text-xl rounded-full border border-white/10 shrink-0';
            if (btn.disabled) {
                btn.classList.add('opacity-20', 'grayscale', 'pointer-events-none');
            }
            btn.dataset.id = key; 
            const name = currentLang==='ja' ? def.name.ja : def.name.en;
            const desc = currentLang==='ja' ? def.desc.ja : def.desc.en;
            let badgeHtml = '';
            if(def.type === 'consumable'){
                badgeHtml = `<span class="absolute -top-1 -right-1 bg-sky-500 text-[10px] font-bold px-1.5 rounded-full text-white pointer-events-none">${count}</span>`;
            }
            btn.innerHTML = `${def.icon}${badgeHtml}`;
            if (key === 'pipette' && gameState.pipetteMode) btn.classList.add('active');
            if (gameState.pendingSkill === key) btn.classList.add('pending');
            if (gameState.targetMode === key) btn.classList.add('active-mode');
                        if (['extractor', 'transfer', 'quantum_pipette'].includes(gameState.targetMode) && key === gameState.targetMode) {
                if(gameState.extractorHeldColor) {
                    btn.classList.add('extracting');
                    btn.innerHTML = `<div style="width:16px;height:16px;border-radius:50%;background:${colorMeta(gameState.extractorHeldColor).hex};border:2px solid white;"></div>` + badgeHtml;
                } else {
                    btn.classList.add('active-mode');
                }
            }
                        btn.onclick = () => activateSkill(key);
            btn.onmouseenter = () => showGlobalTooltip(btn, name, desc);
            btn.onmouseleave = () => hideGlobalTooltip();
            skillsContainer.appendChild(btn);
        }
    });
}
function activateSkill(key){
    if(gameState.busy) return;
            if (gameState.extractorHeldColor !== null) {
        showToast(currentLang==='ja'?'配置を完了させてください':'Finish placing the color first', 'rose');
        return;
    }
    const def = ITEMS[key];
            if (gameState.pendingSkill === key) {
        gameState.pendingSkill = null; 
        hideGlobalTooltip();
                        if(key === 'heal' || key === 'panacea'){
                if(gameState.inventory[key] > 0){
                    if(gameState.hp >= gameState.maxHp){
                        showToast(currentLang==='ja'?'HPは満タンです':'HP is full', 'yellow');
                        return; 
                    }
                    gameState.inventory[key]--;
                    const healAmount = (key === 'panacea') ? 2 : 1;
                    gameState.hp = Math.min(gameState.maxHp, gameState.hp + healAmount);
                    saveGame();
                    renderHUD();
                    showToast(currentLang==='ja'?'HP回復！':'HP Restored!', 'emerald');
                }
                return;
        }
        if(key === 'summon_vial'){
                if(gameState.inventory[key] > 0){
                    gameState.inventory[key]--;
                    gameState.tubeCount++;
                    gameState.tubes.push([]);
                    saveGame();
                    renderBoard();
                    showToast(currentLang==='ja'?'空き瓶を追加！':'Extra Tube Added!', 'purple');
                }
                return;
        }
        if(key === 'sedative'){
                if(gameState.inventory[key] > 0){
                    gameState.inventory[key]--;
                    gameState.pressure = 0;
                    saveGame();
                    renderHUD();
                    showToast("Sedative Active!", 'purple');
                }
                return;
        }
                        if(def.type === 'tool' && key === 'pipette'){
            gameState.pipetteMode = !gameState.pipetteMode;
            gameState.targetMode = null; 
        } else if (def.type === 'consumable'){
            gameState.targetMode = key;
            gameState.pipetteMode = false;
            showToast(currentLang==='ja' ? "対象を選択してください" : "Select target", 'sky');
        }
                renderSkills();
        renderBoard();
        return;
    }
        gameState.pendingSkill = key;
    gameState.targetMode = null; 
    showToast(currentLang==='ja'?'もう一度タップして使用':'Tap again to use', 'yellow');
        renderSkills();
    renderBoard();
}
function cancelInteraction() {
    if (!gameState.extractorHeldColor || gameState.extractorSourceIdx === null) return;
    const srcIdx = gameState.extractorSourceIdx;
    const color = gameState.extractorHeldColor;
    if (gameState.targetMode === 'quantum_pipette' || gameState.pipetteMode) {
        gameState.tubes[srcIdx].unshift(color);
    } else {
        gameState.tubes[srcIdx].push(color);
    }
    gameState.extractorHeldColor = null;
    gameState.extractorSourceIdx = null;
    gameState.busy = false;
    showToast(currentLang === 'ja' ? 'キャンセル' : 'Canceled', 'sky');
    renderHUD();
    renderBoard();
}
async function handleTubeClick(idx) {
    if (gameState.busy) return;
    if (gameState.extractorHeldColor !== null && gameState.extractorSourceIdx === idx) {
        const tube = gameState.tubes[idx];
        if (tubeFree(tube) <= 0) {
            showFloatText(idx, "Full!", "#ef4444");
            return;
        }
        pushHistory();
        tube.push(gameState.extractorHeldColor);
        const colorBeingPlaced = gameState.extractorHeldColor;
        gameState.extractorHeldColor = null;
        gameState.extractorSourceIdx = null;
        if (gameState.pipetteMode) {
            gameState.pipetteMode = false;
            if(gameState.inventory['pipette'] > 0) gameState.inventory['pipette']--;
        } else if (gameState.inventory[gameState.targetMode] > 0) {
            let consume = true;
            if(hasPerk('recycler') && Math.random() < getPerkLevel('recycler') * 0.1) {
                consume = false;
                showToast("Recycled!", 'purple');
            }
            if(consume) gameState.inventory[gameState.targetMode]--;
            gameState.targetMode = null;
        }
        showFloatText(idx, "Placed!", "#22c55e");
        saveGame();
        renderHUD();
        renderBoard();
        if(isCompleteTube(tube)) await handleCompletion(idx, colorBeingPlaced);
        renderSkills();
        return;
    }
    if (gameState.pendingSkill !== null) {
        gameState.pendingSkill = null;
        renderSkills();
    }
    if (['extractor', 'transfer', 'quantum_pipette'].includes(gameState.targetMode)) {
        await handleTwoStepSkill(idx);
        renderSkills();
        return;
    }
    if (gameState.pipetteMode) {
        const tube = gameState.tubes[idx];
        if (!gameState.extractorHeldColor) {
            if (tube.length === 0) return;
            gameState.extractorHeldColor = tube.shift();
            gameState.extractorSourceIdx = idx;
            showToast(currentLang === 'ja' ? '抽出完了：配置先を選択' : 'Extracted: Select Target', 'emerald');
            renderSkills();
            renderBoard();
        } else {
            if (tube.length >= gameState.capacity) {
                showFloatText(idx, "Full!", "#ef4444");
                return;
            }
            pushHistory();
            tube.push(gameState.extractorHeldColor);
            const colorBeingPlaced = gameState.extractorHeldColor;
            gameState.extractorHeldColor = null;
            gameState.extractorSourceIdx = null;
            gameState.pipetteMode = false;
            if(gameState.inventory['pipette'] > 0) gameState.inventory['pipette']--;
            renderHUD();
            renderBoard();
            saveGame();
            if(isCompleteTube(tube)) await handleCompletion(idx, colorBeingPlaced);
            renderSkills();
        }
        return;
    }
    if (gameState.targetMode) {
        await applySkillEffect(idx);
        return;
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
        let pressureImmune = (hasPerk('steady_hand') && gameState.turnCount < getPerkLevel('steady_hand') * 3) || gameState.momentumTurns > 0;
        if (gameState.momentumTurns > 0) { gameState.momentumTurns--; pressureImmune = true; }
        let isOverloaded = false;
        if (!pressureImmune) {
            isOverloaded = addPressure(check.moveCount);
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
        } else if (gameState.secondaryGoal?.type === 'combo') {
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
async function handleTwoStepSkill(idx) {
    const tube = gameState.tubes[idx];
    const skillKey = gameState.targetMode;
    if (!gameState.extractorHeldColor) {
        if (tube.length === 0) {
            showFloatText(idx, "Empty!", "#ef4444");
            return;
        }
        gameState.busy = true;
        gameState.extractorHeldColor = (skillKey === 'quantum_pipette') ? tube.shift() : tube.pop();
        gameState.extractorSourceIdx = idx;
        showFloatText(idx, "Extracted!", "#22c55e");
        renderBoard(); 
        gameState.busy = false;
        showToast(currentLang==='ja' ? "配置先を選択してください" : "Select destination", 'emerald');
    } 
    else {
        if ((skillKey !== 'transfer' && skillKey !== 'quantum_pipette') && tube.length > 0 && tube[tube.length-1] !== gameState.extractorHeldColor) {
            showFloatText(idx, "Mismatch!", "#ef4444");
            return;
        }
        if (tubeFree(tube) <= 0) {
            showFloatText(idx, "Full!", "#ef4444");
            return;
        }
        pushHistory();
        gameState.busy = true;
        const heldColor = gameState.extractorHeldColor;
        tube.push(heldColor);
        gameState.extractorHeldColor = null;
        gameState.extractorSourceIdx = null;
        if (gameState.inventory[skillKey] > 0) {
            let consume = true;
            if(hasPerk('recycler') && Math.random() < getPerkLevel('recycler') * 0.1){
                consume = false;
                showToast("Recycled!", 'purple');
            }
            if(consume) gameState.inventory[skillKey]--;
        }
        gameState.targetMode = null; 
        showFloatText(idx, "Placed!", "#22c55e");
        renderBoard();
        if(isCompleteTube(tube)){
            await handleCompletion(idx, heldColor);
        }
        gameState.busy = false;
        saveGame();
        renderHUD();
        renderBoard();
        renderSkills();
        if (checkLevelClear()) {
            onLevelClear();
        }
    }
}
async function applySkillEffect(idx){
    const skillKey = gameState.targetMode;
    const tube = gameState.tubes[idx];
    if(!skillKey || !gameState.inventory[skillKey] || gameState.inventory[skillKey] <= 0) return;
    let success = false;
    let consume = true;
    let removedColor = null;
    if(hasPerk('recycler') && Math.random() < getPerkLevel('recycler') * 0.1) consume = false;
    gameState.busy = true;
    try {
        pushHistory();
        if(skillKey === 'inverter' && tube.length >= 2){
            tube.reverse(); showFloatText(idx, "Inverted!", "#a855f7"); success = true;
        } else if (skillKey === 'void_salt' && tube.length > 0 && tube[tube.length-1] === 'K'){
            tube.pop(); showFloatText(idx, "Voided!", "#a855f7"); success = true;
        } else if (skillKey === 'separator' && tube.length >= 2){
            const counts = {}; tube.forEach(c => counts[c] = (counts[c]||0)+1);
            const newTube = []; Object.keys(counts).sort().forEach(c => { for(let i=0; i<counts[c]; i++) newTube.push(c); });
            gameState.tubes[idx] = newTube; showFloatText(idx, "Separated!", "#a855f7"); success = true;
        } else if (skillKey === 'cycle_siphon' && tube.length > 0){
            tube.push(tube.shift()); showFloatText(idx, "Cycled!", "#a855f7"); success = true;
        } else if (skillKey === 'sediment' && tube.length >= 2){
            tube.unshift(tube.pop()); showFloatText(idx, "Sunk!", "#a855f7"); success = true;
        } else if (skillKey === 'layer_swap' && tube.length >= 2){
            const t1 = tube.pop(), t2 = tube.pop(); tube.push(t1); tube.push(t2);
            showFloatText(idx, "Swapped!", "#a855f7"); success = true;
        } else if (skillKey === 'vacuum' && tube.length > 0 && tube[tube.length-1] === 'K'){
            while(tube.length > 0 && tube[tube.length-1] === 'K') tube.pop();
            showFloatText(idx, "Vacuumed!", "#a855f7"); success = true;
        } else if (skillKey === 'midas' && tube.length > 0 && tube[tube.length-1] === 'K'){
            tube.pop(); gameState.essence += 2; showFloatText(idx, "Gold! ✨+2", "#fbbf24"); success = true;
        } else if (skillKey === 'shaker' && tube.length >= 2){
            const orig = JSON.stringify(tube);
            for(let i=0; i<50; i++) {
                tube.sort(() => Math.random() - 0.5);
                if(JSON.stringify(tube) !== orig) break;
            }
            showFloatText(idx, "Shaken!", "#a855f7"); success = true;
        } else if (skillKey === 'cursed_sludge' && tube.length < gameState.capacity){
            tube.push('K'); showFloatText(idx, "Cursed!", "#0f172a"); success = true;
        } else if (skillKey === 'vaporizer' && tube.length > 0){
            removedColor = tube.pop();
            showFloatText(idx, "Vaporized!", "#94a3b8"); success = true;
        }
        if(success) {
            if(consume) gameState.inventory[skillKey]--;
            gameState.targetMode = null;
            const boardCounts = getBoardCounts();
            for (let i = 0; i < gameState.tubes.length; i++) {
                const t = gameState.tubes[i];
                if (gameState.completedFlags[i]) continue;
                if (isCompleteTube(t, boardCounts)) {
                    if (skillKey !== 'vaporizer' || (t.length > 0 && t[0] === removedColor)) {
                        await handleCompletion(i, t[0]);
                    }
                }
            }
        } else {
            gameState.history.pop();
        }
    } catch(e) { 
        console.error(e); 
    } finally {
        gameState.busy = false;
        renderHUD(); renderBoard(); saveGame();
    }
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
        completedFlags: [...gameState.completedFlags] 
    });
    if (gameState.history.length > 50) gameState.history.shift();
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
    // 触媒反応 (Catalyst)
    if (hasPerk('catalyst') && gameState.catalystAvailable) {
        const lv = getPerkLevel('catalyst'); 
        gameState.pressure = Math.max(0, gameState.pressure - (4 + lv));
        gameState.catalystAvailable = false; 
        showToast("Catalyst! Pressure Down", 'sky');
    }
    // 抽出効率 (Efficiency)
    if (hasPerk('efficiency') && Math.random() < getPerkLevel('efficiency') * 0.20) {
        gameState.essence += 1;
        showToast("Efficient! +1 Essence", 'yellow');
    }
    // 紅 (Crimson)
    if (colorKey === 'R' && hasPerk('crimson_resonance')) {
        gameState.hp = Math.min(gameState.maxHp, gameState.hp + 1);
        showToast("Resonance! HP+1 / Pressure Up", 'rose');
        const cost = Math.max(0, 6 - getPerkLevel('crimson_resonance'));
        if (addPressure(cost)) {
            await applyPressureDamage();
        }
    }
    // 蒼（Azure）: プレッシャー追加減少
    if (colorKey === 'B' && hasPerk('azure_cycle')) {
        const amount = getPerkLevel('azure_cycle') * 3;
        gameState.pressure = Math.max(0, gameState.pressure - amount);
        showToast(`Cycle! -${amount} Pressure`, 'blue');
    }
    // 琥珀（Amber）: エッセンス獲得
    if (colorKey === 'Y' && hasPerk('amber_greed')) {
        const amount = getPerkLevel('amber_greed') * 2;
        gameState.essence += amount;
        showToast(`Alchemy! +${amount} Essence`, 'amber');
    }
    // 象牙（Ivory）: 黒インク除去
    if (colorKey === 'W' && hasPerk('ivory_sanctuary')) {
        const amount = getPerkLevel('ivory_sanctuary');
        for(let i=0; i<amount; i++) removeOneObsidian();
        showToast("Sanctuary! Purged", 'slate');
    }
    // 翠（Emerald）: プレッシャー半減
    if (colorKey === 'G' && hasPerk('emerald_vitality')) {
        gameState.pressure = Math.floor(gameState.pressure / 2);
        showToast("Vitality! Pressure/2", 'emerald');
    }
    if (colorKey === 'G' && hasPerk('emerald_vitality')) {
        const lv = getPerkLevel('emerald_vitality');
        const ratio = Math.min(0.9, 0.4 + (lv * 0.1));
        const percentReduction = Math.floor(gameState.pressure * ratio);
        const totalReduction = percentReduction + lv;
        gameState.pressure = Math.max(0, gameState.pressure - totalReduction);
        showToast(`Emerald Vitality! -${totalReduction} Pressure`, 'emerald');
    }
    // 紫（Amethyst）: 無料Undo追加
    if (colorKey === 'P' && hasPerk('amethyst_surge')) {
        const amount = getPerkLevel('amethyst_surge');
        gameState.refluxUses += amount;
        showToast(`Surge! Undo+${amount}`, 'purple');
    }
    // 橙（Orange）: プレッシャー上昇停止
    if (colorKey === 'O' && hasPerk('orange_drive')) {
        const turns = getPerkLevel('orange_drive') * 2;
        gameState.momentumTurns += turns;
        showToast(`Drive! Momentum+${turns}`, 'orange');
    }
    // 青緑（Teal）: サブ目標進行
    if (colorKey === 'T' && hasPerk('teal_equilibrium')) {
        gameState.secondaryProgress += 1;
        showToast("Analysis! Goal+1", 'cyan');
    }
    // 桃（Pink）: アイテムドロップ抽選
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
            }
        }
    }
    // 大容量ボーナス (Heavy Mastery)
    if(hasPerk('heavy_mastery') && gameState.capacity >= 5){
        const lv = getPerkLevel('heavy_mastery'); 
        gameState.pressure = Math.max(0, gameState.pressure - (2 + lv));
        showToast("Heavy Mastery! Pressure Down", 'indigo');
    }
    // 慣性律 (Momentum)
    if(hasPerk('momentum')) {
        gameState.momentumTurns = getPerkLevel('momentum'); 
        showToast("Momentum! Pressure Stop", 'violet');
    }
    checkSecondaryGoalOnComplete(); 
    renderHUD();
    renderBoard();
    saveGame(); 
    await showCompletionEvent(colorKey);
    renderHUD(); 
    renderBoard();
    if (checkLevelClear()) onLevelClear();
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
function showCompletionEvent(colorKey){
    return new Promise((resolve) => {
        const name = colorName(colorKey);
        const titleText = currentLang==='ja' ? `${name}の安定化` : `${name} Stabilized`;
        const desc = currentLang==='ja' ? `${name}を完成させた。\n深淵が反応している。` : `You completed ${name}.\nThe abyss reacts to your achievement.`;
        const meta = colorMeta(colorKey);
        let iconHtml = meta ? `<span style="color:${meta.hex}; text-shadow:0 0 15px ${meta.hex}; margin-right:8px; font-size:1.1em;">■</span>` : '';
        ui('event-kicker').textContent = t('eventKicker');
        ui('event-title').innerHTML = iconHtml + titleText; 
        ui('event-desc').textContent = desc;
        const choices = buildEventChoices(colorKey); 
        eventChoices.innerHTML = '';
        choices.forEach(ch => {
            const card = document.createElement('div');
            card.className = 'glass-panel perk-card p-4 cursor-pointer hover:bg-white/5 border-l-4 border-l-sky-500 bg-slate-900/90';
            card.innerHTML = `<div class="text-[16px] text-sky-300 uppercase tracking-[0.35em] mb-1">${ch.kicker}</div><div class="text-xl font-black text-white">${ch.title}</div><div class="text-slate-400 text-xs mt-2 leading-relaxed">${ch.desc}</div>`;
            card.onclick = async () => { 
                await ch.apply(); 
                saveGame(); 
                eventScreen.classList.add('hidden'); 
                eventScreen.classList.remove('flex'); 
                resolve(); 
            };
            eventChoices.appendChild(card);
        });
        eventScreen.classList.remove('hidden'); eventScreen.classList.add('flex');
    });
}
function buildEventChoices(colorKey){
    const isJa = (currentLang === 'ja');
    const toast = (msg, color) => showToast(msg, color);
    // --- 蒼 (Azure) ---
    if (colorKey === 'B'){ 
        return [
            { 
                kicker: isJa ? '排出' : 'Vent', 
                title: isJa ? 'プレッシャー -4' : 'Pressure -4', 
                desc: isJa ? '安全を確保する' : 'Release built-up pressure.', 
                async apply(){ 
                    gameState.pressure = Math.max(0, gameState.pressure - 4); 
                    toast(isJa ? "プレッシャーを排出した" : "Pressure Vented", "sky");
                } 
            }, 
            { 
                kicker: isJa ? '知識' : 'Insight', 
                title: isJa ? 'エッセンス +4' : 'Essence +4', 
                desc: isJa ? 'リスクを取って富を得る' : 'Gain currency for the shop.', 
                async apply(){ 
                    gameState.essence += 4; 
                    toast(isJa ? "未知の知識を得た (+4 Essence)" : "Insight Gained (+4 Essence)", "amber");
                } 
            }
        ]; 
    }
    // --- 紅 (Crimson) ---
    if (colorKey === 'R'){ 
        return [
            { 
                kicker: isJa ? '活力' : 'Vitality', 
                title: isJa ? 'HP +1 / プレッシャー +3' : 'HP +1 / Pressure +3', 
                desc: isJa ? '回復するがプレッシャーが増える' : 'Heal yourself, but strain the system.', 
                async apply(){
                    gameState.hp = Math.min(gameState.maxHp, gameState.hp + 1);
                    toast(isJa ? "生命力が活性化した (HP+1)" : "Vitality Restored (HP+1)", "emerald");
                    if(addPressure(3)) await applyPressureDamage();
                } 
            }, 
            { 
                kicker: isJa ? '平静' : 'Calm', 
                title: isJa ? 'プレッシャー -6' : 'Pressure -6', 
                desc: isJa ? '心を落ち着ける' : 'Significantly reduce pressure.', 
                async apply(){ 
                    gameState.pressure = Math.max(0, gameState.pressure - 6); 
                    toast(isJa ? "精神を安定させた" : "Calm Mind", "sky");
                } 
            }
        ]; 
    }
    // --- 琥珀 (Amber / Yellow) ---
    if (colorKey === 'Y'){
        return [
            {
                kicker: isJa ? '投資' : 'Investment',
                title: isJa ? 'エッセンス +6' : 'Essence +6',
                desc: isJa ? '純度の高いエッセンスを抽出する' : 'Extract high-purity essence.',
                async apply(){ 
                    gameState.essence += 6; 
                    toast(isJa ? "高純度のエッセンスを抽出した (+6)" : "Extracted High-Purity Essence (+6)", "amber");
                }
            },
            {
                kicker: isJa ? '錬金' : 'Alchemy',
                title: isJa ? 'アイテム獲得' : 'Get Random Item',
                desc: isJa ? '物質をランダムな道具に変換する' : 'Transmute matter into a tool.',
                async apply(){
                    const k = getValidRandomConsumable();
                    if(k) {
                        gameState.inventory[k] = (gameState.inventory[k] || 0) + 1;
                        const name = isJa ? ITEMS[k].name.ja : ITEMS[k].name.en;
                        toast(isJa ? `${name} を精製した` : `Transmuted ${name}`, "yellow");
                    }
                }
            }
        ];
    }
    // --- 象牙 (Ivory / White) ---
    if (colorKey === 'W'){
        return [
            {
                kicker: isJa ? '聖域' : 'Sanctuary',
                title: isJa ? '黒除去 x2' : 'Remove 2 Obsidian',
                desc: isJa ? '瓶に溜まった穢れを浄化する' : 'Purify the abyss within tubes.',
                async apply(){ 
                    removeOneObsidian(); removeOneObsidian(); 
                    toast(isJa ? "穢れが浄化された" : "Purified Darkness", "slate");
                }
            },
            {
                kicker: isJa ? '反響' : 'Echo',
                title: isJa ? '無料Undo +2' : 'Free Undo +2',
                desc: isJa ? '過去をやり直す力を蓄える' : 'Store power to rewrite history.',
                async apply(){ 
                    gameState.refluxUses += 2; 
                    toast(isJa ? "過去を書き換える力を蓄積した (+2 Undo)" : "Time Echoes Stored (+2 Undo)", "purple");
                }
            }
        ];
    }
    // --- 翠 (Emerald / Green) ---
    if (colorKey === 'G'){
        return [
            {
                kicker: isJa ? '再生' : 'Regrow',
                title: isJa ? 'プレッシャーを0にする' : 'Set Pressure to 0',
                desc: isJa ? 'システムを完全にリセットする' : 'Completely reset the system.',
                async apply(){ 
                    gameState.pressure = 0; 
                    toast(isJa ? "システムが再生し負荷が消失した" : "System Regrown (Press set 0)", "emerald");
                }
            },
            {
                kicker: isJa ? '循環' : 'Circulate',
                title: isJa ? '最大HP +1 / HP回復' : 'Max HP +1 / Heal',
                desc: isJa ? '器そのものを強化する' : 'Strengthen the vessel itself.',
                async apply(){
                    gameState.maxHp += 1;
                    gameState.hp = Math.min(gameState.maxHp, gameState.hp + 1);
                    toast(isJa ? "器の限界が拡張された (MaxHP+1)" : "Vessel Expanded (MaxHP+1)", "emerald");
                }
            }
        ];
    }
    // --- 紫 (Amethyst / Purple) ---
    if (colorKey === 'P'){
        return [
            {
                kicker: isJa ? '深淵' : 'Abyss',
                title: isJa ? 'エッセンス +12 / プレッシャー +8' : 'Ess +12 / Press +8',
                desc: isJa ? '大きな代償で莫大な富を得る' : 'Gain wealth at a heavy cost.',
                async apply(){
                    gameState.essence += 12;
                    toast(isJa ? "深淵の代償を支払った (+12 Essence)" : "Paid Abyssal Price (+12 Essence)", "purple");
                    if(addPressure(8)) await applyPressureDamage();
                }
            },
            {
                kicker: isJa ? '歪み' : 'Warp',
                title: isJa ? 'ランダムアイテム x2' : '2 Random Items',
                desc: isJa ? '深淵から道具を惹き寄せる' : 'Pull items from the void.',
                async apply(){
                    for(let i = 0; i < 2; i++) {
                        const k = getValidRandomConsumable();
                        if(k) {
                            gameState.inventory[k] = (gameState.inventory[k] || 0) + 1;
                            const item = ITEMS[k];
                            const itemName = isJa ? item.name.ja : item.name.en;
                            const msg = isJa ? `${item.icon} ${itemName} を獲得` : `${item.icon} ${itemName} Obtained`;
                            setTimeout(() => {
                                toast(msg, "purple");
                            }, i * 400); 
                        } else {
                            const msg = isJa ? "インベントリ満タン：✨+5" : "Inventory Full: ✨+5";
                            gameState.essence += 5;
                            setTimeout(() => {
                                toast(msg, "slate");
                            }, i * 400);
                        }
                    }
                }
            }
        ];
    }
    // --- 橙 (Orange) ---
    if (colorKey === 'O'){
        return [
            {
                kicker: isJa ? '加速' : 'Accel',
                title: isJa ? 'プレッシャー停止 (10T)' : 'Freeze Press (10T)',
                desc: isJa ? 'しばらくの間、負荷を無効化する' : 'Nullify pressure for a while.',
                async apply(){ 
                    gameState.momentumTurns += 10; 
                    toast(isJa ? "時間の加速を感じる (10ターン無効化)" : "Time Accelerated (10T Silence)", "orange");
                }
            },
            {
                kicker: isJa ? '推進' : 'Thrust',
                title: isJa ? 'エッセンス +2 / HP +1' : 'Ess +2 / HP +1',
                desc: isJa ? '進むための活力を得る' : 'Gain energy to push forward.',
                async apply(){
                    gameState.essence += 2;
                    gameState.hp = Math.min(gameState.maxHp, gameState.hp + 1);
                    toast(isJa ? "前進する力を得た (Ess+2 / HP+1)" : "Thrust Forward (Ess+2 / HP+1)", "orange");
                }
            }
        ];
    }
    // --- 青緑 (Teal) ---
    if (colorKey === 'T'){
        return [
            {
                kicker: isJa ? '分析' : 'Analysis',
                title: isJa ? 'サブ目標進行 +2' : 'Sub Goal +2',
                desc: isJa ? '構造を解析し効率を高める' : 'Analyze structure for efficiency.',
                async apply(){ 
                    gameState.secondaryProgress += 2; 
                    toast(isJa ? "構造を分析し効率を高めた (Goal+2)" : "Analysis Complete (Goal+2)", "cyan");
                }
            },
            {
                kicker: isJa ? '均衡' : 'Equilibrium',
                title: isJa ? 'プレッシャー -3 / エッセンス +2' : 'Press -3 / Ess +2',
                desc: isJa ? '理想的なバランスを保つ' : 'Maintain perfect balance.',
                async apply(){
                    gameState.pressure = Math.max(0, gameState.pressure - 3);
                    gameState.essence += 2;
                    toast(isJa ? "完璧な均衡を保った" : "Equilibrium Restored", "cyan");
                }
            }
        ];
    }
    // --- 桃 (Pink) ---
    if (colorKey === 'M'){
        return [
            {
                kicker: isJa ? '幸運' : 'Fortune',
                title: isJa ? 'アイテム獲得' : 'Obtain Item',
                desc: isJa ? '偶然の産物を見つける' : 'Find a lucky byproduct.',
                async apply(){
                    const k = getValidRandomConsumable();
                    if(k) {
                        gameState.inventory[k] = (gameState.inventory[k] || 0) + 1;
                        const item = ITEMS[k];
                        const itemName = isJa ? item.name.ja : item.name.en;
                        const msg = isJa ? `${item.icon} ${itemName} を獲得` : `${item.icon} ${itemName} Obtained`;
                        toast(msg, "pink");
                    }
                    gameState.essence += 2;
                }
            },
            {
                kicker: isJa ? '魅了' : 'Charm',
                title: isJa ? 'プレッシャー -2 / HP +1' : 'Press -2 / HP +1',
                desc: isJa ? '深淵の怒りを和らげる' : 'Soothe the abyss\'s wrath.',
                async apply(){
                    gameState.pressure = Math.max(0, gameState.pressure - 2);
                    gameState.hp = Math.min(gameState.maxHp, gameState.hp + 1);
                    toast(isJa ? "深淵の怒りを和らげた" : "Abyss Charmed", "pink");
                }
            }
        ];
    }
    return [
        { 
            kicker: isJa ? '浄化' : 'Purify', 
            title: isJa ? 'プレッシャー -2' : 'Pressure -2', 
            desc: isJa ? '少し落ち着く' : 'Minor relief.', 
            async apply(){ 
                gameState.pressure = Math.max(0, gameState.pressure - 2); 
                toast(isJa ? "システムを浄化した" : "Purified", "sky");
            } 
        }, 
        { 
            kicker: isJa ? '貪欲' : 'Greed', 
            title: isJa ? 'エッセンス +3 / プレッシャー +1' : 'Essence +3 / Press +1', 
            desc: isJa ? '小さな代償で富を' : 'Wealth at a cost.', 
            async apply(){ 
                gameState.essence += 3;
                toast(isJa ? "富を貪った (+3 Essence)" : "Greed Rewarded (+3 Essence)", "amber");
                if(addPressure(1)) await applyPressureDamage();
            } 
        }
    ];
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
    const entries = [];
    INSTANT_ITEMS.forEach(x => entries.push({kind:'instant', id:x.id}));
    Object.values(ITEMS).forEach(x => entries.push({kind:'item', id:x.id}));
    const pool = entries.slice();
    const picks = [];
    while(picks.length < Math.min(n, pool.length)){
        const p = pool.splice(randInt(pool.length),1)[0];
        picks.push({ ...p, purchased:false });
    }
    return picks;
}
function findInstant(id){
    return INSTANT_ITEMS.find(x => x.id === id) || null;
}
function refreshRerollUI(){
    if(rerollBtn) {
        const can = (gameState.rerollCoupons > 0) || (gameState.essence >= 5);
        rerollBtn.classList.toggle('hidden', !can);
        const rerollText = t('reroll');
        if(gameState.rerollCoupons > 0){
            rerollBtn.textContent = `${rerollText} (Coupon x${gameState.rerollCoupons})`;
        }else{
            rerollBtn.textContent = `${rerollText} (✨5)`;
        }
        rerollBtn.classList.remove('text-[10px]');
        rerollBtn.classList.add('text-sm');
    }
    const pe = ui('perk-essence');
    if(pe) pe.textContent = `✨ ${gameState.essence}`;
    const phVal = ui('perk-hp-val');
    if(phVal) {
        phVal.textContent = `${gameState.hp} / ${gameState.maxHp}`;
    }
    const psText = ui('btn-status-perk-text');
    if(psText) {
        psText.textContent = t('statusBtn');
    }
}
ui('reroll-btn').onclick = () => {
    if (gameState.rerollCoupons > 0) {
        gameState.rerollCoupons--;
    } else if (gameState.essence >= 5) {
        gameState.essence -= 5;
    } else {
        return;
    }
    gameState.currentShopOffers = null;
    openPerkScreen(false);
    saveGame();
};
function buildShopCard(offer) {
  let name = '',
    desc = '',
    icon = '◈',
    baseCost = 0;
  if (offer.kind === 'instant') {
    const inst = findInstant(offer.id);
    if (!inst) return document.createElement('div');
    name = currentLang === 'ja' ? inst.name.ja : inst.name.en;
    desc = currentLang === 'ja' ? inst.desc.ja : inst.desc.en;
    baseCost = inst.cost;
    icon = '✦';
  } else {
    const it = ITEMS[offer.id];
    if (!it) return document.createElement('div');
    name = currentLang === 'ja' ? it.name.ja : it.name.en;
    desc = currentLang === 'ja' ? it.desc.ja : it.desc.en;
    baseCost = it.cost;
    icon = it.icon;
  }
  const currentInventoryCount = gameState.inventory[offer.id] || 0;
  let badgeHtml = '';
  if (offer.kind === 'item' && currentInventoryCount > 0) {
    badgeHtml = `<span class="badge-count absolute -top-1 sm:-top-2 -right-1 sm:-right-2 bg-sky-500 text-[10px] sm:text-xs font-bold px-1.5 sm:px-2 py-0.5 rounded-full text-white pointer-events-none shadow-sm z-10">${currentInventoryCount}</span>`;
  }
  const cost = getDiscountedCost(baseCost);
  const affordable = gameState.essence >= cost;
  const isTool = (offer.kind === 'item' && ITEMS[offer.id]?.type === 'tool');
  const allItemsMax = Object.keys(ITEMS).filter(k => ITEMS[k].type === 'consumable').every(k => (gameState.inventory[k] || 0) >= 3);
  const isAtMax = (offer.kind === 'item' && !isTool && currentInventoryCount >= 3) || (offer.id === 'mystery_box' && allItemsMax);
  const ownedTool = (isTool && currentInventoryCount > 0);
  const disabled = !IS_DEBUG && (!!offer.purchased || ownedTool || isAtMax || !affordable);
  const card = document.createElement('div');
  card.className = 'shop-card glass-panel perk-card p-3 sm:p-4 flex flex-col gap-2 sm:gap-3 h-full justify-between';
  card.dataset.cost = String(cost);
  let priceDisplay = `<div class="text-xl sm:text-2xl font-black text-yellow-400">${cost}</div>`;
  if (hasPerk('bargain') && cost !== baseCost) {
    priceDisplay = `<div class="flex flex-col items-end leading-none"><div class="text-[10px] text-slate-500 line-through decoration-slate-500">${baseCost}</div><div class="text-xl sm:text-2xl font-black text-yellow-400">${cost}</div></div>`;
  }
  let btnLabel = currentLang === 'ja' ? '購入' : 'BUY';
  let btnColorClass = '';
  if (offer.purchased) {
    btnLabel = currentLang === 'ja' ? '完売' : 'SOLD OUT';
    btnColorClass = 'text-rose-500';
  } else if (ownedTool) {
    btnLabel = currentLang === 'ja' ? '所持済' : 'OWNED';
  } else if (isAtMax) {
    btnLabel = currentLang === 'ja' ? '最大数' : 'MAX';
    btnColorClass = 'text-rose-500';
  }
  card.innerHTML = `<div class="flex items-start justify-between gap-1 sm:gap-2"><div class="flex items-center gap-2 sm:gap-3 min-w-0"><div class="relative w-10 h-10 sm:w-14 sm:h-14 rounded-lg sm:rounded-xl glass-panel flex items-center justify-center text-xl sm:text-3xl shrink-0 border border-white/10 icon-box">${icon}${badgeHtml}</div><div class="text-sm sm:text-lg font-black text-white leading-tight break-words">${name}</div></div><div class="text-right shrink-0">${priceDisplay}</div></div><div class="flex-1"><p class="text-xs sm:text-base text-slate-300 leading-snug break-words italic">${desc}</p></div><button class="shop-btn w-full py-2 sm:py-3 rounded-lg sm:rounded-xl font-black text-sm sm:text-lg uppercase tracking-widest border border-white/10 ${btnColorClass} ${disabled?'opacity-30 cursor-not-allowed':'hover:bg-white/10'}">${btnLabel}</button>`;
  const btn = card.querySelector('.shop-btn');
  btn.disabled = disabled;
  btn.onclick = () => {
    if (btn.disabled) return;
    const finalCost = getDiscountedCost(baseCost);
    if (gameState.essence < finalCost) return;
    if (offer.kind === 'instant') {
      gameState.essence -= finalCost;
      const inst = findInstant(offer.id);
      if (inst && typeof inst.apply === 'function') inst.apply(gameState);
      offer.purchased = true;
    } else {
      const it = ITEMS[offer.id];
      const currentCount = (gameState.inventory[offer.id] || 0);
      if (it.type === 'tool') {
        gameState.essence -= finalCost;
        gameState.inventory[offer.id] = 1;
        offer.purchased = true;
      } else if (currentCount < 3) {
        gameState.essence -= finalCost;
        gameState.inventory[offer.id] = currentCount + 1;
      }
    }
    saveGame();
    refreshRerollUI();
    renderHUD();
    openPerkScreen(false);
  };
  return card;
}
function generateShareText(){
    const perkList = Object.entries(gameState.perks || {})
        .filter(([_,lv]) => (lv||0)>0)
        .map(([id,lv]) => `${(currentLang==='ja'?PERKS[id].name.ja:PERKS[id].name.en)} Lv.${lv}`)
        .join(', ');
    return `Abyss Alchemy | FLOOR ${gameState.floor} | ESSENCE ${gameState.essence} | ${perkList || 'No Mutations'}`;
}
function copyResult(){
    const ta = ui('share-text-area');
    if(!ta) return;
    const txt = ta.value;
    if(navigator.clipboard?.writeText){
        navigator.clipboard.writeText(txt).then(
        ()=>showToast(currentLang==='ja'?'コピーしました':'Copied', 'emerald'),
        ()=>{ document.execCommand('copy'); showToast(currentLang==='ja'?'コピーしました':'Copied', 'emerald'); }
        );
    }else{
        ta.select();
        document.execCommand('copy');
        showToast(currentLang==='ja'?'コピーしました':'Copied', 'emerald');
    }
}
function openMutationsScreen() {
    const sum = ui('mutations-stats-summary');
    const list = ui('mutations-list-container');
    let itemsContainer = ui('mutations-items-container');
    if (!itemsContainer) {
        const parent = list.parentElement;
        const wrapper = document.createElement('div');
        wrapper.innerHTML = `
            <div class="mt-6">
                <div class="text-slate-500 text-xs italic py-3" id="ui-inventory-label">Inventory</div>
                <div id="mutations-items-container" class="grid grid-cols-2 gap-3"></div>
            </div>
        `;
        parent.appendChild(wrapper);
        itemsContainer = ui('mutations-items-container');
        const lbl = ui('ui-inventory-label');
        if (lbl) lbl.textContent = currentLang === 'ja' ? '所持アイテム' : 'Inventory';
    }
    if (!sum || !list) return;
    const totalLevels = Object.values(gameState.perks).reduce((a, b) => a + (b || 0), 0);
    const discount = hasPerk('bargain') ? (15 + getPerkLevel('bargain') * 5) : 0;
    sum.innerHTML = '';
    const stats = [
        { k: 'FLOOR', v: String(gameState.floor) },
        { k: 'HP', v: `${gameState.hp} / ${gameState.maxHp}` },
        { k: 'CAPACITY', v: String(gameState.capacity) },
        { k: 'TUBES', v: String(gameState.tubeCount) },
        { k: 'PRESSURE MAX', v: String(gameState.pressureMax) },
        { k: 'ESSENCE', v: `✨ ${gameState.essence}` },
        { k: 'ACTIVE BONUSES', v: String(totalLevels) },
        { k: 'SHOP DISCOUNT', v: `${discount}%` },
        { k: 'REROLL COUPON', v: String(gameState.rerollCoupons || 0) },
    ];
    stats.forEach(s => {
        const d = document.createElement('div');
        d.className = 'stat-item';
        d.innerHTML = `<div class="text-[10px] text-slate-500 uppercase tracking-widest">${s.k}</div><div class="text-lg font-black text-white">${s.v}</div>`;
        sum.appendChild(d);
    });
    list.innerHTML = '';
    const entries = Object.entries(gameState.perks || {}).filter(([_, lv]) => (lv || 0) > 0);
    const perkColorMap = {
        'crimson_resonance': 'R', 'azure_cycle': 'B', 'amber_greed': 'Y',
        'ivory_sanctuary': 'W', 'emerald_vitality': 'G', 'amethyst_surge': 'P',
        'orange_drive': 'O', 'teal_equilibrium': 'T', 'pink_luck': 'M',
        'purification': 'K'
    };
    if (entries.length === 0) {
        list.innerHTML = `<div class="text-slate-500 text-xs italic py-3">${currentLang === 'ja' ? 'ボーナスなし' : 'No active bonuses'}</div>`;
    } else {
        entries
            .sort((a, b) => b[1] - a[1])
            .forEach(([id, lv]) => {
                let colorIcon = '';
                if (perkColorMap[id]) {
                    const cKey = perkColorMap[id];
                    const meta = COLOR_POOL.find(x => x.key === cKey);
                    if (meta) colorIcon = `<span style="color:${meta.hex}; text-shadow:0 0 5px ${meta.hex}; margin-right:4px;">■</span>`;
                }
                const row = document.createElement('div');
                row.className = 'glass-panel p-3 border border-white/10';
                row.innerHTML = `
                <div class="flex items-center justify-between">
                    <div class="text-sm font-black text-white">${colorIcon}${currentLang === 'ja' ? PERKS[id].name.ja : PERKS[id].name.en}</div>
                    <div class="text-xs font-black text-sky-300">Lv.${lv}</div>
                </div>
                <div class="text-[10px] text-slate-400 mt-1 leading-relaxed">${getPerkDesc(id, lv)}</div>
                `;
                list.appendChild(row);
            });
    }
    itemsContainer.innerHTML = '';
    const inventoryKeys = Object.keys(gameState.inventory).filter(k => gameState.inventory[k] > 0);
    if (inventoryKeys.length === 0) {
        itemsContainer.innerHTML = `<div class="text-slate-500 text-xs italic py-3 col-span-2">${currentLang === 'ja' ? 'アイテムなし' : 'No items'}</div>`;
    } else {
        inventoryKeys.forEach(key => {
            const count = gameState.inventory[key];
            const item = ITEMS[key];
            if (!item) return;
            const name = currentLang === 'ja' ? item.name.ja : item.name.en;
            const desc = currentLang === 'ja' ? item.desc.ja : item.desc.en;
            const card = document.createElement('div');
            card.className = 'glass-panel p-3 border border-white/10 flex flex-col gap-2 h-full';
            card.innerHTML = `
                <div class="flex items-start justify-between gap-2">
                    <div class="flex items-center gap-2 min-w-0">
                        <div class="relative w-10 h-10 rounded-lg glass-panel flex items-center justify-center text-xl border border-white/10 shrink-0">
                            ${item.icon}
                        </div>
                        <div class="text-sm font-black text-white leading-tight break-words">
                            ${name}
                        </div>
                    </div>
                    <div class="text-right shrink-0">
                        <span class="bg-sky-500 text-[10px] font-bold px-2 py-0.5 rounded-full text-white">x${count}</span>
                    </div>
                </div>
                <div class="flex-1">
                    <p class="text-[10px] text-slate-400 leading-snug break-words italic">
                        ${desc}
                    </p>
                </div>
            `;
            itemsContainer.appendChild(card);
        });
    }
    mutationsScreen.classList.replace('hidden', 'flex');
}
function openPerkScreen(isDeath){
    perkScreen.classList.remove('hidden');
    ui('perk-title').textContent = isDeath ? t('gameOver') : t('victory');
    ui('perk-subtitle').textContent = isDeath ? t('gameOverSub') : t('victorySub');
    ui('perk-essence').textContent = `✨ Essence: ${gameState.essence}`;
    refreshRerollUI();
    gameState.pendingPerkId = null;
    perkCards.innerHTML = ''; 
    shopCards.innerHTML = '';
        if(isDeath){
        perkCards.innerHTML = `<div class="flex flex-col gap-4 h-full"><div class="text-sm font-bold text-rose-400 uppercase tracking-widest border-b border-white/10 pb-2">${currentLang==='ja'?'探索記録':'Exploration Log'}</div><div class="grid grid-cols-2 gap-4"><div class="glass-panel p-4 flex flex-col items-center justify-center bg-white/5"><div class="text-[10px] text-slate-400 uppercase tracking-widest">FLOOR</div><div class="text-4xl font-black text-white">${gameState.floor}</div></div><div class="glass-panel p-4 flex flex-col items-center justify-center bg-white/5"><div class="text-[10px] text-slate-400 uppercase tracking-widest">ESSENCE</div><div class="text-4xl font-black text-sky-300">${gameState.essence}</div></div></div><div class="mt-auto"><div class="text-[10px] text-slate-500 mb-2 uppercase tracking-widest">Result String</div><textarea id="share-text-area" class="w-full h-24 bg-black/50 border border-white/10 rounded p-2 text-[10px] text-slate-400 font-mono resize-none" readonly>${generateShareText()}</textarea></div></div>`;
        const perkList = Object.entries(gameState.perks).map(([id, lv]) => `<div class="flex justify-between items-center py-2 border-b border-white/5"><span class="text-sm font-bold text-slate-200">${currentLang==='ja'?PERKS[id].name.ja:PERKS[id].name.en}</span><span class="text-xs font-bold text-sky-400">Lv.${lv}</span></div>`).join('');
        shopCards.parentElement.className = "flex-1 flex flex-col p-4 md:p-6 overflow-y-auto"; shopCards.className = "flex flex-col gap-4 h-full";
        shopCards.innerHTML = `<div class="flex-1 overflow-y-auto min-h-[120px]"><div class="text-sm font-bold text-sky-400 uppercase tracking-widest border-b border-white/10 pb-2 mb-2">${currentLang==='ja'?'獲得したスキル':'Acquired Skills'}</div>${perkList || `<div class="text-slate-500 text-xs italic py-4">${currentLang==='ja'?'スキルなし':'No mutations'}</div>`}</div><div class="grid grid-cols-2 gap-3 mt-4 shrink-0"><button onclick="copyResult()" class="py-4 bg-indigo-600 rounded-xl font-black text-white uppercase tracking-widest hover:bg-indigo-500 shadow-lg shadow-indigo-900/40 transform transition hover:-translate-y-1">${currentLang==='ja'?'結果をコピー':'Copy Result'}</button><button onclick="startNewRun()" class="py-4 bg-rose-600 rounded-xl font-black text-white uppercase tracking-widest hover:bg-rose-500 shadow-lg shadow-rose-900/40 transform transition hover:-translate-y-1">${currentLang==='ja'?'リトライ':'Try Again'}</button></div>`;
        continueBtn.style.display = 'none'; return;
    }
        continueBtn.style.display = 'block'; 
    continueBtn.textContent = t('continue');
    continueBtn.classList.add('opacity-50', 'cursor-not-allowed');
    continueBtn.onclick = () => { 
        if(!gameState.pendingPerkId) {
            showToast(currentLang==='ja'?'スキルを選択してください':'Select a Mutation!', 'rose');
            return;
        }
        acquirePerk(gameState.pendingPerkId);
        perkScreen.classList.add('hidden'); 
        nextFloor(); 
    };
        shopCards.parentElement.className = "flex-1 flex flex-col p-4 md:p-6 overflow-y-auto"; shopCards.className = "grid grid-cols-2 md:grid-cols-2 lg:grid-cols-2 gap-3";
    if (!gameState.currentPerkChoices) gameState.currentPerkChoices = rollPerkChoices();
    if (!gameState.currentShopOffers) gameState.currentShopOffers = generateShopOffers();
    gameState.currentPerkChoices.forEach(p => perkCards.appendChild(buildPerkCard(p))); refreshRerollUI();
    gameState.currentShopOffers.forEach(item => shopCards.appendChild(buildShopCard(item))); updateShopButtons();
    saveGame();
}
function buildPerkCard(perk){
    const card = document.createElement('div'), owned = getPerkLevel(perk.id), next = owned + 1;
    card.className = `perk-card glass-panel p-3 sm:p-4 cursor-pointer rarity-${perk.rarity} rarity-border-${perk.rarity} relative transition-all`;
    const perkColorMap = {
        'crimson_resonance': 'R', 'azure_cycle': 'B', 'amber_greed': 'Y',
        'ivory_sanctuary': 'W', 'emerald_vitality': 'G', 'amethyst_surge': 'P',
        'orange_drive': 'O', 'teal_equilibrium': 'T', 'pink_luck': 'M',
        'purification': 'K', 'void_shield': 'P'
    };
    let colorIcon = '';
    if(perkColorMap[perk.id]){
        const colorKey = perkColorMap[perk.id];
        const colorMeta = COLOR_POOL.find(c => c.key === colorKey);
        if(colorMeta){
            colorIcon = `<span style="color:${colorMeta.hex}; text-shadow:0 0 8px ${colorMeta.hex}; margin-right:4px; font-size:1.2em;">■</span>`;
        }
    }
    card.innerHTML = `
        <div class="flex justify-between items-center mb-2 gap-2">
            <div class="text-lg sm:text-xl font-black text-white leading-tight truncate">
                ${colorIcon}${currentLang==='ja'?perk.name.ja:perk.name.en} 
                <span class="text-xs sm:text-sm text-slate-500 ml-1 font-medium">Lv.${owned}→${next}</span>
            </div>
            <span class="shrink-0 text-[10px] sm:text-xs ${owned>0?'text-emerald-400':'text-sky-400'} font-bold uppercase tracking-tighter">
                ${owned>0?'UPGRADE':'NEW'}
            </span>
        </div>
        <div class="text-sm sm:text-base text-slate-300 leading-relaxed">
            ${getPerkDesc(perk.id, next)}
        </div>
    `;
    card.onclick = () => { 
        gameState.pendingPerkId = perk.id;
        Array.from(perkCards.children).forEach(c => { 
            c.classList.remove('selected-perk');
            c.style.opacity = '0.4';
        }); 
        card.style.opacity = '1'; 
        card.classList.add('selected-perk');
        continueBtn.classList.remove('opacity-50', 'cursor-not-allowed');
    };
    return card;
}
function getDiscountedCost(base) { 
    if(hasPerk('bargain')) return Math.floor(base * (1 - (15+getPerkLevel('bargain')*5)/100)); 
    return base; 
}
function updateShopButtons() {
    document.querySelectorAll('.shop-card').forEach(card => {
        const btn = card.querySelector('.shop-btn'); if(btn.disabled && btn.textContent.includes('BOUGHT')) return;
        if(gameState.essence >= parseInt(card.dataset.cost)) { btn.classList.remove('opacity-30', 'cursor-not-allowed'); btn.classList.add('hover:bg-sky-500'); btn.style.pointerEvents = 'auto'; }
        else { btn.classList.add('opacity-30', 'cursor-not-allowed'); btn.classList.remove('hover:bg-sky-500'); }
    });
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
    if (startFloor >= 8) initialCapacity = 6;
    else if (startFloor >= 4) initialCapacity = 5;
    Object.assign(gameState, {
        floor: startFloor,
        essence: effectiveDebug ? 9999 : 0,
        hp: 3,
        maxHp: 3,
        capacity: initialCapacity,
        perks: {},
        pressure: 0,
        pressureMax: 20,
        history: [],
        inventory: effectiveDebug ? Object.keys(ITEMS).reduce((acc, key) => ({ ...acc, [key]: 3 }), {}) : {},
        catalystAvailable: true,
        refluxUses: getPerkLevel('reflux'),
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
        if (gameState.floor >= 8) gameState.capacity = 6; 
        else if (gameState.floor >= 4) gameState.capacity = 5; 
        else gameState.capacity = 4;
        gameState.completedFlags = [];
        // スカベンジャーの判定
        if (hasPerk('scavenger') && Math.random() < (0.10 + getPerkLevel('scavenger') * 0.05)) {
            const k = getValidRandomConsumable();
            if (k) {
                gameState.inventory[k] = (gameState.inventory[k] || 0) + 1;
                rewards.push({ key: k, source: 'scavenger' });
            }
        }
        // 物質変換 (Transmutation) の判定
        if (hasPerk('transmutation')) {
            for (let i = 0; i < getPerkLevel('transmutation'); i++) {
                const k = getValidRandomConsumable();
                if (k) {
                    gameState.inventory[k] = (gameState.inventory[k] || 0) + 1;
                    rewards.push({ key: k, source: 'transmutation' });
                }
            }
        }
        // クーポン (Coupon) の判定
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
    const defaultPressureMax = 20; 
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
// 所持上限(3個)に達していないランダムな消費アイテムを返す
function getValidRandomConsumable() {
    const keys = Object.keys(ITEMS).filter(x => ITEMS[x].type === 'consumable');
    const available = keys.filter(k => (gameState.inventory[k] || 0) < 3);
    return available.length > 0 ? pick(available) : null;
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
    if(!isFree && gameState.essence < 5) {
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
        selectedIdx: null
    });
    if(isFree){ 
        gameState.pressure += 2; 
        gameState.refluxUses--; 
        showFloatText(0, `Reflux Used (${gameState.refluxUses} left)`, "#a855f7");
    } else { 
        gameState.essence -= 5; 
    }
    updateTubeLayout(); 
    renderHUD(); 
    renderBoard(); 
    saveGame();
}
function renderHUD(){
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
    setText('ui-floor-mobile', `${gameState.floor}F`); 
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
    setText('ui-pressure-sub', `${curP} / ${maxP}`);
    let undoCost = '✨5';
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
function moveFocus(dx){ if(!gameState.tubes.length) return; gameState.focusIdx = gameState.focusIdx === null ? 0 : (gameState.focusIdx + dx + gameState.tubeCount) % gameState.tubeCount; renderBoard(); }
function updateStartScreenButtons(){ continueRunBtn.classList.toggle('hidden', !hasSaveData()); }
const helpGuides = {
    ja: [
        { desktopId: 'ui-hp-bar', mobileId: 'ui-hp-mobile-bar', text: '生命力' },
        { desktopId: 'ui-essence', mobileId: 'ui-essence-mobile', text: 'エッセンス（通貨）' },
        { id: 'status-bar', text: '現在の目標です。達成で階層クリア。', align: 'left' },
        { id: 'center', text: '【基本ルール】\n同じ色か空の瓶に注げます。満たすと完成！\n\n【黒インク】\n揃えると蒸発して消滅します。', isCenter: true },
        { id: 'ui-pressure-bar', text: '1手ごとに増加し、最大でダメージが入り黒インクが出現する。' },
        { id: 'skills-container', text: '所持アイテム。2回タップで使用。' },
        { id: 'btn-undo', text: 'エッセンスを消費して1手戻します。', position: 'left' }
    ],
    en: [
        { desktopId: 'ui-hp-bar', mobileId: 'ui-hp-mobile-bar', text: 'Vitality.' },
        { desktopId: 'ui-essence', mobileId: 'ui-essence-mobile', text: 'Essence(Money)' },
        { id: 'status-bar', text: 'Current objectives.', align: 'left' },
        { id: 'center', text: '【Basic Rules】\nPour into same color or empty tubes to complete!\n\n【Obsidian】\nStack to evaporate them.', isCenter: true },
        { id: 'ui-pressure-bar', text: 'Increases per move.\nAt max: Damage & Obsidian spawns.' },
        { id: 'skills-container', text: 'Items. Tap twice to use.' },
        { id: 'btn-undo', text: 'Spend Essence to revert a move.', position: 'left' }
    ]
};
let isHelpActive = false;
function closeHelpGuide() {
    const overlay = ui('help-overlay');
    if (!overlay || overlay.style.display === 'none') return;
    overlay.style.display = 'none';
    document.querySelectorAll('.help-bubble').forEach(b => {
        b.classList.remove('show');
        setTimeout(() => b.remove(), 200);
    });
    isHelpActive = false;
    window.removeEventListener('mousedown', closeHelpGuide);
    window.removeEventListener('touchstart', closeHelpGuide);
}
function showTutorialBubbles() {
    if (isHelpActive) return;
    isHelpActive = true;
    const overlay = ui('help-overlay');
    overlay.style.display = 'block';
    const guides = currentLang === 'ja' ? helpGuides.ja : helpGuides.en;
    guides.forEach((guide) => {
        const bubble = document.createElement('div');
        bubble.className = 'help-bubble';
        bubble.style.whiteSpace = 'pre-line';
        bubble.textContent = guide.text;
        document.body.appendChild(bubble);
        if (guide.isCenter) {
            bubble.classList.add('center-fixed');
        } else {
            let target = ui(guide.id);
            if (!target && guide.desktopId && guide.mobileId) {
                const dEl = ui(guide.desktopId);
                const mEl = ui(guide.mobileId);
                target = (dEl && dEl.offsetWidth > 0) ? dEl : mEl;
            }
            if (!target) {
                bubble.remove(); 
                return;
            }
            const rect = target.getBoundingClientRect();
            if (guide.position === 'left') {
                const bWidth = bubble.offsetWidth;
                const bHeight = bubble.offsetHeight;
                bubble.style.left = (rect.left - bWidth + 100) + 'px';
                bubble.style.top = (rect.top + (rect.height / 2) - (bHeight / 2)) + 'px';
                bubble.classList.add('bubble-left');
            } else {
                let targetX;
                if (guide.align === 'left') {
                    targetX = rect.left + Math.min(rect.width / 2, 60);
                } else {
                    targetX = rect.left + (rect.width / 2);
                }
                bubble.style.left = targetX + 'px';
                if (rect.top < window.innerHeight / 2) {
                    bubble.style.top = (rect.bottom + 12) + 'px';
                    bubble.classList.add('bubble-bottom');
                } else {
                    bubble.style.top = (rect.top - 50) + 'px'; 
                    bubble.classList.add('bubble-top');
                }
                const bRect = bubble.getBoundingClientRect();
                if (bRect.left < 10) bubble.style.left = (bRect.width / 2 + 10) + 'px';
                if (bRect.right > window.innerWidth - 10) bubble.style.left = (window.innerWidth - bRect.width / 2 - 10) + 'px';
            }
        }
        requestAnimationFrame(() => bubble.classList.add('show'));
    });
    setTimeout(() => {
        window.addEventListener('mousedown', closeHelpGuide);
        window.addEventListener('touchstart', closeHelpGuide);
    }, 100);
}
window.addEventListener('resize', () => {
    adjustBoardScale();
    if (isHelpActive) closeHelpGuide();
});
ui('btn-help').onclick = (e) => {
    e.stopPropagation();
    showTutorialBubbles();
};
if(undoBtn) undoBtn.onclick = tryUndo;
ui('start-run-btn').onclick = startNewRun;
ui('continue-run-btn').onclick = () => { startScreen.classList.add('hidden'); loadGame(); };
let isDown = false;
let startX;
let dragStartX;
let isDragging = false; 
const slider = ui('board-scroll-area');
slider.addEventListener('mousedown', (e) => {
    isDown = true;
    isDragging = false;
    slider.style.cursor = 'grabbing';
    startX = e.pageX - slider.offsetLeft;
    dragStartX = e.pageX;
});
slider.addEventListener('mouseleave', () => {
    isDown = false;
    slider.style.cursor = 'grab';
});
slider.addEventListener('mouseup', () => {
    isDown = false;
    slider.style.cursor = 'grab';
});
slider.addEventListener('mousemove', (e) => {
    if (!isDown) return;
    e.preventDefault();
    const x = e.pageX - slider.offsetLeft;
    const walk = (x - startX) * 1.5; 
    slider.scrollLeft -= walk; 
    startX = x;
    if(Math.abs(e.pageX - dragStartX) > 5) {
        isDragging = true;
    }
});
slider.addEventListener('scroll', () => {
    checkInfiniteScrollLoop();
});
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
    const scaledContentWidth = scaledItemWidth * totalTubes;
    const scaledCloneWidth = scaledItemWidth * CLONE_PADDING;
    const currentScroll = slider.scrollLeft;
    const currentCenterPos = currentScroll + (slider.clientWidth / 2);
    if (currentCenterPos > scaledCloneWidth + scaledContentWidth) {
        slider.scrollLeft -= scaledContentWidth;
    } 
    else if (currentCenterPos < scaledCloneWidth) {
        slider.scrollLeft += scaledContentWidth;
    }
}
document.addEventListener('mousedown', (e) => {
    const isSkillBtn = e.target.closest('.skill-btn');
    const isHUDControl = e.target.closest('button[id^="btn-"]'); 
    if (!isSkillBtn && !isHUDControl && gameState.pendingSkill !== null) {
        gameState.pendingSkill = null;
        hideGlobalTooltip();
        renderSkills();
    }
    if (isHelpActive) {
        if (!e.target.closest('#btn-help')) {
            closeHelpGuide();
        }
    }
});
window.addEventListener('resize', () => {
    adjustBoardScale();
    if (isHelpActive) closeHelpGuide();
});
ui('btn-help').onclick = (e) => {
    e.stopPropagation();
    showTutorialBubbles();
};
ui('help-close').onclick = (e) => {
    e.stopPropagation();
    ui('help-screen').classList.replace('flex', 'hidden');
};
ui('btn-mutations').onclick = (e) => {
    e.stopPropagation();
    openMutationsScreen();
};
ui('mutations-close').onclick = (e) => {
    e.stopPropagation();
    mutationsScreen.classList.replace('flex', 'hidden');
};
const btnRetire = ui('btn-retire');
if(btnRetire){
    btnRetire.onclick = (e) => {
        e.stopPropagation();
        const msg = currentLang === 'ja' 
            ? "探索を諦めますか？\n(HPが0になりゲームオーバーになります)" 
            : "Give up exploration?\n(HP becomes 0 and Game Over)";
                if(confirm(msg)){
            gameState.hp = 0;
            renderHUD();
            clearSave();
            openPerkScreen(true);
        }
    };
}
if(undoBtn) undoBtn.onclick = (e) => {
    e.stopPropagation();
    tryUndo();
};
ui('reroll-btn').onclick = () => {
    if (gameState.rerollCoupons > 0) {
        gameState.rerollCoupons--;
    } else if (gameState.essence >= 5) {
        gameState.essence -= 5;
    } else {
        return;
    }
    gameState.currentShopOffers = null;
    openPerkScreen(false);
    saveGame();
};
ui('start-run-btn').onclick = startNewRun;
ui('continue-run-btn').onclick = () => { startScreen.classList.add('hidden'); loadGame(); };
document.addEventListener('click', (e) => {
    if (!gameState.extractorHeldColor) return;
    if (!e.target.closest('.tube') && !e.target.closest('.skill-btn')) {
        cancelInteraction();
    }
});
window.onkeydown = (e) => {
    if(!perkScreen.classList.contains('hidden') || !eventScreen.classList.contains('hidden') || !helpScreen.classList.contains('hidden') || !mutationsScreen.classList.contains('hidden')) return;
    if (e.key === 'ArrowLeft') moveFocus(-1); 
    if (e.key === 'ArrowRight') moveFocus(1);
    if ((e.key === 'Enter' || e.key === ' ') && gameState.focusIdx !== null) handleTubeClick(gameState.focusIdx);
    if (e.key === 'Backspace' || e.key === 'z') tryUndo();
};
function initGameSettings() {
    const savedLang = localStorage.getItem('abyss_alchemy_lang');
    setLang(savedLang === 'en' || savedLang === 'ja' ? savedLang : 'ja');
    initPalette();
    const debugToggle = ui('debug-toggle');
    if (debugToggle) {
        debugToggle.textContent = `Alpha Ver ${GAME_VERSION}`;
    }
    const debugPanel = ui('debug-floor-selector');
    if (debugToggle && debugPanel) {
        debugToggle.onclick = () => {
            if (IS_DEBUG) {
                const isHidden = debugPanel.classList.contains('hidden');
                if (isHidden) {
                    debugPanel.classList.remove('hidden');
                    showToast("Debug Mode Enabled", "rose");
                } else {
                    debugPanel.classList.add('hidden');
                }
            }
        };
    }
}
initGameSettings();