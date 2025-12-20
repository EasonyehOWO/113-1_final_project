import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { BlinnPhongShader } from './BlinnPhongShader.js';

/**
 * GraphicsApp
 * 負責主要的 3D 場景渲染、相機控制與物理透視計算。
 */
export const GraphicsApp = {
    // --- 核心元件 (Core Components) ---
    scene: null,
    camera: null,
    renderer: null,
    raycaster: null,
    loader: null,

    // --- 場景物件 (Scene Objects) ---
    rotGroup: null,   // 旋轉群組 (模擬頭部轉動造成的視差)
    transGroup: null, // 位移群組 (模擬身體移動)
    currentModel: null,
    customPointLight: null, // 自訂光源 (當模型無光源時使用)

    // 輔助線與標記
    floorGrid: null,
    wallGrid: null,
    hitMarker: null,
    floorProjectionLine: null,
    wallProjectionLine: null,
    raycastTargets: [],

    // --- 設定值 (Settings) ---
    settings: {
        // 追蹤靈敏度
        sensitivityX: 12.0,
        sensitivityY: 12.0,
        sensitivityZ: 1.0,  // 深度靈敏度 (基於臉部寬度比)
        invertX: false,
        invertY: false,
        
        // 偏移校正
        offsetX: 0,
        offsetY: 0,

        // 視覺模式
        visualConvergenceMode: false, // 視覺收斂模式 (全像投影/Orbit)
        physicsMode: false,           // 真實透視模式 (Real Scale)
        convergence: 0.0,             // 舊版 Zoom 模式的收斂參數 (Legacy)
        stabilization: true,          // 是否開啟平滑 (Lerp)
        
        // 顯示設定
        showCrosshair: true,
        rendererScale: 0.5,           // 解析度縮放 (效能優化)

        // 光源設定
        lightEnabled: true,
        lightFollowCamera: false,
        lightIntensity: 1.0,
        lightColor: '#ffffff',
        lightX: 5, lightY: 5, lightZ: 5,

        // 距離與霧氣
        cameraNear: 0.1,    // 近截面 (可調整以切除過近物體)
        cameraFar: 1000.0,
        fogNear: 5.0,
        fogFar: 20.0,

        // 校準參數
        calibrationPPI: 96, // 螢幕像素密度
        lerpFactor: 0.1     // 預設平滑係數
    },

    // --- 狀態變數 (State) ---
    targetCamPos: new THREE.Vector3(0, 0, 5), // 目標相機位置 (用於平滑插值)
    lastX: 0, lastY: 0, lastZ: 5,             // 上一次的追蹤座標
    lerpFactor: 0.1,                          // 當前使用的平滑係數 (可變)

    // 手動控制 (鍵盤)
    keyboardState: {},
    manualPos: new THREE.Vector3(0, 0, 0),    // 虛擬角色的位移
    manualRot: new THREE.Vector3(0, 0, 0),    // 虛擬角色的旋轉
    MANUAL_SPEED: 0.1,
    MANUAL_ROT_SPEED: 0.01,

    // 常數定義
    CONSTANTS: {
        FLOOR_Y: -4,
        WALL_Z: -8,
        PIVOT_Z: 5.0,        // 旋轉軸心深度 (對應相機預設距離)
        REF_ViewDist_dm: 6.0 // 標準舒適觀看距離 (60cm = 6dm)
    },

    // ========================================================================
    // 初始化與設置 (Initialization & Setup)
    // ========================================================================

    init: function(containerId) {
        const container = document.getElementById(containerId);

        // 1. 建立場景 (Scene)
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x000000);
        this.scene.fog = new THREE.Fog(0x000000, this.settings.fogNear, this.settings.fogFar);

        // 2. 建立層級結構 (Hierarchy)
        // 為了模擬「人在走動」，我們反向移動整個世界 (World)。
        // 結構：Scene -> RotGroup (旋轉) -> TransGroup (位移) -> 物件
        this.rotGroup = new THREE.Group();
        this.transGroup = new THREE.Group();
        this.rotGroup.add(this.transGroup);
        this.scene.add(this.rotGroup);

        // 3. 建立相機 (Camera)
        // 這裡只負責追蹤「真實頭部」的位置。
        this.camera = new THREE.PerspectiveCamera(
            60, 
            window.innerWidth / window.innerHeight, 
            this.settings.cameraNear, 
            this.settings.cameraFar
        );
        this.camera.position.z = 5;
        this.targetCamPos.copy(this.camera.position);

        // 4. 建立渲染器 (Renderer)
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(this.settings.rendererScale || 0.5);
        container.appendChild(this.renderer.domElement);

        // 5. 初始化工具
        this.raycaster = new THREE.Raycaster();
        this.loader = new GLTFLoader();

        // 6. 建置環境與載入模型
        this.buildEnvironment();
        this.loadModel(); // 若有預設模型路徑則載入

        // 7. 事件監聽
        window.addEventListener('resize', () => this.onWindowResize(), false);
        window.addEventListener('keydown', (e) => this.onKeyDown(e), false);
        window.addEventListener('keyup', (e) => this.onKeyUp(e), false);
        this.setupDragAndDrop();

        console.log("GraphicsApp Initialized.");
        this.animate(); // 開始渲染迴圈
    },

    /**
     * 更新設定值
     * 當使用者調整控制面板時呼叫此函式
     */
    updateSettings: function(newSettings) {
        Object.assign(this.settings, newSettings);

        // 即時應用特定設定
        if (this.renderer && newSettings.rendererScale) {
            this.renderer.setPixelRatio(newSettings.rendererScale);
        }
        
        // 更新 Lerp 平滑係數
        if (this.settings.stabilization) {
            // 如果只有 stabilization 切換，沒有傳入 lerpFactor，使用 0.1 預設
            // 或者使用當前 settings 中的值
            this.lerpFactor = newSettings.lerpFactor || this.settings.lerpFactor || 0.1;
        } else {
            this.lerpFactor = 1.0;
        }
        
        // 更新霧氣與相機距離
        if (this.scene && this.scene.fog) {
            if (newSettings.fogNear !== undefined) this.scene.fog.near = newSettings.fogNear;
            if (newSettings.fogFar !== undefined) this.scene.fog.far = newSettings.fogFar;
        }
        if (this.camera) {
            let needsUpdate = false;
            if (newSettings.cameraFar !== undefined) { this.camera.far = newSettings.cameraFar; needsUpdate = true; }
            if (newSettings.cameraNear !== undefined) { this.camera.near = newSettings.cameraNear; needsUpdate = true; }
            if (needsUpdate) this.camera.updateProjectionMatrix();
        }

        // 隱藏/顯示輔助線
        if (!this.settings.showCrosshair && this.hitMarker) {
            this.hitMarker.visible = false;
            this.floorProjectionLine.visible = false;
            this.wallProjectionLine.visible = false;
        }
    },

    // ========================================================================
    // 臉部追蹤邏輯 (Face Tracking Logic)
    // ========================================================================

    /**
     * 接收 FaceTracker 傳來的原始資料，轉換為 3D 空間座標
     * @param {Object} data - { x, y, faceWidthRatio, face }
     */
    updateHeadData(data) {
        if (!data || !data.face) return; // 確保有偵測到人臉
        
        const { x, y, faceWidthRatio } = data;

        // 1. PPI 校正係數
        // Physics Mode 下，螢幕解析度越高(PPI高)，同樣的像素移動代表的物理距離越短。
        // 我們將其轉換為虛擬世界的公寸單位 (dm)。
        const ppi = this.settings.calibrationPPI || 96;
        const ppiCorrection = 48.0 / ppi; // 基於標準 96DPI 的縮放與半寬修正

        // 2. 計算目標 X, Y (加上靈敏度與偏移)
        let targetX = (x * this.settings.sensitivityX) + (this.settings.offsetX || 0);
        let targetY = (y * this.settings.sensitivityY) + (this.settings.offsetY || 0);

        // 應用 PPI 修正
        targetX *= ppiCorrection;
        targetY *= ppiCorrection;

        // 軸向反轉
        if (this.settings.invertX) targetX = -targetX;
        if (this.settings.invertY) targetY = -targetY;

        // 3. 計算目標 Z (深度估算)
        // 利用針孔成像原理: D = f * (H / h)
        // 簡化為: Z = SensitivityZ / FaceWidthRatio
        const targetZ = this.settings.sensitivityZ / Math.max(0.01, faceWidthRatio);

        // 4. 平滑化處理 (Lerp)
        this.lastX += (targetX - this.lastX) * this.lerpFactor;
        this.lastY += (targetY - this.lastY) * this.lerpFactor;
        this.lastZ += (targetZ - this.lastZ) * this.lerpFactor;

        // 限制 Z 軸範圍避免破圖
        const clampedZ = Math.max(1.0, Math.min(this.lastZ, 15.0));

        this.targetCamPos.set(this.lastX, this.lastY, clampedZ);
        
        // 更新 UI 數值顯示
        const debugX = document.getElementById('head-x');
        const debugY = document.getElementById('head-y');
        if(debugX) debugX.innerText = this.lastX.toFixed(2);
        if(debugY) debugY.innerText = this.lastY.toFixed(2);
    },

    // ========================================================================
    // 渲染迴圈 (Render Loop)
    // ========================================================================

    animate() {
        requestAnimationFrame(() => this.animate());
        if (!this.camera || !this.renderer) return;

        // 1. 更新手動控制 (鍵盤移動)
        this.updateManualControls();

        // 2. 更新相機位置 (追蹤頭部)
        // 使用 Lerp 平滑移動到目標位置
        this.camera.position.lerp(this.targetCamPos, 0.1);

        // 3. 計算並更新投影矩陣 (透視核心)
        this.updateCameraProjection();

        // 4. 更新 Shader Uniforms (光源與視角)
        this.updateShaderUniforms();

        // 5. 更新互動游標 (Raycasting)
        if (this.settings.showCrosshair) {
            this.updateCrosshair();
        }

        this.renderer.render(this.scene, this.camera);
    },

    /**
     * 處理鍵盤輸入，移動虛擬世界 (World)
     * 這模擬了使用者在虛擬空間中的行走
     */
    updateManualControls: function() {
        // --- 計算移動向量 (基於目前的 Y 軸旋轉) ---
        const yaw = this.manualRot.y;
        const forward = new THREE.Vector3(-Math.sin(yaw), 0, -Math.cos(yaw));
        const right = new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw));

        // --- 處理位移 ---
        const speed = this.MANUAL_SPEED;
        const ks = this.keyboardState;

        if (ks['w']) this.manualPos.addScaledVector(forward, speed);
        if (ks['s']) this.manualPos.addScaledVector(forward, -speed);
        if (ks['a']) this.manualPos.addScaledVector(right, -speed);
        if (ks['d']) this.manualPos.addScaledVector(right, speed);
        if (ks['t']) this.manualPos.y += speed; // 上升
        if (ks['b']) this.manualPos.y -= speed; // 下降

        // --- 處理旋轉 ---
        const rotSpeed = this.MANUAL_ROT_SPEED;
        if (ks['arrowup'])    this.manualRot.x += rotSpeed;
        if (ks['arrowdown'])  this.manualRot.x -= rotSpeed;
        if (ks['arrowleft'])  this.manualRot.y += rotSpeed;
        if (ks['arrowright']) this.manualRot.y -= rotSpeed;

        // --- 重置功能 ---
        if (ks['i']) this.manualPos.y = 0;
        if (ks['o']) { this.manualPos.x = 0; this.manualPos.z = 0; }
        if (ks['0']) this.manualRot.set(0, 0, 0);

        // --- 應用逆向變換到 World Groups ---
        // 1. Pivot 調整: 將旋轉中心移至相機深度平面
        this.rotGroup.position.set(0, 0, this.CONSTANTS.PIVOT_Z);

        // 2. 應用旋轉 (反向)
        this.rotGroup.rotation.y = -this.manualRot.y;
        this.rotGroup.rotation.x = -this.manualRot.x;

        // 3. 應用位移 (反向並補償 Pivot)
        this.transGroup.position.x = -this.manualPos.x;
        this.transGroup.position.y = -this.manualPos.y;
        this.transGroup.position.z = -this.manualPos.z - this.CONSTANTS.PIVOT_Z;
    },

    /**
     * 核心透視邏輯
     * 根據模式 (Convergence / Window) 與校準 (Physics / Zoom) 計算 projectionMatrix
     */
    updateCameraProjection: function() {
        // 共通參數：計算螢幕的虛擬物理尺寸 (dm)
        // 1 dm = 10 cm = 虛擬世界 1 單位
        const ppi = this.settings.calibrationPPI || 96;
        const ppcm = ppi / 2.54;
        const screenH_virtual = (window.innerHeight / ppcm) / 10.0;
        const screenW_virtual = (window.innerWidth / ppcm) / 10.0;
        const halfH = screenH_virtual / 2.0;
        const halfW = screenW_virtual / 2.0;
        const z = Math.max(0.1, this.camera.position.z); // 眼睛到螢幕的距離

        // --- 模式 A: 視覺收斂模式 (Hologram / Orbit) ---
        if (this.settings.visualConvergenceMode) {
            // 相機注視中心 (0,0,0)，形成圍繞效果
            this.camera.lookAt(0, 0, 0);

            // 計算 FOV (視野角度)
            if (this.settings.physicsMode) {
                // 真實透視: 在距離 Z 處填滿螢幕高度
                // tan(FOV/2) = (ScreenH / 2) / Z
                const fovRad = 2 * Math.atan(halfH / z);
                this.camera.fov = THREE.MathUtils.RAD2DEG * fovRad;
            } else {
                // Zoom 模式: 在標準距離 (60cm) 處填滿螢幕
                // 這確保了跨裝置的視覺比例一致性 (Comfortable FOV)
                const fovRad = 2 * Math.atan(halfH / this.CONSTANTS.REF_ViewDist_dm);
                this.camera.fov = THREE.MathUtils.RAD2DEG * fovRad;
            }
            this.camera.updateProjectionMatrix();

        } 
        // --- 模式 B: 視窗模式 (Window / Off-axis) ---
        else {
            // 相機永遠朝前 (不旋轉)
            this.camera.rotation.set(0, 0, 0);

            const near = this.camera.near;
            const far = this.camera.far;
            let l, r, t, b; // Frustum Planes (視錐體邊界)

            // 計算視錐體形狀
            if (this.settings.physicsMode) {
                // --- 真實透視 (Off-axis Projection) ---
                // 直接連結「眼睛位置」與「螢幕四角」
                const cx = this.camera.position.x;
                const cy = this.camera.position.y;
                const cz = z;

                // 相似三角形公式: top = (ScreenTop - CanY) * (Near / Dist)
                t = ((halfH - cy) * near) / cz;
                b = ((-halfH - cy) * near) / cz;
                r = ((halfW - cx) * near) / cz;
                l = ((-halfW - cx) * near) / cz;

                // 除錯日誌 (每秒一次)
                if (!this._debugFrameCnt) this._debugFrameCnt = 0;
                if (this._debugFrameCnt++ % 60 === 0) {
                    // console.log(`[Physics] Dist:${z.toFixed(2)} NearW:${(r-l).toFixed(4)} ScreenW:${screenW_virtual.toFixed(3)}`);
                }

                this.camera.projectionMatrix.makePerspective(l, r, t, b, near, far);

            } else {
                // --- Zoom 模式 (Legacy / Pinhole) ---
                // 固定舒適 FOV，並加上簡單的 Frustum Shift 模擬偏移
                
                // 1. 設定舒適 FOV
                const calibratedFOV = THREE.MathUtils.RAD2DEG * 2 * Math.atan(halfH / this.CONSTANTS.REF_ViewDist_dm);
                this.camera.fov = calibratedFOV;

                // 2. 計算 Frustum Shift (模擬視角偏移)
                // 根據收斂參數調整偏移量
                const frustumShift = (1.0 - this.settings.convergence);
                
                // 重新計算邊界
                let top = near * Math.tan(THREE.MathUtils.DEG2RAD * 0.5 * this.camera.fov);
                let bottom = -top;
                let right = top * this.camera.aspect;
                let left = -right;

                // 偏移量
                const shiftX = (this.camera.position.x / z) * near * frustumShift;
                const shiftY = (this.camera.position.y / z) * near * frustumShift;

                this.camera.projectionMatrix.makePerspective(
                    left - shiftX, right - shiftX, 
                    top - shiftY, bottom - shiftY, 
                    near, far
                );
            }
        }
    },

    updateShaderUniforms: function() {
        if (!this.currentModel) return;

        // 同步自訂光源 (PointLight)
        if (this.customPointLight) {
            this.customPointLight.visible = this.settings.lightEnabled;
            this.customPointLight.intensity = this.settings.lightIntensity;
            if (this.settings.lightColor) this.customPointLight.color.set(this.settings.lightColor);

            if (this.settings.lightFollowCamera) {
                // 讓光源跟隨相機 (手電筒效果)
                // 由於 TransGroup 被反向移動，我们需要補償這個移動讓光源留在相機處
                this.customPointLight.position.copy(this.manualPos).add(this.camera.position);
            } else {
                this.customPointLight.position.set(this.settings.lightX, this.settings.lightY, this.settings.lightZ);
            }
        }

        // 同步 Shader 材質 Uniforms
        this.currentModel.traverse((child) => {
            if (child.isMesh && child.material.uniforms) {
                child.material.uniforms.uViewPos.value.copy(this.camera.position);
                
                const intensity = this.settings.lightEnabled ? this.settings.lightIntensity : 0.0;
                child.material.uniforms.uLightIntensity.value = intensity;
                
                if (this.settings.lightColor) {
                    child.material.uniforms.uLightColor.value.set(this.settings.lightColor);
                }
                
                child.material.uniforms.uLightPos.value.set(
                    this.settings.lightX, this.settings.lightY, this.settings.lightZ
                );
                child.material.uniforms.uUseLightFollow.value = this.settings.lightFollowCamera;
            }
        });
    },

    // ========================================================================
    // 場景建置與輔助工具 (Scene Building & Helpers)
    // ========================================================================

    buildEnvironment: function() {
        // 地板網格
        this.floorGrid = new THREE.GridHelper(20, 20, 0x00ffff, 0x444444);
        this.floorGrid.position.y = this.CONSTANTS.FLOOR_Y;
        this.transGroup.add(this.floorGrid);

        // 背景牆網格
        this.wallGrid = new THREE.GridHelper(20, 20, 0xff00ff, 0x444444);
        this.wallGrid.rotation.x = Math.PI / 2;
        this.wallGrid.position.z = this.CONSTANTS.WALL_Z;
        this.transGroup.add(this.wallGrid);

        // 隱形射線檢測平面 (用於滑鼠互動)
        const planeGeo = new THREE.PlaneGeometry(20, 20);
        const planeMat = new THREE.MeshBasicMaterial({ visible: false });
        
        const floorPlane = new THREE.Mesh(planeGeo, planeMat);
        floorPlane.position.y = this.CONSTANTS.FLOOR_Y;
        floorPlane.rotation.x = -Math.PI / 2;
        this.transGroup.add(floorPlane);

        const backWallPlane = new THREE.Mesh(planeGeo, planeMat);
        backWallPlane.position.z = this.CONSTANTS.WALL_Z;
        this.transGroup.add(backWallPlane);

        this.raycastTargets = [floorPlane, backWallPlane];

        // 互動標記點 (Hit Marker)
        this.hitMarker = new THREE.Mesh(
            new THREE.SphereGeometry(0.05),
            new THREE.MeshBasicMaterial({ color: 0xff0000 })
        );
        this.hitMarker.visible = false;
        this.scene.add(this.hitMarker);

        // 投影輔助線
        const lineMat = new THREE.LineBasicMaterial({ color: 0xffffff, linewidth: 2 });
        this.floorProjectionLine = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]), lineMat);
        this.wallProjectionLine = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]), lineMat);
        this.floorProjectionLine.visible = false;
        this.wallProjectionLine.visible = false;
        
        // 重要修正：將輔助線加入 transGroup，隨世界一起移動
        this.transGroup.add(this.floorProjectionLine);
        this.transGroup.add(this.wallProjectionLine);
        
        // 建立自訂光源物件 (備用)
        this.customPointLight = new THREE.PointLight(0xffffff, 1, 100);
        this.transGroup.add(this.customPointLight);
    },

    loadModel: function() {
        if (typeof TARGET_MODEL_PATH !== 'undefined' && TARGET_MODEL_PATH) {
            console.log("Loading model:", TARGET_MODEL_PATH);
            this.loadGLTF(TARGET_MODEL_PATH);
        } else {
            console.warn("No TARGET_MODEL_PATH defined.");
        }
    },

    loadGLTF: function(url) {
        this.loader.load(url, (gltf) => {
            // 清除舊模型
            if (this.currentModel) {
                this.transGroup.remove(this.currentModel);
                // 這裡可以加入 dispose 邏輯釋放記憶體
            }

            this.currentModel = gltf.scene;

            // 檢查模型是否有內建光源
            let hasInternalLights = false;
            this.currentModel.traverse((node) => { if (node.isLight) hasInternalLights = true; });

            if (hasInternalLights) {
                console.log("Model has lights. Disabling custom shader.");
                this.settings.lightEnabled = false;
                if(this.customPointLight) this.customPointLight.visible = false;
            } else {
                console.log("No internal lights. Applying custom shader.");
                this.settings.lightEnabled = true;
                this.applyShaderToModel(this.currentModel);
            }

            this.transGroup.add(this.currentModel);

            // 自動縮放與置中
            const box = new THREE.Box3().setFromObject(this.currentModel);
            const size = box.getSize(new THREE.Vector3());
            const center = box.getCenter(new THREE.Vector3());
            const maxDim = Math.max(size.x, size.y, size.z);
            const scale = 4.0 / maxDim; // 縮放至 4 單位大小
            
            this.currentModel.scale.setScalar(scale);
            this.currentModel.position.sub(center.multiplyScalar(scale)); // 移回中心
            this.currentModel.position.y = -center.y; // 貼齊地面? 視情況調整

        }, undefined, (err) => {
            console.error('GLTF Load Error:', err);
        });
    },

    applyShaderToModel: function(model) {
        model.traverse((child) => {
            if (child.isMesh) {
                // 複製 Shader Uniforms 並保留原始貼圖/顏色
                const newUniforms = THREE.UniformsUtils.clone(BlinnPhongShader.uniforms);
                
                if (child.material.map) {
                    newUniforms.uTexture.value = child.material.map;
                    newUniforms.uHasTexture.value = true;
                } else if (child.material.color) {
                    newUniforms.uColor.value = child.material.color;
                    newUniforms.uHasTexture.value = false;
                }
                
                // 保留 Roughness / Emissive 屬性
                newUniforms.uRoughness.value = child.material.roughness !== undefined ? child.material.roughness : 0.5;
                if (child.material.emissiveMap) {
                    newUniforms.uEmissiveMap.value = child.material.emissiveMap;
                    newUniforms.uHasEmissiveMap.value = true;
                }
                if (child.material.emissive) {
                    newUniforms.uEmissive.value = child.material.emissive;
                }

                child.material = new THREE.ShaderMaterial({
                    uniforms: newUniforms,
                    vertexShader: BlinnPhongShader.vertexShader,
                    fragmentShader: BlinnPhongShader.fragmentShader
                });
            }
        });
    },

    setupDragAndDrop: function() {
        const container = document.body;
        // 簡單的拖放邏輯，支援 .glb/.gltf
        container.addEventListener('dragover', (e) => { e.preventDefault(); container.style.opacity = '0.8'; });
        container.addEventListener('dragleave', (e) => { e.preventDefault(); container.style.opacity = '1.0'; });
        container.addEventListener('drop', (e) => {
            e.preventDefault(); container.style.opacity = '1.0';
            if (e.dataTransfer.files.length > 0) {
                const file = e.dataTransfer.files[0];
                if (file.name.match(/\.(glb|gltf)$/i)) {
                    this.loadGLTF(URL.createObjectURL(file));
                } else {
                    alert("只支援 .glb 或 .gltf 格式");
                }
            }
        });
    },

    onWindowResize: function() {
        if (!this.camera || !this.renderer) return;
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    },

    onKeyDown: function(event) {
        // 同時記錄 key (char) 與 code (physical key)
        this.keyboardState[event.key.toLowerCase()] = true;
        this.keyboardState[event.code.toLowerCase()] = true; 
    },
    onKeyUp: function(event) {
        this.keyboardState[event.key.toLowerCase()] = false;
        this.keyboardState[event.code.toLowerCase()] = false;
    },

    updateCrosshair: function() {
        // 從相機中心發射射線
        this.raycaster.setFromCamera(new THREE.Vector2(0, 0), this.camera);
        const intersects = this.raycaster.intersectObjects(this.raycastTargets);

        if (intersects.length > 0) {
            const hit = intersects[0];
            this.hitMarker.position.copy(hit.point);
            this.hitMarker.visible = true;

            const updateLine = (line, start, end) => {
                const pos = line.geometry.attributes.position;
                pos.setXYZ(0, start.x, start.y, start.z);
                pos.setXYZ(1, end.x, end.y, end.z);
                pos.needsUpdate = true;
                line.visible = true;
            };
            
            // 重要：因為輔助線在 transGroup 內，必須將 World 座標轉為 Local 座標
            // 先 Clone 避免修改原始變數
            const localCam = this.transGroup.worldToLocal(this.camera.position.clone());
            const localHit = this.transGroup.worldToLocal(this.hitMarker.position.clone());

            // 地板投影線 (加上微小偏移 Y+0.01 避免 Z-fighting)
            updateLine(this.floorProjectionLine, 
                new THREE.Vector3(localCam.x, this.CONSTANTS.FLOOR_Y, localCam.z),
                new THREE.Vector3(localHit.x, this.CONSTANTS.FLOOR_Y, localHit.z)
            );
            
            // 牆壁投影線 (加上微小偏移 Z+0.01 避免 Z-fighting)
            updateLine(this.wallProjectionLine,
                 new THREE.Vector3(localCam.x, localCam.y, this.CONSTANTS.WALL_Z),
                 new THREE.Vector3(localHit.x, localHit.y, this.CONSTANTS.WALL_Z)
            );

        } else {
            this.hitMarker.visible = false;
            this.floorProjectionLine.visible = false;
            this.wallProjectionLine.visible = false;
        }
    }
};