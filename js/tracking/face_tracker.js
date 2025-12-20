// js/tracking/face_tracker.js
import '../libs/face-api.min.js';

export const FaceTracker = {
    videoElement: null,
    statusElement: null,
    canvas: null,
    displaySize: { width: 320, height: 240 },
    onUpdateCallback: null,
    isModelLoaded: false,

    // Smoothing handled in SceneInit now
    // Only raw detection here
    currentStream: null,
    currentStream: null,
    settings: {},
    isRunning: false, // Ensure initialized


    init: async function(videoElementId) {
        this.videoElement = document.getElementById(videoElementId);
        this.statusElement = document.getElementById('tracking-status');
        this.canvas = document.getElementById('tracking-canvas'); // Get Canvas
        
        // Setup Video Dimensions - sets the HTML attribute (display size)
        this.videoElement.width = this.displaySize.width;
        this.videoElement.height = this.displaySize.height;

        this.statusElement.innerText = "正在載入輕量級模型...";
        this.statusElement.style.color = "yellow";
        
        try {
            await faceapi.nets.tinyFaceDetector.loadFromUri('assets/models/weights');
            
            this.isModelLoaded = true;
            this.isModelLoaded = true;
            this.statusElement.innerText = "模型載入完成，啟動攝影機...";
            this.statusElement.style.color = "cyan";

            // this.startWebcam(); // Deferred to Panel settings broadcast
        } catch (error) {
            console.error("Model load failed:", error);
            this.statusElement.innerText = "模型載入失敗";
            this.statusElement.style.color = "red";
        }
    },

    startWebcam: async function(targetInputSize = null) {
        // Stop previous stream
        if (this.currentStream) {
            this.currentStream.getTracks().forEach(track => track.stop());
        }

        const size = targetInputSize || this.settings.inputSize || 224;
        let stream = null;
        let method = "";

        // 1. try get a stream such that both sides >= size
        await navigator.mediaDevices.getUserMedia({ 
            video: { 
                width: { min: size }, 
                height: { min: size }, 
                facingMode: 'user' 
            } 
        }).then(returnStream => {
            stream = returnStream;
            console.log("[Webcam] Attempt 1 success");
        })

        // 2. failed. now try best-effort
        .catch(() => 
            navigator.mediaDevices.getUserMedia({ 
                video: { width: { ideal: size }, height: { ideal: size }, facingMode: 'user' } 
            }).then(returnStream => {
                stream = returnStream;
                console.log("[Webcam] Attempt 2 success");
            })
        )

        // 3. both attempts are invalid
        .catch(e => {
            console.error("Webcam Fatal Error:", e);
            this.statusElement.innerText = "Webcam Fatal Error: " + e.message;
        })

        if (!stream)
            return;

        this.currentStream = stream;
        this.videoElement.srcObject = stream;
        
        // Wait for metadata to get true resolution
        this.videoElement.onloadedmetadata = () => {
            const s = this.videoElement.videoWidth + "x" + this.videoElement.videoHeight;
            console.log(`[Webcam] Success (${s})`);
            this.displaySize = { width: this.videoElement.videoWidth, height: this.videoElement.videoHeight };
            
            // Ensure canvas matches immediately
            if(this.canvas) {
                this.canvas.width = this.displaySize.width;
                this.canvas.height = this.displaySize.height;
            }

            // Double ensure play
            this.videoElement.play().catch(e => console.error("Play error", e));
        };
        
        
        // Start Loop if not already running (idempotent-ish check handled inside or just call)
        // But startDetectionLoop handles loop itself, we just need to ensure it sees new dimensions
        if (!this.isRunning) {
            this.isRunning = true;
            this.startDetectionLoop();
        }
    },

    startDetectionLoop: async function() {
        const ctx = this.canvas ? this.canvas.getContext('2d') : null;

        const loop = async () => {
            if (!this.videoElement.paused && !this.videoElement.ended) {
                
                // 0. Wait for Model
                if (!this.isModelLoaded) {
                     return;
                }
                
                // 0.5 Wait for Video Ready
                if (this.videoElement.readyState < 2 || this.videoElement.videoWidth === 0) {
                    return; // Skip if video not ready
                }

                // 1. Match Canvas to Video (Handling resize dynamically)
                if (this.canvas && this.videoElement.videoWidth > 0) {
                     if (this.canvas.width !== this.videoElement.videoWidth || this.canvas.height !== this.videoElement.videoHeight) {
                         this.canvas.width = this.videoElement.videoWidth;
                         this.canvas.height = this.videoElement.videoHeight;
                     }
                }

                // Dynamic Settings
                const inputSize = this.settings.inputSize || 224;
                const scoreThreshold = 0.3; // stick to 0.3 to make less laggy under either low or high resolution

                let detection = null;
                try {
                    detection = await faceapi.detectSingleFace(
                        this.videoElement, 
                        new faceapi.TinyFaceDetectorOptions({ inputSize, scoreThreshold })
                    );
                } catch (err) {
                    console.warn("Detection error (skipping frame):", err);
                    return;
                }

                // Clear previous draw
                if(ctx) ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

                if (!detection) {
                    this.statusElement.innerText = "未偵測到人臉";
                    this.statusElement.style.color = "orange";
                    return;
                }

                const { x, y, width, height } = detection.box;
                const centerX = x + width / 2;
                const centerY = y + height / 2;
                    
                // Draw Box
                if (ctx) {
                    ctx.strokeStyle = '#00ff00';
                    ctx.lineWidth = 2;
                    ctx.strokeRect(x, y, width, height);
                }

                // ... (Original Logic)
                const vWidth = this.videoElement.videoWidth;
                const vHeight = this.videoElement.videoHeight;
                
                if (vWidth === 0 || vHeight === 0) return;

                // Mirror X axis & Normalize (-1.0 to 1.0)
                let normX = -((centerX / vWidth) * 2 - 1);
                // Invert Y axis & Normalize (-1.0 to 1.0)
                let normY = -((centerY / vHeight) * 2 - 1);

                // Width Ratio (Face Width / Screen Width)
                const faceWidthRatio = width / vWidth;

                this.statusElement.innerText = "追蹤中 (Raw Model)";
                this.statusElement.style.color = "#00ff00";

                if (this.onUpdateCallback) {
                    this.onUpdateCallback({
                        x: normX,
                        y: normY,
                        faceWidthRatio: faceWidthRatio,
                        face: detection.box // Pass raw detection box for advanced logic
                    });
                }
            }
        };

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
    },

    updateSettings: function(settings) {
        if (settings.stabilization !== undefined && settings.lerpFactor !== undefined) {
            // If stabilization is off, set lerp to 1.0 (instant), else use factor
            this.lerpFactor = settings.stabilization ? settings.lerpFactor : 1.0;
        }
        
        if (settings.inputSize && settings.inputSize !== this.lastInputSizeUsed) {
            this.settings = { ...this.settings, ...settings };
            
            // Debounce or immediate? Immediate for "Change" event (MouseUp) is fine.
            // Panel ensures this only comes on MouseUp if configured correctly.
            // But if it comes on Input, we have a problem. 
            // We'll assume Panel handles the event type.
            
            // Optimization: If difference is small/same, don't restart.
            if (this.lastInputSizeUsed && Math.abs(settings.inputSize - this.lastInputSizeUsed) < 32) return;
            
            this.lastInputSizeUsed = settings.inputSize;
            
            console.log(`[Settings] InputSize changed to ${settings.inputSize}, restarting stream...`);
            this.startWebcam(settings.inputSize);
        } else {
             this.settings = { ...this.settings, ...settings };
        }
    }
};