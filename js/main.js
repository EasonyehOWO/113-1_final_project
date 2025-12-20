// js/main.js
import { GraphicsApp } from './graphics/scene_init.js';
import { FaceTracker } from './tracking/face_tracker.js';
import { Panel } from './ui/panel.js';

document.addEventListener('DOMContentLoaded', () => {
    // 1. 初始化圖形模組 (Initialize Graphics)
    // 負責 Three.js 場景、相關物件與渲染
    GraphicsApp.init('canvas-container');

    // 2. 初始化追蹤模組 (Initialize Tracking)
    // 負責 Webcam 串流、Face-API 偵測與座標計算
    FaceTracker.init('video-preview');

    // 3. 初始化控制面板 (Initialize UI Panel)
    // 負責所有參數調整，並透過 Reactive Proxy 管理設定值
    const panel = new Panel({
        onUpdate: (settings) => {
            // 當面板數值變更時，通知各模組更新
            // 注意：雖然下方有共享 Proxy，但某些模組需要主動觸發計算 (如 updateProjection)
            GraphicsApp.updateSettings(settings); 
            FaceTracker.updateSettings(settings);
        }
    });
    
    // --- 關鍵架構：響應式設定共享 (Reactive Settings Sharing) ---
    // 讓 GraphicsApp 直接使用 Panel 的 Proxy 物件，實現雙向綁定。
    // 優點：當程式碼 (如鍵盤事件) 修改 GraphicsApp.settings 時，Panel UI 會自動更新。
    
    // A. 合併預設值 (Merge Defaults)
    // 確保 GraphicsApp 獨有的設定不會遺失
    Object.assign(panel.settings, GraphicsApp.settings);
    
    // B. 替換參考 (Replace Reference)
    // 將 GraphicsApp 的設定物件替換為 Panel 的 Proxy
    GraphicsApp.settings = panel.settings; 
    
    // C. 強制同步 (Force Sync)
    // 確保所有模組的內部狀態與這份合併後的設定一致
    GraphicsApp.updateSettings(panel.settings);

    // 4. 連接核心邏輯 (Core Connection)
    // 當 FaceTracker 偵測到新數據時，傳送給 GraphicsApp 更新相機投影
    FaceTracker.onUpdate((data) => {
        GraphicsApp.updateHeadData(data);
    });

    // 5. 除錯接口 (Expose for Debugging)
    window.GraphicsApp = GraphicsApp;
    window.FaceTracker = FaceTracker;
    window.Panel = panel;

    console.log("System Integrated: Tracking -> Graphics + UI Panel");
});
