<?php
// viewer.php
session_start();

// 1. 檢查是否登入
if (!isset($_SESSION['user_id'])) {
    // header("Location: index.php"); 
    // exit();
}

require_once 'config/db_connect.php';

$modelPath = 'assets/models/default_cube.gltf'; // Default
$modelTitle = 'Unknown Model';

// 2. 獲取模型路徑
if (isset($_GET['id'])) {
    $model_id = intval($_GET['id']);
    if ($model_id > 0) {
        $stmt = $conn->prepare("SELECT title, filepath FROM models WHERE id = ?");
        $stmt->bind_param("i", $model_id);
        $stmt->execute();
        $res = $stmt->get_result();
        if ($row = $res->fetch_assoc()) {
            $modelPath = $row['filepath']; // e.g. "uploads/model_xyz.glb"
            $modelTitle = htmlspecialchars($row['title']);
        }
        $stmt->close();
    }
}
?>

<!DOCTYPE html>
<html lang="zh-TW">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>3D Viewer - Final Project</title>
    <!-- 引入簡單的樣式，確保 Canvas 滿版 -->
    <style>
        @import "./assets/css/viewer.css";
    </style>
</head>
<body>

    <!-- UI 層 -->
    <details id="ui-layer">
        <summary>模型展示模式</summary>
        <p>目前使用者: <?php echo isset($_SESSION['username']) ? $_SESSION['username'] : 'Guest'; ?></p>
        <p>追蹤狀態: <span id="tracking-status" style="color: yellow;">初始化中...</span></p>
        <p>頭部位置: X: <span id="head-x">0.00</span>, Y: <span id="head-y">0.00</span></p>
        <button class="raised" onclick="location.href = 'gallery.php'">返回藝廊</button>
    </details>

    <!-- 攝影機預覽 (給 Face Tracker 用) -->
    <video id="video-preview" autoplay muted playsinline></video>

    <!-- 3D 渲染區域 -->
    <div id="canvas-container"></div>

    <!-- 引入函式庫 (Import Map) -->
    <script type="importmap">
    {
        "imports": {
            "three": "./js/libs/three/three.module.js",
            "three/addons/": "./js/libs/three/addons/",
            "@mediapipe/tasks-vision": "./js/libs/mediapipe/vision_bundle.mjs"
        }
    }
    </script>

    <!-- 主程式入口 -->
    <script type="module" src="js/main.js"></script>

    <script>
        // 將 PHP 變數傳給 JS
        const TARGET_MODEL_PATH = "<?php echo $modelPath; ?>";
    </script>
</body>
</html>