// screens.js — 画面/モーダル(イベント、ショップ、Perk選択、ステータス、ヘルプ、パレット)
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
function initPalette() {
    const saved = localStorage.getItem('abyss_alchemy_palette');
    if (saved && PALETTES_DATA[saved]) {
        setPalette(saved);
    } else {
        setPalette('default');
    }
}
function openBossIntro() {
    const bs = gameState.bossState;
    if (!bs || !bs.pendingIntro || !bossIntroScreen) return;
    gameState.busy = true;
    const def = getBossDefinition();
    setText('boss-intro-title', currentLang === 'ja' ? def.ja : def.en);
    setText('boss-intro-desc', currentLang === 'ja'
        ? `核を3回破壊すると撃破。\nアイテムを使えば核が即座に露出し、次の攻撃を2手遅らせます。\n温存する場合は、色を2本完成させて装甲を解析してください。`
        : `Destroy the core 3 times.\nUsing an item immediately exposes the core and delays the next attack by 2 moves.\nWithout items, complete 2 colors to analyze the armor.`);
    setText('boss-supply-label', currentLang === 'ja' ? '今回限りの支給品を1つ選択' : 'CHOOSE ONE TEMPORARY SUPPLY');
    setText('boss-supply-note', currentLang === 'ja' ? '未使用の支給品はボス撃破後に失われます。' : 'Unused supplies expire after the boss is defeated.');
    bossSupplyChoices.innerHTML = '';
    bs.supplyChoices.forEach(key => {
        const item = ITEM_REGISTRY[key];
        if (!item) return;
        const card = document.createElement('button');
        card.className = 'boss-supply-card glass-panel border border-white/10 p-4 text-left';
        const name = currentLang === 'ja' ? item.name.ja : item.name.en;
        const desc = currentLang === 'ja' ? item.desc.ja : item.desc.en;
        card.innerHTML = `<div class="text-3xl mb-2">${item.icon}</div><div class="font-black text-white">${name}</div><div class="text-[11px] text-slate-400 mt-2 leading-relaxed">${desc}</div>`;
        card.onclick = () => {
            if (!bs.pendingIntro) return;
            grantTemporaryBossItem(key);
            bs.pendingIntro = false;
            gameState.busy = false;
            bossIntroScreen.classList.replace('flex', 'hidden');
            renderHUD();
            renderBoard(true);
            saveGame();
            showToast(currentLang === 'ja' ? `${item.icon} ${name} を一時支給` : `${item.icon} Temporary ${name} supplied`, 'yellow');
        };
        bossSupplyChoices.appendChild(card);
    });
    bossIntroScreen.classList.replace('hidden', 'flex');
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
        gameState.bonusFocusIdx = null;
        eventScreen.classList.remove('hidden'); 
        eventScreen.classList.add('flex');
        setTimeout(updateEventSelectionUI, 10); 
    });
}
function buildEventChoices(colorKey){
    const isJa = (currentLang === 'ja');
    const toast = (msg, color) => showToast(msg, color);
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
                        toast(isJa ? `${ITEMS[k].icon} ${name} を精製した` : `Transmuted ${name}`, "yellow");
                    } else {
                        gameState.essence += 5;
                        toast(isJa ? "所持数上限: ✨+5" : "Max Inventory: ✨+5", "slate");
                    }
                }
            }
        ];
    }
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
                title: isJa ? 'プレッシャー -2' : 'Pressure -2',
                desc: isJa ? '静かな波動が負荷を和らげる' : 'A quiet resonance eases the system load.',
                async apply(){ 
                    gameState.pressure = Math.max(0, gameState.pressure - 2); 
                    toast(isJa ? "プレッシャーが緩和された" : "Pressure Eased", "sky");
                }
            }
        ];
    }
    if (colorKey === 'G'){
        return [
            {
                kicker: isJa ? '再生' : 'Regrow',
                title: isJa ? 'プレッシャーを0にする' : 'Set Pressure to 0',
                desc: isJa ? '負荷を完全にリセットする' : 'Completely reset the system.',
                async apply(){ 
                    gameState.pressure = 0; 
                    toast(isJa ? "負荷が消失した" : "System Regrown (Press set 0)", "emerald");
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
                            setTimeout(() => toast(msg, "purple"), i * 400);
                        } else {
                            gameState.essence += 5;
                            setTimeout(() => toast(isJa ? "所持数上限: ✨+5" : "Max Inventory: ✨+5", "slate"), i * 400);
                        }
                    }
                }
            }
        ];
    }
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
                toast(isJa ? "心を浄化した" : "Purified", "sky");
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
function buildShopCard(offer) {
    let itemDef;
    let baseCost = 0;
    let icon = '◈';
    let rawId = '';
    if (offer.kind === 'instant') {
        rawId = offer.id;
        itemDef = ITEM_REGISTRY[rawId];
        if (itemDef) {
            baseCost = itemDef.cost;
            icon = '✦';
        }
    } else {
        rawId = offer.id.startsWith('buy_') ? offer.id.replace('buy_', '') : offer.id;
        itemDef = ITEM_REGISTRY[rawId];
        if (itemDef) {
            baseCost = itemDef.cost;
            icon = itemDef.icon;
        }
    }
    if (!itemDef) return document.createElement('div');
    const name = currentLang === 'ja' ? itemDef.name.ja : itemDef.name.en;
    const desc = currentLang === 'ja' ? itemDef.desc.ja : itemDef.desc.en;
    const currentInventoryCount = gameState.inventory[rawId] || 0;
    const LIMIT = INVENTORY_LIMIT;
    const isTool = (itemDef.type === 'tool');
    const isAtMax = (!isTool && currentInventoryCount >= LIMIT);
    const purchased = offer.purchased;
    const cost = getDiscountedCost(baseCost);
    const affordable = gameState.essence >= cost;
    const ownedTool = (isTool && currentInventoryCount > 0);
    const isLocked = !!purchased || ownedTool || isAtMax;
    const disabled = isLocked || !affordable;
    const badgeHtml = currentInventoryCount > 0 
    ? `<span class="badge-count absolute -top-2 -right-2 bg-sky-500 text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full text-white pointer-events-none shadow-sm z-10 leading-none">
        ${currentInventoryCount}
       </span>` 
    : '';
    const card = document.createElement('div');
    card.className = 'shop-card glass-panel perk-card p-2 sm:p-4 flex flex-col gap-1 sm:gap-2 h-full relative overflow-hidden';
    let priceDisplay = `<div class="text-xl sm:text-2xl font-black text-yellow-400">${cost}</div>`;
    if (hasPerk('bargain') && cost !== baseCost) {
        priceDisplay = `<div class="flex flex-col items-end leading-none"><div class="text-[10px] text-slate-500 line-through decoration-slate-500">${baseCost}</div><div class="text-xl sm:text-2xl font-black text-yellow-400">${cost}</div></div>`;
    }
    const priceTag = `<div class="absolute top-2 right-2 text-right">${priceDisplay}</div>`;
    card.dataset.cost = String(cost);
    card.dataset.locked = isLocked ? '1' : '';
    let btnLabel = currentLang === 'ja' ? '購入' : 'BUY';
    let btnColorClass = '';
    if (purchased) {
        btnLabel = currentLang === 'ja' ? '完売' : 'SOLD OUT';
        btnColorClass = 'text-rose-500';
    } else if (ownedTool) {
        btnLabel = currentLang === 'ja' ? '所持済' : 'OWNED';
    } else if (isAtMax) {
        btnLabel = currentLang === 'ja' ? '最大数' : 'MAX';
        btnColorClass = 'text-rose-500';
    }
    card.innerHTML = `
        ${priceTag}
        <div class="flex items-center gap-2 mb-1 pr-8"> <div class="relative w-8 h-8 sm:w-12 sm:h-12 rounded-lg glass-panel flex items-center justify-center text-lg sm:text-2xl shrink-0 border border-white/10">
                ${icon}${badgeHtml}
            </div>
            <div class="sm:text-sm font-black text-white leading-tight line-clamp-2">${name}</div>
        </div>
        <div class="flex-1">
            <p class="sm:text-sm text-white leading-tight line-clamp-2">${desc}</p>
        </div>
        <button class="shop-btn w-full py-1.5 mt-1 rounded-lg font-black text-[10px] sm:text-sm uppercase tracking-widest border border-white/10 ${btnColorClass} ${disabled ? 'opacity-30 cursor-not-allowed' : 'hover:bg-white/10'}">
            ${btnLabel}
        </button>`;
    const btn = card.querySelector('.shop-btn');
    btn.disabled = disabled;
    btn.onclick = () => {
        if (btn.disabled) return;
        const latestCount = gameState.inventory[rawId] || 0;
        if (!isTool && latestCount >= LIMIT) {
            showToast(currentLang === 'ja' ? "これ以上持てません" : "Max capacity reached", 'rose');
            openPerkScreen(false);
            return;
        }
        gameState.essence -= cost;
        offer.purchased = true;
        if (offer.kind === 'instant') {
            const result = itemDef.effect(gameState);
            showToast(currentLang === 'ja' ? result.msg.ja : result.msg.en, result.color || 'emerald');
            if(result.isMystery) {
                gameState.currentShopOffers = null;
                openPerkScreen(false);
                renderHUD();
                return;
            }
        } else {
            if (itemDef.type === 'tool') {
                gameState.inventory[rawId] = 1;
            } else {
                gameState.inventory[rawId] = (gameState.inventory[rawId] || 0) + 1;
            }
            showToast(currentLang === 'ja' ? "購入しました" : "Purchased", 'emerald');
        }
        saveGame();
        refreshRerollUI();
        renderHUD();
        openPerkScreen(false);
    };
    return card;
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
                <div class="text-sky-500 text-xs py-3" id="ui-inventory-label">Inventory</div>
                <div id="mutations-items-container" class="grid grid-cols-2 gap-3"></div>
            </div>
        `;
        parent.appendChild(wrapper);
        itemsContainer = ui('mutations-items-container');
        const lbl = ui('ui-inventory-label');
        if (lbl) lbl.textContent = currentLang === 'ja' ? 'Inventory' : 'Inventory';
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
        list.innerHTML = `<div class="text-slate-500 text-xs py-3">${currentLang === 'ja' ? 'ボーナスなし' : 'No active bonuses'}</div>`;
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
        itemsContainer.innerHTML = `<div class="text-slate-500 text-xs py-3 col-span-2">${currentLang === 'ja' ? 'アイテムなし' : 'No items'}</div>`;
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
                            <span class="badge-count absolute -top-2 -right-2 bg-sky-500 text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full text-white pointer-events-none shadow-sm z-10 leading-none">${count}</span>
                        </div>
                        <div class="text-sm font-black text-white leading-tight break-words">
                            ${name}
                        </div>
                    </div>
                    <div class="text-right shrink-0">
                    </div>
                </div>
                <div class="flex-1">
                    <p class="text-[10px] text-slate-400 leading-snug break-words">
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
    const bossVictory = !isDeath && !!gameState.bossState?.defeated;
    ui('perk-title').textContent = isDeath ? t('gameOver') : (bossVictory ? (currentLang === 'ja' ? 'ボス撃破' : 'BOSS PURGED') : t('victory'));
    ui('perk-subtitle').textContent = isDeath ? t('gameOverSub') : (bossVictory ? (currentLang === 'ja' ? '深淵の戦利品を選択' : 'Choose an abyssal reward') : t('victorySub'));
    ui('perk-essence').textContent = `✨ Essence: ${gameState.essence}`;
    perkCards.innerHTML = ''; 
    shopCards.innerHTML = '';
    const perkLabel = perkCards.previousElementSibling;
    const shopHeader = shopCards.previousElementSibling;
    if (isDeath) {
        if (perkLabel) perkLabel.classList.add('hidden');
        if (shopHeader) shopHeader.classList.add('hidden');
        perkCards.innerHTML = `<div class="flex flex-col gap-4 h-full"><div class="text-xl font-bold text-rose-400 uppercase tracking-widest border-b border-white/10 pb-2">${currentLang==='ja'?'探索記録':'Exploration Log'}</div><div class="grid grid-cols-2 gap-4"><div class="glass-panel p-4 flex flex-col items-center justify-center bg-white/5"><div class="text-[10px] text-slate-400 uppercase tracking-widest">FLOOR</div><div class="text-4xl font-black text-white">${gameState.floor}</div></div><div class="glass-panel p-4 flex flex-col items-center justify-center bg-white/5"><div class="text-[10px] text-slate-400 uppercase tracking-widest">ESSENCE</div><div class="text-4xl font-black text-sky-300">${gameState.essence}</div></div></div><div class="mt-auto"><div class="text-[10px] text-slate-500 mb-2 uppercase tracking-widest">Result String</div><textarea id="share-text-area" class="w-full h-24 bg-black/50 border border-white/10 rounded p-2 text-[10px] text-slate-400 font-mono resize-none" readonly>${generateShareText()}</textarea></div></div>`;
        const perkList = Object.entries(gameState.perks).map(([id, lv]) => `<div class="flex justify-between items-center py-2 border-b border-white/5"><span class="text-sm font-bold text-slate-200">${currentLang==='ja'?PERKS[id].name.ja:PERKS[id].name.en}</span><span class="text-xs font-bold text-sky-400">Lv.${lv}</span></div>`).join('');
        shopCards.parentElement.className = "flex-1 flex flex-col p-4 md:p-6 overflow-y-auto";
        shopCards.className = "flex flex-col gap-4 h-full";
        shopCards.innerHTML = `<div class="flex-1 overflow-y-auto min-h-[120px]"><div class="text-xl font-bold text-sky-400 uppercase tracking-widest border-b border-white/10 pb-2 mb-2">${currentLang==='ja'?'獲得したスキル':'Acquired Skills'}</div>${perkList || `<div class="text-slate-500 text-xs py-4">${currentLang==='ja'?'スキルなし':'No mutations'}</div>`}</div><div class="grid grid-cols-2 gap-3 mt-4 shrink-0"><button onclick="copyResult()" class="py-4 bg-indigo-600 rounded-xl font-black text-white uppercase tracking-widest hover:bg-indigo-500 shadow-lg shadow-indigo-900/40 transform transition hover:-translate-y-1">${currentLang==='ja'?'結果をコピー':'Copy Result'}</button><button onclick="startNewRun()" class="py-4 bg-rose-600 rounded-xl font-black text-white uppercase tracking-widest hover:bg-rose-500 shadow-lg shadow-rose-900/40 transform transition hover:-translate-y-1">${currentLang==='ja'?'リトライ':'Try Again'}</button></div>`;
        continueBtn.style.display = 'none'; 
        return;
    }
    if (perkLabel) perkLabel.classList.remove('hidden');
    if (shopHeader) shopHeader.classList.remove('hidden');
    continueBtn.style.display = 'block'; 
    continueBtn.textContent = t('continue');
    if (gameState.pendingPerkId) {
        continueBtn.classList.remove('opacity-50', 'cursor-not-allowed');
    } else {
        continueBtn.classList.add('opacity-50', 'cursor-not-allowed');
    }
    continueBtn.onclick = () => { 
        if(!gameState.pendingPerkId) {
            showToast(currentLang==='ja'?'スキルを選択してください':'Select a Mutation!', 'rose');
            return;
        }
        acquirePerk(gameState.pendingPerkId);
        perkScreen.classList.add('hidden'); 
        nextFloor(); 
    };
    shopCards.parentElement.className = "flex-1 flex flex-col p-4 md:p-6 overflow-y-auto"; 
    shopCards.className = "grid grid-cols-2 md:grid-cols-2 lg:grid-cols-2 gap-3";
    if (!gameState.currentPerkChoices) {
        gameState.currentPerkChoices = rollPerkChoices(bossVictory ? 4 : 3);
        gameState.pendingPerkId = null; 
        continueBtn.classList.add('opacity-50', 'cursor-not-allowed'); 
    }
    updateShopPriceUI();
    if (!gameState.currentShopOffers) gameState.currentShopOffers = generateShopOffers();
    gameState.currentPerkChoices.forEach(p => perkCards.appendChild(buildPerkCard(p))); 
    refreshRerollUI();
    gameState.currentShopOffers.forEach(item => shopCards.appendChild(buildShopCard(item))); 
    updateShopButtons();
    saveGame();
}
function buildPerkCard(perk){
    const card = document.createElement('div'), owned = getPerkLevel(perk.id), next = owned + 1;
    card.className = `perk-card glass-panel p-2 sm:p-4 cursor-pointer rarity-${perk.rarity} rarity-border-${perk.rarity} relative transition-all`;
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
    if (gameState.pendingPerkId === perk.id) {
        card.classList.add('selected-perk');
        card.style.opacity = '1';
    } else if (gameState.pendingPerkId) {
        card.style.opacity = '0.4';
    }
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
function updateShopPriceUI() {
    const multiplier = getPriceMultiplier();
    const f = gameState.floor;
    const multEl = document.getElementById('price-multiplier');
    const labelEl = document.getElementById('shop-interference-label');
    if (multEl && labelEl) {
        multEl.textContent = `x${multiplier}`;
        const colorClasses = ['text-sky-400', 'text-yellow-500', 'text-rose-500', 'text-purple-500', 'text-white', 'animate-pulse', 'abyss-glitch'];
        labelEl.classList.remove(...colorClasses);
        multEl.classList.remove(...colorClasses);
        if (f >= 31) {
            labelEl.classList.add('text-white', 'abyss-glitch');
            multEl.classList.add('text-white', 'abyss-glitch');
            labelEl.textContent = "ABYSS";
        } else if (f >= 21) {
            labelEl.classList.add('text-purple-500', 'animate-pulse');
            multEl.classList.add('text-purple-500', 'animate-pulse');
            labelEl.textContent = "SINGULARITY";
        } else if (multiplier >= 1.5) {
            labelEl.classList.add('text-rose-500');
            multEl.classList.add('text-rose-500');
            labelEl.textContent = "CRITICAL";
        } else if (multiplier >= 1.2) {
            labelEl.classList.add('text-yellow-500');
            multEl.classList.add('text-yellow-500');
            labelEl.textContent = "UNSTABLE";
        } else {
            labelEl.classList.add('text-sky-400');
            multEl.classList.add('text-sky-400');
            labelEl.textContent = "NORMAL";
        }
    }
}
function updateShopButtons() {
    document.querySelectorAll('.shop-card').forEach(card => {
        const btn = card.querySelector('.shop-btn');
        if (card.dataset.locked === '1') return; // 完売・所持済・上限のカードは復活させない
        const affordable = gameState.essence >= parseInt(card.dataset.cost, 10);
        btn.disabled = !affordable;
        if (affordable) {
            btn.classList.remove('opacity-30', 'cursor-not-allowed');
            btn.classList.add('hover:bg-white/10');
        } else {
            btn.classList.add('opacity-30', 'cursor-not-allowed');
            btn.classList.remove('hover:bg-white/10');
        }
    });
}
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
function closeHelpGuide(event = null) {
    if (event?.target?.closest?.('#btn-help')) return;
    const overlay = ui('help-overlay');
    if (!overlay || overlay.style.display === 'none') return;
    overlay.style.display = 'none';
    document.querySelectorAll('.help-bubble').forEach(b => {
        b.classList.remove('show');
        setTimeout(() => b.remove(), 200);
    });
    isHelpActive = false;
    const helpBtn = ui('btn-help');
    if (helpBtn) {
        helpBtn.classList.remove('help-active');
        helpBtn.setAttribute('aria-expanded', 'false');
    }
    window.removeEventListener('mousedown', closeHelpGuide);
    window.removeEventListener('touchstart', closeHelpGuide);
}
function showTutorialBubbles() {
    if (isHelpActive) return;
    isHelpActive = true;
    const overlay = ui('help-overlay');
    overlay.style.display = 'block';
    const helpBtn = ui('btn-help');
    if (helpBtn) {
        helpBtn.classList.add('help-active');
        helpBtn.setAttribute('aria-expanded', 'true');
    }
    const guides = (currentLang === 'ja' ? helpGuides.ja : helpGuides.en).map(guide => ({...guide}));
    if (isBossArena()) {
        const centerGuide = guides.find(guide => guide.isCenter);
        if (centerGuide) {
            centerGuide.text = currentLang === 'ja'
                ? '【ボスエリア】\n核を3回破壊すると撃破！\nアイテム使用で核が露出し、攻撃を2手遅らせます。\n温存時は色を2本完成させると核が露出します。'
                : '【BOSS AREA】\nDestroy the core 3 times!\nItems expose the core and delay attacks by 2 moves.\nWithout items, complete 2 colors to expose it.';
        }
        guides.splice(3, 0, {
            id: 'boss-arena-header',
            text: currentLang === 'ja'
                ? 'ボスHP、現在フェーズ、次の攻撃と残り手数。'
                : 'Boss HP, current phase, next attack and countdown.',
            align: 'left'
        });
    }
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
function updateEventSelectionUI() {
    const choices = eventChoices.querySelectorAll('.perk-card');
    choices.forEach((card, idx) => {
        if (idx === gameState.bonusFocusIdx) {
            card.classList.add('ring-4', 'ring-sky-400', 'bg-white/10');
            card.style.transform = 'scale(1.02)';
        } else {
            card.classList.remove('ring-4', 'ring-sky-400', 'bg-white/10');
            card.style.transform = 'scale(1)';
        }
    });
}
