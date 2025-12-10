export class Panel {
    constructor(config) {
        this.config = config || {};
        this.onUpdate = this.config.onUpdate || (() => {});
        this.settings = this.loadSettings();

        this.element = this.createPanelElement();
        document.body.appendChild(this.element);
        
        this.initControls();
        
        // Initial broadcast
        this.broadcastSettings();
    }

    loadSettings() {
        const defaults = {
            sensitivityX: 12.0,
            sensitivityY: 12.0,
            sensitivityZ: 1.0,
            sensitivityRoll: 20.0,
            lerpFactor: 0.5,
            showCrosshair: true,
            rendererScale: 0.5,
            webcamRes: 'low', // 'low' (320x240) or 'high' (640x480)
            stabilization: true,
            panelOpacity: 0.6,    // New default
            showWebcam: true      // New default
        };
        
        const stored = localStorage.getItem('viewer_settings');
        return stored ? { ...defaults, ...JSON.parse(stored) } : defaults;
    }

    saveSettings() {
        localStorage.setItem('viewer_settings', JSON.stringify(this.settings));
    }

    broadcastSettings() {
        this.onUpdate(this.settings);
        this.saveSettings();
    }

    createPanelElement() {
        const div = document.createElement('div');
        div.id = 'settings-panel-container';
        div.style.position = 'absolute';
        div.style.top = '10px';
        div.style.right = '10px';
        div.style.zIndex = '1000';
        
        div.innerHTML = `
            <details class="settings-panel" open>
                <summary>設定面板 (Settings)</summary>
                <div class="panel-content">
                    <div class="control-group">
                        <label>面板透明度 (Opacity): <span id="val-panelOpacity"></span></label>
                        <input type="range" id="inp-panelOpacity" min="0.1" max="1.0" step="0.05">
                    </div>

                    <hr>

                    <div class="control-group">
                        <label>X 軸靈敏度: <span id="val-sensX"></span></label>
                        <input type="range" id="inp-sensX" min="1" max="50" step="0.1">
                    </div>
                    <div class="control-group">
                        <label>Y 軸靈敏度: <span id="val-sensY"></span></label>
                        <input type="range" id="inp-sensY" min="1" max="50" step="0.1">
                    </div>
                    <div class="control-group">
                        <label>Z 軸靈敏度: <span id="val-sensZ"></span></label>
                        <input type="range" id="inp-sensZ" min="0.01" max="5" step="0.01">
                    </div>
                    <div class="control-group">
                        <label>旋轉 (Roll) 靈敏度: <span id="val-sensRoll"></span></label>
                        <input type="range" id="inp-sensRoll" min="0" max="100" step="0.5">
                    </div>

                    <hr>

                    <div class="control-group">
                        <label>數值平滑 (Stabilization): <span id="val-lerp"></span></label>
                        <div style="display: flex; align-items: center; gap: 0.5rem;">
                            <input type="checkbox" id="inp-stabilization">
                            <input type="range" id="inp-lerp" min="0.01" max="1.0" step="0.005" style="flex:1;">
                        </div>
                    </div>

                    <hr>

                    <div class="control-group">
                        <label>渲染解析度 (Render Scale): <span id="val-rendererScale"></span>x</label>
                        <input type="range" id="inp-renderScale" min="0.1" max="2.0" step="0.01">
                    </div>
                    <div class="control-group">
                        <label>攝像頭解析度 (需重整)</label>
                        <select id="inp-webcamRes">
                            <option value="low">320x240 (快速)</option>
                            <option value="high">640x480 (清晰)</option>
                        </select>
                    </div>

                    <hr>

                    <div class="control-group">
                        <label class="toggle-label">
                            <input type="checkbox" id="inp-showWebcam">
                            顯示視訊預覽 (Webcam Preview)
                        </label>
                    </div>
                    <div class="control-group">
                        <label class="toggle-label">
                            <input type="checkbox" id="inp-crosshair">
                            顯示十字準心 (Crosshair)
                        </label>
                    </div>
                    <button id="btn-reset" class="btn-secondary" style="margin-top: 1rem; width: 100%;">重置所有設定</button>
                </div>
            </details>
        `;
        return div;
    }

    initControls() {
        const panelEl = this.element.querySelector('.settings-panel');

        // Logic for UI updates (Opacity & Webcam)
        const updateUIEffects = () => {
            // Panel Opacity
            panelEl.style.setProperty('--panel-idle-opacity', this.settings.panelOpacity);
            
            // Webcam Visibility
            const videoPreview = document.getElementById('video-preview');
            if (videoPreview) {
                videoPreview.style.display = this.settings.showWebcam ? 'block' : 'none';
            }
        };

        // Helpers
        const bindRange = (id, key) => {
            const el = this.element.querySelector(`#${id}`);
            // Use fallback if ID construction matches, otherwise direct match logic or specific overrides
            // For renderScale, key is 'rendererScale', disp ID is 'val-rendererScale'
            // For sensitivityX, key is 'sensitivityX', disp ID is 'val-sensX'
            
            let dispId = `val-${key}`; // default
            if(key.startsWith('sensitivity')) dispId = `val-${key.replace('sensitivity', 'sens')}`;
            if(key === 'lerpFactor') dispId = 'val-lerp';
            
            const disp = this.element.querySelector(`#${dispId}`);
            
            el.value = this.settings[key];
            if(disp) disp.innerText = this.settings[key];

            el.addEventListener('input', (e) => {
                const val = parseFloat(e.target.value);
                this.settings[key] = val;
                if(disp) disp.innerText = val;
                
                // Immediate local effect for UI settings
                if(key === 'panelOpacity') updateUIEffects();
                
                this.broadcastSettings();
            });
        };

        const bindCheckbox = (id, key) => {
            const el = this.element.querySelector(`#${id}`);
            el.checked = this.settings[key];
            el.addEventListener('change', (e) => {
                this.settings[key] = e.target.checked;
                
                // Immediate local effect
                if(key === 'showWebcam') updateUIEffects();

                this.broadcastSettings();
            });
        };

        const bindSelect = (id, key) => {
            const el = this.element.querySelector(`#${id}`);
            el.value = this.settings[key];
            el.addEventListener('change', (e) => {
                this.settings[key] = e.target.value; 
                this.broadcastSettings();
            });
        };

        // Initialize UI Effect
        updateUIEffects();

        // Bindings
        bindRange('inp-panelOpacity', 'panelOpacity'); // New Binding
        bindRange('inp-sensX', 'sensitivityX');
        bindRange('inp-sensY', 'sensitivityY');
        bindRange('inp-sensZ', 'sensitivityZ');
        bindRange('inp-sensRoll', 'sensitivityRoll');
        bindRange('inp-renderScale', 'rendererScale');
        
        // Stabilization logic
        const lerpSlider = this.element.querySelector('#inp-lerp');
        const stabCheck = this.element.querySelector('#inp-stabilization');
        const valLerp = this.element.querySelector('#val-lerp');

        const updateLerpUI = () => {
            lerpSlider.disabled = !this.settings.stabilization;
            lerpSlider.value = this.settings.lerpFactor;
            valLerp.innerText = this.settings.stabilization ? this.settings.lerpFactor : "關閉 (即時)";
        };

        stabCheck.addEventListener('change', (e) => {
            this.settings.stabilization = e.target.checked;
            updateLerpUI();
            this.broadcastSettings();
        });

        lerpSlider.addEventListener('input', (e) => {
            this.settings.lerpFactor = parseFloat(e.target.value);
            updateLerpUI();
            this.broadcastSettings();
        });
        
        stabCheck.checked = this.settings.stabilization;
        updateLerpUI();

        bindSelect('inp-webcamRes', 'webcamRes');
        bindCheckbox('inp-showWebcam', 'showWebcam'); // New Binding
        bindCheckbox('inp-crosshair', 'showCrosshair');

        this.element.querySelector('#btn-reset').addEventListener('click', () => {
            localStorage.removeItem('viewer_settings');
            location.reload();
        });
    }
}
