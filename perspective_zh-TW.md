# 技術原理：Webcam 追蹤與 Off-Axis Projection

這份文件詳細說明我們如何透過 Webcam 定位使用者，並利用這些資訊產生正確的「全息視窗」效果。

## 1. 臉部追蹤 (Face Tracking)

我們使用 `face-api.js` (基於 TensorFlow.js) 的 `TinyFaceDetector` 模型來進行即時臉部偵測。

### 步驟 A: 取得 2D 座標
Webcam 會回傳每一幀的影像。模型在影像中尋找人臉的 Bounding Box (邊界框)。
- **X, Y**: 邊界框的中心點。
- **Width, Height**: 邊界框的寬高。

### 步驟 B: 座標正規化 (Normalization)
原始的像素座標 (Pixel Coordinates) 會被轉換為標準化座標 (-1.0 至 1.0)，並進行鏡像翻轉以符合直覺：

```javascript
// js/tracking/face_tracker.js
normX = -((centerX / videoWidth) * 2 - 1);  // 翻轉 X 軸 (鏡像)
normY = -((centerY / videoHeight) * 2 - 1); // 翻轉 Y 軸 (向上為正)
```

### 步驟 C: 深度估算 (Z Estimation)
由於單鏡頭無法直接測距，我們利用「近大遠小」的原理來估算 Z 軸距離：
- 定義一個基準臉部比例 (例如：寬度佔畫面的 35%)。
- 若偵測到的臉部寬度**大於**基準 $\rightarrow$ 使用者**靠近** (Z 減少)。
- 若偵測到的臉部寬度**小於**基準 $\rightarrow$ 使用者**遠離** (Z 增加)。

公式：
$$ Z_{target} = Z_{base} + (Ratio_{base} - Ratio_{current}) \times Sensitivity $$

---

## 2. 座標轉換 (Coordinate Transformation)

從 Face Tracker 取得的 `(x, y, z)` 只是相對數值，需要轉換為 3D 世界的虛擬相機座標。

在 `js/graphics/scene_init.js` 中：

### 靈敏度與偏移 (Sensitivity & Offset)
我們將標準化座標乘上「靈敏度」係數，轉換為虛擬世界的單位 (例如 cm 或 unit)，並加上校準偏移量：

```javascript
FinalX = (RawX * SensitivityX) + OffsetX
FinalY = (RawY * SensitivityY) + OffsetY
FinalZ = RawZ
```

這決定了虛擬相機 (Virtual Camera) 在 3D 空間中的確切位置。

---

## 3. 非對稱投影 (Off-Axis Projection)

這是本系統最核心的部分。一般 3D 遊戲的相機總是看向正中央，但在「全息視窗」效果中，當你頭往左移，你應該看到視窗右側的更多內容（就像看窗戶一樣）。

我們使用 **非對稱視錐體 (Asymmetric Frustum)** 來達成此效果：

### 原理
一般的透視投影矩陣 (Perspective Projection Matrix) 是對稱的。而我們需要根據使用者的頭部位置 $(x_c, y_c, z_c)$ 來偏移視錐體的頂底左右邊界。

### 數學實作
我們保持相機的旋轉 (Rotation) 恆為 `(0, 0, 0)` —— 即永遠垂直面向螢幕平面。
接著，我們根據相機位置計算「投影偏移量 (Shear)」：

$$ shiftX = \frac{x_c}{z_c} \times near $$
$$ shiftY = \frac{y_c}{z_c} \times near $$

然後修改視錐體邊界：

$$ Left' = Left_{default} - shiftX $$
$$ Right' = Right_{default} - shiftX $$
$$ Top' = Top_{default} - shiftY $$
$$ Bottom' = Bottom_{default} - shiftY $$

這樣做的結果是：**投影中心**會隨著使用者的眼睛移動，但**投影平面 (螢幕)** 在虛擬世界中保持不動。

---

## 4. 為什麼靠近螢幕時物體會放大？

這是一個常見的物理現象，但在數學上是因為以下原因：

**情境**：
- 虛擬物體 (例如方塊) 放置在 $Z = -5$ 的位置。
- 螢幕平面 (Window) 位於 $Z = 0$ (概念上)。
- 使用者的眼睛 (相機) 位於 $Z > 0$。

**當使用者靠近螢幕時 ($Z_{camera}$ 變小)：**
1. 相機的物理位置更接近虛擬物體。
   - 距離 $D = Z_{camera} - Z_{object}$。
   - 當 $Z_{camera}$ 從 10 減少到 2 時，距離 $D$ 從 15 減少到 7。
2. 根據透視投影的基本原理，物體在視網膜(或近平面)上的投影大小 $S$ 與距離 $D$ 成反比：
   $$ S \propto \frac{1}{D} $$
3. 因此，**距離 $D$ 變小，投影大小 $S$ 變大**。

這完全符合真實世界的物理行為：當你把臉貼近窗戶時，窗外的景物看起來會更大、且視野 (Field of View) 會變廣。
