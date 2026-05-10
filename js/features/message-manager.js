/* * message-manager.js - 消息管理与长按操作 
 * 统一处理：引用、收藏、搜索、统计
 */ 
(function() {
    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

    // ==========================================
    // 核心公共函数：获取消息的显示文本（解决 object 报错万岁）
    // 以后任何地方需要显示消息文字，调这个函数就行，再也不会出现 [object Object]
    // ==========================================
    window.getMsgDisplayText = function(msg) {
        if (!msg) return '[消息]';
        // 1. 如果是链接卡片对象
        if (msg.text && typeof msg.text === 'object' && msg.text.type === 'share-card') {
            return '🔗 链接卡片';
        }
        // 2. 如果是普通文字
        if (msg.text && typeof msg.text === 'string') {
            return msg.text;
        }
        // 3. 如果只有图片
        if (msg.image) return '🖼 图片';
        return '[消息]';
    };

    // ==========================================
    // 1. 统一的长按与弹窗事件绑定（替换掉 core.js 和 fortune.js 里的零散代码）
    // ==========================================
    function initMessageActions() {
        const container = document.getElementById('chat-container');
        if (!container) return;

        container.addEventListener('click', (e) => {
 
            // ========== 1. 处理长按后的动作按钮（引用、收藏、复制、编辑、删除） ==========
            const target = e.target.closest('.meta-action-btn');
            if (target) {
                const wrapper = target.closest('.message-wrapper');
                if (!wrapper) return;
                const messageId = Number(wrapper.dataset.id);
                const message = messages.find(m => m.id === messageId);
                if (!message) return;

                // 【收藏】
                if (target.classList.contains('favorite-action-btn')) {
                    message.favorited = !message.favorited;
                    showNotification(message.favorited ? '已收藏' : '已取消收藏', 'success', 1500);
                    if (typeof playSound === 'function') playSound('favorite');
                    if (typeof throttledSaveData === 'function') throttledSaveData();
                    renderMessages(true);
                    return;
                }

                // 【引用】
                if (target.classList.contains('reply-btn')) {
                    currentReplyTo = { id: message.id, sender: message.sender, text: message.text };
                    if (typeof updateReplyPreview === 'function') updateReplyPreview();
                    DOMElements.messageInput.focus();
                    const targetMessageElement = container.querySelector(`[data-id="${message.id}"]`);
                    if (targetMessageElement) targetMessageElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    return;
                }

               // 【复制】
                if (target.classList.contains('copy-btn')) {
                    const textToCopy = message.text;
                    if (!textToCopy) return;
                    
                    let copyText = '';
                    
                    // 如果是链接卡片对象，直接扒出里面的原链接，别的都不要
                    if (textToCopy && typeof textToCopy === 'object' && textToCopy.url) {
                        copyText = textToCopy.url;
                    } 
                    // 如果是普通文字，正常复制
                    else if (typeof textToCopy === 'string') {
                        copyText = textToCopy;
                    }

                    if (copyText && navigator.clipboard && navigator.clipboard.writeText) {
                        navigator.clipboard.writeText(copyText).then(() => showNotification('已复制原链接', 'success', 1000)).catch(() => _fallbackCopy(copyText));
                    } else if (copyText) {
                        _fallbackCopy(copyText);
                    }
                    return;
                }


                // 【编辑】
                if (target.classList.contains('edit-btn')) {
                    const modal = DOMElements.editModal;
                    if (modal && modal.modal) {
                        showModal(modal.modal, modal.input);
                        modal.title.textContent = '编辑消息内容';
                        // 编辑时如果是卡片对象，不允许编辑（因为没法在输入框里改对象）
                        const isCard = message.text && typeof message.text === 'object';
                        if (isCard) {
                            modal.input.value = '';
                            modal.input.placeholder = '链接卡片暂不支持编辑文字';
                            modal.input.disabled = true;
                        } else {
                            modal.input.value = message.text || '';
                            modal.input.placeholder = '输入新的内容...';
                            modal.input.disabled = false;
                        }
                        modal.save.disabled = isCard;

                        modal.save.onclick = () => {
                            if (isCard) return showNotification('链接卡片暂不支持编辑', 'warning');
                            const newText = modal.input.value.trim();
                            if (!newText && !message.image) return showNotification('消息内容不能为空', 'error');
                            message.text = newText;
                            if (typeof throttledSaveData === 'function') throttledSaveData();
                            renderMessages(true);
                            hideModal(modal.modal);
                            showNotification('消息已修改', 'success');
                        };
                    }
                    return;
                }

                // 【删除】
                if (target.classList.contains('delete-btn')) {
                    if (confirm('确定要删除这条消息吗？')) {
                        const index = messages.findIndex(m => m.id === messageId);
                        if (index > -1) {
                            const savedScrollTop = container.scrollTop;
                            messages.splice(index, 1);
                            if (typeof throttledSaveData === 'function') throttledSaveData();
                            renderMessages(true);
                            requestAnimationFrame(() => { container.scrollTop = savedScrollTop; });
                            showNotification('消息已删除', 'success');
                        }
                    }
                    return;
                }
            }
        });
    }

    function _fallbackCopy(text) {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.left = '-9999px';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        try {
            document.execCommand('copy');
            showNotification('已复制到剪贴板', 'success', 1000);
        } catch (e) {
            showNotification('复制失败，请手动复制', 'error');
        }
        document.body.removeChild(ta);
    }

    // ==========================================
    // 2. renderMessages 里的引用样式修复（解决 object 显示问题）
    // 把这段粘贴到 core.js 的 renderMessages 里（见第三步说明）
    // ==========================================
    window.renderReplyIndicator = function(msg) {
        if (!msg.replyTo) return '';
        const repliedSender = msg.replyTo.sender === 'user' ? (settings.myName || '我') : (settings.partnerName || '对方');
        const repliedText = window.getMsgDisplayText({ text: msg.replyTo.text, image: msg.replyTo.image });
        
        return `<div class="reply-indicator" data-reply-id="${msg.replyTo.id || ''}" style="cursor:pointer;" onclick="scrollToQuotedMessage(this)"><span class="reply-indicator-sender">${repliedSender}</span><span class="reply-indicator-text">${repliedText}</span></div>`;
    };

    // ==========================================
    // 3. 统计逻辑（替代 fortune.js 里的 getTopReplies，彻底解决 trim 报错）
    // 把 fortune.js 里的 getTopReplies 整个函数删掉，换成这个
    // ==========================================
    window.getTopReplies = (msgs) => {
        const countMap = {};
        msgs.forEach(msg => {
            // 直接使用万岁函数，再也不会有 trim is not a function 的报错了
            const text = window.getMsgDisplayText(msg).trim();
            if (text && text !== '[消息]') {
                countMap[text] = (countMap[text] || 0) + 1;
            }
        });
        return Object.entries(countMap)
            .map(([text, count]) => ({ text, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 5);
    };

    // ==========================================
    // 4. 统一的收藏夹渲染（替代 fortune.js 里的 renderFavorites）
    // 把 fortune.js 里的 renderFavorites 整个函数删掉，换成这个
    // ==========================================
    window.renderFavorites = function() {
        const list = document.getElementById('favorites-list');
        if (!list) return;
        const favoritedMessages = (typeof messages !== 'undefined' ? messages : [])
            .filter(m => m.favorited && m.type !== 'system');

        if (favoritedMessages.length === 0) {
            list.innerHTML = ` <div class="stats-empty-state"> <div class="stats-empty-icon"><i class="fas fa-star"></i></div> <h3>收藏夹空空如也</h3> <p>点击消息旁的 ☆ 星标即可收藏</p> </div>`;
            return;
        }

        list.innerHTML = favoritedMessages.map(msg => {
            const isUser = msg.sender === 'user';
            const senderName = isUser ? ((typeof settings !== 'undefined' && settings.myName) || '我') : ((typeof settings !== 'undefined' && settings.partnerName) || msg.sender || '对方');
            const ts = msg.timestamp ? new Date(msg.timestamp).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) : '';
            // 安全地获取显示文本，卡片会显示为 🔗 链接卡片，不会报错
            const content = msg.image 
                ? `<img src="${msg.image}" style="max-width:100%;max-height:180px;border-radius:8px;display:block;margin-top:4px;cursor:pointer;" onclick="if(typeof viewImage==='function')viewImage('${msg.image.replace(/'/g, '\\\'')}')" loading="lazy">`
                : `<div style="font-size:13px;color:var(--text-primary);line-height:1.5;word-break:break-word;">${window.getMsgDisplayText(msg)}</div>`;

            const avatarEl = isUser ? (typeof DOMElements !== 'undefined' ? DOMElements.me.avatar : null) : (typeof DOMElements !== 'undefined' ? DOMElements.partner.avatar : null);
            const avatarImg = avatarEl ? avatarEl.querySelector('img') : null;
            const avatarHtml = avatarImg 
                ? `<img src="${avatarImg.src}" style="width:28px;height:28px;border-radius:50%;object-fit:cover;flex-shrink:0;">` 
                : `<div style="width:28px;height:28px;border-radius:50%;background:rgba(var(--accent-color-rgb),0.15);display:flex;align-items:center;justify-content:center;flex-shrink:0;"><i class="fas fa-user" style="font-size:11px;color:var(--accent-color);"></i></div>`;

            return ` <div class="fav-item" style="display:flex;flex-direction:column;gap:4px; padding:12px 14px;border-radius:12px; background:var(--primary-bg); border:1px solid var(--border-color); margin-bottom:10px; position:relative;"> <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;"> ${avatarHtml} <span style="font-size:12px;font-weight:600;color:var(--accent-color);">${senderName}</span> <span style="font-size:11px;color:var(--text-secondary);margin-left:auto;padding-right:24px;">${ts}</span> </div> <div style="font-size:13px;color:var(--text-primary);line-height:1.5;word-break:break-word;">${content}</div> <button class="fav-remove-btn" data-id="${msg.id}" style="position:absolute;top:8px;right:10px; background:none;border:none;cursor:pointer; color:var(--text-secondary);font-size:14px;padding:2px 4px; opacity:0.6;" title="取消收藏"><i class="fas fa-star" style="color:var(--accent-color);"></i></button> </div>`;
        }).join('');

        // 绑定取消收藏事件
        list.querySelectorAll('.fav-remove-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const id = Number(btn.dataset.id);
                const msg = (typeof messages !== 'undefined' ? messages : []).find(m => m.id === id);
                if (msg) {
                    msg.favorited = false;
                    if (typeof throttledSaveData === 'function') throttledSaveData();
                    if (typeof showNotification === 'function') showNotification('已取消收藏', 'success', 1500);
                    renderFavorites();
                }
            });
        });
    };

    // ==========================================
    // 5. 统一的搜索显示（替代 fortune.js 里的 _runMsgSearch）
    // 把 fortune.js 里的 window._runMsgSearch 整个函数删掉，换成这个
    // ==========================================
    window._runMsgSearch = function() {
        const input = document.getElementById('msg-search-input');
        const dateFrom = document.getElementById('msg-search-date-from');
        const dateTo = document.getElementById('msg-search-date-to');
        const resultsEl = document.getElementById('msg-search-results');
        if (!resultsEl) return;

        const q = (input ? input.value.trim() : '').toLowerCase();
        const from = dateFrom && dateFrom.value ? new Date(dateFrom.value) : null;
        const to = dateTo && dateTo.value ? new Date(dateTo.value + 'T23:59:59') : null;

        if (!q && !from && !to) {
            resultsEl.innerHTML = '<div style="text-align:center;padding:30px;color:var(--text-secondary);font-size:13px;">输入关键词或选择日期开始搜索</div>';
            return;
        }

        const allMessages = typeof messages !== 'undefined' ? messages : [];
        const results = allMessages.filter(m => {
            if (m.type === 'system') return false;
            const ts = m.timestamp ? new Date(m.timestamp) : null;
            if (from && ts && ts < from) return false;
            if (to && ts && ts > to) return false;
            if (q && m.text && typeof m.text === 'string' && m.text.toLowerCase().includes(q)) return true;
            return !q; // date-only filter
        });

        if (results.length === 0) {
            resultsEl.innerHTML = `<div style="text-align:center;padding:30px;color:var(--text-secondary);font-size:13px;">未找到 "${q || '相关'}" 的消息</div>`;
            return;
        }

        const myAvatarEl = typeof DOMElements !== 'undefined' ? DOMElements.me.avatar : null;
        const partnerAvatarEl = typeof DOMElements !== 'undefined' ? DOMElements.partner.avatar : null;
        const myImg = myAvatarEl ? myAvatarEl.querySelector('img') : null;
        const partnerImg = partnerAvatarEl ? partnerAvatarEl.querySelector('img') : null;

        function getAvatarHtml(isUser) {
            const img = isUser ? myImg : partnerImg;
            if (img) return `<img src="${img.src}" style="width:28px;height:28px;border-radius:50%;object-fit:cover;flex-shrink:0;">`;
            return `<div style="width:28px;height:28px;border-radius:50%;background:rgba(var(--accent-color-rgb),0.15);display:flex;align-items:center;justify-content:center;flex-shrink:0;"><i class="fas fa-user" style="font-size:11px;color:var(--accent-color);"></i></div>`;
        }

        function highlight(text, keyword) {
            if (!keyword) return text.replace(/</g, '&lt;').replace(/>/g, '&gt;');
            const escaped = text.replace(/</g, '&lt;').replace(/>/g, '&gt;');
            const re = new RegExp('(' + keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'gi');
            return escaped.replace(re, '<mark style="background:rgba(var(--accent-color-rgb),0.25);color:var(--accent-color);border-radius:2px;padding:0 1px;">$1</mark>');
        }

        resultsEl.innerHTML = results.slice(0, 100).map(msg => {
            const isUser = msg.sender === 'user';
            const senderName = isUser ? ((typeof settings !== 'undefined' && settings.myName) || '我') : ((typeof settings !== 'undefined' && settings.partnerName) || msg.sender || '对方');
            const ts = msg.timestamp ? new Date(msg.timestamp).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) : '';
            const content = msg.text && typeof msg.text === 'string' 
                ? highlight(msg.text, q) 
                : (msg.image ? `<img src="${msg.image}" style="max-height:60px;border-radius:6px;display:block;margin-top:4px;" loading="lazy">` : '特殊消息');

            return `<div style="display:flex;gap:10px;align-items:flex-start;padding:11px 12px;border-radius:12px;background:var(--primary-bg);border:1px solid var(--border-color);margin-bottom:8px;cursor:pointer;" onclick="if(typeof showNotification==='function')showNotification('已定位消息', 'info', 1500); if(typeof scrollToQuotedMessage==='function'){var el=document.createElement('div');el.dataset.replyId='${msg.id}';scrollToQuotedMessage(el);}"> ${getAvatarHtml(isUser)} <div style="flex:1;min-width:0;"> <div style="display:flex;align-items:center;gap:6px;margin-bottom:3px;"> <span style="font-size:12px;font-weight:600;color:var(--accent-color);">${senderName}</span> <span style="font-size:11px;color:var(--text-secondary);">${ts}</span> </div> <div style="font-size:13px;color:var(--text-primary);line-height:1.5;word-break:break-word;overflow:hidden;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;">${content}</div> </div> </div>`;
        }).join('') + (results.length > 100 ? `<div style="text-align:center;padding:10px;font-size:12px;color:var(--text-secondary);">仅显示前100条，共找到 ${results.length} 条</div>` : '');
    };
    // ==========================================
    // 批量收藏全家桶（唯一真身：内联样式 + 小圆圈版）
    // ==========================================

    // 防止报错的全局变量初始化
    if (typeof isBatchFavoriteMode === 'undefined') window.isBatchFavoriteMode = false;
    if (typeof selectedMessages === 'undefined') window.selectedMessages = [];

const batchStyle = document.createElement('style');
batchStyle.textContent = `
    .message-wrapper { position: relative; }
    .message-wrapper .batch-check-circle { display: none; position: absolute; left: -30px; top: 50%; transform: translateY(-50%); width: 20px; height: 20px; border-radius: 50%; border: 2px solid rgba(150,150,150,0.6); background: var(--primary-bg, #fff); z-index: 10; cursor: pointer; transition: all 0.2s ease; box-shadow: 0 1px 4px rgba(0,0,0,0.1); }
    .message-wrapper .batch-check-circle:hover { border-color: var(--accent-color); }
    body.batch-favorite-mode .message-wrapper { margin-left: 28px; }
    body.batch-favorite-mode .message-wrapper .batch-check-circle { display: block; }
    body.batch-favorite-mode .message-wrapper.selected .batch-check-circle { background: var(--accent-color); border-color: var(--accent-color); transform: translateY(-50%) scale(1.1); }
    body.batch-favorite-mode .message-wrapper.selected .batch-check-circle::after { content: ''; position: absolute; left: 50%; top: 50%; width: 5px; height: 9px; border: solid #fff; border-width: 0 2px 2px 0; transform: translate(-50%, -60%) rotate(45deg); }

`;
document.head.appendChild(batchStyle);


    window.toggleBatchFavoriteMode = function() {
        window.isBatchFavoriteMode = !window.isBatchFavoriteMode;
        window.selectedMessages = [];
        if (window.isBatchFavoriteMode) {
            document.body.classList.add('batch-favorite-mode');
            window.showBatchFavoriteActions();
            showNotification('批量收藏模式已开启，点击左侧圆圈选择', 'info');
        } else {
            document.body.classList.remove('batch-favorite-mode');
            window.hideBatchFavoriteActions();
            showNotification('批量收藏模式已关闭', 'info');
        }
        renderMessages(true);
    };

    window.hideBatchFavoriteActions = function() {
        const actions = document.querySelector('.batch-favorite-actions');
        if (actions) { actions.style.animation = 'floatUpAction 0.3s reverse forwards'; setTimeout(() => actions.remove(), 300); }
    };

    window.showBatchFavoriteActions = function() {
        if (document.querySelector('.batch-favorite-actions')) return;
        const actions = document.createElement('div');
        actions.className = 'batch-favorite-actions';
        actions.innerHTML = `<button class="batch-action-btn-pill batch-btn-cancel" id="cancel-batch-favorite"><i class="fas fa-times"></i> 取消</button><button class="batch-action-btn-pill batch-btn-confirm" id="confirm-batch-favorite"><i class="fas fa-check"></i> 确认收藏 (0)</button>`;
        document.body.appendChild(actions);
        document.getElementById('confirm-batch-favorite').addEventListener('click', () => {
            if (window.selectedMessages.length === 0) { showNotification('请先选择要收藏的消息', 'warning'); return; }
            const count = window.selectedMessages.length;
            window.selectedMessages.forEach(msgId => { const message = messages.find(m => m.id === msgId); if (message) message.favorited = true; });
            throttledSaveData();
            window.toggleBatchFavoriteMode();
            window.renderFavorites(); 
            showNotification(`已成功收藏 ${count} 条消息`, 'success');
        });
        document.getElementById('cancel-batch-favorite').addEventListener('click', () => { window.toggleBatchFavoriteMode(); });
    };

   // 最稳定版：给消息左边塞个圆圈
function injectBatchCircles() {
    document.querySelectorAll('.message-wrapper').forEach(wrapper => {
        if (wrapper.querySelector('.batch-check-circle')) return; 
        const circle = document.createElement('div');
        circle.className = 'batch-check-circle';
        circle.addEventListener('click', function(e) {
            e.stopPropagation();
            if (!window.isBatchFavoriteMode) return;
            const msgId = Number(wrapper.dataset.id);
            const index = window.selectedMessages.indexOf(msgId);
            if (index > -1) { window.selectedMessages.splice(index, 1); wrapper.classList.remove('selected'); }
            else { window.selectedMessages.push(msgId); wrapper.classList.add('selected'); }
            const confirmBtn = document.getElementById('confirm-batch-favorite');
            if (confirmBtn) confirmBtn.textContent = `确认收藏 (${window.selectedMessages.length})`;
        });
        wrapper.insertBefore(circle, wrapper.firstChild);
    });
}




    // 暴露初始化接口
    window.initMessageManager = function() {
        initMessageActions(); // 初始化普通操作（单条收藏、删除等）
        injectBatchCircles(); // 初始画一次小圆圈
        // 监听页面变动（下拉加载、切换模式时自动补画）
        const chatContainer = document.getElementById('chat-container');
        if (chatContainer) { new MutationObserver(() => injectBatchCircles()).observe(chatContainer, { childList: true, subtree: true }); }
        console.log('[消息管理器] 初始化完成，长按事件与批量圆圈已接管');
    };

})();
