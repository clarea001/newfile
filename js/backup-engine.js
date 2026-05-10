/*
导入导出
 */
(function (global) {
    'use strict';

    var MIN_MEDIA_CHARS = 800;

    function escapeRe(s) {
        return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    function isDataMediaUrl(s) {
        return typeof s === 'string' && s.length > MIN_MEDIA_CHARS && /^data:(image|video)\//i.test(s);
    }

    function isZipArrayBuffer(ab) {
        if (!ab || ab.byteLength < 4) return false;
        var u = new Uint8Array(ab);
        return u[0] === 0x50 && u[1] === 0x4b && (u[2] === 0x03 || u[2] === 0x05 || u[2] === 0x07) &&
            (u[3] === 0x04 || u[3] === 0x06 || u[3] === 0x08);
    }

    function dataUrlToBinary(dataUrl) {
        if (typeof dataUrl !== 'string') return null;
        var m = /^data:([^,]+),([\s\S]*)$/.exec(dataUrl);
        if (!m) return null;
        var header = m[1];
        var body = m[2].replace(/\s/g, '');
        var mime = header.split(';')[0].trim();
        var isB64 = /;base64/i.test(header);
        if (isB64) {
            try {
                var binary = atob(body);
                var len = binary.length;
                var bytes = new Uint8Array(len);
                for (var i = 0; i < len; i++) bytes[i] = binary.charCodeAt(i);
                return { mime: mime, bytes: bytes };
            } catch (e) {
                return null;
            }
        }
        try {
            return { mime: mime, bytes: new TextEncoder().encode(decodeURIComponent(body)) };
        } catch (e2) {
            return null;
        }
    }

    function uint8ToBase64Chunked(u8) {
        var CHUNK = 0x8000;
        var str = '';
        for (var i = 0; i < u8.length; i += CHUNK) {
            str += String.fromCharCode.apply(null, u8.subarray(i, Math.min(i + CHUNK, u8.length)));
        }
        return btoa(str);
    }

    function binaryToDataUrl(mime, u8) {
        return 'data:' + (mime || 'application/octet-stream') + ';base64,' + uint8ToBase64Chunked(u8);
    }

    function deepCloneJsonSafe(obj) {
        try {
            return JSON.parse(JSON.stringify(obj, function (k, v) {
                if (v instanceof Date) return v.toISOString();
                return v;
            }));
        } catch (e) {
            return obj;
        }
    }

    /*
     * 将大树中的 data: 媒体字符串抽离到 store，原处替换为 { __mRef: id }（导入时再展开）
     */
    function extractMediaTree(node, state) {
        if (!state) state = { store: {}, map: new Map(), n: 0 };
        if (node === null || node === undefined) return node;
        if (typeof node === 'string') {
            if (isDataMediaUrl(node)) {
                var id = state.map.get(node);
                if (!id) {
                    id = 'm' + state.n++;
                    state.map.set(node, id);
                    state.store[id] = node;
                }
                return { __mRef: id };
            }
            return node;
        }
        if (Array.isArray(node)) return node.map(function (x) { return extractMediaTree(x, state); });
        if (typeof node === 'object') {
            if (node instanceof Date) return node.toISOString();
            var out = {};
            for (var k in node) {
                if (!Object.prototype.hasOwnProperty.call(node, k)) continue;
                out[k] = extractMediaTree(node[k], state);
            }
            return out;
        }
        return node;
    }

    function inlineMediaTree(node, store) {
        if (!store) store = {};
        if (node === null || node === undefined) return node;
        if (typeof node === 'object' && !Array.isArray(node) && node.__mRef && typeof node.__mRef === 'string') {
            var blob = store[node.__mRef];
            return blob !== undefined && blob !== null ? blob : node;
        }
        if (Array.isArray(node)) return node.map(function (x) { return inlineMediaTree(x, store); });
        if (typeof node === 'object') {
            var o = {};
            for (var k in node) {
                if (!Object.prototype.hasOwnProperty.call(node, k)) continue;
                o[k] = inlineMediaTree(node[k], store);
            }
            return o;
        }
        return node;
    }

    function processLocalStorageValueForExport(str, state) {
        if (str == null) return str;
        if (typeof str !== 'string') return str;
        if (isDataMediaUrl(str)) {
            var id = state.map.get(str);
            if (!id) {
                id = 'm' + state.n++;
                state.map.set(str, id);
                state.store[id] = str;
            }
            return JSON.stringify({ __mRef: id });
        }
        try {
            var parsed = JSON.parse(str);
            var extracted = extractMediaTree(parsed, state);
            return JSON.stringify(extracted);
        } catch (e) {
            return str;
        }
    }

    function processLocalStorageValueForImport(str, store) {
        if (str == null) return str;
        if (typeof str !== 'string') return str;
        try {
            var parsed = JSON.parse(str);
            return JSON.stringify(inlineMediaTree(parsed, store));
        } catch (e) {
            return str;
        }
    }
    function remapLfKey(key, oldSid, newSid, appPrefix) {
        if (!oldSid || !newSid || oldSid === newSid || !key) return key;
        var re = new RegExp(escapeRe(oldSid), 'g');
        return key.replace(re, newSid);
    }

    /*与 group-chat 导出勾选项一致：未勾选的模块对应键名子串会被排除 */
    function buildModuleSkipPatterns(flags) {
        flags = flags || {};
        var p = [];
        if (!flags.inclStickers) p.push('stickerLibrary', 'myStickerLibrary');
        if (!flags.inclThemes) p.push('backgroundGallery', 'chatBackground', 'partnerAvatar', 'myAvatar', 'playerCover');
        if (!flags.inclMsgs) p.push('chatMessages');
        if (!flags.inclSet) p.push('chatSettings', 'partnerPersonas', 'showPartnerNameInChat');
        if (!flags.inclCustom) p.push('customReplies', 'customPokes', 'customStatuses', 'customMottos', 'customIntros', 'customEmojis', 'customReplyGroups');
        if (!flags.inclAnn) p.push('anniversaries');
        if (!flags.inclThemes) p.push('customThemes', 'themeSchemes');
        if (!flags.inclDg) p.push('dg_custom_data', 'dg_status_pool', 'weekly_fortune', 'daily_fortune', 'customWeather_');
        p.push('_DO_NOT_MATCH_wishingPoolData'); 
        //p.push('_DO_NOT_MATCH_callBgLibrary');
        p.push('_DO_NOT_MATCH_annHeaderBgs');
        return p;
    }

    function shouldSkipKeyGroupChat(key, flags) {
        if (!key) return true;
        if (key.startsWith('annHeaderBg_')) return true;
        if (key.indexOf('dg_header_bg') !== -1 || key.indexOf('dg_overlay_bg') !== -1) return true;
        var patterns = buildModuleSkipPatterns(flags || {});
        return patterns.some(function (p) { return key.indexOf(p) !== -1; });
    }

    /*
     * 从当前环境收集备份数据并打包为 v4（紧凑 JSON + mediaStore）
     */
    /*async function buildBackupPayload(flags) {
        flags = flags || { inclMsgs: true, inclSet: true, inclCustom: true, inclAnn: true, inclThemes: true, inclDg: true, inclStickers: true };
        var lfData = {};
        
        // 🌟 核心改动：不再遍历所有 localforage keys，直接从新仓库拿数据包
        try {
            const newData = await localforage.getItem('APP_DATA') || {};
            const newMedia = await localforage.getItem('APP_MEDIA') || {};
            
            // 把新仓库的数据伪装成旧格式给后续流程用
            for (const key in newData) lfData['NEW_DATA_' + key] = newData[key];
            for (const key in newMedia) lfData['NEW_MEDIA_' + key] = newMedia[key];
        } catch(e) {
            console.warn('[backup] 读取新仓库失败，回退旧模式', e);
            // 降级：如果读不到新仓库，还是用老办法扫一遍
            var keys = await localforage.keys();
            for (var i = 0; i < keys.length; i++) {
                var key = keys[i];
                if (shouldSkipKeyGroupChat(key, flags)) continue;
                try {
                    var rawVal = await localforage.getItem(key);
                    if (rawVal === null || rawVal === undefined) continue;
                    if (key.indexOf('local_font_list') !== -1 && Array.isArray(rawVal)) {
                        rawVal = rawVal.map(function(font) {
                            if (font && font.buffer && font.buffer instanceof ArrayBuffer) {
                                var base64Str = uint8ToBase64Chunked(new Uint8Array(font.buffer));
                                var clonedFont = Object.assign({}, font);
                                clonedFont.buffer = base64Str;
                                clonedFont.__isBase64Font = true;
                                return clonedFont;
                            }
                            return font;
                        });
                    }
                    lfData[key] = deepCloneJsonSafe(rawVal);
                } catch (e) { console.warn('[backup] 读取失败', key, e); }
            }
        }

        var lsData = {};
        for (var j = 0; j < localStorage.length; j++) {
            var lk = localStorage.key(j);
            if (!lk || shouldSkipKeyGroupChat(lk, flags)) continue;
            try { lsData[lk] = localStorage.getItem(lk); } catch (e2) {}
        }

        var state = { store: {}, map: new Map(), n: 0 };
        var lfOut = {};
        for (var k in lfData) {
            if (!Object.prototype.hasOwnProperty.call(lfData, k)) continue;
            lfOut[k] = extractMediaTree(lfData[k], state);
        }
        var lsOut = {};
        for (var k2 in lsData) {
            if (!Object.prototype.hasOwnProperty.call(lsData, k2)) continue;
            lsOut[k2] = processLocalStorageValueForExport(lsData[k2], state);
        }

        return {
            type: 'chatapp-backup-v4',
            formatVersion: 4,
            appName: 'ChatApp',
            timestamp: new Date().toISOString(),
            sessionId: typeof SESSION_ID !== 'undefined' ? SESSION_ID : null,
            appPrefix: typeof APP_PREFIX !== 'undefined' ? APP_PREFIX : 'CHAT_APP_V3_',
            modules: flags,
            mediaStore: state.store,
            localforage: lfOut,
            localStorage: lsOut
        };
    }*/
   async function buildBackupPayload(flags) {
    flags = flags || { inclMsgs: true, inclSet: true, inclCustom: true, inclAnn: true, inclThemes: true, inclDg: true, inclStickers: true };
    
    var lfData = {};
    
    // 🌟 终极干净逻辑：直接从新仓库拿数据，绝不搞抽离拆解
    try {
        const newData = await localforage.getItem('APP_DATA') || {};
        const newMedia = await localforage.getItem('APP_MEDIA') || {};
        // 伪装成旧格式给后续流程用，但内部结构原封不动
        for (const key in newData) lfData['NEW_DATA_' + key] = newData[key];
        for (const key in newMedia) lfData['NEW_MEDIA_' + key] = newMedia[key];
    } catch(e) {
        console.warn('[backup] 读取新仓库失败，回退旧模式', e);
        // 降级逻辑保持原样，不再赘述，如果需要可保留你原有的降级代码
        var keys = await localforage.keys();
        for (var i = 0; i < keys.length; i++) {
            var key = keys[i];
            if (shouldSkipKeyGroupChat(key, flags)) continue;
            try {
                var rawVal = await localforage.getItem(key);
                if (rawVal === null || rawVal === undefined) continue;
                if (key.indexOf('local_font_list') !== -1 && Array.isArray(rawVal)) {
                    rawVal = rawVal.map(function(font) {
                        if (font && font.buffer && font.buffer instanceof ArrayBuffer) {
                            var base64Str = uint8ToBase64Chunked(new Uint8Array(font.buffer));
                            var clonedFont = Object.assign({}, font);
                            clonedFont.buffer = base64Str;
                            clonedFont.__isBase64Font = true;
                            return clonedFont;
                        }
                        return font;
                    });
                }
                lfData[key] = deepCloneJsonSafe(rawVal);
            } catch (e2) { console.warn('[backup] 读取失败', key, e2); }
        }
    }

    var lsData = {};
    for (var j = 0; j < localStorage.length; j++) {
        var lk = localStorage.key(j);
        if (!lk || shouldSkipKeyGroupChat(lk, flags)) continue;
        try { lsData[lk] = localStorage.getItem(lk); } catch (e2) {}
    }

    // 🌟 核心修复：绝不使用 extractMediaTree 破坏数组内的完整 Base64
    var lfOut = {};
    for (var k in lfData) {
        if (!Object.prototype.hasOwnProperty.call(lfData, k)) continue;
        lfOut[k] = deepCloneJsonSafe(lfData[k]); // 只做深拷贝安全处理，不拆树
    }

    var lsOut = {};
    for (var k2 in lsData) {
        if (!Object.prototype.hasOwnProperty.call(lsData, k2)) continue;
        lsOut[k2] = lsData[k2]; // localStorage 本来就是字符串，不用处理
    }

    // 🌟 因为不拆树了，mediaStore 永远为空，彻底杜绝引用断层
    return {
        type: 'chatapp-backup-v4',
        formatVersion: 4,
        appName: 'ChatApp',
        timestamp: new Date().toISOString(),
        sessionId: typeof SESSION_ID !== 'undefined' ? SESSION_ID : null,
        appPrefix: typeof APP_PREFIX !== 'undefined' ? APP_PREFIX : 'CHAT_APP_V3_',
        modules: flags,
        mediaStore: {}, // 强制留空，所有数据都在 localforage 字段里原样保留
        localforage: lfOut,
        localStorage: lsOut
    };
}


    function serializeBackupV4(payload) {
        var bom = '\uFEFF';
        return bom + JSON.stringify(payload);
    }

    function downloadBlob(blob, fileName) {
        if (typeof downloadFileFallback === 'function') {
            downloadFileFallback(blob, fileName);
            return;
        }
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        a.style.display = 'none';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(function () { URL.revokeObjectURL(url); }, 2000);
    }

    /*
     * 从 ZIP 解析备份（v5）；若包内为旧版单 JSON（仅改扩展名等）则按其中 JSON 原样返回。
     */
    async function parseZipBackup(arrayBuffer) {
        if (typeof JSZip === 'undefined') throw new Error('JSZip 未加载，无法读取 ZIP 备份，请检查网络后刷新页面');
        var zip = await JSZip.loadAsync(arrayBuffer);
        var jsonFile = zip.file('backup.json');
        if (!jsonFile) {
            var names = Object.keys(zip.files).filter(function (n) {
                var e = zip.files[n];
                return e && !e.dir && /\.json$/i.test(n);
            });
            if (names.length === 1) jsonFile = zip.file(names[0]);
        }
        if (!jsonFile) throw new Error('ZIP 内未找到 backup.json');
        var raw = await jsonFile.async('string');
        if (raw.length && raw.charCodeAt(0) === 0xFEFF) raw = raw.slice(1);
        var data = JSON.parse(raw);
        var idx = data.mediaIndex;
        if (data.formatVersion === 5 && data.type === 'chatapp-backup-v5' && idx && typeof idx === 'object') {
            var built = {};
            var ids = Object.keys(idx);
            for (var i = 0; i < ids.length; i++) {
                var id = ids[i];
                var meta = idx[id];
                var path = (meta && meta.path) ? meta.path : ('media/' + id);
                var zf = zip.file(path);
                if (!zf) {
                    console.warn('[backup] ZIP 缺少媒体文件', path);
                    continue;
                }
                var mimeMeta = (meta && meta.mime) ? meta.mime : 'application/octet-stream';
                if (mimeMeta === 'text/plain+dataurl') {
                    built[id] = await zf.async('string');
                } else {
                    var ab = await zf.async('arraybuffer');
                    built[id] = binaryToDataUrl(mimeMeta, new Uint8Array(ab));
                }
            }
            var ms = data.mediaStore || {};
            for (var k in ms) {
                if (Object.prototype.hasOwnProperty.call(ms, k) && built[k] == null) built[k] = ms[k];
            }
            data.mediaStore = built;
        }
        return data;
    }

    async function loadBackupFromArrayBuffer(ab) {
        if (isZipArrayBuffer(ab)) return await parseZipBackup(ab);
        var text = new TextDecoder('utf-8', { fatal: false }).decode(ab);
        if (text.length && text.charCodeAt(0) === 0xFEFF) text = text.slice(1);
        return JSON.parse(text);
    }

    async function loadBackupFromFile(file) {
        var ab = await file.arrayBuffer();
        return await loadBackupFromArrayBuffer(ab);
    }

    async function exportBackupToFile(flags) {
        if (typeof showNotification === 'function') showNotification('正在打包备份（ZIP：结构与媒体分离）…', 'info', 4000);
        var payload = await buildBackupPayload(flags);
        var dateStr = new Date().toISOString().slice(0, 10);
        var fileNameZip = 'chatapp-backup-' + dateStr + '.zip';

        if (typeof JSZip !== 'undefined') {
            try {
                var zip = new JSZip();
                var store = payload.mediaStore || {};
                var mediaIndex = {};
                for (var sid in store) {
                    if (!Object.prototype.hasOwnProperty.call(store, sid)) continue;
                    var url = store[sid];
                    var parts = dataUrlToBinary(url);
                    var path = 'media/' + sid;
                    if (parts && parts.bytes && parts.bytes.length) {
                        zip.file(path, parts.bytes, { binary: true });
                        mediaIndex[sid] = { path: path, mime: parts.mime };
                    } else {
                        var txtPath = path + '.txt';
                        zip.file(txtPath, String(url));
                        mediaIndex[sid] = { path: txtPath, mime: 'text/plain+dataurl' };
                    }
                }
                var jsonBody = {
                    type: 'chatapp-backup-v5',
                    formatVersion: 5,
                    appName: payload.appName || 'ChatApp',
                    timestamp: payload.timestamp,
                    sessionId: payload.sessionId,
                    appPrefix: payload.appPrefix,
                    modules: payload.modules,
                    localforage: payload.localforage,
                    localStorage: payload.localStorage,
                    mediaIndex: mediaIndex
                };
                zip.file('backup.json', '\uFEFF' + JSON.stringify(jsonBody));
                var zipBlob = await zip.generateAsync({
                    type: 'blob',
                    compression: 'DEFLATE',
                    compressionOptions: { level: 6 }
                });
                if (navigator.share && /Mobile|Android|iPhone|iPad/.test(navigator.userAgent)) {
                    try {
                        var shareFile = new File([zipBlob], fileNameZip, { type: 'application/zip' });
                        if (navigator.canShare && navigator.canShare({ files: [shareFile] })) {
                            await navigator.share({
                                files: [shareFile],
                                title: '传讯全量备份',
                                text: 'ZIP 备份：' + new Date().toLocaleDateString()
                            });
                            if (typeof showNotification === 'function') showNotification('备份导出成功', 'success');
                            return;
                        }
                    } catch (e) { /* fall through */ }
                }
                downloadBlob(zipBlob, fileNameZip);
                if (typeof showNotification === 'function') {
                    showNotification('已导出 ZIP：主 JSON 不含大图，导入更不易失败', 'success', 3500);
                }
                return;
            } catch (zipErr) {
                console.error('[backup] ZIP 导出失败，回退单文件 JSON', zipErr);
                if (typeof showNotification === 'function') {
                    showNotification('ZIP 打包失败，已改为单文件 JSON（大备份可能较难解析）', 'warning', 4500);
                }
            }
        } else if (typeof showNotification === 'function') {
            showNotification('JSZip 未加载，将导出单文件 JSON', 'warning', 3000);
        }

        var str = serializeBackupV4(payload);
        var blob = new Blob([str], { type: 'application/json;charset=utf-8' });
        var fileName = 'chatapp-backup-' + dateStr + '.json';
        if (navigator.share && /Mobile|Android|iPhone|iPad/.test(navigator.userAgent)) {
            try {
                var f = new File([blob], fileName, { type: 'application/json' });
                if (navigator.canShare && navigator.canShare({ files: [f] })) {
                    await navigator.share({ files: [f], title: '传讯全量备份', text: '备份日期：' + new Date().toLocaleDateString() });
                    if (typeof showNotification === 'function') showNotification('备份导出成功', 'success');
                    return;
                }
            } catch (e2) { /* fall through */ }
        }
        downloadBlob(blob, fileName);
        if (typeof showNotification === 'function') showNotification('备份导出成功（JSON）', 'success');
    }

    function getLfSource(data) {
        if (!data || typeof data !== 'object') return {};
        var a = data.indexedDB || {};
        var b = data.localforage || {};
        var out = {};
        for (var k in a) {
            if (Object.prototype.hasOwnProperty.call(a, k)) out[k] = a[k];
        }
        for (var k2 in b) {
            if (Object.prototype.hasOwnProperty.call(b, k2)) out[k2] = b[k2];
        }
        return out;
    }

    function matchAnyNeedles(key, needles) {
        if (!key || !needles || !needles.length) return false;
        for (var i = 0; i < needles.length; i++) {
            if (key.indexOf(needles[i]) !== -1) return true;
        }
        return false;
    }

    function matchLsKey(key, cat) {
        if (!cat) return false;
        if (cat.localStorageNeedles && matchAnyNeedles(key, cat.localStorageNeedles)) return true;
        if (cat.localStoragePrefixes && cat.localStoragePrefixes.some(function (p) { return key.indexOf(p) === 0; })) return true;
        return false;
    }

    function filterLfByCategories(lf, selectedIds, categories) {
        if (!selectedIds || !selectedIds.length) return {};
        var selected = categories.filter(function (c) { return selectedIds.indexOf(c.id) !== -1; });
        var out = {};
        for (var k in lf) {
            if (!Object.prototype.hasOwnProperty.call(lf, k)) continue;
            var ok = selected.some(function (c) { return matchAnyNeedles(k, c.indexedDBNeedles); });
            if (ok) out[k] = lf[k];
        }
        return out;
    }

    function filterLsByCategories(ls, selectedIds, categories) {
        if (!selectedIds || !selectedIds.length) return {};
        var selected = categories.filter(function (c) { return selectedIds.indexOf(c.id) !== -1; });
        var out = {};
        for (var k in ls) {
            if (!Object.prototype.hasOwnProperty.call(ls, k)) continue;
            var ok = selected.some(function (c) { return matchLsKey(k, c); });
            if (ok) out[k] = ls[k];
        }
        return out;
    }

    /*
     * 将备份写入存储（已解析的对象）
     * @param {object} data 原始备份 JSON
     * @param {{ selective?: boolean, selectedCategoryIds?: string[], categories?: array }} opt
     */

    async function applyBackupToStorage(data, opt) {
        opt = opt || {};
        var mediaStore = data.mediaStore || {};
        var lfRaw = getLfSource(data);
        var lsRaw = data.localStorage || {};

        // ==========================================
        // 🚀 终极统一导入逻辑：不管新旧备份，全部强行塞进新仓库！
        // ==========================================
        var newDataToSave = {};
        var newMediaToSave = {};
        var savedBgGallery = [];

        // 如果是我们刚刚导出的新格式（带 NEW_DATA_ 前缀），直接提取
        for (var k in lfRaw) {
            if (k.startsWith('NEW_DATA_')) {
                newDataToSave[k.replace('NEW_DATA_', '')] = inlineMediaTree(lfRaw[k], mediaStore);
            } else if (k.startsWith('NEW_MEDIA_')) {
                newMediaToSave[k.replace('NEW_MEDIA_', '')] = inlineMediaTree(lfRaw[k], mediaStore);
            }
        }

        // 如果提取不到新格式，说明是旧站备份！启动旧数据拆包逻辑！
        if (Object.keys(newDataToSave).length === 0 && Object.keys(newMediaToSave).length === 0) {
            console.log('[backup] 检测到旧站备份，启动智能拆包进新仓库...');
            var PREFIX = 'CHAT_APP_V3_';
            
            for (var oldKey in lfRaw) {
                //if (!oldKey.startsWith(PREFIX)) continue;
                var val = inlineMediaTree(lfRaw[oldKey], mediaStore);
                
                            // 提取 key
                var pureKey = oldKey;
                
                // 情况1：有标准前缀的，正常剥皮
                if (pureKey.startsWith(PREFIX)) {
                    pureKey = pureKey.slice(PREFIX.length);
                    while (pureKey.indexOf('_') !== -1) {
                        var firstPart = pureKey.substring(0, pureKey.indexOf('_'));
                        if (firstPart === 'session' || /^\d+$/.test(firstPart) || firstPart.length > 8) {
                            pureKey = pureKey.substring(pureKey.indexOf('_') + 1);
                        } else {
                            break;
                        }
                    }
                } 
                // 情况2：没穿制服的散装数据（直接就是真名），比如 boardDataV2
                // 此时 pureKey 保持原样，不用切

                // 终极匹配白名单
                var textTargets = ['chatMessages', 'chatSettings', 'customReplies', 'customReplyGroups', 'customEmojis', 'anniversaries', 'customPokes', 'customStatuses', 'customMottos', 'customIntros', 'partnerPersonas', 'wishingPoolData', 'periodRecords', 'periodSettings', 'diviHistory_v1', 'envelopeData', 'moodData', 'moodCalendar', 'calendarEvents', 'customMoodOptions', 'boardDataV2', 'customThemes', 'themeSchemes'];
                var mediaTargets = ['backgroundGallery', 'chatBackground', 'partnerAvatar', 'myAvatar', 'stickerLibrary', 'myStickerLibrary', 'callBgLibrary'];

                var matched = false;
                
                // 入库文字数据（带防覆盖）
                for (var t = 0; t < textTargets.length; t++) {
                    if (pureKey === textTargets[t]) {
                        // 🌟 核心修复：如果是旧站的 v1，强行改名为新站的 diviHistory
                        var realKey = pureKey === 'diviHistory_v1' ? 'diviHistory' : pureKey;
                        
                        var existingVal = newDataToSave[realKey];
                        var isNewArrayBigger = Array.isArray(val) && (!existingVal || val.length > existingVal.length);
                        var isNewObjValid = typeof val === 'object' && !Array.isArray(val) && (!existingVal || Object.keys(existingVal).length === 0);
                        
                        if (!existingVal || isNewArrayBigger || isNewObjValid) {
                            newDataToSave[realKey] = val; // 存进新仓库时，用新名字
                        }
                        matched = true;
                        break;
                    }
                }

                
                // 入库媒体数据（带防覆盖）
                // 入库媒体数据（带防覆盖及特殊兜底）
                if (!matched) {
                    for (var m = 0; m < mediaTargets.length; m++) {
                        if (pureKey === mediaTargets[m]) {
                            var existingMedia = newMediaToSave[mediaTargets[m]];
                            var isMediaArrayBigger = Array.isArray(val) && (!existingMedia || val.length > existingMedia.length);
                            var isMediaObjValid = typeof val === 'object' && !Array.isArray(val) && (!existingMedia || Object.keys(existingMedia).length === 0);
                            var isStrBetter = typeof val === 'string' && val.length > 100;


                            if (!existingMedia || isMediaArrayBigger || isMediaObjValid || isStrBetter) {
                                if (mediaTargets[m] === 'backgroundGallery') {
                                    savedBgGallery = val;
                                } else {
                                    newMediaToSave[mediaTargets[m]] = val;
                                }
                            }
                            matched = true;
                            break;
                        }
                    }
                }
                
                /*/// 打包纪念日头图碎片 & 兜底被ZIP抽离的大图
                // 👇 加上这段精准识别，让它作为整包进入媒体仓
                if (!matched && pureKey === 'annHeaderBgs' && Array.isArray(val)) {
                    newMediaToSave.annHeaderBgs = val;
                    matched = true;
                }
                else if (!matched && pureKey.indexOf('annHeaderBg_') === 0) {
                    // 兼容极老版本的散装数据，强行收编进包里
                    newMediaToSave.annHeaderBgs = newMediaToSave.annHeaderBgs || [];
                    newMediaToSave.annHeaderBgs.push({ id: pureKey.replace('annHeaderBg_', ''), src: val });
                } else if (!matched && typeof val === 'string' && val.length > 10000 && /^data:(image)\//i.test(val)) {
                    // 如果名字对不上，但它是个超过1万字符的图片，当成漏网的头图强行收编
                    newMediaToSave.annHeaderBgs = newMediaToSave.annHeaderBgs || [];
                    newMediaToSave.annHeaderBgs.push(val);
                }*/
               /// 打包纪念日头图碎片 & 兜底被ZIP抽离的大图
                // 1. 如果已经是新版的整包格式（数组里装的是对象），直接原封不动拿过来
                if (!matched && pureKey === 'annHeaderBgs' && Array.isArray(val)) {
                    // 做个安全检查：如果数组第一项是个对象，说明是新格式，直接用
                    if (val.length > 0 && typeof val[0] === 'object' && val[0].src) {
                        newMediaToSave.annHeaderBgs = val;
                    } else {
                        // 如果数组里全是纯字符串，说明是更老版本的散装集合，启动洗数据
                        newMediaToSave.annHeaderBgs = val.map(str => ({ id: 'legacy_' + Math.random().toString(36).substr(2, 9), src: str }));
                    }
                    matched = true;
                }
                // 2. 处理旧架构里带前缀的散装单张图 (例如 CHAT_APP_V3_xxx_annHeaderBg_123)
                else if (!matched && typeof pureKey === 'string' && pureKey.indexOf('annHeaderBg_') === 0) {
                    // 只有当值是纯粹的 Base64 图片字符串时，才给它穿上新衣服
                    if (typeof val === 'string' && val.length > 100 && /^data:(image)\//i.test(val)) {
                        const realId = pureKey.replace('annHeaderBg_', ''); // 提取真实的纪念日 ID
                        newMediaToSave.annHeaderBgs = newMediaToSave.annHeaderBgs || [];
                        newMediaToSave.annHeaderBgs.push({ id: realId, src: val });
                    }
                    matched = true;
                }
            }
        }

        // 把拆好的包裹，一口气写入新仓库！
        if (Object.keys(newDataToSave).length > 0) {
            var existingData = await localforage.getItem('APP_DATA') || {};
            // 合并写入，防止丢失当前新仓库里其他没被覆盖的数据
            for (var mergeKey in newDataToSave) existingData[mergeKey] = newDataToSave[mergeKey];
            await localforage.setItem('APP_DATA', existingData);
        }
        if (Object.keys(newMediaToSave).length > 0 || savedBgGallery.length > 0) {
            var existingMedia = await localforage.getItem('APP_MEDIA') || {};
            for (var mergeMediaKey in newMediaToSave) existingMedia[mergeMediaKey] = newMediaToSave[mergeMediaKey];
            if (savedBgGallery.length > 0) existingMedia.backgroundGallery = savedBgGallery;
            await localforage.setItem('APP_MEDIA', existingMedia);
        }

        // 处理 localStorage
        for (var lsKey in lsRaw) {
            if (!Object.prototype.hasOwnProperty.call(lsRaw, lsKey)) continue;
            try { localStorage.setItem(lsKey, processLocalStorageValueForImport(lsRaw[lsKey], mediaStore)); } catch(e2) {}
        }

        // 打上最新版标签，告诉 loadData 安心读新仓库
        await localforage.setItem('APP_META', { version: 6.0 });

        showNotification('备份已完美适配新架构，页面即将刷新！', 'success', 3000);
        setTimeout(() => window.location.reload(), 2000);
    }



    function isFullBackupShape(d) {
        if (!d || typeof d !== 'object') return false;
        if (d.formatVersion === 5 && d.type === 'chatapp-backup-v5') return true;
        if (d.formatVersion === 4 && d.type === 'chatapp-backup-v4') return true;
        if (d.type === 'full' || (typeof d.type === 'string' && d.type.indexOf('full-backup') !== -1)) return true;
        if (d.indexedDB && typeof d.indexedDB === 'object') return true;
        if (d.localforage && typeof d.localforage === 'object') return true;
        return false;
    }

    global.ChatBackup = {
        MIN_MEDIA_CHARS: MIN_MEDIA_CHARS,
        extractMediaTree: extractMediaTree,
        inlineMediaTree: inlineMediaTree,
        buildBackupPayload: buildBackupPayload,
        exportBackupToFile: exportBackupToFile,
        loadBackupFromFile: loadBackupFromFile,
        loadBackupFromArrayBuffer: loadBackupFromArrayBuffer,
        applyBackupToStorage: applyBackupToStorage,
        serializeBackupV4: serializeBackupV4,
        getLfSource: getLfSource,
        isFullBackupShape: isFullBackupShape,
        shouldSkipKeyGroupChat: shouldSkipKeyGroupChat,
        buildModuleSkipPatterns: buildModuleSkipPatterns
    };

    // ============================================================
    // 高级 UI 接口 (统一管理所有导出/导入弹窗逻辑)
    // ============================================================

    // 映射表：仓库真实键名 -> 页面内存变量名 (用于兼容极个别没进仓库的老数据)
    const ID_TO_WINDOW_MAP = {
        'messages': 'messages',
        'chatMessages': 'messages',
        'settings': 'settings',
        'chatSettings': 'settings',
        'backgroundGallery': 'savedBackgrounds',
        'boardDataV2': 'boardDataV2',
        'customReplies': 'customReplies',
        'customEmojis': 'customEmojis',
        'stickerLibrary': 'stickerLibrary',
        'anniversaries': 'anniversaries',
        'calendarEvents': 'calendarEvents',
    };

  // ============================================================
  // 🌟 终极无损备份架构：物理分离版 (全量导入导出)
  // ============================================================

  // 1. 全量导出入口（物理分离打包法）
 /* global.ChatBackup.exportFullBackup = async function() {
    try {
      if (typeof showNotification === 'function') showNotification('正在准备底层无损打包...', 'info', 2000);
      await saveData(); // 刷内存进硬盘

      if (typeof JSZip === 'undefined') {
        throw new Error('JSZip 组件未加载，无法进行无损打包');
      }

      const zip = new JSZip();
      // 🌟 导出前，把 ls 里的 v1 老数据偷渡进新仓库进行合并
        try {
            const v1Str = localStorage.getItem('diviHistory_v1');
            if (v1Str) {
                const v1Arr = JSON.parse(v1Str);
                // 先把当前柜子里的数据拿出来
                let tempData = await localforage.getItem('APP_DATA') || {};
                // 把 v1 追加到柜子里的 diviHistory 后面（去重合并）
                if (Array.isArray(v1Arr)) {
                    let existing = tempData.diviHistory || [];
                    // 简单合并：把 v1 放前面，新数据放后面
                    tempData.diviHistory = [...v1Arr, ...existing];
                    // 合并完塞回柜子
                    await localforage.setItem('APP_DATA', tempData);
                }
            }
        } catch(e) {
            console.warn('合并 v1 历史数据失败:', e);
        }
      // --- 第一步：拿文字数据 ---
      const textData = await localforage.getItem('APP_DATA') || {};
      zip.file('data.json', '\uFEFF' + JSON.stringify(textData));

      // --- 第二步：拿媒体数据（图片与字体分流处理） ---
      const mediaData = await localforage.getItem('APP_MEDIA') || {};
      
      // 提前把字体列表单独拎出来，避免在原对象上修改
      const rawFontList = mediaData.local_font_list; 
      delete mediaData.local_font_list; // 剩下的全是图片等常规媒体

      // 2.1 处理常规媒体（沿用安全的大图抽离逻辑）
      const mediaIndex = {};
      const mediaFolder = zip.folder('media');
      for (const key in mediaData) {
        if (!Object.prototype.hasOwnProperty.call(mediaData, key)) continue;
        const url = mediaData[key];
        if (typeof url !== 'string' || url.length < 100) continue; // 太短的跳过，不是图
        
        const parts = dataUrlToBinary(url);
        if (parts && parts.bytes && parts.bytes.length) {
          const path = key + '.bin'; 
          mediaFolder.file(path, parts.bytes, { binary: true });
          mediaIndex[key] = { path: 'media/' + path, mime: parts.mime };
        }
      }

    // 2.2 🌟 终极统一管理版：直接从管家的专属屋拎原件打包
        const fontIndex = [];
        const fontListCards = mediaData.localFontData; // 拿到轻量名片
        
        if (Array.isArray(fontListCards) && fontListCards.length > 0 && typeof DB_GATEWAY !== 'undefined') {
            const fontFolder = zip.folder('fonts');
            
            for (let index = 0; index < fontListCards.length; index++) {
                const card = fontListCards[index];
                if (!card || !card.id) continue;
                
                // 🌟 核心：直接找管家去专属屋（APP_FONTS）拿真身！
                const pureBuffer = DB_GATEWAY.getFontBuffer(card.id);
                
                if (pureBuffer && pureBuffer instanceof ArrayBuffer && pureBuffer.byteLength > 0) {
                    // 自动识别后缀
                    let ext = 'ttf';
                    if (card.name) {
                        const match = card.name.match(/\.(woff2?|otf|ttf)$/i);
                        if (match) ext = match[0].slice(1);
                    }
                            
                    // 🌟 直接拿用户上传时的真名字作为文件名，绝不再自己编
                    const realFileName = card.name || `font_${index}.${ext}`;
                    fontFolder.file(realFileName, pureBuffer);
                    
                    // 🌟 核心改动：把【纯粹的文件名】(去掉.ttf后缀) 作为名字存进清单
                    // 将来导入时，app 就全靠这个名字来找它了！
                    const pureName = realFileName.replace(/\.(woff2?|otf|ttf)$/i, '');
                    fontIndex.push({ fileName: realFileName, name: pureName });
                }
            }
        }


      // --- 第三步：生成新版的防伪说明书 ---
      const manifest = {
        _backup_type: 'PHYSICAL_SEPARATION_V1', // 新格式的身份证
        timestamp: new Date().toISOString(),
        mediaIndex: mediaIndex,
        fontIndex: fontIndex
      };
      zip.file('manifest.json', '\uFEFF' + JSON.stringify(manifest));

      // --- 第四步：压包下载 ---
      if (typeof showNotification === 'function') showNotification('正在压缩二进制文件...', 'info', 2000);
      const zipBlob = await zip.generateAsync({ 
        type: 'blob', 
        compression: 'DEFLATE', 
        compressionOptions: { level: 6 } 
      });

      const dateStr = new Date().toISOString().slice(0, 10);
      const fileName = `传讯-无损全量备份-${dateStr}.zip`;

      // 移动端分享拦截
      if (navigator.share && /Mobile|Android|iPhone|iPad/.test(navigator.userAgent)) {
        try {
          const shareFile = new File([zipBlob], fileName, { type: 'application/zip' });
          if (navigator.canShare && navigator.canShare({ files: [shareFile] })) {
            await navigator.share({ files: [shareFile], title: '传讯无损备份' });
            if (typeof showNotification === 'function') showNotification('备份导出成功', 'success');
            return;
          }
        } catch (e) { }
      }

      downloadBlob(zipBlob, fileName);
      if (typeof showNotification === 'function') showNotification('无损备份导出成功（字体文件完整保留）', 'success', 3500);

    } catch (error) {
      console.error('[全量备份] 打包失败:', error);
      if (typeof showNotification === 'function') showNotification('备份失败: ' + error.message, 'error');
    }
  };*/
  global.ChatBackup.exportFullBackup = async function() {
    try {
        if (typeof showNotification === 'function') showNotification('正在准备底层无损打包...', 'info', 2000);
        await saveData();
        if (typeof JSZip === 'undefined') {
            throw new Error('JSZip 组件未加载，无法进行无损打包');
        }
        const zip = new JSZip();

        try {
            const v1Str = localStorage.getItem('diviHistory_v1');
            if (v1Str) {
                const v1Arr = JSON.parse(v1Str);
                let tempData = await localforage.getItem('APP_DATA') || {};
                if (Array.isArray(v1Arr)) {
                    let existing = tempData.diviHistory || [];
                    tempData.diviHistory = [...v1Arr, ...existing];
                    await localforage.setItem('APP_DATA', tempData);
                }
            }
        } catch(e) { console.warn('合并 v1 历史数据失败:', e); }

        const textData = await localforage.getItem('APP_DATA') || {};
        zip.file('data.json', '\uFEFF' + JSON.stringify(textData));

        const mediaData = await localforage.getItem('APP_MEDIA') || {};
        const rawFontList = mediaData.local_font_list;
        delete mediaData.local_font_list;

        const mediaIndex = {};
        const mediaFolder = zip.folder('media');

        // 🌟 核心修复：图片就是图片，原样抽离成二进制，数组结构由导入时按索引拼回
        /*for (const key in mediaData) {
            if (!Object.prototype.hasOwnProperty.call(mediaData, key)) continue;
            const val = mediaData[key];

            if (typeof val === 'string' && val.length > 100) {
                const parts = dataUrlToBinary(val);
                if (parts && parts.bytes && parts.bytes.length) {
                    const path = key + '.bin';
                    mediaFolder.file(path, parts.bytes, { binary: true });
                    mediaIndex[key] = { path: 'media/' + path, mime: parts.mime, type: 'string' };
                }
            } else if (Array.isArray(val)) {
                const arrIndex = [];
                for (let i = 0; i < val.length; i++) {
                    const item = val[i];
                    if (typeof item === 'string' && item.length > 100) {
                        const parts = dataUrlToBinary(item);
                        if (parts && parts.bytes && parts.bytes.length) {
                            const path = key + '_' + i + '.bin';
                            mediaFolder.file(path, parts.bytes, { binary: true });
                            arrIndex.push({ path: 'media/' + path, mime: parts.mime });
                        } else {
                            arrIndex.push(null); // 不是图，留空
                        }
                    } else {
                        arrIndex.push(null); // 不是图，留空
                    }
                }
                mediaIndex[key] = { type: 'array', items: arrIndex };
            }
        }*/
               // 🌟 终极归一：现在全部都是纯字符串数组了，管你是表情、通话还是背景，统统一个逻辑！
        for (const key in mediaData) {
            if (!Object.prototype.hasOwnProperty.call(mediaData, key)) continue;
            const val = mediaData[key];

            if (typeof val === 'string' && val.length > 100) {
                // 单图（如 chatBackground）
                const parts = dataUrlToBinary(val);
                if (parts && parts.bytes && parts.bytes.length) {
                    const path = key + '.bin';
                    mediaFolder.file(path, parts.bytes, { binary: true });
                    mediaIndex[key] = { path: 'media/' + path, mime: parts.mime, type: 'string' };
                }
            } else if (Array.isArray(val)) {
                // 纯字符串数组（如 stickerLibrary, callBgLibrary, backgroundGallery）
                const arrIndex = [];
                for (let i = 0; i < val.length; i++) {
                    const item = val[i];
                    if (typeof item === 'string' && item.length > 100) {
                        const parts = dataUrlToBinary(item);
                        if (parts && parts.bytes && parts.bytes.length) {
                            const path = key + '_' + i + '.bin';
                            mediaFolder.file(path, parts.bytes, { binary: true });
                            arrIndex.push({ path: 'media/' + path, mime: parts.mime });
                        } else {
                            arrIndex.push(null);
                        }
                    } else {
                        arrIndex.push(null);
                    }
                }
                mediaIndex[key] = { type: 'array', items: arrIndex };
            }
        }


        const fontIndex = [];
        const fontListCards = mediaData.localFontData;
        if (Array.isArray(fontListCards) && fontListCards.length > 0 && typeof DB_GATEWAY !== 'undefined') {
            const fontFolder = zip.folder('fonts');
            for (let index = 0; index < fontListCards.length; index++) {
                const card = fontListCards[index];
                if (!card || !card.id) continue;
                const pureBuffer = DB_GATEWAY.getFontBuffer(card.id);
                if (pureBuffer && pureBuffer instanceof ArrayBuffer && pureBuffer.byteLength > 0) {
                    let ext = 'ttf';
                    if (card.name) {
                        const match = card.name.match(/\.(woff2?|otf|ttf)$/i);
                        if (match) ext = match[0].slice(1);
                    }
                    const realFileName = card.name || `font_${index}.${ext}`;
                    fontFolder.file(realFileName, pureBuffer);
                    const pureName = realFileName.replace(/\.(woff2?|otf|ttf)$/i, '');
                    fontIndex.push({ fileName: realFileName, name: pureName });
                }
            }
        }

        const manifest = { 
            _backup_type: 'PHYSICAL_SEPARATION_V1', 
            timestamp: new Date().toISOString(), 
            mediaIndex: mediaIndex, 
            fontIndex: fontIndex 
        };
        zip.file('manifest.json', '\uFEFF' + JSON.stringify(manifest));

        if (typeof showNotification === 'function') showNotification('正在压缩二进制文件...', 'info', 2000);
        const zipBlob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } });
        const dateStr = new Date().toISOString().slice(0, 10);
        const fileName = `传讯-无损全量备份-${dateStr}.zip`;

        if (navigator.share && /Mobile|Android|iPhone|iPad/.test(navigator.userAgent)) {
            try {
                const shareFile = new File([zipBlob], fileName, { type: 'application/zip' });
                if (navigator.canShare && navigator.canShare({ files: [shareFile] })) {
                    await navigator.share({ files: [shareFile], title: '传讯无损备份' });
                    if (typeof showNotification === 'function') showNotification('备份导出成功', 'success');
                    return;
                }
            } catch (e) { /* 降级走普通下载 */ }
        }
        downloadBlob(zipBlob, fileName);
        if (typeof showNotification === 'function') showNotification('无损备份导出成功（字体文件完整保留）', 'success', 3500);
    } catch (error) {
        console.error('[全量备份] 打包失败:', error);
        if (typeof showNotification === 'function') showNotification('备份失败: ' + error.message, 'error');
    }
};


  // 2. 智能导入总入口（双轨制识别 + 无损还原）
  /*global.ChatBackup.importAnyBackup = async function(file) {
    try {
      const ab = await file.arrayBuffer();
      const u8 = new Uint8Array(ab);
      const isZip = ab.byteLength >= 4 && u8[0] === 0x50 && u8[1] === 0x4b && (u8[2] === 0x03 || u8[2] === 0x05 || u8[2] === 0x07) && (u8[3] === 0x04 || u8[3] === 0x06 || u8[3] === 0x08);

            // ===== 只有是 ZIP，才需要判断是新还是旧 =====
      if (isZip) {
        if (typeof JSZip === 'undefined') throw new Error('JSZip 未加载，无法读取备份');
        const zip = await JSZip.loadAsync(ab);

        // 🔍 新眼睛：看一眼有没有我们刚写的“防伪说明书”
        const manifestFile = zip.file('manifest.json');
        if (manifestFile) {
          let manifestStr = await manifestFile.async('string');
          if (manifestStr.charCodeAt(0) === 0xFEFF) manifestStr = manifestStr.slice(1);
          const manifest = JSON.parse(manifestStr);
            // 认出身份证了！启动【新轨无损还原逻辑】
            if (manifest._backup_type === 'PHYSICAL_SEPARATION_V1') {
                if (!confirm('检测到【无损全量备份】\n\n⚠️ 这将覆盖当前所有数据，确定继续吗？')) return;
                if (typeof showNotification === 'function') showNotification('正在无损还原数据...', 'info', 3000);

                // 1. 读取并解析混合数据包
                let dataStr = await (zip.file('data.json')).async('string');
                if (dataStr.charCodeAt(0) === 0xFEFF) dataStr = dataStr.slice(1);
                const mixedData = JSON.parse(dataStr);

                // 2. 严格分流，把进错屋的数据赶回正确的房间（不再做任何 inlineMediaTree 拼装）
                const pureTextData = {};
                const pureMediaData = {};
                
                const MEDIA_KEYS = [
                    'backgroundGallery', 'chatBackground', 'partnerAvatar', 'myAvatar', 
                    'stickerLibrary', 'myStickerLibrary', 'callBgLibrary', 'annHeaderBgs', 
                    'localFontData'
                ];

                for (const key in mixedData) {
                    if (!Object.prototype.hasOwnProperty.call(mixedData, key)) continue;
                    // 在媒体名单里，直接塞进媒体柜，原样写入，绝不拆解
                    if (MEDIA_KEYS.includes(key)) {
                        pureMediaData[key] = mixedData[key];
                    } else {
                        pureTextData[key] = mixedData[key];
                    }
                }

                // 3. 还原被抽离的单张散装图片 (如 chatBackground 等，这些是在导出时按 key 单独剥离成 bin 的)
                const mediaIndex = manifest.mediaIndex || {};
                for (const key in mediaIndex) {
                    const meta = mediaIndex[key];
                    const zf = zip.file(meta.path);
                    if (!zf) continue;
                    const fileBytes = await zf.async('arraybuffer');
                    // 直接把还原出的 Base64 覆盖进媒体柜对应的 key
                    pureMediaData[key] = binaryToDataUrl(meta.mime, new Uint8Array(fileBytes));
                }

                // 4. 还原字体 (按真实名字原封不动塞回专属屋)
                const fontIndex = manifest.fontIndex || [];
                if (fontIndex.length > 0) {
                    const pureFontList = [];
                    const realFontBuffers = {};
                    for (let i = 0; i < fontIndex.length; i++) {
                        const fInfo = fontIndex[i];
                        const fFile = zip.file('fonts/' + fInfo.fileName);
                        if (fFile) {
                            const pureBuffer = await fFile.async('arraybuffer');
                            const realName = fInfo.name;
                            pureFontList.push({ id: realName, name: realName });
                            realFontBuffers[realName] = pureBuffer;
                        }
                    }
                    await localforage.setItem('APP_FONTS', realFontBuffers);
                    pureMediaData.localFontData = pureFontList;
                    
                    if (!pureTextData.chatSettings) pureTextData.chatSettings = {};
                    pureTextData.chatSettings.useLocalFont = true;
                    pureTextData.chatSettings.activeLocalFontId = pureFontList.length > 0 ? pureFontList[0].id : '';
                }

                // 5. 一口气原样写入硬盘，大功告成
                await localforage.setItem('APP_DATA', pureTextData);
                await localforage.setItem('APP_MEDIA', pureMediaData);
                
                // 🌟 版本号必须对齐
                await localforage.setItem('APP_META', { version: 6.1 });

                if (typeof showNotification === 'function') showNotification('无损还原完成，页面即将刷新', 'success');
                setTimeout(() => window.location.reload(), 1500);
                return; // 结束，不往下走了
            }

        }

        // ===== 走到这里，说明是旧站的 ZIP（没有新身份证），启动【老轨拆包逻辑】 =====
        if (!confirm('检测到【旧站全量备份（ZIP）】\n\n这将覆盖当前所有数据，确定继续吗？')) return;
        if (typeof showNotification === 'function') showNotification('正在恢复旧版数据...', 'info', 3000);
        const data = await ChatBackup.loadBackupFromArrayBuffer(ab); // 调用老拆包机
        if (!ChatBackup.isFullBackupShape(data)) throw new Error('ZIP 内的备份格式无效');
        await ChatBackup.applyBackupToStorage(data); // 调用老入库机
        return;
      }


      // ===== 不是 ZIP 的处理（兼容极老的纯 JSON） =====
      let text = new TextDecoder('utf-8', { fatal: false }).decode(ab);
      if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1);
      let parsed; try { parsed = JSON.parse(text); } catch (_) { parsed = null; }
      
      if (parsed && ChatBackup.isFullBackupShape(parsed)) {
        if (!confirm('检测到【旧站全量备份（JSON）】\n\n这将覆盖当前所有数据，确定继续吗？')) return;
        await ChatBackup.applyBackupToStorage(parsed);
        return;
      }
      
      // 情况 B：新站的选择性备份 (JSON)
      if (parsed && (parsed.version || parsed.messages || parsed.settings)) {
        global.ChatBackup.handleLegacyImport(parsed);
        return;
      }

      throw new Error('无法识别的文件格式');
    } catch (error) {
      console.error('导入失败:', error);
      if (typeof showNotification === 'function') showNotification('导入失败: ' + error.message, 'error');
    }
  };*/
  global.ChatBackup.importAnyBackup = async function(file) {
    try {
        const ab = await file.arrayBuffer();
        const u8 = new Uint8Array(ab);
        const isZip = ab.byteLength >= 4 && u8[0] === 0x50 && u8[1] === 0x4b && (u8[2] === 0x03 || u8[2] === 0x05 || u8[2] === 0x07) && (u8[3] === 0x04 || u8[3] === 0x06 || u8[3] === 0x08);

        if (isZip) {
            if (typeof JSZip === 'undefined') throw new Error('JSZip 未加载，无法读取备份');
            const zip = await JSZip.loadAsync(ab);
            const manifestFile = zip.file('manifest.json');
            
            if (manifestFile) {
                let manifestStr = await manifestFile.async('string');
                if (manifestStr.charCodeAt(0) === 0xFEFF) manifestStr = manifestStr.slice(1);
                const manifest = JSON.parse(manifestStr);

                if (manifest._backup_type === 'PHYSICAL_SEPARATION_V1') {
                    if (!confirm('检测到【无损全量备份】\n\n⚠️ 这将覆盖当前所有数据，确定继续吗？')) return;
                    if (typeof showNotification === 'function') showNotification('正在无损还原数据...', 'info', 3000);

                    let dataStr = await (zip.file('data.json')).async('string');
                    if (dataStr.charCodeAt(0) === 0xFEFF) dataStr = dataStr.slice(1);
                    const mixedData = JSON.parse(dataStr);

                    const pureTextData = {};
                    const pureMediaData = {};
                    const MEDIA_KEYS = [ 
                        'backgroundGallery', 'chatBackground', 'partnerAvatar', 'myAvatar', 
                        'stickerLibrary', 'myStickerLibrary', 'callBgLibrary', 'annHeaderBgs', 
                        'localFontData' 
                    ];

                    for (const key in mixedData) {
                        if (!Object.prototype.hasOwnProperty.call(mixedData, key)) continue;
                        if (MEDIA_KEYS.includes(key)) {
                            pureMediaData[key] = mixedData[key];
                        } else {
                            pureTextData[key] = mixedData[key];
                        }
                    }

                    // 🌟 核心修复：根据索引把散落的图片原样拼回数组
                    const mediaIndex = manifest.mediaIndex || {};
                    for (const key in mediaIndex) {
                        const meta = mediaIndex[key];
                        
                        if (meta.type === 'array') {
                            const restoredArray = [];
                            // 如果 data.json 里存了残留的空壳，先用它占位保序
                            const existingArr = pureMediaData[key] || [];
                            
                            for (let i = 0; i < meta.items.length; i++) {
                                const itemMeta = meta.items[i];
                                if (itemMeta && itemMeta.path) {
                                    const zf = zip.file(itemMeta.path);
                                    if (zf) {
                                        const fileBytes = await zf.async('arraybuffer');
                                        restoredArray.push(binaryToDataUrl(itemMeta.mime, new Uint8Array(fileBytes)));
                                    } else {
                                        restoredArray.push(existingArr[i] || '');
                                    }
                                } else {
                                    restoredArray.push(existingArr[i] || '');
                                }
                            }
                            pureMediaData[key] = restoredArray;
                        } else {
                            const zf = zip.file(meta.path);
                            if (!zf) continue;
                            const fileBytes = await zf.async('arraybuffer');
                            pureMediaData[key] = binaryToDataUrl(meta.mime, new Uint8Array(fileBytes));
                        }
                    }

                    const fontIndex = manifest.fontIndex || [];
                    if (fontIndex.length > 0) {
                        const pureFontList = [];
                        const realFontBuffers = {};
                        for (let i = 0; i < fontIndex.length; i++) {
                            const fInfo = fontIndex[i];
                            const fFile = zip.file('fonts/' + fInfo.fileName);
                            if (fFile) {
                                const pureBuffer = await fFile.async('arraybuffer');
                                const realName = fInfo.name;
                                pureFontList.push({ id: realName, name: realName });
                                realFontBuffers[realName] = pureBuffer;
                            }
                        }
                        await localforage.setItem('APP_FONTS', realFontBuffers);
                        pureMediaData.localFontData = pureFontList;
                        if (!pureTextData.chatSettings) pureTextData.chatSettings = {};
                        pureTextData.chatSettings.useLocalFont = true;
                        pureTextData.chatSettings.activeLocalFontId = pureFontList.length > 0 ? pureFontList[0].id : '';
                    }

                    await localforage.setItem('APP_DATA', pureTextData);
                    await localforage.setItem('APP_MEDIA', pureMediaData);
                    await localforage.setItem('APP_META', { version: 6.1 });
                    
                    if (typeof showNotification === 'function') showNotification('无损还原完成，页面即将刷新', 'success');
                    setTimeout(() => window.location.reload(), 1500);
                    return;
                }
            }

            if (!confirm('检测到【旧站全量备份（ZIP）】\n\n这将覆盖当前所有数据，确定继续吗？')) return;
            if (typeof showNotification === 'function') showNotification('正在恢复旧版数据...', 'info', 3000);
            const data = await ChatBackup.loadBackupFromArrayBuffer(ab);
            if (!ChatBackup.isFullBackupShape(data)) throw new Error('ZIP 内的备份格式无效');
            await ChatBackup.applyBackupToStorage(data);
            return;
        }

        let text = new TextDecoder('utf-8', { fatal: false }).decode(ab);
        if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1);
        let parsed;
        try { parsed = JSON.parse(text); } catch (_) { parsed = null; }
        
        if (parsed && ChatBackup.isFullBackupShape(parsed)) {
            if (!confirm('检测到【旧站全量备份（JSON）】\n\n这将覆盖当前所有数据，确定继续吗？')) return;
            await ChatBackup.applyBackupToStorage(parsed);
            return;
        }
        if (parsed && (parsed.version || parsed.messages || parsed.settings)) {
            global.ChatBackup.handleLegacyImport(parsed);
            return;
        }
        throw new Error('无法识别的文件格式');
    } catch (error) {
        console.error('导入失败:', error);
        if (typeof showNotification === 'function') showNotification('导入失败: ' + error.message, 'error');
    }
};

    // 3. 选择性导出弹窗
    global.ChatBackup.exportChatHistory = function(isAllMode = false) {
      const overlay = document.createElement('div');
      overlay.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,0.55);backdrop-filter:blur(8px);display:flex;align-items:center;justify-content:center;animation:fadeIn 0.2s ease;';
      const displayItems = [];
    window.APP_DATA_REGISTRY.forEach(item => {
        if (item.backup && !item.isVirtual) displayItems.push(item);
    });
      
      const makeRow = (item) => {
        let sub = '';
        if (item.isVirtual && item.children) {
          const validChildren = item.children.filter(cid => {
            const reg = window.APP_DATA_REGISTRY.find(r => r.id === cid);
            const val = reg && reg.getValue ? reg.getValue() : window[cid]; 
            return val && (Array.isArray(val) ? val.length > 0 : Object.keys(val).length > 0);
          });
          sub = validChildren.length > 0 ? `(包含 ${validChildren.length} 项配置)` : '(空)';
        } else {
          // 彻底根治：直接调注册表小弟的 getValue，它能精准穿透拿到 DB_GATEWAY 的真数据
          const val = item.getValue ? item.getValue() : (window[ID_TO_WINDOW_MAP[item.id] || item.id]);
          if (Array.isArray(val)) sub = `(${val.length} 条)`;
          else if (val && typeof val === 'object') sub = '(已配置)';
          else sub = '(空)';
        }
        const checked = isAllMode ? 'checked' : '';
        return `<label style="display:flex;align-items:center;gap:10px;cursor:pointer;padding:10px 12px;border:1px solid var(--border-color);border-radius:12px;background:var(--primary-bg);font-size:13px;color:var(--text-primary);"><input type="checkbox" data-export-id="${item.id}" ${checked} style="accent-color:var(--accent-color);width:15px;height:15px;"><i class="fas ${item.icon}" style="color:var(--accent-color);width:16px;text-align:center;"></i><span>${item.name} <span style="font-size:11px;color:var(--text-secondary);margin-left:4px;">${sub}</span></span></label>`;
      };

      overlay.innerHTML = `<div style="background:var(--secondary-bg);border-radius:20px;padding:24px;width:88%;max-width:360px;box-shadow:0 20px 60px rgba(0,0,0,0.4);animation:modalContentSlideIn 0.3s ease forwards;"><div style="font-size:15px;font-weight:700;color:var(--text-primary);margin-bottom:6px;display:flex;align-items:center;gap:8px;"><i class="fas fa-file-export" style="color:var(--accent-color);font-size:14px;"></i>选择导出内容</div><div style="font-size:12px;color:var(--text-secondary);margin-bottom:16px;">${isAllMode ? '全量备份模式 (建议全选)' : '勾选需要备份的数据'}</div><div style="display:flex;flex-direction:column;gap:9px;margin-bottom:20px;max-height:50vh;overflow-y:auto;">${displayItems.map(makeRow).join('')}</div><div style="display:flex;gap:10px;"><button id="_exp_cancel" style="flex:1;padding:11px;border:1px solid var(--border-color);border-radius:12px;background:none;color:var(--text-secondary);font-size:13px;cursor:pointer;font-family:var(--font-family);">取消</button><button id="_exp_confirm" style="flex:2;padding:11px;border:none;border-radius:12px;background:var(--accent-color);color:#fff;font-size:13px;font-weight:600;cursor:pointer;font-family:var(--font-family);display:flex;align-items:center;justify-content:center;gap:7px;"><i class="fas fa-download"></i>确认导出</button></div></div>`;
      
      document.body.appendChild(overlay);
      const closeDialog = () => overlay.remove();
      const checkBtn = document.getElementById('_exp_confirm');
      const allCbs = overlay.querySelectorAll('input[data-export-id]');
      const warningTip = document.createElement('div');
      warningTip.style.cssText = 'font-size:12px;color:#FF3B30;text-align:center;margin-top:-6px;margin-bottom:6px;height:16px;opacity:0;transition:opacity 0.2s;';
      warningTip.textContent = '⚠️ 请至少选择一项内容';
      checkBtn.parentNode.insertBefore(warningTip, checkBtn);

      function updateExpBtnState() {
        let c = 0; allCbs.forEach(cb => { if (cb.checked) c++; });
        checkBtn.style.opacity = c > 0 ? '1' : '0.5';
        checkBtn.style.pointerEvents = c > 0 ? 'auto' : 'none';
        warningTip.style.opacity = c > 0 ? '0' : '1';
      }
      allCbs.forEach(cb => cb.addEventListener('change', updateExpBtnState));
      updateExpBtnState();

      overlay.onclick = (e) => { if(e.target === overlay) closeDialog(); };
      document.getElementById('_exp_cancel').onclick = closeDialog;
      
      document.getElementById('_exp_confirm').onclick = async function() {
        closeDialog();
        const exportObj = { version: '4.0-auto', appName: 'ChatApp', date: new Date().toISOString() };
        await saveData(); // 先把内存数据刷进硬盘
        // 🌟 选择性导出前，同样把 ls 里的 v1 偷渡拼进新仓库
        try {
            const v1Str = localStorage.getItem('diviHistory_v1');
            if (v1Str) {
                const v1Arr = JSON.parse(v1Str);
                let tempData = await localforage.getItem('APP_DATA') || {};
                if (Array.isArray(v1Arr)) {
                    let existing = tempData.diviHistory || [];
                    tempData.diviHistory = [...v1Arr, ...existing];
                    await localforage.setItem('APP_DATA', tempData);
                }
            }
        } catch(e) {
            console.warn('选择性导出-合并v1失败:', e);
        }
        const currentData = await localforage.getItem('APP_DATA') || {};
        const currentMedia = await localforage.getItem('APP_MEDIA') || {};
        const realDb = { ...currentData, ...currentMedia }; // 合并两个真实仓库

        window.APP_DATA_REGISTRY.forEach(reg => {
          if (reg.isVirtual) return;
          let isChecked = false;
          if (reg.group) { const g = overlay.querySelector(`[data-export-id="${reg.group}"]`); if (g) isChecked = g.checked; }
          else { const c = overlay.querySelector(`[data-export-id="${reg.id}"]`); if (c) isChecked = c.checked; }
          
          if (isChecked) {
            // 优先从真实仓库拿，拿不到再降级去内存拿
            const windowVarName = ID_TO_WINDOW_MAP[reg.id] || reg.id;
            const val = realDb[reg.id] !== undefined ? realDb[reg.id] : window[windowVarName];
            if (val !== null && val !== undefined) exportObj[reg.id] = val;
          }
        });

        if (Object.keys(exportObj).length <= 3) { showNotification('请至少选择一项内容', 'error'); return; }
        try {
          const dataStr = JSON.stringify(exportObj, null, 2);
          const blob = new Blob([dataStr], { type: 'application/json;charset=utf-8' });
          const url = URL.createObjectURL(blob); 
          const a = document.createElement('a'); 
          a.href = url; 
          a.download = `传讯-备份-${new Date().toLocaleDateString().replace(/\//g, '-')}.json`; 
          a.click(); 
          URL.revokeObjectURL(url);
          showNotification('导出成功', 'success');
        } catch(e) { showNotification('导出失败，数据可能过大', 'error'); }
      };
    };

    // 4. 选择性导入弹窗
    global.ChatBackup.handleLegacyImport = async function(importedData) {
      try {
        const overlay = document.createElement('div');
        overlay.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,0.55);backdrop-filter:blur(8px);display:flex;align-items:center;justify-content:center;animation:fadeIn 0.2s ease;';
        const rows = [];
        window.APP_DATA_REGISTRY.forEach(reg => {
          if (reg.isVirtual && reg.children) {
            if (reg.children.some(cid => importedData[cid])) {
              rows.push(`<label style="display:flex;align-items:center;gap:10px;cursor:pointer;padding:10px 12px;border:1px solid var(--border-color);border-radius:12px;background:var(--primary-bg);font-size:13px;color:var(--text-primary);"><input type="checkbox" data-imp-id="${reg.id}" checked style="accent-color:var(--accent-color);width:15px;height:15px;"><i class="fas ${reg.icon}" style="color:var(--accent-color);width:16px;text-align:center;"></i><span>${reg.name} (检测到数据)</span></label>`);
            }
            return;
          }
          if (importedData[reg.id]) {
            rows.push(`<label style="display:flex;align-items:center;gap:10px;cursor:pointer;padding:10px 12px;border:1px solid var(--border-color);border-radius:12px;background:var(--primary-bg);font-size:13px;color:var(--text-primary);"><input type="checkbox" data-imp-id="${reg.id}" checked style="accent-color:var(--accent-color);width:15px;height:15px;"><i class="fas ${reg.icon}" style="color:var(--accent-color);width:16px;text-align:center;"></i><span>${reg.name}</span></label>`);
          }
        });
        if (rows.length === 0) { showNotification('文件中没有识别到有效数据', 'error'); return; }

        overlay.innerHTML = `<div style="background:var(--secondary-bg);border-radius:20px;padding:24px;width:88%;max-width:360px;box-shadow:0 20px 60px rgba(0,0,0,0.4);animation:modalContentSlideIn 0.3s ease forwards;"><div style="font-size:15px;font-weight:700;color:var(--text-primary);margin-bottom:16px;">选择要导入的内容</div><div style="font-size:12px;color:var(--text-secondary);margin-bottom:12px;">文件中检测到以下数据，选择要导入的模块</div><div style="display:flex;gap:8px;margin-bottom:16px;"><label style="flex:1;display:flex;align-items:center;justify-content:center;gap:5px;cursor:pointer;padding:8px 0;border:1.5px solid var(--accent-color);border-radius:10px;background:rgba(var(--accent-color-rgb,224,105,138),0.1);font-size:12px;color:var(--accent-color);font-weight:600;" id="mode-overwrite-label"><input type="radio" name="import-mode" value="overwrite" checked style="display:none;">覆盖导入</label><label style="flex:1;display:flex;align-items:center;justify-content:center;gap:5px;cursor:pointer;padding:8px 0;border:1.5px solid var(--border-color);border-radius:10px;font-size:12px;color:var(--text-secondary);" id="mode-append-label"><input type="radio" name="import-mode" value="append" style="display:none;">追加导入</label></div><div style="display:flex;flex-direction:column;gap:9px;margin-bottom:20px;max-height:40vh;overflow-y:auto;">${rows.join('')}</div><div style="display:flex;gap:10px;"><button id="_imp_cancel" style="flex:1;padding:11px;border:1px solid var(--border-color);border-radius:12px;background:none;color:var(--text-secondary);font-size:13px;cursor:pointer;font-family:var(--font-family);">取消</button><button id="_imp_confirm" style="flex:2;padding:11px;border:none;border-radius:12px;background:var(--accent-color);color:#fff;font-size:13px;font-weight:600;cursor:pointer;font-family:var(--font-family);">确认导入</button></div></div>`;
        
        document.body.appendChild(overlay);
        const closeDialog = () => overlay.remove();
        overlay.onclick = (e) => { if(e.target === overlay) closeDialog(); };
        document.getElementById('_imp_cancel').onclick = closeDialog;

        // 追加/覆盖样式切换
        const overwriteLabel = document.getElementById('mode-overwrite-label');
        const appendLabel = document.getElementById('mode-append-label');
        if (overwriteLabel && appendLabel) {
          overwriteLabel.addEventListener('click', () => { overwriteLabel.style.cssText = 'flex:1;display:flex;align-items:center;justify-content:center;gap:5px;cursor:pointer;padding:8px 0;border:1.5px solid var(--accent-color);border-radius:10px;background:rgba(var(--accent-color-rgb,224,105,138),0.1);font-size:12px;color:var(--accent-color);font-weight:600;'; appendLabel.style.cssText = 'flex:1;display:flex;align-items:center;justify-content:center;gap:5px;cursor:pointer;padding:8px 0;border:1.5px solid var(--border-color);border-radius:10px;font-size:12px;color:var(--text-secondary);'; });
          appendLabel.addEventListener('click', () => { appendLabel.style.cssText = 'flex:1;display:flex;align-items:center;justify-content:center;gap:5px;cursor:pointer;padding:8px 0;border:1.5px solid var(--accent-color);border-radius:10px;background:rgba(var(--accent-color-rgb,224,105,138),0.1);font-size:12px;color:var(--accent-color);font-weight:600;'; overwriteLabel.style.cssText = 'flex:1;display:flex;align-items:center;justify-content:center;gap:5px;cursor:pointer;padding:8px 0;border:1.5px solid var(--border-color);border-radius:10px;font-size:12px;color:var(--text-secondary);'; });
        }

        document.getElementById('_imp_confirm').onclick = async function() {
          closeDialog();
          const modeRadio = overlay.querySelector('input[name="import-mode"]:checked');
          const isAppend = modeRadio && modeRadio.value === 'append';
          const textToSave = {};
          const mediaToSave = {};

          window.APP_DATA_REGISTRY.forEach(reg => {
            if (reg.isVirtual) return;
            let isChecked = false;
            if (reg.group) { const groupCb = overlay.querySelector(`[data-imp-id="${reg.group}"]`); if (groupCb) isChecked = groupCb.checked; }
            else { const cb = overlay.querySelector(`[data-imp-id="${reg.id}"]`); if (cb) isChecked = cb.checked; }

            if (isChecked && importedData[reg.id] !== undefined) {
              if (isAppend) {
                if (reg.id === 'chatMessages') {
                  const existingIds = new Set(messages.map(m => m.id));
                  const newMsgs = (importedData[reg.id] || []).map(m => ({...m, timestamp: new Date(m.timestamp)}));
                  const uniqueNew = newMsgs.filter(m => !existingIds.has(m.id));
                  messages = [...messages, ...uniqueNew].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
                } else {
                    // 需要映射回真实的内存变量名
                    const realWindowVar = ID_TO_WINDOW_MAP[reg.id] || reg.id;
                    const curVal = window[realWindowVar]; 
                    const incVal = importedData[reg.id];
                    if (Array.isArray(curVal) && Array.isArray(incVal)) window[realWindowVar] = [...curVal, ...incVal];
                    else if (typeof curVal === 'object' && curVal !== null && typeof incVal === 'object') window[realWindowVar] = { ...curVal, ...incVal };
                    else window[realWindowVar] = incVal;
                }
              } else {
                // 覆盖模式：精准分流到文字仓或媒体仓
                const mediaKeys = ['backgroundGallery', 'stickerLibrary', 'myStickerLibrary', 'customThemes', 'themeSchemes'];
                if (mediaKeys.includes(reg.id)) { mediaToSave[reg.id] = importedData[reg.id]; } 
                else { textToSave[reg.id] = importedData[reg.id]; }
               // window[reg.id] = importedData[reg.id]; // 同步内存变量
               // 别瞎存内存了，老老实实调用注册表里写好的 setValue 存进 DB_GATEWAY！
                if (reg.setValue) {
                    reg.setValue(importedData[reg.id]);
                }

              }
            }
          });

          if (isAppend) { textToSave['chatMessages'] = messages; }

          // 直接写库
          try {
            if (Object.keys(textToSave).length > 0) { const d = await localforage.getItem('APP_DATA') || {}; Object.assign(d, textToSave); await localforage.setItem('APP_DATA', d); }
            if (Object.keys(mediaToSave).length > 0) { const m = await localforage.getItem('APP_MEDIA') || {}; Object.assign(m, mediaToSave); await localforage.setItem('APP_MEDIA', m); }
          } catch(e) { console.error('写入仓库失败:', e); }

          if (typeof updateUI === 'function') updateUI();
          if (typeof renderMessages === 'function') renderMessages();
          showNotification(isAppend ? '追加导入成功' : '覆盖导入成功', 'success');
        };
      } catch (e) {
        console.error(e);
        if (typeof showNotification === 'function') showNotification('导入处理出错', 'error');
      }
    };

})(typeof window !== 'undefined' ? window : this);
