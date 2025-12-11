# 可視化虛擬實境 3D 檢視器

利用網路攝影機追蹤使用者的頭部位置與方向，並即時渲染 3D 模型，提供如同全息投影般的視覺體驗。

[English Version](./README.md)

## 怎麽架設（開發用）

1. 將 `proposal/database` 資料夾中的 SQL 檔案匯入到您的 MySQL 資料庫 (`sudo mysql < proposal/database/database.sql`)。

2. 啟動 PHP 伺服器：`php -S localhost:8000 -d upload_max_filesize=25M -d post_max_size=25M`。 
   (注意：25M 是最大 Post 大小，而單檔上傳上限 20M 目前是寫死在 `upload_action.php` 中)

3. 在瀏覽器中開啟 `http://localhost:8000`

## 功能介紹

### 在 3D 世界中移動

我們提供了豐富的鍵盤控制功能，讓您可以自由探索模型：

- **平移移動**:
  - `W` / `S`: 前進 / 後退 (相對於目前視線方向的平面移動)
  - `A` / `D`: 向左 / 向右平移
  - `T` / `B`: 向上 / 向下移動 (類似電梯升降，控制 Y 軸高度)

- **視角轉動 (虛擬眼動)**:
  - `↑` / `↓` (方向鍵): 抬頭 / 低頭
  - `←` / `→` (方向鍵): 左轉頭 / 右轉頭

- **快速重置**:
  - `O`: 重置水平位置 (回到 X=0, Z=0)
  - `I`: 重置高度 (回到 Y=0)
  - `0` (數字零): 重置轉頭方向 (面向正前方)

## 專案路線圖
[查看詳細路線圖（英文）](./proposal/roadmap/readme.md)

## 其他連結
若需要免費的 glb 模型進行測試，可以參考此存檔庫：[KhronosGroup glTF Samples]( https://github.com/KhronosGroup/glTF-Sample-Models/blob/main/2.0/Duck/glTF-Binary/Duck.glb )
