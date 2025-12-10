<?php
session_start();
if (isset($_SESSION['user_id'])) {
    header('Location: gallery.php');
    exit();
}

$error = '';
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    require_once 'config/db_connect.php';
    
    $username = $_POST['username'] ?? '';
    $password = $_POST['password'] ?? '';
    
    $stmt = $conn->prepare("SELECT id, password FROM users WHERE username = ?");
    $stmt->bind_param("s", $username);
    $stmt->execute();
    $result = $stmt->get_result();
    
    if ($user = $result->fetch_assoc()) {
        if (password_verify($password, $user['password'])) {
            $_SESSION['user_id'] = $user['id'];
            $_SESSION['username'] = $username;
            header('Location: gallery.php');
            exit();
        }
    }
    $error = 'Invalid username or password';
}
?>

<!DOCTYPE html>
<html lang="zh-tw">    <!-- CHECK LANG -->
<head>
    <meta charset="utf-8">
    <!-- Prevent Resize -->
    <meta name="viewport" content="width=device-width, initial-scale=1, user-scalable=no">
    <title>登入</title>
    <link rel="stylesheet" href="assets/css/login_register.css">
</head>
<body>
    <div class="container">
        <div class="auth-box">
            <h1>登入</h1>
            <?php if ($error): ?>
                <div class="error"><?php echo htmlspecialchars($error); ?></div>
            <?php endif; ?>
            <form method="POST">
                <div class="form-group username">
                    <label for="username">使用者名稱：</label>
                    <input type="text" id="username" name="username" required class="raised">
                </div>
                <div class="form-group password">
                    <label for="password">密碼：</label>
                    <input type="password" id="password" name="password" required class="raised">
                </div>
                <button type="submit" class="raised">[Link Start]</button>
            </form>
            <p class="switch-link">還沒有帳號嗎？ <a href="register.php">註冊</a></p>
        </div>
    </div>
</body>
</html>
