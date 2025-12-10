// js/main.js

document.addEventListener('DOMContentLoaded', () => {
    
    // 1. 初始化圖學模組 (在 id="canvas-container" 中)
    GraphicsApp.init('canvas-container');

    // 2. 初始化追蹤模組 (使用 id="video-preview" 顯示影像)
    FaceTracker.init('video-preview');

    // 3. 核心連結：當 FaceTracker 數據更新時，通知 GraphicsApp 更新相機
    FaceTracker.onUpdate((x, y) => {
        GraphicsApp.updateHeadPosition(x, y);
    });

    console.log("System Integrated: Tracking -> Graphics");
});

async function main() {
    const canvas = document.getElementById("glCanvas");
    const gl = canvas.getContext("webgl2"); // 或 webgl

    if (!gl) {
        alert("你的瀏覽器不支援 WebGL");
        return;
    }

    try {
        // 1. 使用 Loader 載入檔案 (假設你的 shader 放在 shaders 資料夾)
        // 這裡會等待檔案讀取完畢才繼續往下執行
        const { vsSource, fsSource } = await ResourceLoader.loadShaderPair(
            './graphics/shaders/basic.vert', 
            './graphics/shaders/basic.frag'
        );

        // 2. 使用 ShaderUtil 編譯並建立程式
        const program = ShaderUtil.createProgramFromSources(gl, vsSource, fsSource);

        if (program) {
            gl.useProgram(program);
            // 接下來就可以開始你的 initBuffers() 或 render() 了...
            console.log("初始化完成，可以開始繪圖了！");
        }
        
    } catch (err) {
        console.error("發生嚴重錯誤:", err);
    }
}

// 執行主程式
main();