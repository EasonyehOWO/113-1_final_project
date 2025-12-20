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
            sensitivityX: 8.0,
            sensitivityY: 8.0,
            sensitivityZ: 1.5,
            lerpFactor: 0.75,
            showCrosshair: true,
            rendererScale: 1.0,
            rendererScale: 1.0,
            stabilization: true,
            panelOpacity: 0.6,
            showWebcam: true,
            offsetX: 0,
            offsetY: 4, // webcam is typically at the top of the screen
            lightEnabled: true,
            lightX: 5,
            lightY: 5,
            lightZ: 5,
            lightIntensity: 1.0,
            lightColor: '#ffffff',
            
            lightFollowCamera: true,
            physicsMode: true, // True = Window/Physics Mode, False = Zoom Mode
            visualConvergenceMode: false, // True = LookAt Center (Hologram), False = Window Off-axis
            
            // Fog & Distance
            fogNear: 5.0,
            fogFar: 20.0,
            cameraFar: 1000.0,
            
            // Advanced Performance
            // Advanced Performance
            inputSize: 320 // AI Input Resolution (160-1920)
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
        
        const previewContainer = document.getElementById('preview-container');
        if (previewContainer) {
            // don't use display none to hide it; otherwise the webcam will stop working
            previewContainer.style.opacity = this.settings.showWebcam ? 1 : 0;
            previewContainer.style.pointerEvents = this.settings.showWebcam ? 'auto' : 'none';
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
                            <input type="checkbox" id="inp-convergenceMode">
                            視覺收斂模式 (LookAt Center)
                        </label>
                        <label class="toggle-label">
                            <input type="checkbox" id="inp-crosshair">
                            顯示十字準心 (Crosshair)
                        </label>
                        <button id="btn-fullscreen" class="btn-secondary" style="margin-top: 5px; width: 100%;">進入全螢幕</button>
                    </div>

                    <hr />

                    <div class="control-group">
                        <label style="color: #00bcd4;">光源設定</label>
                        <label class="toggle-label">
                            <input type="checkbox" id="inp-lightEnabled">
                            啟用自訂光源 (Enable Light)
                        </label>
                        <label class="toggle-label">
                            <input type="checkbox" id="inp-lightFollow">
                            光源跟隨相機 (Flashlight)
                        </label>
                        <div id="group-lightPos">
                            <div>
                                <label>Light X: <span id="val-lightX"></span></label>
                                <input type="range" id="inp-lightX" min="-20" max="20" step="0.5">
                            </div>
                            <div>
                                <label>Light Y: <span id="val-lightY"></span></label>
                                <input type="range" id="inp-lightY" min="-20" max="20" step="0.5">
                            </div>
                            <div>
                                <label>Light Z: <span id="val-lightZ"></span></label>
                                <input type="range" id="inp-lightZ" min="-20" max="20" step="0.5">
                            </div>
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
                            <label>X 軸靈敏度: <span id="val-sensX"></span></label>
                            <input type="range" id="inp-sensX" min="-100" max="100" step="0.2">
                        </div>
                        <div>
                            <label>Y 軸靈敏度: <span id="val-sensY"></span></label>
                            <input type="range" id="inp-sensY" min="-100" max="100" step="0.2">
                            <!-- 
                        <div style="margin-top:5px;">
                            <label>螢幕寬度 (cm): <span id="val-screenWidth"></span></label>
                            <input type="number" id="inp-screenWidth" value="30" step="0.5" style="width:60px;">
                        </div> 
                        -->
                    </div>

                    <hr />
                    
                    <div class="control-group">
                        <label style="color: #00bcd4;">距離與霧氣 (Distance & Fog)</label>
                        <div title="超過此距離的物體將不會被渲染">
                            <label>最遠顯示距離 (Camera Far): <span id="val-cameraFar"></span></label>
                            <input type="range" id="inp-cameraFar" min="10" max="2000" step="10">
                        </div>
                        <div>
                            <label>霧氣起始 (Fog Near): <span id="val-fogNear"></span></label>
                            <input type="range" id="inp-fogNear" min="0" max="100" step="1">
                        </div>
                        <div>
                            <label>霧氣結束 (Fog Far): <span id="val-fogFar"></span></label>
                            <input type="range" id="inp-fogFar" min="0" max="100" step="1">
                        </div>
                    </div>
                        <div title="= 臉框實寬(cm) / 10 / 2 / tan(橫向視野角 / 2)">
                            <label>Z 軸靈敏度（焦距和臉寬參數）: <span id="val-sensZ"></span></label>
                            <input type="range" id="inp-sensZ" min="0.1" max="5.0" step="0.1">
                        </div>
                        <!-- Future Physical Size Inputs (Placeholders for now) -->
                        <!-- 
                        <div style="margin-top:5px;">
                            <label>螢幕寬度 (cm): <span id="val-screenWidth"></span></label>
                            <input type="number" id="inp-screenWidth" value="30" step="0.5" style="width:60px;">
                        </div> 
                        -->
                    </div>

                    <hr />

                    <div class="control-group">
                        <label style="color: #00bcd4;">效能設定</label>
                        <div>
                            <label>數值平滑 (Stabilization): <span id="val-lerp"></span></label>
                            <div style="display: flex; align-items: center; gap: 0.5rem;">
                                <input type="checkbox" id="inp-stabilization">
                                <input type="range" id="inp-lerp" min="0.01" max="1.0" step="0.005" style="flex:1;">
                            </div>
                        </div>
                        <div>
                            <label>渲染解析度 (Render Scale): <span id="val-rendererScale"></span>x <span id="val-resolution" style="font-size: 0.8em; color: #888;"></span></label>
                            <input type="range" id="inp-renderScale" min="0.1" max="8.0" step="0.01">
                        </div>
                        <div title="運算量為此值平方，請不要設太高。建議 256~480。">
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

    initControls() {
        const panelEl = this.element.querySelector('.settings-panel');

        // Logic for UI updates (Opacity & Webcam)
        const updateUIEffects = () => {
            // Panel Opacity
            panelEl.style.setProperty('--panel-idle-opacity', this.settings.panelOpacity);
            
            // Webcam Visibility
            const previewContainer = document.getElementById('preview-container');
            if (previewContainer) {
                // don't use display none to hide it; otherwise the webcam will stop working
                previewContainer.style.opacity = this.settings.showWebcam ? 1 : 0;
                previewContainer.style.pointerEvents = this.settings.showWebcam ? 'auto' : 'none';
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
            if(disp) {
                if (key === 'offsetX' || key === 'offsetY') {
                    disp.innerText = parseFloat(this.settings[key]).toFixed(1);
                } else {
                    disp.innerText = this.settings[key];
                }
            }

            el.addEventListener('input', (e) => {
                let val = parseFloat(e.target.value);
                if (isNaN(val)) val = 0; // Safety check
                
                // For inputSize, only update label visual, do not commit yet
                if (key === 'inputSize') {
                     if(disp) disp.innerText = val;
                     return;
                }

                this.settings[key] = val;
                if(disp) disp.innerText = val;
                
                
                // Immediate local effect for UI settings
                if(key === 'panelOpacity') updateUIEffects();
                
                // Format for display (optional)
                if(key === 'offsetX' || key === 'offsetY') {
                    if(disp) disp.innerText = val.toFixed(1);
                }
                
                this.broadcastSettings();
            });

            // Handle 'change' for delayed updates (InputSize)
            if (key === 'inputSize') {
                el.addEventListener('change', (e) => {
                    let val = parseFloat(e.target.value);
                    if (isNaN(val)) val = 0;
                    
                    this.settings[key] = val;
                    if(disp) disp.innerText = val;
                    this.broadcastSettings(); 
                });
            }
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
        bindRange('inp-inputSize', 'inputSize'); // New Binding
        
        // Calibration Bindings
        bindRange('inp-offsetX', 'offsetX');
        bindRange('inp-offsetY', 'offsetY');

        // Lighting Bindings
        bindRange('inp-lightX', 'lightX');
        bindRange('inp-lightY', 'lightY');
        bindRange('inp-lightZ', 'lightZ');
        bindRange('inp-lightIntensity', 'lightIntensity');
        
        // Color Binding
        const bindColor = (id, key) => {
            const el = this.element.querySelector(`#${id}`);
            el.value = this.settings[key];
            const dispId = `val-${key}`;
            const disp = this.element.querySelector(`#${dispId}`);
            if(disp) disp.innerText = this.settings[key];

            el.addEventListener('input', (e) => {
                this.settings[key] = e.target.value;
                if(disp) disp.innerText = e.target.value;
                this.broadcastSettings();
            });
        };
        bindColor('inp-lightColor', 'lightColor');
        
        // Fog & Distance Bindings
        bindRange('inp-cameraFar', 'cameraFar');
        bindRange('inp-fogNear', 'fogNear');
        bindRange('inp-fogFar', 'fogFar');
        
        bindRange('inp-lightZ', 'lightZ');
        
        // Fog & Distance Bindings
        bindRange('inp-cameraFar', 'cameraFar');
        bindRange('inp-fogNear', 'fogNear');
        bindRange('inp-fogFar', 'fogFar');
        
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

        updateLerpUI();

        // bindSelect('inp-webcamRes', 'webcamRes'); // Removed
        bindCheckbox('inp-showWebcam', 'showWebcam');
        bindCheckbox('inp-showWebcam', 'showWebcam');
        bindCheckbox('inp-physicsMode', 'physicsMode'); // Physics Mode
        bindCheckbox('inp-convergenceMode', 'visualConvergenceMode'); // Convergence Mode
        bindCheckbox('inp-crosshair', 'showCrosshair');

        this.element.querySelector('#btn-reset').addEventListener('click', () => {
            localStorage.removeItem('viewer_settings');
            location.reload();
        });

        // Fullscreen Toggle Logic
        const btnFullscreen = this.element.querySelector('#btn-fullscreen');
        const updateFullscreenText = () => {
             if (document.fullscreenElement) {
                 btnFullscreen.innerText = "退出全螢幕";
             } else {
                 btnFullscreen.innerText = "進入全螢幕";
             }
        };

        btnFullscreen.addEventListener('click', () => {
            if (!document.fullscreenElement) {
                document.documentElement.requestFullscreen().catch(err => {
                    console.error(`Error attempting to enable fullscreen: ${err.message}`);
                });
            } else {
                if (document.exitFullscreen) {
                    document.exitFullscreen();
                }
            }
        });

        document.addEventListener('fullscreenchange', updateFullscreenText);
        document.addEventListener('fullscreenchange', updateFullscreenText);
        updateFullscreenText(); // Init state check

        // Resolution Text Logic
        const updateResolutionText = () => {
            const scale = this.settings.rendererScale || 1.0;
            const w = Math.round(window.innerWidth * scale);
            const h = Math.round(window.innerHeight * scale);
            const el = this.element.querySelector('#val-resolution');
            if(el) el.innerText = `(${w} x ${h})`;
        };
        
        // Update resolution text when scale changes (hook into existing listener or add new one? 
        // bindRange adds listener to input. We can just add another listener to the input element directly here for simplicity, 
        // or rely on the proxy setting catch? The proxy updateUIElement might be best place but that is for generic updates.
        // Let's just add a specific listener to the slider for this specific UI feature.)
        const scaleSlider = this.element.querySelector('#inp-renderScale');
        if(scaleSlider) {
             scaleSlider.addEventListener('input', updateResolutionText);
        }
        window.addEventListener('resize', updateResolutionText);
        updateResolutionText(); // Init
    }
}
