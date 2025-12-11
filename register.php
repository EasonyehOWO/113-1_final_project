<?php
session_start();
if (isset($_SESSION['user_id'])) {
    header('Location: viewer.php');
    exit();
}

$error = '';
$success = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    require_once 'config/db_connect.php';
    
    $username = $_POST['username'] ?? '';
    $password = $_POST['password'] ?? '';
    $confirm = $_POST['confirm_password'] ?? '';
    
    if (strlen($username) <= 3) {
        $error = '你好短';
    } elseif (strlen($password) <= 4) {
        $error = '你的密碼好短';
    } elseif ($password !== $confirm) {
        $error = '確認密碼欄位不一致';
    } else {
        $stmt = $conn->prepare("SELECT id FROM users WHERE username = ?");
        $stmt->bind_param("s", $username);
        $stmt->execute();
        
        if ($stmt->get_result()->num_rows > 0) {
            $error = '這個名字已經有人用了';
        } else {
            $hashed = password_hash($password, PASSWORD_DEFAULT);
            $stmt = $conn->prepare("INSERT INTO users (username, password) VALUES (?, ?)");
            $stmt->bind_param("ss", $username, $hashed);
            
            if ($stmt->execute()) {
                $new_user_id = $conn->insert_id;

                // $stmt = $conn->prepare("INSERT INTO categories (user_id, name) VALUES (?, 'none')");
                // $stmt->bind_param("i", $new_user_id);
                // $stmt->execute();
                
                $success = '註冊成功！現在你可以準備潛行了';
            } else {
                $error = '註冊失敗，請再試一次';
            }
        }
    }
}
?>
<!DOCTYPE html>
<html lang="zh-tw">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1, user-scalable=no">
    <title>註冊</title>
    <link rel="stylesheet" href="assets/css/login_register.css">
</head>
<body>
    <div class="container">
        <div class="auth-box">
            <h1>註冊</h1>
            <?php if ($error): ?>
                <div class="error"><?php echo htmlspecialchars($error); ?></div>
            <?php endif; ?>
            <?php if ($success): ?>
                <div class="success"><?php echo htmlspecialchars($success); ?></div>
            <?php endif; ?>
            <form method="POST">
                <div class="form-group username">
                    <label for="username">使用者名稱：</label>
                    <input id="username" class="raised" type="text" name="username" required>
                </div>
                <div class="form-group password">
                    <label for="password">密碼：</label>
                    <input id="password" class="raised" type="password" name="password" required>
                </div>
                <div class="form-group password">
                    <label for="confirm_password">確認密碼：</label>
                    <input id="confirm_password" class="raised" type="password" name="confirm_password" required>
                </div>
                <button class="raised" type="submit">註冊</button>
            </form>
            <p class="switch-link">已經有帳號了？ <a href="login.php">登入</a></p>
        </div>
    </div>
</body>
</html>
