// config.js — 定数定義(バージョン、色、パレット、Perk、アイテム、ショップ、バランス係数)
const GAME_VERSION = "0.8.00";
const IS_DEBUG = true;

// ===== バランス定数 =====
const PRESSURE_MAX_BASE = 16;      // プレッシャー最大値の基準 (旧: 20 / 1注ぎ=+1 に変更したため引き下げ)
const PRESSURE_PER_POUR = 1;       // 1回の注ぎで上昇するプレッシャー (旧: 移動した層の数)
const FLOOR_CLEAR_BASE_REWARD = 6; // 階層クリア基本報酬
const FLOOR_CLEAR_BONUS_CAP = 10;  // 階層ボーナスの上限
const SUBGOAL_REWARD = 4;          // サブ目標達成報酬
const UNDO_COST = 5;               // Undoのエッセンスコスト
const INVENTORY_LIMIT = 3;         // 同一アイテムの所持上限

// ===== ボス階層 =====
const BOSS_INTERVAL = 10;
const BOSS_MAX_HP = 3;
const BOSS_BASE_ACTION_INTERVAL = 6;
const BOSS_CLEAR_REWARD = 10;
const BOSS_ITEM_VARIETY_REWARD = 2;
const BOSS_SUPPLY_POOL = [
    'void_salt', 'sedative', 'layer_swap', 'vaporizer',
    'transfer', 'vacuum', 'inverter', 'summon_vial'
];
const BOSS_NAMES = [
    {
        id: 'crucible', en: 'Abyss Crucible', ja: '深淵炉', color: '#fb7185',
        desc: {
            en: 'Heat and pressure rise together. Read the countdown and vent before the crucible erupts.',
            ja: '熱と圧力が連動する炉。攻撃予告を読み、噴出前に圧力を逃がしてください。'
        }
    },
    {
        id: 'gravity_vat', en: 'Gravity Vat', ja: '重力槽', color: '#c084fc',
        desc: {
            en: 'Gravity seals and overturns marked vials. Keep more than one route open.',
            ja: '重力で予告された瓶を封印・反転します。複数の移動経路を残してください。'
        }
    },
    {
        id: 'observer', en: 'Void Observer', ja: '虚無観測者', color: '#67e8f9',
        desc: {
            en: 'It learns repeated source vials and punishes predictable play.',
            ja: '同じ注ぎ元の反復を観測し、単調な手順へ干渉します。'
        }
    },
    {
        id: 'aberration', en: 'Alchemy Aberration', ja: '錬金暴走体', color: '#f472b6',
        desc: {
            en: 'It rewrites surfaces and injects Obsidian as the phases advance.',
            ja: 'フェーズ進行に合わせて液面を書き換え、黒インクを注入します。'
        }
    }
];

// ===== 0.8.00 深淵脈動 / 契約 / オーバードライブ =====
const ABYSS_ATTENTION_MAX = 100;
const ABYSS_ATTENTION_BASE_GAIN = 14;
const ABYSS_ATTENTION_NO_DAMAGE_BONUS = 10;
const ABYSS_ATTENTION_ITEMLESS_BONUS = 8;
const ABYSS_ATTENTION_FAST_BONUS = 6;
const ABYSS_ATTENTION_AFTER_TRIGGER = 28;
const ANOMALY_CLEAR_REWARD = 10;
const OVERDRIVE_UNLOCK_LEVEL = 3;
const PERK_LEVEL_CAP = 4;

const ANOMALY_DEFINITIONS = {
    pressure_tide: {
        id: 'pressure_tide', color: '#fb7185', interval: 5,
        name: { en: 'Pressure Tide', ja: '圧力津波' },
        desc: { en: 'A pressure wave strikes every 5 moves. Items delay the next wave.', ja: '5手ごとに圧力波が到来します。アイテム使用で次の波を遅らせられます。' }
    },
    void_omen: {
        id: 'void_omen', color: '#a78bfa', interval: 5,
        name: { en: 'Void Omen', ja: '黒潮予兆' },
        desc: { en: 'A marked vial receives Obsidian when the countdown reaches zero.', ja: '予告された瓶へ、カウントが0になると黒インクが注入されます。' }
    },
    sealed_resonance: {
        id: 'sealed_resonance', color: '#67e8f9', interval: 6,
        name: { en: 'Sealed Resonance', ja: '封鎖共鳴' },
        desc: { en: 'A marked source vial is sealed for 2 moves. Any item breaks the seal.', ja: '予告された注ぎ元が2手封鎖されます。アイテム使用で解除できます。' }
    },
    unstable_reaction: {
        id: 'unstable_reaction', color: '#fbbf24', interval: 4,
        name: { en: 'Unstable Reaction', ja: '不安定反応' },
        desc: { en: 'Every 4th pour gains extra Pressure, but each completion grants +2 Essence.', ja: '4手ごとの注ぎで圧力が増える代わりに、完成するたびエッセンスを2獲得します。' }
    }
};

const CONTRACT_DEFINITIONS = {
    safe: {
        id: 'safe', color: '#38bdf8', rewardMultiplier: 1, attentionMultiplier: 0.75, startPressure: 0,
        name: { en: 'Stable Route', ja: '安定ルート' },
        desc: { en: 'Current rules. Abyss Attention rises 25% slower.', ja: '現行ルールを維持。深淵注目度の上昇が25%緩やかになります。' }
    },
    volatile: {
        id: 'volatile', color: '#f59e0b', rewardMultiplier: 1.35, attentionMultiplier: 1.15, startPressure: 2,
        name: { en: 'Volatile Contract', ja: '危険契約' },
        desc: { en: 'Start with +2 Pressure. Every 4th pour gains +1 Pressure. Rewards x1.35.', ja: '開始時プレッシャー+2。4手ごとに追加+1。報酬は1.35倍。' }
    },
    forbidden: {
        id: 'forbidden', color: '#f43f5e', rewardMultiplier: 1.75, attentionMultiplier: 1.35, startPressure: 4,
        name: { en: 'Forbidden Descent', ja: '禁忌ルート' },
        desc: { en: 'Start with +4 Pressure. Every 3rd pour gains +1. Bosses act faster. Rewards x1.75.', ja: '開始時プレッシャー+4。3手ごとに追加+1。ボス攻撃が加速し、報酬は1.75倍。' }
    }
};

const OVERDRIVE_MODES = {
    surge: {
        id: 'surge', color: '#f472b6',
        name: { en: 'Resonant Surge', ja: '暴走共鳴' },
        desc: { en: 'This Perk acts as +2 levels. Every 6th move releases Overdrive strain as Pressure.', ja: 'このPerkを実質+2Lvで扱います。6手ごとに暴走負荷がプレッシャーとして放出されます。' }
    },
    stable: {
        id: 'stable', color: '#22d3ee',
        name: { en: 'Stable Core', ja: '安定共振' },
        desc: { en: 'Blocks the first anomaly or boss attack each floor. Each Stable Core adds starting Pressure.', ja: '各階層で最初の異常・ボス攻撃を無効化します。安定共振数に応じて開始時プレッシャーが増えます。' }
    }
};

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
const PERKS = {
    catalyst:          { id: 'catalyst',          name: { en: 'Catalyst',          ja: '触媒反応' },      rarity: 'epic',   desc: { en: 'Complete a color only once per level to reduce pressure by [4 + Lv].',          ja: '階層ごとに1回だけ色完成でプレッシャー -[4 + Lv]' } },
    reflux:            { id: 'reflux',            name: { en: 'Reflux',            ja: '逆流制御' },      rarity: 'common', desc: { en: 'First [Lv] undos each floor are free (Pressure +2 instead).',                   ja: '各階層、最初の [Lv] 回のUndoはエッセンス無料' } },
    overflow:          { id: 'overflow',          name: { en: 'Overflow',          ja: 'オーバーフロー' }, rarity: 'common', desc: { en: 'Pressure max +[Lv x 4].',                                                       ja: 'プレッシャーの最大許容量が +[Lv x 4]' } },
    purification:      { id: 'purification',      name: { en: 'Purification',      ja: '浄化作用' },      rarity: 'epic',   desc: { en: 'Clearing Obsidian reduces Pressure by [2 + Lv] and grants [1 + Lv] Essence.',   ja: '黒消滅時、プレッシャー -[2 + Lv]、エッセンス +[1 + Lv]' } },
    scavenger:         { id: 'scavenger',         name: { en: 'Scavenger',         ja: 'スカベンジャー' }, rarity: 'rare',   desc: { en: '[10 + Lv x 5]% chance to find item on new floor.',                             ja: '階層移動時、[10 + Lv x 5]% の確率でアイテムを獲得' } },
    recycler:          { id: 'recycler',          name: { en: 'Recycler',          ja: 'リサイクル' },     rarity: 'epic',   desc: { en: '[Lv x 10]% chance to not consume item on use.',                                ja: 'アイテム使用時、[Lv x 10]% の確率で消費しない' } },
    bargain:           { id: 'bargain',           name: { en: 'Bargain',           ja: '交渉術' },        rarity: 'common', desc: { en: 'Shop prices reduced by [15 + Lv x 5]%.',                                        ja: 'ショップ価格 [15 + Lv x 5]% OFF' } },
    heavy_mastery:     { id: 'heavy_mastery',     name: { en: 'Heavy Mastery',     ja: '大容量ボーナス' }, rarity: 'rare',   desc: { en: 'Clearing 5+ capacity tube reduces Pressure by [2 + Lv].',                       ja: '容量5以上のチューブ完成でプレッシャー -[2 + Lv] 減少' } },
    void_shield:       { id: 'void_shield',       name: { en: 'Void Shield',       ja: '虚空の盾' },      rarity: 'rare',   desc: { en: '[Lv x 15]% chance to negate Pressure damage.',                                  ja: 'プレッシャーダメージを受けた時、[Lv x 15]% で無効化' } },
    transmutation:     { id: 'transmutation',     name: { en: 'Transmutation',     ja: '物質変換' },      rarity: 'epic',   desc: { en: 'Start each floor with [Lv] random items.',                                      ja: '階層開始時、[Lv] 個のランダムアイテムを獲得' } },
    steady_hand:       { id: 'steady_hand',       name: { en: 'Steady Hand',       ja: '安定した手' },     rarity: 'rare',   desc: { en: 'Pressure does not rise for the first [Lv x 3] turns of a floor.',              ja: '階層開始から [Lv x 3] ターンの間、プレッシャー停止' } },
    deep_adapt:        { id: 'deep_adapt',        name: { en: 'Deep Adapt',        ja: '深層適応' },      rarity: 'epic',   desc: { en: 'Gain [Lv] Max HP if capacity > 4 at start of floor.',                           ja: '階層開始時、容量5以上なら最大HP +[Lv]' } },
    coupon:            { id: 'coupon',            name: { en: 'Coupon',            ja: 'クーポン券' },     rarity: 'common', desc: { en: 'Start each floor with [Lv] free Rerolls.',                                     ja: '階層開始時、リロールクーポンを [Lv] 枚入手' } },
    flow_mastery:      { id: 'flow_mastery',      name: { en: 'Flow Mastery',      ja: 'フロー熟練' },     rarity: 'common', desc: { en: 'Combo reduces Pressure by [Lv x 2].',                                          ja: 'コンボ発生時、プレッシャー -[Lv x 2] 減少' } },
    efficiency:        { id: 'efficiency',        name: { en: 'Efficiency',        ja: '抽出効率' },      rarity: 'common', desc: { en: 'Tube completion has [Lv x 20]% chance to grant +1 Essence.',                    ja: '色完成時、[Lv x 20]% の確率で +1 エッセンスを獲得' } },
    momentum:          { id: 'momentum',          name: { en: 'Momentum',          ja: '慣性律' },        rarity: 'common', desc: { en: 'After completing a tube, Pressure does not rise for [Lv] turns.',               ja: '色完成後、[Lv] ターンの間、プレッシャー停止' } },
    crimson_resonance: { id: 'crimson_resonance', name: { en: 'Crimson Resonance', ja: '紅の熱量' },      rarity: 'rare',   desc: { en: 'Completing Crimson heals 1 HP but adds [6 - Lv] Pressure.',                     ja: '紅完成時、HP +1、プレッシャー +[6 - Lv] 上昇' } },
    azure_cycle:       { id: 'azure_cycle',       name: { en: 'Azure Cycle',       ja: '蒼の循環' },      rarity: 'common', desc: { en: 'Azure completion reduces Pressure by [Lv x 3] additional.',                     ja: '蒼完成時、プレッシャー -[Lv x 3]' } },
    amber_greed:       { id: 'amber_greed',       name: { en: 'Amber Alchemy',     ja: '琥珀の錬金' },     rarity: 'rare',   desc: { en: 'Amber completion grants [Lv x 2] Essence.',                                    ja: '琥珀完成時、エッセンス +[Lv x 2] 獲得' } },
    ivory_sanctuary:   { id: 'ivory_sanctuary',   name: { en: 'Ivory Sanctuary',   ja: '象牙の聖域' },     rarity: 'epic',   desc: { en: 'Ivory completion removes [Lv] Obsidian from random tubes.',                    ja: '象牙完成時、ランダムなチューブから黒を [Lv] 個除去' } },
    emerald_vitality:  { id: 'emerald_vitality',  name: { en: 'Emerald Vitality',  ja: '翠の活力' },      rarity: 'common', desc: { en: 'Emerald completion reduces Pressure by [40 + Lv x 10]% + [Lv].',                ja: '翠完成時、プレッシャー -[40 + Lv x 10]% 、さらに -[Lv]' } },
    amethyst_surge:    { id: 'amethyst_surge',    name: { en: 'Amethyst Surge',    ja: '紫の脈動' },      rarity: 'rare',   desc: { en: 'Amethyst completion grants +[Lv] free Undo charges.',                           ja: '紫完成時、Undoの回数を [Lv] 回増加' } },
    orange_drive:      { id: 'orange_drive',      name: { en: 'Orange Drive',      ja: '橙の推進' },      rarity: 'common', desc: { en: 'Orange completion stops Pressure rise for [Lv x 2] turns.',                     ja: '橙完成時、[Lv x 2] ターンの間プレッシャー停止' } },
    teal_equilibrium:  { id: 'teal_equilibrium',  name: { en: 'Teal Analysis',     ja: '青緑の分析' },     rarity: 'rare',   desc: { en: 'Teal completion progresses Secondary Goal by 1.',                              ja: '青緑完成時、副目標の進行度が 1 進む' } },
    pink_luck:         { id: 'pink_luck',         name: { en: 'Pink Luck',         ja: '桃の幸運' },      rarity: 'rare',   desc: { en: 'Pink completion has [Lv x 10]% chance to drop a random item.',                  ja: '桃完成時、[Lv x 10]% の確率でアイテムを獲得' } }
};
const ITEM_REGISTRY = {
   heal: {id: 'heal', type: 'consumable', behaviorType: 'instant', cost: 8, icon: '🩹', name: { en: 'Stabilizer', ja: '安定剤' }, desc: { en: 'Heal +1 HP.', ja: 'HPを+1回復' },
       effect: (gs) => {
           if (gs.hp >= gs.maxHp) return { success: false, msg: { ja: 'HPは満タンです', en: 'HP is full' }, color: 'yellow' };
           gs.hp = Math.min(gs.maxHp, gs.hp + 1);
           return { success: true, msg: { ja: 'HP回復！', en: 'HP Restored!' }, color: 'emerald' };
       }
   },
   panacea: {id: 'panacea', type: 'consumable', behaviorType: 'instant', cost: 15, icon: '💊', name: { en: 'Panacea', ja: '万能薬' }, desc: { en: 'Heal +2 HP.', ja: 'HPを+2回復' },
       effect: (gs) => {
           if (gs.hp >= gs.maxHp) return { success: false, msg: { ja: 'HPは満タンです', en: 'HP is full' }, color: 'yellow' };
           gs.hp = Math.min(gs.maxHp, gs.hp + 2);
           return { success: true, msg: { ja: '完全回復！', en: 'Fully Restored!' }, color: 'emerald' };
       }
   },
   sedative: {id: 'sedative', type: 'consumable', behaviorType: 'instant', cost: 12, icon: '💤', name: { en: 'Sedative', ja: '鎮静剤' }, desc: { en: 'Set Pressure to 0.', ja: 'プレッシャーを0' },
       effect: (gs) => {
           gs.pressure = 0;
           return { success: true, msg: { ja: '鎮静剤を使用', en: 'Sedative Active!' }, color: 'purple' };
       }
   },
   summon_vial: {id: 'summon_vial', type: 'consumable', behaviorType: 'instant', cost: 20, icon: '🧪', name: { en: 'Extra Vial', ja: '予備試験管' }, desc: { en: 'Add empty tube.', ja: '空のチューブを1つ追加' },
       effect: (gs) => {
           gs.tubeCount++; gs.tubes.push([]);
           return { success: true, msg: { ja: '空き瓶を追加！', en: 'Extra Tube Added!' }, color: 'purple', requiresRender: true };
       }
   },
   dark_pact: {id: 'dark_pact', type: 'stat', behaviorType: 'instant', cost: 0, icon: '✦', name: {en:'Dark Pact', ja:'黒の契約'}, desc:{en:'HP-2, +20 Ess', ja:'HP-2, +20エッセンス'},
       effect: (gs) => {
           if(gs.hp > 2){ gs.hp -= 2; gs.essence += 20; return { success: true, msg: {ja:'契約成立...', en:'Power at a cost...'}, color: 'purple' }; }
           return { success: false, msg: {ja:'体力が足りない', en:'Too weak...'}, color: 'red' };
       }
   },
   mystery_box: {id: 'mystery_box', type: 'stat', behaviorType: 'instant', cost: 8, icon: '✦', name:{en:'Mystery Box', ja:'福袋'}, desc:{en:'Random Item', ja:'ランダムアイテム'},
       effect: (gs) => {
           const keys = Object.keys(ITEM_REGISTRY).filter(k => ITEM_REGISTRY[k].type === 'consumable');
           const available = keys.filter(k => (gs.inventory[k] || 0) < INVENTORY_LIMIT);
           if (available.length > 0) {
               const gift = pick(available);
               if (!gs.inventory[gift]) gs.inventory[gift] = 0;
               gs.inventory[gift]++;
               const item = ITEM_REGISTRY[gift];
               return { success: true, msg: {ja:`${item.name.ja} を獲得`, en:`${item.name.en} Obtained`}, color: 'yellow' };
           }
           gs.essence += 8;
           return { success: false, msg: {ja:'所持数上限: ✨+8', en:'Max Capacity: ✨+8'}, color: 'rose' };
       }
   },
   layer_swap: {id: 'layer_swap', type: 'consumable', behaviorType: 'target_effect', cost: 12, icon: '🔗', name: { en: 'Layer Swap', ja: '層交換' }, desc: { en: 'Swap top 2 layers.', ja: '上2つの層を入れ替え' },
       canUseOn: (tube) => { if (tube.length < 2) return { ok: false, msg: 'Layers < 2' }; return { ok: true }; },
       apply: (tube) => { const t1 = tube.pop(); const t2 = tube.pop(); tube.push(t1); tube.push(t2); return { success: true, floatText: "Swapped!", color: "#a855f7" }; }
   },
   shaker: {id: 'shaker', type: 'consumable', behaviorType: 'target_effect', cost: 5, icon: '🎲', name: { en: 'Shaker', ja: 'シェイカー' }, desc: { en: 'Shuffle tube.', ja: '中身をシャッフル' },
       canUseOn: (tube) => { if (tube.length < 2) return { ok: false, msg: 'Layers < 2' }; return { ok: true }; },
       apply: (tube) => { const orig = JSON.stringify(tube); for (let i = 0; i < 50; i++) { tube.sort(() => Math.random() - 0.5); if (JSON.stringify(tube) !== orig) break; } return { success: true, floatText: "Shaken!", color: "#a855f7" }; }
   },
   cursed_sludge: {id: 'cursed_sludge', type: 'consumable', behaviorType: 'target_effect', cost: 6, icon: '⚫', name: { en: 'Cursed Sludge', ja: '呪いの泥' }, desc: { en: 'Add Obsidian if space.', ja: '空きがあれば黒を追加' },
       canUseOn: (tube, cap) => { if (tube.length >= cap) return { ok: false, msg: 'Full!' }; return { ok: true }; },
       apply: (tube) => { tube.push('K'); return { success: true, floatText: "Cursed!", color: "#0f172a" }; }
   },
   void_salt: {id: 'void_salt', type: 'consumable', behaviorType: 'target_effect', cost: 8, icon: '🧂', name: { en: 'Void Salt', ja: '虚無の塩' }, desc: { en: 'Remove top Black.', ja: '一番上の【黒】を除去' },
       canUseOn: (tube) => { if (tube.length === 0 || tube[tube.length - 1] !== 'K') return { ok: false, msg: 'No Obsidian!' }; return { ok: true }; },
       apply: (tube) => { tube.pop(); return { success: true, floatText: "Voided!", color: "#a855f7" }; }
   },
   vacuum: {id: 'vacuum', type: 'consumable', behaviorType: 'target_effect', cost: 14, icon: '🌀', name: { en: 'Obsidian Vacuum', ja: '黒吸引機' }, desc: { en: 'Remove all top Obsidian.', ja: '一番上の黒インクを全除去' },
       canUseOn: (tube) => { if (tube.length === 0 || tube[tube.length - 1] !== 'K') return { ok: false, msg: 'No Obsidian!' }; return { ok: true }; },
       apply: (tube) => { while (tube.length > 0 && tube[tube.length - 1] === 'K') { tube.pop(); } return { success: true, floatText: "Vacuumed!", color: "#a855f7" }; }
   },
   midas: {id: 'midas', type: 'consumable', behaviorType: 'target_effect', cost: 8, icon: '🖐️', name: { en: 'Alchemy Stone', ja: '対黒変成' }, desc: { en: 'Obsidian > Essence.', ja: '一番上の黒をエッセンスに' },
       canUseOn: (tube) => { if (tube.length === 0 || tube[tube.length - 1] !== 'K') return { ok: false, msg: 'No Obsidian!' }; return { ok: true }; },
       apply: (tube) => { tube.pop(); return { success: true, essenceDelta: 2, floatText: "Gold! ✨+2", color: "#fbbf24" }; }
   },
   vaporizer: {id: 'vaporizer', type: 'consumable', behaviorType: 'target_effect', cost: 7, icon: '♨️', name: { en: 'Vaporizer', ja: '微量蒸発' }, desc: { en: 'Delete top 1 segment.', ja: '一番上の1層を除去' },
       canUseOn: (tube) => { if (tube.length === 0) return { ok: false, msg: 'Empty!' }; return { ok: true }; },
       apply: (tube) => { const r = tube.pop(); return { success: true, floatText: "Vaporized!", color: "#94a3b8", removedColor: r }; }
   },
   sediment: {id: 'sediment', type: 'consumable', behaviorType: 'target_effect', cost: 10, icon: '⏬', name: { en: 'Sediment', ja: '沈殿' }, desc: { en: 'Move top to bottom.', ja: '一番上を一番下へ' },
       canUseOn: (tube) => { if (tube.length < 2) return { ok: false, msg: 'Layers < 2' }; return { ok: true }; },
       apply: (tube) => { const top = tube.pop(); tube.unshift(top); return { success: true, floatText: "Sunk!", color: "#a855f7" }; }
   },
   cycle_siphon: {id: 'cycle_siphon', type: 'consumable', behaviorType: 'target_effect', cost: 10, icon: '⏫', name: { en: 'Cycle Siphon', ja: '循環サイフォン' }, desc: { en: 'Move bottom to top.', ja: '一番下を一番上へ' },
       canUseOn: (tube) => { if (tube.length < 2) return { ok: false, msg: 'Layers < 2' }; return { ok: true }; },
       apply: (tube) => { const b = tube.shift(); tube.push(b); return { success: true, floatText: "Cycled!", color: "#a855f7" }; }
   },
   inverter: {id: 'inverter', type: 'consumable', behaviorType: 'target_effect', cost: 6, icon: '🔄', name: { en: 'Gravity Coil', ja: '重力反転機' }, desc: { en: 'Invert contents.', ja: '中身を上下反転' },
       canUseOn: (tube) => { if (tube.length < 2) return { ok: false, msg: 'Layers < 2' }; return { ok: true }; },
       apply: (tube) => { tube.reverse(); return { success: true, floatText: "Inverted!", color: "#a855f7" }; }
   },
   separator: {id: 'separator', type: 'consumable', behaviorType: 'target_effect', cost: 12, icon: '🌪️', name: { en: 'Separator', ja: '遠心分離機' }, desc: { en: 'Sort tube contents.', ja: '中身を整理する' },
       canUseOn: (tube) => { if (tube.length < 2) return { ok: false, msg: 'Layers < 2' }; return { ok: true }; },
       apply: (tube) => { const c = {}; tube.forEach(x => c[x] = (c[x] || 0) + 1); tube.length = 0; Object.keys(c).sort().forEach(k => { for (let i = 0; i < c[k]; i++) tube.push(k); }); return { success: true, floatText: "Separated!", color: "#a855f7" }; }
   },
   transfer: {id: 'transfer', type: 'consumable', behaviorType: 'two_step', cost: 10, icon: '🧴', name: { en: 'Surface Transfer', ja: '水面移送' }, desc: { en: 'Move top 1 segment anywhere.', ja: '一番上の色を吸い出しどこにでも注入する' },
       extractLogic: (t) => t.pop(), placeLogic: (t, c) => t.push(c)
   },
   quantum_pipette: {id: 'quantum_pipette', type: 'consumable', behaviorType: 'two_step', cost: 15, icon: '💉', name: { en: 'Quantum Pipette', ja: '量子スポイト' }, desc: { en: 'Extract bottom color.', ja: '一番下の色を吸い出しどこにでも注入する' },
       extractLogic: (t) => t.shift(), placeLogic: (t, c) => t.push(c)
   },
};
const ITEMS = ITEM_REGISTRY;
const SHOP_POOL = Object.values(ITEM_REGISTRY)
   .filter(i => i.type !== 'tool') 
   .map(i => {
       if (i.behaviorType === 'instant' && i.type === 'stat') return { id: i.id, kind: 'instant', ...i };
       if (i.behaviorType === 'instant' && i.type === 'consumable') return { id: `buy_${i.id}`, type: 'item', ref: i }; 
       return { id: `buy_${i.id}`, type: 'item', ref: i };
   });
