#version 300 es

// 設定浮點數精確度 (手機/平板開發必備，不然會報錯)
precision mediump float;

// 輸入變數: 從 Vertex Shader 接收過來的顏色
// 變數名稱必須跟 basic.vert 裡的輸出變數一模一樣
in vec4 v_color;

// 輸出變數: 最終畫在螢幕上的顏色
out vec4 outColor;

void main() {
  // 簡單暴力：直接把接收到的顏色畫出來
  outColor = v_color;
}