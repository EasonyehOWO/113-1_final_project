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

        // Stop key propagation to prevent scene interference
        this.element.addEventListener('keydown', (e) => e.stopPropagation());
        this.element.addEventListener('keyup', (e) => e.stopPropagation());
    }

    loadSettings() {
        const defaults = {
            sensitivityX: 12.0,
            sensitivityY: 12.0,
            sensitivityZ: 1.0,
            lerpFactor: 0.5,
            showCrosshair: true,
            rendererScale: 0.5,
            webcamRes: 'low', // 'low' (320x240) or 'high' (640x480)
            stabilization: true,
            panelOpacity: 0.6,
            showWebcam: true,
            offsetX: 0,
            offsetY: 0,
            lightEnabled: true,
            lightX: 5,
            lightY: 5,
            lightZ: 5,

            lightFollowCamera: false,
            physicsMode: false // True = Window/Physics Mode (Fixed Screen Size), False = Zoom Mode (Fixed FOV)
        };
        
        const stored = localStorage.getItem('viewer_settings');
        const initial = stored ? { ...defaults, ...JSON.parse(stored) } : defaults;

        // Create Proxy to make settings reactive
        const handler = {
            set: (target, prop, value) => {
                // 1. Reflect change
                if (target[prop] === value) return true;
                target[prop] = value;
                
                // 2. Update UI Element (if exists)
                this.updateUIElement(prop, value);
                
                // 3. Side Effects (Save & Broadcast)
                // Debounce saving/broadcasting might be needed if high freq, but for now direct.
                this.saveSettings();
                this.onUpdate(this.settings);
                
                return true;
            }
        };

        return new Proxy(initial, handler);
    }
    
    updateUIElement(key, value) {
        // Map key to UI IDs or logic
        // Need to replicate the logic inside initControls or check bindings.
        // Best way: Map keys to IDs when binding? Or query inputs.
        
        // 1. Checkbox?
        // 2. Range?
        // 3. Select?
        
        // IDs often follow pattern: inp-{key} or special cases.
        // We can try to find element by ID: `inp-${key}`? 
        // Or reverse lookup from bindings?
        // Let's use a simpler heuristic or just query known elements.
        
        let el = this.element.querySelector(`#inp-${key}`);
        
        // Handle special cases
        if (key.startsWith('sensitivity')) {
            const suffix = key.replace('sensitivity', 'sens');
            el = this.element.querySelector(`#inp-${suffix}`);
        }
        if (key === 'lerpFactor') el = this.element.querySelector('#inp-lerp');
        
        if (!el) return; // No UI for this setting

        // Update Values
        if (el.type === 'checkbox') {
             el.checked = value;
        } else {
             el.value = value;
        }

        // Update Labels (span val-{id})
        const dispId = el.id.replace('inp-', 'val-');
        const disp = this.element.querySelector(`#${dispId}`);
        if(disp) {
            // Special format if needed?
            if(el.type === 'checkbox' && key === 'stabilization') {
                // Handled in specific logic?
                // Panel logic is scattered inside initControls closures.
                // We might need to refactor updates to be accessible methods.
            } else {
                disp.innerText = value;
            }
        }
        
        // Update Visual Effects (Opacity/Webcam)
        if(key === 'panelOpacity' || key === 'showWebcam') {
           this.updateUIEffects();
        }
        
        // Update Light UI state (enable/disable group)
        if(key === 'lightEnabled' || key === 'lightFollowCamera') {
            this.updateLightUI();
        }
        if(key === 'stabilization' || key === 'lerpFactor') {
            this.updateLerpUI();
        }
    }
    
    // Extracted helper methods need to be class methods now
    updateUIEffects() {
        const panelEl = this.element.querySelector('.settings-panel');
        if(panelEl) panelEl.style.setProperty('--panel-idle-opacity', this.settings.panelOpacity);
        
        const videoPreview = document.getElementById('video-preview');
        if (videoPreview) {
            // don't use display none to hide it; otherwise the webcam will stop working
            videoPreview.style.opacity = this.settings.showWebcam ? 1 : 0;
            videoPreview.style.pointerEvents = this.settings.showWebcam ? 'auto' : 'none';
        }
    }
    
    updateLightUI() {
         const lightPosGroup = this.element.querySelector('#group-lightPos');
         const lightFollowCheck = this.element.querySelector('#inp-lightFollow');
         if(!lightPosGroup || !lightFollowCheck) return;

         if(!this.settings.lightEnabled) {
             lightPosGroup.style.opacity = '0.3';
             lightPosGroup.style.pointerEvents = 'none';
             lightFollowCheck.disabled = true;
             return;
         }
         
         lightFollowCheck.disabled = false;
         
         if(this.settings.lightFollowCamera) {
             lightPosGroup.style.opacity = '0.3';
             lightPosGroup.style.pointerEvents = 'none';
         } else {
             lightPosGroup.style.opacity = '1.0';
             lightPosGroup.style.pointerEvents = 'auto';
         }
    }

    updateLerpUI() {
        const lerpSlider = this.element.querySelector('#inp-lerp');
        const valLerp = this.element.querySelector('#val-lerp');
        if(!lerpSlider) return;
        
        lerpSlider.disabled = !this.settings.stabilization;
        lerpSlider.value = this.settings.lerpFactor;
        if(valLerp) valLerp.innerText = this.settings.stabilization ? this.settings.lerpFactor : "關閉 (即時)";
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
                        <input type="range" id="inp-sensX" min="-100" max="100" step="0.2">
                    </div>
                    <div class="control-group">
                        <label>Y 軸靈敏度: <span id="val-sensY"></span></label>
                        <input type="range" id="inp-sensY" min="-100" max="100" step="0.2">
                    </div>
                    <div class="control-group" title="= 臉框實寬(cm) / 10 / 2 / tan(橫向視野角 / 2)">
                        <label>Z 軸靈敏度（焦距和臉寬參數）: <span id="val-sensZ"></span></label>
                        <input type="range" id="inp-sensZ" min="0.1" max="5.0" step="0.1">
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
                        <label style="color: #00bcd4;">校準設定 (Calibration)</label>
                        <div style="margin-top:5px;">
                            <label>Webcam 偏移 X (cm): <span id="val-offsetX"></span></label>
                            <input type="range" id="inp-offsetX" min="-50" max="50" step="1">
                        </div>
                        <div style="margin-top:5px;">
                            <label>Webcam 偏移 Y (cm): <span id="val-offsetY"></span></label>
                            <input type="range" id="inp-offsetY" min="-50" max="50" step="1">
                        </div>
                        <!-- Future Physical Size Inputs (Placeholders for now) -->
                        <!-- 
                        <div style="margin-top:5px;">
                            <label>螢幕寬度 (cm): <span id="val-screenWidth"></span></label>
                            <input type="number" id="inp-screenWidth" value="30" step="0.5" style="width:60px;">
                        </div> 
                        -->
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
                        <label class="toggle-label" title="開啟後，靠近螢幕時視野變廣（物體視覺上縮小）；關閉則為單純放大（Zoom）。">
                            <input type="checkbox" id="inp-physicsMode">
                            真實透視模式 (Physical Window)
                        </label>
                    </div>
                    <div class="control-group">
                        <label style="color: #00bcd4;">光源設定 (Lighting)</label>
                        <label class="toggle-label">
                            <input type="checkbox" id="inp-lightEnabled">
                            啟用自訂光源 (Enable Light)
                        </label>
                        <label class="toggle-label">
                            <input type="checkbox" id="inp-lightFollow">
                            光源跟隨相機 (Flashlight)
                        </label>
                        <div id="group-lightPos" style="margin-top:5px;">
                            <label>Light X: <span id="val-lightX"></span></label>
                            <input type="range" id="inp-lightX" min="-20" max="20" step="0.5">
                            
                            <label>Light Y: <span id="val-lightY"></span></label>
                            <input type="range" id="inp-lightY" min="-20" max="20" step="0.5">

                            <label>Light Z: <span id="val-lightZ"></span></label>
                            <input type="range" id="inp-lightZ" min="-20" max="20" step="0.5">
                        </div>
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
                // videoPreview.style.display = this.settings.showWebcam ? 'block' : 'none';
                // don't use display none to hide it; otherwise the webcam will stop working
                videoPreview.style.opacity = this.settings.showWebcam ? 1 : 0;
                videoPreview.style.pointerEvents = this.settings.showWebcam ? 'auto' : 'none';
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
                let val = parseFloat(e.target.value);
                if (isNaN(val)) val = 0; // Safety check
                
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
        bindRange('inp-renderScale', 'rendererScale');
        
        // Calibration Bindings
        bindRange('inp-offsetX', 'offsetX');
        bindRange('inp-offsetY', 'offsetY');

        // Lighting Bindings
        bindRange('inp-lightX', 'lightX');
        bindRange('inp-lightY', 'lightY');
        bindRange('inp-lightZ', 'lightZ');
        
        const lightEnabledCheck = this.element.querySelector('#inp-lightEnabled');
        bindCheckbox('inp-lightEnabled', 'lightEnabled'); // Bind new toggle

        const lightFollowCheck = this.element.querySelector('#inp-lightFollow');
        const lightPosGroup = this.element.querySelector('#group-lightPos');
        
        lightFollowCheck.checked = this.settings.lightFollowCamera;
        
        const updateLightUI = () => {
             // If Light Disabled, dim whole group
             if(!this.settings.lightEnabled) {
                 lightPosGroup.style.opacity = '0.3';
                 lightPosGroup.style.pointerEvents = 'none';
                 lightFollowCheck.disabled = true;
                 return;
             }
             
             lightFollowCheck.disabled = false;
             
             if(this.settings.lightFollowCamera) {
                 lightPosGroup.style.opacity = '0.3';
                 lightPosGroup.style.pointerEvents = 'none';
             } else {
                 lightPosGroup.style.opacity = '1.0';
                 lightPosGroup.style.pointerEvents = 'auto';
             }
        };
        updateLightUI();

        lightFollowCheck.addEventListener('change', (e) => {
            this.settings.lightFollowCamera = e.target.checked;
            updateLightUI();
            this.broadcastSettings();
        });
        
        lightEnabledCheck.addEventListener('change', (e) => {
            updateLightUI(); // Settings updated by bindCheckbox already? No, bindCheckbox adds its own listener.
            // We need to hook into the update.
            // Actually bindCheckbox does: this.settings[key] = val; broadcast();
            // We can just listen to it or patch it.
            // Simplest: Add another listener
            setTimeout(updateLightUI, 0); 
        });
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
        bindCheckbox('inp-showWebcam', 'showWebcam');
        bindCheckbox('inp-physicsMode', 'physicsMode'); // Physics Mode
        bindCheckbox('inp-crosshair', 'showCrosshair');

        this.element.querySelector('#btn-reset').addEventListener('click', () => {
            localStorage.removeItem('viewer_settings');
            location.reload();
        });
    }
}
