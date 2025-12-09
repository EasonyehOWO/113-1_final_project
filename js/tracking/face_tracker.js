import {
    FaceLandmarker,
    FilesetResolver
} from "@mediapipe/tasks-vision";

export class FaceTracker {
    constructor() {
        this.faceLandmarker = null;
        this.lastVideoTime = -1;
        this.results = null;
    }

    async init(videoElement) {
        const filesetResolver = await FilesetResolver.forVisionTasks(
            "./js/libs/mediapipe/wasm" 
        );
        this.faceLandmarker = await FaceLandmarker.createFromOptions(filesetResolver, {
            baseOptions: {
                modelAssetPath: "./js/assets/models/face_landmarker.task",
                delegate: "GPU"
            },
            runningMode: "VIDEO",
            outputFaceLandmarks: true 
        });
        
        // 啟動 Webcam
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
             const stream = await navigator.mediaDevices.getUserMedia({
                video: { width: 640, height: 480 },
                audio: false
            });
            videoElement.srcObject = stream;
            // 回傳 Promise，當 loadeddata 觸發時才 resolve
            return new Promise((resolve) => {
                videoElement.addEventListener("loadeddata", () => {
                   resolve(); 
                });
            });
        } else {
            throw new Error("Browser does not support getUserMedia");
        }
    }

    /**
     * 偵測當前 Video Frame
     * @param {HTMLVideoElement} videoElement 
     * @returns {Object|null} Detection results or null
     */
    detect(videoElement) {
        if (!this.faceLandmarker) return null;

        const videoTime = videoElement.currentTime;
        if (videoTime !== this.lastVideoTime && videoElement.readyState >= 2) { 
            this.lastVideoTime = videoTime;
            this.results = this.faceLandmarker.detectForVideo(videoElement, performance.now());
        }
        return this.results;
    }
}
