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
    settings: {},


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
            this.statusElement.innerText = "模型載入完成，啟動攝影機...";
            this.statusElement.style.color = "cyan";

            this.startWebcam();
        } catch (error) {
            console.error("Model load failed:", error);
            this.statusElement.innerText = "模型載入失敗";
            this.statusElement.style.color = "red";
        }
    },

    startWebcam: function(constraintsOverride = null) {
        // Stop previous stream
        if (this.currentStream) {
            this.currentStream.getTracks().forEach(track => track.stop());
        }

        const constraints = constraintsOverride || { video: {} };

        navigator.mediaDevices.getUserMedia(constraints)
            .then(stream => {
                this.currentStream = stream;
                this.videoElement.srcObject = stream;
                
                // Update display status
                const track = stream.getVideoTracks()[0];
                const settings = track.getSettings();
                console.log(`Webcam started: ${settings.width}x${settings.height}`);
            })
            .catch(err => {
                console.error("Webcam error:", err);
                this.statusElement.innerText = "Webcam Error: " + err.message;
            });

        // Event listener might duplicate if called multiple times, ensure one-time setup or check
        this.videoElement.onplay = () => {
             this.startDetectionLoop();
        };
    },

    startDetectionLoop: async function() {
        const ctx = this.canvas ? this.canvas.getContext('2d') : null;

        const loop = async () => {
            if (!this.videoElement.paused && !this.videoElement.ended) {
                
                // 1. Match Canvas to Video (Handling resize dynamically)
                if (this.canvas && this.videoElement.videoWidth > 0) {
                     if (this.canvas.width !== this.videoElement.videoWidth || this.canvas.height !== this.videoElement.videoHeight) {
                         this.canvas.width = this.videoElement.videoWidth;
                         this.canvas.height = this.videoElement.videoHeight;
                     }
                }

                // Dynamic Settings
                const inputSize = this.settings.inputSize || 224;
                const scoreThreshold = (inputSize > 320) ? 0.3 : 0.5;

                const detection = await faceapi.detectSingleFace(
                    this.videoElement, 
                    new faceapi.TinyFaceDetectorOptions({ inputSize: inputSize, scoreThreshold: scoreThreshold })
                );

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
                        faceWidthRatio: faceWidthRatio
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
        
        if (settings.webcamRes) {
            // Check if resolution changed physically or logically
            const targetW = (settings.webcamRes === 'hd') ? 1280 : 
                           (settings.webcamRes === 'fhd') ? 1920 :
                           (settings.webcamRes === 'high') ? 640 : 320;
            const targetH = (settings.webcamRes === 'hd') ? 720 : 
                           (settings.webcamRes === 'fhd') ? 1080 :
                           (settings.webcamRes === 'high') ? 480 : 240;

            const oldRes = this.settings.webcamRes;
            
            // Update internal settings reference
            this.settings = { ...this.settings, ...settings };

            if (settings.webcamRes !== oldRes) {
                 // Trigger Restart with new constraints
                 console.log("Resolution changed to " + settings.webcamRes + ", restarting stream...");
                 this.startWebcam({
                     video: {
                         width: { ideal: targetW },
                         height: { ideal: targetH },
                         facingMode: 'user'
                     }
                 });
            } else {
                 // Even if stream didn't change, update display size just in case
                 this.displaySize = { width: targetW, height: targetH };
                 if(this.videoElement) {
                      this.videoElement.width = targetW;
                      this.videoElement.height = targetH;
                 }
            }
        } else {
            // Update other settings
            this.settings = { ...this.settings, ...settings };
        }
    }
};