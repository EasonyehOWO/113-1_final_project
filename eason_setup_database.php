<?php
// 設定資料庫連線資訊
$servername = "127.0.0.1";
$username = "CVML";          // <--- 改成新的帳號
$password = "114DWP2025";    // <--- 改成新的密碼
$dbname = "CVML"; 
$port = 3307;

// 步驟 1: 先連線到 MySQL 伺服器 (注意：這裡先不要放 $dbname)
$conn = new mysqli($servername, $username, $password, "", $port);

// 檢查連線是否成功
if ($conn->connect_error) {
    die("連線失敗 (Connection failed): " . $conn->connect_error);
}

// 步驟 2: 建立資料庫 (如果不存在的話)
$sql_create_db = "CREATE DATABASE IF NOT EXISTS $dbname DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci";
if ($conn->query($sql_create_db) === TRUE) {
    echo "資料庫 '$dbname' 檢查/建立成功。<br>";
} else {
    die("建立資料庫失敗: " . $conn->error);
}

// 步驟 3: 正式選擇該資料庫
$conn->select_db($dbname);

// ---------------------------------------------------------
// 步驟 4: 在這裡建立你的資料表 (Tables)
// 以下是一個範例，你可以把你原本需要的 CREATE TABLE SQL 放在這裡
// ---------------------------------------------------------

// 範例：建立一個 users 表
$sql_create_table = "CREATE TABLE IF NOT EXISTS users (
    id INT(6) UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(30) NOT NULL,
    email VARCHAR(50),
    reg_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
)";

if ($conn->query($sql_create_table) === TRUE) {
    echo "資料表 'users' 檢查/建立成功。<br>";
} else {
    echo "建立資料表錯誤: " . $conn->error . "<br>";
}

// 結束連線
$conn->close();

echo "<hr>所有設定完成！你可以開始使用了。";
?>