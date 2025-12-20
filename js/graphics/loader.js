/**
 * js/loader.js
 * 負責載入外部資源 (文字檔、圖片等)
 */

const ResourceLoader = {

    /**
     * 載入純文字檔案 (通常用於讀取 shader 原始碼)
     * @param {string} url - 檔案路徑 (例如: './shaders/vertex.vert')
     * @returns {Promise<string>} - 回傳檔案內容字串
     */
    loadText: async function(url) {
        try {
            const response = await fetch(url);
            
            // 檢查檔案是否存在
            if (!response.ok) {
                throw new Error(`找不到檔案: ${url} (Status: ${response.status})`);
            }

            const text = await response.text();
            console.log(`[Loader] 成功載入文字檔: ${url}`);
            return text;
        } catch (error) {
            console.error(`[Loader] 載入失敗: ${url}`, error);
            throw error; // 繼續往外拋出錯誤，讓主程式知道
        }
    },

    /**
     * 載入圖片 (用於紋理 Texture)
     * @param {string} url - 圖片路徑
     * @returns {Promise<HTMLImageElement>} - 回傳載入完成的圖片物件
     */
    loadImage: function(url) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                console.log(`[Loader] 成功載入圖片: ${url}`);
                resolve(img);
            };
            img.onerror = () => {
                console.error(`[Loader] 圖片載入失敗: ${url}`);
                reject(new Error(`無法載入圖片: ${url}`));
            };
            img.src = url;
        });
    },

    /**
     * 同時載入 Vertex Shader 和 Fragment Shader
     * @param {string} vsPath - Vertex Shader 路徑
     * @param {string} fsPath - Fragment Shader 路徑
     * @returns {Promise<Object>} - 回傳包含 vsSource 和 fsSource 的物件
     */
    loadShaderPair: async function(vsPath, fsPath) {
        // Promise.all 可以同時並行載入兩個檔案，速度比較快
        const [vsSource, fsSource] = await Promise.all([
            this.loadText(vsPath),
            this.loadText(fsPath)
        ]);

        return { vsSource, fsSource };
    }
};