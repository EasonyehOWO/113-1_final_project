// js/tracking/face_tracker.js
import '../libs/face-api.min.js';

export const FaceTracker = {
    videoElement: null,
    statusElement: null,
    canvas: null, // 用來畫偵測框 (Debug用)
    displaySize: { width: 320, height: 240 }, // 降低解析度以提升效能
    onUpdateCallback: null,
    isModelLoaded: false,

    // 平滑化變數 (避免畫面抖動)
    lastX: 0,
    lastY: 0,
    lerpFactor: 0.1, // 平滑係數 (0.1 = 很平滑但有延遲, 0.5 = 反應快但稍抖)

    init: async function(videoElementId) {
        this.videoElement = document.getElementById(videoElementId);
        this.statusElement = document.getElementById('tracking-status');
        
        // 設定 Video 大小
        this.videoElement.width = this.displaySize.width;
        this.videoElement.height = this.displaySize.height;

        this.statusElement.innerText = "正在載入 AI 模型...";
        
        try {
            // 1. 載入模型 (請確保路徑正確)
            // 我們使用 TinyFaceDetector，因為它最快，適合即時互動
            await faceapi.nets.tinyFaceDetector.loadFromUri('assets/models/weights');
            
            this.isModelLoaded = true;
            this.statusElement.innerText = "模型載入完成，啟動攝影機...";
            this.statusElement.style.color = "cyan";

            // 2. 啟動 Webcam
            this.startWebcam();
        } catch (error) {
            console.error("模型載入失敗:", error);
            this.statusElement.innerText = "模型載入失敗 (請檢查路徑)";
            this.statusElement.style.color = "red";
        }
    },

    startWebcam: function() {
        navigator.mediaDevices.getUserMedia({ video: {} })
            .then(stream => {
                this.videoElement.srcObject = stream;
            })
            .catch(err => console.error("Webcam error:", err));

        // 當影片開始播放時，啟動偵測迴圈
        this.videoElement.addEventListener('play', () => {
            this.startDetectionLoop();
        });
    },

    startDetectionLoop: function() {
        // 建立一個 Canvas 覆蓋在 Video 上方用來畫框框 (Optional, Debug用)
        // 實務上可以隱藏
        
        const loop = async () => {
            if (!this.videoElement.paused && !this.videoElement.ended) {
                
                // --- 核心偵測代碼 ---
                const detection = await faceapi.detectSingleFace(
                    this.videoElement, 
                    new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.5 })
                );

                if (detection) {
                    // 取得人臉中心點與邊框
                    const { x, y, width, height } = detection.box;
                    const centerX = x + width / 2;
                    const centerY = y + height / 2;

                    // --- 座標轉換邏輯 ---
                    // 將像素座標 (0 ~ width) 轉換為 (-1.0 ~ 1.0)
                    // 注意：X 軸通常需要鏡像反轉，因為鏡子裡你是往右，螢幕是往左
                    let normX = (centerX / this.displaySize.width) * 2 - 1; 
                    let normY = (centerY / this.displaySize.height) * 2 - 1;

                    // 反轉 X 軸 (Mirror effect)
                    normX = -normX;
                    // 反轉 Y 軸 (Webcam 座標系 Y 向下，WebGL Y 向上)
                    normY = -normY;

                    // --- 平滑化 (Linear Interpolation) ---
                    // 新的值 = 舊的值 + (目標值 - 舊的值) * 係數
                    this.lastX += (normX - this.lastX) * this.lerpFactor;
                    this.lastY += (normY - this.lastY) * this.lerpFactor;

                    // 更新 UI 數據顯示
                    if(document.getElementById('head-x')) {
                        document.getElementById('head-x').innerText = this.lastX.toFixed(2);
                        document.getElementById('head-y').innerText = this.lastY.toFixed(2);
                    }
                    this.statusElement.innerText = "追蹤中 (Face Detected)";
                    this.statusElement.style.color = "#00ff00";

                    // 通知外部 (Three.js)
                    if (this.onUpdateCallback) {
                        this.onUpdateCallback(this.lastX, this.lastY);
                    }
                } else {
                    this.statusElement.innerText = "未偵測到人臉";
                    this.statusElement.style.color = "orange";
                    
                    // 沒抓到人臉時，讓相機慢慢回到中心 (Optional)
                    this.lastX += (0 - this.lastX) * 0.05;
                    this.lastY += (0 - this.lastY) * 0.05;
                    if (this.onUpdateCallback) this.onUpdateCallback(this.lastX, this.lastY);
                }
            }
        };

        // 限制偵測頻率以避免卡死 CPU (例如 30fps)
        setInterval(loop, 1000 / 30);
    },

    onUpdate: function(callback) {
        this.onUpdateCallback = callback;
    }
};