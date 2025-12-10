<?php
session_start();
header('Content-Type: application/json');

if (!isset($_SESSION['user_id'])) {
    echo json_encode(['success' => false, 'message' => 'Not authenticated']);
    exit();
}

require_once '../config/db_connect.php';
$user_id = $_SESSION['user_id'];
$action = $_POST['action'] ?? '';


if ($action === 'upload') {

    if (!isset($_FILES['model_file']) || $_FILES['model_file']['error'] !== UPLOAD_ERR_OK) {
        echo json_encode(['success' => false, 'message' => 'No file uploaded or upload error']);
        exit();
    }

    $title = trim($_POST['title'] ?? '');
    $description = trim($_POST['description'] ?? '');
    $file = $_FILES['model_file'];

    if (empty($title)) {
        echo json_encode(['success' => false, 'message' => 'Title is required']);
        exit();
    }

    $maxFileSize = 20 * 1024 * 1024; // 20MB in bytes
    if ($file['size'] > $maxFileSize) {
        echo json_encode(['success' => false, 'message' => 'File size exceeds 20MB limit']);
        exit();
    }

    $allowedExtensions = ['glb', 'gltf', 'obj', 'fbx', 'stl'];
    $fileExtension = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
    
    if (!in_array($fileExtension, $allowedExtensions)) {
        echo json_encode(['success' => false, 'message' => 'Invalid file type. Allowed: ' . implode(', ', $allowedExtensions)]);
        exit();
    }

    $uploadDir = '../uploads/';
    if (!file_exists($uploadDir)) {
        mkdir($uploadDir, 0755, true);
    }

    $uniqueFilename = uniqid('model_', true) . '_' . time() . '.' . $fileExtension;
    $targetPath = $uploadDir . $uniqueFilename;

    $dbPath = 'uploads/' . $uniqueFilename;

    if (!move_uploaded_file($file['tmp_name'], $targetPath)) {
        echo json_encode(['success' => false, 'message' => 'Failed to save file']);
        exit();
    }

    $stmt = $conn->prepare("INSERT INTO models (user_id, title, description, filepath, uploaded_at) VALUES (?, ?, ?, ?, NOW())");
    $stmt->bind_param("isss", $user_id, $title, $description, $dbPath);

    if ($stmt->execute()) {
        $model_id = $stmt->insert_id;
        echo json_encode([
            'success' => true, 
            'message' => 'Model uploaded successfully',
            'model_id' => $model_id,
            'filepath' => $dbPath
        ]);
    } else {
        unlink($targetPath);
        echo json_encode(['success' => false, 'message' => 'Database error: ' . $stmt->error]);
    }

    $stmt->close();

} elseif ($action === 'delete') {

    $model_id = intval($_POST['model_id'] ?? 0);

    if ($model_id <= 0) {
        echo json_encode(['success' => false, 'message' => 'Invalid model ID']);
        exit();
    }

    $stmt = $conn->prepare("SELECT filepath FROM models WHERE id = ? AND user_id = ?");
    $stmt->bind_param("ii", $model_id, $user_id);
    $stmt->execute();
    $result = $stmt->get_result();

    if ($result->num_rows === 0) {
        echo json_encode(['success' => false, 'message' => 'Model not found or access denied']);
        exit();
    }

    $model = $result->fetch_assoc();
    $stmt->close();

    $stmt = $conn->prepare("DELETE FROM models WHERE id = ? AND user_id = ?");
    $stmt->bind_param("ii", $model_id, $user_id);

    if ($stmt->execute()) {
        $physicalPath = '../' . $model['filepath'];
        if (file_exists($physicalPath)) {
            unlink($physicalPath);
        }
        echo json_encode(['success' => true, 'message' => 'Model deleted successfully']);
    } else {
        echo json_encode(['success' => false, 'message' => 'Failed to delete model']);
    }

    $stmt->close();

} elseif ($action === 'update') {
    $model_id = intval($_POST['model_id'] ?? 0);
    $title = trim($_POST['title'] ?? '');
    $description = trim($_POST['description'] ?? '');

    if ($model_id <= 0) {
        echo json_encode(['success' => false, 'message' => 'Invalid model ID']);
        exit();
    }

    if (empty($title)) {
        echo json_encode(['success' => false, 'message' => 'Title is required']);
        exit();
    }

    $stmt = $conn->prepare("SELECT id FROM models WHERE id = ? AND user_id = ?");
    $stmt->bind_param("ii", $model_id, $user_id);
    $stmt->execute();
    $result = $stmt->get_result();

    if ($result->num_rows === 0) {
        echo json_encode(['success' => false, 'message' => 'Model not found or access denied']);
        exit();
    }
    $stmt->close();

    $stmt = $conn->prepare("UPDATE models SET title = ?, description = ? WHERE id = ? AND user_id = ?");
    $stmt->bind_param("ssii", $title, $description, $model_id, $user_id);

    if ($stmt->execute()) {
        echo json_encode([
            'success' => true, 
            'message' => 'Model updated successfully',
            'model_id' => $model_id
        ]);
    } else {
        echo json_encode(['success' => false, 'message' => 'Failed to update model']);
    }

    $stmt->close();
} else {
    echo json_encode(['success' => false, 'message' => 'Invalid action']);
}

$conn->close();
?>
