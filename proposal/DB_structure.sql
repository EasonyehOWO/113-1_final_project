-- 建立資料庫
CREATE DATABASE IF NOT EXISTS `cg_final_project` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `cg_final_project`;

-- 1. 使用者資料表 (Users)
CREATE TABLE `users` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `username` varchar(50) NOT NULL COMMENT '使用者帳號',
  `password` varchar(255) NOT NULL COMMENT '加密後的密碼',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `username` (`username`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 2. 模型資料表 (Models)
-- 儲存上傳的模型資訊，filepath 指向伺服器上的實際檔案位置
CREATE TABLE `models` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL COMMENT '上傳者ID (Foreign Key)',
  `title` varchar(100) NOT NULL COMMENT '模型標題',
  `description` text COMMENT '模型描述',
  `filepath` varchar(255) NOT NULL COMMENT '伺服器端檔案路徑 (例: uploads/model_1.glb)',
  `uploaded_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `fk_model_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 測試數據 (Optional)
-- 假設已經有一個用戶 (密碼通常由PHP hash生成，這裡僅為示意)
-- INSERT INTO `users` (`username`, `password`) VALUES ('testuser', 'hashed_password_123');