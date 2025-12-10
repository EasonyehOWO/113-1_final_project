<?php
session_start();
require_once 'config/db_connect.php';

// Check if user is logged in
if (!isset($_SESSION['user_id'])) {
    header('Location: login.php');
    exit();
}

$user_id = $_SESSION['user_id'];
$username = $_SESSION['username'] ?? 'User';

// Get user's models
$query = "SELECT id, title, description, filepath, uploaded_at 
          FROM models 
          WHERE user_id = ? 
          ORDER BY uploaded_at DESC";
$stmt = $conn->prepare($query);
$stmt->bind_param("i", $user_id);
$stmt->execute();
$result = $stmt->get_result();
$models = $result->fetch_all(MYSQLI_ASSOC);
$stmt->close();
$conn->close();
?>

<!DOCTYPE html>
<html lang="zh-TW">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>管理模型 - 3D 藝廊</title>
    <link rel="stylesheet" href="assets/css/gallery_manage.css">
</head>
<body>
    <header>
        <div class="header-left">
            <div class="logo">3D 藝廊</div>
            <nav class="nav-links">
                <a href="gallery.php" class="immersive">公開藝廊</a>
                <a href="gallery.php?filter=my" class="immersive">我的模型</a>
                <a href="viewer.php" class="immersive">裸眼 3D</a>
                <a href="manage.php" class="immersive active">管理模型</a>
            </nav>
        </div>
        <div class="header-right">
            <span class="username"><?= htmlspecialchars($username) ?></span>
            <a href="logout.php" class="logout-btn raised">登出</a>
        </div>
    </header>

    <main class="container">
        <section class="page-header">
            <h1>管理我的模型</h1>
            <p>上傳新的 3D 模型或管理現有的模型</p>
        </section>

        <div id="message-container"></div>

        <section class="upload-section">
            <h2>上傳新模型</h2>
            <form id="uploadForm" class="upload-form" enctype="multipart/form-data">
                <div class="form-group">
                    <label for="title">標題 *</label>
                    <input type="text" id="title" name="title" required placeholder="輸入模型標題" class="raised">
                </div>

                <div class="form-group">
                    <label for="description">說明</label>
                    <textarea id="description" name="description" placeholder="輸入模型說明 (選填)" class="raised"></textarea>
                </div>

                <div class="form-group">
                    <label>模型檔案 *</label>
                    <div class="file-input-wrapper">
                        <input type="file" id="modelFile" name="model_file" accept=".glb" required>
                        <label for="modelFile" class="file-input-label" id="fileLabel">
                            點擊選擇 3D 模型檔案 (.glb)
                        </label>
                    </div>
                </div>

                <div class="form-group">
                    <label>縮圖 (選填)</label>
                    <div class="file-input-wrapper">
                        <input type="file" id="thumbFile" name="thumbnail_file" accept=".jpg,.jpeg,.png,.webp">
                        <label for="thumbFile" class="file-input-label" id="thumbLabel">
                            點擊選擇縮圖
                        </label>
                    </div>
                    <!-- Auto-generated thumbnail preview -->
                    <div id="thumbnail-preview-container" style="display: none; margin-top: 10px;">
                        <p style="font-size: 0.9rem; color: #666; margin-bottom: 5px;">自動產生的預覽圖:</p>
                        <img id="thumbnail-preview" src="" alt="縮圖預覽" style="max-width: 200px; border-radius: 8px; border: 1px solid #ddd;">
                    </div>
                </div>

                <button type="submit" class="submit-btn raised" id="uploadBtn">上傳模型</button>
            </form>
            <div class="loading" id="uploadLoading">上傳中...</div>
        </section>

        <section class="models-section">
            <h2>我的模型 (<?= count($models) ?>)</h2>
            
            <?php if (empty($models)): ?>
                <div class="empty-state">
                    <h3>目前沒有模型</h3>
                    <p>請使用上方的表單上傳您的第一個模型</p>
                </div>
            <?php else: ?>
                <div class="models-list" id="modelsList">
                    <?php foreach ($models as $model): ?>
                        <div class="model-item" data-model-id="<?= $model['id'] ?>">
                            <div class="model-item-header">
                                <div class="model-item-info">
                                    <h3 class="model-title"><?= htmlspecialchars($model['title']) ?></h3>
                                    <p class="model-description"><?= htmlspecialchars($model['description'] ?: '沒有說明') ?></p>
                                    <div class="model-item-meta">
                                        上傳時間: <?= date('Y/m/d H:i', strtotime($model['uploaded_at'])) ?>
                                    </div>
                                </div>
                                <div class="model-item-actions">
                                    <button class="btn-edit raised" onclick="editModel(<?= $model['id'] ?>)">編輯</button>
                                    <button class="btn-delete raised" onclick="deleteModel(<?= $model['id'] ?>, '<?= htmlspecialchars($model['title'], ENT_QUOTES) ?>')">刪除</button>
                                </div>
                            </div>
                            
                            <form class="edit-form" id="edit-form-<?= $model['id'] ?>">
                                <div class="form-group">
                                    <label>標題 *</label>
                                    <input type="text" name="title" value="<?= htmlspecialchars($model['title']) ?>" required class="raised">
                                </div>
                                <div class="form-group">
                                    <label>說明</label>
                                    <textarea name="description" class="raised"><?= htmlspecialchars($model['description']) ?></textarea>
                                </div>
                                <div class="model-item-actions">
                                    <button type="button" class="btn-save raised" onclick="saveModel(<?= $model['id'] ?>)">儲存變更</button>
                                    <button type="button" class="btn-cancel raised" onclick="cancelEdit(<?= $model['id'] ?>)">取消</button>
                                </div>
                            </form>
                        </div>
                    <?php endforeach; ?>
                </div>
            <?php endif; ?>
        </section>
    </main>

    <!-- 引入函式庫 (Import Map) -->
    <script type="importmap">
    {
        "imports": {
            "three": "./js/libs/three/three.module.js",
            "three/addons/": "./js/libs/three/addons/"
        }
    }
    </script>
    <script type="module" src="js/manage.js"></script>
</body>
</html>