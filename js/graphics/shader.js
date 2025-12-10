/**
 * js/shader.js
 * 負責編譯 Shader 程式碼並連結成 WebGL Program
 */

const ShaderUtil = {

    /**
     * 建立並連結 WebGL Program
     * @param {WebGLRenderingContext} gl - WebGL 上下文
     * @param {string} vsSource - Vertex Shader 原始碼字串
     * @param {string} fsSource - Fragment Shader 原始碼字串
     * @returns {WebGLProgram} - 成功連結的程式物件
     */
    createProgramFromSources: function(gl, vsSource, fsSource) {
        // 1. 編譯頂點著色器
        const vertexShader = this.createShader(gl, gl.VERTEX_SHADER, vsSource);
        // 2. 編譯片元著色器
        const fragmentShader = this.createShader(gl, gl.FRAGMENT_SHADER, fsSource);

        if (!vertexShader || !fragmentShader) {
            return null; // 編譯失敗就提早結束
        }

        // 3. 建立程式並連結
        const program = gl.createProgram();
        gl.attachShader(program, vertexShader);
        gl.attachShader(program, fragmentShader);
        gl.linkProgram(program);

        // 4. 檢查連結是否成功
        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
            const info = gl.getProgramInfoLog(program);
            console.error(`[Shader] Program 連結失敗: \n${info}`);
            gl.deleteProgram(program);
            return null;
        }

        console.log("[Shader] Program 建立並連結成功！");
        return program;
    },

    /**
     * 內部使用的輔助函式：編譯單個 Shader
     * @param {WebGLRenderingContext} gl 
     * @param {number} type - gl.VERTEX_SHADER 或 gl.FRAGMENT_SHADER
     * @param {string} source - Shader 原始碼
     */
    createShader: function(gl, type, source) {
        const shader = gl.createShader(type);
        gl.shaderSource(shader, source);
        gl.compileShader(shader);

        // 檢查編譯狀態
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            const info = gl.getShaderInfoLog(shader);
            const shaderType = (type === gl.VERTEX_SHADER) ? "Vertex Shader" : "Fragment Shader";
            console.error(`[Shader] ${shaderType} 編譯錯誤: \n${info}`);
            gl.deleteShader(shader);
            return null;
        }

        return shader;
    }
};