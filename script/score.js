// Local exploration records. Rule 1: pours + items*5 + undos*4 + HP losses*10.
const SCORE_KEY = 'abyss_alchemy_records_v1';
const SCORE_RULE_VERSION = 1;
const SCORE_RECORD_LIMIT = 50;
const SCORE_FLOOR_POINTS = 1000;

function recordPoints(record) {
    return Math.max(0, record.completedFloors * SCORE_FLOOR_POINTS - record.adjustedMoves);
}

function newScoreTracking() {
    return {
        version: SCORE_RULE_VERSION,
        runId: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        completedFloors: 0,
        adjustedMoves: 0,
        lastScoredFloor: 0,
        floorItems: 0,
        floorUndos: 0,
        floorDamage: 0
    };
}

function ensureScoreTracking() {
    if (gameState.scoreTracking) return;
    // Earlier saves have no action history, so they cannot be ranked fairly.
    gameState.scoreTracking = {
        version: 0,
        runId: `legacy-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        completedFloors: Math.max(0, (Number(gameState.floor) || 1) - 1),
        adjustedMoves: null,
        lastScoredFloor: 0,
        floorItems: 0,
        floorUndos: 0,
        floorDamage: 0
    };
}

function readScoreRecords() {
    try {
        const records = JSON.parse(localStorage.getItem(SCORE_KEY) || '[]');
        return Array.isArray(records) ? records.filter(r => r && typeof r.runId === 'string') : [];
    } catch (e) {
        console.warn('Could not read local records:', e);
        return [];
    }
}

function writeScoreRecord(state = gameState, status = 'active') {
    const score = state.scoreTracking;
    if (!score?.runId || state.isExecutionDebug) return;
    const storedRecords = readScoreRecords();
    const records = storedRecords.filter(r => r.runId !== score.runId);
    const record = {
        runId: score.runId,
        version: score.version,
        completedFloors: Math.max(0, Number(score.completedFloors) || 0),
        reachedFloor: Math.max(1, Number(state.floor) || 1, (Number(score.completedFloors) || 0) + 1),
        adjustedMoves: score.version === SCORE_RULE_VERSION ? Math.max(0, Number(score.adjustedMoves) || 0) : null,
        status,
        updatedAt: new Date().toISOString()
    };
    const previous = storedRecords.find(r => r.runId === score.runId);
    if (previous && previous.version === record.version && previous.completedFloors === record.completedFloors
        && previous.reachedFloor === record.reachedFloor && previous.adjustedMoves === record.adjustedMoves
        && previous.status === record.status) {
        renderHighScores();
        return;
    }
    records.push(record);
    const rankedRecords = records.filter(r => r.version === SCORE_RULE_VERSION)
        .sort((a, b) => b.completedFloors - a.completedFloors || a.adjustedMoves - b.adjustedMoves || a.updatedAt.localeCompare(b.updatedAt))
        .slice(0, SCORE_RECORD_LIMIT);
    const latestLegacy = records.filter(r => r.version !== SCORE_RULE_VERSION)
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0];
    if (latestLegacy) rankedRecords.push(latestLegacy);
    if (record.status === 'active' && !rankedRecords.some(r => r.runId === record.runId)) rankedRecords.push(record);
    try {
        localStorage.setItem(SCORE_KEY, JSON.stringify(rankedRecords));
    } catch (e) {
        console.warn('Could not save local record:', e);
    }
    renderHighScores();
}

function scoreItemUse() {
    if (gameState.scoreTracking?.version === SCORE_RULE_VERSION) gameState.scoreTracking.floorItems++;
}
function scoreUndo() {
    if (gameState.scoreTracking?.version === SCORE_RULE_VERSION) gameState.scoreTracking.floorUndos++;
}
function scoreDamage() {
    if (gameState.scoreTracking?.version === SCORE_RULE_VERSION) gameState.scoreTracking.floorDamage++;
}
function scoreFloorClear() {
    const score = gameState.scoreTracking;
    if (!score || score.lastScoredFloor === gameState.floor) return;
    score.lastScoredFloor = gameState.floor;
    score.completedFloors = gameState.floor;
    if (score.version === SCORE_RULE_VERSION) {
        score.adjustedMoves += gameState.turnCount + score.floorItems * 5 + score.floorUndos * 4 + score.floorDamage * 10;
    }
    score.floorItems = 0;
    score.floorUndos = 0;
    score.floorDamage = 0;
    writeScoreRecord();
}
function finishScoreRun() {
    if (!gameState.scoreTracking) return;
    const status = gameState.lastDamageCause?.key === 'abandoned' ? 'retired' : 'dead';
    writeScoreRecord(gameState, status);
}
function retireSavedScoreRun() {
    try {
        const saved = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null');
        if (saved?.hp > 0) {
            if (!saved.scoreTracking) {
                saved.scoreTracking = {
                    version: 0,
                    runId: `legacy-${Date.now()}-${Math.random().toString(36).slice(2)}`,
                    completedFloors: Math.max(0, (Number(saved.floor) || 1) - 1),
                    adjustedMoves: null
                };
            }
            writeScoreRecord(saved, 'retired');
        }
    } catch (e) {
        console.warn('Could not archive previous run:', e);
    }
}

function renderHighScores() {
    const title = document.getElementById('high-score-title');
    const best = document.getElementById('high-score-best');
    const list = document.getElementById('high-score-list');
    if (!list) return;
    const ja = currentLang === 'ja';
    if (title) title.textContent = ja ? 'ハイスコア' : 'High Scores';
    const records = readScoreRecords();
    const ranked = records.filter(r => r.version === SCORE_RULE_VERSION)
        .sort((a, b) => b.completedFloors - a.completedFloors || a.adjustedMoves - b.adjustedMoves || a.updatedAt.localeCompare(b.updatedAt))
        .slice(0, 5);
    if (best) best.textContent = `${ranked.length ? recordPoints(ranked[0]).toLocaleString(ja ? 'ja-JP' : 'en-US') : '0'} pt`;
    const active = records.find(r => r.status === 'active');
    const legacy = records.find(r => r.version !== SCORE_RULE_VERSION && r.status !== 'active');
    list.replaceChildren();
    if (!ranked.length && !active && !legacy) {
        const empty = document.createElement('p');
        empty.className = 'text-slate-400 text-xs';
        empty.textContent = ja ? '記録はまだありません' : 'No records yet';
        list.appendChild(empty);
        return;
    }
    function addRow(record, label) {
        const row = document.createElement('div');
        row.className = 'flex justify-between gap-3 text-xs border-b border-white/10 py-1';
        const left = document.createElement('span');
        const status = record.status === 'active' ? (ja ? '進行中' : 'Active')
            : record.status === 'retired' ? (ja ? '探索終了' : 'Retired')
            : (ja ? 'ゲームオーバー' : 'Game Over');
        left.textContent = `${label}  ${record.completedFloors}${ja ? '階層クリア' : ' floors'} (${ja ? '到達' : 'reached'} ${record.reachedFloor}) · ${status}`;
        const right = document.createElement('span');
        right.className = 'text-sky-300 whitespace-nowrap';
        right.textContent = record.version === SCORE_RULE_VERSION
            ? `${recordPoints(record).toLocaleString(ja ? 'ja-JP' : 'en-US')} pt`
            : (ja ? '旧記録・参考' : 'Legacy record');
        row.append(left, right);
        list.appendChild(row);
        const date = document.createElement('div');
        date.className = 'text-[10px] text-slate-500 text-right -mt-1 pb-1';
        const timestamp = new Date(record.updatedAt);
        date.textContent = Number.isNaN(timestamp.getTime()) ? '' : timestamp.toLocaleString(ja ? 'ja-JP' : 'en-US');
        list.appendChild(date);
    }
    if (active) addRow(active, ja ? '現在' : 'Current');
    if (legacy) addRow(legacy, ja ? '参考' : 'Legacy');
    ranked.forEach((record, index) => addRow(record, `#${index + 1}`));
    const note = document.createElement('p');
    note.className = 'text-slate-500 text-[10px] pt-1';
    note.textContent = ja
        ? 'クリア階層数が多い順。同じ階層なら高得点順。記録はこのブラウザに保存されます。'
        : 'More cleared floors rank first; ties favor higher scores. Records stay in this browser.';
    list.appendChild(note);
}
