/* 遷移自 GEMINI Prototype */
import * as THREE from 'three';

/**
 * 初始化 Three.js 場景
 * @param {HTMLCanvasElement} canvasElement 
 * @returns {Object} { scene, camera, renderer, raycaster, raycastTargets, objects }
 */
export function initScene(canvasElement) {
    const renderer = new THREE.WebGLRenderer({ canvas: canvasElement, antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000);
    scene.fog = new THREE.Fog(0x000000, 5, 20);

    const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 5;

    // --- Resize Handler ---
    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });

    const raycaster = new THREE.Raycaster();
    const raycastTargets = [];
    const objects = {}; // 儲存需要動態更新的物件

    return { scene, camera, renderer, raycaster, raycastTargets, objects };
}

/**
 * 建立場景中的物件 (網格, 球體, 輔助線)
 * @param {THREE.Scene} scene 
 * @param {Array} raycastTargets 
 * @param {Object} objects 
 */
export function createObjects(scene, raycastTargets, objects) {
    // 網格座標
    const FLOOR_Y = -4;
    const WALL_Z = -8;
    objects.FLOOR_Y = FLOOR_Y;
    objects.WALL_Z = WALL_Z;

    // 1. 地板網格
    const floorGrid = new THREE.GridHelper(20, 20, 0x00ffff, 0x444444);
    floorGrid.position.y = FLOOR_Y;
    scene.add(floorGrid);

    // 2. 後牆網格
    const backWallGrid = new THREE.GridHelper(20, 20, 0xff00ff, 0x444444);
    backWallGrid.position.z = WALL_Z;
    backWallGrid.position.y = 6; // 網格中心
    backWallGrid.rotation.x = Math.PI / 2;
    scene.add(backWallGrid);

    // 3. 三顆球體 (用於示範運動視差)
    const sphereGeo = new THREE.SphereGeometry(0.5, 32, 16);
    const normalMaterial = new THREE.MeshNormalMaterial();
    
    const sphereNear = new THREE.Mesh(sphereGeo, normalMaterial);
    sphereNear.position.set(0, -1, 2);
    scene.add(sphereNear);
    objects.sphereNear = sphereNear;

    const sphereMid = new THREE.Mesh(sphereGeo, normalMaterial);
    sphereMid.position.set(-2, 0, -2);
    scene.add(sphereMid);
    objects.sphereMid = sphereMid;

    const sphereFar = new THREE.Mesh(sphereGeo, normalMaterial);
    sphereFar.position.set(2, 1, -6);
    scene.add(sphereFar);
    objects.sphereFar = sphereFar;

    // 4. 準心擊中點 (紅球)
    const hitMarkerGeo = new THREE.SphereGeometry(0.05, 16, 8);
    const hitMarkerMat = new THREE.MeshBasicMaterial({ color: 0xff0000, emissive: 0xff0000 });
    const hitMarker = new THREE.Mesh(hitMarkerGeo, hitMarkerMat);
    hitMarker.visible = false;
    scene.add(hitMarker); 
    objects.hitMarker = hitMarker;

    // 5. 軌跡投影線
    const lineMaterial = new THREE.LineBasicMaterial({ color: 0xffffff, linewidth: 2 });
    
    // 地板投影線 (X-Z 平面)
    const floorLineGeo = new THREE.BufferGeometry().setFromPoints([ new THREE.Vector3(), new THREE.Vector3() ]);
    const floorProjectionLine = new THREE.Line(floorLineGeo, lineMaterial);
    floorProjectionLine.visible = false;
    scene.add(floorProjectionLine);
    objects.floorProjectionLine = floorProjectionLine;

    // 牆壁投影線 (X-Y 平面)
    const wallLineGeo = new THREE.BufferGeometry().setFromPoints([ new THREE.Vector3(), new THREE.Vector3() ]);
    const wallProjectionLine = new THREE.Line(wallLineGeo, lineMaterial);
    wallProjectionLine.visible = false;
    scene.add(wallProjectionLine);
    objects.wallProjectionLine = wallProjectionLine;

    // 6. 用於光線偵測的隱形平面
    const floorPlaneGeo = new THREE.PlaneGeometry(20, 20);
    const floorPlaneMat = new THREE.MeshBasicMaterial({ visible: false, side: THREE.DoubleSide });
    const floorPlane = new THREE.Mesh(floorPlaneGeo, floorPlaneMat);
    floorPlane.position.y = FLOOR_Y;
    floorPlane.rotation.x = -Math.PI / 2; 
    scene.add(floorPlane);
    raycastTargets.push(floorPlane);

    const backWallPlaneGeo = new THREE.PlaneGeometry(20, 20);
    const backWallPlane = new THREE.Mesh(backWallPlaneGeo, floorPlaneMat); 
    backWallPlane.position.z = WALL_Z;
    backWallPlane.position.y = backWallGrid.position.y; // 與可見網格對齊
    scene.add(backWallPlane);
    raycastTargets.push(backWallPlane);
}
