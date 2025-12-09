/* 遷移自 GEMINI Prototype */
import * as THREE from 'three';
import { FaceTracker } from './tracking/face_tracker.js';
import { initScene, createObjects } from './graphics/scene_init.js';

// --- 設定參數 ---
const SENSITIVITY_X = 12.0; 
const SENSITIVITY_Y = 12.0; 
const SENSITIVITY_Z = 20.0; 
const SENSITIVITY_ROLL = 20.0; 
const BASE_CAMERA_Z = 5;
const NEUTRAL_LANDMARK_DIST = 0.25; 

// --- 狀態變數 ---
let targetFaceX = 0;
let targetFaceY = 0;
let targetFaceZ = BASE_CAMERA_Z;
let targetFaceRoll = 0; 

// --- DOM 元素 ---
const videoElement = document.getElementById('webcam-feed');
const canvasElement = document.getElementById('render-canvas');
const statusText = document.getElementById('status-text');
const convergenceSlider = document.getElementById('convergenceSlider');
const crosshairToggle = document.getElementById('crosshairToggle');
const infoElement = document.getElementById('info');

// --- 初始化模組 ---
const { scene, camera, renderer, raycaster, raycastTargets, objects } = initScene(canvasElement);
createObjects(scene, raycastTargets, objects);

const faceTracker = new FaceTracker();

async function main() {
    statusText.innerText = "正在載入 3D 臉部地標模型...";
    
    try {
        await faceTracker.init(videoElement);
        statusText.innerText = "模型已載入。正在啟動攝影機...";
        
        // 開始 Game Loop
        requestAnimationFrame(gameLoop);
    } catch (err) {
        console.error(err);
        statusText.innerText = "錯誤：無法啟動追蹤模組。";
    }
}

function gameLoop() {
    // 1. 臉部偵測
    const results = faceTracker.detect(videoElement);

    if (results && results.faceLandmarks && results.faceLandmarks.length > 0) {
        statusText.innerText = "偵測到臉部！";
        
        const landmarks = results.faceLandmarks[0];

        // 提取 X, Y
        const nose = landmarks[1]; 
        targetFaceX = (nose.x - 0.5) * 2 * -1;
        targetFaceY = (nose.y - 0.5) * 2 * -1;
        
        // 提取 Z
        const leftTemple = landmarks[130];
        const rightTemple = landmarks[359];
        const landmarkDist = Math.abs(leftTemple.x - rightTemple.x);
        const zOffset = (NEUTRAL_LANDMARK_DIST - landmarkDist) * SENSITIVITY_Z;
        targetFaceZ = BASE_CAMERA_Z + zOffset;

        // 提取 Roll
        const deltaY = leftTemple.y - rightTemple.y; 
        const deltaX = leftTemple.x - rightTemple.x; 
        targetFaceRoll = Math.atan2(deltaY, deltaX);
        
    } else {
        statusText.innerText = "未偵測到臉部...";
        // 緩慢歸位
        const lerpFactor = 0.05;
        targetFaceX = targetFaceX * (1 - lerpFactor);
        targetFaceY = targetFaceY * (1 - lerpFactor);
        targetFaceZ = targetFaceZ * (1 - lerpFactor) + BASE_CAMERA_Z * lerpFactor;
        targetFaceRoll = targetFaceRoll * (1 - lerpFactor);
    }

    // 2. 更新相機與場景
    const lerpFactor = 0.1; 
    
    const posX = targetFaceX * SENSITIVITY_X;
    const posY = targetFaceY * SENSITIVITY_Y;
    const posZ = targetFaceZ;
    const rotZ = targetFaceRoll * SENSITIVITY_ROLL;

    // 平滑地移動/旋轉相機
    camera.position.x += (posX - camera.position.x) * lerpFactor;
    camera.position.y += (posY - camera.position.y) * lerpFactor;
    camera.position.z += (posZ - camera.position.z) * lerpFactor;
    camera.rotation.z += (rotZ - camera.rotation.z) * lerpFactor; 
    
    // 讀取滑桿值，決定 "看" 的目標點 (收斂)
    const convergence = parseFloat(convergenceSlider.value); 
    const lookAtX = camera.position.x * (1.0 - convergence);
    const lookAtY = camera.position.y * (1.0 - convergence);
    
    camera.lookAt(lookAtX, lookAtY, 0);

    // 更新不對稱投影
    const frustumShift = (1.0 - convergence);
    const near = camera.near;
    const far = camera.far;
    const top = near * Math.tan(THREE.MathUtils.DEG2RAD * 0.5 * camera.fov);
    const bottom = -top;
    const right = top * camera.aspect;
    const left = -right;
    const z = Math.max(0.1, camera.position.z); 
    const shiftX = (camera.position.x / z) * near * frustumShift;
    const shiftY = (camera.position.y / z) * near * frustumShift;
    const newLeft = left - shiftX;
    const newRight = right - shiftX;
    const newTop = top - shiftY;
    const newBottom = bottom - shiftY;
    camera.projectionMatrix.makePerspective(newLeft, newRight, newTop, newBottom, near, far);

    // 3. 更新軌跡準心
    const showCrosshair = crosshairToggle.checked;
    
    // 物件參考簡寫
    const { hitMarker, floorProjectionLine, wallProjectionLine, FLOOR_Y, WALL_Z } = objects;

    if (showCrosshair) {
        // 將 raycaster 設定為從相機發出
        raycaster.setFromCamera( new THREE.Vector2(0,0), camera );

        const intersects = raycaster.intersectObjects(raycastTargets);

        if (intersects.length > 0) {
            // 取得最近的碰撞點
            const closestHit = intersects[0];
            hitMarker.position.copy(closestHit.point);
            hitMarker.visible = true;

            // 更新軌跡線
            const camPos = camera.position;
            const hitPos = hitMarker.position;
            
            // 1. 更新地板投影線 (X-Z 平面，Y 是固定的)
            const floorLinePos = floorProjectionLine.geometry.attributes.position;
            floorLinePos.setXYZ(0, camPos.x, FLOOR_Y, camPos.z); // 相機的影子
            floorLinePos.setXYZ(1, hitPos.x, FLOOR_Y, hitPos.z); // 紅球的影子
            floorLinePos.needsUpdate = true;

            // 2. 更新牆壁投影線 (X-Y 平面，Z 是固定的)
            const wallLinePos = wallProjectionLine.geometry.attributes.position;
            wallLinePos.setXYZ(0, camPos.x, camPos.y, WALL_Z); // 相機的影子
            wallLinePos.setXYZ(1, hitPos.x, hitPos.y, WALL_Z); // 紅球的影子
            wallLinePos.needsUpdate = true;
            
            floorProjectionLine.visible = true;
            wallProjectionLine.visible = true;

        } else {
            hitMarker.visible = false;
            floorProjectionLine.visible = false;
            wallProjectionLine.visible = false;
        }

    } else {
        hitMarker.visible = false;
        floorProjectionLine.visible = false;
        wallProjectionLine.visible = false;
    }

    // 4. 動畫旋轉 (Objects Update)
    objects.sphereNear.rotation.y += 0.01;
    objects.sphereMid.rotation.y -= 0.005;
    objects.sphereFar.rotation.y += 0.003;

    // 5. 渲染
    renderer.render(scene, camera);

    // 6. 繼續迴圈
    requestAnimationFrame(gameLoop);
}

// 監聽器
infoElement.addEventListener('click', (event) => {
    event.stopPropagation();
});

document.body.addEventListener("click", () => {
    if (document.fullscreenElement) {
        document.exitFullscreen();
    } else {
        document.body.requestFullscreen();
    }
});

// 啟動主程式
main();
