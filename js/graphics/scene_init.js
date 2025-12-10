// js/graphics/scene_init.js
import * as THREE from 'three';

export const GraphicsApp = {
    scene: null,
    camera: null,
    renderer: null,
    cube: null, // 測試用的物件

    // 初始化場景
    init: function(containerId) {
        const container = document.getElementById(containerId);

        // 1. 創建場景
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x202020);

        // 2. 創建相機 (FOV, Aspect, Near, Far)
        this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.camera.position.z = 5;

        // 3. 創建渲染器
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        container.appendChild(this.renderer.domElement);

        // 4. 加入測試物件 (等待組員 A 替換成 GLTF + Shader)
        // TODO: 組員 A 請在此處將 CubeGeometry 替換為 GLTFLoader
        const geometry = new THREE.BoxGeometry();
        // TODO: 組員 A 請在此處將 MeshBasicMaterial 替換為 ShaderMaterial (Blinn-Phong)
        const material = new THREE.MeshBasicMaterial({ color: 0x00ff00, wireframe: true });
        this.cube = new THREE.Mesh(geometry, material);
        this.scene.add(this.cube);

        // 5. 處理視窗縮放
        window.addEventListener('resize', () => this.onWindowResize(), false);

        // 開始渲染迴圈
        this.animate();
        console.log("GraphicsApp Initialized.");
    },

    // 核心功能：根據頭部位置更新相機 (Off-axis Projection 基礎)
    // x, y 範圍預期是 -1.0 到 1.0
    updateHeadPosition: function(x, y) {
        // 簡單的視差效果模擬
        // 當頭往右移 (x > 0)，相機也要往右移，且視線看向中心
        const moveRange = 2.0; // 相機移動幅度
        
        if (this.camera) {
            this.camera.position.x += (x * moveRange - this.camera.position.x) * 0.1; // 平滑插值 (Lerp)
            this.camera.position.y += (y * moveRange - this.camera.position.y) * 0.1;
            this.camera.lookAt(0, 0, 0);
        }
    },

    onWindowResize: function() {
        if (!this.camera || !this.renderer) return;
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    },

    animate: function() {
        requestAnimationFrame(() => this.animate());

        // 讓方塊轉動，證明渲染器活著
        if (this.cube) {
            this.cube.rotation.x += 0.01;
            this.cube.rotation.y += 0.01;
        }

        if (this.renderer && this.scene && this.camera) {
            this.renderer.render(this.scene, this.camera);
        }
    }
};