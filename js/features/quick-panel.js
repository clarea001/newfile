/*
 * quick-panel.js - 底部快捷面板逻辑
 */
(function() {
    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    const panel = document.getElementById('user-sticker-picker');
    const triggerBtn = document.getElementById('combo-btn');
    const contentArea = document.getElementById('combo-content-area');
    
    if (!panel || !triggerBtn || !contentArea) return;
    
    let currentTab = 'my-sticker';

    function getFileBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = e => resolve(e.target.result);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    function getMyStickers() {
        return typeof myStickerLibrary !== 'undefined' ? myStickerLibrary : window.myStickerLibrary || [];
    }

    function setMyStickers(arr) {
        if (typeof myStickerLibrary !== 'undefined') myStickerLibrary = arr;
        window.myStickerLibrary = arr;
    }

    function init() {
        panel.querySelectorAll('.combo-tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                panel.querySelectorAll('.combo-tab-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                currentTab = btn.dataset.tab;
                renderContent(currentTab);
            });
        });

        triggerBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const isActive = panel.classList.contains('active');
            if (isActive) {
                panel.classList.remove('active');
            } else {
                panel.classList.add('active');
                renderContent(currentTab);
            }
        });

        document.addEventListener('click', (e) => {
            if (!panel.contains(e.target) && !triggerBtn.contains(e.target)) {
                panel.classList.remove('active');
            }
        });

        renderContent(currentTab);
    }

    function renderContent(tab) {
        contentArea.innerHTML = '';
        if (tab === 'my-sticker') renderMyStickers();
        else if (tab === 'poke') renderPokeMenu();
        else if (tab === 'fast-tap') renderFastTapMenu(); 
    }

    function renderMyStickers() {
        contentArea.innerHTML = '';
        const addBtn = document.createElement('button');
        addBtn.style.cssText = "background:var(--accent-color);border:none;cursor:pointer;padding:8px 12px;color:#fff;font-size:12px;font-weight:700;display:flex;align-items:center;gap:6px;border-radius:8px;width:100%;justify-content:center;margin-bottom:12px;box-shadow:0 2px 8px rgba(var(--accent-color-rgb),0.35);";
        addBtn.innerHTML = '<i class="fas fa-plus"></i> 添加我的表情';
        addBtn.onclick = (e) => { e.stopPropagation(); handleAddSticker(); };
        contentArea.appendChild(addBtn);

        if (!window.myStickerLibrary || window.myStickerLibrary.length === 0) {
            const tip = document.createElement('div');
            tip.style.cssText = 'text-align:center; padding:30px 0; color:var(--text-secondary); font-size:13px;';
            tip.innerHTML = '<i class="fas fa-image" style="font-size:24px;display:block;margin-bottom:8px;opacity:0.5;"></i>还没有表情，点击上方添加';
            contentArea.appendChild(tip);
            return;
        }

        const uniqueStickers = [...new Set(window.myStickerLibrary)];
        const grid = document.createElement('div');
        grid.style.cssText = 'display:grid; grid-template-columns:repeat(4, 1fr); gap:8px;';

        uniqueStickers.forEach((src) => {
            const item = document.createElement('div');
            item.style.cssText = 'position:relative; aspect-ratio:1; border-radius:8px; overflow:hidden; cursor:pointer; background:var(--secondary-bg);';
            const stickerInitOpacity = isTouchDevice ? '0.5' : '0';
            item.innerHTML = `
                <img src="${src}" style="width:100%; height:100%; object-fit:cover;">
                <div class="qp-del-btn" style="position:absolute; top:2px; right:2px; width:16px; height:16px; background:rgba(0,0,0,0.6); border-radius:50%; display:flex; align-items:center; justify-content:center; cursor:pointer; font-size:8px; color:#fff; opacity:${stickerInitOpacity}; transition:opacity 0.2s; z-index:2;"><i class="fas fa-times"></i></div>
            `;
            if (!isTouchDevice) {
                item.onmouseenter = () => item.querySelector('.qp-del-btn').style.opacity = '1';
                item.onmouseleave = () => item.querySelector('.qp-del-btn').style.opacity = '0';
            }
            item.querySelector('img').onclick = (e) => { e.stopPropagation(); if (typeof sendMessage === 'function') sendMessage(null, 'normal', src); panel.classList.remove('active'); };
            item.querySelector('.qp-del-btn').onclick = (e) => {
                e.stopPropagation();
                if (confirm('确定要删除这个表情吗？')) {
                    const originalIndex = window.myStickerLibrary.indexOf(src);
                    if (originalIndex > -1) { window.myStickerLibrary.splice(originalIndex, 1); if (typeof throttledSaveData === 'function') throttledSaveData(); showNotification('已删除表情', 'success'); renderMyStickers(); }
                }
            };
            grid.appendChild(item);
        });
        contentArea.appendChild(grid);
    }

    async function handleAddSticker() {
        const input = document.createElement('input');
        input.type = 'file'; input.accept = 'image/*'; input.multiple = true;
        input.onchange = async (e) => {
            const files = Array.from(e.target.files); if (!files.length) return;
            const validFiles = files.filter(f => f.size <= 2 * 1024 * 1024);
            if (files.length > validFiles.length) showNotification('部分图片超过2MB已跳过', 'warning');
            if(validFiles.length === 0) return;
            showNotification(`正在处理 ${validFiles.length} 张图片...`, 'info');
            let ok = 0, dup = 0;
            const tasks = validFiles.map(file => new Promise((resolve) => {
                const reader = new FileReader();
                reader.onload = (ev) => { const b = ev.target.result; if (typeof myStickerLibrary === 'undefined') window.myStickerLibrary = []; if (window.myStickerLibrary.includes(b)) dup++; else { window.myStickerLibrary.push(b); ok++; } resolve(); };
                reader.onerror = () => resolve(); reader.readAsDataURL(file);
            }));
            await Promise.all(tasks);
            try { await localforage.setItem(`${APP_PREFIX}${SESSION_ID}_myStickerLibrary`, window.myStickerLibrary); } catch (err) { console.error(err); }
            if (ok === 0 && dup > 0) showNotification(`检测到有重复表情包 已清除`, 'info');
            else if (ok > 0 && dup > 0) showNotification(`成功添加 ${ok} 张，检测到 ${dup} 张重复已清除`, 'success');
            else if (ok > 0) showNotification(`✓ 成功添加 ${ok} 张表情`, 'success');
            renderMyStickers();
        };
        input.click();
    }

    function renderPokeMenu() {
        const wrapper = document.createElement('div');
        wrapper.style.cssText = 'display:flex; flex-direction:column; gap:8px;';
        const customBtn = document.createElement('button');
        customBtn.className = 'custom-poke-btn';
        customBtn.innerHTML = '<i class="fas fa-plus"></i> 添加新动作';
        customBtn.style.cssText = `padding: 11px 14px; background: linear-gradient(135deg, var(--accent-color), rgba(var(--accent-color-rgb),0.8)); color: #fff; border: none; border-radius: 12px; cursor: pointer; font-weight: 600; font-size: 13px; width: 100%; letter-spacing: 0.3px; margin-top: 4px; box-shadow: 0 4px 14px rgba(var(--accent-color-rgb), 0.25);`;
        customBtn.onclick = (e) => {
            e.stopPropagation(); customBtn.style.display = 'none';
            const inputWrapper = document.createElement('div'); inputWrapper.style.cssText = 'display:flex; gap:6px; animation:fadeIn 0.2s ease;';
            const input = document.createElement('input'); input.type = 'text'; input.placeholder = '输入新的拍一拍动作...';
            input.style.cssText = 'flex:1; padding:8px 12px; border:1.5px solid var(--accent-color); border-radius:8px; background:var(--primary-bg); color:var(--text-primary); font-size:13px; outline:none; font-family:var(--font-family); box-shadow:0 0 0 3px rgba(var(--accent-color-rgb,224,105,138),0.15);';
            const saveBtn = createSaveBtn(), cancelBtn = createCancelBtn();
            saveBtn.onclick = (e) => { e.stopPropagation(); const t = input.value.trim(); if(!t){showNotification('请输入动作内容','error');input.focus();input.style.animation='none';void input.offsetWidth;input.style.animation='shake 0.3s ease';return;} if(!settings.myPokeList)settings.myPokeList=[]; if(settings.myPokeList.includes(t)){showNotification('这个动作已经存在了','warning');input.focus();return;} settings.myPokeList.push(t); if(typeof throttledSaveData==='function')throttledSaveData(); showNotification('动作已添加 ✓','success',1500); contentArea.innerHTML=''; renderPokeMenu(); };
            cancelBtn.onclick = (e) => { e.stopPropagation(); inputWrapper.remove(); customBtn.style.display=''; };
            input.addEventListener('keydown', (e) => { if(e.key==='Enter'){e.preventDefault();saveBtn.click();}else if(e.key==='Escape'){cancelBtn.click();} });
            inputWrapper.append(input, saveBtn, cancelBtn); customBtn.parentNode.insertBefore(inputWrapper, customBtn.nextSibling); input.focus();
        };
        wrapper.appendChild(customBtn);

        // 修复拍一拍的同样Bug
        if (typeof settings.myPokeList === 'undefined') {
            settings.myPokeList = ["拍了拍对方的头", "戳了戳对方的脸颊", "抱住了对方", "给对方比了个心", "牵起了对方的手"];
            if (typeof throttledSaveData === 'function') throttledSaveData();
        }
        let pokeList = settings.myPokeList;

        if (pokeList.length === 0) {
            const tip = document.createElement('div'); tip.style.cssText = 'text-align:center; padding:30px 0; color:var(--text-secondary); font-size:13px;'; tip.innerHTML = '<i class="fas fa-hand-point-up" style="font-size:24px;display:block;margin-bottom:8px;opacity:0.5;"></i>还没有动作，点击上方添加'; wrapper.appendChild(tip);
        } else {
            pokeList.forEach((text, index) => {
                const item = document.createElement('div'); item.className = 'poke-quick-item';
                item.style.cssText = `padding: 10px 14px; background: linear-gradient(135deg, var(--secondary-bg), rgba(var(--accent-color-rgb),0.04)); border: 1px solid rgba(var(--accent-color-rgb),0.15); border-radius: 12px; cursor: pointer; text-align: left; font-size: 13px; transition: all 0.22s cubic-bezier(0.4,0,0.2,1); color: var(--text-primary); font-family: var(--font-family); display:flex; align-items:center; justify-content:space-between; gap:8px;`;
                const pokeInitOpacity = isTouchDevice ? '0.4' : '0';
                item.innerHTML = `<span style="flex:1; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; cursor:pointer;">${text}</span><div class="qp-del-btn" style="position:relative; width:20px; height:20px; background:rgba(0,0,0,0.15); border-radius:50%; display:flex; align-items:center; justify-content:center; cursor:pointer; font-size:9px; color:var(--text-secondary); opacity:${pokeInitOpacity}; transition:opacity 0.2s; flex-shrink:0;"><i class="fas fa-times"></i></div>`;
                if (!isTouchDevice) { item.onmouseenter = () => { item.style.background='linear-gradient(135deg, rgba(var(--accent-color-rgb),0.12), rgba(var(--accent-color-rgb),0.06))'; item.style.borderColor='var(--accent-color)'; item.style.transform='translateX(4px)'; item.querySelector('.qp-del-btn').style.opacity='1'; }; item.onmouseleave = () => { item.style.background='linear-gradient(135deg, var(--secondary-bg), rgba(var(--accent-color-rgb),0.04))'; item.style.borderColor='rgba(var(--accent-color-rgb),0.15)'; item.style.transform=''; item.querySelector('.qp-del-btn').style.opacity='0'; }; }
                item.querySelector('span').onclick = (e) => { e.stopPropagation(); if(typeof addMessage==='function'){const name=(window.settings&&window.settings.myName)?window.settings.myName:'我';const formattedText=typeof window._formatPokeText==='function'?window._formatPokeText(`${name} ${text}`):`${name} ${text}`;addMessage({id:Date.now(),text:formattedText,timestamp:new Date(),type:'system',sender:'user'});} panel.classList.remove('active'); if(typeof simulateReply==='function')setTimeout(simulateReply,1500); };
                item.querySelector('.qp-del-btn').onclick = (e) => { e.stopPropagation(); if(confirm('确定要删除这个动作吗？')){settings.myPokeList=settings.myPokeList.filter(item=>item&&item.trim()!=='');const filteredList=settings.myPokeList.filter((_,i)=>i!==index);settings.myPokeList=filteredList;if(typeof throttledSaveData==='function')throttledSaveData();showNotification('已删除该动作','success');contentArea.innerHTML='';renderPokeMenu();} };
                wrapper.appendChild(item);
            });
        }
        contentArea.appendChild(wrapper);
    }

    // ==========================================
    // 新增：快捷输入面板逻辑
    // ==========================================
   /* function ShareCardParser() {}

        // 把原本的配置挂在这个函数身上，当成它的静态属性
        ShareCardParser.styles = {
            xiaohongshu: { match: (url) => /xiaohongshu\.com/.test(url), bg: 'linear-gradient(135deg, #ff2442, #ff6699)', textColor: '#fff', appName: '小红书', icon: 'fas fa-book-open', type: 'auto' },
            bilibili: { match: (url) => /bilibili\.com|b23\.tv/.test(url), bg: 'linear-gradient(135deg, #fb7299, #ffaabc)', textColor: '#fff', appName: '哔哩哔哩', icon: 'fas fa-play-circle', type: 'auto' },
            netease: { match: (url) => /music\.163\.com/.test(url), bg: 'linear-gradient(135deg, #e60026, #f0939b)', textColor: '#fff', appName: '网易云音乐', icon: 'fas fa-music', type: 'manual' },
            qqmusic: { match: (url) => /y\.qq\.com/.test(url), bg: 'linear-gradient(135deg, #31c27c, #36d98a)', textColor: '#fff', appName: 'QQ音乐', icon: 'fas fa-compact-disc', type: 'manual' }
        };

        ShareCardParser.parse = function(rawText) {
            const realUrlMatch = rawText.match(/(https?:\/\/[^\s]+)/i);
            if (!realUrlMatch) return null;
            
            let url = realUrlMatch[1].trim();
            let textBeforeUrl = rawText.substring(0, rawText.indexOf(url)).trim();

            for (const [key, config] of Object.entries(this.styles)) {
                if (config.match(url)) {
                    let title = '';
                    if (config.type === 'auto') {
                        let cleanText = textBeforeUrl.replace(/[\]】].*$/, '');
                        cleanText = cleanText.replace(/^.*[\[【]/, '');
                        title = cleanText.trim();
                    } else {
                        title = '';
                    }
                    return {
                        type: 'share-card',
                        platform: key,
                        title: title,
                        url: url,
                        style: { bg: config.bg, textColor: config.textColor, appName: config.appName, icon: config.icon },
                        needManualTitle: config.type === 'manual'
                    };
                }
            }
            return null;
        };
        ShareCardParser.createCardElement = function(data) {
            const card = document.createElement('div');
            card.className = 'share-card-msg';
            
            // ================= 统一版：白底大图流 =================
            card.style.cssText = `
                display: flex; align-items: stretch; 
                width: 235px; border-radius: 10px; overflow: hidden;
                background: var(--primary-bg, #ffffff); 
                cursor: pointer; font-family: var(--font-family);
                transition: transform 0.2s cubic-bezier(.4,0,.2,1), box-shadow 0.2s cubic-bezier(.4,0,.2,1);
                box-shadow: 0 1px 6px rgba(0,0,0,0.06);
                border: 1px solid rgba(0,0,0,0.05);
            `;
            
            // 鼠标交互：轻微上浮 + 阴影加深
            card.onmouseenter = () => {
                card.style.transform = 'translateY(-2px)';
                card.style.boxShadow = '0 8px 24px rgba(0,0,0,0.1)';
            };
            card.onmouseleave = () => {
                card.style.transform = '';
                card.style.boxShadow = '0 1px 6px rgba(0,0,0,0.06)';
            };
            card.onclick = () => window.open(data.url, '_blank');

            // 左侧：品牌色占位图区域
            const imgDiv = document.createElement('div');
            imgDiv.style.cssText = `
                width: 88px; flex-shrink: 0; 
                background: ${data.style.bg}; 
                display: flex; align-items: center; justify-content: center;
                transition: transform 0.3s ease;
            `;
            // 放大镜效果容器
            const iconWrap = document.createElement('div');
            iconWrap.style.cssText = 'transition: transform 0.3s ease;';
            iconWrap.innerHTML = `<i class="${data.style.icon}" style="font-size: 32px; color: rgba(255,255,255,0.9); filter: drop-shadow(0 2px 4px rgba(0,0,0,0.1));"></i>`;
            imgDiv.appendChild(iconWrap);
            
            // 鼠标放上去时，左边图标微微变大
            card.onmouseenter = () => { iconWrap.style.transform = 'scale(1.1)'; };
            card.onmouseleave = () => { iconWrap.style.transform = 'scale(1)'; };

            // 右侧：文本信息区
            const textDiv = document.createElement('div');
            textDiv.style.cssText = `
                flex: 1; padding: 10px 12px; 
                display: flex; flex-direction: column; justify-content: center; gap: 8px; 
                min-width: 0; border-left: 1px solid rgba(0,0,0,0.03);
            `;
            
            // 标题：有标题显示标题，没标题显示"点击前往XX"
            const displayTitle = data.title || `点击前往${data.style.appName}`;
            const titleEl = document.createElement('div');
            titleEl.style.cssText = `
                font-size: 13px; font-weight: 600; color: var(--text-primary, #1a1a1a); 
                line-height: 1.4; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
            `;
            titleEl.textContent = displayTitle;

            // 底部来源
            const sourceEl = document.createElement('div');
            sourceEl.style.cssText = `
                font-size: 11px; color: var(--text-secondary, #999); 
                display: flex; align-items: center; gap: 4px; font-weight: 400;
            `;
            sourceEl.innerHTML = `<i class="${data.style.icon}" style="font-size: 10px;"></i> ${data.style.appName}`;

            textDiv.appendChild(titleEl);
            textDiv.appendChild(sourceEl);

            card.appendChild(imgDiv);
            card.appendChild(textDiv);

            return card;
        };


        // 暴露给全局，让 core.js 也能找到它画图
        window.ShareCardParser = ShareCardParser;
    // ==========================================*/
// ==========================================
// 快捷输入面板逻辑：分享卡片解析器（终极修复版）
// ==========================================
function ShareCardParser() {}

// 1. 域名特征词字典
ShareCardParser.platforms = {
    xiaohongshu: { keywords: ['xhs', 'xiaohongshu'], bg: 'linear-gradient(135deg, #ff2442, #ff6699)', textColor: '#fff', appName: '小红书', icon: 'fas fa-book-open' },
    bilibili: { keywords: ['bilibili', 'b23'], bg: 'linear-gradient(135deg, #fb7299, #ffaabc)', textColor: '#fff', appName: '哔哩哔哩', icon: 'fas fa-play-circle' },
    netease: { keywords: ['163', 'music.163'], bg: 'linear-gradient(135deg, #e60026, #f0939b)', textColor: '#fff', appName: '网易云音乐', icon: 'fas fa-music' },
    qqmusic: { keywords: ['y.qq', 'qq.com'], bg: 'linear-gradient(135deg, #31c27c, #36d98a)', textColor: '#fff', appName: 'QQ音乐', icon: 'fas fa-compact-disc' },
    douyin: { keywords: ['douyin', 'iesdouyin'], bg: 'linear-gradient(135deg, #111, #333)', textColor: '#fff', appName: '抖音', icon: 'fas fa-video' },
    taobao: { keywords: ['taobao', 'tb.cn', 'm.tb', 'e.tb'], bg: 'linear-gradient(135deg, #ff5000, #ff8533)', textColor: '#fff', appName: '淘宝', icon: 'fas fa-shopping-bag' },
    pinduoduo: { keywords: ['pinduoduo', 'yangkeduo'], bg: 'linear-gradient(135deg, #e02e24, #f56b6b)', textColor: '#fff', appName: '拼多多', icon: 'fas fa-tags' }
};

// 2. 主解析函数（核心调度中心）
ShareCardParser.parse = function(rawText) {
    const realUrlMatch = rawText.match(/(https?:\/\/[^\s]+)/i);
    if (!realUrlMatch) return null;
    
    let url = realUrlMatch[1].trim();
    let textBeforeUrl = rawText.substring(0, rawText.indexOf(url)).trim();
    
    let hostname = '';
    try { hostname = new URL(url).hostname.toLowerCase(); } catch(e) { return null; }

    for (const [key, config] of Object.entries(this.platforms)) {
        const isMatch = config.keywords.some(kw => hostname.includes(kw));
        if (isMatch) {
            let title = '';
            
            // ==============================================
            // 核心修复点：电商平台走“反向提取”，绝对不走常规防线
            // ==============================================
            if (['taobao'].includes(key)) {
                title = this._extractEcommerceTitle(rawText, url);
            } else {
                // 其他平台：只处理链接前面的文本，走常规三道防线
                title = this._cleanGenericTitle(textBeforeUrl);
            }

            return {
                type: 'share-card',
                platform: key,
                title: title,
                url: url,
                style: { bg: config.bg, textColor: config.textColor, appName: config.appName, icon: config.icon },
                needManualTitle: false
            };
        }
    }
    return null;
};

// 3. 电商专属提取（只看链接后面，无视前面的一切中括号）
ShareCardParser._extractEcommerceTitle = function(rawText, url) {
    // 截取链接后面的所有内容
    let afterUrl = rawText.substring(rawText.indexOf(url) + url.length).trim();
    
    if (!afterUrl) return ''; // 如果链接后面没字，直接空字符串，走最终的兜底UI

    // 砍掉淘口令：类似 MF937 、 €hfDj3syPMfP€ 、 ( CZ0001 xxx ) 这类垃圾
    afterUrl = afterUrl.replace(/[￥¥€$\(（]\s*[\w\s]{6,15}\s*[￥¥€$\)）]/g, '');
    afterUrl = afterUrl.replace(/^\s*[a-zA-Z0-9]{5,8}\s+/g, ''); // 砍掉开头独立的短码
    
    // 清理首尾标点和空格
    afterUrl = afterUrl.replace(/^[\s:：，,。.！!？?]+|[\s:：，,。.！!？?]+$/g, '').trim();

    // 只要剩下的字数大于2，就认为是真标题
    return afterUrl.length >= 2 ? afterUrl : '';
};

// 4. 通用标题清洗（三道防线，只处理非电商平台）
ShareCardParser._cleanGenericTitle = function(text) {
    if (!text) return '';
    
    // 第一道：抓《书名号》
    const bookMatch = text.match(/《(.+?)》/);
    if (bookMatch) return bookMatch[1].trim();

    // 第二道：砍【中括号】
    const bracketMatch = text.match(/【(.+?)】/);
    if (bracketMatch) return bracketMatch[1].trim();

    // 第三道：暴力去水
    text = text.replace(/^[A-Za-z0-9\.\s@#\$%\^&\*\-_+=!]+(?=[\u4e00-\u9fa5])/g, '');
    text = text.replace(/(复制此链接|打开|看看精彩作品|快来看|刚刚发布了一篇笔记|快去打开手机|我在.*发现了一个不一样|复制这条信息)/g, '');
    text = text.replace(/[\s:：，,。.！!？?]+$/g, '').trim();
    
    return text.length >= 2 ? text : '';
};

// 5. 渲染卡片UI
ShareCardParser.createCardElement = function(data) {
    const card = document.createElement('div');
    card.className = 'share-card-msg';
    
    card.style.cssText = `
        display: flex; align-items: stretch; 
        width: 235px; border-radius: 10px; overflow: hidden;
        background: var(--primary-bg, #ffffff); 
        cursor: pointer; font-family: var(--font-family);
        transition: transform 0.2s cubic-bezier(.4,0,.2,1), box-shadow 0.2s cubic-bezier(.4,0,.2,1);
        box-shadow: 0 1px 6px rgba(0,0,0,0.06);
        border: 1px solid rgba(0,0,0,0.05);
    `;
    
    card.onmouseenter = () => {
        card.style.transform = 'translateY(-2px)';
        card.style.boxShadow = '0 8px 24px rgba(0,0,0,0.1)';
        iconWrap.style.transform = 'scale(1.1)';
    };
    card.onmouseleave = () => {
        card.style.transform = '';
        card.style.boxShadow = '0 1px 6px rgba(0,0,0,0.06)';
        iconWrap.style.transform = 'scale(1)';
    };
    card.onclick = () => {
        // 系统弹窗询问是否跳转
        if (confirm(`即将离开应用前往外部链接：\n${data.url}\n\n是否继续？`)) {
            window.open(data.url, '_blank');
        }
    };
    const imgDiv = document.createElement('div');
    imgDiv.style.cssText = `
        width: 88px; flex-shrink: 0; 
        background: ${data.style.bg}; 
        display: flex; align-items: center; justify-content: center;
    `;
    const iconWrap = document.createElement('div');
    iconWrap.style.cssText = 'transition: transform 0.3s ease;';
    iconWrap.innerHTML = `<i class="${data.style.icon}" style="font-size: 32px; color: rgba(255,255,255,0.9); filter: drop-shadow(0 2px 4px rgba(0,0,0,0.1));"></i>`;
    imgDiv.appendChild(iconWrap);

    const textDiv = document.createElement('div');
    textDiv.style.cssText = `
        flex: 1; padding: 10px 12px; 
        display: flex; flex-direction: column; justify-content: center; gap: 8px; 
        min-width: 0; border-left: 1px solid rgba(0,0,0,0.03);
    `;
    
    const displayTitle = data.title || `点击前往${data.style.appName}`;
    const titleEl = document.createElement('div');
    titleEl.style.cssText = `
        font-size: 13px; font-weight: 600; color: var(--text-primary, #1a1a1a); 
        line-height: 1.4; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
    `;
    titleEl.textContent = displayTitle;

    const sourceEl = document.createElement('div');
    sourceEl.style.cssText = `
        font-size: 11px; color: var(--text-secondary, #999); 
        display: flex; align-items: center; gap: 4px; font-weight: 400;
    `;
    sourceEl.innerHTML = `<i class="${data.style.icon}" style="font-size: 10px;"></i> ${data.style.appName}`;

    textDiv.appendChild(titleEl);
    textDiv.appendChild(sourceEl);

    card.appendChild(imgDiv);
    card.appendChild(textDiv);

    return card;
};

window.ShareCardParser = ShareCardParser;

// ==========================================

    function renderFastTapMenu() {
        const wrapper = document.createElement('div');
        wrapper.style.cssText = 'display:flex; flex-direction:column; gap:8px;';
        
        // 1. 添加新回复按钮
        const customBtn = document.createElement('button');
        customBtn.className = 'custom-fasttap-btn';
        customBtn.innerHTML = '<i class="fas fa-plus"></i> 添加新回复';
        customBtn.style.cssText = `padding: 11px 14px; background: linear-gradient(135deg, var(--accent-color), rgba(var(--accent-color-rgb),0.8)); color: #fff; border: none; border-radius: 12px; cursor: pointer; font-weight: 600; font-size: 13px; width: 100%; letter-spacing: 0.3px; margin-top: 4px; box-shadow: 0 4px 14px rgba(var(--accent-color-rgb), 0.25);`;
        
        customBtn.onclick = (e) => {
            e.stopPropagation();
            customBtn.style.display = 'none';
            
            const inputWrapper = document.createElement('div');
            inputWrapper.className = 'inline-fasttap-input-wrapper';
            inputWrapper.style.cssText = 'display:flex; gap:6px; animation:fadeIn 0.2s ease;';
            
            const input = document.createElement('input');
            input.type = 'text';
            input.placeholder = '输入快捷回复内容...';
            input.style.cssText = 'flex:1; padding:8px 12px; border:1.5px solid var(--accent-color); border-radius:8px; background:var(--primary-bg); color:var(--text-primary); font-size:13px; outline:none; font-family:var(--font-family); box-shadow:0 0 0 3px rgba(var(--accent-color-rgb,224,105,138),0.15);';
            
            const saveBtn = createSaveBtn();
            const cancelBtn = createCancelBtn();
            
            saveBtn.onclick = (e) => {
                e.stopPropagation();
                const text = input.value.trim();
                if (!text) {
                    showNotification('请输入回复内容', 'error');
                    input.focus();
                    input.style.animation = 'none';
                    void input.offsetWidth;
                    input.style.animation = 'shake 0.3s ease';
                    return;
                }
                if (!settings.myFastTapList) settings.myFastTapList = [];
                if (settings.myFastTapList.includes(text)) {
                    showNotification('这个回复已经存在了', 'warning');
                    input.focus();
                    return;
                }
                settings.myFastTapList.push(text);
                if (typeof throttledSaveData === 'function') throttledSaveData();
                showNotification('快捷回复已添加 ✓', 'success', 1500);
                contentArea.innerHTML = '';
                renderFastTapMenu();
            };
            
            cancelBtn.onclick = (e) => {
                e.stopPropagation();
                inputWrapper.remove();
                customBtn.style.display = '';
            };
            
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') { e.preventDefault(); saveBtn.click(); }
                else if (e.key === 'Escape') { cancelBtn.click(); }
            });
            
            inputWrapper.appendChild(input);
            inputWrapper.appendChild(saveBtn);
            inputWrapper.appendChild(cancelBtn);
            customBtn.parentNode.insertBefore(inputWrapper, customBtn.nextSibling);
            input.focus();
        };
        wrapper.appendChild(customBtn);

        // 2. 发送链接按钮 (紧跟在添加新回复下面)
        const linkBtn = document.createElement('button');
        linkBtn.innerHTML = '<i class="fas fa-link"></i> 发送链接';
        linkBtn.style.cssText = `padding: 10px 14px; background: var(--secondary-bg); color: var(--text-primary); border: 1px solid rgba(var(--accent-color-rgb),0.15); border-radius: 12px; cursor: pointer; font-weight: 500; font-size: 13px; width: 100%; display: flex; align-items: center; justify-content: center; gap: 6px; transition: all 0.22s cubic-bezier(0.4,0,0.2,1);`;

        if (!isTouchDevice) {
            linkBtn.onmouseenter = () => {
                linkBtn.style.background = 'linear-gradient(135deg, rgba(var(--accent-color-rgb),0.12), rgba(var(--accent-color-rgb),0.06))';
                linkBtn.style.borderColor = 'var(--accent-color)';
                linkBtn.style.color = 'var(--accent-color)';
            };
            linkBtn.onmouseleave = () => {
                linkBtn.style.background = 'var(--secondary-bg)';
                linkBtn.style.borderColor = 'rgba(var(--accent-color-rgb),0.15)';
                linkBtn.style.color = 'var(--text-primary)';
            };
        }

        linkBtn.onclick = (e) => {
            e.stopPropagation();
            linkBtn.style.display = 'none';
            
            const inputWrapper = document.createElement('div');
            inputWrapper.className = 'inline-link-input-wrapper';
            inputWrapper.style.cssText = 'display:flex; flex-direction:column; gap:6px; animation:fadeIn 0.2s ease;';
            
            const inputRow = document.createElement('div');
            inputRow.style.cssText = 'display:flex; gap:6px;';
            
            const urlInput = document.createElement('input');
            urlInput.type = 'text';
            urlInput.placeholder = '在这里粘贴分享文本或链接';
            urlInput.style.cssText = 'flex:1; padding:8px 12px; border:1.5px solid var(--accent-color); border-radius:8px; background:var(--primary-bg); color:var(--text-primary); font-size:12px; outline:none; font-family:var(--font-family); box-shadow:0 0 0 3px rgba(var(--accent-color-rgb,224,105,138),0.15);';
            
            const sendBtn = createSaveBtn();
            sendBtn.innerHTML = '<i class="fas fa-arrow-right"></i>';
            
            const cancelBtn = createCancelBtn();
            cancelBtn.title = '退出链接模式';
            
            // 恢复成“发送链接”按钮的函数
            const restoreLinkBtn = () => {
                inputWrapper.remove();
                linkBtn.style.display = '';
            };
            
            // 点击X：退出链接输入模式，变回按钮
            cancelBtn.onclick = (e) => {
                e.stopPropagation();
                restoreLinkBtn();
            };
            
            inputRow.appendChild(urlInput);
            inputRow.appendChild(sendBtn);
            inputRow.appendChild(cancelBtn);
            
            // 输入框下面的小字说明
            const linkHint = document.createElement('div');
            linkHint.textContent = '支持自动解析：小红书、B站、抖音、网易云、QQ音乐、淘宝、拼多多';
            linkHint.style.cssText = `font-size: 11px; color: var(--text-tertiary, #999); user-select: none; line-height: 1.4;`;
            
            // 发送逻辑（已移除所有手动输入标题的兼容代码）
            const handleSend = () => {
                const rawText = urlInput.value.trim();
                if (!rawText) return;
                
                if (typeof ShareCardParser !== 'undefined') {
                    const cardData = ShareCardParser.parse(rawText);
                    if (cardData) {
                        sendMessage(cardData, 'share-card', null);
                        restoreLinkBtn();
                        panel.classList.remove('active');
                        return;
                    }
                }
                // 兜底：普通文本发送
                sendMessage(rawText, 'normal', null);
                restoreLinkBtn();
                panel.classList.remove('active');
            };
            
            sendBtn.onclick = handleSend;
            urlInput.onkeydown = (e) => {
                if (e.key === 'Enter') handleSend();
                else if (e.key === 'Escape') cancelBtn.click();
            };
            
            // 组装UI并插入到按钮的位置
            inputWrapper.appendChild(inputRow);
            inputWrapper.appendChild(linkHint);
            
            linkBtn.parentNode.insertBefore(inputWrapper, linkBtn.nextSibling);
            setTimeout(() => urlInput.focus(), 50);
        };

        wrapper.appendChild(linkBtn);



        // 3. 初始化默认值 (修复Bug：仅在完全不存在时给默认值，如果被删空了则是[])
        if (typeof settings.myFastTapList === 'undefined') {
            settings.myFastTapList = ["好的", "在呢", "晚安", "我想你了", "马上来"];
            if (typeof throttledSaveData === 'function') throttledSaveData();
        }
        let fastTapList = settings.myFastTapList;

        // 4. 空状态
        if (fastTapList.length === 0) {
            const tip = document.createElement('div');
            tip.style.cssText = 'text-align:center; padding:30px 0; color:var(--text-secondary); font-size:13px;';
            tip.innerHTML = '<i class="fas fa-bolt" style="font-size:24px;display:block;margin-bottom:8px;opacity:0.5;"></i>还没有快捷回复，点击上方添加';
            wrapper.appendChild(tip);
        } else {
            // 5. 渲染列表
            fastTapList.forEach((text, index) => {
                const item = document.createElement('div');
                item.className = 'fasttap-quick-item';
                item.style.cssText = `padding: 10px 14px; background: linear-gradient(135deg, var(--secondary-bg), rgba(var(--accent-color-rgb),0.04)); border: 1px solid rgba(var(--accent-color-rgb),0.15); border-radius: 12px; cursor: pointer; text-align: left; font-size: 13px; transition: all 0.22s cubic-bezier(0.4,0,0.2,1); color: var(--text-primary); font-family: var(--font-family); display:flex; align-items:center; justify-content:space-between; gap:8px;`;
                
                const tapInitOpacity = isTouchDevice ? '0.4' : '0';
                item.innerHTML = `
                    <span style="flex:1; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; cursor:pointer;">${text}</span>
                    <div class="qp-del-btn" style="position:relative; width:20px; height:20px; background:rgba(0,0,0,0.15); border-radius:50%; display:flex; align-items:center; justify-content:center; cursor:pointer; font-size:9px; color:var(--text-secondary); opacity:${tapInitOpacity}; transition:opacity 0.2s; flex-shrink:0;"><i class="fas fa-times"></i></div>
                `;
                
                if (!isTouchDevice) {
                    item.onmouseenter = () => {
                        item.style.background = 'linear-gradient(135deg, rgba(var(--accent-color-rgb),0.12), rgba(var(--accent-color-rgb),0.06))';
                        item.style.borderColor = 'var(--accent-color)';
                        item.style.transform = 'translateX(4px)';
                        item.querySelector('.qp-del-btn').style.opacity = '1';
                    };
                    item.onmouseleave = () => {
                        item.style.background = 'linear-gradient(135deg, var(--secondary-bg), rgba(var(--accent-color-rgb),0.04))';
                        item.style.borderColor = 'rgba(var(--accent-color-rgb),0.15)';
                        item.style.transform = '';
                        item.querySelector('.qp-del-btn').style.opacity = '0';
                    };
                }
                
                item.querySelector('span').onclick = (e) => {
                    e.stopPropagation();
                    if (typeof sendMessage === 'function') sendMessage(text, 'normal', null); 
                    panel.classList.remove('active');
                };
                
                item.querySelector('.qp-del-btn').onclick = (e) => {
                    e.stopPropagation();
                    if (confirm('确定要删除这个快捷回复吗？')) {
                        settings.myFastTapList = settings.myFastTapList.filter(item => item && item.trim() !== '');
                        const filteredList = settings.myFastTapList.filter((_, i) => i !== index);
                        settings.myFastTapList = filteredList;
                        if (typeof throttledSaveData === 'function') throttledSaveData();
                        showNotification('已删除该回复', 'success');
                        contentArea.innerHTML = '';
                        renderFastTapMenu();
                    }
                };
                wrapper.appendChild(item);
            });
        }
        contentArea.appendChild(wrapper);
    }

    // 抽离出来的公共按钮生成函数
    function createSaveBtn() {
        const btn = document.createElement('button');
        btn.innerHTML = '<i class="fas fa-check"></i>';
        btn.title = '保存';
        btn.style.cssText = 'background:var(--accent-color); border:none; color:#fff; width:36px; height:36px; border-radius:8px; font-size:13px; cursor:pointer; display:flex; align-items:center; justify-content:center; flex-shrink:0; transition:transform 0.15s;';
        btn.onmousedown = () => btn.style.transform = 'scale(0.92)';
        btn.onmouseup = () => btn.style.transform = 'scale(1)';
        return btn;
    }

    function createCancelBtn() {
        const btn = document.createElement('button');
        btn.innerHTML = '<i class="fas fa-times"></i>';
        btn.title = '取消';
        btn.style.cssText = 'background:var(--border-color); border:none; color:var(--text-secondary); width:36px; height:36px; border-radius:8px; font-size:13px; cursor:pointer; display:flex; align-items:center; justify-content:center; flex-shrink:0; transition:transform 0.15s;';
        btn.onmousedown = () => btn.style.transform = 'scale(0.92)';
        btn.onmouseup = () => btn.style.transform = 'scale(1)';
        return btn;
    }

    init();
})();
