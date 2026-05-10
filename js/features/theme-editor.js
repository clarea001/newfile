/*
 * features/theme-editor.js - 主题编辑器 Theme Editor
 * 主题方案管理与头像形状设置
 */
// === 将这段加在 theme-editor.js 的最前面 ===
const APPEARANCE_PANEL_TITLES = {
  'theme': '主题配色',
  'font': '字体设置',
  'background': '聊天背景',
  'bubble': '气泡样式',
  'avatar': '聊天头像',
  'css': '自定义CSS',
  'font-bg': '背景 & 字体',
  'bubble-css': '气泡 & CSS'
};

window.showAppearancePanel = function(panel) {
  const panelMap = {
    'font-bg': ['font', 'background'],
    'bubble-css': ['bubble', 'css']
  };
  
  document.getElementById('appearance-nav-grid').style.display = 'none';
  var unBtn = document.getElementById('update-notice-btn');
  if (unBtn) unBtn.style.display = 'none';
  var galleryBanner = document.getElementById('gallery-banner-entry');
  if (galleryBanner) galleryBanner.style.display = 'none';
  
  document.getElementById('appearance-panel-container').style.display = 'block';
  document.getElementById('appearance-panel-title').textContent = APPEARANCE_PANEL_TITLES[panel] || panel;
  
  document.querySelectorAll('.appearance-sub-panel').forEach(p => p.style.display = 'none');
  
  if (panelMap[panel]) {
    panelMap[panel].forEach(sub => {
      const target = document.getElementById('appearance-panel-' + sub);
      if (target) target.style.display = 'block';
    });
  } else {
    const target = document.getElementById('appearance-panel-' + panel);
    if (target) target.style.display = 'block';
  }
  
  if (panel === 'bubble' || panel === 'bubble-css') {
    setTimeout(() => {
      if (typeof window.updateBubblePreviewFn === 'function') window.updateBubblePreviewFn();
    }, 50);
  }
};

window.hideAppearancePanel = function() {
  document.getElementById('appearance-nav-grid').style.display = 'grid';
  document.getElementById('appearance-panel-container').style.display = 'none';
  document.querySelectorAll('.appearance-sub-panel').forEach(p => p.style.display = 'none');
  
  var unBtn = document.getElementById('update-notice-btn');
  if (unBtn) unBtn.style.display = 'flex';
  var galleryBanner = document.getElementById('gallery-banner-entry');
  if (galleryBanner) galleryBanner.style.display = 'flex';
};

// 把任意 CSS 颜色转成 "r, g, b" 字符串
function colorToRgbString(cssColor) {
  if (!cssColor) return null;
  const temp = document.createElement('div');
  temp.style.color = cssColor;
  document.body.appendChild(temp);
  const computed = getComputedStyle(temp).color;
  document.body.removeChild(temp);
  const match = computed.match(/\d+/g);
  if (match && match.length >= 3) {
    return `${match[0]}, ${match[1]}, ${match[2]}`;
  }
  return null;
}

function applyCustomGlobalCss(cssString) {
    if (!cssString || !cssString.trim()) return;
    
    // 如果页面上已经有这个标签，就先移除，防止重复叠加
    let existingStyle = document.getElementById('user-custom-global-css');
    if (existingStyle) existingStyle.remove();
    
    // 创建 style 标签，把用户写的 CSS 塞进去
    const styleTag = document.createElement('style');
    styleTag.id = 'user-custom-global-css';
    styleTag.textContent = cssString;
    
    // 挂载到 head 里，这样全局生效了！
    document.head.appendChild(styleTag);
}


function applyAvatarShapeToDOM(type, shape) {
    const SHAPES = ['circle','square'];
    const avatarContainer = type === 'my' ? DOMElements.me.avatarContainer : DOMElements.partner.avatarContainer;
    if (!avatarContainer) return;
    SHAPES.forEach(s => avatarContainer.classList.remove('avatar-shape-' + s));
    if (shape && shape !== 'none') avatarContainer.classList.add('avatar-shape-' + shape);
    
    document.querySelectorAll('.message-wrapper').forEach(wrapper => {
        const isUser = wrapper.classList.contains('sent');
        if ((type === 'my' && isUser) || (type === 'partner' && !isUser)) {
            const avatarDiv = wrapper.querySelector('.message-avatar');
            if (avatarDiv) {
                SHAPES.forEach(s => avatarDiv.classList.remove('shape-' + s));
                if (shape && shape !== 'none') avatarDiv.classList.add('shape-' + shape);
            }
        }
    });
}
function setupAppearancePanelFrameSettings() {
    const setupFor = (type) => {
        const suffix = '-2';
        const preview = document.getElementById(`${type}-frame-preview${suffix}`);
        const uploadBtn = document.getElementById(`${type}-frame-upload-btn${suffix}`);
        const removeBtn = document.getElementById(`${type}-frame-remove-btn${suffix}`);
        const fileInput = document.getElementById(`${type}-frame-file-input${suffix}`);
        const sizeSlider = document.getElementById(`${type}-frame-size${suffix}`);
        const sizeValue = document.getElementById(`${type}-frame-size-value${suffix}`);
        const xSlider = document.getElementById(`${type}-frame-offset-x${suffix}`);
        const xValue = document.getElementById(`${type}-frame-offset-x-value${suffix}`);
        const ySlider = document.getElementById(`${type}-frame-offset-y${suffix}`);
        const yValue = document.getElementById(`${type}-frame-offset-y-value${suffix}`);
        if (!preview || !uploadBtn) return;

        const settingsKey = type === 'my' ? 'myAvatarFrame' : 'partnerAvatarFrame';
        const avatarContainer = type === 'my' ? DOMElements.me.avatarContainer : DOMElements.partner.avatarContainer;
        const avatarElement = type === 'my' ? DOMElements.me.avatar : DOMElements.partner.avatar;

        const updatePreview2 = () => {
            let avatarContent = avatarElement.innerHTML;
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = avatarContent;
            const img = tempDiv.querySelector('img');
            if (img) avatarContent = `<img src="${img.src}" alt="preview">`;
            const frameSettings = settings[settingsKey];
            let frameHtml = '';
            if (frameSettings && frameSettings.src) {
                const size = frameSettings.size || 100;
                const ox = frameSettings.offsetX || 0;
                const oy = frameSettings.offsetY || 0;
                frameHtml = `<img src="${frameSettings.src}" class="preview-frame" style="width:${size}%;height:${size}%;transform:translate(calc(-50% + ${ox}px),calc(-50% + ${oy}px));">`;
            }
            preview.innerHTML = `<div class="preview-bg-layer">${avatarContent}</div>${frameHtml}`;
        };

        const updateControls2 = () => {
            const frame = settings[settingsKey];
            if (sizeSlider) { sizeSlider.value = frame?.size || 100; sizeValue.textContent = `${sizeSlider.value}%`; }
            if (xSlider) { xSlider.value = frame?.offsetX || 0; xValue.textContent = `${xSlider.value}px`; }
            if (ySlider) { ySlider.value = frame?.offsetY || 0; yValue.textContent = `${ySlider.value}px`; }
            updatePreview2();
        };

        uploadBtn.addEventListener('click', () => fileInput && fileInput.click());
        if (fileInput) fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0]; if (!file) return;
            if (file.size > 1024 * 1024) { showNotification('图片大小不能超过1MB', 'error'); return; }
            const reader = new FileReader();
            reader.onload = (ev) => {
                if (!settings[settingsKey]) settings[settingsKey] = { size: 100, offsetX: 0, offsetY: 0 };
                settings[settingsKey].src = ev.target.result;
                applyAvatarFrame(avatarContainer, settings[settingsKey]);
                updateControls2(); throttledSaveData();
            };
            reader.readAsDataURL(file);
        });
        if (removeBtn) removeBtn.addEventListener('click', () => {
            settings[settingsKey] = null;
            applyAvatarFrame(avatarContainer, null);
            updateControls2(); throttledSaveData();
        });
        [sizeSlider, xSlider, ySlider].forEach(s => {
            if (!s) return;
            s.addEventListener('input', () => {
                if (!settings[settingsKey]) return;
                settings[settingsKey].size = parseInt(sizeSlider.value);
                settings[settingsKey].offsetX = parseInt(xSlider.value);
                settings[settingsKey].offsetY = parseInt(ySlider.value);
                applyAvatarFrame(avatarContainer, settings[settingsKey]);
                updateControls2(); renderMessages(true);
            });
            s.addEventListener('change', throttledSaveData);
        });
        updateControls2();
    };
    setupFor('my');
    setupFor('partner');
}
const themeColorMappings = {
    '--primary-bg': '主背景色',
    '--secondary-bg': '卡片 / 弹窗背景',
    '--header-bg': '顶栏背景',
    '--input-area-bg': '输入区背景',
    '--text-primary': '主要文字',
    '--text-secondary': '次要文字 / 占位符',
    '--border-color': '边框 / 分割线',
    '--accent-color': '主强调色（按钮 / 图标）',
    '--accent-color-dark': '强调色深色变体',
    '--message-sent-bg': '我方气泡背景',
    '--message-sent-text': '我方气泡文字',
    '--message-received-bg': '对方气泡背景',
    '--message-received-text': '对方气泡文字',
    '--favorite-color': '收藏星标颜色',
};

const themeExtraMappings = {
    '--radius': { label: '圆角半径', type: 'range', min: 0, max: 32, unit: 'px', default: '16px' },
    '--message-font-weight': { label: '消息粗细', type: 'select', options: ['300','400','500','600','700'], default: '400' },
    '--message-line-height': { label: '消息行高', type: 'range', min: 1.0, max: 2.5, step: 0.05, unit: '', default: '1.5' },
};


function initThemeEditor() {
    const modeRow = document.getElementById('theme-mode-toggle-row');
    // ==========================================
    // 1. 打开编辑器按钮（点击时同步一下夜间按钮的状态）
    // ==========================================
    const openEditorBtn = document.getElementById('open-theme-editor');

    if (openEditorBtn) {
        const newBtn = openEditorBtn.cloneNode(true);
        openEditorBtn.parentNode.replaceChild(newBtn, openEditorBtn);

        newBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log("自定义主题编辑器按钮被点击！");
            
            // 👉 每次点开编辑器，强行同步夜间模式按钮的颜色
            if (modeRow) {
                modeRow.classList.toggle('active', document.documentElement.getAttribute('data-theme') === 'dark');
            }
            
            const appearanceModal = document.getElementById('appearance-modal');
            const editorModal = document.getElementById('theme-editor-modal');

            if (appearanceModal) hideModal(appearanceModal);

            populateThemeEditor();
            populateThemeSelector();

            if (editorModal) showModal(editorModal);
        });
    }

    // ==========================================
    // 1. 夜间模式：直接挂载到 window，让 HTML 的 onclick 直接调用，拒绝任何拦截！
    // ==========================================
    window._forceToggleDark = function() {
        const modeRow = document.getElementById('theme-mode-toggle-row');
        if (!modeRow) return;
        
        // 强行切换
        modeRow.classList.toggle('active');
        const isDark = modeRow.classList.contains('active');
        
        document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
        settings.isDarkMode = isDark;
        if(typeof throttledSaveData === 'function') throttledSaveData();
        //if(typeof updateBubblePreview === 'function') updateBubblePreview();
    };

    // ==========================================
    // 3. 编辑器里的其他按钮（关闭、重置、应用等）
    // ==========================================
    const closeBtn = document.getElementById('close-theme-editor');
    if (closeBtn) {
        closeBtn.onclick = () => {
            updateUI();
            hideModal(document.getElementById('theme-editor-modal'));
        };
    }

    const resetThemeBtn = document.getElementById('reset-theme-editor');
    if (resetThemeBtn) {
        resetThemeBtn.onclick = () => {
            if (!confirm('重置将清除当前编辑器中的自定义颜色，恢复当前主题方案的默认色彩。\n\n已保存的自定义主题方案不受影响，确定重置吗？')) return;
            settings.customThemeColors = {};
            const root = document.documentElement;
            const allVars = Object.keys(Object.assign({}, themeColorMappings || {}, themeExtraMappings || {}));
            allVars.forEach(v => root.style.removeProperty(v));
            updateUI();
            populateThemeEditor();
            showNotification('已重置为当前主题默认色彩', 'success');
        };
    }

    const applyCloseBtn = document.getElementById('apply-close-theme-editor');
    if (applyCloseBtn) {
        applyCloseBtn.onclick = () => {
            const root = document.documentElement;
            const customColors = {};
            for (const variable of Object.keys(themeColorMappings)) {
                const val = root.style.getPropertyValue(variable);
                if (val) customColors[variable] = val.trim();
            }
            for (const variable of Object.keys(themeExtraMappings)) {
                const val = root.style.getPropertyValue(variable);
                if (val) customColors[variable] = val.trim();
            }
            settings.customThemeColors = customColors;
            throttledSaveData && throttledSaveData();
            updateUI();
            hideModal(document.getElementById('theme-editor-modal'));
            showNotification('主题已应用', 'success');
        };
    }

    const saveBtn = document.getElementById('save-theme-preset-btn');
    if(saveBtn) saveBtn.onclick = saveCurrentThemeAsPreset;

    const overwriteBtn = document.getElementById('overwrite-theme-preset-btn');
    if(overwriteBtn) overwriteBtn.onclick = function() {
        const selector = document.getElementById('theme-preset-selector');
        const selectedId = selector && selector.value;
        if (!selectedId || !selectedId.startsWith('custom-')) {
            showNotification('请先选择一个自定义方案再覆盖', 'warning');
            return;
        }
        const theme = customThemes.find(t => t.id === selectedId);
        if (!theme) return;
        if (!confirm(`确定要用当前编辑内容覆盖「${theme.name}」吗？`)) return;
        const root = document.documentElement;
        theme.colors = {};
        for (const variable of Object.keys(themeColorMappings)) {
            const val = root.style.getPropertyValue(variable) || getComputedStyle(root).getPropertyValue(variable).trim();
            if (val) theme.colors[variable] = val.trim();
        }
        for (const variable of Object.keys(themeExtraMappings)) {
            const val = root.style.getPropertyValue(variable) || getComputedStyle(root).getPropertyValue(variable).trim();
            if (val) theme.colors[variable] = val.trim();
        }
        saveCustomThemes();
        showNotification(`已覆盖「${theme.name}」`, 'success');
    };

    const renameBtn = document.getElementById('rename-theme-preset-btn');
    if(renameBtn) renameBtn.onclick = () => {
        const selector = document.getElementById('theme-preset-selector');
        const selectedId = selector && selector.value;
        if (!selectedId || !selectedId.startsWith('custom-')) {
            showNotification('请先选择一个自定义方案再重命名', 'warning');
            return;
        }
        const theme = customThemes.find(t => t.id === selectedId);
        if (!theme) return;
        const newName = prompt('输入新名称：', theme.name);
        if (!newName || !newName.trim()) return;
        theme.name = newName.trim();
        saveCustomThemes();
        populateThemeSelector();
        showNotification(`已重命名为「${newName}」`, 'success');
    };

    const delBtn = document.getElementById('delete-theme-preset-btn');
    if(delBtn) delBtn.onclick = deleteCurrentPreset;

    const selector = document.getElementById('theme-preset-selector');
    if(selector) {
        selector.onchange = (e) => {
            const selectedValue = e.target.value;
            const owBtn = document.getElementById('overwrite-theme-preset-btn');
            if (owBtn) owBtn.style.display = selectedValue.startsWith('custom-') ? '' : 'none';
            if (selectedValue === "current-editing") return;
            if (selectedValue.startsWith('custom-')) {
                const theme = customThemes.find(t => t.id === selectedValue);
                if (theme) {
                    settings.colorTheme = theme.id;
                    applyTheme(theme.colors);
                    populateThemeEditor(theme.colors);
                    throttledSaveData();
                }
            }
        };
    }

    //if(typeof initAppearancePanelListeners === 'function') initAppearancePanelListeners();

    const fontApplyBtn = document.getElementById('apply-font-btn');
    const fontUrlInput = document.getElementById('font-url-input');
    if (fontApplyBtn && fontUrlInput) {
        fontApplyBtn.addEventListener('click', () => {
            const url = fontUrlInput.value.trim();
            settings.customFontUrl = url;
            settings.useLocalFont = false;
            localforage.removeItem(`${APP_PREFIX}local_font_base64`).catch(()=>{});
            localforage.removeItem(`${APP_PREFIX}local_font_blob`).catch(()=>{});
            showNotification('正在尝试加载字体...', 'info', 1000);
            applyCustomFont(url).then(() => {
                throttledSaveData();
                if(url) showNotification('字体已应用', 'success');
                else showNotification('已恢复默认字体', 'success');
            }).catch(err => {
                console.error('字体加载失败:', err);
                showNotification('字体加载失败，请检查链接或网络', 'error');
            });
        });
    }
}

function populateThemeEditor(currentColors = null) {
    const grid = document.getElementById('theme-editor-grid');
    grid.innerHTML = '';
    const rootStyle = getComputedStyle(document.documentElement);

    const colorHeading = document.createElement('div');
    colorHeading.style.cssText = 'grid-column:1/-1;font-size:11px;font-weight:700;color:var(--text-secondary);letter-spacing:2px;text-transform:uppercase;padding:4px 0 2px;border-bottom:1px solid var(--border-color);margin-bottom:4px;';
    colorHeading.textContent = '🎨 颜色';
    grid.appendChild(colorHeading);

    for (const [variable, label] of Object.entries(themeColorMappings)) {
        const rawVal = currentColors ? currentColors[variable] : rootStyle.getPropertyValue(variable).trim();
        let colorValue = rawVal;
        if (!colorValue || colorValue.includes('var(')) {
            colorValue = '#888888';
        } else if (colorValue.startsWith('rgb')) {
            try {
                const m = colorValue.match(/\d+/g);
                if (m && m.length >= 3) {
                    colorValue = '#' + [m[0],m[1],m[2]].map(n => parseInt(n).toString(16).padStart(2,'0')).join('');
                }
            } catch(e) { colorValue = '#888888'; }
        }
        const item = document.createElement('div');
        item.className = 'color-picker-item';
        item.innerHTML = `<label for="color-${variable.replace(/--/g,'')}">${label}</label><input type="color" id="color-${variable.replace(/--/g,'')}" data-variable="${variable}" value="${colorValue}">`;
        grid.appendChild(item);
        /*item.querySelector('input[type="color"]').addEventListener('input', (e) => {
            document.documentElement.style.setProperty(e.target.dataset.variable, e.target.value);
        });*/
        item.querySelector('input[type="color"]').addEventListener('input', (e) => {
        const varName = e.target.dataset.variable;
        document.documentElement.style.setProperty(varName, e.target.value);
        // 同步 RGB 变量
        if (varName === '--message-received-text' || varName === '--message-sent-text') {
            const rgb = colorToRgbString(e.target.value);
            if (rgb) {
            document.documentElement.style.setProperty(varName + '-rgb', rgb);
            }
        }
        });

    }

    const extraHeading = document.createElement('div');
    extraHeading.style.cssText = 'grid-column:1/-1;font-size:11px;font-weight:700;color:var(--text-secondary);letter-spacing:2px;text-transform:uppercase;padding:8px 0 2px;border-bottom:1px solid var(--border-color);margin-bottom:4px;margin-top:8px;';
    extraHeading.textContent = '⚙️ 数值 & 字重';
    grid.appendChild(extraHeading);

    for (const [variable, cfg] of Object.entries(themeExtraMappings)) {
        const rawVal = rootStyle.getPropertyValue(variable).trim() || cfg.default;
        const numVal = parseFloat(rawVal);
        const item = document.createElement('div');
        item.style.cssText = 'grid-column:1/-1;display:flex;align-items:center;gap:10px;background:var(--primary-bg);padding:8px;border-radius:8px;';
        if (cfg.type === 'range') {
            item.innerHTML = `
                <label style="font-size:13px;flex:1;">${cfg.label}</label>
                <input type="range" min="${cfg.min}" max="${cfg.max}" step="${cfg.step||1}" value="${numVal||parseFloat(cfg.default)}"
                    data-variable="${variable}" data-unit="${cfg.unit}"
                    style="flex:2;max-width:140px;accent-color:var(--accent-color);">
                <span style="width:44px;text-align:right;font-size:12px;color:var(--text-secondary);">${numVal||parseFloat(cfg.default)}${cfg.unit}</span>`;
            const rangeInput = item.querySelector('input[type="range"]');
            const valLabel = item.querySelector('span');
            rangeInput.addEventListener('input', () => {
                const v = rangeInput.value + cfg.unit;
                document.documentElement.style.setProperty(variable, v);
                valLabel.textContent = rangeInput.value + cfg.unit;
                if (variable === '--radius') { settings.borderRadius = rangeInput.value; throttledSaveData && throttledSaveData(); }
                if (variable === '--message-line-height') { settings.messageLineHeight = parseFloat(rangeInput.value); throttledSaveData && throttledSaveData(); }
            });
        } else if (cfg.type === 'select') {
            const opts = cfg.options.map(o => `<option value="${o}" ${String(numVal||cfg.default)===o?'selected':''}>${o}</option>`).join('');
            item.innerHTML = `<label style="font-size:13px;flex:1;">${cfg.label}</label><select data-variable="${variable}" style="padding:5px 10px;border-radius:8px;border:1px solid var(--border-color);background:var(--secondary-bg);color:var(--text-primary);font-size:13px;cursor:pointer;">${opts}</select>`;
            item.querySelector('select').addEventListener('change', (e) => {
                const newVal = e.target.value;
                document.documentElement.style.setProperty(variable, newVal);
                if (variable === '--message-font-weight') { settings.messageFontWeight = newVal; throttledSaveData && throttledSaveData(); }
                if (variable === '--message-line-height') { settings.messageLineHeight = parseFloat(newVal); throttledSaveData && throttledSaveData(); }
            });
        }
        grid.appendChild(item);
    }

    const previewHeading = document.createElement('div');
    previewHeading.style.cssText = 'grid-column:1/-1;font-size:11px;font-weight:700;color:var(--text-secondary);letter-spacing:2px;text-transform:uppercase;padding:8px 0 2px;border-bottom:1px solid var(--border-color);margin-bottom:4px;margin-top:8px;';
    previewHeading.textContent = '👁 实时预览';
    grid.appendChild(previewHeading);

    const previewBox = document.createElement('div');
    previewBox.style.cssText = 'grid-column:1/-1;background:var(--chat-bg,var(--primary-bg));border-radius:14px;padding:14px 12px;border:1px solid var(--border-color);';
    previewBox.innerHTML = `
        <div style="display:flex;align-items:flex-end;gap:8px;margin-bottom:10px;">
            <div style="width:32px;height:32px;border-radius:50%;background:var(--accent-color);flex-shrink:0;display:flex;align-items:center;justify-content:center;">
                <i class="fas fa-user" style="font-size:12px;color:#fff;"></i>
            </div>
            <div class="message message-received" style="max-width:180px;font-size:var(--font-size);">你是我朝夕相伴触手可及的虚拟</div>
        </div>
        <div style="display:flex;align-items:flex-end;gap:8px;justify-content:flex-end;">
            <div class="message message-sent" style="max-width:180px;font-size:var(--font-size);">你是我未曾拥有无法捕捉的亲昵</div>
            <div style="width:32px;height:32px;border-radius:50%;background:var(--border-color);flex-shrink:0;display:flex;align-items:center;justify-content:center;">
                <i class="fas fa-user" style="font-size:12px;color:var(--text-secondary);"></i>
            </div>
        </div>`;
    grid.appendChild(previewBox);
    // 在 populateThemeEditor 函数的最末尾加上这段：
    const cssInput = document.getElementById('custom-global-css-input');
    if (cssInput) {
        cssInput.value = settings.customGlobalCss || '';
    }
}

function applyTheme(colors, isReset = false) {
    if (isReset) {
        for (const variable of Object.keys(themeColorMappings)) {
        document.documentElement.style.removeProperty(variable);
        }
        // 重置时也清掉 RGB 变量
        document.documentElement.style.removeProperty('--message-received-text-rgb');
        document.documentElement.style.removeProperty('--message-sent-text-rgb');
        return;
    }
    if (!colors) return;
    for (const [variable, color] of Object.entries(colors)) {
        document.documentElement.style.setProperty(variable, color);
        // 同步 RGB 变量
        if (variable === '--message-received-text' || variable === '--message-sent-text') {
        const rgb = colorToRgbString(color);
        if (rgb) {
            document.documentElement.style.setProperty(variable + '-rgb', rgb);
        }
        }
    }
}


function saveCurrentThemeAsPreset() {
    const presetName = prompt("请输入新主题方案的名称：");
    if (!presetName || !presetName.trim()) return;

    const newTheme = {
        id: `custom-${Date.now()}`,
        name: presetName.trim(),
        colors: {}
    };
    const root = document.documentElement;
    for (const variable of Object.keys(themeColorMappings)) {
        const val = root.style.getPropertyValue(variable) || getComputedStyle(root).getPropertyValue(variable).trim();
        if (val) newTheme.colors[variable] = val.trim();
    }
    for (const variable of Object.keys(themeExtraMappings)) {
        const val = root.style.getPropertyValue(variable) || getComputedStyle(root).getPropertyValue(variable).trim();
        if (val) newTheme.colors[variable] = val.trim();
    }
    customThemes.push(newTheme);
    settings.colorTheme = newTheme.id;
    saveCustomThemes();
    populateThemeSelector();
    showNotification(`主题 "${presetName}" 已保存`, "success");
}

function deleteCurrentPreset() {
    const selector = document.getElementById('theme-preset-selector');
    const selectedId = selector.value;
    if (!selectedId.startsWith('custom-')) {
        showNotification('无法删除预设主题', 'warning');
        return;
    }
    if (confirm(`确定要删除主题 "${selector.options[selector.selectedIndex].text}" 吗？`)) {
        customThemes = customThemes.filter(t => t.id !== selectedId);
        settings.colorTheme = 'gold'; 
        saveCustomThemes();
        updateUI();
        populateThemeSelector();
        populateThemeEditor(); 
        showNotification('主题已删除', 'success');
    }
}

function populateThemeSelector() {
    const selector = document.getElementById('theme-preset-selector');
    selector.innerHTML = '';

    const defaultOption = document.createElement('option');
    defaultOption.value = "current-editing";
    defaultOption.textContent = "当前编辑中...";
    selector.appendChild(defaultOption);

    if (customThemes.length > 0) {
        const customGroup = document.createElement('optgroup');
        customGroup.label = "我的自定义主题";
        customThemes.forEach(theme => {
            const option = document.createElement('option');
            option.value = theme.id;
            option.textContent = theme.name;
            customGroup.appendChild(option);
        });
        selector.appendChild(customGroup);
    }

    if (settings.colorTheme.startsWith('custom-')) {
        selector.value = settings.colorTheme;
    } else {
        selector.value = "current-editing";
    }
    const overwriteBtn = document.getElementById('overwrite-theme-preset-btn');
    if (overwriteBtn) overwriteBtn.style.display = selector.value.startsWith('custom-') ? '' : 'none';
}
        
function saveCustomThemes() {
  // 收权：大总管 (core.js) 统一存盘，这里只负责更新内存变量，绝对不碰 DB_GATEWAY！
  if (typeof window !== 'undefined') {
    window.customThemes = customThemes;
  }
  // 触发大总管的统一保存
  if (typeof throttledSaveData === 'function') throttledSaveData();
}

const THEME_COLOR_NAMES = {
    'gold': '金色', 'blue': '蓝色', 'purple': '紫色', 'green': '绿色',
    'pink': '粉色', 'black-white': '黑白', 'pastel': '柔蓝', 
    'sunset': '夕阳', 'forest': '森林', 'ocean': '深蓝'
};
const BUBBLE_STYLE_NAMES_SCM = { standard: '标准', rounded: '圆角', 'rounded-large': '大圆角', square: '方形' };

async function captureCurrentSchemeAsync() {
    const root = document.documentElement;
	// 🌟 改动：只去图片柜子拿，去掉乱七八糟的旧前缀兜底
	let chatBg = DB_GATEWAY.getMedia('chatBackground') || '';
    return {
        colorTheme: settings.colorTheme,
        isDarkMode: settings.isDarkMode,
        bubbleStyle: settings.bubbleStyle,
        fontSize: settings.fontSize,
        messageFontFamily: settings.messageFontFamily,
        messageFontWeight: settings.messageFontWeight,
        messageLineHeight: settings.messageLineHeight,
        customFontUrl: settings.customFontUrl || '',
        customGlobalCss: document.getElementById('custom-global-css-input')?.value || '',
        customBubbleCss: settings.customBubbleCss || '',
        inChatAvatarEnabled: settings.inChatAvatarEnabled,
        inChatAvatarSize: settings.inChatAvatarSize,
        chatBackground: chatBg,
        customColors: (() => {
            const colors = {};
            const mapped = Object.keys(themeColorMappings || {});
            mapped.forEach(v => {
                const val = root.style.getPropertyValue(v);
                if (val) colors[v] = val.trim();
            });
            return colors;
        })()
    };
}

function captureCurrentScheme() {
	const root = document.documentElement;
	// 🌟 改动：只去图片柜子拿
	const chatBg = DB_GATEWAY.getMedia('chatBackground') || '';
    return {
        colorTheme: settings.colorTheme,
        isDarkMode: settings.isDarkMode,
        bubbleStyle: settings.bubbleStyle,
        fontSize: settings.fontSize,
        messageFontFamily: settings.messageFontFamily,
        messageFontWeight: settings.messageFontWeight,
        messageLineHeight: settings.messageLineHeight,
        customFontUrl: settings.customFontUrl || '',
        customGlobalCss: document.getElementById('custom-global-css-input')?.value || '',
        customBubbleCss: settings.customBubbleCss || '',
        inChatAvatarEnabled: settings.inChatAvatarEnabled,
        inChatAvatarSize: settings.inChatAvatarSize,
        chatBackground: chatBg,
        customColors: (() => {
            const colors = {};
            const mapped = Object.keys(themeColorMappings || {});
            mapped.forEach(v => {
                const val = root.style.getPropertyValue(v);
                if (val) colors[v] = val.trim();
            });
            return colors;
        })()
    };
}

function applyScheme(scheme) {
    settings.colorTheme = scheme.colorTheme;
    settings.isDarkMode = scheme.isDarkMode;
    settings.bubbleStyle = scheme.bubbleStyle;
    settings.fontSize = scheme.fontSize;
    settings.messageFontFamily = scheme.messageFontFamily;
    settings.messageFontWeight = scheme.messageFontWeight;
    settings.messageLineHeight = scheme.messageLineHeight;
    settings.customFontUrl = scheme.customFontUrl || '';
    settings.customBubbleCss = scheme.customBubbleCss || '';
    settings.inChatAvatarEnabled = scheme.inChatAvatarEnabled;
    settings.inChatAvatarSize = scheme.inChatAvatarSize;
    
    const root = document.documentElement;
    // 先处理字体
    if (scheme.customFontUrl && scheme.customFontUrl.trim()) {
        try { applyCustomFont(scheme.customFontUrl); } catch(e) { console.warn('应用方案字体失败', e); }
    } else if (scheme.messageFontFamily) {
        // 如果没有直链，尝试只应用字体栈（配合上面的坑四修复生效）
        document.documentElement.style.setProperty('--message-font-family', scheme.messageFontFamily);
        document.documentElement.style.setProperty('--font-family', scheme.messageFontFamily);
    }

    // 全局 CSS 独立判断，不要用 else if 挡住字体
    if (scheme.customGlobalCss && scheme.customGlobalCss.trim()) {
        try { applyCustomGlobalCss(scheme.customGlobalCss); } catch(e) {}
    }
    
    if (scheme.customBubbleCss) {
        try { applyCustomBubbleCss(scheme.customBubbleCss); } catch(e) {}
    }
    
	// 🌟 改动：不管三七二十一，全部交给管家存图片柜子。没背景就存空字符串
	if (scheme.chatBackground) {
		applyBackground(scheme.chatBackground);
	} else {
		removeBackground(); // 调用 core.js 里的统一清空函数
	}
	DB_GATEWAY.setMedia('chatBackground', scheme.chatBackground || '');


    updateUI();
    throttledSaveData();
    renderThemeSchemesList();
}

function getSchemePreviewColors(scheme) {
    const colorMap = {
        gold: ['#c5a47e', '#f5f5f5', '#333333'],
        blue: ['#7FA6CD', '#e8f0f8', '#333333'],
        purple: ['#BB9EC7', '#f3eef7', '#333333'],
        green: ['#7BC8A4', '#edf8f3', '#333333'],
        pink: ['#F4A6B3', '#fef0f3', '#333333'],
        'black-white': ['#333333', '#f9f9f9', '#666666'],
        pastel: ['#A8D8EA', '#edf7fc', '#333333'],
        sunset: ['#FF9A8B', '#fff0ee', '#333333'],
        forest: ['#7BA05B', '#eef5e8', '#333333'],
        ocean: ['#4A90E2', '#e8f1fc', '#333333'],
    };
    const theme = scheme.colorTheme;
    if (theme && theme.startsWith('custom-')) {
        const c = scheme.customColors && scheme.customColors['--accent-color'];
        return [c || '#aaa', scheme.isDarkMode ? '#222' : '#f5f5f5', '#888'];
    }
    return colorMap[theme] || ['#aaa', '#f5f5f5', '#888'];
}

function renderThemeSchemesList() {
    const list = document.getElementById('theme-schemes-list');
    const empty = document.getElementById('theme-schemes-empty');
    if (!list) return;
    
    list.querySelectorAll('.theme-scheme-item').forEach(el => el.remove());
    
    if (themeSchemes.length === 0) {
        if (empty) empty.style.display = 'flex';
        return;
    }
    if (empty) empty.style.display = 'none';
    
    themeSchemes.forEach(scheme => {
        const dots = getSchemePreviewColors(scheme);
        const bubbleName = BUBBLE_STYLE_NAMES_SCM[scheme.bubbleStyle] || '标准';
        const darkLabel = scheme.isDarkMode ? '夜' : '昼';
        const themeName = THEME_COLOR_NAMES[scheme.colorTheme] || scheme.colorTheme;
        const meta = `${darkLabel} · ${themeName} · ${bubbleName} · ${scheme.fontSize}px`;
        
        const item = document.createElement('div');
        item.className = 'theme-scheme-item';
        item.dataset.schemeId = scheme.id;
        item.innerHTML = `
            <div class="scheme-preview-dots">
                ${dots.map(c => `<div class="scheme-dot" style="background:${c};"></div>`).join('')}
            </div>
            <div class="scheme-info">
                <div class="scheme-name">${scheme.name}</div>
                <div class="scheme-meta">${meta}</div>
            </div>
            <div class="scheme-actions">
                <button class="scheme-action-btn" title="应用方案" onclick="applyThemeScheme('${scheme.id}')">
                    <i class="fas fa-check"></i>
                </button>
                <button class="scheme-action-btn" title="在编辑器中编辑" onclick="editThemeScheme('${scheme.id}', event)" style="color:var(--accent-color);">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="scheme-action-btn delete" title="删除方案" onclick="deleteThemeScheme('${scheme.id}', event)">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;
        list.appendChild(item);
    });
}

window.applyThemeScheme = function(id) {
    const scheme = themeSchemes.find(s => s.id === id);
    if (!scheme) return;
    applyScheme(scheme);
    showNotification(`✨ 已应用方案「${scheme.name}」`, 'success');
};

window.deleteThemeScheme = function(id, event) {
    if (event) event.stopPropagation();
    const scheme = themeSchemes.find(s => s.id === id);
    if (!scheme) return;
    if (confirm(`确定要删除方案「${scheme.name}」吗？`)) {
        themeSchemes = themeSchemes.filter(s => s.id !== id);
        //localforage.setItem(`${APP_PREFIX}themeSchemes`, themeSchemes);
        window.themeSchemes = themeSchemes;
        if (typeof throttledSaveData === 'function') throttledSaveData();
        renderThemeSchemesList();
        showNotification('方案已删除', 'success');
    }
};

window.editThemeScheme = function(id, event) {
    if (event) event.stopPropagation();
    const scheme = themeSchemes.find(s => s.id === id);
    if (!scheme) return;
    applyScheme(scheme);
    const appearanceModal = document.getElementById('appearance-modal');
    const editorModal = document.getElementById('theme-editor-modal');
    if (appearanceModal) hideModal(appearanceModal);
    populateThemeEditor(scheme.customColors && Object.keys(scheme.customColors).length > 0 ? scheme.customColors : null);
    populateThemeSelector();
    if (editorModal) showModal(editorModal);
    const selector = document.getElementById('theme-preset-selector');
    if (selector && scheme.id.startsWith('custom-')) selector.value = scheme.id;
    showNotification(`正在编辑方案「${scheme.name}」，修改后点击💾保存`, 'info');
};

function initThemeSchemes() {
    const saveBtn = document.getElementById('save-theme-scheme-btn');
    if (saveBtn) {
        saveBtn.onclick = async () => {
            const name = prompt('请为当前主题方案命名：', `方案 ${themeSchemes.length + 1}`);
            if (!name || !name.trim()) return;
            const scheme = await captureCurrentSchemeAsync();
            scheme.id = `scheme-${Date.now()}`;
            scheme.name = name.trim();
            scheme.savedAt = Date.now();
            themeSchemes.push(scheme);
            //localforage.setItem(`${APP_PREFIX}themeSchemes`, themeSchemes);
            window.themeSchemes = themeSchemes;
            if (typeof throttledSaveData === 'function') throttledSaveData();
            renderThemeSchemesList();
            showNotification(`✨ 方案「${name}」已保存（含背景图）！`, 'success');
        };
    }
    renderThemeSchemesList();
}

// 在 theme-editor.js 底部新增
/*async function processAndSaveLocalFontFiles(files) {
    const valid = files.filter(f => f.size <= 20 * 1024 * 1024);
    if (files.length > valid.length) showNotification(`${files.length - valid.length} 个文件超过 20MB，已跳过`, 'error');
    if (!valid.length) return 0;

    // 干活：读文件、拼数据、存仓库
    let fontList = (typeof DB_GATEWAY !== 'undefined') ? (DB_GATEWAY.getMedia('localFontData') || []) : [];
    let added = 0;

    for (const file of valid) {
        const buffer = await file.arrayBuffer();
        fontList.push({
            id: 'font_' + Date.now() + '_' + Math.random().toString(36).substr(2,5),
            name: file.name,
            buffer: buffer,
            type: file.type || 'font/ttf'
        });
        added++;
    }

    if (typeof DB_GATEWAY !== 'undefined') {
        DB_GATEWAY.setMedia('localFontData', fontList);
    }

    // 顺便把最新上传的那个设为当前使用
    settings.useLocalFont = true;
    if (!settings.activeLocalFontId || !fontList.find(f => f.id === settings.activeLocalFontId)) {
        settings.activeLocalFontId = fontList[fontList.length - added].id;
    }

    return added;
}*/
async function processAndSaveLocalFontFiles(files) {
    const valid = files.filter(f => f.size <= 20 * 1024 * 1024);
    if (files.length > valid.length) showNotification(`${files.length - valid.length} 个文件超过 20MB，已跳过`, 'error');
    if (!valid.length) return 0;

    // 拿名片列表
    let fontList = (typeof DB_GATEWAY !== 'undefined') ? (DB_GATEWAY.getMedia('localFontData') || []) : [];
    let added = 0;

    for (const file of valid) {
        const fontId = 'font_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
        const pureBuffer = await file.arrayBuffer();
        
        // 🌟 统一管理：通过管家存入专属房间！
        if (typeof DB_GATEWAY !== 'undefined') {
            DB_GATEWAY.setFontBuffer(fontId, pureBuffer);
        }
        
        // 🌟 名片里绝不存 buffer，只存 ID 和名字
        fontList.push({
            id: fontId,
            name: file.name,
            type: file.type || 'font/ttf'
        });
        added++;
    }

    if (typeof DB_GATEWAY !== 'undefined') {
        DB_GATEWAY.setMedia('localFontData', fontList); // 存名片
    }

    settings.useLocalFont = true;
    if (!settings.activeLocalFontId || !fontList.find(f => f.id === settings.activeLocalFontId)) {
        settings.activeLocalFontId = fontList[fontList.length - added].id;
    }
    return added;
}

// ============================================================
// 🌟 外观面板专属车间 (从 listeners.js 迁移过来的纯净逻辑)
// ============================================================

function initAppearancePanelListeners() {
  // 防止重复初始化
  if (window._appearanceListenersInited) return;
  window._appearanceListenersInited = true;

  // 👇【把下面这一大段原封不动补进来】
  function updateBubblePreview() {
    const receivedBubble = document.getElementById('preview-bubble-received');
    const sentBubble = document.getElementById('preview-bubble-sent');
    if (!receivedBubble || !sentBubble) return;
    const style = settings.bubbleStyle || 'standard';
    const accentRgb = getComputedStyle(document.documentElement).getPropertyValue('--accent-color-rgb').trim() || '100,150,255';
    const styleMap = {
      'standard': { recv: '16px 16px 16px 4px', sent: '16px 16px 4px 16px', recvShadow: '0 2px 10px rgba(0,0,0,0.08)', sentShadow: `0 3px 12px rgba(${accentRgb},0.22)` },
      'rounded': { recv: '18px 18px 18px 6px', sent: '18px 18px 6px 18px', recvShadow: '0 2px 10px rgba(0,0,0,0.08), 0 1px 3px rgba(0,0,0,0.04)', sentShadow: `0 3px 12px rgba(${accentRgb},0.25), 0 1px 3px rgba(${accentRgb},0.1)` },
      'rounded-large': { recv: '24px 24px 24px 4px', sent: '24px 24px 4px 24px', recvShadow: '0 4px 16px rgba(0,0,0,0.1), 0 2px 4px rgba(0,0,0,0.05)', sentShadow: `0 4px 16px rgba(${accentRgb},0.28), 0 2px 4px rgba(${accentRgb},0.12)` },
      'square': { recv: '4px 4px 4px 0', sent: '4px 4px 0 4px', recvShadow: '0 3px 10px rgba(0,0,0,0.07), 0 1px 2px rgba(0,0,0,0.04)', sentShadow: `0 3px 10px rgba(${accentRgb},0.2), 0 1px 2px rgba(${accentRgb},0.08)` }
    };
    const radii = styleMap[style] || styleMap['standard'];
    receivedBubble.style.borderRadius = radii.recv; receivedBubble.style.boxShadow = radii.recvShadow;
    sentBubble.style.borderRadius = radii.sent; sentBubble.style.boxShadow = radii.sentShadow;
    const recvBg = getComputedStyle(document.documentElement).getPropertyValue('--message-received-bg').trim();
    const recvText = getComputedStyle(document.documentElement).getPropertyValue('--message-received-text').trim();
    const sentBg = getComputedStyle(document.documentElement).getPropertyValue('--message-sent-bg').trim();
    const sentText = getComputedStyle(document.documentElement).getPropertyValue('--message-sent-text').trim();
    if (recvBg) receivedBubble.style.background = recvBg; if (recvText) receivedBubble.style.color = recvText;
    if (sentBg) sentBubble.style.background = sentBg; if (sentText) sentBubble.style.color = sentText;
    receivedBubble.style.fontFamily = settings.messageFontFamily || ''; sentBubble.style.fontFamily = settings.messageFontFamily || '';
    receivedBubble.style.fontSize = (settings.fontSize || 16) + 'px'; sentBubble.style.fontSize = (settings.fontSize || 16) + 'px';
    const customCss = (document.getElementById('custom-bubble-css') || {}).value || '';
    let previewStyle = document.getElementById('bubble-preview-custom-style');
    if (!previewStyle) { previewStyle = document.createElement('style'); previewStyle.id = 'bubble-preview-custom-style'; document.head.appendChild(previewStyle); }
    previewStyle.textContent = customCss;
  }

  function updateAvatarSettingsUI() {
    const enabled = settings.inChatAvatarEnabled;
    const pill = document.getElementById('avatar-toggle-pill-2'); const knob = document.getElementById('avatar-toggle-knob-2'); const statusText = document.getElementById('avatar-toggle-status-2');
    if (pill) pill.style.background = enabled ? 'var(--accent-color)' : 'var(--border-color)';
    if (knob) knob.style.right = enabled ? '3px' : '23px';
    if (statusText) statusText.textContent = enabled ? '已开启 — 消息旁显示头像' : '已关闭';
    const avatarSizeControl = document.getElementById('in-chat-avatar-size-control-2');
    const avatarPositionControl = document.getElementById('in-chat-avatar-position-control-2');
    const avatarPreview = document.getElementById('avatar-bubble-preview');
    if (avatarSizeControl) avatarSizeControl.style.display = enabled ? 'flex' : 'none';
    if (avatarPositionControl) avatarPositionControl.style.display = enabled ? 'block' : 'none';
    if (avatarPreview) avatarPreview.style.display = enabled ? 'block' : 'none';
    const avatarSizeSlider = document.getElementById('in-chat-avatar-size-slider-2');
    const avatarSizeValue = document.getElementById('in-chat-avatar-size-value-2');
    if (avatarSizeSlider) avatarSizeSlider.value = settings.inChatAvatarSize;
    if (avatarSizeValue) avatarSizeValue.textContent = `${settings.inChatAvatarSize}px`;
    document.documentElement.style.setProperty('--in-chat-avatar-size', `${settings.inChatAvatarSize}px`);
    const pos = settings.inChatAvatarPosition || 'center';
    const alignMap = { 'top': 'flex-start', 'center': 'center', 'bottom': 'flex-end', 'custom': 'flex-start' };
    document.documentElement.style.setProperty('--avatar-align', alignMap[pos] || 'center');
    document.body.dataset.avatarPos = pos;
    document.querySelectorAll('.preview-msg-row').forEach(row => { row.style.alignItems = alignMap[pos] || 'flex-start'; });
    const topBtn = document.getElementById('avatar-pos-top-2'); const centerBtn = document.getElementById('avatar-pos-center-2');
    const bottomBtn = document.getElementById('avatar-pos-bottom-2'); const customBtn = document.getElementById('avatar-pos-custom-2');
    [topBtn, centerBtn, bottomBtn, customBtn].forEach(btn => {
      if (!btn) return; btn.className = btn.dataset.pos === pos ? 'modal-btn modal-btn-primary' : 'modal-btn modal-btn-secondary';
      btn.style.flex = '1'; btn.style.fontSize = '12px'; btn.style.padding = '7px 0';
    });
    const customOffsetCtrl = document.getElementById('avatar-custom-offset-control');
    if (customOffsetCtrl) customOffsetCtrl.style.display = pos === 'custom' ? 'block' : 'none';
    if (pos === 'custom') {
      const offset = settings.inChatAvatarCustomOffset || 0;
      document.documentElement.style.setProperty('--avatar-custom-offset', offset + 'px');
      const sl = document.getElementById('avatar-custom-offset-slider'); const vl = document.getElementById('avatar-custom-offset-value');
      if (sl) sl.value = offset; if (vl) vl.textContent = offset + 'px';
      const previewPartner = document.getElementById('preview-partner-avatar'); if (previewPartner) previewPartner.style.marginTop = offset + 'px';
      const previewMy = document.getElementById('preview-my-avatar'); if (previewMy) previewMy.style.marginTop = offset + 'px';
    } else {
      document.documentElement.style.removeProperty('--avatar-custom-offset');
      const previewPartner = document.getElementById('preview-partner-avatar'); if (previewPartner) previewPartner.style.marginTop = '';
      const previewMy = document.getElementById('preview-my-avatar'); if (previewMy) previewMy.style.marginTop = '';
    }
    const alwaysPill = document.getElementById('always-avatar-pill'); const alwaysKnob = document.getElementById('always-avatar-knob'); const alwaysStatus = document.getElementById('always-avatar-status');
    const alwaysOn = !!settings.alwaysShowAvatar;
    if (alwaysPill) alwaysPill.style.background = alwaysOn ? 'var(--accent-color)' : 'var(--border-color)';
    if (alwaysKnob) alwaysKnob.style.right = alwaysOn ? '3px' : '23px';
    if (alwaysStatus) alwaysStatus.textContent = alwaysOn ? '已开启 — 每条消息都显示头像' : '已关闭 — 仅首条消息显示';
    document.body.classList.toggle('always-show-avatar', alwaysOn);
    const namePill = document.getElementById('partner-name-chat-pill'); const nameKnob = document.getElementById('partner-name-chat-knob'); const nameStatus = document.getElementById('partner-name-chat-status');
    const nameOn = !!settings.showPartnerNameInChat;
    if (namePill) namePill.style.background = nameOn ? 'var(--accent-color)' : 'var(--border-color)';
    if (nameKnob) nameKnob.style.right = nameOn ? '3px' : '23px';
    if (nameStatus) nameStatus.textContent = nameOn ? '已开启 — 消息旁显示对方名字' : '已关闭';
    showPartnerNameInChat = nameOn; document.body.classList.toggle('show-partner-name', nameOn);
    updateAvatarPreview();
  }

  function updateAvatarPreview(shape, cornerRadius) {
    const previewPartner = document.getElementById('preview-partner-avatar'); const previewMy = document.getElementById('preview-my-avatar');
    if (!previewPartner || !previewMy) return;
    const sz = `${settings.inChatAvatarSize || 36}px`; previewPartner.style.width = sz; previewPartner.style.height = sz; previewMy.style.width = sz; previewMy.style.height = sz;
    const partnerImg = DOMElements.partner && DOMElements.partner.avatar ? DOMElements.partner.avatar.querySelector('img') : null;
    const myImg = DOMElements.me && DOMElements.me.avatar ? DOMElements.me.avatar.querySelector('img') : null;
    const currentShape = shape || settings.myAvatarShape || 'circle';
    function applyToPreviewEl(el, img, shp, cr) {
      if (img && img.src) { el.innerHTML = `<img src="${img.src}" style="width:100%;height:100%;object-fit:cover;">`; }
      if (shp === 'circle') { el.style.borderRadius = '50%'; } else if (shp === 'square') { el.style.borderRadius = (cr || 8) + 'px'; }
    }
    const cr = cornerRadius !== undefined ? cornerRadius : parseInt(getComputedStyle(document.documentElement).getPropertyValue('--avatar-corner-radius') || '8') || 8;
    applyToPreviewEl(previewPartner, partnerImg, currentShape, cr); applyToPreviewEl(previewMy, myImg, currentShape, cr);
    if (typeof updateBubblePreview === 'function') updateBubblePreview();
  }

  function updateAvatarShapeBtns() {
    const shape = settings.myAvatarShape || 'circle';
    document.querySelectorAll('.avatar-shape-btn-2').forEach(b => {
      b.classList.toggle('modal-btn-primary', b.dataset.shape === shape); b.classList.toggle('modal-btn-secondary', b.dataset.shape !== shape);
    });
    const radiusCtrl = document.getElementById('avatar-corner-radius-control-2');
    if (radiusCtrl) radiusCtrl.style.display = shape === 'square' ? '' : 'none';
    updateAvatarPreview(shape);
  }
  // 👆【补到这里结束】
  const fontUrlInput = document.getElementById('custom-font-url');
  if (fontUrlInput) fontUrlInput.value = settings.customFontUrl || "";

  // --- 1. 外部字体链接应用 ---
  const applyFontBtn = document.getElementById('apply-font-btn');
  if (applyFontBtn && fontUrlInput) {
    applyFontBtn.addEventListener('click', () => {
      const url = fontUrlInput.value.trim();
      settings.customFontUrl = url;
      settings.useLocalFont = false;
      localforage.removeItem(`${APP_PREFIX}local_font_base64`).catch(()=>{});
      localforage.removeItem(`${APP_PREFIX}local_font_blob`).catch(()=>{});
      showNotification('正在尝试加载字体...', 'info', 1000);
      applyCustomFont(url).then(() => {
        throttledSaveData();
        showNotification(url ? '字体已应用' : '已恢复默认字体', 'success');
      }).catch(err => {
        console.error('字体加载失败:', err);
        showNotification('字体加载失败，请检查链接或网络', 'error');
      });
    });
  }

  // --- 2. 跟随系统字体 ---
  const followSystemBtn = document.getElementById('follow-system-font-btn');
  if (followSystemBtn) {
    followSystemBtn.addEventListener('click', () => {
      const systemFontStack = 'system-ui, -apple-system, sans-serif';
      if (fontUrlInput) fontUrlInput.value = "";
      settings.customFontUrl = "";
      settings.useLocalFont = false;
      localforage.removeItem(`${APP_PREFIX}local_font_base64`).catch(()=>{});
      localforage.removeItem(`${APP_PREFIX}local_font_blob`).catch(()=>{});
      settings.messageFontFamily = systemFontStack;
      document.documentElement.style.setProperty('--font-family', systemFontStack);
      document.documentElement.style.setProperty('--message-font-family', systemFontStack);
      document.body.style.fontFamily = systemFontStack;
      throttledSaveData();
      renderMessages(true);
      showNotification('已应用跟随系统字体', 'success');
    });
  }

  // --- 3. 清除所有本地字体 ---
  const clearLocalFontBtn = document.getElementById('clear-local-font-btn');
  if (clearLocalFontBtn) {
    clearLocalFontBtn.addEventListener('click', () => {
      if (!confirm('确定清除所有已上传的本地字体？')) return;
      settings.useLocalFont = false;
      settings.activeLocalFontId = null;
      settings.customFontUrl = '';
      localforage.removeItem(`${APP_PREFIX}local_font_list`).catch(()=>{});
      localforage.removeItem(`${APP_PREFIX}local_font_base64`).catch(()=>{});
      localforage.removeItem(`${APP_PREFIX}local_font_blob`).catch(()=>{});
      //if(typeof DB_GATEWAY !== 'undefined') DB_GATEWAY.setMedia('localFontData', []);
        if(typeof DB_GATEWAY !== 'undefined') {
            DB_GATEWAY.setMedia('localFontData', []); // 清空名片
            DB_GATEWAY._fontsCache = {};               // 🌟 内存归零
            DB_GATEWAY._debounceSaveFonts();            // 🌟 触发正规军的写入机制，自动把空对象 {} 刷进硬盘！
        }

      const localFontBtn = document.getElementById('local-font-upload-btn');
      if (localFontBtn) localFontBtn.style.display = '';
      const listEl = document.getElementById('local-font-list');
      if (listEl) listEl.innerHTML = '';
      
      applyCustomFont('').then(() => {
        document.documentElement.style.setProperty('--font-family', settings.messageFontFamily || "'Noto Serif SC', serif");
        document.documentElement.style.setProperty('--message-font-family', settings.messageFontFamily || "'Noto Serif SC', serif");
        document.body.style.fontFamily = "'Noto Serif SC', serif";
        throttledSaveData();
        renderMessages(true);
        showNotification('已清除所有本地字体', 'success');
      });
    });
  }

  // --- 4. 气泡 CSS 控制 ---
  const cssTextarea = document.getElementById('custom-bubble-css');
  const applyCssBtn = document.getElementById('apply-css-btn');
  const resetCssBtn = document.getElementById('reset-css-btn');
  if (cssTextarea) cssTextarea.value = settings.customBubbleCss || "";

  function updateCssLivePreview() {
    const previewStyle = document.getElementById('css-live-preview-style');
    if (!previewStyle) return;
    const raw = (cssTextarea ? cssTextarea.value : '') || '';
    const scoped = raw.replace(/([^{}]+)\{/g, (match, selector) => {
      const parts = selector.split(',').map(s => `#css-live-preview ${s.trim()}`);
      return parts.join(', ') + ' {';
    });
    previewStyle.textContent = scoped;
  }
  if (cssTextarea) {
    cssTextarea.addEventListener('input', updateCssLivePreview);
    updateCssLivePreview();
  }
  if (applyCssBtn) {
    applyCssBtn.addEventListener('click', () => {
      settings.customBubbleCss = cssTextarea.value;
      applyCustomBubbleCss(cssTextarea.value);
      throttledSaveData();
      showNotification('自定义样式已应用', 'success');
    });
  }
  if (resetCssBtn) {
    resetCssBtn.addEventListener('click', () => {
      cssTextarea.value = "";
      settings.customBubbleCss = "";
      applyCustomBubbleCss("");
      if (document.getElementById('css-live-preview-style')) document.getElementById('css-live-preview-style').textContent = '';
      throttledSaveData();
      showNotification('自定义样式已清除', 'success');
    });
  }

  // --- 5. 全局主题 CSS 控制 ---
  const globalCssTextarea = document.getElementById('custom-global-css');
  const applyGlobalCssBtn = document.getElementById('apply-global-css-btn');
  const resetGlobalCssBtn = document.getElementById('reset-global-css-btn');
  const globalCssLiveToggle = document.getElementById('global-css-live-toggle');
  const globalCssStatus = document.getElementById('global-css-status');
  if (globalCssTextarea) {
    globalCssTextarea.value = settings.customGlobalCss || '';
    globalCssTextarea.addEventListener('input', () => {
      if (globalCssLiveToggle && globalCssLiveToggle.checked) {
        applyGlobalThemeCss(globalCssTextarea.value);
        if (globalCssStatus) {
          globalCssStatus.style.display = 'block';
          globalCssStatus.textContent = '● 实时应用中';
          globalCssStatus.style.color = 'var(--accent-color)';
        }
      }
    });
  }
  if (applyGlobalCssBtn) {
    applyGlobalCssBtn.addEventListener('click', () => {
      const css = globalCssTextarea ? globalCssTextarea.value : '';
      settings.customGlobalCss = css;
      applyGlobalThemeCss(css);
      throttledSaveData();
      showNotification('全局主题 CSS 已应用', 'success');
      if (globalCssStatus) {
        globalCssStatus.style.display = 'block';
        globalCssStatus.textContent = '✓ 已应用到全局';
        globalCssStatus.style.color = '#51cf66';
        setTimeout(() => { if (globalCssStatus) globalCssStatus.style.display = 'none'; }, 2000);
      }
    });
  }
  if (resetGlobalCssBtn) {
    resetGlobalCssBtn.addEventListener('click', () => {
      if (globalCssTextarea) globalCssTextarea.value = '';
      settings.customGlobalCss = '';
      applyGlobalThemeCss('');
      throttledSaveData();
      showNotification('全局主题 CSS 已清除', 'success');
      if (globalCssStatus) globalCssStatus.style.display = 'none';
    });
  }

  // --- 6. 字号控制 ---
  const fontSizeSlider = document.getElementById('font-size-slider');
  const fontSizeValue = document.getElementById('font-size-value');
  if (fontSizeSlider && fontSizeValue) {
    fontSizeSlider.value = settings.fontSize;
    fontSizeValue.textContent = `${settings.fontSize}px`;
    fontSizeSlider.addEventListener('input', (e) => {
      settings.fontSize = parseInt(e.target.value);
      document.documentElement.style.setProperty('--font-size', `${settings.fontSize}px`);
      fontSizeValue.textContent = `${settings.fontSize}px`;
      renderMessages(true);
    });
    fontSizeSlider.addEventListener('change', throttledSaveData);
  }

  // --- 7. 头像外观控制 (开关、大小、位置、圆角) ---
  updateAvatarSettingsUI(); // 初始化状态

  const avatarToggle = document.getElementById('in-chat-avatar-toggle-2');
  if (avatarToggle) {
    avatarToggle.addEventListener('click', () => {
      settings.inChatAvatarEnabled = !settings.inChatAvatarEnabled;
      updateAvatarSettingsUI();
      renderMessages(true);
      throttledSaveData();
    });
  }

  const avatarSizeSlider = document.getElementById('in-chat-avatar-size-slider-2');
  const avatarSizeValue = document.getElementById('in-chat-avatar-size-value-2');
  if (avatarSizeSlider) {
    avatarSizeSlider.addEventListener('input', (e) => {
      settings.inChatAvatarSize = parseInt(e.target.value, 10);
      updateAvatarSettingsUI();
      renderMessages(true);
    });
    avatarSizeSlider.addEventListener('change', throttledSaveData);
  }

  ['avatar-pos-top-2','avatar-pos-center-2','avatar-pos-bottom-2','avatar-pos-custom-2'].forEach(btnId => {
    const btn = document.getElementById(btnId);
    if (btn) {
      btn.addEventListener('click', () => {
        settings.inChatAvatarPosition = btn.dataset.pos;
        updateAvatarSettingsUI();
        renderMessages(true);
        throttledSaveData();
      });
    }
  });

  const customOffsetSlider = document.getElementById('avatar-custom-offset-slider');
  const customOffsetValue = document.getElementById('avatar-custom-offset-value');
  if (customOffsetSlider) {
    customOffsetSlider.addEventListener('input', () => {
      const val = parseInt(customOffsetSlider.value, 10);
      settings.inChatAvatarCustomOffset = val;
      if (customOffsetValue) customOffsetValue.textContent = val + 'px';
      document.documentElement.style.setProperty('--avatar-custom-offset', val + 'px');
      document.querySelectorAll('.preview-msg-row').forEach(row => row.style.alignItems = 'flex-start');
      const pp = document.getElementById('preview-partner-avatar');
      const pm = document.getElementById('preview-my-avatar');
      if (pp) pp.style.marginTop = val + 'px';
      if (pm) pm.style.marginTop = val + 'px';
      renderMessages(true);
    });
    customOffsetSlider.addEventListener('change', throttledSaveData);
  }

  const alwaysAvatarToggle = document.getElementById('always-avatar-toggle');
  if (alwaysAvatarToggle) {
    alwaysAvatarToggle.addEventListener('click', () => {
      settings.alwaysShowAvatar = !settings.alwaysShowAvatar;
      updateAvatarSettingsUI();
      renderMessages(true);
      throttledSaveData();
    });
  }

  const partnerNameChatToggle = document.getElementById('partner-name-chat-toggle');
  if (partnerNameChatToggle) {
    partnerNameChatToggle.addEventListener('click', () => {
      settings.showPartnerNameInChat = !settings.showPartnerNameInChat;
      updateAvatarSettingsUI();
      throttledSaveData();
    });
  }

  document.querySelectorAll('.avatar-shape-btn-2').forEach(btn => {
    btn.addEventListener('click', () => {
      const shape = btn.dataset.shape;
      settings.myAvatarShape = shape;
      settings.partnerAvatarShape = shape;
      applyAvatarShapeToDOM && applyAvatarShapeToDOM('my', shape);
      applyAvatarShapeToDOM && applyAvatarShapeToDOM('partner', shape);
      updateAvatarShapeBtns();
      updateAvatarPreview(shape);
      renderMessages(true);
      throttledSaveData();
    });
  });

  const cornerSlider = document.getElementById('avatar-corner-radius-slider-2');
  const cornerVal = document.getElementById('avatar-corner-radius-value-2');
  if (cornerSlider) {
    cornerSlider.addEventListener('input', () => {
      const r = cornerSlider.value;
      if (cornerVal) cornerVal.textContent = r + 'px';
      document.documentElement.style.setProperty('--avatar-corner-radius', r + 'px');
      updateAvatarPreview(settings.myAvatarShape || 'circle', parseInt(r));
      renderMessages(true);
    });
    cornerSlider.addEventListener('change', () => {
      settings.avatarCornerRadius = cornerSlider.value;
      throttledSaveData();
    });
  }

  document.querySelectorAll('[data-bubble-style]').forEach(item => {
    item.addEventListener('click', () => setTimeout(updateBubblePreview, 100));
  });
}
