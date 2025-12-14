// =============================
// VIP Indicator & Bottom Sheet
// =============================
document.addEventListener("DOMContentLoaded", () => {
    const vipBtn = document.getElementById("vipBtn");
    const vipIndicator = document.getElementById("vipIndicator");
    const sheet = document.getElementById("vipSheet");

    const viewed = localStorage.getItem("vipViewed");
    if (!viewed && vipIndicator) vipIndicator.style.display = "block";

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

    // close handlers
    sheet?.addEventListener("click", (e) => {
        const t = e.target;
        if (t.matches("[data-close]") || t.closest("#vipClose")) closeVip();
    });
    document.getElementById("vipClose")?.addEventListener("click", closeVip);
    document.getElementById("vipLater")?.addEventListener("click", closeVip);

    // ESC
    document.addEventListener("keydown", (e)=>{ if (e.key === "Escape" && sheet && sheet.getAttribute("aria-hidden")==="false") closeVip(); });

    // Basic swipe-down
    let startY = null;
    sheet?.addEventListener("touchstart", (e)=>{ startY = e.touches[0].clientY; }, {passive:true});
    sheet?.addEventListener("touchmove",  ()=>{}, {passive:true});
    sheet?.addEventListener("touchend",   (e)=>{
        if (startY == null) return;
        const dy = (e.changedTouches[0].clientY - startY);
        if (dy > 80) closeVip();
        startY = null;
    });

    // CTA
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
    time: null,            // "S5/M1/..."
    expiry: null,          // duplicate tag
    expirySeconds: null,   // seconds number
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

        // 1) Direction + icon
        const dirEl = document.getElementById("sigDirection");
        if (dirEl) {
            dirEl.textContent = i18nFormatDirection(!!r.isBuy);
            dirEl.classList.toggle("buy",  !!r.isBuy);
            dirEl.classList.toggle("sell", !r.isBuy);
        }
        const iconBox = document.getElementById("sigDirIcon");
        if (iconBox) iconBox.innerHTML = r.isBuy ? BUY_SVG : SELL_SVG;

        // 2) Fields (localized)
        const setText = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v ?? t("v_dash"); };
        setText("sigPair",     r.pair);
        setText("sigConf",     r.conf);
        setText("sigAcc",      r.acc);
        setText("sigMarket",   i18nMarketOTC(r.market === "OTC"));
        setText("sigStrength", i18nFormatStrength(r.strCode || "Medium"));
        setText("sigVol",      i18nFormatVolume(r.volCode || "Medium"));
        setText("sigTime",     r.time);
        setText("sigValid",    r.valid);

        // 3) Show result and raise card
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

    const value = prompt(`Choose value for: ${field}`);
    if (!value) return;
    state[field] = value;
    const el = document.getElementById(`${field}Field`);
    if (el) el.value = value;
    checkReady();
    saveState();
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

// Show selected model on first render
document.addEventListener("DOMContentLoaded", () => {
    const model = state.model || document.getElementById("modelField")?.value || "NeuralEdge V1";
    const span = document.getElementById("selectedModel");
    if (span) span.innerText = model;
});

// =============================
// FAQ
// =============================
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
    // ===== EN (default) =====
    en: {
        app_title: "Pocket Signals",

        lang_select_aria: "Select language",
        hero_title: "Trade with AI",
        hero_sub: "Smart signals for profitable trading",
        header_become_vip: "Become VIP",
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
        vip_free_list: [
            "NeuralEdge V1 model",
            "Average signal accuracy",
            "Standard markets",
            "Limited signal history",
            "Market analysis every 40s",
            "Payouts up to 80%",
        ],
        vip_paid_list: [
            "NeuralEdge V2 model",
            "Timeframes up to H4",
            "Extended markets: stocks/crypto/indices",
            "Priority & early access",
            "Details: strength/volume/probability corridors",
            "Deep history & favorites",
            "Market analysis every 1.2s",
            "Payouts up to 170%",
        ],
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

    // ===== RU =====
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
        vip_free_list: [
            "Модель NeuralEdge V1",
            "Средняя точность сигналов",
            "Стандартные рынки",
            "Ограниченная история сигналов",
            "Анализ каждые 40 секунд",
            "Доходность до 80%",
        ],
        vip_paid_list: [
            "Модель NeuralEdge V2",
            "Таймфреймы до H4",
            "Расширенные рынки: акции/крипто/индексы",
            "Приоритет и ранний доступ",
            "Детализация: сила/объём/вероятностные коридоры",
            "Глубокая история и избранное",
            "Анализ каждые 1.2 секунды",
            "Доходность до 170%",
        ],
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

    // ===== ES =====
    es: {
        app_title: "Pocket Signals",

        lang_select_aria: "Seleccionar idioma",
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
        signal_model_prefix: "Modelo:",
        steps_1_t: "Cribado técnico",
        steps_1_s: "Indicadores, niveles, volatilidad",
        steps_2_t: "Reconocimiento de patrones",
        steps_2_s: "Tendencias, figuras y velas",
        steps_3_t: "Modelado matemático",
        steps_3_s: "Probabilidades y gestión del riesgo",
        steps_4_t: "Generación de señal",
        steps_4_s: "Agregación y normalización",
        steps_5_t: "Validación cruzada",
        steps_5_s: "Consistencia y control de errores",

        dir_buy: "COMPRAR",
        dir_sell: "VENDER",
        k_conf: "CONFIANZA",
        k_acc: "PRECISIÓN",
        k_market: "MERCADO",
        k_strength: "FUERZA",
        k_volume: "VOLUMEN",
        k_time: "HORA",
        k_valid: "VÁLIDA HASTA",
        v_strength_high: "Fuerte",
        v_strength_medium: "Media",
        v_vol_low: "Bajo",
        v_vol_medium: "Medio",
        v_vol_high: "Alto",
        v_market_otc: "OTC",
        v_dash: "—",
        btn_repeat: "Repetir",
        btn_reset: "Restablecer",

        faq_title: "FAQ",
        faq_q1: "¿Qué es una señal de IA?",
        faq_a1: "Una señal generada por inteligencia artificial basada en el análisis del mercado.",
        faq_q2: "¿Para qué sirve el estado VIP?",
        faq_a2: "VIP acelera el análisis, mejora la calidad de las señales y desbloquea herramientas extra.",
        faq_q3: "¿Qué es el tiempo de expiración?",
        faq_a3: "El momento en que la operación se cierra automáticamente. Elige el que se adapte a tu estrategia.",
        faq_q4: "¿En qué difieren los modelos?",
        faq_a4: "Difieren en rendimiento y potencia de cómputo, por eso muestran señales distintas.",
        faq_q5: "¿Las señales son precisas?",
        faq_a5: "Las señales se agregan en muchos mercados y sedes para ganar robustez.",

        cp_title_fiat: "Divisas",
        cp_title_crypto: "Cripto",
        cp_title_commod: "Materias primas",
        cp_title_stocks: "Acciones",
        cp_title_docs: "Índices",
        cp_title_fav: "Favoritos",
        cp_title_search: "Buscar",
        cp_search_ph: "Buscar",
        cp_fav_only_title: "Solo favoritos",
        cp_head_market: "Mercado",
        cp_empty: "No se encontró nada",

        ex_title: "Tiempo de expiración",
        md_title: "Modelo de IA",
        md_v1: "NeuralEdge V1",
        md_v2: "NeuralEdge V2",
        md_vip_note: "Solo VIP",

        vip_sheet_title: "Consigue acceso VIP",
        vip_close_aria: "Cerrar",
        vip_hero_badge: "Acceso exclusivo",
        vip_hero_h4: "Más precisión. Más mercados. Menos riesgo.",
        vip_hero_sub: "VIP desbloquea el modelo avanzado, señales prioritarias y herramientas de riesgo.",
        vip_compare_free: "Básico",
        vip_compare_vip: "VIP",
        vip_free_list: [
            "Modelo NeuralEdge V1",
            "Precisión media de señales",
            "Mercados estándar",
            "Historial de señales limitado",
            "Análisis del mercado cada 40 s",
            "Pagos de hasta el 80%"
        ],
        vip_paid_list: [
            "Modelo NeuralEdge V2",
            "Marcos temporales hasta H4",
            "Mercados ampliados: acciones/cripto/índices",
            "Señales prioritarias y acceso anticipado",
            "Detalles: fuerza/volumen/corredores de probabilidad",
            "Historial profundo y favoritos",
            "Análisis del mercado cada 1.2 s",
            "Pagos de hasta el 170%"
        ],
        vip_h3: "Qué aporta VIP",
        vip_feat_1_t: "+ hasta un 12% ↑ de precisión",
        vip_feat_1_s: "gracias a conjuntos y calibración de probabilidades.",
        vip_feat_2_t: "Entrega prioritaria",
        vip_feat_2_s: "el VIP recibe la señal primero.",
        vip_feat_3_t: "Guías de riesgo",
        vip_feat_3_s: "lote/expiración adaptativos según la volatilidad.",
        vip_feat_4_t: "Mercados ampliados",
        vip_feat_4_s: "paquetes para acciones, índices y cripto.",
        vip_how_h4: "Cómo obtener VIP",
        vip_how_p: "Sigue operando en PocketOption. VIP se concede automáticamente según tu volumen."
    },

// ===== FR =====
    fr: {
        app_title: "Pocket Signals",
        header_become_vip: "Devenir VIP",
        lang_select_aria: "Choisir la langue",
        hero_title: "Trade avec l’IA",
        hero_sub: "Signaux intelligents pour un trading rentable",

        field_pair_label: "Pair de devises",
        field_pair_ph: "Choisissez la paire",
        field_expiry_label: "Échéance",
        field_expiry_ph: "Choisissez l’heure",
        field_model_label: "Modèle d’IA",
        field_model_ph: "Choisissez le modèle",
        btn_get_signal: "Obtenir le signal",

        signal_title: "Signal",
        signal_model_prefix: "Modèle :",
        steps_1_t: "Filtrage technique",
        steps_1_s: "Indicateurs, niveaux, volatilité",
        steps_2_t: "Reconnaissance de motifs",
        steps_2_s: "Tendances, figures, chandeliers",
        steps_3_t: "Modélisation mathématique",
        steps_3_s: "Probabilités et gestion du risque",
        steps_4_t: "Génération du signal",
        steps_4_s: "Agrégation et normalisation",
        steps_5_t: "Validation croisée",
        steps_5_s: "Cohérence et contrôle des erreurs",

        dir_buy: "ACHAT",
        dir_sell: "VENTE",
        k_conf: "CONFIANCE",
        k_acc: "PRÉCISION",
        k_market: "MARCHÉ",
        k_strength: "FORCE",
        k_volume: "VOLUME",
        k_time: "HEURE",
        k_valid: "VALIDE JUSQU’À",
        v_strength_high: "Forte",
        v_strength_medium: "Moyenne",
        v_vol_low: "Faible",
        v_vol_medium: "Moyen",
        v_vol_high: "Élevé",
        v_market_otc: "OTC",
        v_dash: "—",
        btn_repeat: "Répéter",
        btn_reset: "Réinitialiser",

        faq_title: "FAQ",
        faq_q1: "Qu’est-ce qu’un signal d’IA ?",
        faq_a1: "Un signal généré par une intelligence artificielle sur la base de l’analyse du marché.",
        faq_q2: "Pourquoi le statut VIP ?",
        faq_a2: "Le VIP accélère l’analyse, améliore la qualité des signaux et débloque des outils supplémentaires.",
        faq_q3: "Qu’est-ce que l’échéance ?",
        faq_a3: "Le moment où la position se ferme automatiquement. Choisissez selon votre stratégie.",
        faq_q4: "En quoi les modèles diffèrent-ils ?",
        faq_a4: "Ils diffèrent en performance et puissance de calcul ; les signaux peuvent varier.",
        faq_q5: "Les signaux sont-ils précis ?",
        faq_a5: "Les signaux sont agrégés sur de nombreux marchés et places pour plus de robustesse.",

        cp_title_fiat: "Devises",
        cp_title_crypto: "Crypto",
        cp_title_commod: "Matières premières",
        cp_title_stocks: "Actions",
        cp_title_docs: "Indices",
        cp_title_fav: "Favoris",
        cp_title_search: "Recherche",
        cp_search_ph: "Recherche",
        cp_fav_only_title: "Uniquement favoris",
        cp_head_market: "Marché",
        cp_empty: "Aucun résultat",

        ex_title: "Échéance",
        md_title: "Modèle d’IA",
        md_v1: "NeuralEdge V1",
        md_v2: "NeuralEdge V2",
        md_vip_note: "VIP uniquement",

        vip_sheet_title: "Obtenir l’accès VIP",
        vip_close_aria: "Fermer",
        vip_hero_badge: "Accès exclusif",
        vip_hero_h4: "Plus de précision. Plus de marchés. Moins de risque.",
        vip_hero_sub: "Le VIP débloque le modèle avancé, des signaux prioritaires et des outils de risque.",
        vip_compare_free: "Basique",
        vip_compare_vip: "VIP",
        vip_free_list: [
            "Modèle NeuralEdge V1",
            "Précision moyenne des signaux",
            "Marchés standards",
            "Historique des signaux limité",
            "Analyse du marché toutes les 40 s",
            "Rendements jusqu’à 80 %"
        ],
        vip_paid_list: [
            "Modèle NeuralEdge V2",
            "Unités de temps jusqu’à H4",
            "Marchés étendus : actions/crypto/indices",
            "Signaux prioritaires et accès anticipé",
            "Détails : force/volume/corridors de probabilité",
            "Historique profond et favoris",
            "Analyse du marché toutes les 1,2 s",
            "Rendements jusqu’à 170 %"
        ],
        vip_h3: "Ce que propose le VIP",
        vip_feat_1_t: "+ jusqu’à 12 % ↑ de précision",
        vip_feat_1_s: "grâce aux ensembles et à la calibration des probabilités.",
        vip_feat_2_t: "Livraison prioritaire",
        vip_feat_2_s: "le VIP reçoit le signal en premier.",
        vip_feat_3_t: "Guides de risque",
        vip_feat_3_s: "lot/échéance adaptatifs à la volatilité.",
        vip_feat_4_t: "Marchés étendus",
        vip_feat_4_s: "packs actions, indices et crypto.",
        vip_how_h4: "Comment obtenir le VIP",
        vip_how_p: "Continuez à trader sur PocketOption. Le VIP est attribué automatiquement selon votre volume."
    },

// ===== HI =====
    hi: {
        app_title: "Pocket Signals",
        header_become_vip: "VIP बनें",
        lang_select_aria: "भाषा चुनें",
        hero_title: "AI के साथ ट्रेड करें",
        hero_sub: "लाभदायक ट्रेडिंग के लिए स्मार्ट सिग्नल",

        field_pair_label: "मुद्रा जोड़ी",
        field_pair_ph: "जोड़ी चुनें",
        field_expiry_label: "एक्सपायरी समय",
        field_expiry_ph: "समय चुनें",
        field_model_label: "AI मॉडल",
        field_model_ph: "मॉडल चुनें",
        btn_get_signal: "सिग्नल प्राप्त करें",

        signal_title: "सिग्नल",
        signal_model_prefix: "मॉडल:",
        steps_1_t: "तकनीकी स्क्रीनिंग",
        steps_1_s: "इंडिकेटर, स्तर, वॉलैटिलिटी",
        steps_2_t: "पैटर्न पहचान",
        steps_2_s: "ट्रेंड, फ़िगर, कैंडल",
        steps_3_t: "गणितीय मॉडलिंग",
        steps_3_s: "संभावनाएँ व जोखिम प्रबंधन",
        steps_4_t: "सिग्नल जनरेशन",
        steps_4_s: "एग्रीगेशन व सामान्यीकरण",
        steps_5_t: "क्रॉस-वैलिडेशन",
        steps_5_s: "संगतता व त्रुटि नियंत्रण",

        dir_buy: "खरीद",
        dir_sell: "बिक्री",
        k_conf: "विश्वास",
        k_acc: "सटीकता",
        k_market: "बाज़ार",
        k_strength: "ताकत",
        k_volume: "वॉल्यूम",
        k_time: "समय",
        k_valid: "मान्य तक",
        v_strength_high: "मजबूत",
        v_strength_medium: "मध्यम",
        v_vol_low: "कम",
        v_vol_medium: "मध्यम",
        v_vol_high: "उच्च",
        v_market_otc: "OTC",
        v_dash: "—",
        btn_repeat: "दोहराएँ",
        btn_reset: "रीसेट",

        faq_title: "FAQ",
        faq_q1: "AI सिग्नल क्या है?",
        faq_a1: "बाज़ार विश्लेषण के आधार पर कृत्रिम बुद्धि द्वारा उत्पन्न सिग्नल।",
        faq_q2: "VIP स्टेटस क्यों?",
        faq_a2: "VIP विश्लेषण तेज़ करता है, सिग्नल गुणवत्ता बढ़ाता है और अतिरिक्त टूल देता है।",
        faq_q3: "एक्सपायरी समय क्या है?",
        faq_a3: "वह समय जब ट्रेड स्वतः बंद हो जाता है। अपनी रणनीति के अनुसार चुनें।",
        faq_q4: "मॉडलों में क्या अंतर है?",
        faq_a4: "प्रदर्शन और कंप्यूट क्षमता अलग होती है, इसलिए सिग्नल भी भिन्न हो सकते हैं।",
        faq_q5: "क्या सिग्नल सटीक हैं?",
        faq_a5: "कई बाज़ारों/प्लेटफ़ॉर्म से संगृहीत करके मज़बूती बढ़ाई जाती है।",

        cp_title_fiat: "मुद्राएँ",
        cp_title_crypto: "क्रिप्टो",
        cp_title_commod: "कमोडिटी",
        cp_title_stocks: "शेयर",
        cp_title_docs: "सूचकांक",
        cp_title_fav: "पसंदीदा",
        cp_title_search: "खोज",
        cp_search_ph: "खोज",
        cp_fav_only_title: "केवल पसंदीदा",
        cp_head_market: "बाज़ार",
        cp_empty: "कुछ नहीं मिला",

        ex_title: "एक्सपायरी समय",
        md_title: "AI मॉडल",
        md_v1: "NeuralEdge V1",
        md_v2: "NeuralEdge V2",
        md_vip_note: "केवल VIP",

        vip_sheet_title: "VIP एक्सेस प्राप्त करें",
        vip_close_aria: "बंद करें",
        vip_hero_badge: "विशेष प्रवेश",
        vip_hero_h4: "ज़्यादा सटीकता. ज़्यादा बाज़ार. कम जोखिम.",
        vip_hero_sub: "VIP उन्नत मॉडल, प्राथमिकता सिग्नल और जोखिम टूल खोलता है।",
        vip_compare_free: "बेसिक",
        vip_compare_vip: "VIP",
        vip_free_list: [
            "NeuralEdge V1 मॉडल",
            "सिग्नल की औसत सटीकता",
            "मानक बाज़ार",
            "सीमित सिग्नल इतिहास",
            "हर 40 सेकंड में विश्लेषण",
            "अधिकतम 80% पAYOUT"
        ],
        vip_paid_list: [
            "NeuralEdge V2 मॉडल",
            "H4 तक टाइमफ़्रेम",
            "विस्तारित बाज़ार: शेयर/क्रिप्टो/सूचकांक",
            "प्राथमिकता सिग्नल एवं अग्रिम पहुँच",
            "विवरण: ताकत/वॉल्यूम/प्रायिकता कॉरिडोर",
            "डीप इतिहास और पसंदीदा",
            "हर 1.2 सेकंड में विश्लेषण",
            "अधिकतम 170% पAYOUT"
        ],
        vip_h3: "VIP से क्या मिलता है",
        vip_feat_1_t: "+ अधिकतम 12% ↑ सटीकता",
        vip_feat_1_s: "एंसेंबल व प्रायिकता कैलिब्रेशन से।",
        vip_feat_2_t: "प्राथमिकता डिलीवरी",
        vip_feat_2_s: "VIP को सिग्नल पहले मिलता है।",
        vip_feat_3_t: "रिस्क गाइड्स",
        vip_feat_3_s: "वोलैटिलिटी के अनुसार लॉट/एक्सपायरी अनुकूली।",
        vip_feat_4_t: "विस्तारित बाज़ार",
        vip_feat_4_s: "शेयर, सूचकांक, क्रिप्टो पैकेज।",
        vip_how_h4: "VIP कैसे पाएँ",
        vip_how_p: "PocketOption पर ट्रेड जारी रखें। टर्नओवर के आधार पर VIP स्वतः मिलता है।"
    },

// ===== AR (RTL) =====
    ar: {
        app_title: "Pocket Signals",
        header_become_vip: "اصبح VIP",
        lang_select_aria: "اختيار اللغة",
        hero_title: "تداول مع الذكاء الاصطناعي",
        hero_sub: "إشارات ذكية لتداول مربح",

        field_pair_label: "زوج العملات",
        field_pair_ph: "اختر الزوج",
        field_expiry_label: "وقت الانتهاء",
        field_expiry_ph: "اختر الوقت",
        field_model_label: "نموذج الذكاء الاصطناعي",
        field_model_ph: "اختر النموذج",
        btn_get_signal: "احصل على إشارة",

        signal_title: "إشارة",
        signal_model_prefix: "النموذج:",
        steps_1_t: "الفحص الفني",
        steps_1_s: "المؤشرات والمستويات والتذبذب",
        steps_2_t: "التعرّف على الأنماط",
        steps_2_s: "الاتجاهات والأشكال والشموع",
        steps_3_t: "النمذجة الرياضية",
        steps_3_s: "الاحتمالات وإدارة المخاطر",
        steps_4_t: "توليد الإشارة",
        steps_4_s: "الدمج والتطبيع",
        steps_5_t: "التحقق المتقاطع",
        steps_5_s: "الاتساق والتحكم بالأخطاء",

        dir_buy: "شراء",
        dir_sell: "بيع",
        k_conf: "الثقة",
        k_acc: "الدقة",
        k_market: "السوق",
        k_strength: "القوة",
        k_volume: "الحجم",
        k_time: "الوقت",
        k_valid: "صالحة حتى",
        v_strength_high: "قوي",
        v_strength_medium: "متوسط",
        v_vol_low: "منخفض",
        v_vol_medium: "متوسط",
        v_vol_high: "مرتفع",
        v_market_otc: "OTC",
        v_dash: "—",
        btn_repeat: "إعادة",
        btn_reset: "إعادة ضبط",

        faq_title: "الأسئلة الشائعة",
        faq_q1: "ما هي إشارة الذكاء الاصطناعي؟",
        faq_a1: "إشارة يولدها الذكاء الاصطناعي اعتمادًا على تحليل السوق.",
        faq_q2: "لماذا حالة VIP؟",
        faq_a2: "VIP يسرّع التحليل ويحسّن جودة الإشارات ويمنح أدوات إضافية.",
        faq_q3: "ما هو وقت الانتهاء؟",
        faq_a3: "الوقت الذي تُغلق فيه الصفقة تلقائيًا. اختر ما يناسب استراتيجيتك.",
        faq_q4: "بماذا تختلف النماذج؟",
        faq_a4: "تختلف في الأداء والقدرة الحاسوبية، لذا قد تختلف الإشارات.",
        faq_q5: "هل الإشارات دقيقة؟",
        faq_a5: "تُجمع الإشارات عبر أسواق متعددة لزيادة الموثوقية.",

        cp_title_fiat: "عملات",
        cp_title_crypto: "عملات رقمية",
        cp_title_commod: "سلع",
        cp_title_stocks: "أسهم",
        cp_title_docs: "مؤشرات",
        cp_title_fav: "المفضلة",
        cp_title_search: "بحث",
        cp_search_ph: "بحث",
        cp_fav_only_title: "المفضلة فقط",
        cp_head_market: "السوق",
        cp_empty: "لا توجد نتائج",

        ex_title: "وقت الانتهاء",
        md_title: "نموذج الذكاء الاصطناعي",
        md_v1: "NeuralEdge V1",
        md_v2: "NeuralEdge V2",
        md_vip_note: "لـ VIP فقط",

        vip_sheet_title: "احصل على وصول VIP",
        vip_close_aria: "إغلاق",
        vip_hero_badge: "وصول حصري",
        vip_hero_h4: "دقة أعلى. أسواق أكثر. مخاطرة أقل.",
        vip_hero_sub: "VIP يفتح النموذج المتقدم وإشارات ذات أولوية وأدوات مخاطر.",
        vip_compare_free: "أساسي",
        vip_compare_vip: "VIP",
        vip_free_list: [
            "نموذج NeuralEdge V1",
            "دقة متوسطة للإشارات",
            "أسواق قياسية",
            "سجل إشارات محدود",
            "تحليل السوق كل 40 ثانية",
            "عوائد حتى 80٪"
        ],
        vip_paid_list: [
            "نموذج NeuralEdge V2",
            "أطر زمنية حتى H4",
            "أسواق موسعة: أسهم/عملات رقمية/مؤشرات",
            "إشارات أولوية ووصول مبكر",
            "تفاصيل: قوة/حجم/ممرات احتمالية",
            "سجل عميق ومفضلات",
            "تحليل السوق كل 1.2 ثانية",
            "عوائد حتى 170٪"
        ],
        vip_h3: "ماذا يقدم VIP",
        vip_feat_1_t: "+ حتى ‎12% ↑ دقة",
        vip_feat_1_s: "بفضل التجميع ومعايرة الاحتمالات.",
        vip_feat_2_t: "تسليم ذو أولوية",
        vip_feat_2_s: "يصل الإشارة إلى VIP أولًا.",
        vip_feat_3_t: "أدلة المخاطر",
        vip_feat_3_s: "حجم/انتهاء تكيفي حسب التذبذب.",
        vip_feat_4_t: "أسواق موسعة",
        vip_feat_4_s: "حِزم للأسهم والمؤشرات والعملات الرقمية.",
        vip_how_h4: "كيف تحصل على VIP",
        vip_how_p: "واصل التداول على PocketOption. تُمنح VIP تلقائيًا حسب حجم التداول."
    },

// ===== RO =====
    ro: {
        app_title: "Pocket Signals",
        header_become_vip: "Devino VIP",
        lang_select_aria: "Selectează limba",
        hero_title: "Tranzacționează cu AI",
        hero_sub: "Semnale inteligente pentru tranzacționare profitabilă",

        field_pair_label: "Pereche valutară",
        field_pair_ph: "Alege perechea",
        field_expiry_label: "Timp de expirare",
        field_expiry_ph: "Alege timpul",
        field_model_label: "Model AI",
        field_model_ph: "Alege modelul",
        btn_get_signal: "Obține semnal",

        signal_title: "Semnal",
        signal_model_prefix: "Model:",
        steps_1_t: "Screening tehnic",
        steps_1_s: "Indicatori, niveluri, volatilitate",
        steps_2_t: "Recunoaștere de patternuri",
        steps_2_s: "Trenduri, figuri, lumânări",
        steps_3_t: "Modelare matematică",
        steps_3_s: "Probabilități și managementul riscului",
        steps_4_t: "Generare de semnal",
        steps_4_s: "Agregare și normalizare",
        steps_5_t: "Validare încrucișată",
        steps_5_s: "Consistență și controlul erorilor",

        dir_buy: "CUMPĂRARE",
        dir_sell: "VÂNZARE",
        k_conf: "ÎNCREDERE",
        k_acc: "ACURATEȚE",
        k_market: "PIAȚĂ",
        k_strength: "PUTERE",
        k_volume: "VOLUM",
        k_time: "ORA",
        k_valid: "VALID PÂNĂ LA",
        v_strength_high: "Puternic",
        v_strength_medium: "Mediu",
        v_vol_low: "Scăzut",
        v_vol_medium: "Mediu",
        v_vol_high: "Ridicat",
        v_market_otc: "OTC",
        v_dash: "—",
        btn_repeat: "Repetă",
        btn_reset: "Reset",

        faq_title: "Întrebări frecvente",
        faq_q1: "Ce este un semnal AI?",
        faq_a1: "Un semnal generat de inteligența artificială pe baza analizei pieței.",
        faq_q2: "De ce statutul VIP?",
        faq_a2: "VIP accelerează analiza, îmbunătățește calitatea semnalelor și deblochează instrumente suplimentare.",
        faq_q3: "Ce este timpul de expirare?",
        faq_a3: "Momentul când tranzacția se închide automat. Alege ce se potrivește strategiei tale.",
        faq_q4: "Cum diferă modelele?",
        faq_a4: "Diferă ca performanță și putere de calcul; pot oferi semnale diferite.",
        faq_q5: "Sunt semnalele precise?",
        faq_a5: "Semnalele sunt agregate pe multe piețe pentru robustețe sporită.",

        cp_title_fiat: "Valute",
        cp_title_crypto: "Cripto",
        cp_title_commod: "Mărfuri",
        cp_title_stocks: "Acțiuni",
        cp_title_docs: "Indici",
        cp_title_fav: "Favorite",
        cp_title_search: "Căutare",
        cp_search_ph: "Căutare",
        cp_fav_only_title: "Doar favorite",
        cp_head_market: "Piață",
        cp_empty: "Nicio potrivire",

        ex_title: "Timp de expirare",
        md_title: "Model AI",
        md_v1: "NeuralEdge V1",
        md_v2: "NeuralEdge V2",
        md_vip_note: "Doar VIP",

        vip_sheet_title: "Obține acces VIP",
        vip_close_aria: "Închide",
        vip_hero_badge: "Acces exclusiv",
        vip_hero_h4: "Mai multă acuratețe. Mai multe piețe. Mai puțin risc.",
        vip_hero_sub: "VIP deblochează modelul avansat, semnale prioritare și instrumente de risc.",
        vip_compare_free: "Basic",
        vip_compare_vip: "VIP",
        vip_free_list: [
            "Model NeuralEdge V1",
            "Acuratețe medie a semnalelor",
            "Piețe standard",
            "Istoric limitat al semnalelor",
            "Analiză a pieței la fiecare 40 s",
            "Plăți până la 80%"
        ],
        vip_paid_list: [
            "Model NeuralEdge V2",
            "Frame-uri de timp până la H4",
            "Piețe extinse: acțiuni/cripto/indici",
            "Semnale prioritare și acces timpuriu",
            "Detalii: putere/volum/coridoare de probabilitate",
            "Istoric profund și favorite",
            "Analiză a pieței la fiecare 1,2 s",
            "Plăți până la 170%"
        ],
        vip_h3: "Ce oferă VIP",
        vip_feat_1_t: "+ până la 12% ↑ acuratețe",
        vip_feat_1_s: "prin ansambluri și calibrare de probabilitate.",
        vip_feat_2_t: "Livrare prioritară",
        vip_feat_2_s: "VIP primește semnalul primul.",
        vip_feat_3_t: "Ghiduri de risc",
        vip_feat_3_s: "lot/expirare adaptate la volatilitate.",
        vip_feat_4_t: "Piețe extinse",
        vip_feat_4_s: "pachete pentru acțiuni, indici și cripto.",
        vip_how_h4: "Cum obții VIP",
        vip_how_p: "Continuă să tranzacționezi pe PocketOption. VIP se acordă automat în funcție de rulaj."
    },

};
// из-за объёма, словари ES/FR/HI/AR/RO идентичны тем, что я прислал на предыдущем шаге.
// Вставь их целиком. Если нужно — пришлю отдельно чистым блоком.

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

    // Header
    const vipText = document.getElementById("vipText");
    if (vipText) vipText.textContent = t("header_become_vip");

    document.querySelector("#langMenu")?.setAttribute("aria-label", t("lang_select_aria"));

    // Hero
    document.querySelector(".main-heading h1")?.replaceChildren(t("hero_title"));
    document.querySelector(".main-heading p")?.replaceChildren(t("hero_sub"));

    // Form labels & placeholders
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

    // Signal card
    document.querySelector(".signal-title span")?.replaceChildren(t("signal_title"));
    const modelPrefix = document.querySelector(".signal-model");
    if (modelPrefix) {
        const curModel = document.getElementById("selectedModel")?.textContent?.trim() || I18N.en.md_v1;
        modelPrefix.replaceChildren(`${t("signal_model_prefix")} `, (()=>{ const s=document.createElement("span"); s.id="selectedModel"; s.textContent=curModel; return s; })());
    }

    // Steps
    const steps = Array.from(document.querySelectorAll("#sigSteps .sig-step"));
    const stepKeys = [
        ["steps_1_t","steps_1_s"],
        ["steps_2_t","steps_2_s"],
        ["steps_3_t","steps_3_s"],
        ["steps_4_t","steps_4_s"],
        ["steps_5_t","steps_5_s"],
    ];
    steps.forEach((li, i)=>{
        const b = li.querySelector("b"); const sub = li.querySelector(".sub");
        if (b)   b.textContent = t(stepKeys[i][0]);
        if (sub) sub.textContent = t(stepKeys[i][1]);
    });

    // Result keys (left column)
    const rows = Array.from(document.querySelectorAll(".rg2-list .row"));
    const kOrder = ["k_market","k_strength","k_volume","k_time","k_valid"];
    rows.forEach((row, idx)=>{
        const k = row.querySelector(".k");
        if (!k) return;
        k.textContent = t(kOrder[idx]);
    });
    // buttons
    const rep = document.getElementById("sigRepeat");
    const rst = document.getElementById("sigReset");
    if (rep) rep.textContent = t("btn_repeat");
    if (rst) rst.textContent = t("btn_reset");

    // FAQ
    const faqTitle = document.querySelector(".faq-title");
    if (faqTitle) faqTitle.textContent = t("faq_title");
    const faqItems = Array.from(document.querySelectorAll(".faq-item"));
    const qKeys = ["faq_q1","faq_q2","faq_q3","faq_q4","faq_q5"];
    const aKeys = ["faq_a1","faq_a2","faq_a3","faq_a4","faq_a5"];
    faqItems.forEach((it, i)=>{
        it.querySelector(".faq-question span")?.replaceChildren(t(qKeys[i]));
        it.querySelector(".faq-answer")?.replaceChildren(t(aKeys[i]));
    });

    // Pair popup
    const cpTabs = document.querySelectorAll("#cpTabs .cp-tab");
    const tabMap = ["cp_title_fiat","cp_title_crypto","cp_title_commod","cp_title_stocks","cp_title_docs"];
    cpTabs.forEach((btn, i)=>{ btn.title = t(tabMap[i]); });
    document.getElementById("cpSearch")?.setAttribute("placeholder", t("cp_search_ph"));
    document.getElementById("cpFavOnly")?.setAttribute("title", t("cp_fav_only_title"));
    document.getElementById("cpLeftTitle")?.replaceChildren(t("cp_title_fiat"));

    // Expiry
    document.querySelector("#exPopup .ex-title")?.replaceChildren(t("ex_title"));

    // Model
    document.querySelector("#mdPopup .md-title")?.replaceChildren(t("md_title"));

    // VIP
    document.getElementById("vipTitle")?.replaceChildren(t("vip_sheet_title"));
    document.querySelector('.vip-close')?.setAttribute("aria-label", t("vip_close_aria"));
    document.querySelector(".vip-badge")?.replaceChildren(t("vip_hero_badge"));
    document.querySelector(".vip-hero h4")?.replaceChildren(t("vip_hero_h4"));
    document.querySelector(".vip-sub")?.replaceChildren(t("vip_hero_sub"));
    const vipCards = document.querySelectorAll(".vip-card-title");
    if (vipCards[0]) vipCards[0].textContent = t("vip_compare_free");
    if (vipCards[1]) vipCards[1].textContent = t("vip_compare_vip");
    const freeUl = document.querySelector(".vip-card.free ul");
    const vipUl  = document.querySelector(".vip-card.vip ul");
    if (freeUl) freeUl.innerHTML = (t("vip_free_list")||[]).map(it=>`<li>${it}</li>`).join("");
    if (vipUl)  vipUl.innerHTML  = (t("vip_paid_list")||[]).map(it=>`<li>${it}</li>`).join("");
    document.querySelector(".vip-h3")?.replaceChildren(t("vip_h3"));
    const feats = document.querySelectorAll(".vip-feature");
    const ft = ["vip_feat_1_t","vip_feat_2_t","vip_feat_3_t","vip_feat_4_t"];
    const fs = ["vip_feat_1_s","vip_feat_2_s","vip_feat_3_s","vip_feat_4_s"];
    feats.forEach((f, i)=>{
        f.querySelector(".vf-title")?.replaceChildren(t(ft[i]));
        f.querySelector(".vf-sub")?.replaceChildren(t(fs[i]));
    });
    document.querySelector(".vip-how h4")?.replaceChildren(t("vip_how_h4"));
    document.querySelector(".vip-how .vip-how-text")?.replaceChildren(t("vip_how_p"));
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
        btn.setAttribute("role","option");
        btn.setAttribute("aria-selected", String(code === CURRENT_LANG));
        btn.addEventListener("click", () => {
            setCurrentLang(code);
            langMenu.classList.remove("open");
            langWrap?.classList.remove("open");
            langBtn?.setAttribute("aria-expanded","false");
        });
        li.appendChild(btn);
        langMenu.appendChild(li);
    });
}

langBtn?.addEventListener("click", () => {
    const isOpen = langMenu?.classList.contains("open");
    langMenu?.classList.toggle("open", !isOpen);
    langWrap?.classList.toggle("open", !isOpen);
    langBtn?.setAttribute("aria-expanded", String(!isOpen));
});

document.addEventListener("click", (e) => {
    if (!langWrap || !langMenu) return;
    if (!langWrap.contains(e.target)) {
        langMenu.classList.remove("open");
        langWrap.classList.remove("open");
        langBtn?.setAttribute("aria-expanded","false");
    }
});

// Init language (default EN)
renderLangMenu();
setCurrentLang(localStorage.getItem(LANG_KEY) || "en");

// =============================
// Direction icons (inline SVG)
// =============================
const SELL_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
  <title>Download-loop SVG Icon</title>
  <g stroke="#ff0000" stroke-linecap="round" stroke-linejoin="round" stroke-width="2">
    <path fill="none" stroke-dasharray="14" stroke-dashoffset="14" d="M6 19h12">
      <animate fill="freeze" attributeName="stroke-dashoffset" dur="0.4s" values="14;0"/>
    </path>
    <path fill="#ff0000" d="M12 4 h2 v6 h2.5 L12 14.5M12 4 h-2 v6 h-2.5 L12 14.5">
      <animate attributeName="d" calcMode="linear" dur="1.5s" keyTimes="0;0.7;1" repeatCount="indefinite"
               values="M12 4 h2 v6 h2.5 L12 14.5M12 4 h-2 v6 h-2.5 L12 14.5;
                       M12 4 h2 v3 h2.5 L12 11.5M12 4 h-2 v3 h-2.5 L12 11.5;
                       M12 4 h2 v6 h2.5 L12 14.5M12 4 h-2 v6 h-2.5 L12 14.5"/>
    </path>
  </g>
</svg>`;

const BUY_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
  <title>Upload-loop SVG Icon</title>
  <g stroke="#32ac41" stroke-linecap="round" stroke-linejoin="round" stroke-width="2">
    <path fill="none" stroke-dasharray="14" stroke-dashoffset="14" d="M6 19h12">
      <animate fill="freeze" attributeName="stroke-dashoffset" dur="0.4s" values="14;0"/>
    </path>
    <path fill="#32ac41" d="M12 15 h2 v-6 h2.5 L12 4.5M12 15 h-2 v-6 h-2.5 L12 4.5">
      <animate attributeName="d" calcMode="linear" dur="1.5s" keyTimes="0;0.7;1" repeatCount="indefinite"
               values="M12 15 h2 v-6 h2.5 L12 4.5M12 15 h-2 v-6 h-2.5 L12 4.5;
                       M12 15 h2 v-3 h2.5 L12 7.5M12 15 h-2 v-3 h-2.5 L12 7.5;
                       M12 15 h2 v-6 h2.5 L12 4.5M12 15 h-2 v-6 h-2.5 L12 4.5"/>
    </path>
  </g>
</svg>`;

// Restore form/result on load
restoreState();
restoreResult();

// ===============================
// Currency Pair Popup
// ===============================
(function(){
    const DATA = {
        fiat: [
            {id:"AUD_CAD_OTC",name:"AUD/CAD OTC",market:"OTC"},
            {id:"EUR_CHF_OTC",name:"EUR/CHF OTC",market:"OTC"},
            {id:"EUR_USD_OTC",name:"EUR/USD OTC",market:"OTC"},
            {id:"GBP_AUD_OTC",name:"GBP/AUD OTC",market:"OTC"},
            {id:"LBP_USD_OTC",name:"LBP/USD OTC",market:"OTC"},
            {id:"NZD_JPY_OTC",name:"NZD/JPY OTC",market:"OTC"},
            {id:"OMR_CNY_OTC",name:"OMR/CNY OTC",market:"OTC"},
            {id:"USD_BDT_OTC",name:"USD/BDT OTC",market:"OTC"},
            {id:"USD_CNH_OTC",name:"USD/CNH OTC",market:"OTC"},
            {id:"USD_COP_OTC",name:"USD/COP OTC",market:"OTC"},
            {id:"USD_IDR_OTC",name:"USD/IDR OTC",market:"OTC"},
            {id:"USD_INR_OTC",name:"USD/INR OTC",market:"OTC"},
            {id:"USD_PHP_OTC",name:"USD/PHP OTC",market:"OTC"},
            {id:"USD_VND_OTC",name:"USD/VND OTC",market:"OTC"},
            {id:"ZAR_USD_OTC",name:"ZAR/USD OTC",market:"OTC"},
            {id:"EUR_HUF_OTC",name:"EUR/HUF OTC",market:"OTC"},
            {id:"EUR_USD",name:"EUR/USD",market:""},
            {id:"NGN_USD_OTC",name:"NGN/USD OTC",market:"OTC"},
            {id:"USD_CLP_OTC",name:"USD/CLP OTC",market:"OTC"},
            {id:"AUD_USD_OTC",name:"AUD/USD OTC",market:"OTC"},
            {id:"EUR_NZD_OTC",name:"EUR/NZD OTC",market:"OTC"},
            {id:"YER_USD_OTC",name:"YER/USD OTC",market:"OTC"},
            {id:"AED_CNY_OTC",name:"AED/CNY OTC",market:"OTC"},
            {id:"AUD_USD",name:"AUD/USD",market:""},
            {id:"GBP_CAD",name:"GBP/CAD",market:""},
            {id:"USD_EGP_OTC",name:"USD/EGP OTC",market:"OTC"},
            {id:"AUD_CAD",name:"AUD/CAD",market:""},
            {id:"CAD_CHF",name:"CAD/CHF",market:""},
            {id:"EUR_CAD",name:"EUR/CAD",market:""},
            {id:"EUR_CHF",name:"EUR/CHF",market:""},
            {id:"EUR_GBP_OTC",name:"EUR/GBP OTC",market:"OTC"},
            {id:"GBP_USD",name:"GBP/USD",market:""},
            {id:"USD_JPY",name:"USD/JPY",market:""},
            {id:"EUR_JPY_OTC",name:"EUR/JPY OTC",market:"OTC"},
            {id:"AUD_CHF",name:"AUD/CHF",market:""},
            {id:"AUD_JPY_OTC",name:"AUD/JPY OTC",market:"OTC"},
            {id:"GBP_JPY",name:"GBP/JPY",market:""},
            {id:"GBP_USD_OTC",name:"GBP/USD OTC",market:"OTC"},
            {id:"USD_SGD_OTC",name:"USD/SGD OTC",market:"OTC"},
            {id:"EUR_TRY_OTC",name:"EUR/TRY OTC",market:"OTC"},
            {id:"USD_MXN_OTC",name:"USD/MXN OTC",market:"OTC"},
            {id:"CHF_JPY",name:"CHF/JPY",market:""},
            {id:"UAH_USD_OTC",name:"UAH/USD OTC",market:"OTC"},
            {id:"GBP_AUD",name:"GBP/AUD",market:""},
            {id:"JOD_CNY_OTC",name:"JOD/CNY OTC",market:"OTC"},
            {id:"EUR_AUD",name:"EUR/AUD",market:""},
            {id:"CAD_CHF_OTC",name:"CAD/CHF OTC",market:"OTC"},
            {id:"CAD_JPY",name:"CAD/JPY",market:""},
            {id:"EUR_RUB_OTC",name:"EUR/RUB OTC",market:"OTC"},
            {id:"QAR_CNY_OTC",name:"QAR/CNY OTC",market:"OTC"},
            {id:"USD_DZD_OTC",name:"USD/DZD OTC",market:"OTC"},
            {id:"USD_CHF_OTC",name:"USD/CHF OTC",market:"OTC"},
            {id:"CHF_NOK_OTC",name:"CHF/NOK OTC",market:"OTC"},
            {id:"GBP_JPY_OTC",name:"GBP/JPY OTC",market:"OTC"},
            {id:"AUD_NZD_OTC",name:"AUD/NZD OTC",market:"OTC"},
            {id:"USD_BRL_OTC",name:"USD/BRL OTC",market:"OTC"},
            {id:"USD_ARS_OTC",name:"USD/ARS OTC",market:"OTC"},
            {id:"AUD_CHF_OTC",name:"AUD/CHF OTC",market:"OTC"},
            {id:"SAR_CNY_OTC",name:"SAR/CNY OTC",market:"OTC"},
            {id:"CHF_JPY_OTC",name:"CHF/JPY OTC",market:"OTC"},
            {id:"USD_CHF",name:"USD/CHF",market:""},
            {id:"EUR_JPY",name:"EUR/JPY",market:""},
            {id:"MAD_USD_OTC",name:"MAD/USD OTC",market:"OTC"},
            {id:"NZD_USD_OTC",name:"NZD/USD OTC",market:"OTC"},
            {id:"AUD_JPY",name:"AUD/JPY",market:""},
            {id:"USD_JPY_OTC",name:"USD/JPY OTC",market:"OTC"},
            {id:"USD_MYR_OTC",name:"USD/MYR OTC",market:"OTC"},
            {id:"EUR_GBP",name:"EUR/GBP",market:""},
            {id:"KES_USD_OTC",name:"KES/USD OTC",market:"OTC"},
            {id:"USD_RUB_OTC",name:"USD/RUB OTC",market:"OTC"},
            {id:"BHD_CNY_OTC",name:"BHD/CNY OTC",market:"OTC"},
            {id:"USD_CAD",name:"USD/CAD",market:""},
            {id:"USD_PKR_OTC",name:"USD/PKR OTC",market:"OTC"},
            {id:"USD_THB_OTC",name:"USD/THB OTC",market:"OTC"},
            {id:"GBP_CHF",name:"GBP/CHF",market:""},
            {id:"TND_USD_OTC",name:"TND/USD OTC",market:"OTC"},
            {id:"CAD_JPY_OTC",name:"CAD/JPY OTC",market:"OTC"},
            {id:"USD_CAD_OTC",name:"USD/CAD OTC",market:"OTC"}
        ],
        crypto: [
            {id:"Avalanche_OTC",name:"Avalanche OTC",market:"OTC"},
            {id:"Bitcoin_ETF_OTC",name:"Bitcoin ETF OTC",market:"OTC"},
            {id:"BNB_OTC",name:"BNB OTC",market:"OTC"},
            {id:"Bitcoin_OTC",name:"Bitcoin OTC",market:"OTC"},
            {id:"Dogecoin_OTC",name:"Dogecoin OTC",market:"OTC"},
            {id:"Solana_OTC",name:"Solana OTC",market:"OTC"},
            {id:"TRON_OTC",name:"TRON OTC",market:"OTC"},
            {id:"Polkadot_OTC",name:"Polkadot OTC",market:"OTC"},
            {id:"Cardano_OTC",name:"Cardano OTC",market:"OTC"},
            {id:"Polygon_OTC",name:"Polygon OTC",market:"OTC"},
            {id:"Ethereum_OTC",name:"Ethereum OTC",market:"OTC"},
            {id:"Litecoin_OTC",name:"Litecoin OTC",market:"OTC"},
            {id:"Toncoin_OTC",name:"Toncoin OTC",market:"OTC"},
            {id:"Chainlink_OTC",name:"Chainlink OTC",market:"OTC"},
            {id:"Bitcoin",name:"Bitcoin",market:""},
            {id:"Ethereum",name:"Ethereum",market:""},
            {id:"Dash",name:"Dash",market:""},
            {id:"BCH_EUR",name:"BCH/EUR",market:""},
            {id:"BCH_GBP",name:"BCH/GBP",market:""},
            {id:"BCH_JPY",name:"BCH/JPY",market:""},
            {id:"BTC_GBP",name:"BTC/GBP",market:""},
            {id:"BTC_JPY",name:"BTC/JPY",market:""},
            {id:"Chainlink",name:"Chainlink",market:""}
        ],
        commod: [
            {id:"Brent_Oil_OTC",name:"Brent Oil OTC",market:"OTC"},
            {id:"WTI_Crude_Oil_OTC",name:"WTI Crude Oil OTC",market:"OTC"},
            {id:"Silver_OTC",name:"Silver OTC",market:"OTC"},
            {id:"Gold_OTC",name:"Gold OTC",market:"OTC"},
            {id:"Natural_Gas_OTC",name:"Natural Gas OTC",market:"OTC"},
            {id:"Palladium_spot_OTC",name:"Palladium spot OTC",market:"OTC"},
            {id:"Platinum_spot_OTC",name:"Platinum spot OTC",market:"OTC"},
            {id:"Brent_Oil",name:"Brent Oil",market:""},
            {id:"WTI_Crude_Oil",name:"WTI Crude Oil",market:""},
            {id:"XAG_EUR",name:"XAG/EUR",market:""},
            {id:"Silver",name:"Silver",market:""},
            {id:"XAU_EUR",name:"XAU/EUR",market:""},
            {id:"Gold",name:"Gold",market:""},
            {id:"Natural_Gas",name:"Natural Gas",market:""},
            {id:"Palladium_spot",name:"Palladium spot",market:""},
            {id:"Platinum_spot",name:"Platinum spot",market:""}
        ],
        stocks: [
            {id:"American_Express_OTC",name:"American Express OTC",market:"OTC"},
            {id:"Microsoft_OTC",name:"Microsoft OTC",market:"OTC"},
            {id:"Amazon_OTC",name:"Amazon OTC",market:"OTC"},
            {id:"FedEx_OTC",name:"FedEx OTC",market:"OTC"},
            {id:"Intel_OTC",name:"Intel OTC",market:"OTC"},
            {id:"FACEBOOK_INC_OTC",name:"FACEBOOK INC OTC",market:"OTC"},
            {id:"GameStop_Corp_OTC",name:"GameStop Corp OTC",market:"OTC"},
            {id:"Marathon_Digital_Holdings_OTC",name:"Marathon Digital Holdings OTC",market:"OTC"},
            {id:"Johnson_Johnson_OTC",name:"Johnson & Johnson OTC",market:"OTC"},
            {id:"McDonalds_OTC",name:"McDonald's OTC",market:"OTC"},
            {id:"Apple_OTC",name:"Apple OTC",market:"OTC"},
            {id:"Citigroup_Inc_OTC",name:"Citigroup Inc OTC",market:"OTC"},
            {id:"Tesla_OTC",name:"Tesla OTC",market:"OTC"},
            {id:"AMD_OTC",name:"Advanced Micro Devices OTC",market:"OTC"},
            {id:"ExxonMobil_OTC",name:"ExxonMobil OTC",market:"OTC"},
            {id:"Palantir_Technologies_OTC",name:"Palantir Technologies OTC",market:"OTC"},
            {id:"Alibaba_OTC",name:"Alibaba OTC",market:"OTC"},
            {id:"VISA_OTC",name:"VISA OTC",market:"OTC"},
            {id:"Boeing_Company_OTC",name:"Boeing Company OTC",market:"OTC"},
            {id:"Pfizer_Inc_OTC",name:"Pfizer Inc OTC",market:"OTC"},
            {id:"Netflix_OTC",name:"Netflix OTC",market:"OTC"},
            {id:"VIX_OTC",name:"VIX OTC",market:"OTC"},
            {id:"Cisco_OTC",name:"Cisco OTC",market:"OTC"},
            {id:"Coinbase_Global_OTC",name:"Coinbase Global OTC",market:"OTC"},
            {id:"Apple",name:"Apple",market:""},
            {id:"American_Express",name:"American Express",market:""},
            {id:"Boeing_Company",name:"Boeing Company",market:""},
            {id:"FACEBOOK_INC",name:"FACEBOOK INC",market:""},
            {id:"Johnson_Johnson",name:"Johnson & Johnson",market:""},
            {id:"JPMorgan",name:"JPMorgan Chase & Co",market:""},
            {id:"McDonalds",name:"McDonald's",market:""},
            {id:"Microsoft",name:"Microsoft",market:""},
            {id:"Pfizer_Inc",name:"Pfizer Inc",market:""},
            {id:"Tesla",name:"Tesla",market:""},
            {id:"Alibaba",name:"Alibaba",market:""},
            {id:"Citigroup_Inc",name:"Citigroup Inc",market:""},
            {id:"Netflix",name:"Netflix",market:""},
            {id:"Cisco",name:"Cisco",market:""},
            {id:"ExxonMobil",name:"ExxonMobil",market:""},
            {id:"Intel",name:"Intel",market:""}
        ],
        docs: [
            {id:"AUS_200_OTC",name:"AUS 200 OTC",market:"OTC"},
            {id:"100GBP_OTC",name:"100GBP OTC",market:"OTC"},
            {id:"CAC_40",name:"CAC 40",market:""},
            {id:"D30EUR_OTC",name:"D30EUR OTC",market:"OTC"},
            {id:"E35EUR",name:"E35EUR",market:""},
            {id:"E35EUR_OTC",name:"E35EUR OTC",market:"OTC"},
            {id:"E50EUR_OTC",name:"E50EUR OTC",market:"OTC"},
            {id:"F40EUR_OTC",name:"F40EUR OTC",market:"OTC"},
            {id:"US100",name:"US100",market:""},
            {id:"SMI_20",name:"SMI 20",market:""},
            {id:"SP500",name:"SP500",market:""},
            {id:"SP500_OTC",name:"SP500 OTC",market:"OTC"},
            {id:"100GBP",name:"100GBP",market:""},
            {id:"AEX_25",name:"AEX 25",market:""},
            {id:"D30_EUR",name:"D30/EUR",market:""},
            {id:"DJI30",name:"DJI30",market:""},
            {id:"DJI30_OTC",name:"DJI30 OTC",market:"OTC"},
            {id:"E50_EUR",name:"E50/EUR",market:""},
            {id:"F40_EUR",name:"F40/EUR",market:""},
            {id:"HONG_KONG_33",name:"HONG KONG 33",market:""},
            {id:"JPN225",name:"JPN225",market:""},
            {id:"JPN225_OTC",name:"JPN225 OTC",market:"OTC"},
            {id:"US100_OTC",name:"US100 OTC",market:"OTC"},
            {id:"AUS_200",name:"AUS 200",market:""}
        ]
    };

    const CP_TAB_TITLES = {
        fiat: "cp_title_fiat",
        crypto: "cp_title_crypto",
        commod: "cp_title_commod",
        stocks: "cp_title_stocks",
        docs: "cp_title_docs",
        fav: "cp_title_fav",
        search: "cp_title_search"
    };

    const favKey = "pair_favorites_v1";
    const favSet = new Set(JSON.parse(localStorage.getItem(favKey) || "[]"));

    let currentTab = "fiat";
    let favOnly = false;
    let query = "";

    const overlay     = document.getElementById("cpPopup");
    const list        = document.getElementById("cpList");
    const leftTitle   = document.getElementById("cpLeftTitle");
    const searchInput = document.getElementById("cpSearch");
    const favOnlyBtn  = document.getElementById("cpFavOnly");

    function open(){ overlay.setAttribute("aria-hidden","false"); document.body.style.overflow="hidden"; render(); }
    function close(){ overlay.setAttribute("aria-hidden","true"); document.body.style.overflow=""; }
    function poolAll(){ return [].concat(DATA.fiat||[], DATA.crypto||[], DATA.commod||[], DATA.stocks||[], DATA.docs||[]); }

    function render(){
        const q = query.trim().toLowerCase();
        let raw;
        if (q) {
            leftTitle.textContent = t("cp_title_search");
            favOnlyBtn.style.display = "none";
            raw = poolAll().filter(x => x.name.toLowerCase().includes(q));
        } else if (currentTab === "fav") {
            leftTitle.textContent = t("cp_title_fav");
            favOnlyBtn.style.display = "none";
            raw = poolAll().filter(x => favSet.has(x.id));
        } else {
            leftTitle.textContent = t(CP_TAB_TITLES[currentTab]) || "—";
            favOnlyBtn.style.display = "";
            raw = DATA[currentTab] || [];
        }

        const filtered = raw.filter(item => (currentTab === "fav" || q) ? true : (favOnly ? favSet.has(item.id) : true));

        list.innerHTML = filtered.map(it => `
      <div class="cp-item" data-id="${it.id}">
        <div class="cp-title">
          <img class="cp-star" data-star data-id="${it.id}" src="images/icons/StarFilled.svg" alt="★" style="opacity:${favSet.has(it.id)?1:.25}" />
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
                const id = row.dataset.id;
                const item = poolAll().find(x=>x.id===id);
                if (!item) return;
                state.pair = item.name;
                const field = document.getElementById("pairField");
                if (field) field.value = item.name;
                checkReady();
                saveState();
                close();
            });
        });
    }

    document.getElementById("cpTabs").addEventListener("click", (e)=>{
        const tab = e.target.closest(".cp-tab");
        if (!tab) return;
        document.querySelectorAll(".cp-tab").forEach(t=>t.setAttribute("aria-selected","false"));
        tab.setAttribute("aria-selected","true");
        currentTab = tab.dataset.tab;
        render();
    });

    // Debounced search
    let _st = 0;
    searchInput.addEventListener("input", ()=>{
        clearTimeout(_st);
        _st = setTimeout(()=>{ query = searchInput.value; render(); }, 100);
    });
    favOnlyBtn.addEventListener("click", ()=>{ favOnly = !favOnly; favOnlyBtn.setAttribute("aria-pressed", String(favOnly)); render(); });
    overlay.addEventListener("click", (e)=>{ if (e.target === overlay) close(); });
    document.addEventListener("keydown", (e)=>{ if (e.key==="Escape" && overlay.getAttribute("aria-hidden")==="false") close(); });

    window.CurrencyPairPopup = { open, close, render };
})();

// =========================
// Expiry Popup
// =========================
(function(){
    const PRESETS = [
        { id:"S5",  label:"S5",  seconds:5 },
        { id:"S15", label:"S15", seconds:15 },
        { id:"S30", label:"S30", seconds:30 },
        { id:"M1",  label:"M1",  seconds:60 },
        { id:"M3",  label:"M3",  seconds:180 },
        { id:"M5",  label:"M5",  seconds:300 },
        { id:"M30", label:"M30", seconds:1800 },
        { id:"H1",  label:"H1",  seconds:3600 },
        { id:"H4",  label:"H4",  seconds:14400 }
    ];

    const overlay = document.getElementById("exPopup");
    const grid    = document.getElementById("exGrid");

    let selectedId = null;

    function open(){
        const field = document.getElementById("timeField");
        const current = (field && field.value) ? field.value : (state.expiry || state.time || null);
        selectedId = current && PRESETS.some(p => p.label === current) ? current : null;

        overlay.setAttribute("aria-hidden","false");
        document.body.style.overflow="hidden";
        render();
    }
    function close(){ overlay.setAttribute("aria-hidden","true"); document.body.style.overflow=""; }

    function render(){
        grid.innerHTML = PRESETS.map(p => `
      <button class="ex-chip" data-id="${p.id}" aria-selected="${p.label===selectedId}">
        ${p.label}
      </button>
    `).join("");

        grid.querySelectorAll(".ex-chip").forEach(btn=>{
            btn.addEventListener("click", ()=>{
                const id = btn.dataset.id;
                const item = PRESETS.find(x=>x.id===id);
                if (!item) return;
                selectedId = item.label;
                setExpiryUI(item);
                close();
            });
        });
    }

    function setExpiryUI(item){
        state.time = item.label;
        state.expiry = item.label;
        state.expirySeconds = item.seconds;

        const targets = [
            document.getElementById("timeField"),
            document.getElementById("expiryField"),
            document.querySelector('[data-field="expiry"]'),
            document.querySelector(".js-expiry"),
            document.querySelector('input[name="expiry"]')
        ].filter(Boolean);

        targets.forEach(el => {
            if ("value" in el) el.value = item.label; else el.textContent = item.label;
            try {
                el.dispatchEvent(new Event("input",  { bubbles: true }));
                el.dispatchEvent(new Event("change", { bubbles: true }));
            } catch(_) {}
        });

        checkReady();
        saveState();
    }

    overlay.addEventListener("click", (e)=>{ if (e.target === overlay) close(); });
    document.addEventListener("keydown", (e)=>{ if (e.key==="Escape" && overlay.getAttribute("aria-hidden")==="false") close(); });

    window.CurrencyExpiryPopup = { open, close };
})();

// ========================
// Model Popup
// ========================
(function(){
    const MODELS = [
        { id: "NE_V1", label: "NeuralEdge V1", disabled: false },
        { id: "NE_V2", label: "NeuralEdge V2", disabled: true, note: "VIP only" }
    ];

    const overlay = document.getElementById("mdPopup");
    const grid    = document.getElementById("mdGrid");

    let selectedId = null;

    function open(){
        const field = document.getElementById("modelField");
        const current = (field && field.value) ? field.value : (state.model || null);
        selectedId = current && MODELS.some(m => m.label === current) ? current : null;

        overlay.setAttribute("aria-hidden","false");
        document.body.style.overflow="hidden";
        render();
    }
    function close(){ overlay.setAttribute("aria-hidden","true"); document.body.style.overflow=""; }

    function render(){
        grid.innerHTML = MODELS.map(m => `
      <button
        class="md-chip${m.disabled ? " is-disabled" : ""}"
        data-id="${m.id}"
        ${m.disabled ? 'aria-disabled="true" disabled' : ""}
        aria-selected="${m.label===selectedId}">
        <span>${m.label}</span>
        ${m.note ? `<span class="md-badge">${m.note}</span>` : ""}
      </button>
    `).join("");

        grid.querySelectorAll(".md-chip").forEach(btn=>{
            btn.addEventListener("click", ()=>{
                const id = btn.dataset.id;
                const item = MODELS.find(x=>x.id===id);
                if (!item || item.disabled) return;
                selectedId = item.label;
                setModelUI(item);
                close();
            });
        });
    }

    function setModelUI(item){
        state.model = item.label;

        const targets = [
            document.getElementById("modelField"),
            document.getElementById("selectedModel"),
            document.querySelector('[data-field="model"]'),
            document.querySelector(".js-model"),
            document.querySelector('input[name="model"]')
        ].filter(Boolean);

        targets.forEach(el => {
            if ("value" in el) el.value = item.label; else el.textContent = item.label;
            try {
                el.dispatchEvent(new Event("input",  { bubbles: true }));
                el.dispatchEvent(new Event("change", { bubbles: true }));
            } catch(_) {}
        });

        checkReady();
        saveState();
    }

    overlay.addEventListener("click", (e)=>{ if (e.target === overlay) close(); });
    document.addEventListener("keydown", (e)=>{ if (e.key==="Escape" && overlay.getAttribute("aria-hidden")==="false") close(); });

    window.CurrencyModelPopup = { open, close };
})();

// ===============================================
// Signal flow (analysis -> result)
// ===============================================
(function(){
    const steps = ["A","B","C","D","E"];

    const list   = document.getElementById("sigSteps");
    const bar    = document.getElementById("sigProgress");
    const viewA  = document.getElementById("sigAnalysis");
    const viewR  = document.getElementById("sigResult");

    const q = (id) => document.getElementById(id);

    // Buttons
    q("getSignalBtn")?.addEventListener("click", start);
    q("sigRepeat")?.addEventListener("click", start);
    q("sigReset")?.addEventListener("click", resetAll);

    function start(){
        const pair  = q("pairField")?.value.trim();
        const time  = q("timeField")?.value.trim();
        const model = q("modelField")?.value.trim();
        if (!pair || !time || !model) return;

        const mSpan = document.getElementById("selectedModel");
        if (mSpan) mSpan.textContent = model;

        const form = document.querySelector(".glass-card");
        if (form) {
            const raise = Math.ceil(form.getBoundingClientRect().height + 16);
            document.body.style.setProperty("--raise", `${raise}px`);
        }

        document.body.classList.add("analysis-open");
        viewR.hidden = true;
        viewA.style.display = "";

        resetSigSteps();
        setSigStepsState(0);

        const totalMs = 3400;
        const perStep = Math.floor(totalMs / steps.length);
        const t0 = performance.now();

        const raf = ()=>{
            const elapsed = performance.now() - t0;
            const p = Math.min(1, elapsed / totalMs);
            const idx = Math.min(steps.length-1, Math.floor(elapsed / perStep));
            setSigStepsState(idx);

            if (p >= 1){
                setSigStepsState(_sigSteps.length);
                if (_sigBar) _sigBar.style.width = "100%";
                showResult(pair, time);
            } else {
                requestAnimationFrame(raf);
            }
        };
        requestAnimationFrame(raf);
    }

    function showResult(pair, time){
        // demo data
        const dir  = Math.random() < 0.5 ? "DOWN" : "UP";
        const conf = rand(72, 96);
        const acc  = rand(40, 88);

        const strengthCode = (Math.random() < 0.65 ? "High" : "Medium");
        const volCode = ["Low","Medium","High"][rand(0,2)];

        const market = /OTC/i.test(pair) ? "OTC" : "—";

        let valid = t("v_dash");
        try{
            const secs = state.expirySeconds;
            if (secs) {
                const d = new Date(Date.now() + secs*1000);
                valid = d.toLocaleTimeString([], {hour:"2-digit", minute:"2-digit"});
            }
        }catch(_){}

        // direction + icon
        const dirEl = document.getElementById("sigDirection");
        const isBuy = dir === "UP";
        if (dirEl) {
            dirEl.textContent = i18nFormatDirection(isBuy);
            dirEl.classList.toggle("buy",  isBuy);
            dirEl.classList.toggle("sell", !isBuy);
        }
        const iconBox = document.getElementById("sigDirIcon");
        if (iconBox) iconBox.innerHTML = isBuy ? BUY_SVG : SELL_SVG;

        // values (localized)
        document.getElementById("sigMarket").textContent   = i18nMarketOTC(market==="OTC");
        document.getElementById("sigConf").textContent     = conf + "%";
        document.getElementById("sigTime").textContent     = time;
        document.getElementById("sigStrength").textContent = i18nFormatStrength(strengthCode);
        document.getElementById("sigPair").textContent     = pair;
        document.getElementById("sigValid").textContent    = valid;
        document.getElementById("sigAcc").textContent      = acc + "%";
        document.getElementById("sigVol").textContent      = i18nFormatVolume(volCode);

        // show result
        document.getElementById("sigAnalysis").style.display = "none";
        document.getElementById("sigResult").hidden = false;

        // save for restore
        saveResult({
            isBuy,
            pair,
            conf: conf + "%",
            acc:  acc  + "%",
            market,
            strCode: strengthCode,
            volCode,
            time,
            valid
        });
    }

    function resetAll(){
        document.body.classList.remove("analysis-open");
        document.body.style.removeProperty("--raise");

        if (viewA) viewA.style.display = "";
        if (viewR) viewR.hidden = true;

        resetSigSteps();

        const clear = id => { const el = q(id); if (el) el.value=""; };
        clear("pairField"); clear("timeField"); clear("modelField");

        state.pair = null;
        state.time = null;
        state.expiry = null;
        state.expirySeconds = null;
        state.model = null;

        try { localStorage.removeItem(STATE_KEY); } catch(_) {}
        try { localStorage.removeItem(RESULT_KEY); } catch(_) {}

        const iconBox = document.getElementById("sigDirIcon");
        if (iconBox) iconBox.innerHTML = "";

        checkReady();
    }

    function rand(a,b){ return Math.floor(a + Math.random()*(b-a+1)); }
})();

// ===============================================
// Analysis steps — classes & progress
// ===============================================
const _sigSteps = Array.from(document.querySelectorAll("#sigSteps .sig-step"));
const _sigBar   = document.getElementById("sigProgress");

function setSigStepsState(currentIndex){
    _sigSteps.forEach((el, i)=>{
        el.classList.remove("is-done","is-active","is-next");
        if(i < currentIndex){ el.classList.add("is-done"); }
        else if(i === currentIndex){ el.classList.add("is-active"); }
        else { el.classList.add("is-next"); }
    });
    if(_sigBar){
        const ratio = Math.min(1, currentIndex / _sigSteps.length);
        const jitter = Math.random()*1.2;
        _sigBar.style.width = Math.min(100, ratio*100 + jitter) + "%";
    }
}

function resetSigSteps(){
    _sigSteps.forEach(el=>el.classList.remove("is-done","is-active","is-next"));
    if(_sigSteps.length){ _sigSteps[0].classList.add("is-active"); }
    if(_sigBar){ _sigBar.style.width = "0%"; }
}

// =============================
// Apply i18n after DOM ready
// =============================
document.addEventListener("DOMContentLoaded", () => {
    applyI18nToDOM();
    // Patch restore (in case saved RU/… strings existed from older version)
    try {
        const raw = localStorage.getItem(RESULT_KEY);
        if (raw) restoreResult();
    } catch(_) {}
});
