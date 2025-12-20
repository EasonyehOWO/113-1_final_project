
export class Panel {
    constructor(config) {
        this.config = config || {};
        this.onUpdate = this.config.onUpdate || (() => {});
        this.settings = this.loadSettings();

        // 1. 建立 UI 元素
        this.element = this.createPanelElement();
        document.body.appendChild(this.element);
        
        // 2. 初始化控制項綁定
        this.initControls();
        
        // 3. 初始廣播 (讓外部模組同步設定)
        this.broadcastSettings();

        // 阻止按鍵事件冒泡，避免操作 UI 時觸發場景移動 (如 WASD)
        this.element.addEventListener('keydown', (e) => e.stopPropagation());
        this.element.addEventListener('keyup', (e) => e.stopPropagation());
    }

    // ========================================================================
    // 設定管理 (Settings Management)
    // ========================================================================

    loadSettings() {
        // 預設設定值 (Defaults)
        const defaults = {
            // --- 靈敏度 (Sensitivity) ---
            sensitivityX: 8.0,
            sensitivityY: 8.0,
            sensitivityZ: 1.5,
            
            // --- 效能與平滑 (Performance) ---
            lerpFactor: 0.75,       // 平滑係數 (越小越滑)
            stabilization: true,    // 是否啟用平滑
            rendererScale: 1.0,     // 渲染解析度比例
            inputSize: 320,         // AI 輸入解析度 (160-1920)
            maxFps: 30,             // 偵測幀率限制 (1-60)

            // --- 顯示選項 (Display) ---
            showCrosshair: true,    // 十字準心
            panelOpacity: 0.6,      // 面板透明度
            showWebcam: true,       // Webcam 預覽視窗
            
            // --- 模式開關 (Modes) ---
            physicsMode: true,           // 真實透視 (Physical Window) vs 縮放 (Zoom)
            visualConvergenceMode: false,// 視覺收斂 (LookAt Center)

            // --- 校準 (Calibration) ---
            calibrationPPI: 96,     // 螢幕像素密度 (可透過尺量測校準)
            offsetX: 0,             // Webcam X 偏移 (cm)
            offsetY: 4,             // Webcam Y 偏移 (cm)

            // --- 光源與環境 (Lighting & Environment) ---
            lightEnabled: true,
            lightFollowCamera: true,// 手電筒模式
            lightX: 5, lightY: 5, lightZ: 5,
            lightIntensity: 1.0,
            lightColor: '#ffffff',
            
            // --- 距離與霧氣 (Fog) ---
            fogNear: 5.0,
            fogFar: 20.0,
            cameraFar: 1000.0,
        };
        
        // 讀取 LocalStorage
        const stored = localStorage.getItem('viewer_settings');
        const initial = stored ? { ...defaults, ...JSON.parse(stored) } : defaults;

        // 建立 Proxy 物件：當設定值改變時，自動更新 UI 並儲存
        const handler = {
            set: (target, prop, value) => {
                // 1. 若數值無變化則略過
                if (target[prop] === value) return true;
                target[prop] = value;
                
                // 2. 更新對應的 UI 顯示(雙向綁定)
                this.updateUIAction(prop, value);
                
                // 3. 儲存並廣播給其他模組
                this.saveSettings();
                this.onUpdate(this.settings);
                
                return true;
            }
        };

        return new Proxy(initial, handler);
    }
    
    saveSettings() {
        localStorage.setItem('viewer_settings', JSON.stringify(this.settings));
    }

    broadcastSettings() {
        this.onUpdate(this.settings);
        this.saveSettings();
    }

    // ========================================================================
    // UI 建構 (UI Construction)
    // ========================================================================

    createPanelElement() {
        const div = document.createElement('div');
        div.id = 'settings-panel-container';
        // 基本樣式設定 (定位於右上角)
        Object.assign(div.style, {
            position: 'absolute', top: '10px', right: '10px', zIndex: '1000'
        });
        
        // 使用 Template Strings 建立 HTML 結構
        div.innerHTML = `
            <details class="settings-panel" open>
                <summary>設定面板 (Settings)</summary>
                <div class="panel-content">

                    <!-- 1. 一般設定 -->
                    <div class="control-group">
                        <div>
                            <label>面板透明度 (Opacity): <span id="val-panelOpacity"></span></label>
                            <input type="range" id="inp-panelOpacity" min="0.1" max="1.0" step="0.05" />
                        </div>
                        <label class="toggle-label">
                            <input type="checkbox" id="inp-showWebcam">
                            顯示視訊預覽 (Webcam Preview)
                        </label>
                        <label class="toggle-label" title="開啟後，靠近螢幕時視野變廣（遠處物體螢幕上縮小、近處放大）；關閉則為單純放大（Zoom）。">
                            <input type="checkbox" id="inp-physicsMode">
                            真實透視模式 (Physical Window)
                        </label>
                        <label class="toggle-label" title="開啟後，相機將始終注視場景中心（全息投影效果）；關閉則為視窗模式。">
                            <input type="checkbox" id="inp-visualConvergenceMode">
                            視覺收斂模式 (LookAt Center)
                        </label>
                        <label class="toggle-label">
                            <input type="checkbox" id="inp-showCrosshair">
                            顯示十字準心 (Crosshair)
                        </label>
                        <button id="btn-fullscreen" class="btn-secondary" style="margin-top: 5px; width: 100%;">進入全螢幕</button>
                    </div>

                    <hr />

                    <!-- 2. 光源設定 -->
                    <div class="control-group">
                        <label style="color: #00bcd4;">光源設定 (Lighting)</label>
                        <label class="toggle-label">
                            <input type="checkbox" id="inp-lightEnabled">
                            啟用自訂光源 (Enable Light)
                        </label>
                        <label class="toggle-label">
                            <input type="checkbox" id="inp-lightFollowCamera">
                            光源跟隨相機 (Flashlight)
                        </label>
                        <div id="group-lightPos">
                            <div><label>Light X: <span id="val-lightX"></span></label><input type="range" id="inp-lightX" min="-20" max="20" step="0.5"></div>
                            <div><label>Light Y: <span id="val-lightY"></span></label><input type="range" id="inp-lightY" min="-20" max="20" step="0.5"></div>
                            <div><label>Light Z: <span id="val-lightZ"></span></label><input type="range" id="inp-lightZ" min="-20" max="20" step="0.5"></div>
                        </div>
                        <div style="margin-top: 10px;">
                            <label>光照強度 (Intensity): <span id="val-lightIntensity"></span></label>
                            <input type="range" id="inp-lightIntensity" min="0" max="5.0" step="0.01">
                        </div>
                         <div style="margin-top: 5px;">
                            <label>光照顏色 (Color): <span id="val-lightColor"></span></label>
                            <input type="color" id="inp-lightColor" style="width: 100%; height: 30px;">
                        </div>
                    </div>
                    
                    <hr />

                    <!-- 3. 螢幕校準 -->
                    <div class="control-group">
                        <label style="color: #00bcd4;">螢幕校準 (Screen Calibration)</label>
                        <div title="請拿實體尺量測螢幕上的紅線刻度 (每格 5cm)">
                            <label>像素密度 (PPI): <span id="val-calibrationPPI"></span></label>
                            <input type="range" id="inp-calibrationPPI" min="10" max="400" step="1">
                            <small style="color:#aaa; display:block; margin-top:2px;">按住滑桿顯示校準尺 (Hold to Calibrate)</small>
                        </div>
                    </div>

                    <hr />
                    
                    <!-- 4. 相機與追蹤校準 -->
                    <div class="control-group">
                        <label style="color: #00bcd4;">相機校準設定</label>
                        <div>
                            <label>Webcam 偏移 X (cm): <span id="val-offsetX"></span></label>
                            <input type="range" id="inp-offsetX" min="-50" max="50" step="0.1">
                        </div>
                        <div>
                            <label>Webcam 偏移 Y (cm): <span id="val-offsetY"></span></label>
                            <input type="range" id="inp-offsetY" min="-50" max="50" step="0.1">
                        </div>
                        <div>
                            <label>X 軸靈敏度: <span id="val-sensitivityX"></span></label>
                            <input type="range" id="inp-sensitivityX" min="-100" max="100" step="0.2">
                        </div>
                        <div>
                            <label>Y 軸靈敏度: <span id="val-sensitivityY"></span></label>
                            <input type="range" id="inp-sensitivityY" min="-100" max="100" step="0.2">
                        </div>
                        <div title="= 臉框實寬(cm) / 10 / 2 / tan(橫向視野角 / 2)">
                            <label>Z 軸靈敏度: <span id="val-sensitivityZ"></span></label>
                            <input type="range" id="inp-sensitivityZ" min="0.1" max="5.0" step="0.1">
                        </div>
                    </div>

                    <hr />
                    
                    <!-- 5. 距離與霧氣 -->
                    <div class="control-group">
                        <label style="color: #00bcd4;">距離與霧氣 (Depth)</label>
                        <div><label>視距 (Far): <span id="val-cameraFar"></span></label><input type="range" id="inp-cameraFar" min="10" max="200" step="5" /></div>
                        <div><label>近截面 (Near): <span id="val-cameraNear"></span></label><input type="range" id="inp-cameraNear" min="0.1" max="50.0" step="0.1" /></div>
                        <div><label>霧氣起始 (Fog Near): <span id="val-fogNear"></span></label><input type="range" id="inp-fogNear" min="0" max="100" step="1" /></div>
                        <div><label>霧氣結束 (Fog Far): <span id="val-fogFar"></span></label><input type="range" id="inp-fogFar" min="0" max="100" step="1" /></div>
                    </div>

                    <hr />

                    <!-- 6. 效能優化 -->
                    <div class="control-group">
                        <label style="color: #00bcd4;">效能設定 (Performance)</label>
                        <div>
                            <label>數值平滑 (Stabilization): <span id="val-lerpFactor"></span></label>
                            <div style="display: flex; align-items: center; gap: 0.5rem;">
                                <input type="checkbox" id="inp-stabilization">
                                <input type="range" id="inp-lerpFactor" min="0.01" max="1.0" step="0.005" style="flex:1;">
                            </div>
                        </div>
                        <div>
                            <label>渲染解析度 (Render Scale): <span id="val-rendererScale"></span>x <span id="val-resolution" style="font-size: 0.8em; color: #888;"></span></label>
                            <input type="range" id="inp-rendererScale" min="0.1" max="8.0" step="0.01">
                        </div>
                        <div>
                            <label>偵測幀率限制 (Max FPS): <span id="val-maxFps"></span></label>
                            <input type="range" id="inp-maxFps" min="1" max="60" step="1">
                        </div>
                        <div title="運算量為此值平方。建議 Low (224) ~ HD (416)。">
                            <label>AI 輸入解析度: <span id="val-inputSize"></span></label>
                            <input type="range" id="inp-inputSize" min="160" max="1920" step="32" />
                        </div>
                    </div>

                    <button id="btn-reset" class="btn-secondary" style="margin-top: 1rem; width: 100%;">重置所有設定</button>
                </div>
            </details>
        `;
        return div;
    }

    // ========================================================================
    // 控制項綁定 (Control Binding)
    // ========================================================================

    initControls() {
        // 設定初始的介面效果 (如隱藏/顯示 Webcam)
        this.updateUIAction('panelOpacity', this.settings.panelOpacity);
        this.updateUIAction('showWebcam', this.settings.showWebcam);
        this.updateUIAction('rendererScale', this.settings.rendererScale); // 更新解析度文字

        // 1. 一般設定
        this.bindRange('inp-panelOpacity', 'panelOpacity');
        this.bindCheckbox('inp-showWebcam', 'showWebcam');
        this.bindCheckbox('inp-physicsMode', 'physicsMode');
        this.bindCheckbox('inp-visualConvergenceMode', 'visualConvergenceMode');
        this.bindCheckbox('inp-showCrosshair', 'showCrosshair');

        // 2. 光源設定
        this.bindCheckbox('inp-lightEnabled', 'lightEnabled');
        this.bindCheckbox('inp-lightFollowCamera', 'lightFollowCamera');
        this.bindRange('inp-lightX', 'lightX');
        this.bindRange('inp-lightY', 'lightY');
        this.bindRange('inp-lightZ', 'lightZ');
        this.bindRange('inp-lightIntensity', 'lightIntensity');
        this.bindColor('inp-lightColor', 'lightColor');

        // 3. 校準與靈敏度
        this.bindRange('inp-calibrationPPI', 'calibrationPPI');
        this.bindRange('inp-offsetX', 'offsetX');
        this.bindRange('inp-offsetY', 'offsetY');
        this.bindRange('inp-sensitivityX', 'sensitivityX');
        this.bindRange('inp-sensitivityY', 'sensitivityY');
        this.bindRange('inp-sensitivityZ', 'sensitivityZ');

        // 4. 距離與霧氣
        this.bindRange('inp-cameraFar', 'cameraFar');
        this.bindRange('inp-cameraNear', 'cameraNear'); 
        this.bindRange('inp-fogNear', 'fogNear');
        this.bindRange('inp-fogFar', 'fogFar');

        // 5. 效能與平滑
        this.bindCheckbox('inp-stabilization', 'stabilization', (checked) => {
            this.updateLerpUI(checked);
        });
        this.bindRange('inp-lerpFactor', 'lerpFactor');
        this.bindRange('inp-rendererScale', 'rendererScale', () => this.updateResolutionText());
        this.bindRange('inp-maxFps', 'maxFps');
        this.bindRange('inp-inputSize', 'inputSize'); // 這裡可以考慮用 'change' 事件，但在 bindRange 內部處理

        // 初始 UI 狀態更新
        this.updateLerpUI(this.settings.stabilization);
        this.updateLightUI();
        
        // 6. 特殊功能初始化
        this.initFullscreenButton();
        this.initResetButton();
        this.initCalibrationOverlay();

        // 監聽視窗大小改變以更新解析度顯示
        window.addEventListener('resize', () => this.updateResolutionText());
        this.updateResolutionText(); // 初始更新
    }

    // --- 綁定輔助函式 (Binding Helpers) ---

    /**
     * 綁定 Range Input (滑桿)
     * @param {string} id - HTML ID
     * @param {string} key - Settings Key
     * @param {Function} extraCallback - 額外回呼 (可選)
     */
    bindRange(id, key, extraCallback) {
        const el = this.element.querySelector(`#${id}`);
        const disp = this.element.querySelector(`#val-${key}`);
        
        if (!el) return console.warn(`Panel: Element #${id} not found.`);

        // 初始化數值
        el.value = this.settings[key];
        if (disp) disp.innerText = this.settings[key];

        const eventType = (key === 'inputSize') ? 'change' : 'input'; // InputSize 使用 change 以避免頻繁重啟

        el.addEventListener(eventType, (e) => {
            let val = parseFloat(e.target.value);
            if (isNaN(val)) val = 0;
            
            this.settings[key] = val; // 這會觸發 Proxy -> set -> updateUIAction
            
            if (extraCallback) extraCallback(val);
        });
    }

    /**
     * 綁定 Checkbox (開關)
     */
    bindCheckbox(id, key, extraCallback) {
        const el = this.element.querySelector(`#${id}`);
        if (!el) return;

        el.checked = this.settings[key];
        el.addEventListener('change', (e) => {
            this.settings[key] = e.target.checked;
            if (extraCallback) extraCallback(e.target.checked);
        });
    }

    /**
     * 綁定 Color Input (顏色選擇器)
     */
    bindColor(id, key) {
        const el = this.element.querySelector(`#${id}`);
        const disp = this.element.querySelector(`#val-${key}`);
        if (!el) return;

        el.value = this.settings[key];
        if (disp) disp.innerText = this.settings[key];

        el.addEventListener('input', (e) => {
            this.settings[key] = e.target.value;
            if (disp) disp.innerText = e.target.value;
        });
    }

    // ========================================================================
    // UI 更新邏輯 (UI Updates)
    // ========================================================================

    /**
     * 當設定值改變時，更新對應的 UI (供 Proxy 呼叫)
     */
    updateUIAction(key, value) {
        // 1. 更新 Input 數值 (如果是程式碼改變設定的情況)
        const el = this.element.querySelector(`#inp-${key}`);
        if (el) {
            if (el.type === 'checkbox') el.checked = value;
            else el.value = value;
        }

        // 2. 更新數值顯示標籤 (Label)
        const disp = this.element.querySelector(`#val-${key}`);
        if (disp) {
            if (typeof value === 'number' && !Number.isInteger(value)) {
                 disp.innerText = value.toFixed(2).replace(/\.?0+$/, ""); // 簡化小數
            } else {
                 disp.innerText = value;
            }
        }

        // 3. 觸發副作用 (Side Effects)
        if (key === 'panelOpacity') {
            const panelEl = this.element.querySelector('.settings-panel');
            if (panelEl) panelEl.style.setProperty('--panel-idle-opacity', value);
        }
        else if (key === 'showWebcam') {
            const preview = document.getElementById('preview-container');
            if (preview) {
                preview.style.opacity = value ? 1 : 0;
                preview.style.pointerEvents = value ? 'auto' : 'none';
            }
        }
        else if (key === 'lightEnabled' || key === 'lightFollowCamera') {
            this.updateLightUI();
        }
        else if (key === 'stabilization') {
            this.updateLerpUI(value);
        }
    }

    updateLerpUI(enabled) {
        const slider = this.element.querySelector('#inp-lerpFactor');
        const disp = this.element.querySelector('#val-lerpFactor');
        if (slider) slider.disabled = !enabled;
        if (disp) disp.innerText = enabled ? this.settings.lerpFactor : "關閉 (即時)";
    }

    updateLightUI() {
        const group = this.element.querySelector('#group-lightPos');
        const followCheck = this.element.querySelector('#inp-lightFollowCamera');
        
        if (!this.settings.lightEnabled) {
            // 全部停用
            if(group) { group.style.opacity = '0.3'; group.style.pointerEvents = 'none'; }
            if(followCheck) followCheck.disabled = true;
        } else {
            if(followCheck) followCheck.disabled = false;
            // 若跟隨相機，則位置滑桿無效
            if (this.settings.lightFollowCamera) {
                if(group) { group.style.opacity = '0.3'; group.style.pointerEvents = 'none'; }
            } else {
                if(group) { group.style.opacity = '1.0'; group.style.pointerEvents = 'auto'; }
            }
        }
    }

    updateResolutionText() {
        const scale = this.settings.rendererScale || 1.0;
        const w = Math.round(window.innerWidth * scale);
        const h = Math.round(window.innerHeight * scale);
        const el = this.element.querySelector('#val-resolution');
        if(el) el.innerText = `(${w} x ${h})`;
    }

    // ========================================================================
    // 特殊組件邏輯 (Extensions)
    // ========================================================================

    initFullscreenButton() {
        const btn = this.element.querySelector('#btn-fullscreen');
        const updateText = () => {
            btn.innerText = document.fullscreenElement ? "退出全螢幕" : "進入全螢幕";
        };

        btn.addEventListener('click', () => {
             if (!document.fullscreenElement) document.documentElement.requestFullscreen().catch(e => console.error(e));
             else document.exitFullscreen();
        });
        document.addEventListener('fullscreenchange', updateText);
    }

    initResetButton() {
        this.element.querySelector('#btn-reset').addEventListener('click', () => {
            if(confirm("確定要重置所有設定嗎？")) {
                localStorage.removeItem('viewer_settings');
                location.reload();
            }
        });
    }

    // 校準用覆蓋層 (Overlay)
    initCalibrationOverlay() {
        const ppiInput = this.element.querySelector('#inp-calibrationPPI');
        
        // 建立 Overlay (如果不存在)
        let overlay = document.getElementById('calibration-overlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'calibration-overlay';
            Object.assign(overlay.style, {
                position: 'fixed', top: '0', left: '0', width: '100%', height: '100%',
                background: 'rgba(0,0,0,0.9)', zIndex: '99999',
                pointerEvents: 'none', display: 'none',
                alignItems: 'center', justifyContent: 'center'
            });
            overlay.innerHTML = `<svg width="100%" height="100%" style="position:absolute; top:0; left:0;"></svg>`;
            document.body.appendChild(overlay);
        }

        const drawRuler = () => {
            const ppi = this.settings.calibrationPPI || 96;
            const ppcm = ppi / 2.54; // 每公分像素數
            const w = window.innerWidth;
            const h = window.innerHeight;
            const svg = overlay.querySelector('svg');

            // 繪製紅對角線
            let html = `<line x1="0" y1="0" x2="${w}" y2="${h}" stroke="red" stroke-width="2" />`;
            
            // 計算對角線長度 (像素)
            const D = Math.sqrt(w*w + h*h);
            const diagMaxCM = D / ppcm;

            // 每 5cm 畫一個刻度
            for (let i = 5; i < diagMaxCM; i += 5) {
                const pxFromOrigin = i * ppcm;
                const t = pxFromOrigin / D; // 比例位置
                
                const cx = t * w;
                const cy = t * h;

                // 計算垂直向量 (用於畫刻度線)
                // 向量 (w, h) -> 垂直 (-h, w)
                const tx = -h / D * 20; // 長度 20px
                const ty = w / D * 20;

                html += `<line x1="${cx - tx}" y1="${cy - ty}" x2="${cx + tx}" y2="${cy + ty}" stroke="yellow" stroke-width="2" />`;
                html += `<text x="${cx + tx + 5}" y="${cy + ty + 5}" fill="white" font-size="20" font-family="monospace">${i}cm</text>`;
            }
            svg.innerHTML = html;
        };

        const show = () => { overlay.style.display = 'flex'; drawRuler(); };
        const hide = () => { overlay.style.display = 'none'; };

        // 事件綁定：按下滑桿或按住空白鍵時顯示
        ppiInput.addEventListener('mousedown', show);
        ppiInput.addEventListener('touchstart', show);
        ppiInput.addEventListener('input', drawRuler);
        
        window.addEventListener('mouseup', hide);
        window.addEventListener('touchend', hide);
        ppiInput.addEventListener('blur', hide);

        ppiInput.addEventListener('keydown', (e) => {
            if (e.code === 'Space') { e.preventDefault(); show(); }
        });
        ppiInput.addEventListener('keyup', (e) => {
            if (e.code === 'Space') hide();
        });
    }
}
