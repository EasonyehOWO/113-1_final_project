<!-- 遷移自 GEMINI Prototype -->
<!DOCTYPE html>
<html lang="zh-Hant">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>裸眼 3D 網格空間 (Refactored Viewer)</title>
    <link rel="stylesheet" href="assets/css/viewer.css">
    <!-- Three.js Import Map -->
    <script type="importmap">
    {
        "imports": {
            "three": "./js/libs/three/three.module.js",
            "@mediapipe/tasks-vision": "./js/libs/mediapipe/vision_bundle.mjs"
        }
    }
    </script>
</head>
<body>
    <div id="info">
        <p id="status-text">初始化中...</p>
        <label for="convergenceSlider">視線收斂 (Convergence)</label>
        <input type="range" id="convergenceSlider" min="0.0" max="1.0" step="0.05" value="0.0">
        <!-- v5.4 新增準心 UI --><label class="checkbox-label">
            <input type="checkbox" id="crosshairToggle">
            <span>顯示準心</span>
        </label>
    </div>
    
    <canvas id="render-canvas"></canvas>
    <video id="webcam-feed" autoplay playsinline></video>

    <!-- 主程式邏輯 -->
    <script type="module" src="js/viewer.js"></script>
</body>
</html>
