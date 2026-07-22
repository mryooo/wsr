// i18n.js — 翻訳テーブルと言語切替
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
            "• Abyss Attention: Clean, fast and itemless clears draw the abyss. At 100%, the next non-boss floor becomes an Anomaly.",
            "• Contracts: Every 5 floors, choose risk and reward for the next sector.",
            "• Overdrive: Upgrade a Lv.3 Perk again to choose a permanent power with a drawback.",
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
            "・深淵注目度：ノーダメージ・短手数・アイテム未使用で早く上昇し、100%で次の通常階層が異常化します。",
            "・契約：5階層ごとに、次の区間の危険度と報酬倍率を選択します。",
            "・オーバードライブ：Lv.3のPerkをさらに強化すると、代償付きの限界進化を選べます。",
        ].join("\n"),
        helpClose: "Close",
        settings: "設定",
        continue: "次へ進む",
        shopTitle: "ショップ",
        shopSub: "エッセンスを消費して安定を得る",
        gameOver: "奈落に呑まれた",
        gameOverSub: "深淵はまた一つ魂を喰らった...",
        victory: "進化",
        victorySub: "能力を選択",
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
function updateStartScreenButtons(){ continueRunBtn.classList.toggle('hidden', !hasSaveData()); }
