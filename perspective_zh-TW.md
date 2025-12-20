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

## 4. 視角模式：放大體驗 vs 真實物理

在專案開發過程中，我們發現「靠近螢幕」後的效果，可以有兩種不同的詮釋（例如：靠近時物體變大符合使用者體驗，或視野變廣符合物理特性），我們在控制面板中提供了切換開關，這對應到兩種不同的數學模型：

### 模式 A: 放大體驗 (Zoom Mode, Default)
這是一般 3D 遊戲或應用程式的預設行為。相機的 **視野角度 (FOV)** 是固定的。

- **數學原理**:
  - 視錐體 (Frustum) 的大小是固定的。
  - 當使用者靠近物體 ($Z$ 減少)，根據透視投影 $S \propto \frac{1}{Z}$，物體在畫面上的投影會**變大**。
- **體驗**:
  - 就像拿著放大鏡看東西。
  - 當你靠近螢幕，物體會填滿你的視線，讓你可以更清楚看到細節。雖然這不符合「窗戶」的物理特性（窗戶框變大，但窗外的山不會變大），但這符合使用者想「靠近看清楚」的直覺。

### 模式 B: 真實透視 (Physics Mode)
此模式模擬真實世界的「窗戶」效應。相機的 FOV 會隨著使用者的距離而改變，以匹配螢幕在視網膜上的物理大小。

- **數學原理**:
  - 我們動態調整視錐體的邊界 (`top`, `bottom`)：
    $$ Top_{new} = Top_{base} \times \frac{Z_{ref}}{Z_{current}} $$
  - 當使用者**靠近**螢幕 ($Z_{current}$ 變小)，FOV 會**變大** (視角變廣)。
  - 較大的 FOV 會導致渲染出來的物體看起來比較**小** (Zoom Out)。
- **體驗**:
  - **抵銷效應**: 「使用者靠近導致的物理放大」與 「FOV 變大導致的渲染縮小」相互抵銷。
  - 結果是：螢幕上的虛擬物體看起來像是在**固定位置**不動，只有視窗框 (螢幕邊緣) 相對於你的視野變大了。
  - 這創造了最強烈的「全息視窗」或「虛擬實境」錯覺。
