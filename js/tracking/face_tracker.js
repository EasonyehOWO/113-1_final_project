import '../libs/face-api.min.js';

export const FaceTracker = {
    // --- 核心元件 (Core Components) ---
    videoElement: null,
    statusElement: null,
    canvas: null,
    
    // --- 狀態變數 (State) ---
    currentStream: null,
    isModelLoaded: false,
    isRunning: false,
    
    // --- 顯示與回呼 (Display & Callback) ---
    displaySize: { width: 320, height: 240 },   // 實際顯示尺寸 (會隨 webcam metadata 更新)
    lastInputSizeUsed: null,                    // 上次使用的 AI 輸入解析度 (避免重複重啟)
    onUpdateCallback: null,                     // 座標更新回調 (給 SceneInit 使用)
    
    settings: {
        inputSize: 224,                         // AI 輸入解析度 (越小越快，越大越準)
        scoreThreshold: 0.3,                    // 信心閾值
        stabilization: true,                    // 是否開啟平滑 (此處僅儲存，實際運算在 SceneInit)
        lerpFactor: 0.5,                        // 平滑係數
        maxFps: 30                              // 最大 FPS 限制
    },

    // --- 常數定義 (Constants) ---
    CONSTANTS: {
        MODEL_PATH: 'assets/models/weights',    // 模型路徑
        DEBUG_COLOR: '#00ff00',               // 臉部框顏色
        STATUS_COLORS: {
            LOADING: 'yellow',
            READY: 'cyan',
            ERROR: 'red',
            TRACKING: '#00ff00',
            NO_FACE: 'orange'
        }
    },

    // ========================================================================
    // 初始化 (Initialization)
    // ========================================================================

    init: async function(videoElementId) {
        this.videoElement = document.getElementById(videoElementId);
        this.statusElement = document.getElementById('tracking-status');
        this.canvas = document.getElementById('tracking-canvas');
        
        // 設定初始顯示尺寸
        this.videoElement.width = this.displaySize.width;
        this.videoElement.height = this.displaySize.height;

        this.updateStatus("正在載入輕量級模型...", this.CONSTANTS.STATUS_COLORS.LOADING);
        
        try {
            // 載入 TinyFaceDetector 模型 (輕量快速)
            await faceapi.nets.tinyFaceDetector.loadFromUri(this.CONSTANTS.MODEL_PATH);
            
            this.isModelLoaded = true;
            this.updateStatus("模型載入完成，啟動攝影機...", this.CONSTANTS.STATUS_COLORS.READY);
            
            // 注意：攝影機啟動通常由 Panel 設定觸發 (this.startWebcam)
        } catch (error) {
            console.error("Model load failed:", error);
            this.updateStatus("模型載入失敗", this.CONSTANTS.STATUS_COLORS.ERROR);
        }
    },

    // ========================================================================
    // 攝影機串流管理 (Webcam Management)
    // ========================================================================

    startWebcam: async function(targetInputSize = null) {
        // 1. 停止舊的串流 (避免多重開啟)
        if (this.currentStream) {
            this.currentStream.getTracks().forEach(track => track.stop());
        }

        const size = targetInputSize || this.settings.inputSize || 224;
        let stream = null;

        // 2. 嘗試獲取攝影機 (優先順序：指定解析度 -> 理想解析度)
        try {
            // 策略 A: 強制最小解析度 (確保畫質)
            stream = await navigator.mediaDevices.getUserMedia({ 
                video: { width: { min: size }, height: { min: size }, facingMode: 'user' } 
            });
            console.log("[Webcam] Strategy A (Min Size) success");
        } catch (e) {
            try {
                // 策略 B: 盡力而為 (Ideal Size)
                stream = await navigator.mediaDevices.getUserMedia({ 
                    video: { width: { ideal: size }, height: { ideal: size }, facingMode: 'user' } 
                });
                console.log("[Webcam] Strategy B (Ideal Size) success");
            } catch (fatalError) {
                console.error("Webcam Fatal Error:", fatalError);
                this.updateStatus("無法啟動攝影機: " + fatalError.message, this.CONSTANTS.STATUS_COLORS.ERROR);
                return;
            }
        }

        if (!stream) return;

        // 3. 綁定串流至 Video 元素
        this.currentStream = stream;
        this.videoElement.srcObject = stream;
        
        // 4. 等待 Metadata 載入以獲取真實解析度
        this.videoElement.onloadedmetadata = () => {
            const vW = this.videoElement.videoWidth;
            const vH = this.videoElement.videoHeight;
            console.log(`[Webcam] Active Resolution: ${vW}x${vH}`);
            
            // 同步 Canvas 尺寸
            this.displaySize = { width: vW, height: vH };
            if (this.canvas) {
                this.canvas.width = vW;
                this.canvas.height = vH;
            }

            // 確保影片播放
            this.videoElement.play().catch(e => console.error("Play error", e));
        };
        
        // 5. 啟動偵測迴圈 (若尚未啟動)
        if (!this.isRunning) {
            this.isRunning = true;
            this.startDetectionLoop();
        }
    },

    // ========================================================================
    // 偵測迴圈 (Detection Loop)
    // ========================================================================

    startDetectionLoop: async function() {
        const loop = async () => {
             // 檢查條件：影片播放中、模型已載入、影片尺寸有效
            if (this.videoElement.paused || this.videoElement.ended || !this.isModelLoaded || this.videoElement.videoWidth === 0) {
                return;
            }

            // 1. 同步 Canvas 尺寸 (若視窗大小改變)
            this.syncCanvasSize();

            // 2. 執行人臉偵測
            // 使用 TinyFaceDetectorOptions (適合即時運算)
            const inputSize = this.settings.inputSize || 224;
            const scoreThreshold = this.settings.scoreThreshold || 0.3;
            
            let detection = null;
            try {
                detection = await faceapi.detectSingleFace(
                    this.videoElement, 
                    new faceapi.TinyFaceDetectorOptions({ inputSize, scoreThreshold })
                );
            } catch (err) {
                console.warn("Detection dropped:", err); 
                return;
            }

            // 3. 處理偵測結果
            this.processDetectionResult(detection);
        };

        // 使用 while loop 控制 FPS，避免 requestAnimationFrame 過於頻繁導致 GPU 過熱
        let timestamp = 0;
        while(true) {
            timestamp = Date.now();
            await loop(); 

            // FPS 控制 (Dynamic)
            const targetFps = this.settings.maxFps || 30;
            let nextTime = timestamp + 1000 / targetFps;
            const now = Date.now();
            if(now < nextTime) {
                await new Promise(resolve => setTimeout(resolve, nextTime - now));
            }
        }
    },

    /**
     * 處理偵測結果並更新 UI
     */
    processDetectionResult: function(detection) {
        const ctx = this.canvas ? this.canvas.getContext('2d') : null;
        
        // 清除畫布
        if (ctx) ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        if (!detection) {
            this.updateStatus("未偵測到人臉", this.CONSTANTS.STATUS_COLORS.NO_FACE);
            return;
        }

        this.updateStatus("追蹤中 (Normal)", this.CONSTANTS.STATUS_COLORS.TRACKING);

        // 取得偵測框資訊
        const { x, y, width, height } = detection.box;
        const centerX = x + width / 2;
        const centerY = y + height / 2;
        
        // 繪製偵測框 (Debug)
        if (ctx) {
            ctx.strokeStyle = this.CONSTANTS.DEBUG_COLOR;
            ctx.lineWidth = 2;
            ctx.strokeRect(x, y, width, height);
        }

        // --- 座標正規化 (Normalization) ---
        // 將像素座標轉換為 -1.0 ~ 1.0 的標準化座標，方便之後映射到 3D 空間。
        const vWidth = this.videoElement.videoWidth;
        const vHeight = this.videoElement.videoHeight;
        
        // 1. X 軸鏡像與正規化
        // 因為通常是自拍模式，使用者向左移，畫面人臉會向右移。
        // 我們希望輸出符合「鏡中世界」的座標，所以需要反轉。
        // 公式：-((x / w) * 2 - 1)
        let normX = -((centerX / vWidth) * 2 - 1);
        
        // 2. Y 軸反轉與正規化
        // Canvas Y 軸向下為正，但在 3D 空間通常 Y 軸向上為正。
        let normY = -((centerY / vHeight) * 2 - 1);

        // 3. 臉部寬度比例 (用於深度估算)
        // 臉越大，代表離鏡頭越近
        const faceWidthRatio = width / vWidth;

        // 回傳數據給 SceneInit
        if (this.onUpdateCallback) {
            this.onUpdateCallback({
                x: normX,
                y: normY,
                faceWidthRatio: faceWidthRatio,
                face: detection.box
            });
        }
    },

    // ========================================================================
    // 輔助函式 (Helpers)
    // ========================================================================

    syncCanvasSize: function() {
        if (this.canvas && this.videoElement.videoWidth > 0) {
             if (this.canvas.width !== this.videoElement.videoWidth || this.canvas.height !== this.videoElement.videoHeight) {
                 this.canvas.width = this.videoElement.videoWidth;
                 this.canvas.height = this.videoElement.videoHeight;
             }
        }
    },

    updateStatus: function(text, color) {
        if (this.statusElement) {
            this.statusElement.innerText = text;
            if (color) this.statusElement.style.color = color;
        }
    },
    
    onUpdate: function(callback) {
        this.onUpdateCallback = callback;
    },

    updateSettings: function(settings) {
        // 更新內部設定
        if (settings.stabilization !== undefined && settings.lerpFactor !== undefined) {
             this.settings.stabilization = settings.stabilization;
             this.settings.lerpFactor = settings.lerpFactor;
        }
        
        // 檢查是否需要重啟 Webcam (當 InputSize 改變時)
        if (settings.inputSize && settings.inputSize !== this.lastInputSizeUsed) {
            // 合併設定
            this.settings = { ...this.settings, ...settings };
            
            // 優化：避免微小變動導致頻繁重啟
            if (this.lastInputSizeUsed && Math.abs(settings.inputSize - this.lastInputSizeUsed) < 32) return;
            
            this.lastInputSizeUsed = settings.inputSize;
            
            console.log(`[Settings] InputSize changed to ${settings.inputSize}, restarting stream...`);
            this.startWebcam(settings.inputSize);
        } else {
             this.settings = { ...this.settings, ...settings };
        }
    }
};