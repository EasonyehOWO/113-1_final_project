<?php
// viewer.php
session_start();

// 1. 檢查是否登入 (銜接組員 B 的功能)
if (!isset($_SESSION['user_id'])) {
    // header("Location: index.php"); // 如果未登入就踢回首頁，開發時可先註解掉方便測試
    // exit();
}

// 2. 模擬從資料庫抓到的模型路徑 (之後由組員 B 換成真實資料庫查詢)
$modelPath = isset($_GET['model']) ? $_GET['model'] : 'assets/models/default_cube.gltf';
?>

<!DOCTYPE html>
<html lang="zh-TW">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>3D Viewer - Final Project</title>
    <!-- 引入簡單的樣式，確保 Canvas 滿版 -->
    <style>
        body { margin: 0; overflow: hidden; background-color: #1a1a1a; font-family: sans-serif; }
        #canvas-container { width: 100vw; height: 100vh; display: block; }
        
        /* UI 覆蓋層 (Overlay) */
        #ui-layer {
            position: absolute; top: 0; left: 0; padding: 20px;
            color: white; pointer-events: none; /* 讓滑鼠可以穿透 UI 操作 3D */
            z-index: 10;
        }
        
        /* 視訊預覽視窗 (Debug用，正式版可隱藏) */
        #video-preview {
            position: absolute; bottom: 20px; right: 20px;
            width: 160px; height: 120px;
            border: 2px solid #00ff00;
            border-radius: 8px;
            transform: scaleX(-1); /* 鏡像翻轉 */
            z-index: 10;
        }
        
        .btn {
            pointer-events: auto; /* 讓按鈕可以被點擊 */
            background: #007bff; border: none; padding: 8px 16px;
            color: white; border-radius: 4px; cursor: pointer;
        }
    </style>
</head>
<body>

    <!-- UI 層 -->
    <div id="ui-layer">
        <h2>模型展示模式</h2>
        <p>目前使用者: <?php echo isset($_SESSION['username']) ? $_SESSION['username'] : 'Guest'; ?></p>
        <p>追蹤狀態: <span id="tracking-status" style="color: yellow;">初始化中...</span></p>
        <p>頭部位置: X: <span id="head-x">0.00</span>, Y: <span id="head-y">0.00</span></p>
        <button class="btn" onclick="window.history.back()">返回藝廊</button>
    </div>

    <!-- 攝影機預覽 (給 Face Tracker 用) -->
    <video id="video-preview" autoplay muted playsinline></video>

    <!-- 3D 渲染區域 -->
    <div id="canvas-container"></div>

    <!-- 引入函式庫 -->
    <!-- 1. Three.js -->
    <script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
    <!-- 2. GLTFLoader -->
    <script src="https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/loaders/GLTFLoader.js"></script>
    <!-- 3. Face Tracking Library (例如 clmtrackr 或其他) -->
     <!-- 引入 Face-api -->
    <script src="js/libs/face-api.min.js"></script>
    <!-- 接著才是我們原本的 -->
    <script src="js/tracking/face_tracker.js"></script>
    
    <!-- 引入我們自定義的模組 -->
    <script src="js/tracking/face_tracker.js"></script>
    <script src="js/graphics/scene_init.js"></script>
    <script src="js/main.js"></script>

    <script>
        // 將 PHP 變數傳給 JS
        const TARGET_MODEL_PATH = "<?php echo $modelPath; ?>";
    </script>
</body>
</html>