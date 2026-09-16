// audio.js — BGM/SE再生、完全ループ、音声設定
const AUDIO_SETTINGS_KEY = 'abyss_alchemy_audio_v1';
const AUDIO_BGM = {
    normal: { src: './audio/bgm/abyss_lab_normal_hq.ogg?v=20260916c', lossless: './audio/bgm/abyss_lab_normal.wav?v=20260916c', loopSeconds: 76.8, gain: 1.00 },
    depths: { src: './audio/bgm/abyss_depths_hq.ogg?v=20260916c', lossless: './audio/bgm/abyss_depths.wav?v=20260916c', loopSeconds: 80, gain: 1.68 },
    boss: { src: './audio/bgm/abyss_boss_hq.ogg?v=20260916c', lossless: './audio/bgm/abyss_boss.wav?v=20260916c', loopSeconds: 60, gain: 1.30 }
};
const AUDIO_SE = {
    pour: { src: './audio/se/pour.wav?v=20260916d', gain: 0.78 },
    select: { src: './audio/se/select.wav?v=20260916d', gain: 0.90 },
    denied: { src: './audio/se/denied.wav', gain: 0.59 },
    complete: { src: './audio/se/complete.wav?v=20260916e', gain: 0.95 },
    item_use: { src: './audio/se/item_use.wav', gain: 0.64 },
    purchase: { src: './audio/se/purchase.wav', gain: 0.60 },
    damage: { src: './audio/se/damage.wav', gain: 0.40 },
    pressure_warning: { src: './audio/se/pressure_warning.wav', gain: 0.60 },
    boss_warning: { src: './audio/se/boss_warning.wav', gain: 0.47 },
    undo: { src: './audio/se/undo.wav', gain: 0.60 }
};
const MUSIC_OUTPUT_GAIN = 1.80;
const SE_OUTPUT_GAIN = 0.40;

const audioManager = (() => {
    const defaults = { musicVolume: 0.35, seVolume: 0.70 };
    let storedSettings = {};
    try {
        storedSettings = JSON.parse(localStorage.getItem(AUDIO_SETTINGS_KEY) || '{}');
    } catch (_) {}
    const audioClamp = value => Math.max(0, Math.min(1, Number(value) || 0));
    const settings = {
        musicVolume: Number.isFinite(storedSettings.musicVolume)
            ? audioClamp(storedSettings.musicVolume)
            : (storedSettings.musicEnabled === false ? 0 : defaults.musicVolume),
        seVolume: Number.isFinite(storedSettings.seVolume)
            ? audioClamp(storedSettings.seVolume)
            : (storedSettings.seEnabled === false ? 0 : defaults.seVolume)
    };

    let context = null;
    let musicBus = null;
    let seBus = null;
    let musicDynamics = null;
    let seDynamics = null;
    let unlocked = false;
    let desiredBgm = null;
    let currentBgm = null;
    let fallbackBgm = null;
    let pressureWarningArmed = true;
    const buffers = new Map();
    const loads = new Map();

    function publishStatus() {
        document.documentElement.dataset.audioState = JSON.stringify({
            contextState: context?.state || 'not-created',
            desiredBgm,
            currentBgm: currentBgm?.key || null,
            usingFallback: !!fallbackBgm,
            musicVolume: settings.musicVolume,
            seVolume: settings.seVolume,
            loaded: [...buffers.keys()]
        });
    }

    function createContext() {
        if (context) return context;
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (!AudioContextClass) return null;
        context = new AudioContextClass();
        musicBus = context.createGain();
        seBus = context.createGain();
        musicDynamics = context.createDynamicsCompressor();
        seDynamics = context.createDynamicsCompressor();
        musicDynamics.threshold.value = -18;
        musicDynamics.knee.value = 12;
        musicDynamics.ratio.value = 4;
        musicDynamics.attack.value = 0.012;
        musicDynamics.release.value = 0.28;
        seDynamics.threshold.value = -10;
        seDynamics.knee.value = 4;
        seDynamics.ratio.value = 8;
        seDynamics.attack.value = 0.003;
        seDynamics.release.value = 0.12;
        musicDynamics.connect(musicBus);
        seDynamics.connect(seBus);
        musicBus.connect(context.destination);
        seBus.connect(context.destination);
        musicBus.gain.value = settings.musicVolume * MUSIC_OUTPUT_GAIN;
        seBus.gain.value = settings.seVolume * SE_OUTPUT_GAIN;
        publishStatus();
        return context;
    }

    function unlock() {
        const ctx = createContext();
        if (!ctx) return Promise.resolve(false);
        const firstUnlock = !unlocked;
        unlocked = true;
        if (firstUnlock) {
            ['select', 'denied', 'pour'].forEach(name => {
                const def = AUDIO_SE[name];
                loadBuffer(`se:${name}`, [def.src]).catch(() => {});
            });
        }
        return ctx.state === 'suspended' ? ctx.resume().then(() => true).catch(() => false) : Promise.resolve(true);
    }

    async function loadBuffer(cacheKey, sources) {
        if (buffers.has(cacheKey)) return buffers.get(cacheKey);
        if (loads.has(cacheKey)) return loads.get(cacheKey);
        const promise = (async () => {
            const ctx = createContext();
            if (!ctx) throw new Error('Web Audio is unavailable');
            let lastError = null;
            for (const source of sources) {
                try {
                    const response = await fetch(source, {cache: 'force-cache'});
                    if (!response.ok) throw new Error(`Audio request failed: ${response.status}`);
                    const buffer = await ctx.decodeAudioData(await response.arrayBuffer());
                    buffers.set(cacheKey, buffer);
                    publishStatus();
                    return buffer;
                } catch (error) {
                    lastError = error;
                }
            }
            throw lastError || new Error('Audio could not be loaded');
        })().finally(() => loads.delete(cacheKey));
        loads.set(cacheKey, promise);
        return promise;
    }

    function stopFallback() {
        if (!fallbackBgm) return;
        fallbackBgm.pause();
        fallbackBgm.src = '';
        fallbackBgm = null;
        publishStatus();
    }

    function stopBgm(fadeSeconds = 0.35, clearDesired = true) {
        if (clearDesired) desiredBgm = null;
        stopFallback();
        if (!currentBgm || !context) return;
        const ending = currentBgm;
        currentBgm = null;
        const now = context.currentTime;
        ending.gain.gain.cancelScheduledValues(now);
        ending.gain.gain.setValueAtTime(Math.max(0.0001, ending.gain.gain.value), now);
        ending.gain.gain.exponentialRampToValueAtTime(0.0001, now + fadeSeconds);
        try { ending.source.stop(now + fadeSeconds + 0.03); } catch (_) {}
        publishStatus();
    }

    function startFallbackBgm(key) {
        if (desiredBgm !== key || settings.musicVolume <= 0) return;
        stopFallback();
        const def = AUDIO_BGM[key];
        const audio = new Audio(def.lossless);
        audio.dataset.key = key;
        audio.loop = true;
        audio.preload = 'auto';
        audio.volume = Math.min(1, def.gain * settings.musicVolume * MUSIC_OUTPUT_GAIN);
        fallbackBgm = audio;
        audio.play().catch(() => {});
        publishStatus();
    }

    async function playBgm(key) {
        if (!AUDIO_BGM[key]) return;
        desiredBgm = key;
        if (settings.musicVolume <= 0) return;
        if (currentBgm?.key === key || (fallbackBgm && fallbackBgm.dataset?.key === key)) return;
        await unlock();
        const def = AUDIO_BGM[key];
        try {
            const buffer = await loadBuffer(`bgm:${key}`, [def.src, def.lossless]);
            if (desiredBgm !== key || settings.musicVolume <= 0 || !context) return;
            stopFallback();
            const source = context.createBufferSource();
            const gain = context.createGain();
            source.buffer = buffer;
            source.loop = true;
            source.loopStart = 0;
            source.loopEnd = Math.min(def.loopSeconds, buffer.duration);
            source.connect(gain);
            gain.connect(musicDynamics);
            const previous = currentBgm;
            const now = context.currentTime;
            gain.gain.setValueAtTime(0.0001, now);
            gain.gain.exponentialRampToValueAtTime(def.gain, now + 0.7);
            source.start(now, 0);
            currentBgm = {key, source, gain};
            publishStatus();
            if (previous) {
                previous.gain.gain.cancelScheduledValues(now);
                previous.gain.gain.setValueAtTime(Math.max(0.0001, previous.gain.gain.value), now);
                previous.gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.55);
                try { previous.source.stop(now + 0.58); } catch (_) {}
            }
        } catch (error) {
            console.warn('Web Audio BGM fallback:', error);
            startFallbackBgm(key);
        }
    }

    async function playSe(name) {
        const def = AUDIO_SE[name];
        if (!def || settings.seVolume <= 0) return;
        await unlock();
        try {
            const buffer = await loadBuffer(`se:${name}`, [def.src]);
            if (settings.seVolume <= 0 || !context) return;
            const source = context.createBufferSource();
            const gain = context.createGain();
            source.buffer = buffer;
            gain.gain.value = def.gain;
            source.connect(gain);
            gain.connect(seDynamics);
            source.start();
            source.onended = () => {
                source.disconnect();
                gain.disconnect();
            };
        } catch (_) {
            const audio = new Audio(def.src);
            audio.volume = Math.min(1, def.gain * settings.seVolume * SE_OUTPUT_GAIN);
            audio.play().catch(() => {});
        }
    }

    function desiredTrackForState() {
        if (typeof gameState === 'undefined' || !startScreen?.classList.contains('hidden')) return null;
        if (gameState.bossState && !gameState.bossState.defeated) return 'boss';
        if (gameState.anomaly || gameState.floor >= 11) return 'depths';
        return 'normal';
    }

    function syncBgm() {
        const key = desiredTrackForState();
        if (!key) stopBgm(0.25);
        else playBgm(key);
    }

    function saveSettings() {
        localStorage.setItem(AUDIO_SETTINGS_KEY, JSON.stringify(settings));
        updateControls();
        publishStatus();
    }

    function setMusicVolume(value) {
        const previous = settings.musicVolume;
        settings.musicVolume = audioClamp(value);
        if (musicBus && context) {
            musicBus.gain.cancelScheduledValues(context.currentTime);
            musicBus.gain.setTargetAtTime(settings.musicVolume * MUSIC_OUTPUT_GAIN, context.currentTime, 0.025);
        }
        if (fallbackBgm && desiredBgm && AUDIO_BGM[desiredBgm]) {
            fallbackBgm.volume = Math.min(1, AUDIO_BGM[desiredBgm].gain * settings.musicVolume * MUSIC_OUTPUT_GAIN);
        }
        saveSettings();
        if (settings.musicVolume <= 0) stopBgm(0.18, false);
        else if (previous <= 0) {
            unlock();
            syncBgm();
        }
    }

    function setSeVolume(value) {
        settings.seVolume = audioClamp(value);
        if (seBus && context) {
            seBus.gain.cancelScheduledValues(context.currentTime);
            seBus.gain.setTargetAtTime(settings.seVolume * SE_OUTPUT_GAIN, context.currentTime, 0.02);
        }
        saveSettings();
    }

    function updateControls() {
        const musicSlider = ui('volume-bgm');
        const seSlider = ui('volume-se');
        const musicPercent = Math.round(settings.musicVolume * 100);
        const sePercent = Math.round(settings.seVolume * 100);
        if (musicSlider) {
            musicSlider.value = String(musicPercent);
            musicSlider.setAttribute('aria-label', currentLang === 'ja' ? 'BGM音量' : 'Music volume');
            musicSlider.setAttribute('aria-valuetext', `${musicPercent}%`);
            setText('volume-bgm-value', `${musicPercent}%`);
            setText('volume-bgm-text', currentLang === 'ja' ? 'BGM' : 'Music');
        }
        if (seSlider) {
            seSlider.value = String(sePercent);
            seSlider.setAttribute('aria-label', currentLang === 'ja' ? '効果音音量' : 'Sound effect volume');
            seSlider.setAttribute('aria-valuetext', `${sePercent}%`);
            setText('volume-se-value', `${sePercent}%`);
            setText('volume-se-text', currentLang === 'ja' ? '効果音' : 'Sound');
        }
    }

    function notifyPressure(value, max) {
        const ratio = max > 0 ? value / max : 0;
        if (ratio < 0.55) pressureWarningArmed = true;
        if (ratio >= 0.75 && pressureWarningArmed) {
            pressureWarningArmed = false;
            playSe('pressure_warning');
        }
    }

    function handleVisibility() {
        if (!context || !unlocked) return;
        if (document.hidden) context.suspend().catch(() => {});
        else if (settings.musicVolume > 0 || settings.seVolume > 0) context.resume().catch(() => {});
        if (fallbackBgm) {
            if (document.hidden) fallbackBgm.pause();
            else if (settings.musicVolume > 0) fallbackBgm.play().catch(() => {});
        }
    }

    return {
        unlock, playBgm, stopBgm, syncBgm, playSe, notifyPressure, updateControls,
        handleVisibility, setMusicVolume, setSeVolume,
        getSettings: () => ({...settings}),
        getStatus: () => ({
            contextState: context?.state || 'not-created',
            desiredBgm,
            currentBgm: currentBgm?.key || null,
            usingFallback: !!fallbackBgm,
            musicVolume: settings.musicVolume,
            seVolume: settings.seVolume,
            loaded: [...buffers.keys()]
        })
    };
})();
window.__abyssAudio = audioManager;
audioManager.updateControls();
