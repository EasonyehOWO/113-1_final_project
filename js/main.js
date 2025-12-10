// js/main.js
import { GraphicsApp } from './graphics/scene_init.js';
import { FaceTracker } from './tracking/face_tracker.js';

document.addEventListener('DOMContentLoaded', () => {
    
    // 1. 初始化圖學模組 (在 id="canvas-container" 中)
    GraphicsApp.init('canvas-container');

    // 2. 初始化追蹤模組 (使用 id="video-preview" 顯示影像)
    FaceTracker.init('video-preview');

    // 3. 核心連結：當 FaceTracker 數據更新時，通知 GraphicsApp 更新相機
    FaceTracker.onUpdate((data) => {
        GraphicsApp.updateHeadData(data);
    });

    // Debug: Expose to window
    window.GraphicsApp = GraphicsApp;
    window.FaceTracker = FaceTracker;

    console.log("System Integrated: Tracking -> Graphics");
});

