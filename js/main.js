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
            GraphicsApp.updateSettings(settings);
            FaceTracker.updateSettings(settings);
        }
    });

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
