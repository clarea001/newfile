/*
 * db-gateway.js - 数据统一网关 (新架构核心)
 * 职责：接管所有 localforage 的读写，完成旧数据到新仓库的迁移。
 * 注意：必须在使用到数据的其他 js 文件之前加载！
 */
/* * db-gateway.js - 数据统一网关 (新架构核心) */
const DB_GATEWAY = {
    // 新仓库的固定键名
    KEY_DATA: 'APP_DATA',
    KEY_MEDIA: 'APP_MEDIA',
    KEY_FONTS: 'APP_FONTS', // 🌟 新增：字体专属房间
    KEY_META: 'APP_META',
    VERSION: 6.1, // 🌟 版本号升级，触发老用户自动适配

    // 内存缓存 (防止频繁读硬盘)
    _dataCache: null,
    _mediaCache: null,
    _fontsCache: null, // 🌟 新增：字体房间专属缓存

    // ==========================================
    // 1. 初始化与迁移入口 (页面加载时调用一次)
    // ==========================================
    /*async init() {
        const meta = await localforage.getItem(this.KEY_META);
        // 如果已经是新版本，直接拉取数据到内存缓存
        if (meta && meta.version >= this.VERSION) {
            this._dataCache = await localforage.getItem(this.KEY_DATA) || {};
            this._mediaCache = await localforage.getItem(this.KEY_MEDIA) || {};
            this._fontsCache = await localforage.getItem(this.KEY_FONTS) || {}; // 🌟 加载字体缓存
            console.log('[DB] 新架构加载完成 (含字体专属层)');
            return;
        }
        
        // 🌟 如果是 6.0 升级上来的老用户，不需要大动干戈，只需把字体从媒体屋搬出来
        if (meta && meta.version >= 6.0 && meta.version < 6.1) {
            this._dataCache = await localforage.getItem(this.KEY_DATA) || {};
            this._mediaCache = await localforage.getItem(this.KEY_MEDIA) || {};
            await this._migrateFontsFromMedia(); // 🌟 执行无痛搬家
        } else {
            // 极老用户，走老逻辑
            await this._migrateOldData();
        }
    },*/
    	async init() {
		const meta = await localforage.getItem(this.KEY_META);

		// 如果已经是新版本，直接拉取数据到内存缓存
		if (meta && meta.version >= this.VERSION) {
			this._dataCache = await localforage.getItem(this.KEY_DATA) || {};
			this._mediaCache = await localforage.getItem(this.KEY_MEDIA) || {};
			this._fontsCache = await localforage.getItem(this.KEY_FONTS) || {};

			// 🌟 新增：强制清洗老的对象数组结构，统一变成纯字符串数组！
			let needSave = false;
			const cleanArray = (key) => {
				if (Array.isArray(this._mediaCache[key])) {
					const newArr = this._mediaCache[key].map(item => {
						if (typeof item === 'object' && item !== null) {
							return item.src || item.value || ''; // 扒皮，只要图的真身
						}
						return item;
					}).filter(url => typeof url === 'string' && url.length > 100); // 过滤掉空壳和色值
					
					if (JSON.stringify(newArr) !== JSON.stringify(this._mediaCache[key])) {
						this._mediaCache[key] = newArr;
						needSave = true;
					}
				}
			};
			
			cleanArray('callBgLibrary');
			cleanArray('backgroundGallery');
			
			if (needSave) {
				await localforage.setItem(this.KEY_MEDIA, this._mediaCache);
				console.log('[DB] ✅ 已将通话背景和背景库强制洗牌为纯图数组！');
			}

			console.log('[DB] 新架构加载完成 (含字体专属层)');
			return;
		}

		// 🌟 如果是 6.0 升级上来的老用户，不需要大动干戈，只需把字体从媒体屋搬出来
		if (meta && meta.version >= 6.0 && meta.version < 6.1) {
			this._dataCache = await localforage.getItem(this.KEY_DATA) || {};
			this._mediaCache = await localforage.getItem(this.KEY_MEDIA) || {};
			
			// 🌟 顺便把 6.0 时代的脏数据也洗一遍
			let needClean = false;
			const cleanArray = (key) => {
				if (Array.isArray(this._mediaCache[key])) {
					const newArr = this._mediaCache[key].map(item => {
						if (typeof item === 'object' && item !== null) {
							return item.src || item.value || '';
						}
						return item;
					}).filter(url => typeof url === 'string' && url.length > 100);
					
					if (JSON.stringify(newArr) !== JSON.stringify(this._mediaCache[key])) {
						this._mediaCache[key] = newArr;
						needClean = true;
					}
				}
			};
			
			cleanArray('callBgLibrary');
			cleanArray('backgroundGallery');
			
			if (needClean) {
				console.log('[DB] 6.0升级检测：正在清洗脏数据...');
			}

			await this._migrateFontsFromMedia(); // 🌟 执行无痛搬家
			return;
		}

		// 极老用户，走老逻辑
		await this._migrateOldData();
	},


    // ==========================================
    // 🌟 新增：老用户无痛搬家逻辑 (把字体从 APP_MEDIA 搬到 APP_FONTS)
    // ==========================================
    async _migrateFontsFromMedia() {
        console.log('[DB] 检测到旧版字体数据，正在搬入专属房间...');
        this._fontsCache = {};
        const oldFontList = this._mediaCache.localFontData || [];
        
        for (const fontCard of oldFontList) {
            if (!fontCard || !fontCard.id) continue;
            
            // 如果老数据里的字体是原生 ArrayBuffer，直接搬
            if (fontCard.buffer && fontCard.buffer instanceof ArrayBuffer) {
                this._fontsCache[fontCard.id] = fontCard.buffer;
                delete fontCard.buffer; // 搬走后，把媒体屋里的沉重包袱扔掉
            }
        }
        
        // 把瘦身后的名片列表存回媒体屋
        this._mediaCache.localFontData = oldFontList;
        await localforage.setItem(this.KEY_MEDIA, this._mediaCache);
        
        // 把字体真身存入新房间
        await localforage.setItem(this.KEY_FONTS, this._fontsCache);
        
        // 打上新版本标签
        await this._saveMeta();
        console.log('[DB] ✅ 字体搬家完成，媒体屋已瘦身！');
    },

    // ==========================================
    // 2. 管家打包逻辑 (只执行一次) - 里面的逻辑不用动
    // ==========================================
    async _migrateOldData() {
        /*const PREFIX = 'CHAT_APP_V3_';
        const keys = await localforage.keys();
        
                // 1. 找出数据最多的主力会话前缀
        let mainSessionPrefix = '';
        const candidates = {};

        for (const key of keys) {
            if (!key.startsWith(PREFIX)) continue;
            // 提取 session 前缀：CHAP_APP_V3_xxx_chatMessages → xxx
            if (!key.endsWith('_chatMessages')) continue;
            const afterPrefix = key.slice(PREFIX.length);
            const prefix = afterPrefix.slice(0, afterPrefix.length - '_chatMessages'.length);
            if (!prefix) continue;
            if (['sessionList', 'MIGRATION', 'lastSessionId', 'callBgLibrary', 'customThemes', 'themeSchemes'].some(skip => prefix.startsWith(skip))) continue;

            // 统计消息数量
            if (!candidates[prefix]) {
                try {
                    const data = await localforage.getItem(key);
                    candidates[prefix] = (Array.isArray(data) ? data.length : 0);
                } catch(e) {
                    candidates[prefix] = 0;
                }
            }
        }

        // 选出消息最多的那个
        let maxCount = 0;
        for (const [prefix, count] of Object.entries(candidates)) {
            if (count > maxCount) {
                maxCount = count;
                mainSessionPrefix = PREFIX + prefix + '_';
            }
        }
*/
        const PREFIX = 'CHAT_APP_V3_';
        const keys = await localforage.keys();
        
        // 1. 找出数据最多的主力会话前缀
        let mainSessionPrefix = '';
        const candidates = {};
        
        for (const key of keys) {
            if (!key.startsWith(PREFIX)) continue;
            
            const afterPrefix = key.slice(PREFIX.length);
            
            // 🌟 修复：兼容各种格式的旧键名
            // 情况1: CHAT_APP_V3_chatMessages (没带session前缀的裸键)
            if (afterPrefix === 'chatMessages') {
                if (!candidates['']) {
                try { const data = await localforage.getItem(key); candidates[''] = (Array.isArray(data) ? data.length : 0); } catch(e) { candidates[''] = 0; }
                }
            } 
            // 情况2: CHAT_APP_V3_xxx_chatMessages (你目前这种带session前缀的)
            else if (afterPrefix.endsWith('_chatMessages')) {
                const prefix = afterPrefix.slice(0, afterPrefix.length - '_chatMessages'.length);
                if (['sessionList', 'MIGRATION', 'lastSessionId', 'callBgLibrary', 'customThemes', 'themeSchemes'].some(skip => prefix.startsWith(skip))) continue;
                if (!candidates[prefix]) {
                try { const data = await localforage.getItem(key); candidates[prefix] = (Array.isArray(data) ? data.length : 0); } catch(e) { candidates[prefix] = 0; }
                }
            }
            // 🌟 终极兜底：万一连 chatMessages 都没有，只要有 _chatSettings 也算找到旧数据了
            else if (afterPrefix.endsWith('_chatSettings') && Object.keys(candidates).length === 0) {
                const prefix = afterPrefix.slice(0, afterPrefix.length - '_chatSettings'.length);
                if (prefix && !['sessionList', 'MIGRATION', 'lastSessionId', 'callBgLibrary', 'customThemes', 'themeSchemes'].some(skip => prefix.startsWith(skip))) {
                candidates[prefix] = 1; // 给个默认值，确保能被选中
                }
            }
        }

        // 选出消息最多的那个前缀
        let maxCount = 0;
        for (const [prefix, count] of Object.entries(candidates)) {
        if (count > maxCount) {
            maxCount = count;
            mainSessionPrefix = PREFIX + (prefix ? prefix + '_' : ''); 
        }
        }

        if (!mainSessionPrefix) {
            console.warn('[DB] 未找到旧会话数据，将作为全新安装处理');
            this._dataCache = {};
            this._mediaCache = {};
            await this._saveMeta();
            return;
        }

        console.log(`[DB] 锁定主力会话前缀: ${mainSessionPrefix}`);
        const newAppData = {};
        const newAppMedia = {};

        // 2. 开始按蓝图搬运
        for (const key of keys) {
            if (!key.startsWith(PREFIX)) continue;
            const val = await localforage.getItem(key);
            if (val === null || val === undefined) continue;

            // --- 搬进 APP_DATA (文字配置) ---
            if (key === mainSessionPrefix + 'chatMessages') {
                newAppData.chatMessages = val; // 迁移后再由 loadData 负责过滤无效消息
            } else if (key === mainSessionPrefix + 'chatSettings') {
                newAppData.chatSettings = val;
            } else if (key === mainSessionPrefix + 'customReplies') {
                newAppData.customReplies = val;
            } else if (key === mainSessionPrefix + 'customReplyGroups') {
                newAppData.customReplyGroups = val;
            } else if (key === mainSessionPrefix + 'customEmojis') {
                newAppData.customEmojis = val;
            } else if (key === mainSessionPrefix + 'customPokes') {
                newAppData.customPokes = val;
            } else if (key === mainSessionPrefix + 'customStatuses') {
                newAppData.customStatuses = val;
            } else if (key === mainSessionPrefix + 'customMottos') {
                newAppData.customMottos = val;
            } else if (key === mainSessionPrefix + 'customIntros') {
                newAppData.customIntros = val;
            } else if (key === mainSessionPrefix + 'anniversaries') {
                newAppData.anniversaries = val;
            } else if (key === mainSessionPrefix + 'envelopeData') {
                newAppData.envelopeData = val; // 留言板统一收编
            } else if (key === mainSessionPrefix + 'wishingPoolData') {
                newAppData.wishingPoolData = val;
            } else if (key === mainSessionPrefix + 'periodRecords') {
                newAppData.periodRecords = val;
            } else if (key === mainSessionPrefix + 'periodSettings') {
                newAppData.periodSettings = val;
            }
            /*// 心情与日历合并
            else if (key === mainSessionPrefix + 'moodData') {
                newAppData.moodAndCalendar = newAppData.moodAndCalendar || {};
                newAppData.moodAndCalendar.moodRecords = val;
            } else if (key === mainSessionPrefix + 'calendarEvents') {
                newAppData.moodAndCalendar = newAppData.moodAndCalendar || {};
                newAppData.moodAndCalendar.events = val;
            } else if (key === mainSessionPrefix + 'customMoodOptions') {
                newAppData.moodAndCalendar = newAppData.moodAndCalendar || {};
                newAppData.moodAndCalendar.moodOptions = val;
            }*/
                       // 🌟 核心修复：日历事件独立入库，不再强行塞进 moodAndCalendar！
            else if (key === mainSessionPrefix + 'calendarEvents') {
                newAppData.calendarEvents = val; // 直接放进叫 calendarEvents 的房间！
            }
            // 心情数据依然合并
            else if (key === mainSessionPrefix + 'moodData') {
                newAppData.moodAndCalendar = newAppData.moodAndCalendar || {};
                newAppData.moodAndCalendar.moodRecords = val;
            } else if (key === mainSessionPrefix + 'customMoodOptions') {
                newAppData.moodAndCalendar = newAppData.moodAndCalendar || {};
                newAppData.moodAndCalendar.moodOptions = val;
            }

            // 没带前缀的全局配置
            else if (key === PREFIX + 'customThemes') {
                newAppData.customThemes = val;
            } else if (key === PREFIX + 'themeSchemes') {
                newAppData.themeSchemes = val;
            }

            // --- 搬进 APP_MEDIA (图片与大文件) ---
            else if (key === mainSessionPrefix + 'backgroundGallery') {
                newAppMedia.backgroundGallery = val;
            } else if (key === mainSessionPrefix + 'chatBackground') {
                newAppMedia.chatBackground = val;
            } else if (key === mainSessionPrefix + 'partnerAvatar') {
                newAppMedia.partnerAvatar = val;
            } else if (key === mainSessionPrefix + 'myAvatar') {
                newAppMedia.myAvatar = val;
            }else if (key === mainSessionPrefix + 'myStickerLibrary') {
                newAppMedia.myStickerLibrary = val;
            } else if (key === mainSessionPrefix + 'stickerLibrary') {
                newAppMedia.stickerLibrary = val;
            } else if (key === mainSessionPrefix + 'callBgLibrary') {
                newAppMedia.callBgLibrary = val;
            } 
           
            // --- 搬进 APP_media(字体大文件) ---
            else if (key.includes('local_font_list') || key.includes('local_font_blob') || key.includes('local_font_base64')) {
                newAppMedia.localFontData = val;
            }
            // 纪念日背景散装打包
            else if (key.includes('_annHeaderBg_')) {
                newAppMedia.annHeaderBgs = newAppMedia.annHeaderBgs || [];
                newAppMedia.annHeaderBgs.push(val);
            }
        }
        this._dataCache = newAppData;
        this._mediaCache = newAppMedia;
        this._fontsCache = {}; // 🌟 初始化空字体屋
        await localforage.setItem(this.KEY_DATA, newAppData);
        await localforage.setItem(this.KEY_MEDIA, newAppMedia);
        await localforage.setItem(this.KEY_FONTS, this._fontsCache); // 🌟 创建字体屋
        await this._saveMeta();
        console.log('[DB] ✅ 管家打包完成！旧数据已安全迁入新仓库。');
    },

    // ==========================================
    // 3. 对外暴露的读写接口
    // ==========================================
    get(key) { return this._dataCache ? this._dataCache[key] : undefined; },
    getMedia(key) { return this._mediaCache ? this._mediaCache[key] : undefined; },
    
    // 🌟 新增：字体房间专属读写接口
    getFontBuffer(fontId) {
        return this._fontsCache ? this._fontsCache[fontId] : undefined;
    },
    setFontBuffer(fontId, arrayBuffer) {
        if (!this._fontsCache) this._fontsCache = {};
        this._fontsCache[fontId] = arrayBuffer;
        this._debounceSaveFonts();
    },
    removeFontBuffer(fontId) {
        if (!this._fontsCache) return;
        delete this._fontsCache[fontId];
        this._debounceSaveFonts();
    },

    set(key, value) {
        if (!this._dataCache) this._dataCache = {};
        this._dataCache[key] = value;
        this._debounceSaveData();
    },
    setMedia(key, value) {
        if (!this._mediaCache) this._mediaCache = {};
        this._mediaCache[key] = value;
        this._debounceSaveMedia();
    },

    // ==========================================
    // 4. 内部防抖与强制保存机制
    // ==========================================
    _dataTimer: null,
    _mediaTimer: null,
    _fontsTimer: null, // 🌟 新增字体防抖定时器

    _debounceSaveData() {
        if (this._dataTimer) clearTimeout(this._dataTimer);
        this._dataTimer = setTimeout(async () => {
            try {
                await localforage.setItem(this.KEY_DATA, this._dataCache);
            } catch (e) {
                console.error('[DB] APP_DATA 保存失败:', e);
                if (typeof showNotification === 'function') showNotification('存储空间异常，数据可能未保存', 'error');
            }
        }, 500); // 500毫秒内的多次 set 会合并为一次写入
    },

    _debounceSaveMedia() {
        if (this._mediaTimer) clearTimeout(this._mediaTimer);
        this._mediaTimer = setTimeout(async () => {
            try {
                await localforage.setItem(this.KEY_MEDIA, this._mediaCache);
            } catch (e) {
                console.error('[DB] APP_MEDIA 保存失败:', e);
            }
        }, 500);
    },
    
    // 🌟 新增：字体屋防抖保存
    _debounceSaveFonts() {
        if (this._fontsTimer) clearTimeout(this._fontsTimer);
        this._fontsTimer = setTimeout(async () => {
            try {
                await localforage.setItem(this.KEY_FONTS, this._fontsCache);
            } catch (e) {
                console.error('[DB] APP_FONTS 保存失败:', e);
            }
        }, 500);
    },

    async forceSaveAll() {
        if (this._dataTimer) clearTimeout(this._dataTimer);
        if (this._mediaTimer) clearTimeout(this._mediaTimer);
        if (this._fontsTimer) clearTimeout(this._fontsTimer); // 🌟 清除字体定时器
        
        const tasks = [];
        if (this._dataCache) tasks.push(localforage.setItem(this.KEY_DATA, this._dataCache));
        if (this._mediaCache) tasks.push(localforage.setItem(this.KEY_MEDIA, this._mediaCache));
        if (this._fontsCache) tasks.push(localforage.setItem(this.KEY_FONTS, this._fontsCache)); // 🌟 强制保存字体
        await Promise.allSettled(tasks);
        console.log('[DB] 强制保存完成');
    },
    
    _saveMeta() {
        return localforage.setItem(this.KEY_META, { version: this.VERSION });
    }
};

window.DB_GATEWAY = DB_GATEWAY;