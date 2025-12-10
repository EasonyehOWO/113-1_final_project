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
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Manage Models - 3D Model Viewer</title>
    <link rel="stylesheet" href="assets/css/manage.css">
</head>
<body>
    <div class="header">
        <div class="header-left">
            <div class="logo">3D Gallery</div>
            <nav class="nav-links">
                <a href="gallery.php">Gallery</a>
                <a href="gallery.php?filter=my">My Models</a>
                <a href="viewer.php">Viewer</a>
                <a href="manage.php" class="active">Manage My Models</a>
            </nav>
        </div>
        <div class="header-right">
            <span class="username"><?= htmlspecialchars($username) ?></span>
            <a href="logout.php" class="logout-btn">Logout</a>
        </div>
    </div>

    <div class="container">
        <div class="page-header">
            <h1>Manage My Models</h1>
            <p>Upload new 3D models or manage your existing ones</p>
        </div>

        <div id="message-container"></div>

        <div class="upload-section">
            <h2>Upload New Model</h2>
            <form id="uploadForm" class="upload-form" enctype="multipart/form-data">
                <div class="form-group">
                    <label for="title">Title *</label>
                    <input type="text" id="title" name="title" required placeholder="Enter model title">
                </div>

                <div class="form-group">
                    <label for="description">Description</label>
                    <textarea id="description" name="description" placeholder="Enter model description (optional)"></textarea>
                </div>

                <div class="form-group">
                    <label>Model File *</label>
                    <div class="file-input-wrapper">
                        <input type="file" id="modelFile" name="model_file" accept=".glb" required>
                        <label for="modelFile" class="file-input-label" id="fileLabel">
                            Click to select a 3D model file (.glb)
                        </label>
                    </div>
                </div>

                <button type="submit" class="submit-btn" id="uploadBtn">Upload Model</button>
            </form>
            <div class="loading" id="uploadLoading">Uploading...</div>
        </div>

        <div class="models-section">
            <h2>My Models (<?= count($models) ?>)</h2>
            
            <?php if (empty($models)): ?>
                <div class="empty-state">
                    <h3>No models yet</h3>
                    <p>Upload your first 3D model using the form above</p>
                </div>
            <?php else: ?>
                <div class="models-list" id="modelsList">
                    <?php foreach ($models as $model): ?>
                        <div class="model-item" data-model-id="<?= $model['id'] ?>">
                            <div class="model-item-header">
                                <div class="model-item-info">
                                    <h3 class="model-title"><?= htmlspecialchars($model['title']) ?></h3>
                                    <p class="model-description"><?= htmlspecialchars($model['description'] ?: 'No description') ?></p>
                                    <div class="model-item-meta">
                                        Uploaded: <?= date('M j, Y g:i A', strtotime($model['uploaded_at'])) ?>
                                    </div>
                                </div>
                                <div class="model-item-actions">
                                    <button class="btn-edit" onclick="editModel(<?= $model['id'] ?>)">Edit</button>
                                    <button class="btn-delete" onclick="deleteModel(<?= $model['id'] ?>, '<?= htmlspecialchars($model['title'], ENT_QUOTES) ?>')">Delete</button>
                                </div>
                            </div>
                            
                            <form class="edit-form" id="edit-form-<?= $model['id'] ?>">
                                <div class="form-group">
                                    <label>Title *</label>
                                    <input type="text" name="title" value="<?= htmlspecialchars($model['title']) ?>" required>
                                </div>
                                <div class="form-group">
                                    <label>Description</label>
                                    <textarea name="description"><?= htmlspecialchars($model['description']) ?></textarea>
                                </div>
                                <div class="model-item-actions">
                                    <button type="button" class="btn-save" onclick="saveModel(<?= $model['id'] ?>)">Save Changes</button>
                                    <button type="button" class="btn-cancel" onclick="cancelEdit(<?= $model['id'] ?>)">Cancel</button>
                                </div>
                            </form>
                        </div>
                    <?php endforeach; ?>
                </div>
            <?php endif; ?>
        </div>
    </div>

    <script src="js/manage.js"></script>
</body>
</html>