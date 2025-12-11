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

// Determine filter mode and search query
$filter = $_GET['filter'] ?? 'all';
$search = trim($_GET['search'] ?? '');
$page = max(1, intval($_GET['page'] ?? 1));
$per_page = 8;
$offset = ($page - 1) * $per_page;

// Build query based on filter and search
if ($filter === 'my') {
    if (!empty($search)) {
        $count_query = "SELECT COUNT(*) as total FROM models WHERE user_id = ? AND title LIKE ?";
        $stmt_count = $conn->prepare($count_query);
        $search_param = "%{$search}%";
        $stmt_count->bind_param("is", $user_id, $search_param);
        
        $query = "SELECT m.id, m.title, m.description, m.filepath, m.thumbnail_path, m.uploaded_at, u.username 
                  FROM models m 
                  JOIN users u ON m.user_id = u.id 
                  WHERE m.user_id = ? AND m.title LIKE ?
                  ORDER BY m.uploaded_at DESC 
                  LIMIT ? OFFSET ?";
        $stmt = $conn->prepare($query);
        $stmt->bind_param("isii", $user_id, $search_param, $per_page, $offset);
    } else {
        $count_query = "SELECT COUNT(*) as total FROM models WHERE user_id = ?";
        $stmt_count = $conn->prepare($count_query);
        $stmt_count->bind_param("i", $user_id);
        
        $query = "SELECT m.id, m.title, m.description, m.filepath, m.thumbnail_path, m.uploaded_at, u.username 
                  FROM models m 
                  JOIN users u ON m.user_id = u.id 
                  WHERE m.user_id = ? 
                  ORDER BY m.uploaded_at DESC 
                  LIMIT ? OFFSET ?";
        $stmt = $conn->prepare($query);
        $stmt->bind_param("iii", $user_id, $per_page, $offset);
    }
} else {
    if (!empty($search)) {
        $count_query = "SELECT COUNT(*) as total FROM models WHERE title LIKE ?";
        $stmt_count = $conn->prepare($count_query);
        $search_param = "%{$search}%";
        $stmt_count->bind_param("s", $search_param);
        
        $query = "SELECT m.id, m.title, m.description, m.filepath, m.thumbnail_path, m.uploaded_at, u.username 
                  FROM models m 
                  JOIN users u ON m.user_id = u.id 
                  WHERE m.title LIKE ?
                  ORDER BY m.uploaded_at DESC 
                  LIMIT ? OFFSET ?";
        $stmt = $conn->prepare($query);
        $stmt->bind_param("sii", $search_param, $per_page, $offset);
    } else {
        $count_query = "SELECT COUNT(*) as total FROM models";
        $stmt_count = $conn->query($count_query);
        
        $query = "SELECT m.id, m.title, m.description, m.filepath, m.thumbnail_path, m.uploaded_at, u.username 
                  FROM models m 
                  JOIN users u ON m.user_id = u.id 
                  ORDER BY m.uploaded_at DESC 
                  LIMIT ? OFFSET ?";
        $stmt = $conn->prepare($query);
        $stmt->bind_param("ii", $per_page, $offset);
    }
}

// Get total count
if ($filter === 'my' || !empty($search)) {
    $stmt_count->execute();
    $count_result = $stmt_count->get_result();
    $total_models = $count_result->fetch_assoc()['total'];
    $stmt_count->close();
} else {
    $count_result = $stmt_count->fetch_assoc();
    $total_models = $count_result['total'];
}

$total_pages = ceil($total_models / $per_page);

// Get models
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
    <title>藝廊 - 3D 模型展示</title>
    <link rel="stylesheet" href="assets/css/gallery_manage.css">
</head>
<body>
    <header>
        <div class="header-left">
            <div class="logo">3D 藝廊</div>
            <nav class="nav-links">
                <a href="gallery.php" class="immersive <?= $filter === 'all' ? ' active' : '' ?>">公開藝廊</a>
                <a href="gallery.php?filter=my" class="immersive <?= $filter === 'my' ? ' active' : '' ?>">我的模型</a>
                <a href="viewer.php" class="immersive">相機測試</a>
                <a href="manage.php" class="immersive">管理模型</a>
            </nav>
        </div>
        <div class="header-right">
            <span class="username"><?= htmlspecialchars($username) ?></span>
            <a href="logout.php" class="logout-btn raised">登出</a>
        </div>
    </header>
    
    <main class="container">
        <section class="filter-bar">
            <div class="filter-tabs">
                <a href="gallery.php" class="raised filter-tab <?= $filter === 'all' ? 'active' : '' ?>">
                    所有模型
                </a>
                <a href="gallery.php?filter=my" class="raised filter-tab <?= $filter === 'my' ? 'active' : '' ?>">
                    我的模型
                </a>
            </div>
            
            <!-- Search Bar -->
            <form method="GET" action="gallery.php" class="search-bar">
                <input type="hidden" name="filter" value="<?= htmlspecialchars($filter) ?>">
                <input 
                    type="text" 
                    name="search" 
                    class="search-input" 
                    placeholder="搜尋模型名稱..." 
                    value="<?= htmlspecialchars($search) ?>"
                >
                <button type="submit" class="search-btn">搜尋</button>
                <?php if (!empty($search)): ?>
                    <a href="gallery.php?filter=<?= $filter ?>" class="clear-btn">清除</a>
                <?php endif; ?>
            </form>
            
            <div class="model-count">
                共 <?= $total_models ?> 個模型
            </div>
        </section>
        
        <?php if (!empty($search)): ?>
            <div class="search-result-info">
                搜尋 "<strong><?= htmlspecialchars($search) ?></strong>" 找到 <strong><?= $total_models ?></strong> 個結果
            </div>
        <?php endif; ?>
        
        <?php if (empty($models)): ?>
            <section class="empty-state">
                <h2>沒有找到任何模型</h2>
                <?php if (!empty($search)): ?>
                    <p>找不到符合 "<?= htmlspecialchars($search) ?>" 的模型。</p>
                    <a href="gallery.php?filter=<?= $filter ?>" class="upload-btn">查看所有模型</a>
                <?php else: ?>
                    <p><?= $filter === 'my' ? "您還沒有上傳任何模型。" : "目前還沒有任何人上傳模型。" ?></p>
                    <?php if ($filter === 'my'): ?>
                        <a href="manage.php" class="upload-btn">上傳您的第一個模型</a>
                    <?php endif; ?>
                <?php endif; ?>
            </section>
        <?php else: ?>
            <section class="gallery-grid">
                <?php foreach ($models as $model): ?>
                    <article class="model-card" onclick="window.location.href='viewer.php?id=<?= $model['id'] ?>'">
                        <?php
                            $bgStyle = '';
                            if (!empty($model['thumbnail_path'])) {
                                $thumbUrl = htmlspecialchars($model['thumbnail_path']);
                                $bgStyle = "style=\"background-image: url('$thumbUrl');\"";
                            }
                        ?>
                        <div class="model-preview" id="preview-<?= $model['id'] ?>" data-filepath="<?= htmlspecialchars($model['filepath']) ?>" <?= $bgStyle ?>>
                            <?php if (empty($model['thumbnail_path'])): ?>
                                <div class="no-thumbnail">無縮圖，滑鼠移入可預覽</div>
                            <?php endif; ?>
                        </div>
                        <div class="model-info">
                            <h3 class="model-title"><?= htmlspecialchars($model['title']) ?></h3>
                            <p class="model-description"><?= htmlspecialchars($model['description'] ?: '沒有說明') ?></p>
                            <div class="model-meta">
                                <span class="model-author"><?= htmlspecialchars($model['username']) ?></span>
                                <span><?= date('Y/m/d', strtotime($model['uploaded_at'])) ?></span>
                            </div>
                        </div>
                    </article>
                <?php endforeach; ?>
            </section>
            
            <?php if ($total_pages > 1): ?>
                <nav class="pagination">
                    <?php if ($page > 1): ?>
                        <a href="?filter=<?= $filter ?>&search=<?= urlencode($search) ?>&page=<?= $page - 1 ?>" class="page-btn">← 上一頁</a>
                    <?php else: ?>
                        <span class="page-btn disabled">← 上一頁</span>
                    <?php endif; ?>
                    
                    <?php for ($i = max(1, $page - 2); $i <= min($total_pages, $page + 2); $i++): ?>
                        <a href="?filter=<?= $filter ?>&search=<?= urlencode($search) ?>&page=<?= $i ?>" class="page-btn <?= $i === $page ? 'active' : '' ?>">
                            <?= $i ?>
                        </a>
                    <?php endfor; ?>
                    
                    <?php if ($page < $total_pages): ?>
                        <a href="?filter=<?= $filter ?>&search=<?= urlencode($search) ?>&page=<?= $page + 1 ?>" class="page-btn">下一頁 →</a>
                    <?php else: ?>
                        <span class="page-btn disabled">下一頁 →</span>
                    <?php endif; ?>
                </nav>
            <?php endif; ?>
        <?php endif; ?>
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

    <script>
        // Pass PHP data to JS
        window.galleryModels = <?= json_encode($models) ?>;
    </script>
    <script type="module" src="js/gallery.js"></script>
</body>
</html>
