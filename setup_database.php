<?php
// =========================================================
// 資料庫初始化與重置腳本 (PHP版)
// 對應原始檔案: DB_structure.sql
// =========================================================

// 設定資料庫連線資訊
// 注意：如果要執行 CREATE DATABASE 或 DROP TABLE，建議使用 root 權限，
// 或者確保你的使用者 (如 CVML) 已經擁有該資料庫的所有權限。
$servername = "localhost";
$username = "CVML";          // 你的資料庫帳號
$password = "114DWP2025";    // 你的資料庫密碼
$dbname = "CVML";            // 資料庫名稱
$port = 3306;

// 1. 連線到 MySQL (不指定資料庫，以便執行 CREATE DATABASE)
$conn = new mysqli($servername, $username, $password, "", $port);

// 檢查連線
if ($conn->connect_error) {
    die("連線失敗: " . $conn->connect_error);
}
echo "MySQL 連線成功。<br>";

// 2. 建立資料庫 (如果不存在)
// 對應 SQL: CREATE DATABASE IF NOT EXISTS `CVML` ...
$sql_create_db = "CREATE DATABASE IF NOT EXISTS `$dbname` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci";
if ($conn->query($sql_create_db) === TRUE) {
    echo "資料庫 '$dbname' 準備就緒。<br>";
} else {
    die("建立資料庫失敗: " . $conn->error);
}

// 3. 選擇資料庫
$conn->select_db($dbname);

// 4. 重置資料表 (DROP TABLES)
// 對應 SQL: DROP TABLE IF EXISTS `models`, `users`;
// ★注意順序：必須先刪除有 Foreign Key 的表 (models)，再刪除被參照的表 (users)
$sql_drop = "DROP TABLE IF EXISTS `models`, `users`";
if ($conn->query($sql_drop) === TRUE) {
    echo "舊資料表 (models, users) 已清除。<br>";
} else {
    echo "清除舊資料表時發生警告 (可能是第一次執行): " . $conn->error . "<br>";
}

// ---------------------------------------------------------
// 5. 建立資料表: Users
// ---------------------------------------------------------
$sql_users = "CREATE TABLE `users` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `username` varchar(50) NOT NULL COMMENT '使用者帳號',
  `password` varchar(255) NOT NULL COMMENT '加密後的密碼',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `username` (`username`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4";

if ($conn->query($sql_users) === TRUE) {
    echo "資料表 'users' 建立成功。<br>";
} else {
    die("建立 users 失敗: " . $conn->error);
}

// ---------------------------------------------------------
// 6. 建立資料表: Models
// ---------------------------------------------------------
// 注意：這裡設定了 Foreign Key (`user_id`) 連結到 `users` 表的 `id`
$sql_models = "CREATE TABLE `models` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL COMMENT '上傳者ID (Foreign Key)',
  `title` varchar(100) NOT NULL COMMENT '模型標題',
  `description` text COMMENT '模型描述',
  `filepath` varchar(255) NOT NULL COMMENT '伺服器端檔案路徑',
  `thumbnail_path` varchar(255) NULL COMMENT '縮圖路徑',
  `uploaded_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `fk_model_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4";

if ($conn->query($sql_models) === TRUE) {
    echo "資料表 'models' 建立成功。<br>";
} else {
    die("建立 models 失敗: " . $conn->error);
}

// ---------------------------------------------------------
// 7. 建立測試數據 (可選)
// ---------------------------------------------------------
// 建立一個預設管理員: CVML / 114DWP2025
$test_pass = password_hash("114DWP2025", PASSWORD_DEFAULT);
$sql_insert_user = "INSERT INTO `users` (`username`, `password`) VALUES ('CVML', '$test_pass')";

if ($conn->query($sql_insert_user) === TRUE) {
    echo "已建立測試帳號 -> 帳號: CVML / 密碼: 114DWP2025<br>";
    
    // 取得剛剛建立的 user id
    $user_id = $conn->insert_id;
    
    // 順便建立一筆測試用的模型資料 (假裝上傳了一個檔案)
    $sql_insert_model = "INSERT INTO `models` (`user_id`, `title`, `description`, `filepath`) 
                         VALUES ($user_id, '測試模型', '這是一個自動生成的測試資料', 'uploads/demo.glb')";
    if ($conn->query($sql_insert_model) === TRUE) {
        echo "已建立測試模型資料。<br>";
    }
} else {
    echo "建立測試帳號失敗: " . $conn->error . "<br>";
}

$conn->close();
echo "<hr><strong>所有設定完成！資料庫結構已與 DB_structure.sql 同步。</strong>";
?>