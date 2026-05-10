/*
 * state.js - Application State Variables & DOM Elements
 * 应用状态变量与DOM元素引用
 * NOTE: This must be loaded after the DOM is ready (or wrapped in DOMContentLoaded)
 */
// ============================================================
// 📦 应用数据扩展注册表
// ============================================================
window.APP_DATA_REGISTRY = [
    { id: 'messages', name: '聊天记录', icon: 'fa-comments', core: true, backup: true, 
      getValue: () => (typeof DB_GATEWAY !== 'undefined' ? DB_GATEWAY.get('chatMessages') : null) || [], 
      setValue: (v) => { if(typeof DB_GATEWAY !== 'undefined') DB_GATEWAY.set('chatMessages', v); }, 
      onImport: (d) => { if(typeof messages !== 'undefined') messages = d.map(m => ({...m, timestamp: new Date(m.timestamp)})); } 
    },
    { id: 'settings', name: '外观与设置', icon: 'fa-sliders-h', core: true, backup: true, 
      getValue: () => (typeof DB_GATEWAY !== 'undefined' ? DB_GATEWAY.get('chatSettings') : null) || {}, 
      setValue: (v) => { if(typeof DB_GATEWAY !== 'undefined') DB_GATEWAY.set('chatSettings', v); }, 
      onImport: (d) => { if(typeof settings !== 'undefined') Object.assign(settings, d); } 
    },
    { id: 'anniversaries', name: '重要日', icon: 'fa-heart', backup: true, 
      getValue: () => (typeof DB_GATEWAY !== 'undefined' ? DB_GATEWAY.get('anniversaries') : null) || [], 
      setValue: (v) => { if(typeof DB_GATEWAY !== 'undefined') DB_GATEWAY.set('anniversaries', v); } 
    },
    { id: 'calendarEvents', name: '心情与日程', icon: 'fa-calendar-alt', backup: true, 
      getValue: () => (typeof DB_GATEWAY !== 'undefined' ? DB_GATEWAY.get('calendarEvents') : null) || [], 
      setValue: (v) => { if(typeof DB_GATEWAY !== 'undefined') DB_GATEWAY.set('calendarEvents', v); } 
    },
    { id: 'periodRecords', name: '月经周期记录', icon: 'fa-calendar-check', backup: true, 
      getValue: () => (typeof DB_GATEWAY !== 'undefined' ? DB_GATEWAY.get('periodRecords') : null) || [], 
      setValue: (v) => { if(typeof DB_GATEWAY !== 'undefined') DB_GATEWAY.set('periodRecords', v); } 
    },
    { id: 'periodSettings', name: '月经设置', icon: 'fa-cog', backup: true, 
      getValue: () => (typeof DB_GATEWAY !== 'undefined' ? DB_GATEWAY.get('periodSettings') : null) || {}, 
      setValue: (v) => { if(typeof DB_GATEWAY !== 'undefined') DB_GATEWAY.set('periodSettings', v); } 
    },
    { id: 'envelopeData', name: '留言板', icon: 'fa-solid fa-thumbtack', backup: true, 
      getValue: () => (typeof DB_GATEWAY !== 'undefined' ? (DB_GATEWAY.get('boardDataV2') || DB_GATEWAY.get('envelopeData')) : null) || {}, 
      setValue: (v) => { if (typeof window.setBoardDataV2 === 'function') window.setBoardDataV2(v); } 
    },
    { id: 'diviHistory', name: '占卜记录', icon: 'fa-moon', backup: true, 
      //getValue: () => (typeof DB_GATEWAY !== 'undefined' ? DB_GATEWAY.get('diviHistory') : null) || [], 
      getValue: () => getDiviHistory(), 
      setValue: (v) => { if(typeof DB_GATEWAY !== 'undefined') DB_GATEWAY.set('diviHistory', v); } 
    },
    { id: 'wishingPoolData', name: '许愿池', icon: 'fa-star', backup: true, 
      getValue: () => (typeof DB_GATEWAY !== 'undefined' ? DB_GATEWAY.get('wishingPoolData') : null) || [], 
      setValue: (v) => { if(typeof DB_GATEWAY !== 'undefined') DB_GATEWAY.set('wishingPoolData', v); } 
    },
    { id: 'savedBackgrounds', name: '聊天背景图集', icon: 'fa-image', backup: true, 
      getValue: () => (typeof DB_GATEWAY !== 'undefined' ? DB_GATEWAY.getMedia('backgroundGallery') : null) || [], 
      setValue: (v) => { if(typeof DB_GATEWAY !== 'undefined') DB_GATEWAY.setMedia('backgroundGallery', v); } 
    },
    { id: 'customThemes', name: '自定义主题', icon: 'fa-palette', backup: true, 
      getValue: () => (typeof DB_GATEWAY !== 'undefined' ? DB_GATEWAY.get('customThemes') : null) || [], 
      setValue: (v) => { if(typeof DB_GATEWAY !== 'undefined') DB_GATEWAY.set('customThemes', v); } 
    },
    { id: 'themeSchemes', name: '主题方案', icon: 'fa-swatchbook', backup: true, 
      getValue: () => (typeof DB_GATEWAY !== 'undefined' ? DB_GATEWAY.get('themeSchemes') : null) || [], 
      setValue: (v) => { if(typeof DB_GATEWAY !== 'undefined') DB_GATEWAY.set('themeSchemes', v); } 
    },
   /* { id: 'callBgLibrary', name: '通话背景', icon: 'fa-video', backup: true, 
      getValue: () => (typeof DB_GATEWAY !== 'undefined' ? DB_GATEWAY.get('callBgLibrary') : null) || [], 
      setValue: (v) => { if(typeof DB_GATEWAY !== 'undefined') DB_GATEWAY.set('callBgLibrary', v); } 
    }*/
];


// 更新辅助函数
window._getRegVal = (id) => {
    const reg = window.APP_DATA_REGISTRY.find(r => r.id === id);
    return reg?.getValue ? reg.getValue() : null;
};

window._setRegVal = (id, val) => {
    const reg = window.APP_DATA_REGISTRY.find(r => r.id === id);
    if (reg?.setValue) {
        reg.setValue(val);
    } else if (reg?.onImport) {
        reg.onImport(val);
    }
};

let SESSION_ID = null;
let autoSendTimer = null;
let wishingPoolData = []; 
let calendarEvents = [];
var activeCallBg = localStorage.getItem('activeCallBg') || null;
let showPartnerNameInChat = false; 
let readNoReplyTimer = null; 
let isBatchMode = false;
let currentReplyTo = null;
let lastCoinResult = null;
let currentNoteMessageId = null;
let saveTimeout;
let displayedMessageCount = 20;
const HISTORY_BATCH_SIZE = 20;
let isLoadingHistory = false;
let isBatchFavoriteMode = false;
let selectedMessages = [];
let customReplies = [];
let customPokes = [];
let customStatuses = [];
let customMottos = [];
let customIntros = []; 
let currentMajorTab = 'reply'; 
let currentSubTab = 'custom';  
let currentReplyTab = 'custom';
let customEmojis = [];
let anniversaries = [];
let stickerLibrary = []; 
let myStickerLibrary = []; 
let currentAnniversaryType = 'anniversary';
let customThemes = [];
let themeSchemes = []; 
let callBgLibrary = [];
let periodRecords = [];
let lastPeriodReminderCheck = null;
let periodSettings = {
    averageCycleLength: 28,
    lastCalculation: null,
};

const DOMElements = {
    html: document.documentElement,
    chatContainer: document.getElementById('chat-container'),
    messageInput: document.getElementById('message-input'),
    sendBtn: document.getElementById('send-btn'),
    attachmentBtn: document.getElementById('attachment-btn'),
    imageInput: document.getElementById('image-input'),
    themeToggle: document.getElementById('theme-toggle'),
    //batchBtn: document.getElementById('batch-btn'),
    continueBtn: document.getElementById('continue-btn'),
    comboBtn: document.getElementById('combo-btn'),
    coinTossOverlay: document.getElementById('coin-toss-overlay'),
    animatedCoin: document.getElementById('animated-coin'),
    coinResultText: document.getElementById('coin-result-text'),
    cancelCoinResult: document.getElementById('cancel-coin-result'),
    sendCoinResult: document.getElementById('send-coin-result'),
    typingIndicator: document.getElementById('typing-indicator'),
    emptyState: document.getElementById('empty-state'),
    welcomeAnimation: document.getElementById('welcome-animation'),
    shutUpBtn: document.getElementById('shutUpBtn'), // 新增
    replyPreviewContainer: document.getElementById('reply-preview-container'),
    pagination: document.getElementById('pagination'),
    prevPage: document.getElementById('prev-page'),
    nextPage: document.getElementById('next-page'),
    pageInfo: document.getElementById('page-info'),
    editModal: {
        modal: document.getElementById('edit-modal'),
        title: document.getElementById('edit-modal-title'),
        input: document.getElementById('name-input'),
        cancel: document.getElementById('cancel-edit'),
        save: document.getElementById('save-name')
    },
    avatarModal: {
        modal: document.getElementById('avatar-modal'),
        title: document.getElementById('avatar-modal-title'),
        input: document.getElementById('avatar-input'),
        cancel: document.getElementById('cancel-avatar'),
        save: document.getElementById('save-avatar')
    },
    noteModal: {
        modal: document.getElementById('note-modal'),
        input: document.getElementById('note-input'),
        cancel: document.getElementById('cancel-note'),
        save: document.getElementById('save-note')
    },
    settingsModal: {
        modal: document.getElementById('settings-modal'),
        settingsBtn: document.getElementById('settings-btn'),
        cancel: document.getElementById('cancel-settings')
    },
    favoritesModal: {
        modal: document.getElementById('stats-modal'),
        favoritesBtn: document.getElementById('group-chat-btn'),
        list: document.getElementById('favorites-list'),
        cancel: document.getElementById('close-stats')
    },
    statsModal: {
        modal: document.getElementById('stats-modal'),
        content: document.getElementById('stats-content'),
        closeBtn: document.getElementById('close-stats')
    },
    fortuneModal: {
        modal: document.getElementById('fortune-lenormand-modal'),
        content: document.getElementById('fortune-content'),
        shareBtn: document.getElementById('share-fortune'),
        closeBtn: document.getElementById('close-fortune')
    },
    customRepliesModal: {
        modal: document.getElementById('custom-replies-modal'),
        list: document.getElementById('custom-replies-list'),
        addBtn: document.getElementById('add-custom-reply'),
        closeBtn: document.getElementById('close-custom-replies')
    },
    backgroundInput: document.getElementById('background-input'),
    importInput: document.getElementById('import-input'),
    partner: {
        name: document.getElementById('partner-name'),
        avatarContainer: document.getElementById('partner-avatar-container'), 
        avatar: document.getElementById('partner-avatar'),
        status: document.getElementById('partner-status').querySelector('span')
    },
    me: {
        name: document.getElementById('my-name'),
        avatarContainer: document.getElementById('my-avatar-container'), 
        avatar: document.getElementById('my-avatar'),
        statusContainer: document.getElementById('my-status-container'),
        statusText: document.getElementById('my-status-text')
    },
    anniversaryModal: {
        modal: document.getElementById('anniversary-modal'),
        closeBtn: document.getElementById('close-anniversary-modal'),
        saveBtn: document.getElementById('save-ann-btn'),
        addBtn: document.getElementById('open-ann-add-btn'),
        dateInput: document.getElementById('ann-input-date'),
        nameInput: document.getElementById('ann-input-name'),
        displayArea: document.getElementById('anniversary-display'),
        daysElement: document.getElementById('anniversary-days'),
        dateShowElement: document.getElementById('anniversary-date-show'),
        list: document.getElementById('ann-list-container'),
        typeHint: document.getElementById('ann-type-desc')
    },            
    anniversaryAnimation: {
        modal: document.getElementById('anniversary-animation'),
        title: document.getElementById('anniversary-animation-title'),
        days: document.getElementById('anniversary-animation-days'),
        message: document.getElementById('anniversary-animation-message'),
        closeBtn: document.getElementById('close-anniversary-animation')
    },
    appearanceModal: {
        modal: document.getElementById('appearance-modal'),
        closeBtn: document.getElementById('close-appearance')
    },
    chatModal: {
        modal: document.getElementById('chat-modal'),
        closeBtn: document.getElementById('close-chat')
    },
    advancedModal: {
        modal: document.getElementById('advanced-modal'),
        closeBtn: document.getElementById('close-advanced')
    },
    dataModal: {
        modal: document.getElementById('data-modal'),
        closeBtn: document.getElementById('close-data')
    },
    wishingPoolModal: {
        modal: document.getElementById('wishing-pool-modal'),
        grid: document.getElementById('wish-pool-grid'),
        closeBtn: document.getElementById('close-wishing-pool')
    },
    wishEditModal: {
        modal: document.getElementById('wish-edit-modal'),
        title: document.getElementById('wish-edit-title'),
        imgArea: document.getElementById('wish-img-upload-area'),
        imgPreview: document.getElementById('wish-img-preview'),
        imgInput: document.getElementById('wish-img-input'),
        priceInput: document.getElementById('wish-price-input'),
        myNoteInput: document.getElementById('wish-my-note-input'),
        saveBtn: document.getElementById('wish-edit-save'),
        cancelBtn: document.getElementById('wish-edit-cancel')
    },

};

