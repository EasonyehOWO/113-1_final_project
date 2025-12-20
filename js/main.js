// js/main.js
import { GraphicsApp } from './graphics/scene_init.js';
import { FaceTracker } from './tracking/face_tracker.js';
import { Panel } from './ui/panel.js';

document.addEventListener('DOMContentLoaded', () => {
    // 1. Initialize graphics module
    GraphicsApp.init('canvas-container');

    // 2. Initialize tracking module
    FaceTracker.init('video-preview');

    // 3. Initialize UI Panel
    const panel = new Panel({
        onUpdate: (settings) => {
            // With Shared Proxy, direct updates might seem redundant but harmless.
            // GraphicsApp might have internal logic on updateSettings beyond just assigning.
            GraphicsApp.updateSettings(settings); // Keep for "notify" logic
            FaceTracker.updateSettings(settings);
        }
    });
    
    // CRITICAL: Share the Reactive Settings Object
    // This allows GraphicsApp to modify settings (e.g. auto light switch) and have Panel UI update automatically.
    
    // 1. Preserve any defaults from GraphicsApp that might be missing in Panel
    Object.assign(panel.settings, GraphicsApp.settings);
    
    // 2. Replace GraphicsApp settings with the Reactive Proxy
    GraphicsApp.settings = panel.settings; 
    
    // 3. Force update to ensure internal state matches (e.g. pixel ratio)
    GraphicsApp.updateSettings(panel.settings);

    // 4. Core connection: When FaceTracker data updates, notify GraphicsApp to update camera
    FaceTracker.onUpdate((data) => {
        GraphicsApp.updateHeadData(data);
    });

    // Debug: Expose to window
    window.GraphicsApp = GraphicsApp;
    window.FaceTracker = FaceTracker;
    window.Panel = panel;

    console.log("System Integrated: Tracking -> Graphics + UI Panel");
});
