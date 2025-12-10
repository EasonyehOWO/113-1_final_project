// js/tracking/face_tracker.js
import '../libs/face-api.min.js';

export const FaceTracker = {
    videoElement: null,
    statusElement: null,
    canvas: null,
    displaySize: { width: 320, height: 240 },
    onUpdateCallback: null,
    isModelLoaded: false,

    // Smoothing Variables
    lastX: 0,
    lastY: 0,
    lastZ: 5, // Default Z
    lerpFactor: 0.5, // Increased from 0.1 to 0.5 for better responsiveness (User Request)

    // Z-Estimation Calibrations
    BASE_Z: 5,
    NEUTRAL_FACE_WIDTH: 0.35, // When face width is 35% of screen, Z is BASE_Z
    Z_SENSITIVITY: 10.0,

    init: async function(videoElementId) {
        this.videoElement = document.getElementById(videoElementId);
        this.statusElement = document.getElementById('tracking-status');
        
        // Setup Video Dimensions - sets the HTML attribute (display size)
        this.videoElement.width = this.displaySize.width;
        this.videoElement.height = this.displaySize.height;

        this.statusElement.innerText = "正在載入輕量級模型...";
        this.statusElement.style.color = "yellow";
        
        try {
            await faceapi.nets.tinyFaceDetector.loadFromUri('assets/models/weights');
            
            this.isModelLoaded = true;
            this.statusElement.innerText = "模型載入完成，啟動攝影機...";
            this.statusElement.style.color = "cyan";

            this.startWebcam();
        } catch (error) {
            console.error("Model load failed:", error);
            this.statusElement.innerText = "模型載入失敗";
            this.statusElement.style.color = "red";
        }
    },

    startWebcam: function() {
        // Request simple video, browser/device decides resolution (usually 640x480)
        navigator.mediaDevices.getUserMedia({ video: {} })
            .then(stream => {
                this.videoElement.srcObject = stream;
            })
            .catch(err => console.error("Webcam error:", err));

        this.videoElement.addEventListener('play', () => {
            this.startDetectionLoop();
        });
    },

    startDetectionLoop: async function() {
        const loop = async () => {
            if (!this.videoElement.paused && !this.videoElement.ended) {
                
                const detection = await faceapi.detectSingleFace(
                    this.videoElement, 
                    new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.5 })
                );

                if (detection) {
                    const { x, y, width, height } = detection.box;
                    const centerX = x + width / 2;
                    const centerY = y + height / 2;

                    // Dynamic Resolution Handling
                    // Use actual video intervals to normalize to -1.0 ~ 1.0 regardless of resolution
                    const vWidth = this.videoElement.videoWidth;
                    const vHeight = this.videoElement.videoHeight;

                    // Mirror X axis
                    let normX = -((centerX / vWidth) * 2 - 1);
                    // Invert Y axis
                    let normY = -((centerY / vHeight) * 2 - 1);

                    // Estimate Z
                    const widthRatio = width / vWidth;
                    const zOffset = (this.NEUTRAL_FACE_WIDTH - widthRatio) * this.Z_SENSITIVITY;
                    let targetZ = this.BASE_Z + zOffset;

                    // Helper: Clamp
                    targetZ = Math.max(1.0, Math.min(targetZ, 10.0));

                    // Smoothing
                    this.lastX += (normX - this.lastX) * this.lerpFactor;
                    this.lastY += (normY - this.lastY) * this.lerpFactor;
                    this.lastZ += (targetZ - this.lastZ) * this.lerpFactor;

                    if(document.getElementById('head-x')) {
                        document.getElementById('head-x').innerText = this.lastX.toFixed(2);
                        document.getElementById('head-y').innerText = this.lastY.toFixed(2);
                    }
                    this.statusElement.innerText = "追蹤中 (Legacy Model)";
                    this.statusElement.style.color = "#00ff00";

                    if (this.onUpdateCallback) {
                        this.onUpdateCallback({
                            x: this.lastX,
                            y: this.lastY,
                            z: this.lastZ,
                            roll: 0
                        });
                    }
                } else {
                    this.statusElement.innerText = "未偵測到人臉";
                    this.statusElement.style.color = "orange";
                }
            }
        };

        // Loop using requestAnimationFrame + timestamp check for stable FPS
        // (Your manual modification is good, keeping it conceptually but verifying implementation)
        // Since you modified it manually previously to use while(true), 
        // I will preserve that structure if I replace the whole block, 
        // OR I can just replace the init/start logic and keep your loop logic if I targeted more specifically.
        // But to be safe and clean, I'll use the interval logical you just added or a standard one.
        // Actually, the user edited the file to use a while(true) loop. I should respect that structure.
        
        let timestamp = 0;
        while(true) {
            timestamp = Date.now();
            await loop(); // Run detection

            let nextTime = timestamp + 1000 / 30; // 30 FPS target
            if(Date.now() < nextTime) {
                await new Promise(resolve => setTimeout(resolve, nextTime - Date.now()));
            }
        }
    },

    onUpdate: function(callback) {
        this.onUpdateCallback = callback;
    }
};