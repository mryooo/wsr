// main.js — イベントバインディングと初期化(必ず最後に読み込む)
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
    sc.addEventListener('wheel', (e) => {
        if (sc.scrollWidth <= sc.clientWidth) return;
        const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
        if (!delta) return;
        e.preventDefault();
        sc.scrollLeft += delta;
    }, { passive: false });
}
initSkillScroll();
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
window.addEventListener('resize', () => {
    requestAnimationFrame(adjustBoardScale);
    if (isHelpActive) closeHelpGuide();
});
document.addEventListener('mousedown', (e) => {
    const isTube = e.target.closest('.tube');
    const isSkillBtn = e.target.closest('.skill-btn');
    const isHUDControl = e.target.closest('button[id^="btn-"]');
    if (!isTube && !isSkillBtn && !isHUDControl) {
        if (gameState.focusIdx !== null) {
            gameState.focusIdx = null;
            renderBoard();
        }
        if (gameState.pendingSkill !== null) {
            gameState.pendingSkill = null;
            hideGlobalTooltip();
            renderSkills();
        }
        if (gameState.extractorHeldColor) {
            cancelInteraction();
        }
    }
    if (isHelpActive && !e.target.closest('#btn-help')) {
        closeHelpGuide();
    }
});
ui('help-close').onclick = (e) => {
    e.stopPropagation();
    ui('help-screen').classList.replace('flex', 'hidden');
};
const btnHelp = ui('btn-help');
if (btnHelp) {
    btnHelp.onclick = (e) => {
        e.stopPropagation();
        if (isHelpActive) closeHelpGuide();
        else showTutorialBubbles();
    };
}
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
    shopCards.innerHTML = '';
    gameState.currentShopOffers = generateShopOffers();
    gameState.currentShopOffers.forEach(item => shopCards.appendChild(buildShopCard(item)));
    updateShopButtons();
    refreshRerollUI();
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
    if (isHelpActive) {
        if (e.key === 'Escape') closeHelpGuide();
        return;
    }
    if(!perkScreen.classList.contains('hidden') || !helpScreen.classList.contains('hidden') || !mutationsScreen.classList.contains('hidden') || !bossIntroScreen.classList.contains('hidden')) return;
    if (['ArrowLeft', 'ArrowRight', 'Enter', ' '].includes(e.key)) {
            e.preventDefault();
        }
    if (!eventScreen.classList.contains('hidden')) {
        const choices = eventChoices.querySelectorAll('.perk-card');
        if (choices.length < 2) return;
        if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
            if (gameState.bonusFocusIdx === null) {
                gameState.bonusFocusIdx = (e.key === 'ArrowLeft') ? 0 : 1;
            } else {
                gameState.bonusFocusIdx = 1 - gameState.bonusFocusIdx;
            }
            updateEventSelectionUI();
        }
        else if (e.key === 'Enter' || e.key === ' ') {
            if (gameState.bonusFocusIdx !== null) {
                choices[gameState.bonusFocusIdx].click();
                gameState.bonusFocusIdx = null;
            }
        }
        return; 
    }
    if (e.key === 'ArrowLeft') moveFocus(-1); 
    if (e.key === 'ArrowRight') moveFocus(1);
    if ((e.key === 'Enter' || e.key === ' ') && gameState.focusIdx !== null) {
        handleTubeClick(gameState.focusIdx);
    }
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
