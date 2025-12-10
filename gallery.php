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

// Determine filter mode
$filter = $_GET['filter'] ?? 'all';
$page = max(1, intval($_GET['page'] ?? 1));
$per_page = 8;
$offset = ($page - 1) * $per_page;

// Build query based on filter
if ($filter === 'my') {
    $count_query = "SELECT COUNT(*) as total FROM models WHERE user_id = ?";
    $stmt_count = $conn->prepare($count_query);
    $stmt_count->bind_param("i", $user_id);
    
    $query = "SELECT m.id, m.title, m.description, m.filepath, m.uploaded_at, u.username 
              FROM models m 
              JOIN users u ON m.user_id = u.id 
              WHERE m.user_id = ? 
              ORDER BY m.uploaded_at DESC 
              LIMIT ? OFFSET ?";
    $stmt = $conn->prepare($query);
    $stmt->bind_param("iii", $user_id, $per_page, $offset);
} else {
    $count_query = "SELECT COUNT(*) as total FROM models";
    $stmt_count = $conn->query($count_query);
    
    $query = "SELECT m.id, m.title, m.description, m.filepath, m.uploaded_at, u.username 
              FROM models m 
              JOIN users u ON m.user_id = u.id 
              ORDER BY m.uploaded_at DESC 
              LIMIT ? OFFSET ?";
    $stmt = $conn->prepare($query);
    $stmt->bind_param("ii", $per_page, $offset);
}

// Get total count
if ($filter === 'my') {
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
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Gallery - 3D Model Viewer</title>
    <link rel="stylesheet" href="assets/css/gallery.css">
</head>
<body>
    <div class="header">
        <div class="header-left">
            <div class="logo">3D Gallery</div>
            <nav class="nav-links">
                <a href="gallery.php" class="<?= $filter === 'all' ? 'active' : '' ?>">Gallery</a>
                <a href="gallery.php?filter=my" class="<?= $filter === 'my' ? 'active' : '' ?>">My Models</a>
                <a href="viewer.php">Viewer</a>
                <a href="manage.php">Manage My Models</a>
            </nav>
        </div>
        <div class="header-right">
            <span class="username"><?= htmlspecialchars($username) ?></span>
            <a href="api/logout.php" class="logout-btn">Logout</a>
        </div>
    </div>
    
    <div class="container">
        <div class="filter-bar">
            <div class="filter-tabs">
                <a href="gallery.php" class="filter-tab <?= $filter === 'all' ? 'active' : '' ?>">
                    All Models
                </a>
                <a href="gallery.php?filter=my" class="filter-tab <?= $filter === 'my' ? 'active' : '' ?>">
                    My Models
                </a>
            </div>
            <div class="model-count">
                <?= $total_models ?> model<?= $total_models !== 1 ? 's' : '' ?>
            </div>
        </div>
        
        <?php if (empty($models)): ?>
            <div class="empty-state">
                <h2>No models found</h2>
                <p><?= $filter === 'my' ? "You haven't uploaded any models yet." : "No models have been uploaded yet." ?></p>
                <?php if ($filter === 'my'): ?>
                    <a href="manage.php" class="upload-btn">Upload Your First Model</a>
                <?php endif; ?>
            </div>
        <?php else: ?>
            <div class="gallery-grid">
                <?php foreach ($models as $model): ?>
                    <div class="model-card" onclick="window.location.href='viewer.php?id=<?= $model['id'] ?>'">
                        <div class="model-preview" id="preview-<?= $model['id'] ?>" data-filepath="<?= htmlspecialchars($model['filepath']) ?>">
                            <div class="loading-spinner"></div>
                        </div>
                        <div class="model-info">
                            <h3 class="model-title"><?= htmlspecialchars($model['title']) ?></h3>
                            <p class="model-description"><?= htmlspecialchars($model['description'] ?: 'No description') ?></p>
                            <div class="model-meta">
                                <span class="model-author"><?= htmlspecialchars($model['username']) ?></span>
                                <span><?= date('M j, Y', strtotime($model['uploaded_at'])) ?></span>
                            </div>
                        </div>
                    </div>
                <?php endforeach; ?>
            </div>
            
            <?php if ($total_pages > 1): ?>
                <div class="pagination">
                    <?php if ($page > 1): ?>
                        <a href="?filter=<?= $filter ?>&page=<?= $page - 1 ?>" class="page-btn">← Previous</a>
                    <?php else: ?>
                        <span class="page-btn disabled">← Previous</span>
                    <?php endif; ?>
                    
                    <?php for ($i = max(1, $page - 2); $i <= min($total_pages, $page + 2); $i++): ?>
                        <a href="?filter=<?= $filter ?>&page=<?= $i ?>" class="page-btn <?= $i === $page ? 'active' : '' ?>">
                            <?= $i ?>
                        </a>
                    <?php endfor; ?>
                    
                    <?php if ($page < $total_pages): ?>
                        <a href="?filter=<?= $filter ?>&page=<?= $page + 1 ?>" class="page-btn">Next →</a>
                    <?php else: ?>
                        <span class="page-btn disabled">Next →</span>
                    <?php endif; ?>
                </div>
            <?php endif; ?>
        <?php endif; ?>
    </div>
    
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
