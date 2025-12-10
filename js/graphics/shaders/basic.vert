#version 300 es

// 輸入變數 (Attributes): 從 JavaScript 傳進來的資料
// a_position: 頂點座標 (x, y, z)
in vec4 a_position;

// a_color: 頂點顏色 (r, g, b)
in vec4 a_color;

// 統一變數 (Uniforms): 全域設定，所有頂點共用
// u_matrix: 模型-視圖-投影矩陣 (Model-View-Projection Matrix)
// 用來把 3D 世界的座標轉換成螢幕上的 2D 座標
uniform mat4 u_matrix;

// 輸出變數 (Varying): 要傳給 Fragment Shader 的資料
out vec4 v_color;

void main() {
  // 核心運算: 矩陣 * 座標
  // 如果你的 JavaScript 還沒設定矩陣，畫面可能會是黑的，
  // 測試時可以暫時改成: gl_Position = a_position;
  gl_Position = u_matrix * a_position;

  // 將顏色傳遞給 Fragment Shader
  // GPU 會自動幫你在頂點之間做顏色漸層 (插值)
  v_color = a_color;
}