import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { BlinnPhongShader } from './BlinnPhongShader.js';

export const GraphicsApp = {
    scene: null,
    camera: null,
    renderer: null,
    raycaster: null,

    // Scene Objects
    floorGrid: null,
    backWallGrid: null,
    hitMarker: null,
    floorProjectionLine: null,
    wallProjectionLine: null,
    raycastTargets: [],

    // Settings (Defaults)
    settings: {
        sensitivityX: 12.0,
        sensitivityY: 12.0,
        sensitivityZ: 1.0,
        convergence: 0.0,
        showCrosshair: true,
        offsetX: 0,
        offsetY: 0
    },

    updateSettings: function(newSettings) {
        // ... (existing updateSettings code is fine as Object.assign handles merging) ...
        Object.assign(this.settings, newSettings);

        // Apply Renderer Scale
        if (this.renderer && newSettings.rendererScale) {
            this.renderer.setPixelRatio(newSettings.rendererScale);
        }

        // Apply Crosshair visibility immediately
        if (!newSettings.showCrosshair && this.hitMarker) {
             this.hitMarker.visible = false;
             if(this.floorProjectionLine) this.floorProjectionLine.visible = false;
             if(this.wallProjectionLine) this.wallProjectionLine.visible = false;
        }
    },

    // Camera State (Smoothing)
    targetCamPos: new THREE.Vector3(0, 0, 5),
    targetCamRotZ: 0,
    
    // Constants
    FLOOR_Y: -4,
    WALL_Z: -8,

    init: function(containerId) {
        const container = document.getElementById(containerId);

        // 1. Scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x000000);
        this.scene.fog = new THREE.Fog(0x000000, 5, 20);

        // 2. Camera
        this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.camera.position.z = 5;
        this.targetCamPos.copy(this.camera.position);

        // 3. Renderer
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        // Lower resolution for performance (User Request)
        this.renderer.setPixelRatio(0.5); 
        container.appendChild(this.renderer.domElement);

        // 4. Raycaster
        this.raycaster = new THREE.Raycaster();

        // 5. Build Scene Environment (Grids, Walls)
        this.buildEnvironment();

        // 6. Load Placeholder or Target Model
        this.loadModel();

        // 7. Event Listeners
        window.addEventListener('resize', () => this.onWindowResize(), false);

        // 8. Start Loop
        this.animate();
        console.log("GraphicsApp Initialized (Off-axis Projection Ready).");
    },

    buildEnvironment: function() {
        // Floor Grid
        this.floorGrid = new THREE.GridHelper(20, 20, 0x00ffff, 0x444444);
        this.floorGrid.position.y = this.FLOOR_Y;
        this.scene.add(this.floorGrid);

        // Back Wall Grid
        this.backWallGrid = new THREE.GridHelper(20, 20, 0xff00ff, 0x444444);
        this.backWallGrid.position.z = this.WALL_Z;
        this.backWallGrid.position.y = 6;
        this.backWallGrid.rotation.x = Math.PI / 2;
        this.scene.add(this.backWallGrid);

        // Invisible Raycast Planes
        const floorPlaneGeo = new THREE.PlaneGeometry(20, 20);
        const floorPlaneMat = new THREE.MeshBasicMaterial({ visible: false, side: THREE.DoubleSide });
        const floorPlane = new THREE.Mesh(floorPlaneGeo, floorPlaneMat);
        floorPlane.position.y = this.FLOOR_Y;
        floorPlane.rotation.x = -Math.PI / 2;
        this.scene.add(floorPlane);

        const backWallPlaneGeo = new THREE.PlaneGeometry(20, 20);
        const backWallPlane = new THREE.Mesh(backWallPlaneGeo, floorPlaneMat);
        backWallPlane.position.z = this.WALL_Z;
        backWallPlane.position.y = this.backWallGrid.position.y;
        this.scene.add(backWallPlane);

        this.raycastTargets = [floorPlane, backWallPlane];

        // Hit Marker (Red Dot)
        const hitMarkerGeo = new THREE.SphereGeometry(0.05, 16, 8);
        const hitMarkerMat = new THREE.MeshBasicMaterial({ color: 0xff0000 });
        this.hitMarker = new THREE.Mesh(hitMarkerGeo, hitMarkerMat);
        this.hitMarker.visible = false;
        this.scene.add(this.hitMarker);

        // Projection Lines
        const lineMaterial = new THREE.LineBasicMaterial({ color: 0xffffff, linewidth: 2 });
        
        const floorLineGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]);
        this.floorProjectionLine = new THREE.Line(floorLineGeo, lineMaterial);
        this.floorProjectionLine.visible = false;
        this.scene.add(this.floorProjectionLine);

        const wallLineGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]);
        this.wallProjectionLine = new THREE.Line(wallLineGeo, lineMaterial);
        this.wallProjectionLine.visible = false;
        this.scene.add(this.wallProjectionLine);
    },

    loadModel: function() {
        // Init Loader
        this.loader = new GLTFLoader();
        
        // Initial Load (from PHP variable)
        if (typeof TARGET_MODEL_PATH !== 'undefined' && TARGET_MODEL_PATH) {
            console.log("Loading initial model:", TARGET_MODEL_PATH);
            this.loadGLTF(TARGET_MODEL_PATH);
        } else {
            console.warn("No TARGET_MODEL_PATH defined.");
        }

        // Setup Drag & Drop
        this.setupDragAndDrop();
    },

    loadGLTF: function(url) {
        // Show loading indicator if we had one
        console.log(`Loading GLTF: ${url}`);

        this.loader.load(url, (gltf) => {
            // 1. Remove old model if exists
            if (this.currentModel) {
                this.scene.remove(this.currentModel);
                // Traverse and dispose geometry/material to avoid leak?
                this.currentModel.traverse((child) => {
                    if (child.isMesh) {
                        child.geometry.dispose();
                        if (child.material) child.material.dispose();
                    }
                });
            }

            // 2. Add new model
            this.currentModel = gltf.scene;
            
            this.currentModel.traverse((child) => {
                if (child.isMesh) {
                    // Create a clone of the shader uniforms for this specific mesh
                    const newUniforms = THREE.UniformsUtils.clone(BlinnPhongShader.uniforms);
                    
                    // 1. Preserve Texture if exists
                    if (child.material.map) {
                        newUniforms.uTexture.value = child.material.map;
                        newUniforms.uHasTexture.value = true;
                    } 
                    // 2. Preserve Color if no texture but has base color (Simple approximation)
                    else if (child.material.color) {
                        newUniforms.uColor.value = child.material.color;
                        newUniforms.uHasTexture.value = false;
                    }

                    child.material = new THREE.ShaderMaterial({
                        uniforms: newUniforms,
                        vertexShader: BlinnPhongShader.vertexShader,
                        fragmentShader: BlinnPhongShader.fragmentShader
                    });
                }
            });

            this.scene.add(this.currentModel);
            
            // 3. Auto-scale and center
            const box = new THREE.Box3().setFromObject(this.currentModel);
            const size = box.getSize(new THREE.Vector3());
            const center = box.getCenter(new THREE.Vector3());

            // Normalize size to fit in a 4x4x4 box approx
            const maxDim = Math.max(size.x, size.y, size.z);
            const scale = 4.0 / maxDim;
            this.currentModel.scale.setScalar(scale);

            // Re-center
            this.currentModel.position.x = -center.x * scale;
            this.currentModel.position.y = -center.y * scale;
            this.currentModel.position.z = -center.z * scale;

            console.log("Model loaded and scaled.", { size, scale });

        }, (xhr) => {
            console.log((xhr.loaded / xhr.total * 100) + '% loaded');
        }, (error) => {
            console.error('An error happened loading GLTF:', error);
            // Fallback to Cube if error
            if (!this.currentModel) this.addFallbackCube();
        });
    },

    addFallbackCube: function() {
        const geometry = new THREE.BoxGeometry(2, 2, 2);
        const material = new THREE.MeshNormalMaterial();
        this.currentModel = new THREE.Mesh(geometry, material);
        this.scene.add(this.currentModel);
    },

    setupDragAndDrop: function() {
        const container = document.body;

        container.addEventListener('dragover', (e) => {
            e.preventDefault(); // Essential to allow drop
            e.dataTransfer.dropEffect = 'copy';
            container.style.opacity = '0.8'; // Visual cue
        });

        container.addEventListener('dragleave', (e) => {
            e.preventDefault();
            container.style.opacity = '1.0';
        });

        container.addEventListener('drop', (e) => {
            e.preventDefault();
            container.style.opacity = '1.0';

            if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                const file = e.dataTransfer.files[0];
                const filename = file.name.toLowerCase();
                
                if (filename.endsWith('.glb') || filename.endsWith('.gltf')) {
                    const url = URL.createObjectURL(file);
                    console.log("Dropped file:", filename);
                    this.loadGLTF(url);
                } else {
                    alert("只支援 .glb 或 .gltf 格式");
                }
            }
        });
    },

    updateHeadData: function(data) {
        const { x, y, z, roll } = data;
        
        // Validate Inputs
        if (isNaN(x) || isNaN(y) || isNaN(z)) return;

        // Cleanup: remove unused variables and ensure settings are numbers
        const offX = isNaN(this.settings.offsetX) ? 0 : this.settings.offsetX;
        const offY = isNaN(this.settings.offsetY) ? 0 : this.settings.offsetY;
        
        // Calculate Final Position: Sensitivity * Raw + Offset
        const finalX = (x * this.settings.sensitivityX) + offX;
        const finalY = (y * this.settings.sensitivityY) + offY;
        
        const posZ = z; 
        
        this.targetCamPos.set(finalX, finalY, posZ);
        // this.targetCamRotZ = 0; // Roll disabled
    },

    onWindowResize: function() {
        if (!this.camera || !this.renderer) return;
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    },

    animate: function() {
        requestAnimationFrame(() => this.animate());

        if (!this.camera || !this.renderer) return;

        // 1. Smooth Camera Movement
        const lerpFactor = 0.1;
        this.camera.position.lerp(this.targetCamPos, lerpFactor);
        
        // Simple lerp for rotation since it's just Z
        this.camera.rotation.z += (this.targetCamRotZ - this.camera.rotation.z) * lerpFactor;

        // 2. Off-axis Projection Logic
        const convergence = this.settings.convergence;
        
        // ... (existing projection logic) ...
        
        // Update Shader Uniforms if model exists
        if (this.currentModel) {
            this.currentModel.traverse((child) => {
                if (child.isMesh && child.material.uniforms) {
                    // Update View Position (Camera relative to Model)
                    child.material.uniforms.uViewPos.value.copy(this.camera.position);
                    
                    // Optional: Make light follow camera or static
                    // child.material.uniforms.uLightPos.value.copy(this.camera.position); 
                }
            });
        }

        // Look At Check
        const lookAtX = this.camera.position.x * (1.0 - convergence);
        const lookAtY = this.camera.position.y * (1.0 - convergence);
        this.camera.lookAt(lookAtX, lookAtY, 0);

        // Frustum Shift
        const frustumShift = (1.0 - convergence);
        const near = this.camera.near;
        const far = this.camera.far;
        const top = near * Math.tan(THREE.MathUtils.DEG2RAD * 0.5 * this.camera.fov);
        const bottom = -top;
        const right = top * this.camera.aspect;
        const left = -right;
        const z = Math.max(0.1, this.camera.position.z);
        
        const shiftX = (this.camera.position.x / z) * near * frustumShift;
        const shiftY = (this.camera.position.y / z) * near * frustumShift;

        const newLeft = left - shiftX;
        const newRight = right - shiftX;
        const newTop = top - shiftY;
        const newBottom = bottom - shiftY;

        this.camera.projectionMatrix.makePerspective(newLeft, newRight, newTop, newBottom, near, far);

        // 3. Raycasting & Crosshair
        if (this.settings.showCrosshair) {
            this.updateCrosshair();
        } else {
            this.hitMarker.visible = false;
            this.floorProjectionLine.visible = false;
            this.wallProjectionLine.visible = false;
        }

        this.renderer.render(this.scene, this.camera);
    },

    updateCrosshair: function() {
        // Set Raycaster from Camera
        this.raycaster.setFromCamera(new THREE.Vector2(0, 0), this.camera);
        const intersects = this.raycaster.intersectObjects(this.raycastTargets);

        if (intersects.length > 0) {
            const closestHit = intersects[0];
            this.hitMarker.position.copy(closestHit.point);
            this.hitMarker.visible = true;

            const camPos = this.camera.position;
            const hitPos = this.hitMarker.position;

            // Floor Line
            const floorLinePos = this.floorProjectionLine.geometry.attributes.position;
            floorLinePos.setXYZ(0, camPos.x, this.FLOOR_Y, camPos.z);
            floorLinePos.setXYZ(1, hitPos.x, this.FLOOR_Y, hitPos.z);
            floorLinePos.needsUpdate = true;
            this.floorProjectionLine.visible = true;

            // Wall Line
            const wallLinePos = this.wallProjectionLine.geometry.attributes.position;
            wallLinePos.setXYZ(0, camPos.x, camPos.y, this.WALL_Z);
            wallLinePos.setXYZ(1, hitPos.x, hitPos.y, this.WALL_Z);
            wallLinePos.needsUpdate = true;
            this.wallProjectionLine.visible = true;
        } else {
            this.hitMarker.visible = false;
            this.floorProjectionLine.visible = false;
            this.wallProjectionLine.visible = false;
        }
    }
};