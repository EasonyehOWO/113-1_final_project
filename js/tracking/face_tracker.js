// js/tracking/face_tracker.js

const FaceTracker = {
    videoElement: null,
    statusElement: null,
    onUpdateCallback: null, // 用來通知外部 (Graphics) 的 callback

    init: function(videoElementId) {
        this.videoElement = document.getElementById(videoElementId);
        this.statusElement = document.getElementById('tracking-status');
        
        this.startWebcam();
        
        // --- 暫時方案：在人臉辨識模型載入前，先用滑鼠模擬 ---
        // 這樣組員 A 不需要等你完成 Face API 就能測試視差效果
        window.addEventListener('mousemove', (e) => {
            // 將滑鼠座標正規化到 -1.0 ~ 1.0
            const x = (e.clientX / window.innerWidth) * 2 - 1;
            const y = -(e.clientY / window.innerHeight) * 2 + 1; // Y 軸反轉
            
            // 更新 UI 顯示
            document.getElementById('head-x').innerText = x.toFixed(2);
            document.getElementById('head-y').innerText = y.toFixed(2);

            // 通知外部
            if (this.onUpdateCallback) {
                this.onUpdateCallback(x, y);
            }
        });
    },

    // 啟動 Webcam
    startWebcam: async function() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            this.videoElement.srcObject = stream;
            this.statusElement.innerText = "攝影機啟動 (使用滑鼠模擬頭部)";
            this.statusElement.style.color = "#00ff00";
        } catch (err) {
            console.error("Webcam error:", err);
            this.statusElement.innerText = "無法取得攝影機";
            this.statusElement.style.color = "red";
        }
    },

    // 註冊 callback，當追蹤數據更新時呼叫
    onUpdate: function(callback) {
        this.onUpdateCallback = callback;
    }
};