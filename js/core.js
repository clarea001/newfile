/*
 * core.js - Core Application Logic
 * 核心应用逻辑：数据加载/保存、消息渲染等
 */

function clearAllAppData() {
    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,0.6);backdrop-filter:blur(8px);display:flex;align-items:center;justify-content:center;animation:fadeIn 0.2s ease;';
    overlay.innerHTML = `
        <div style="background:var(--secondary-bg);border-radius:20px;padding:24px;width:88%;max-width:340px;box-shadow:0 20px 60px rgba(0,0,0,0.4);animation:modalContentSlideIn 0.3s ease forwards;">
            <div style="text-align:center;margin-bottom:20px;">
                <div style="width:52px;height:52px;border-radius:50%;background:rgba(255,80,80,0.12);display:flex;align-items:center;justify-content:center;margin:0 auto 12px;">
                    <i class="fas fa-trash-alt" style="color:#ff5050;font-size:20px;"></i>
                </div>
                <div style="font-size:16px;font-weight:700;color:var(--text-primary);margin-bottom:6px;">重置数据</div>
                <div style="font-size:12px;color:var(--text-secondary);">请选择要重置的范围</div>
            </div>
            <div style="display:flex;flex-direction:column;gap:10px;">
                <button id="_reset_current" style="width:100%;padding:12px 16px;border:1px solid var(--border-color);border-radius:12px;background:var(--primary-bg);color:var(--text-primary);font-size:13px;font-weight:600;cursor:pointer;text-align:left;display:flex;align-items:center;gap:10px;transition:all 0.2s;">
                    <i class="fas fa-comment-slash" style="color:var(--accent-color);font-size:15px;width:18px;text-align:center;"></i>
                    <span>仅清除当前会话消息</span>
                </button>
                <button id="_reset_all" style="width:100%;padding:12px 16px;border:1px solid rgba(255,80,80,0.3);border-radius:12px;background:rgba(255,80,80,0.06);color:#ff5050;font-size:13px;font-weight:600;cursor:pointer;text-align:left;display:flex;align-items:center;gap:10px;transition:all 0.2s;">
                    <i class="fas fa-bomb" style="font-size:15px;width:18px;text-align:center;"></i>
                    <span>重置所有数据（完全清空）</span>
                </button>
                <button id="_reset_cancel" style="width:100%;padding:10px 16px;border:none;border-radius:12px;background:none;color:var(--text-secondary);font-size:13px;cursor:pointer;transition:all 0.2s;">取消</button>
            </div>
        </div>`;
    document.body.appendChild(overlay);

    function closeDialog() { overlay.remove(); }
    overlay.addEventListener('click', e => { if (e.target === overlay) closeDialog(); });
    document.getElementById('_reset_cancel').onclick = closeDialog;

    document.getElementById('_reset_current').onclick = () => {
        closeDialog();
        if (confirm('确定要清除当前会话的所有消息吗？此操作无法恢复！')) {
            messages = [];
            throttledSaveData();
            renderMessages();
            showNotification('当前会话消息已清除', 'success');
        }
    };

    document.getElementById('_reset_all').onclick = () => {
        closeDialog();
        if (confirm('【高危操作】确定要重置所有数据吗？此操作将清除所有本地数据且无法恢复！')) {
            window._skipBackup = true;
            messages = [];
            settings = {};
            localforage.clear().then(() => {
                localStorage.clear();
                showNotification('所有数据已重置，页面即将刷新', 'info', 2000);
                setTimeout(() => { window.location.href = window.location.pathname + '?reset=' + Date.now(); }, 2000);
            }).catch(e => {
                window._skipBackup = false;
                showNotification('清除数据时发生错误', 'error');
                console.error("清除 localforage 失败:", e);
            });
        }
    };
}


        function getDefaultSettings() {
            return {
                partnerName: "梦角",
                myName: "我",
                myStatus: "在线",
                partnerStatus: "在线",
                isDarkMode: false,
                colorTheme: "gold",
                soundEnabled: true,
                typingIndicatorEnabled: true,
                readReceiptsEnabled: true,
                replyEnabled: true,
                lastStatusChange: Date.now(),
                nextStatusChange: 1 + Math.random() * 7,
                fontSize: 16,
                bubbleStyle: 'standard',
                messageFontFamily: "'Noto Serif SC', serif",
                messageFontWeight: 400,
                messageLineHeight: 1.5,
                musicPlayerEnabled: false,
                replyDelayMin: 3000,
                replyDelayMax: 7000,
                replyTextMin: 1,
                replyTextMax: 3,
                inChatAvatarEnabled: true,
                inChatAvatarSize: 36,
                inChatAvatarPosition: 'center',
                alwaysShowAvatar: false,
                showPartnerNameInChat: false,
                customFontUrl: "", 
                customBubbleCss: "",
                customGlobalCss: "",
                myAvatarFrame: null, 
                partnerAvatarFrame: null,
                myAvatarShape: 'circle',
                partnerAvatarShape: 'circle',
                autoSendEnabled: false,
                autoSendInterval: 5,
                allowReadNoReply: false, 
                readNoReplyChance: 0.2,
                timeFormat: 'HH:mm',
                customSoundUrl: '',
                soundVolume: 0.15,
                bottomCollapseMode: false,
                emojiMixEnabled: true,
                boardPartnerWriteEnabled: false,
                keepKeyboardAlive: false,
                activeLocalFontId: null,
                bgDisplayMode: 'contain',
            };
        }


        /*function renderBackgroundGallery() {
            const list = document.getElementById('background-gallery-list');
            if (!list) return;

            list.innerHTML = '';

            
            const addBtn = document.createElement('div');
            addBtn.className = 'bg-item bg-add-btn';
            
            addBtn.innerHTML = '<i class="fas fa-plus"></i><span></span>';
            addBtn.onclick = () => document.getElementById('bg-gallery-input').click();
            list.appendChild(addBtn);

            const currentBg = DB_GATEWAY.getMedia('chatBackground');

            savedBackgrounds.forEach((bg, index) => {
                const item = document.createElement('div');
                let isActive = false;

                if (currentBg && currentBg === bg.value) isActive = true;

                item.className = `bg-item ${isActive ? 'active': ''}`;

                if (bg.type === 'image') {
                    item.innerHTML = `<img src="${bg.value}" loading="lazy" alt="bg">`;
                } else {
                    item.innerHTML = `<div class="bg-color-block" style="background: ${bg.value}"></div>`;
                }

                item.onclick = (e) => {
                    if (e.target.closest('.bg-delete-btn')) return;
                    applyBackground(bg.value, settings.bgDisplayMode || 'contain');
                    DB_GATEWAY.setMedia('chatBackground', bg.value);
                    renderBackgroundGallery();
                    showNotification('背景已切换', 'success');
                };

                if (bg.id.startsWith('user-')) {
                    const delBtn = document.createElement('div');
                    delBtn.className = 'bg-delete-btn';
                    delBtn.innerHTML = '<i class="fas fa-trash"></i>';
                    delBtn.title = "删除此背景";
                    delBtn.onclick = (e) => {
                        e.stopPropagation();
                        if (confirm('确定删除这张背景图吗？')) {
                            savedBackgrounds.splice(index, 1);
                            saveBackgroundGallery();

                            if (isActive) {
                                removeBackground(); 
                                renderBackgroundGallery();
                            } else {
                                renderBackgroundGallery();
                            }
                        }
                    };
                    item.appendChild(delBtn);
                }

                list.appendChild(item);
            });
        }*/
       function renderBackgroundGallery() { 
    const list = document.getElementById('background-gallery-list'); 
    if (!list) return; 
    list.innerHTML = ''; 

    const addBtn = document.createElement('div'); 
    addBtn.className = 'bg-item bg-add-btn'; 
    addBtn.innerHTML = '<i class="fas fa-plus"></i><span></span>'; 
    addBtn.onclick = () => document.getElementById('bg-gallery-input').click(); 
    list.appendChild(addBtn); 

    const currentBg = DB_GATEWAY.getMedia('chatBackground'); 
    
    savedBackgrounds.forEach((bg, index) => { 
        const item = document.createElement('div'); 
        
        // 🌟 核心修改：直接按字符串处理，不要再搞对象那套
        const isString = typeof bg === 'string';
        const bgValue = isString ? bg : (bg.value || ''); // 兼容万一还有漏网之鱼
        let isActive = currentBg === bgValue; 

        item.className = `bg-item ${isActive ? 'active': ''}`; 

        // 判断是图片还是纯色：字符串直接判断开头
        const isImage = isString ? bgValue.startsWith('data:') : bg.type === 'image';

        if (isImage) { 
            item.innerHTML = `<img src="${bgValue}" loading="lazy" alt="bg">`; 
        } else { 
            item.innerHTML = `<div class="bg-color-block" style="background: ${bgValue}"></div>`; 
        } 

        item.onclick = (e) => { 
            if (e.target.closest('.bg-delete-btn')) return; 
            applyBackground(bgValue, settings.bgDisplayMode || 'contain'); 
            DB_GATEWAY.setMedia('chatBackground', bgValue); 
            renderBackgroundGallery(); 
            showNotification('背景已切换', 'success'); 
        }; 

        // 🌟 只要是用户自己加的(纯字符串data开头)，都允许删除
        const canDelete = isString ? bgValue.startsWith('data:') : (bg.id && bg.id.startsWith('user-'));
        
        if (canDelete) { 
            const delBtn = document.createElement('div'); 
            delBtn.className = 'bg-delete-btn'; 
            delBtn.innerHTML = '<i class="fas fa-trash"></i>'; 
            delBtn.title = "删除此背景"; 
            delBtn.onclick = (e) => { 
                e.stopPropagation(); 
                if (confirm('确定删除这张背景图吗？')) { 
                    savedBackgrounds.splice(index, 1); 
                    saveBackgroundGallery(); 
                    if (isActive) { 
                        removeBackground(); 
                        renderBackgroundGallery(); 
                    } else { 
                        renderBackgroundGallery(); 
                    } 
                } 
            }; 
            item.appendChild(delBtn); 
        } 
        list.appendChild(item); 
    }); 
}


function saveBackgroundGallery() {
    DB_GATEWAY.setMedia('backgroundGallery', savedBackgrounds);
}

const applyBackground = (value, mode = 'contain') => {
    const layer = document.getElementById('real-bg-layer');
    if (!layer) return;
    
    // 清理旧状态，但不清理 className（由下方统一设置）
    layer.innerHTML = '';
    layer.style.backgroundImage = '';
    layer.style.backgroundColor = 'var(--primary-bg)';
    document.body.classList.remove('with-background');
    
    if (!value || typeof value !== 'string') {
        layer.className = ''; 
        return;
    }

    if (value.startsWith('linear-gradient') || value.startsWith('#') || value.startsWith('rgb')) {
        layer.style.backgroundColor = value;
        layer.className = '';
        return;
    }

    const setBgFromBlob = (blob) => {
        const url = URL.createObjectURL(blob);
        if (mode === 'repeat') {
            layer.style.backgroundImage = `url(${url})`;
            layer.style.backgroundSize = 'auto';
        } else {
            const img = document.createElement('img');
            img.src = url; img.alt = 'bg';
            layer.appendChild(img);
        }
        document.body.classList.add('with-background');
    };

    if (value.startsWith('blob:')) {
        if (mode === 'repeat') { layer.style.backgroundImage = `url(${value})`; layer.style.backgroundSize = 'auto'; }
        else { const img = document.createElement('img'); img.src = value; img.alt = 'bg'; layer.appendChild(img); }
        document.body.classList.add('with-background');
    } else if (value.startsWith('data:')) {
        fetch(value).then(res => res.blob()).then(blob => setBgFromBlob(blob)).catch(() => {
            if (mode === 'repeat') { layer.style.backgroundImage = `url(${value})`; layer.style.backgroundSize = 'auto'; }
            else { const img = document.createElement('img'); img.src = value; img.alt = 'bg'; layer.appendChild(img); }
            document.body.classList.add('with-background');
        });
    } else {
        if (mode === 'repeat') { layer.style.backgroundImage = `url(${value})`; layer.style.backgroundSize = 'auto'; }
        else { const img = document.createElement('img'); img.src = value; img.alt = 'bg'; layer.appendChild(img); }
        document.body.classList.add('with-background');
    }

    // 🔥 核心修复：在最末尾统一赋予模式 class，解决点击不生效的问题
    layer.className = `mode-${mode}`;
};


/*async function loadData() {
    try {
        // 1. 唤醒管家，确保新仓库就绪
        await DB_GATEWAY.init();

        // 2. 恢复默认设置基底
        settings = getDefaultSettings();

        // ================= 新架构读取：直接找管家要 =================
        const savedSettings = DB_GATEWAY.get('chatSettings');
        const savedMessages = DB_GATEWAY.get('chatMessages');
        const savedBgGallery = DB_GATEWAY.getMedia('backgroundGallery');
        const savedCustomReplies = DB_GATEWAY.get('customReplies');
        const savedPokes = DB_GATEWAY.get('customPokes');
        const savedStatuses = DB_GATEWAY.get('customStatuses');
        const savedMottos = DB_GATEWAY.get('customMottos');
        const savedIntros = DB_GATEWAY.get('customIntros');
        const savedAnniversaries = DB_GATEWAY.get('anniversaries');
        const savedStickers = DB_GATEWAY.get('stickerLibrary');
        const savedCustomThemes = DB_GATEWAY.get('customThemes');
        const savedDgCustom = DB_GATEWAY.get('dgCustomData'); // 👈 加这行
        const savedDgPool = DB_GATEWAY.get('dgStatusPool'); // 👈 加这行
        const savedChatBg = DB_GATEWAY.getMedia('chatBackground');
        const partnerAvatarSrc = DB_GATEWAY.getMedia('partnerAvatar');
        const myAvatarSrc = DB_GATEWAY.getMedia('myAvatar');
        const savedShowNameConfig = DB_GATEWAY.get('showPartnerNameInChat');
        const savedThemeSchemes = DB_GATEWAY.get('themeSchemes');
        const savedMyStickers = DB_GATEWAY.getMedia('myStickerLibrary');
        const savedReplyGroups = DB_GATEWAY.get('customReplyGroups');
        const savedCalendarEvents = DB_GATEWAY.get('calendarEvents');
        const savedWishingPool = DB_GATEWAY.get('wishingPoolData');
        const savedCallBgLibrary = DB_GATEWAY.getMedia('callBgLibrary');

        // 兼容重要日背景图：统一从 APP_MEDIA 提取，如果检测到是旧的散装格式，顺手洗成新包
        var annBgs = DB_GATEWAY.getMedia('annHeaderBgs');
        if (!annBgs || !Array.isArray(annBgs)) {
            // 兼容旧散装数据：如果以前存过单独的，这里收编一下
            annBgs = [];
        }
        // 如果外部有老的注入函数，保持兼容喂给它
        if (annBgs.length > 0 && typeof window.setAnniversaryHeaderBg === 'function') {
            annBgs.forEach(function(bg) {
                // 兼容新老格式：新格式是 {id, src}，老格式直接是 Base64 字符串
                const src = (bg && bg.src) ? bg.src : bg;
                if (src) window.setAnniversaryHeaderBg(src);
            });
        }


        // 兼容心情数据：如果新仓库有，直接用
        if (DB_GATEWAY.get('moodData')) {
            window.moodData = DB_GATEWAY.get('moodData');
        }
        // =============================================================
        // 3. 通话背景加载 (直接跟着大部队走，不需要任何洗数据补丁)
        if (savedCallBgLibrary && Array.isArray(savedCallBgLibrary)) {
            callBgLibrary = savedCallBgLibrary;
        }

        activeCallBg = localStorage.getItem('activeCallBg') || null;

        if (savedWishingPool) wishingPoolData = savedWishingPool;
        if (savedCalendarEvents) calendarEvents = savedCalendarEvents;

        // 4. 字卡加载
        if (savedCustomReplies && Array.isArray(savedCustomReplies)) {
            customReplies = savedCustomReplies;
        } else {
            customReplies = [];
        }

        // 6. 消息完整性校验与去重
        if (savedMessages && Array.isArray(savedMessages)) {
            const validMessages = savedMessages.filter(m => m && m.timestamp && (m.text || m.image));
            if (validMessages.length !== savedMessages.length) {
                console.warn(`[loadData] 过滤了 ${savedMessages.length - validMessages.length} 条无效消息`);
            }
            messages = validMessages.map(m => ({ ...m, timestamp: new Date(m.timestamp) }));
            
            const ids = messages.map(m => m.id);
            const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);
            if (duplicates.length > 0) {
                console.warn(`[loadData] 发现 ${duplicates.length} 个重复消息ID`);
                messages = messages.filter((m, index, self) => index === self.findIndex(t => t.id === m.id));
            }
        } else {
            messages = [];
        }

        // 7. 合并设置项
        if (savedSettings) Object.assign(settings, savedSettings);
        if (settings.showPartnerNameInChat !== undefined) {
            showPartnerNameInChat = settings.showPartnerNameInChat;
            document.body.classList.toggle('show-partner-name', showPartnerNameInChat);
        }

        // 8. 应用样式与字体
        try {
            if (settings.useLocalFont || (settings.customFontUrl && settings.customFontUrl.trim())) {
                applyCurrentFont().catch(err => console.warn("字体加载失败", err));
            } else if (settings.messageFontFamily) {
                document.documentElement.style.setProperty('--font-family', settings.messageFontFamily);
                document.documentElement.style.setProperty('--message-font-family', settings.messageFontFamily);
            }
            if (settings.customBubbleCss) applyCustomBubbleCss(settings.customBubbleCss);
            if (settings.customGlobalCss) applyGlobalThemeCss(settings.customGlobalCss);
        } catch(e) {
            console.warn("样式应用失败", e);
        }
        
        // 9. 氛围感配置兜底
        if (savedPokes) customPokes = savedPokes; else customPokes = [...CONSTANTS.POKE_ACTIONS];
        if (savedStatuses) customStatuses = savedStatuses; else customStatuses = [...CONSTANTS.PARTNER_STATUSES];
        if (savedMottos) customMottos = savedMottos; else customMottos = [...CONSTANTS.HEADER_MOTTOS];
        if (savedIntros) customIntros = savedIntros; else customIntros = CONSTANTS.WELCOME_ANIMATIONS.map(a => `${a.line1}|${a.line2}`);

        // 10. 背景图兜底
        if (savedBgGallery) {
            savedBackgrounds = savedBgGallery;
        } else {
            savedBackgrounds = [{ id: 'preset-1', type: 'color', value: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)' }];
        }

        // 11. 其他小项加载
        if (savedReplyGroups) window.customReplyGroups = savedReplyGroups;
        if (savedAnniversaries) anniversaries = savedAnniversaries;
        if (savedStickers) stickerLibrary = savedStickers;
        if (savedMyStickers) {
            myStickerLibrary = savedMyStickers;
            window.myStickerLibrary = savedMyStickers;
        }
        if (savedCustomThemes) {
            customThemes = savedCustomThemes;
            window.customThemes = customThemes; 
            // 如果当前正使用某个自定义主题，强制重新渲染让它生效
            if (settings.colorTheme && settings.colorTheme.startsWith('custom-')) {
                var activeTheme = customThemes.find(t => t.id === settings.colorTheme);
                if (activeTheme && typeof applyTheme === 'function') {
                    applyTheme(activeTheme.colors);
                }
            }
        }
        if (savedThemeSchemes) {
            themeSchemes = savedThemeSchemes;
            window.themeSchemes = themeSchemes;
            // 通知主题方案列表刷新
            if (typeof renderThemeSchemesList === 'function') {
                setTimeout(renderThemeSchemesList, 200);
            }
        }
        // ========== 接管公告模块：从大部队拉取数据，并同步缓存给晨报组件 ==========
        if (savedDgCustom) {
            window._dgCustomData = savedDgCustom;
           // localStorage.setItem('dg_custom_data', JSON.stringify(savedDgCustom));
        }
        if (savedDgPool) {
            window._dgStatusPool = savedDgPool;
            // localStorage.setItem('dg_status_pool', JSON.stringify(savedDgPool));
        }

        // Emoji 单独从新仓库拿
        const savedEmojis = DB_GATEWAY.get('customEmojis');
        if (savedEmojis && Array.isArray(savedEmojis)) customEmojis = savedEmojis;
        // 🔥 核心修复：把搬出来的数据放一份到办公桌(window全局)，不然导出弹窗找不到！
        window.messages = messages;
        window.settings = settings;
        window._customReplies = customReplies;
        window._CONSTANTS = CONSTANTS;
        // === 接管留言板：从大别墅里把留言板数据拿出来，喂给留言板模块 ===
        const savedBoard = DB_GATEWAY.get('boardDataV2') || DB_GATEWAY.get('envelopeData');
        if (savedBoard && typeof window.setBoardDataV2 === 'function') window.setBoardDataV2(savedBoard);
        // 12. 头像与背景应用
        if (DOMElements && DOMElements.partner && DOMElements.me) {
            updateAvatar(DOMElements.partner.avatar, partnerAvatarSrc);
            updateAvatar(DOMElements.me.avatar, myAvatarSrc);
        }
        const currentBgMode = settings.bgDisplayMode || 'contain';
        if (savedChatBg) {
            applyBackground(savedChatBg, currentBgMode);
        }

        // 13. 初始化外部模块数据
        try { await initMoodData(); } catch(e) { console.warn("心情数据加载失败", e); }
        try { await loadEnvelopeData(); } catch(e) { console.warn("留言板数据加载失败", e); }
        try { await initPeriodData(); } catch(e) { console.warn("月经数据加载失败", e); }

        displayedMessageCount = HISTORY_BATCH_SIZE;
        
        setTimeout(() => {
            applyAllAvatarFrames();
            manageAutoSendTimer(); 
            if (typeof checkEnvelopeStatus === 'function') checkEnvelopeStatus();
            updateUI();
        }, 100);

    } catch (e) {
        console.error("LoadData 内部致命错误:", e);
        settings = getDefaultSettings();
        messages = [];
        updateUI();
    }
};*/
async function loadData() {
    try {
        // 1. 唤醒管家，确保新仓库就绪
        await DB_GATEWAY.init();

        // 2. 恢复默认设置基底
        settings = getDefaultSettings();

        // ================= 新架构读取：直接找管家要 =================
        const savedSettings = DB_GATEWAY.get('chatSettings');
        const savedMessages = DB_GATEWAY.get('chatMessages');
        const savedBgGallery = DB_GATEWAY.getMedia('backgroundGallery');
        const savedCustomReplies = DB_GATEWAY.get('customReplies');
        const savedPokes = DB_GATEWAY.get('customPokes');
        const savedStatuses = DB_GATEWAY.get('customStatuses');
        const savedMottos = DB_GATEWAY.get('customMottos');
        const savedIntros = DB_GATEWAY.get('customIntros');
        const savedAnniversaries = DB_GATEWAY.get('anniversaries');
        const savedStickers = DB_GATEWAY.getMedia('stickerLibrary');
        const savedCustomThemes = DB_GATEWAY.get('customThemes');
        const savedDgCustom = DB_GATEWAY.get('dgCustomData');
        const savedDgPool = DB_GATEWAY.get('dgStatusPool');
        const savedChatBg = DB_GATEWAY.getMedia('chatBackground');
        const partnerAvatarSrc = DB_GATEWAY.getMedia('partnerAvatar');
        const myAvatarSrc = DB_GATEWAY.getMedia('myAvatar');
        const savedShowNameConfig = DB_GATEWAY.get('showPartnerNameInChat');
        const savedThemeSchemes = DB_GATEWAY.get('themeSchemes');
        const savedMyStickers = DB_GATEWAY.getMedia('myStickerLibrary');
        const savedReplyGroups = DB_GATEWAY.get('customReplyGroups');
        const savedCalendarEvents = DB_GATEWAY.get('calendarEvents');
        const savedWishingPool = DB_GATEWAY.get('wishingPoolData');
        const savedCallBgLibrary = DB_GATEWAY.getMedia('callBgLibrary');

        // 兼容重要日背景图
        var annBgs = DB_GATEWAY.getMedia('annHeaderBgs');
        if (!annBgs || !Array.isArray(annBgs)) annBgs = [];
        if (annBgs.length > 0 && typeof window.setAnniversaryHeaderBg === 'function') {
            annBgs.forEach(function(bg) {
                const src = (bg && bg.src) ? bg.src : bg;
                if (src) window.setAnniversaryHeaderBg(src);
            });
        }

        if (DB_GATEWAY.get('moodData')) window.moodData = DB_GATEWAY.get('moodData');

        // =============================================================
        // 3. 核心变量赋值：跟大部队完全统一，不要任何私货判断
        callBgLibrary = savedCallBgLibrary || [];
        activeCallBg = localStorage.getItem('activeCallBg') || null;
        wishingPoolData = savedWishingPool || [];
        calendarEvents = savedCalendarEvents || [];
        
        if (savedCustomReplies && Array.isArray(savedCustomReplies)) {
            customReplies = savedCustomReplies;
        } else {
            customReplies = [];
        }

        // 6. 消息完整性校验与去重
        if (savedMessages && Array.isArray(savedMessages)) {
            const validMessages = savedMessages.filter(m => m && m.timestamp && (m.text || m.image));
            if (validMessages.length !== savedMessages.length) {
                console.warn(`[loadData] 过滤了 ${savedMessages.length - validMessages.length} 条无效消息`);
            }
            messages = validMessages.map(m => ({ ...m, timestamp: new Date(m.timestamp) }));
            const ids = messages.map(m => m.id);
            const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);
            if (duplicates.length > 0) {
                console.warn(`[loadData] 发现 ${duplicates.length} 个重复消息ID`);
                messages = messages.filter((m, index, self) => index === self.findIndex(t => t.id === m.id));
            }
        } else {
            messages = [];
        }

        // 7. 合并设置项
        if (savedSettings) Object.assign(settings, savedSettings);
        if (settings.showPartnerNameInChat !== undefined) {
            showPartnerNameInChat = settings.showPartnerNameInChat;
            document.body.classList.toggle('show-partner-name', showPartnerNameInChat);
        }

        // 8. 应用样式与字体
        try {
            if (settings.useLocalFont || (settings.customFontUrl && settings.customFontUrl.trim())) {
                applyCurrentFont().catch(err => console.warn("字体加载失败", err));
            } else if (settings.messageFontFamily) {
                document.documentElement.style.setProperty('--font-family', settings.messageFontFamily);
                document.documentElement.style.setProperty('--message-font-family', settings.messageFontFamily);
            }
            if (settings.customBubbleCss) applyCustomBubbleCss(settings.customBubbleCss);
            if (settings.customGlobalCss) applyGlobalThemeCss(settings.customGlobalCss);
        } catch(e) { console.warn("样式应用失败", e); }

        // 9. 氛围感配置兜底
        if (savedPokes) customPokes = savedPokes;
        else customPokes = [...CONSTANTS.POKE_ACTIONS];
        if (savedStatuses) customStatuses = savedStatuses;
        else customStatuses = [...CONSTANTS.PARTNER_STATUSES];
        if (savedMottos) customMottos = savedMottos;
        else customMottos = [...CONSTANTS.HEADER_MOTTOS];
        if (savedIntros) customIntros = savedIntros;
        else customIntros = CONSTANTS.WELCOME_ANIMATIONS.map(a => `${a.line1}|${a.line2}`);

        // 10. 背景图兜底
        if (savedBgGallery) {
            savedBackgrounds = savedBgGallery;
        } else {
            savedBackgrounds = [{ id: 'preset-1', type: 'color', value: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)' }];
        }

        // 11. 其他小项加载 (核心：彻底统一赋值逻辑)
        if (savedReplyGroups) window.customReplyGroups = savedReplyGroups;
        if (savedAnniversaries) anniversaries = savedAnniversaries;
        
        stickerLibrary = savedStickers || [];
        myStickerLibrary = savedMyStickers || [];
        window.myStickerLibrary = myStickerLibrary;
        
        if (savedCustomThemes) {
            customThemes = savedCustomThemes;
            window.customThemes = customThemes;
            if (settings.colorTheme && settings.colorTheme.startsWith('custom-')) {
                var activeTheme = customThemes.find(t => t.id === settings.colorTheme);
                if (activeTheme && typeof applyTheme === 'function') applyTheme(activeTheme.colors);
            }
        }
        if (savedThemeSchemes) {
            themeSchemes = savedThemeSchemes;
            window.themeSchemes = themeSchemes;
            if (typeof renderThemeSchemesList === 'function') setTimeout(renderThemeSchemesList, 200);
        }

        if (savedDgCustom) window._dgCustomData = savedDgCustom;
        if (savedDgPool) window._dgStatusPool = savedDgPool;

        const savedEmojis = DB_GATEWAY.get('customEmojis');
        if (savedEmojis && Array.isArray(savedEmojis)) customEmojis = savedEmojis;

        window.messages = messages;
        window.settings = settings;
        window._customReplies = customReplies;
        window._CONSTANTS = CONSTANTS;

        const savedBoard = DB_GATEWAY.get('boardDataV2') || DB_GATEWAY.get('envelopeData');
        if (savedBoard && typeof window.setBoardDataV2 === 'function') window.setBoardDataV2(savedBoard);

        // 12. 头像与背景应用
        if (DOMElements && DOMElements.partner && DOMElements.me) {
            updateAvatar(DOMElements.partner.avatar, partnerAvatarSrc);
            updateAvatar(DOMElements.me.avatar, myAvatarSrc);
        }
        const currentBgMode = settings.bgDisplayMode || 'contain';
        if (savedChatBg) applyBackground(savedChatBg, currentBgMode);

        // 13. 初始化外部模块数据
        try { await initMoodData(); } catch(e) { console.warn("心情数据加载失败", e); }
        try { await loadEnvelopeData(); } catch(e) { console.warn("留言板数据加载失败", e); }
        try { await initPeriodData(); } catch(e) { console.warn("月经数据加载失败", e); }

        displayedMessageCount = HISTORY_BATCH_SIZE;
        setTimeout(() => {
            applyAllAvatarFrames();
            manageAutoSendTimer();
            if (typeof checkEnvelopeStatus === 'function') checkEnvelopeStatus();
            updateUI();
        }, 100);

    } catch (e) {
        console.error("LoadData 内部致命错误:", e);
        settings = getDefaultSettings();
        messages = [];
        updateUI();
    }
}

const LIBRARY_CONFIG = {
    reply: {
        title: "回复库管理",
        tabs: [
            { id: 'custom', name: '主字卡', mode: 'list' },
            { id: 'emojis', name: 'Emoji', mode: 'grid' },
            { id: 'stickers', name: '表情库', mode: 'grid' },
           // { id: 'period', name: '月经关怀', mode: 'list' },
            { id: 'pokes', name: '拍一拍', mode: 'list' },
        ]
    },
    atmosphere: {
        title: "氛围感配置",
        tabs: [   
            { id: 'statuses', name: '对方状态', mode: 'list' },
            { id: 'mottos', name: '顶部格言', mode: 'list' },
            { id: 'intros', name: '开场动画', mode: 'list' },
            { id: 'callbg', name: '通话背景', mode: 'grid' }
        ]
    },
    announcement: {
        title: "公告管理",
        tabs: []
    },
};
let currentAnnType = 'anniversary'; 

window.openMyStickerSettings = function() {
    const picker = document.getElementById('user-sticker-picker');
    if (picker) picker.classList.remove('active');
    if (typeof currentMajorTab !== 'undefined') {
        currentMajorTab = 'reply';
        currentSubTab = 'stickers';
    }
    var sidebarBtns = document.querySelectorAll('.sidebar-btn');
    sidebarBtns.forEach(function(b) { b.classList.toggle('active', b.dataset.major === 'reply'); });
    if (typeof renderReplyLibrary === 'function') renderReplyLibrary();
    var modal = document.getElementById('custom-replies-modal');
    if (modal && typeof showModal === 'function') showModal(modal);
};

window.switchAnnType = function(type) {
    currentAnnType = type;
    currentAnniversaryType = type; 
    document.querySelectorAll('.ann-type-btn').forEach(btn => {
        if (btn.dataset.type === type) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
    
    const desc = document.getElementById('ann-type-desc');
    if(desc) {
        desc.textContent = type === 'anniversary' 
            ? '计算从过去某一天到现在已经过了多少天 (例如: 相识、恋爱)' 
            : '计算从现在到未来某一天还剩下多少天 (例如: 生日、跨年)';
    }
};

window.deleteAnniversaryItem = function(id) {
    if(confirm("确定要删除这条记录吗？")) {
        anniversaries = anniversaries.filter(a => a.id !== id);
        throttledSaveData(); 
        renderAnniversariesList();
        showNotification('已删除', 'success');
    }
};

        function _tryRecoverFromBackup() {
            try {
                const raw = localStorage.getItem(_BACKUP_PREFIX + 'critical');
                if (!raw) return null;
                return JSON.parse(raw);
            } catch (e) {
                return null;
            }
        }

    async function saveData() {
       /* if (!SESSION_ID) {
            console.warn('[saveData] SESSION_ID 尚未初始化，跳过保存');
            return;
        }*/

        try {
            // 1. 将文字配置交给新网关的 APP_DATA 仓库
            DB_GATEWAY.set('chatSettings', settings);
            DB_GATEWAY.set('chatMessages', messages);
            DB_GATEWAY.set('customReplies', customReplies);
            DB_GATEWAY.set('customReplyGroups', window.customReplyGroups || []);
            DB_GATEWAY.set('customEmojis', customEmojis);
            DB_GATEWAY.set('anniversaries', anniversaries);
            DB_GATEWAY.set('customPokes', customPokes);
            DB_GATEWAY.set('customStatuses', customStatuses);
            DB_GATEWAY.set('customMottos', customMottos);
            DB_GATEWAY.set('customIntros', customIntros);
            DB_GATEWAY.setMedia('stickerLibrary', stickerLibrary);
            DB_GATEWAY.setMedia('myStickerLibrary', myStickerLibrary);
            DB_GATEWAY.set('customThemes', customThemes);
            DB_GATEWAY.set('themeSchemes', themeSchemes);
            DB_GATEWAY.set('calendarEvents', calendarEvents);
            DB_GATEWAY.set('wishingPoolData', wishingPoolData);
            DB_GATEWAY.setMedia('callBgLibrary', callBgLibrary);
            if (window.moodData) DB_GATEWAY.set('moodData', window.moodData);
            // ========== 托管公告模块：直接从内存收编进大部队 ==========
            if (window._dgCustomData) DB_GATEWAY.set('dgCustomData', window._dgCustomData);
            if (window._dgStatusPool) DB_GATEWAY.set('dgStatusPool', window._dgStatusPool);

            if (typeof window.boardDataV2 !== 'undefined') DB_GATEWAY.set('envelopeData', window.boardDataV2);

            // 2. 将图片类数据交给新网关的 APP_MEDIA 仓库
            try {
                const partnerImg = DOMElements.partner.avatar.querySelector('img');
                if (partnerImg) DB_GATEWAY.setMedia('partnerAvatar', partnerImg.src);
            } catch(e) {}
            try {
                const myImg = DOMElements.me.avatar.querySelector('img');
                if (myImg) DB_GATEWAY.setMedia('myAvatar', myImg.src);
            } catch(e) {}
            // 通话背景走媒体柜
            // === 接管留言板：每次保存时，把留言板的最新数据一起塞进大别墅 ===
            if (typeof window.boardDataV2 !== 'undefined') DB_GATEWAY.set('boardDataV2', window.boardDataV2);

            // 3. 旧备份机制保留（防止意外）
           // _backupCriticalData();
            
        } catch (e) {
            console.error('[saveData] 保存失败:', e);
            showNotification('数据保存失败，请检查存储空间', 'error');
        }
    }


        function initializeRandomUI() {
            const getRandomItem = (arr) => arr[Math.floor(Math.random() * arr.length)];


            document.querySelector('.header-motto').textContent = getRandomItem(CONSTANTS.HEADER_MOTTOS);
            if (customMottos && customMottos.length > 0) {
                document.querySelector('.header-motto').textContent = getRandomItem(customMottos);
            } else {
                document.querySelector('.header-motto').textContent = '';
            }
            const placeholder = "";
            DOMElements.messageInput.placeholder = placeholder.length > 20 ? placeholder.substring(0, 20) + "...": placeholder;


            const starsContainer = document.getElementById('stars-container');
            starsContainer.innerHTML = '';
            const starCount = 80;
            for (let i = 0; i < starCount; i++) {
                const star = document.createElement('div');
                star.className = 'star';
                const x = Math.random() * 100;
                const y = Math.random() * 100;
                const size = Math.random() * 2.5 + 0.5;
                const duration = Math.random() * 4 + 2;
                const delay = Math.random() * 6;
                star.style.left = `${x}%`;
                star.style.top = `${y}%`;
                star.style.width = `${size}px`;
                star.style.height = `${size}px`;
                star.style.setProperty('--duration', `${duration}s`);
                star.style.animationDelay = `${delay}s`;
                starsContainer.appendChild(star);
            }
            const particlesContainer = document.getElementById('welcome-particles');
            if (particlesContainer) {
                particlesContainer.innerHTML = '';
                const types = ['petal', 'petal', 'petal', 'sparkle', 'sparkle'];
                for (let i = 0; i < 22; i++) {
                    const p = document.createElement('div');
                    const type = types[i % types.length];
                    p.className = `wp ${type}`;
                    const sz = type === 'petal' ? (Math.random() * 6 + 5) : (Math.random() * 4 + 2);
                    p.style.setProperty('--pSz', sz + 'px');
                    p.style.left = (Math.random() * 100) + '%';
                    p.style.setProperty('--pDur', (Math.random() * 10 + 9) + 's');
                    p.style.setProperty('--pDel', (Math.random() * 8) + 's');
                    p.style.setProperty('--pX1', (Math.random() * 50 - 25) + 'px');
                    p.style.setProperty('--pX2', (Math.random() * 80 - 40) + 'px');
                    p.style.setProperty('--pX3', (Math.random() * 50 - 25) + 'px');
                    particlesContainer.appendChild(p);
                }
            }

            const meteorsContainer = document.getElementById('welcome-meteors');
            if (meteorsContainer) {
                meteorsContainer.innerHTML = '';
                let meteorCount = 0;
                const MAX_METEORS = 12;
                const createMeteor = () => {
                    if (meteorCount >= MAX_METEORS) return;
                    meteorCount++;
                    const m = document.createElement('div');
                    m.className = 'meteor';
                    m.style.left = (Math.random() * 100) + '%';
                    m.style.top = (Math.random() * 35) + '%';
                    const dur = (Math.random() * 0.8 + 0.7);
                    m.style.setProperty('--mDur', dur + 's');
                    m.style.setProperty('--mDel', '0s');
                    m.style.setProperty('--mRot', (25 + Math.random() * 20) + 'deg');
                    meteorsContainer.appendChild(m);
                    setTimeout(() => { m.remove(); meteorCount = Math.max(0, meteorCount - 1); }, (dur + 0.1) * 1000);
                };
                for (let i = 0; i < 8; i++) setTimeout(createMeteor, i * 350);
                const meteorTimer = setInterval(createMeteor, 600);
                setTimeout(() => clearInterval(meteorTimer), 5000);
            }

            const loaderBarEl = document.getElementById('loader-tech-bar');
            if (loaderBarEl) {
                setTimeout(() => loaderBarEl.classList.add('pulsing'), 300);
            }


            const welcomeIcon = getRandomItem(CONSTANTS.WELCOME_ICONS);
            document.querySelector('.logo-icon-main').innerHTML = `<i class="${welcomeIcon}"></i>`;

            if (customIntros && customIntros.length > 0) {
                const rawIntro = getRandomItem(customIntros);
                const parts = rawIntro.split('|');
                const line1 = parts[0];
                const line2 = parts[1] || ""; 

                const titleEl = document.getElementById('welcome-title-glitch');
                const subEl = document.getElementById('welcome-subtitle-scramble');

                titleEl.classList.remove('playing');
                titleEl.textContent = line1;
                void titleEl.offsetWidth;
                titleEl.classList.add('playing');

                const scrambleText = (element, finalText, duration = 1500) => {
                            const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()';
                            const length = finalText.length;
                            let start = Date.now();

                            const interval = setInterval(() => {
                                const now = Date.now();
                                const progress = (now - start) / duration;

                                if (progress >= 1) {
                                    element.textContent = finalText;
                                    clearInterval(interval);
                                    return;
                                }

                                let result = '';

                                const revealIndex = Math.floor(progress * length);

                                for (let i = 0; i < length; i++) {
                                    if (i <= revealIndex) {
                                        result += finalText[i];
                                    } else {

                                        result += chars[Math.floor(Math.random() * chars.length)];
                                    }
                                }
                                element.textContent = result;
                            },
                                40);
                        };


                    setTimeout(() => {
                    scrambleText(subEl, line2, 2000);
                }, 600);
            } else {
                document.getElementById('welcome-title-glitch').textContent = "传讯";
                document.getElementById('welcome-subtitle-scramble').textContent = "请在设置中添加开场动画";
            }


            const loaderBar = document.getElementById('loader-tech-bar');
            const statusText = document.getElementById('loader-status-text');
            loaderBar.style.width = '0%';
            const loadingPhases = [
                { width: '15%', text: 'INITIALIZING · 初始化中' },
                { width: '40%', text: 'LOADING MEMORIES · 读取记忆' },
                { width: '70%', text: 'BUILDING WORLD · 构建世界' },
                { width: '90%', text: 'ALMOST THERE · 即将完成' },
                { width: '100%', text: 'CONNECTED · 连接成功' }
            ];
            const delays = [100, 700, 1600, 2400, 2900];
            delays.forEach((delay, i) => {
                setTimeout(() => {
                    loaderBar.style.width = loadingPhases[i].width;
                    if (statusText) statusText.textContent = loadingPhases[i].text;
                }, delay);
            });
        }


        function manageAutoSendTimer() {
            if (autoSendTimer) {
                clearInterval(autoSendTimer);
                autoSendTimer = null;
            }
            if (settings.autoSendEnabled) {
                const safeInterval = Number(settings.autoSendInterval);
                
                // 👇 关键：如果用户没填或者填的不是数字，直接弹窗提醒他，并关掉开关
                if (isNaN(safeInterval) || safeInterval <= 0) {
                    showNotification('请先在设置里填写正确的主动发送时间（分钟）', 'error');
                    settings.autoSendEnabled = false;
                    if(typeof updateUI === 'function') updateUI(); // 刷新开关状态
                    return; 
                }
                
                console.log(`[主动发送] 已启动，间隔：${safeInterval} 分钟`);
                const intervalMs = safeInterval * 60 * 1000;
                
                autoSendTimer = setInterval(() => {
                    if (!document.body.classList.contains('batch-favorite-mode')) {
                        console.log('[主动发送] 触发回复');
                        simulateReply();
                    }
                }, intervalMs);
            } else {
                console.log('[主动发送] 功能已关闭');
            }
        }

        const updateUI = () => {
            const isCustomTheme = settings.colorTheme.startsWith('custom-');
            if (isCustomTheme) {
                const themeId = settings.colorTheme;
                const theme = customThemes.find(t => t.id === themeId);
                if (theme) {
                    applyTheme(theme.colors);
                } else {
                    DOMElements.html.setAttribute('data-color-theme', 'gold');
                }
            } else {
                DOMElements.html.setAttribute('data-color-theme', settings.colorTheme);
                applyTheme(null, true);
            }
            
            if (settings.customThemeColors && Object.keys(settings.customThemeColors).length > 0) {
                for (const [variable, value] of Object.entries(settings.customThemeColors)) {
                    document.documentElement.style.setProperty(variable, value);
                }
            }

            DOMElements.html.setAttribute('data-theme', settings.isDarkMode ? 'dark': 'light');
            // 主题切换按钮已移到外观设置中
            const themeToggleBtn = document.getElementById('theme-toggle');
            if (themeToggleBtn) {
                themeToggleBtn.innerHTML = settings.isDarkMode ? '<i class="fas fa-sun"></i>': '<i class="fas fa-moon"></i>';
            }

            DOMElements.partner.name.textContent = settings.partnerName;
            DOMElements.me.name.textContent = settings.myName;
            var displayStatus = settings.partnerStatus;
            if (customStatuses && customStatuses.length > 0 && (displayStatus === '在线' || !displayStatus)) {
                displayStatus = customStatuses[Math.floor(Math.random() * customStatuses.length)];
                settings.partnerStatus = displayStatus;
            }
            DOMElements.partner.status.textContent = displayStatus;
            DOMElements.me.statusText.textContent = settings.myStatus;
            if (typeof window.updateDynamicNames === 'function') window.updateDynamicNames();
            document.documentElement.style.setProperty('--font-size', `${settings.fontSize}px`);
            
            const fontToUse = settings.messageFontFamily || "'Noto Serif SC', serif";
            
            document.documentElement.style.setProperty('--message-font-family', fontToUse);
            document.documentElement.style.setProperty('--font-family', fontToUse);
            document.documentElement.style.setProperty('--message-font-weight', settings.messageFontWeight);
            document.documentElement.style.setProperty('--message-line-height', settings.messageLineHeight);

            document.documentElement.style.setProperty('--in-chat-avatar-size', `${settings.inChatAvatarSize}px`);
            const _alignMap = { 'top': 'flex-start', 'center': 'center', 'bottom': 'flex-end', 'custom': 'flex-start' };
            document.documentElement.style.setProperty('--avatar-align', _alignMap[settings.inChatAvatarPosition || 'center'] || 'center');
            if (settings.inChatAvatarPosition === 'custom' && settings.inChatAvatarCustomOffset !== undefined) {
                document.documentElement.style.setProperty('--avatar-custom-offset', settings.inChatAvatarCustomOffset + 'px');
            }
            document.body.classList.toggle('always-show-avatar', !!settings.alwaysShowAvatar);
            if (typeof _applyCollapseState === 'function') _applyCollapseState(!!settings.bottomCollapseMode);
            document.body.classList.toggle('show-partner-name', !!(settings.showPartnerNameInChat || showPartnerNameInChat));

            document.querySelectorAll('.theme-color-btn').forEach(btn => {
                btn.classList.toggle('active', btn.dataset.theme === settings.colorTheme);
            });


            document.querySelectorAll('[data-bubble-style]').forEach(item => {
                item.classList.toggle('active', item.dataset.bubbleStyle === settings.bubbleStyle);
            });

            // Sync setting pill toggles
            const _pillSyncMap = {
                '#reply-toggle': 'replyEnabled',
                '#sound-toggle': 'soundEnabled',
                '#read-receipts-toggle': 'readReceiptsEnabled',
                '#typing-indicator-toggle': 'typingIndicatorEnabled',
                '#read-no-reply-toggle': 'allowReadNoReply',
                '#emoji-mix-toggle': 'emojiMixEnabled',
                '#enter-send-toggle': 'enterToSendEnabled',
                '#auto-send-toggle': 'autoSendEnabled',
                '#keep-keyboard-alive-toggle': 'keepKeyboardAlive', // 🌟【加上这一行】
            };
            for (const [sel, prop] of Object.entries(_pillSyncMap)) {
                const el = document.querySelector(sel);
                if (el) {
                    const val = prop === 'emojiMixEnabled' ? (settings[prop] !== false) : !!settings[prop];
                    el.classList.toggle('active', val);
                }
            }
            const _immToggle = document.getElementById('immersive-toggle');
            if (_immToggle) _immToggle.classList.toggle('active', document.body.classList.contains('immersive-mode'));

            renderMessages();

        };

        const updateAvatar = (element, src) => {
            if (src) element.innerHTML = `<img src="${src}" alt="avatar">`; else element.innerHTML = `<i class="fas fa-user"></i>`;
        };
        const removeBackground = () => {
            const layer = document.getElementById('real-bg-layer');
            if (layer) {
                layer.innerHTML = '';
                layer.className = '';
                layer.style.backgroundImage = '';
                layer.style.backgroundColor = 'var(--primary-bg)';
            }
            document.body.classList.remove('with-background');
            localforage.removeItem(getStorageKey('chatBackground'));
            safeRemoveItem(getStorageKey('chatBackground'));
            showNotification('背景图片已移除', 'success');
        };



        window.scrollToQuotedMessage = function(el) {
            if (!el) return;
            const replyId = el.dataset.replyId;
            if (!replyId) return;

            const container = document.getElementById('chat-container');
            if (!container) return;

            // 找到被引用的原消息
            const targetMsg = container.querySelector(`.message-wrapper[data-id="${replyId}"]`);
            if (!targetMsg) {
                showNotification('找不到原消息(可能已被删除)', 'warning', 1500);
                return;
            }

            // 1. 先加个高亮背景，让人知道定位到了哪条
            targetMsg.style.transition = 'background 0.3s';
            targetMsg.style.background = 'rgba(var(--accent-color-rgb), 0.15)';
            
            // 2. 使用数学计算精准滚动，绝对不触发页面重排，杜绝闪烁！
            const targetTop = targetMsg.offsetTop - container.offsetTop;
            const targetScroll = targetTop - (container.clientHeight / 2) + (targetMsg.clientHeight / 2);
            
            // 加个平滑滚动动画
            container.scrollTo({
                top: Math.max(0, targetScroll),
                behavior: 'smooth'
            });

            // 3. 滚动完之后，过1.5秒把高亮背景去掉
            setTimeout(() => {
                targetMsg.style.background = '';
            }, 1500);
        };

        function renderMessages(preserveScroll = false) {
            const container = DOMElements.chatContainer;
            const totalMessages = messages.length;

            const startIndex = Math.max(0, totalMessages - displayedMessageCount);
            const msgsToRender = messages.slice(startIndex);

            DOMElements.emptyState.style.display = totalMessages === 0 ? 'flex': 'none';

            const oldScrollHeight = container.scrollHeight;
            
            const prevRenderedCount = container._lastRenderedCount || 0;
            const newMessageCount = msgsToRender.length - prevRenderedCount;
            
            container.innerHTML = '';
            container._lastRenderedCount = msgsToRender.length;

            const fragment = new DocumentFragment();
            const spacer = document.createElement('div');
            spacer.style.flex = '1';
            fragment.appendChild(spacer);
            let currentDate = '';
            let lastSender = null;

            msgsToRender.forEach((msg, index) => {
                const messageDate = new Date(msg.timestamp).toDateString();
                if (messageDate !== currentDate) {
                    currentDate = messageDate;
                    const dateDivider = document.createElement('div');
                    dateDivider.className = 'date-divider';
                    const today = new Date().toDateString();
                    const yesterday = new Date(Date.now() - 86400000).toDateString();
                    const displayDate = (messageDate === today) ? '今天': (messageDate === yesterday) ? '昨天': new Date(msg.timestamp).toLocaleDateString('zh-CN', {
                        year: 'numeric', month: 'long', day: 'numeric'
                    });
                    dateDivider.innerHTML = `<span>${displayDate}</span>`;
                    fragment.appendChild(dateDivider);
                    lastSender = null; 
                }

                if (msg.type === 'call-event') {
                    const callEvDiv = document.createElement('div');
                    callEvDiv.className = 'call-event-message';
                    callEvDiv.dataset.id = msg.id;
                    const icon = msg.callIcon || 'fa-video';
                    const isRejected = icon === 'fa-phone-slash';
                    const colorClass = isRejected ? 'call-event-pill--rejected' : 'call-event-pill--ended';
                    const detail = msg.callDetail ? `<span class="call-event-detail">${msg.callDetail}</span>` : '';
                    callEvDiv.innerHTML = `<div class="call-event-pill ${colorClass}"><i class="fas ${icon} call-event-icon"></i><span class="call-event-label">${msg.text.replace(/ · .*/, '')}</span>${detail}<button class="call-event-delete" title="删除" onclick="(function(btn){const id=btn.closest('[data-id]').dataset.id;const idx=messages.findIndex(m=>String(m.id)===String(id));if(idx>-1){messages.splice(idx,1);renderMessages();throttledSaveData();}})(this)"><i class="fas fa-times"></i></button></div>`;
                    fragment.appendChild(callEvDiv);
                    lastSender = 'system';
                    return;
                }


                if (msg.type === 'system') {
                    const systemMsgDiv = document.createElement('div');
                    systemMsgDiv.className = 'system-message';
                    systemMsgDiv.innerHTML = msg.text;
                    fragment.appendChild(systemMsgDiv);
                    lastSender = 'system';
                    return;
                }

                let showTimestamp = true;
                if (settings.timeFormat === 'off') {
                    showTimestamp = false;
                } else if (index < msgsToRender.length - 1) {
                    const nextMsg = msgsToRender[index + 1];
                    const currentTs = new Date(msg.timestamp).getTime();
                    const nextTs = new Date(nextMsg.timestamp).getTime();
                    
                    if (nextMsg.sender === msg.sender && 
                        nextMsg.type !== 'system' && 
                        (nextTs - currentTs < 60000)) {
                        showTimestamp = false;
                    }
                }

                let isLastInSenderGroup = true;
                if (index < msgsToRender.length - 1) {
                    const nextMsg = msgsToRender[index + 1];
                    const currentTs = new Date(msg.timestamp).getTime();
                    const nextTs = new Date(nextMsg.timestamp).getTime();
                    if (nextMsg.sender === msg.sender &&
                        nextMsg.type !== 'system' &&
                        (nextTs - currentTs < 60000)) {
                        isLastInSenderGroup = false;
                    }
                }

                const wrapper = document.createElement('div');
                wrapper.className = `message-wrapper ${msg.sender === 'user' ? 'sent': 'received'}`;
                wrapper.dataset.id = msg.id;
                wrapper.dataset.msgId = msg.id;
                if (index < msgsToRender.length - Math.max(newMessageCount, 0)) {
                    wrapper.style.animation = 'none';
                    wrapper.style.opacity = '1';
                }
                
                const avatarDiv = document.createElement('div');
                avatarDiv.className = 'message-avatar';
                if (settings.inChatAvatarPosition === 'custom' && settings.inChatAvatarCustomOffset !== undefined) {
                    avatarDiv.style.marginTop = settings.inChatAvatarCustomOffset + 'px';
                }

                const groupMember = (msg.sender !== 'user' && typeof getGroupMemberForMessage === 'function') ? getGroupMemberForMessage(msg.id) : null;

                if (settings.inChatAvatarEnabled) {
                    const isSameSenderGroup = groupMember && lastSender === 'group_' + (groupMember ? groupMember.name : '');
                    const isSameSenderNormal = !groupMember && msg.sender === lastSender;
                    const shouldHide = !settings.alwaysShowAvatar && (isSameSenderGroup || isSameSenderNormal);
                    if (shouldHide) {
                        avatarDiv.classList.add('hidden');
                    } else if (groupMember) {
                        const groupAvatarShape = settings.partnerAvatarShape || 'circle';
                        ['circle','square','pentagon','heart'].forEach(s => avatarDiv.classList.remove('shape-' + s));
                        if (groupAvatarShape !== 'none') avatarDiv.classList.add('shape-' + groupAvatarShape);
                        if (groupMember.avatar) {
                            avatarDiv.innerHTML = `<img src="${groupMember.avatar}" style="width:100%;height:100%;object-fit:cover;">`;
                        } else {
                            const initials = (groupMember.name || '?').charAt(0).toUpperCase();
                            avatarDiv.innerHTML = `<div style="width:100%;height:100%;background:var(--accent-color);display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:700;color:#fff;">${initials}</div>`;
                        }
                    } else {
                        const isUser = msg.sender === 'user';
                        const avatarElement = isUser ? DOMElements.me.avatar : DOMElements.partner.avatar;
                        const frameSettings = isUser ? settings.myAvatarFrame : settings.partnerAvatarFrame;
                        const avatarShape = isUser ? (settings.myAvatarShape || 'circle') : (settings.partnerAvatarShape || 'circle');
                        avatarDiv.innerHTML = avatarElement.innerHTML;
                        applyAvatarFrame(avatarDiv, frameSettings);
                        ['circle','square','pentagon','heart'].forEach(s => avatarDiv.classList.remove('shape-' + s));
                        if (avatarShape !== 'none') avatarDiv.classList.add('shape-' + avatarShape);
                    }
                } else {
                    avatarDiv.style.display = 'none';
                }
                wrapper.appendChild(avatarDiv);
                
                const contentWrapper = document.createElement('div');
                contentWrapper.className = 'message-content-wrapper';

                if (groupMember && groupChatSettings.showName) {
                    const nameLabel = document.createElement('div');
                    nameLabel.className = 'group-sender-name';
                    nameLabel.textContent = groupMember.name;
                    const isSameSenderGroupForName = lastSender === 'group_' + groupMember.name;
                    if (!isSameSenderGroupForName) contentWrapper.appendChild(nameLabel);
                } else if (!groupMember && msg.sender !== 'user' && msg.sender !== null &&
                           (settings.showPartnerNameInChat || showPartnerNameInChat)) {
                    // Single mode: show partner name when the option is enabled and sender changes
                    const isSameSenderForName = lastSender === msg.sender;
                    if (!isSameSenderForName) {
                        const nameLabel = document.createElement('div');
                        nameLabel.className = 'group-sender-name';
                        nameLabel.textContent = settings.partnerName || msg.sender || '对方';
                        contentWrapper.appendChild(nameLabel);
                    }
                }
                
                let messageHTML = '';
                if (msg.replyTo) {
                    messageHTML += window.renderReplyIndicator(msg);
                }

                const isImageOnly = !msg.text && !!msg.image;
                
                let content = ''; 
                // 🌟 最新卡片渲染逻辑（直接插入 DOM，保留点击事件）
                if (msg.text && typeof msg.text === 'object' && msg.text.type === 'share-card') {
                    // 注意：这里什么都不拼，content 保持为空
                } else if (msg.text) {
                    content += `<div>${String(msg.text).replace(/\n/g, '<br>')}</div>`;
                }

                if (msg.image) content += `<img src="${msg.image}" class="message-image${isImageOnly ? ' message-image-only' : ''}" alt="图片" style="max-width:${isImageOnly ? '100px' : '100px'}; border-radius: 12px;${!isImageOnly ? ' margin-top: 6px;' : ''} cursor: pointer;" onclick="viewImage('${msg.image}')">`;

                messageHTML += content; // 此时如果是卡片，这里只会是空字符串

                const messageDiv = document.createElement('div');
                const isShareCard = msg.text && typeof msg.text === 'object' && msg.text.type === 'share-card';

                // ... 下面那些 messageDiv.className 的判断保持原样不动 ...

                
                if (isImageOnly) {
                    messageDiv.className = `message message-${msg.sender === 'user' ? 'sent': 'received'} message-image-bubble-none`;
                } else if (isShareCard) {
                    // 🌟 如果是卡片：加上隐形气泡的专属 class
                    messageDiv.className = `message message-${msg.sender === 'user' ? 'sent': 'received'} share-card-bubble-none`;
                } else {
                    messageDiv.className = `message message-${msg.sender === 'user' ? 'sent': 'received'} ${settings.bubbleStyle}`;
                }

                messageDiv.innerHTML = messageHTML;
            // ✅ 加上这一段：如果是卡片，把带有点击事件的真 DOM 插进去
            if (isShareCard && typeof ShareCardParser !== 'undefined') {
                messageDiv.appendChild(ShareCardParser.createCardElement(msg.text));
            }
                let actionsHTML = '';
                
                if (settings.replyEnabled) actionsHTML += `<button class="meta-action-btn reply-btn" title="回复"><i class="fas fa-reply"></i></button>`;
                
                const starIcon = msg.favorited ? 'fas fa-star' : 'far fa-star'; 
                actionsHTML += `<button class="meta-action-btn favorite-action-btn ${msg.favorited ? 'favorited' : ''}" title="${msg.favorited ? '取消收藏' : '收藏'}"><i class="${starIcon}"></i></button>`;
                      // 🌟 新增：复制按钮（只有有文字才显示，图片不显示）
                if (msg.text) {
                    actionsHTML += `<button class="meta-action-btn copy-btn" title="复制"><i class="fas fa-copy"></i></button>`;
                }
                if (msg.sender === 'user') {
                    actionsHTML += `<button class="meta-action-btn edit-btn" title="编辑"><i class="fas fa-pencil-alt"></i></button>`;
                }

                actionsHTML += `<button class="meta-action-btn delete-btn" title="删除"><i class="fas fa-trash-alt"></i></button>`;
                const actionsDiv = document.createElement('div');
                actionsDiv.className = 'message-meta-actions';
                actionsDiv.innerHTML = actionsHTML;

                let metaHTML = '';
                
                if (showTimestamp) {
                    const ts = new Date(msg.timestamp);
                    let timeStr;
                    const fmt = settings.timeFormat || 'HH:mm';
                    if (fmt === 'HH:mm:ss') {
                        timeStr = ts.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
                    } else if (fmt === 'h:mm AM/PM') {
                        timeStr = ts.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
                    } else if (fmt === 'h:mm:ss AM/PM') {
                        timeStr = ts.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true });
                    } else {
                        timeStr = ts.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false });
                    }
                    metaHTML += `<div class="timestamp">${timeStr}</div>`;
                }

                if (msg.sender === 'user' && settings.readReceiptsEnabled && isLastInSenderGroup) {
                    const rrStyle = settings.readReceiptStyle || 'icon';
                    if (rrStyle === 'text') {
                        if (msg.status === 'read') {
                            metaHTML += `<div class="read-receipt read" style="font-size:9px;letter-spacing:0.3px;font-weight:500;">已读</div>`;
                        } else {
                            metaHTML += `<div class="read-receipt" style="font-size:9px;letter-spacing:0.3px;opacity:0.5;">未读</div>`;
                        }
                    } else {
                        const statusIcon = msg.status === 'read' ? 'fa-check-double': 'fa-check';
                        metaHTML += `<div class="read-receipt ${msg.status === 'read' ? 'read': ''}"><i class="fas ${statusIcon}"></i></div>`;
                    }
                }

                if (metaHTML !== '') {
                    const metaDiv = document.createElement('div');
                    metaDiv.className = 'message-meta';
                    if (!showTimestamp && !metaHTML.includes('timestamp')) {
                         metaDiv.style.height = 'auto'; 
                         metaDiv.style.marginTop = '2px';
                         if (settings.inChatAvatarPosition !== 'top') {
                             avatarDiv.style.marginBottom = '18px';
                         }
                    } else {
                         
                         if (settings.inChatAvatarPosition !== 'top') {
                             avatarDiv.style.marginBottom = '26px';
                         }
                    }
                    metaDiv.innerHTML = metaHTML;
                    contentWrapper.append(actionsDiv, messageDiv, metaDiv);
                } else {
                    contentWrapper.append(actionsDiv, messageDiv);
                }
                wrapper.appendChild(contentWrapper);
                fragment.appendChild(wrapper);
                
                lastSender = groupMember ? ('group_' + groupMember.name) : msg.sender;
            });

            container.appendChild(fragment);

            if (preserveScroll) {
                const newScrollHeight = container.scrollHeight;
                const delta = newScrollHeight - oldScrollHeight;
                container.scrollTop = Math.max(0, container.scrollTop + delta);
            } else if (!window._preventAutoScroll) {
                // 如果搜索跳转时设置了 _preventAutoScroll，就不执行滚到底部，防止抖动
                requestAnimationFrame(() => {
                container.scrollTop = container.scrollHeight;
                });
            }
        }        

        // 在 core.js 中添加
        function immediateSaveData() {
            return saveData().then(() => {
                console.log('[immediateSaveData] 数据已立即保存');
            }).catch(e => {
                console.error('[immediateSaveData] 保存失败:', e);
                showNotification('数据保存失败，请检查存储空间', 'error');
            });
        }

        // 新增：打断对方的回复（停止计时器 + 隐藏正在输入）
        window.cancelPartnerReply = function() {
            // 1. 设置打断标志
            window._replyAborted = true; 

            // 2. 清除后台的回复计时器
            if (window._pendingReplyTimer) {
                clearTimeout(window._pendingReplyTimer);
                window._pendingReplyTimer = null;
            }
            // 3. 立刻隐藏“正在输入”的动画
            const tiW = document.getElementById('typing-indicator-wrapper');
            if (tiW) {
                const tiInner = tiW.querySelector('.typing-indicator');
                if (tiInner) {
                    tiInner.classList.add('hiding');
                    setTimeout(() => {
                        tiW.style.display = 'none';
                        if (tiInner) tiInner.classList.remove('hiding');
                    }, 240);
                } else {
                    tiW.style.display = 'none';
                }
            }
        };

        const addMessage = (message) => {
            if (!(message.timestamp instanceof Date)) message.timestamp = new Date(message.timestamp);
            messages.push(message);
            displayedMessageCount++;
            const container = DOMElements.chatContainer;
            container.style.opacity = '1';
            renderMessages(false); 
            
            // 🌟 强制同步滚到底部，解决 rAF 导致的往上跳动
            container.scrollTop = container.scrollHeight;
            
            // 🌟 兼容移动端：软键盘收起时视口大小会变，延迟补位防止滑上去
            if (window.visualViewport) {
                const fixScroll = () => {
                container.scrollTop = container.scrollHeight;
                window.visualViewport.removeEventListener('resize', fixScroll);
                };
                window.visualViewport.addEventListener('resize', fixScroll);
            } else {
                // 旧浏览器降级方案
                setTimeout(() => { container.scrollTop = container.scrollHeight; }, 100);
            }
            //immediateSaveData();
            saveData();
        };
        window.addMessage = addMessage;

        function optimizeImage(file, maxWidth = 800, quality = 0.7) {
            return new Promise((resolve, reject) => {
                if (file.size < 300 * 1024) {
                    const reader = new FileReader();
                    reader.onload = e => resolve(e.target.result);
                    reader.onerror = reject;
                    reader.readAsDataURL(file);
                    return;
                }
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');
                    let {
                        width,
                        height
                    } = img;
                    if (width > maxWidth) {
                        height = Math.round((height * maxWidth) / width);
                        width = maxWidth;
                    }
                    canvas.width = width;
                    canvas.height = height;
                    ctx.drawImage(img, 0, 0, width, height);
                    resolve(canvas.toDataURL('image/jpeg', quality));
                    URL.revokeObjectURL(img.src);
                };
                img.onerror = () => {
                    const reader = new FileReader();
                    reader.onload = e => resolve(e.target.result);
                    reader.onerror = reject;
                    reader.readAsDataURL(file);
                    URL.revokeObjectURL(img.src);
                };
                img.src = URL.createObjectURL(file);
            });
        }

        window.updateReplyPreview = function() {
            const container = DOMElements.replyPreviewContainer;
            if (!container) return;
            if (!currentReplyTo) {
                container.innerHTML = '';
                container.style.display = 'none';
                return;
            }
            const senderName = currentReplyTo.sender === 'user' ? (settings.myName || '我') : (settings.partnerName || '对方');
            const previewText = (typeof currentReplyTo.text === 'string' && currentReplyTo.text) 
                ? currentReplyTo.text.slice(0, 40) 
                : (currentReplyTo.text && currentReplyTo.text.type === 'share-card' ? '🔗 链接卡片' : '🖼 图片');
            container.style.display = 'flex';
            container.innerHTML = `
                <div style="display:flex;align-items:center;gap:8px;padding:6px 10px;background:rgba(var(--accent-color-rgb),0.07);border-left:3px solid var(--accent-color);border-radius:0 8px 8px 0;width:100%;">
                    <div style="flex:1;min-width:0;">
                        <span style="font-size:11px;color:var(--accent-color);font-weight:600;">回复 ${senderName}</span>
                        <div style="font-size:12px;color:var(--text-secondary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${previewText}</div>
                    </div>
                    <button onclick="currentReplyTo=null;window.updateReplyPreview();" style="background:none;border:none;cursor:pointer;color:var(--text-secondary);padding:2px 4px;font-size:14px;">✕</button>
                </div>`;
        };
        function updateReplyPreview() { window.updateReplyPreview(); }
        function sendMessage(textOverride = null, type = 'normal', imageBase64 = null) {
            const text = textOverride || DOMElements.messageInput.value.trim();
            const imageFile = DOMElements.imageInput.files[0];
            if (!text && !imageFile && !imageBase64 && type === 'normal') return;

            // 🌟 键盘保活模式：静默清空，绝对不触发 blur
            // 🔥 核心改动：完全以标记为准，不再跟其他设置耦合
            if (DOMElements.messageInput.dataset.keepFocus === '1') {
                // 用户主动开启了保活：静默清空，绝对不触发 blur
                DOMElements.messageInput.value = '';
                DOMElements.messageInput.style.height = '46px';
            } else {
                // 用户没开保活（或点击发送按钮）：正常模式，清空并失焦（让键盘收起）
                DOMElements.messageInput.value = '';
                DOMElements.messageInput.style.height = '46px';
                DOMElements.messageInput.blur();
            }

            // 清理标记
            delete DOMElements.messageInput.dataset.keepFocus;

            if (imageFile && imageFile.size > MAX_IMAGE_SIZE) {
                showNotification('图片大小不能超过5MB', 'error');
                DOMElements.imageInput.value = '';
                return;
            }

            // 🌟【关键修复】：把 createMessage 的定义移到调用它的地方之前，解决 TDZ 报错
            function createMessage (imgSrc = null) {
                const messageData = {
                    id: Date.now(),
                    sender: 'user',
                     text: (text && typeof text === 'object') ? text : (text || ''),
                    timestamp: new Date(),
                    image: imgSrc,
                    status: 'sent',
                    favorited: false,
                    note: null,
                    replyTo: currentReplyTo,
                    type: type
                };
                if (type === 'system') messageData.sender = null;
                addMessage(messageData);
                if (type !== 'system') playSound('send');
                currentReplyTo = null;
                updateReplyPreview();
                // 🌟 发送完毕后，把标记擦除，防止影响后续正常的失焦操作
                delete DOMElements.messageInput.dataset.keepFocus;
               //这里判断要不要触发回复
                if (type === 'normal' || type === 'share-card') {
                    window._replyAborted = false;
                    const delayRange = settings.replyDelayMax - settings.replyDelayMin;
                    const randomDelay = settings.replyDelayMin + Math.random() * delayRange;
                    // 1. 【防抖核心】先清除之前的倒计时，并记住之前有没有在倒计时
                    const hadPendingTimer = !!window._pendingReplyTimer;
                    if (hadPendingTimer) {
                        clearTimeout(window._pendingReplyTimer);
                        window._pendingReplyTimer = null;
                    }
                    // 2. 核心逻辑分支
                    if (hadPendingTimer) {
                        // 【情况A】之前已经在计划回复了（可能正在输入中）
                        // 此时绝对不允许“半途而废”，必须继续回复！
                        // 直接把新发的这条也改成已读，然后重新开始倒计时
                        _doMarkReadAndStartTyping();
                    } else {
                        // 【情况B】之前没有回复计划（消息处于安静未读状态）
                        // 这是【唯一】允许投“不回复”骰子的时机！
                        const shouldIgnore = settings.allowReadNoReply && (Math.random() < (settings.readNoReplyChance || 0.2));
                        if (!shouldIgnore) {
                            // 决定回复：改已读，开始输入
                            _doMarkReadAndStartTyping();
                        } else {
                            // 决定不回复：什么都不干，安安静静保持未读
                            // 确保没有幽灵的“正在输入”
                            const tiWrapper = document.getElementById('typing-indicator-wrapper');
                            if (tiWrapper) tiWrapper.style.display = 'none';
                        }
                    }
                    // 抽离出来的“改已读并开始输入”的动作包
                    function _doMarkReadAndStartTyping() {
                        // 瞬间把所有未读改成已读
                        let readChanged = false;
                        messages.forEach(msg => {
                            if (msg.sender === 'user' && msg.status !== 'read') {
                                msg.status = 'read';
                                readChanged = true;
                            }
                        });
                        if (readChanged) {
                            renderMessages(false);
                            throttledSaveData();
                        }
                        // 显示“正在输入中”
                        if (settings.typingIndicatorEnabled) {
                            const tiWrapper = document.getElementById('typing-indicator-wrapper');
                            const tiLabel = document.getElementById('typing-indicator-label');
                            const tiAvatar = document.getElementById('typing-indicator-avatar');
                            if (tiLabel) tiLabel.textContent = (settings.partnerName || '对方') + ' 正在输入';
                            if (tiWrapper) {
                                positionTypingIndicator();
                                tiWrapper.style.display = 'block';
                            }
                            if (tiAvatar) {
                                const partnerImg = DOMElements.partner.avatar.querySelector('img');
                                tiAvatar.innerHTML = partnerImg ? `<img src="${partnerImg.src}">` : '<i class="fas fa-user"></i>';
                            }
                            if (DOMElements.chatContainer) DOMElements.chatContainer.scrollTop = DOMElements.chatContainer.scrollHeight;
                        }
                        // 重新设置倒计时
                        window._pendingReplyTimer = setTimeout(() => {
                            window._pendingReplyTimer = null;
                            simulateReply();
                        }, randomDelay);
                    }
                }
            }

            // ✅ 现在可以安全调用了
            if (imageBase64) {
                createMessage(imageBase64);
                DOMElements.imageInput.value = '';
                return;
            }

            if (imageFile) {
                showNotification('正在优化图片...', 'info', 1500);
                optimizeImage(imageFile).then(createMessage).catch(() => showNotification('图片处理失败', 'error'));
            } else {
                createMessage();
            }
            DOMElements.imageInput.value = '';

            // 🔥 必须严格等于字符串 '1' 才抢焦点，彻底杜绝幽灵标记或类型错误
            if (DOMElements.messageInput.dataset.keepFocus === '1') {
                setTimeout(() => DOMElements.messageInput.focus(), 0);
            }
        }


        function positionTypingIndicator() {
            var tiW = document.getElementById('typing-indicator-wrapper');
            var inputArea = document.querySelector('.input-area-wrapper');
            if (!tiW || !inputArea) return;
            var h = inputArea.offsetHeight;
            tiW.style.bottom = h + 'px';
        }
        (function() {
            var inputArea = document.querySelector('.input-area-wrapper');
            if (!inputArea) return;
            var ro = new ResizeObserver(function() {
                var tiW = document.getElementById('typing-indicator-wrapper');
                if (tiW && tiW.style.display !== 'none') positionTypingIndicator();
            });
            ro.observe(inputArea);
        })();

        function simulateReply() {
            window._replyAborted = false;
            function showTypingIndicator() {
                if (!settings.typingIndicatorEnabled) return;
                const tiWrapper = document.getElementById('typing-indicator-wrapper');
                const tiLabel = document.getElementById('typing-indicator-label');
                const tiAvatar = document.getElementById('typing-indicator-avatar');
                if (tiLabel) tiLabel.textContent = (settings.partnerName || '对方') + ' 正在输入';
                if (tiWrapper) { positionTypingIndicator(); tiWrapper.style.display = 'block'; }
                if (tiAvatar) {
                    const partnerImg = DOMElements.partner.avatar.querySelector('img');
                    tiAvatar.innerHTML = partnerImg ? `<img src="${partnerImg.src}">` : '<i class="fas fa-user"></i>';
                }
                DOMElements.chatContainer.scrollTop = DOMElements.chatContainer.scrollHeight;
            }

            showTypingIndicator();

            let changed = false;
            messages.forEach(msg => {
                if (msg.sender === 'user' && msg.status !== 'read') {
                    msg.status = 'read'; changed = true;
                }
            });
            if (changed) {
                renderMessages(false); throttledSaveData();
            }


            if (Math.random() < 0.03) {
                if (customPokes && customPokes.length > 0) {
                    const randomAction = getRandomItem(customPokes);
                            const pokeTypes = [{
                                prefix: "💫",
                                text: `${settings.partnerName} ${randomAction}`
                            },
                                {
                                    prefix: "✨",
                                    text: `${settings.partnerName} ${randomAction}`
                                },
                                {
                                    prefix: "🌟",
                                    text: `${settings.partnerName} ${randomAction}`
                                },
                                {
                                    prefix: "🥰",
                                    text: `${settings.partnerName} ${randomAction}`
                                },
                                {
                                    prefix: "💖",
                                    text: `${settings.partnerName} ${randomAction}`
                                }];

                        const selectedPoke = getRandomItem(pokeTypes);
                    
                    addMessage({
                        id: Date.now(),
                        text: `${selectedPoke.prefix} ${settings.partnerName} ${randomAction} ${selectedPoke.prefix}`,
                        timestamp: new Date(),
                        type: 'system'
                    });
                    (function(){var _tiW=document.getElementById('typing-indicator-wrapper');if(_tiW){var _tiInner=_tiW.querySelector('.typing-indicator');if(_tiInner){_tiInner.classList.add('hiding');setTimeout(function(){_tiW.style.display='none';if(_tiInner)_tiInner.classList.remove('hiding');},240);}else{_tiW.style.display='none';}}})();
                    return;
                }
            }

           //const replyCount = Math.random() < 0.75 ? 1: (Math.random() < 0.95 ? 2: 3);
           // 从输入框读取范围，逻辑和原来 slider 完全一样
            const _minCount = settings.replyTextMin || 1;
            const _maxCount = settings.replyTextMax || 3;
            const _range = Math.max(0, _maxCount - _minCount);
            const replyCount = _minCount + Math.floor(Math.random() * (_range + 1));

          // const replyCount = Math.floor(Math.random() * 3) + 1;
            if (!customReplies || customReplies.length === 0) {
                (function(){var _tiW=document.getElementById('typing-indicator-wrapper');if(_tiW){var _tiInner=_tiW.querySelector('.typing-indicator');if(_tiInner){_tiInner.classList.add('hiding');setTimeout(function(){_tiW.style.display='none';if(_tiInner)_tiInner.classList.remove('hiding');},240);}else{_tiW.style.display='none';}}})();
                showNotification('还没有添加字卡，请先到"自定义回复"中添加字卡', 'info', 4000);
                return;
            }
            let delay = 0;
            // ===== 引用逻辑优化：时间窗口限制 =====
            const REPLY_TIME_LIMIT = 1 * 60 * 60 * 1000; // 设定时间限制为 1小时 (单位：毫秒)
            const recentUserMsgs = settings.replyEnabled ? messages.filter(m => {
                // 1. 必须是用户发的消息，且必须有文字内容
                //if (m.sender !== 'user' || !m.text) return false;
                if ((m.sender !== 'user' && m.sender !== 'partner') || !m.text) return false;
                // 2. 计算消息时间差
                const msgTime = new Date(m.timestamp).getTime();
                const isRecent = (Date.now() - msgTime) < REPLY_TIME_LIMIT;
                
                // 3. 只保留1小时以内的消息
                return isRecent;
            }).slice(-7) : []; // 4. 只取最近符合条件的 7 条消息

            for (let i = 0; i < replyCount; i++) {
                const delayRange = settings.replyDelayMax - settings.replyDelayMin;
                delay += settings.replyDelayMin + Math.random() * delayRange;
                setTimeout(() => {
                    if (window._replyAborted) {
                        console.log('回复已被用户打断');
                        var _tiW = document.getElementById('typing-indicator-wrapper');
                        if (_tiW) _tiW.style.display = 'none';
                        return; 
                    }
                    // Bug fix 1: Filter out disabled individual items AND items from disabled groups
                    let disabledItems = new Set();
                    try {
                        const raw = localStorage.getItem('disabledReplyItems');
                        if (raw) disabledItems = new Set(JSON.parse(raw));
                    } catch(e) {}
                    const disabledGroups = (window.customReplyGroups || [])
                        .filter(g => g.disabled)
                        .map(g => g.id);
                    const disabledGroupItems = new Set();
                    if (disabledGroups.length > 0) {
                        customReplies.forEach((reply) => {
                            const itemGroup = (window.customReplyGroups || []).find(g =>
                                g.items && g.items.includes(reply)
                            );
                            if (itemGroup && disabledGroups.includes(itemGroup.id)) {
                                disabledGroupItems.add(reply);
                            }
                        });
                    }
                    const replyPool = customReplies.filter(r => !disabledItems.has(r) && !disabledGroupItems.has(r));
                    const replyText = replyPool[Math.floor(Math.random() * replyPool.length)];
                   // 🌟 限时字卡：获取当前特殊文案
                   /* const careMsgs = (typeof getActiveCareMessages === 'function') ? getActiveCareMessages() : [];
                    const finalPool = careMsgs.length > 0 ? [...replyPool, ...careMsgs] : replyPool;
                    const replyText = finalPool[Math.floor(Math.random() * finalPool.length)];*/


                    // Bug fix 2: 30% chance partner sends a sticker image instead of (or after) text
                    const shouldSendSticker = stickerLibrary && stickerLibrary.length > 0 && Math.random() < 0.3;

                    let finalText = replyText;
                    let separateEmoji = null;
                    if (!shouldSendSticker && customEmojis && customEmojis.length > 0 && Math.random() < 0.3) {
                        const emoji = customEmojis[Math.floor(Math.random() * customEmojis.length)];
                        if (settings.emojiMixEnabled !== false) {
                            finalText = Math.random() < 0.5
                                ? emoji + ' ' + replyText
                                : replyText + ' ' + emoji;
                        } else {
                            separateEmoji = emoji;
                        }
                    }

                    addMessage({
                        id: Date.now() + i,
                        sender: settings.partnerName || '对方',
                        text: finalText,
                        timestamp: new Date(),
                        status: 'received',
                        favorited: false,
                        note: null,
                        replyTo: (i === 0 && recentUserMsgs.length > 0 && Math.random() < 0.3)
                            ? (function(){ const m = recentUserMsgs[Math.floor(Math.random() * recentUserMsgs.length)]; return { id: m.id, text: m.text, sender: m.sender }; })()
                            : null,
                        type: 'normal'
                    });
                    // Bug fix 4: Send background push notification
                    if (typeof window._sendPartnerNotification === 'function') {
                        window._sendPartnerNotification(settings.partnerName || '对方', finalText);
                    }
                    // Bug fix 5: Play sound for incoming message
                    playSound('message');

                    // Bug fix 2 (continued): send the sticker as a follow-up image message
                    if (shouldSendSticker) {
                        const randomSticker = stickerLibrary[Math.floor(Math.random() * stickerLibrary.length)];
                        setTimeout(() => {
                            addMessage({
                                id: Date.now() + i + 2000,
                                sender: settings.partnerName || '对方',
                                text: '',
                                timestamp: new Date(),
                                image: randomSticker,
                                status: 'received',
                                favorited: false,
                                note: null,
                                type: 'normal'
                            });
                            playSound('message');
                            if (typeof window._sendPartnerNotification === 'function') {
                                window._sendPartnerNotification(settings.partnerName || '对方', '[表情]');
                            }
                        }, 400 + Math.random() * 600);
                    }

                    if (separateEmoji) {
                        setTimeout(() => {
                            addMessage({
                                id: Date.now() + i + 1000,
                                sender: settings.partnerName || '对方',
                                text: separateEmoji,
                                timestamp: new Date(),
                                status: 'received',
                                favorited: false,
                                note: null,
                                type: 'normal'
                            });
                        }, 300 + Math.random() * 400);
                    }

                    if (i === replyCount - 1) {
                        (function() {
                            var _tiW = document.getElementById('typing-indicator-wrapper');
                            if (_tiW) {
                                var _tiInner = _tiW.querySelector('.typing-indicator');
                                if (_tiInner) {
                                    _tiInner.classList.add('hiding');
                                    setTimeout(function() {
                                        _tiW.style.display = 'none';
                                        if (_tiInner) _tiInner.classList.remove('hiding');
                                    }, 240);
                                } else {
                                    _tiW.style.display = 'none';
                                }
                            }
                        })();
                    }
                }, delay);
            }
        }

        function showModal(modalElement, focusElement = null) {
            if (!modalElement) return; 
            if (modalElement._hideTimeout) {
                clearTimeout(modalElement._hideTimeout);
                modalElement._hideTimeout = null;
            }
            modalElement.style.display = 'flex';
            requestAnimationFrame(() => {
                const content = modalElement.querySelector('.modal-content');
                if (content) {
                    content.style.opacity = '1';
                    content.style.transform = 'translateY(0) scale(1)';
                }
                if (focusElement) {
                    setTimeout(() => focusElement.focus(), 100);
                }
            });
        }

        function hideModal(modalElement) {
            const content = modalElement.querySelector('.modal-content');
            if (content) {
                content.style.opacity = '0';
                content.style.transform = 'translateY(20px) scale(0.95)';
            }
            if (modalElement._hideTimeout) clearTimeout(modalElement._hideTimeout);
            modalElement._hideTimeout = setTimeout(() => {
                modalElement.style.display = 'none';
            }, 300);
        }

        function viewImage(src) {
            const modal = document.createElement('div');
            modal.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,0.92);display:flex;align-items:center;justify-content:center;animation:fadeIn 0.2s ease;touch-action:pinch-zoom;';
            modal.innerHTML = `
                <div style="position:relative;max-width:95vw;max-height:92vh;display:flex;align-items:center;justify-content:center;">
                    <img src="${src}" style="max-width:95vw;max-height:88vh;object-fit:contain;display:block;border-radius:8px;box-shadow:0 8px 40px rgba(0,0,0,0.6);" draggable="false">
                    <button onclick="this.closest('[style*=fixed]').remove()" style="position:fixed;top:16px;right:16px;width:38px;height:38px;border-radius:50%;background:rgba(255,255,255,0.15);border:1.5px solid rgba(255,255,255,0.3);color:#fff;font-size:18px;cursor:pointer;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(8px);z-index:10;line-height:1;">×</button>
                    <a href="${src}" download style="position:fixed;bottom:24px;left:50%;transform:translateX(-50%);padding:10px 24px;background:rgba(255,255,255,0.15);border:1.5px solid rgba(255,255,255,0.3);border-radius:20px;color:#fff;font-size:13px;text-decoration:none;backdrop-filter:blur(8px);display:flex;align-items:center;gap:6px;"><i class="fas fa-download"></i> 保存图片</a>
                </div>`;
            modal.addEventListener('click', (e) => {
                if (e.target === modal || e.target.tagName === 'IMG') modal.remove();
            });
            document.body.appendChild(modal);
        }

        // ==========================================
        // 备份导入导出逻辑已全盘迁移至 backup-engine.js
        // 此处仅保留空壳以防报错
        // ==========================================
        async function exportFullBackup() { return window.ChatBackup.exportFullBackup(); }
        async function importAnyBackup(file) { return window.ChatBackup.importAnyBackup(file); }
        function exportChatHistory(isAllMode) { return window.ChatBackup.exportChatHistory(isAllMode); }
        async function handleLegacyImport(data) { return window.ChatBackup.handleLegacyImport(data); }

        // 辅助函数：将简写 ID 映射回全局变量名
        window._getKeyFromId = function(id) {
            const map = {
                'msgs': 'messages',
                'settings': 'settings',
                'replies': 'customReplies',
                'emojis': 'customEmojis',
                'stickers': 'stickerLibrary',
                'myStickers': 'myStickerLibrary',
                'ann': 'anniversaries',
                'calendar': 'calendarEvents',
                'backgrounds': 'savedBackgrounds',
                'themes': 'customThemes',
                'schemes': 'themeSchemes'
            };
            return map[id] || id;
        }

        const checkStatusChange = () => {
            if ((Date.now() - settings.lastStatusChange) / 36e5 >= settings.nextStatusChange) {
                if (customStatuses && customStatuses.length > 0) {
                    settings.partnerStatus = getRandomItem(customStatuses);
                }
                settings.lastStatusChange = Date.now();
                settings.nextStatusChange = 1 + Math.random() * 7;
                DOMElements.partner.status.textContent = settings.partnerStatus;
                throttledSaveData();
            }
        };


         function getStorageKey(baseKey) {
            // 警告：新架构下禁止使用此函数拼接前缀读取！
            // 如果看到控制台打印这行，说明有漏网之鱼还在用旧方式存数据！
            console.warn(`[DB] 警告：有代码试图使用旧前缀读取: ${baseKey}`);
            return `DEPRECATED_${baseKey}`; // 故意返回一个错误的键，防止意外写入旧仓库
        }

        async function migrateData() {
            return; // 管家已接管，旧迁移废弃
        }

        /*async function initializeSession() {
            SESSION_ID = 'V6_LEGACY';
        }*/

        // ====== 壁纸模式切换与初始化逻辑 ======
        window.switchBgMode = function(mode) {
            if (typeof settings === 'undefined') return;
            settings.bgDisplayMode = mode;
            if (typeof throttledSaveData === 'function') throttledSaveData();
            
            const layer = document.getElementById('real-bg-layer');
            if (layer) layer.className = `mode-${mode}`;
            
            const currentBg = DB_GATEWAY.getMedia('chatBackground');
            if (currentBg) applyBackground(currentBg, mode);
            document.getElementById('bg-mode-contain').classList.toggle('active', mode === 'contain');
            document.getElementById('bg-mode-cover').classList.toggle('active', mode === 'cover');
            showNotification(`已切换为${mode === 'contain' ? '原图大小' : '适应屏幕'}模式`, 'success');
        }

        window.addEventListener('DOMContentLoaded', () => {
            const layer = document.getElementById('real-bg-layer');
            // 等待数据加载完后再应用保存的模式
            setTimeout(() => {
                if (layer && typeof settings !== 'undefined' && settings.bgDisplayMode) {
                    layer.className = `mode-${settings.bgDisplayMode}`;
                }
                // 👇 防止手机打字时背景图被键盘挤小
                if (window.visualViewport) {
                    let realHeight = window.visualViewport.height;
                    window.visualViewport.addEventListener('resize', () => {
                        if (window.visualViewport.height < realHeight) {
                            layer.style.height = realHeight + 'px';
                        } else {
                            layer.style.height = '';
                            realHeight = window.visualViewport.height;
                        }
                    });
                }
                // 👇 就是加这两行！页面加载完直接把按钮状态锁死
                const currentMode = settings.bgDisplayMode || 'contain';
                const containBtn = document.getElementById('bg-mode-contain');
                const coverBtn = document.getElementById('bg-mode-cover');
                if (containBtn) containBtn.classList.toggle('active', currentMode === 'contain');
                if (coverBtn) coverBtn.classList.toggle('active', currentMode === 'cover');

            }, 500); // 延迟半秒，确保 settings 已经加载完毕
        });