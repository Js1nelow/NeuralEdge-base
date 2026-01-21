// =============================
// VIP Indicator & Bottom Sheet
// =============================
const tg = window.Telegram.WebApp;
tg.expand();

// УКАЖИТЕ ЗДЕСЬ IP ВАШЕГО СЕРВЕРА
const SERVER_URL = "http://ВАШ_IP_СЕРВЕРА:8000"; 

let IS_VIP = false; // Глобальный статус пользователя

async function checkVipAccess() {
    const user = tg.initDataUnsafe?.user;
    const userId = user ? user.id : null; 

    if (!userId) {
        console.log("Not in Telegram or user ID missing.");
        return;
    }

    try {
        const response = await fetch(`${SERVER_URL}/api/check_status/${userId}`);
        const data = await response.json();
        
        IS_VIP = data.is_vip;
        console.log("User Status Loaded. VIP:", IS_VIP);

        // Если пользователь VIP, убираем красный индикатор на кнопке
        if (IS_VIP) {
            const vipIndicator = document.getElementById("vipIndicator");
            if (vipIndicator) vipIndicator.style.display = "none";
        }
    } catch (err) {
        console.error("Mixed Content error or Server Down. Cannot check VIP status.", err);
    }
}

document.addEventListener("DOMContentLoaded", () => {
    checkVipAccess(); // Запускаем проверку при загрузке страницы

    const vipBtn = document.getElementById("vipBtn");
    const vipIndicator = document.getElementById("vipIndicator");
    const sheet = document.getElementById("vipSheet");

    const viewed = localStorage.getItem("vipViewed");
    if (!viewed && vipIndicator && !IS_VIP) vipIndicator.style.display = "block";

    function openVip(){
        if (vipIndicator) { vipIndicator.style.display = "none"; localStorage.setItem("vipViewed","true"); }
        sheet?.setAttribute("aria-hidden","false");
        document.body.style.overflow = "hidden";
    }
    function closeVip(){
        sheet?.setAttribute("aria-hidden","true");
        document.body.style.overflow = "";
    }

    vipBtn?.addEventListener("click", openVip);

    sheet?.addEventListener("click", (e) => {
        const t = e.target;
        if (t.matches("[data-close]") || t.closest("#vipClose")) closeVip();
    });
    document.getElementById("vipClose")?.addEventListener("click", closeVip);
    document.getElementById("vipLater")?.addEventListener("click", closeVip);

    document.addEventListener("keydown", (e)=>{ if (e.key === "Escape" && sheet && sheet.getAttribute("aria-hidden")==="false") closeVip(); });

    let startY = null;
    sheet?.addEventListener("touchstart", (e)=>{ startY = e.touches[0].clientY; }, {passive:true});
    sheet?.addEventListener("touchend",   (e)=>{
        if (startY == null) return;
        const dy = (e.changedTouches[0].clientY - startY);
        if (dy > 80) closeVip();
        startY = null;
    });

    document.getElementById("vipGet")?.addEventListener("click", ()=>{
        localStorage.setItem("vipIntent","1");
        closeVip();
    });
});

// =============================
// Global state (form)
// =============================
let state = {
    pair: null,
    time: null,
    expiry: null,
    expirySeconds: null,
    model: null
};

// =============================
// Persistence
// =============================
const STATE_KEY  = "ps_state_v1";
const RESULT_KEY = "ps_last_result_v1";
const LANG_KEY   = "ps_lang_v1";

function saveState() {
    try { localStorage.setItem(STATE_KEY, JSON.stringify(state)); } catch (_) {}
}

function restoreState() {
    try {
        const raw = localStorage.getItem(STATE_KEY);
        if (!raw) return;
        const s = JSON.parse(raw) || {};

        state.pair = s.pair ?? null;
        state.time = s.time ?? null;
        state.expiry = s.expiry ?? null;
        state.expirySeconds = Number.isFinite(s.expirySeconds) ? s.expirySeconds : null;
        state.model = s.model ?? null;

        const setVal = (id, v) => { const el = document.getElementById(id); if (el && v != null) el.value = v; };
        setVal("pairField",  state.pair);
        setVal("timeField",  state.time);
        setVal("modelField", state.model);

        const mSpan = document.getElementById("selectedModel");
        if (mSpan && state.model) mSpan.textContent = state.model;

        checkReady();
    } catch(_) {}
}

function saveResult(res) {
    try { localStorage.setItem(RESULT_KEY, JSON.stringify(res)); } catch (_) {}
}

function restoreResult() {
    try {
        const raw = localStorage.getItem(RESULT_KEY);
        if (!raw) return;
        const r = JSON.parse(raw);

        const dirEl = document.getElementById("sigDirection");
        if (dirEl) {
            dirEl.textContent = i18nFormatDirection(!!r.isBuy);
            dirEl.classList.toggle("buy",  !!r.isBuy);
            dirEl.classList.toggle("sell", !r.isBuy);
        }
        const iconBox = document.getElementById("sigDirIcon");
        if (iconBox) iconBox.innerHTML = r.isBuy ? BUY_SVG : SELL_SVG;

        const setText = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v ?? t("v_dash"); };
        setText("sigPair",     r.pair);
        setText("sigConf",     r.conf);
        setText("sigAcc",      r.acc);
        setText("sigMarket",   i18nMarketOTC(r.market === "OTC"));
        setText("sigStrength", i18nFormatStrength(r.strCode || "Medium"));
        setText("sigVol",      i18nFormatVolume(r.volCode || "Medium"));
        setText("sigTime",     r.time);
        setText("sigValid",    r.valid);

        const viewA = document.getElementById("sigAnalysis");
        const viewR = document.getElementById("sigResult");
        if (viewA && viewR) {
            viewA.style.display = "none";
            viewR.hidden = false;
        }

        const form = document.querySelector(".glass-card");
        if (form) {
            const raise = Math.ceil(form.getBoundingClientRect().height + 16);
            document.body.style.setProperty("--raise", `${raise}px`);
        }
        document.body.classList.add("analysis-open");
    } catch(_) {}
}

// =============================
// Helpers (UI)
// =============================
function selectField(field) {
    if (field === "pair")   { CurrencyPairPopup.open();   return; }
    if (field === "expiry") { CurrencyExpiryPopup.open(); return; }
    if (field === "model")  { CurrencyModelPopup.open();  return; }
}

function checkReady() {
    const btn = document.getElementById("getSignalBtn");
    const allFilled = !!(state.pair && state.time && state.model);
    if (!btn) return;
    if (allFilled) {
        btn.classList.add("active");
        btn.removeAttribute("disabled");
    } else {
        btn.classList.remove("active");
        btn.setAttribute("disabled", "true");
    }
}

document.addEventListener("DOMContentLoaded", () => {
    const model = state.model || document.getElementById("modelField")?.value || "NeuralEdge V1";
    const span = document.getElementById("selectedModel");
    if (span) span.innerText = model;
});

function toggleFAQ(button) {
    const item = button.closest(".faq-item");
    item.classList.toggle("open");
}

// =============================
// Languages + I18N
// =============================
const SUP_LANGS = [
    { code: "en", label: "English", short: "EN", dir: "ltr" },
    { code: "ru", label: "Русский", short: "RU", dir: "ltr" },
    { code: "hi", label: "हिंदी",  short: "HI", dir: "ltr" },
    { code: "ar", label: "العربية", short: "AR", dir: "rtl" },
    { code: "es", label: "Español", short: "ES", dir: "ltr" },
    { code: "fr", label: "Français", short: "FR", dir: "ltr" },
    { code: "ro", label: "Română", short: "RO", dir: "ltr" },
];

const langWrap = document.getElementById("langDropdown");
const langBtn  = document.getElementById("langBtn");
const langMenu = document.getElementById("langMenu");
const langFlag = document.getElementById("langFlag");
const langCode = document.getElementById("langCode");

const I18N = {
    en: {
        app_title: "Pocket Signals",
        header_become_vip: "Become VIP",
        lang_select_aria: "Select language",
        hero_title: "Trade with AI",
        hero_sub: "Smart signals for profitable trading",
        field_pair_label: "Currency pair",
        field_pair_ph: "Choose pair",
        field_expiry_label: "Expiry time",
        field_expiry_ph: "Choose time",
        field_model_label: "AI model",
        field_model_ph: "Choose model",
        btn_get_signal: "Get signal",
        signal_title: "Signal",
        signal_model_prefix: "Model:",
        steps_1_t: "Technical screening",
        steps_1_s: "Indicators, levels, volatility",
        steps_2_t: "Pattern recognition",
        steps_2_s: "Trends, figures, candles",
        steps_3_t: "Mathematical modeling",
        steps_3_s: "Probabilities & risk management",
        steps_4_t: "Signal generation",
        steps_4_s: "Aggregation & normalization",
        steps_5_t: "Cross-validation",
        steps_5_s: "Consistency & error control",
        dir_buy: "BUY",
        dir_sell: "SELL",
        k_conf: "CONFIDENCE",
        k_acc: "ACCURACY",
        k_market: "MARKET",
        k_strength: "STRENGTH",
        k_volume: "VOLUME",
        k_time: "TIME",
        k_valid: "VALID UNTIL",
        v_strength_high: "Strong",
        v_strength_medium: "Medium",
        v_vol_low: "Low",
        v_vol_medium: "Medium",
        v_vol_high: "High",
        v_market_otc: "OTC",
        v_dash: "—",
        btn_repeat: "Repeat",
        btn_reset: "Reset",
        faq_title: "FAQ",
        faq_q1: "What is an AI signal?",
        faq_a1: "An AI signal is generated by artificial intelligence based on market analysis.",
        faq_q2: "Why VIP status?",
        faq_a2: "VIP speeds up analysis, improves signal quality, and unlocks extra tools.",
        faq_q3: "What is expiry time?",
        faq_a3: "The moment when a trade closes automatically. Choose what fits your strategy.",
        faq_q4: "How do models differ?",
        faq_a4: "Models differ in performance and compute — expect different signals.",
        faq_q5: "Are signals accurate?",
        faq_a5: "Signals are aggregated across many markets and venues to increase robustness.",
        cp_title_fiat: "Currencies",
        cp_title_crypto: "Crypto",
        cp_title_commod: "Commodities",
        cp_title_stocks: "Stocks",
        cp_title_docs: "Indices",
        cp_title_fav: "Favorites",
        cp_title_search: "Search",
        cp_search_ph: "Search",
        cp_fav_only_title: "Favorites only",
        cp_head_market: "Market",
        cp_empty: "Nothing found",
        ex_title: "Expiry time",
        md_title: "AI model",
        md_v1: "NeuralEdge V1",
        md_v2: "NeuralEdge V2",
        md_vip_note: "VIP only",
        vip_sheet_title: "Get VIP access",
        vip_close_aria: "Close",
        vip_hero_badge: "Exclusive access",
        vip_hero_h4: "More accuracy. More markets. Less risk.",
        vip_hero_sub: "VIP unlocks advanced model, priority signals and risk tools.",
        vip_compare_free: "Basic",
        vip_compare_vip: "VIP",
        vip_free_list: ["NeuralEdge V1 model","Average signal accuracy","Standard markets","Limited signal history","Market analysis every 40s","Payouts up to 80%"],
        vip_paid_list: ["NeuralEdge V2 model","Timeframes up to H4","Extended markets: stocks/crypto/indices","Priority & early access","Details: strength/volume/probability corridors","Deep history & favorites","Market analysis every 1.2s","Payouts up to 170%"],
        vip_h3: "What VIP gives",
        vip_feat_1_t: "+ up to 12% ↑ accuracy",
        vip_feat_1_s: "via ensembles & probability calibration.",
        vip_feat_2_t: "Priority delivery",
        vip_feat_2_s: "VIP gets the signal first.",
        vip_feat_3_t: "Risk guides",
        vip_feat_3_s: "adaptive lot/expiry vs volatility.",
        vip_feat_4_t: "Extended markets",
        vip_feat_4_s: "packages for stocks, indices, crypto.",
        vip_how_h4: "How to get VIP",
        vip_how_p: "Keep trading on PocketOption. VIP is granted automatically based on your turnover.",
    },
    ru: {
        app_title: "Pocket Signals",
        header_become_vip: "Стать VIP",
        lang_select_aria: "Выбор языка",
        hero_title: "Торгуй вместе с AI",
        hero_sub: "Умные сигналы для прибыльной торговли",
        field_pair_label: "Валютная пара",
        field_pair_ph: "Выбери пару",
        field_expiry_label: "Время экспирации",
        field_expiry_ph: "Выбери время",
        field_model_label: "AI модель",
        field_model_ph: "Выбери модель",
        btn_get_signal: "Получить сигнал",
        signal_title: "Сигнал",
        signal_model_prefix: "Модель:",
        steps_1_t: "Технический скрининг",
        steps_1_s: "Индикаторы, уровни, волатильность",
        steps_2_t: "Распознавание паттернов",
        steps_2_s: "Тренды, фигуры, свечные модели",
        steps_3_t: "Математическое моделирование",
        steps_3_s: "Вероятности и риск-менеджмент",
        steps_4_t: "Генерация сигнала",
        steps_4_s: "Сборка и нормализация факторов",
        steps_5_t: "Кросс-валидация",
        steps_5_s: "Согласованность и контроль ошибок",
        dir_buy: "ПОКУПКА",
        dir_sell: "ПРОДАЖА",
        k_conf: "УВЕРЕННОСТЬ",
        k_acc: "ТОЧНОСТЬ",
        k_market: "РЫНОК",
        k_strength: "СИЛА",
        k_volume: "ОБЪЁМ",
        k_time: "ВРЕМЯ",
        k_valid: "ДЕЙСТВИТЕЛЕН ДО",
        v_strength_high: "Сильный",
        v_strength_medium: "Средний",
        v_vol_low: "Низкий",
        v_vol_medium: "Средний",
        v_vol_high: "Высокий",
        v_market_otc: "OTC",
        v_dash: "—",
        btn_repeat: "Повторить",
        btn_reset: "Сбросить",
        faq_title: "FAQ",
        faq_q1: "Что такое AI сигнал?",
        faq_a1: "Торговый сигнал, сгенерированный ИИ на основе анализа рынка.",
        faq_q2: "Зачем нужен VIP статус?",
        faq_a2: "VIP ускоряет анализ и повышает качество сигналов, открывая доп. инструменты.",
        faq_q3: "Что такое время экспирации?",
        faq_a3: "Момент, когда сделка закрывается автоматически. Выберите подходящее время.",
        faq_q4: "Чем отличаются торговые модели?",
        faq_a4: "Модели различаются производительностью и вычислительной мощностью.",
        faq_q5: "Верные ли сигналы выдает бот?",
        faq_a5: "Сигналы агрегируются по множеству рынков для устойчивости.",
        cp_title_fiat: "Валюты",
        cp_title_crypto: "Криптовалюта",
        cp_title_commod: "Сырьевые товары",
        cp_title_stocks: "Акции",
        cp_title_docs: "Индексы",
        cp_title_fav: "Избранное",
        cp_title_search: "Поиск",
        cp_search_ph: "Поиск",
        cp_fav_only_title: "Только избранное",
        cp_head_market: "Рынок",
        cp_empty: "Ничего не найдено",
        ex_title: "Время экспирации",
        md_title: "AI модель",
        md_v1: "NeuralEdge V1",
        md_v2: "NeuralEdge V2",
        md_vip_note: "Только для VIP",
        vip_sheet_title: "Получи доступ к VIP",
        vip_close_aria: "Закрыть",
        vip_hero_badge: "Эксклюзивный доступ",
        vip_hero_h4: "Больше точности. Больше рынков. Меньше рисков.",
        vip_hero_sub: "VIP открывает продвинутую модель, приоритетные сигналы и риск-инструменты.",
        vip_compare_free: "Базовый",
        vip_compare_vip: "VIP",
        vip_free_list: ["Модель NeuralEdge V1","Средняя точность сигналов","Стандартные рынки","Ограниченная история сигналов","Анализ каждые 40 секунд","Доходность до 80%"],
        vip_paid_list: ["Модель NeuralEdge V2","Таймфреймы до H4","Расширенные рынки: акции/крипто/индексы","Приоритет и ранний доступ","Детализация: сила/объём/вероятностные коридоры","Глубокая история и избранное","Анализ каждые 1.2 секунды","Доходность до 170%"],
        vip_h3: "Что даёт VIP",
        vip_feat_1_t: "+ до 12% ↑ точность",
        vip_feat_1_s: "за счёт ансамблей и калибровки вероятностей.",
        vip_feat_2_t: "Приоритетная выдача",
        vip_feat_2_s: "сигнал попадает к VIP первым.",
        vip_feat_3_t: "Риск-гайды",
        vip_feat_3_s: "адаптивный лот/экспирация под волатильность.",
        vip_feat_4_t: "Расширенные рынки",
        vip_feat_4_s: "пакеты по акциям, индексам и крипте.",
        vip_how_h4: "Как получить VIP",
        vip_how_p: "Продолжайте торговать на PocketOption. VIP выдаётся автоматически от оборота.",
    },
    es: {
        app_title: "Pocket Signals",
        hero_title: "Opera con IA",
        hero_sub: "Señales inteligentes para un trading rentable",
        field_pair_label: "Par de divisas",
        field_pair_ph: "Elige el par",
        field_expiry_label: "Tiempo de expiración",
        field_expiry_ph: "Elige el tiempo",
        field_model_label: "Modelo de IA",
        field_model_ph: "Elige el modelo",
        btn_get_signal: "Obtener señal",
        signal_title: "Señal",
        dir_buy: "COMPRAR",
        dir_sell: "VENDER",
        k_conf: "CONFIANZA",
        k_acc: "PRECISIÓN",
        btn_repeat: "Repetir",
        btn_reset: "Restablecer",
        cp_title_fiat: "Divisas",
        cp_title_crypto: "Cripto",
        cp_title_commod: "Materias primas",
        cp_title_stocks: "Acciones",
        cp_title_docs: "Índices",
        md_vip_note: "Solo VIP",
    }
};

let CURRENT_LANG = (localStorage.getItem(LANG_KEY) || "en");

function t(key) {
    const L = I18N[CURRENT_LANG] || I18N.en;
    return (L && key.split(".").reduce((o,k)=>o?.[k], L)) ?? I18N.en?.[key] ?? "";
}

function applyI18nToDOM() {
    const metaLang = SUP_LANGS.find(x=>x.code===CURRENT_LANG) || SUP_LANGS[0];
    document.documentElement.lang = metaLang.code;
    document.documentElement.dir = metaLang.dir || "ltr";
    document.body.classList.toggle("rtl", metaLang.dir==="rtl");

    try { document.title = t("app_title") || document.title; } catch(_){}

    const vipText = document.getElementById("vipText");
    if (vipText) vipText.textContent = t("header_become_vip");

    document.querySelector(".main-heading h1")?.replaceChildren(t("hero_title"));
    document.querySelector(".main-heading p")?.replaceChildren(t("hero_sub"));

    const pairLabel = document.querySelector('.glass-card .field-block:nth-of-type(1) label');
    const expLabel  = document.querySelector('.glass-card .field-block:nth-of-type(2) label');
    const modelLabel= document.querySelector('.glass-card .field-block:nth-of-type(3) label');
    if (pairLabel) pairLabel.textContent = t("field_pair_label");
    if (expLabel)  expLabel.textContent  = t("field_expiry_label");
    if (modelLabel)modelLabel.textContent = t("field_model_label");

    const pairInput = document.getElementById("pairField");
    const timeInput = document.getElementById("timeField");
    const modelInput= document.getElementById("modelField");
    if (pairInput) pairInput.placeholder = t("field_pair_ph");
    if (timeInput) timeInput.placeholder  = t("field_expiry_ph");
    if (modelInput) modelInput.placeholder= t("field_model_ph");

    const getBtn = document.getElementById("getSignalBtn");
    if (getBtn) getBtn.textContent = t("btn_get_signal");

    document.querySelector(".signal-title span")?.replaceChildren(t("signal_title"));
    
    const steps = Array.from(document.querySelectorAll("#sigSteps .sig-step"));
    const stepKeys = [["steps_1_t","steps_1_s"],["steps_2_t","steps_2_s"],["steps_3_t","steps_3_s"],["steps_4_t","steps_4_s"],["steps_5_t","steps_5_s"]];
    steps.forEach((li, i)=>{
        const b = li.querySelector("b"); const sub = li.querySelector(".sub");
        if (b) b.textContent = t(stepKeys[i][0]);
        if (sub) sub.textContent = t(stepKeys[i][1]);
    });

    const rep = document.getElementById("sigRepeat");
    const rst = document.getElementById("sigReset");
    if (rep) rep.textContent = t("btn_repeat");
    if (rst) rst.textContent = t("btn_reset");

    document.getElementById("cpSearch")?.setAttribute("placeholder", t("cp_search_ph"));
}

function i18nFormatDirection(isBuy){ return isBuy ? t("dir_buy") : t("dir_sell"); }
function i18nFormatStrength(code){ return code==="High" ? t("v_strength_high") : t("v_strength_medium"); }
function i18nFormatVolume(code){ return code==="Low" ? t("v_vol_low") : (code==="High" ? t("v_vol_high") : t("v_vol_medium")); }
function i18nMarketOTC(isOtc){ return isOtc ? t("v_market_otc") : t("v_dash"); }

function setCurrentLang(code) {
    const found = SUP_LANGS.find(l => l.code === code) || SUP_LANGS.find(l=>l.code==="en");
    if (langFlag) { langFlag.src = `images/flags/${found.code}.svg`; langFlag.alt = found.short; }
    if (langCode) langCode.textContent = found.short;
    CURRENT_LANG = found.code;
    try { localStorage.setItem(LANG_KEY, found.code); } catch(_) {}
    applyI18nToDOM();
}

function renderLangMenu() {
    if (!langMenu) return;
    langMenu.innerHTML = "";
    SUP_LANGS.forEach(({ code, label, short }) => {
        const li = document.createElement("li");
        const btn = document.createElement("button");
        btn.innerHTML = `<img class="lang-flag" src="images/flags/${code}.svg" alt="${short}"> ${label} (${short})`;
        btn.addEventListener("click", () => {
            setCurrentLang(code);
            langMenu.classList.remove("open");
            langWrap?.classList.remove("open");
        });
        li.appendChild(btn);
        langMenu.appendChild(li);
    });
}

langBtn?.addEventListener("click", () => {
    langMenu?.classList.toggle("open");
    langWrap?.classList.toggle("open");
});

renderLangMenu();
setCurrentLang(localStorage.getItem(LANG_KEY) || "en");

// =============================
// Direction icons (inline SVG)
// =============================
const SELL_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><g stroke="#ff0000" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"><path fill="none" stroke-dasharray="14" stroke-dashoffset="14" d="M6 19h12"><animate fill="freeze" attributeName="stroke-dashoffset" dur="0.4s" values="14;0"/></path><path fill="#ff0000" d="M12 4 h2 v6 h2.5 L12 14.5M12 4 h-2 v6 h-2.5 L12 14.5"><animate attributeName="d" calcMode="linear" dur="1.5s" keyTimes="0;0.7;1" repeatCount="indefinite" values="M12 4 h2 v6 h2.5 L12 14.5M12 4 h-2 v6 h-2.5 L12 14.5; M12 4 h2 v3 h2.5 L12 11.5M12 4 h-2 v3 h-2.5 L12 11.5; M12 4 h2 v6 h2.5 L12 14.5M12 4 h-2 v6 h-2.5 L12 14.5"/></path></g></svg>`;
const BUY_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><g stroke="#32ac41" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"><path fill="none" stroke-dasharray="14" stroke-dashoffset="14" d="M6 19h12"><animate fill="freeze" attributeName="stroke-dashoffset" dur="0.4s" values="14;0"/></path><path fill="#32ac41" d="M12 15 h2 v-6 h2.5 L12 4.5M12 15 h-2 v-6 h-2.5 L12 4.5"><animate attributeName="d" calcMode="linear" dur="1.5s" keyTimes="0;0.7;1" repeatCount="indefinite" values="M12 15 h2 v-6 h2.5 L12 4.5M12 15 h-2 v-6 h-2.5 L12 4.5; M12 15 h2 v-3 h2.5 L12 7.5M12 15 h-2 v-3 h-2.5 L12 7.5; M12 15 h2 v-6 h2.5 L12 4.5M12 15 h-2 v-6 h-2.5 L12 4.5"/></path></g></svg>`;

restoreState();
restoreResult();

// ===============================
// Currency Pair Popup
// ===============================
(function(){
    const DATA = {
        fiat: [{id:"EUR_USD_OTC",name:"EUR/USD OTC",market:"OTC"},{id:"GBP_USD_OTC",name:"GBP/USD OTC",market:"OTC"},{id:"EUR_JPY_OTC",name:"EUR/JPY OTC",market:"OTC"},{id:"USD_JPY_OTC",name:"USD/JPY OTC",market:"OTC"}],
        crypto: [{id:"Bitcoin_OTC",name:"Bitcoin OTC",market:"OTC"},{id:"Ethereum_OTC",name:"Ethereum OTC",market:"OTC"}],
        commod: [{id:"Gold_OTC",name:"Gold OTC",market:"OTC"},{id:"Silver_OTC",name:"Silver OTC",market:"OTC"}],
        stocks: [{id:"Apple_OTC",name:"Apple OTC",market:"OTC"},{id:"Tesla_OTC",name:"Tesla OTC",market:"OTC"}],
        docs: [{id:"SP500_OTC",name:"SP500 OTC",market:"OTC"}]
    };

    const favKey = "pair_favorites_v1";
    const favSet = new Set(JSON.parse(localStorage.getItem(favKey) || "[]"));
    let currentTab = "fiat";
    let favOnly = false;
    let query = "";

    const overlay = document.getElementById("cpPopup");
    const list = document.getElementById("cpList");
    const leftTitle = document.getElementById("cpLeftTitle");
    const searchInput = document.getElementById("cpSearch");
    const favOnlyBtn  = document.getElementById("cpFavOnly");

    function open(){ overlay.setAttribute("aria-hidden","false"); document.body.style.overflow="hidden"; render(); }
    function close(){ overlay.setAttribute("aria-hidden","true"); document.body.style.overflow=""; }
    function poolAll(){ return [].concat(DATA.fiat||[], DATA.crypto||[], DATA.commod||[], DATA.stocks||[], DATA.docs||[]); }

    function render(){
        const q = query.trim().toLowerCase();
        let raw;
        if (q) {
            raw = poolAll().filter(x => x.name.toLowerCase().includes(q));
        } else if (currentTab === "fav") {
            raw = poolAll().filter(x => favSet.has(x.id));
        } else {
            leftTitle.textContent = t("cp_title_" + currentTab);
            raw = DATA[currentTab] || [];
        }

        const filtered = raw.filter(item => (currentTab === "fav" || q) ? true : (favOnly ? favSet.has(item.id) : true));

        list.innerHTML = filtered.map(it => `
          <div class="cp-item" data-id="${it.id}">
            <div class="cp-title">
              <img class="cp-star" data-star data-id="${it.id}" src="images/icons/StarFilled.svg" style="opacity:${favSet.has(it.id)?1:.25}" />
              <div class="cp-name">${it.name}</div>
            </div>
            <div class="cp-market">${it.market||""}</div>
          </div>
        `).join("") || `<div style="padding:24px;color:var(--cp-muted);">${t("cp_empty")}</div>`;

        list.querySelectorAll("[data-star]").forEach(btn=>{
            btn.addEventListener("click", (e)=>{
                e.stopPropagation();
                const id = btn.dataset.id;
                if (favSet.has(id)) favSet.delete(id); else favSet.add(id);
                localStorage.setItem(favKey, JSON.stringify([...favSet]));
                render();
            });
        });

        list.querySelectorAll(".cp-item").forEach(row=>{
            row.addEventListener("click", ()=>{
                const item = poolAll().find(x=>x.id===row.dataset.id);
                if (!item) return;
                state.pair = item.name;
                document.getElementById("pairField").value = item.name;
                checkReady(); saveState(); close();
            });
        });
    }

    document.getElementById("cpTabs").addEventListener("click", (e)=>{
        const tab = e.target.closest(".cp-tab");
        if (!tab) return;
        const targetTab = tab.dataset.tab;

        // БЛОКИРОВКА ПАР ДЛЯ НЕ-VIP
        if (!IS_VIP && targetTab !== "fiat") {
            close();
            document.getElementById("vipBtn").click();
            return;
        }

        document.querySelectorAll(".cp-tab").forEach(t=>t.setAttribute("aria-selected","false"));
        tab.setAttribute("aria-selected","true");
        currentTab = targetTab;
        render();
    });

    searchInput.addEventListener("input", ()=>{ query = searchInput.value; render(); });
    favOnlyBtn.addEventListener("click", ()=>{ favOnly = !favOnly; render(); });
    overlay.addEventListener("click", (e)=>{ if (e.target === overlay) close(); });

    window.CurrencyPairPopup = { open, close, render };
})();

// =========================
// Expiry Popup
// =========================
(function(){
    const PRESETS = [{id:"S5",label:"S5",seconds:5},{id:"S30",label:"S30",seconds:30},{id:"M1",label:"M1",seconds:60},{id:"M5",label:"M5",seconds:300},{id:"H1",label:"H1",seconds:3600}];
    const overlay = document.getElementById("exPopup");
    const grid = document.getElementById("exGrid");

    function open(){ overlay.setAttribute("aria-hidden","false"); render(); }
    function close(){ overlay.setAttribute("aria-hidden","true"); }

    function render(){
        grid.innerHTML = PRESETS.map(p => `<button class="ex-chip" data-id="${p.id}">${p.label}</button>`).join("");
        grid.querySelectorAll(".ex-chip").forEach(btn=>{
            btn.addEventListener("click", ()=>{
                const item = PRESETS.find(x=>x.id===btn.dataset.id);
                state.time = item.label; state.expirySeconds = item.seconds;
                document.getElementById("timeField").value = item.label;
                checkReady(); saveState(); close();
            });
        });
    }
    window.CurrencyExpiryPopup = { open, close };
})();

// ========================
// Model Popup
// ========================
(function(){
    const MODELS = [{id:"NE_V1",label:"NeuralEdge V1"},{id:"NE_V2",label:"NeuralEdge V2"}];
    const overlay = document.getElementById("mdPopup");
    const grid = document.getElementById("mdGrid");

    function open(){ overlay.setAttribute("aria-hidden","false"); render(); }
    function close(){ overlay.setAttribute("aria-hidden","true"); }

    function render(){
        grid.innerHTML = MODELS.map(m => {
            // БЛОКИРОВКА МОДЕЛИ V2 ДЛЯ НЕ-VIP
            const isLocked = (m.id === "NE_V2" && !IS_VIP);
            return `<button class="md-chip${isLocked ? " is-disabled" : ""}" data-id="${m.id}" ${isLocked ? "disabled" : ""}>
                <span>${m.label}</span>
                ${isLocked ? `<span class="md-badge">${t("md_vip_note")}</span>` : ""}
            </button>`;
        }).join("");

        grid.querySelectorAll(".md-chip").forEach(btn=>{
            btn.addEventListener("click", ()=>{
                const item = MODELS.find(x=>x.id===btn.dataset.id);
                state.model = item.label;
                document.getElementById("modelField").value = item.label;
                document.getElementById("selectedModel").textContent = item.label;
                checkReady(); saveState(); close();
            });
        });
    }
    window.CurrencyModelPopup = { open, close };
})();

// ===============================================
// Signal flow
// ===============================================
(function(){
    const viewA  = document.getElementById("sigAnalysis");
    const viewR  = document.getElementById("sigResult");

    document.getElementById("getSignalBtn")?.addEventListener("click", start);
    document.getElementById("sigRepeat")?.addEventListener("click", start);
    document.getElementById("sigReset")?.addEventListener("click", resetAll);

    function start(){
        const pair = document.getElementById("pairField").value;
        if (!pair) return;

        document.body.classList.add("analysis-open");
        viewR.hidden = true; viewA.style.display = "";
        resetSigSteps();

        let progress = 0;
        const interval = setInterval(() => {
            progress += 1;
            setSigStepsState(Math.floor(progress / 20));
            if (progress >= 100) {
                clearInterval(interval);
                showResult(pair, state.time);
            }
        }, 30);
    }

    function showResult(pair, time){
        const isBuy = Math.random() > 0.5