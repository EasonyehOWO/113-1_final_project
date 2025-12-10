// js/gallery.js
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

// Global state to manage the active preview
let activePreview = null;

document.addEventListener('DOMContentLoaded', () => {
    const models = window.galleryModels || [];
    
    models.forEach(model => {
        const container = document.getElementById(`preview-${model.id}`);
        if (!container) return;

        // Hover events
        container.addEventListener('mouseenter', () => {
            loadPreview(container, model.filepath);
        });

        container.addEventListener('mouseleave', () => {
            disposePreview(container);
        });
    });
});

function loadPreview(container, filepath) {
    // If there's already an active preview (maybe stuck), dispose it
    if (activePreview) {
        disposePreview(activePreview.container);
    }

    // Setup Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf5f5f5);

    const camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 100);
    camera.position.set(0, 0, 3); // Default position

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(renderer.domElement);

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    scene.add(ambientLight);
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.5);
    dirLight.position.set(5, 5, 5);
    scene.add(dirLight);

    // Animation Loop
    let requestID;
    let model3d = null;

    const animate = () => {
        requestID = requestAnimationFrame(animate);
        if (model3d) {
            model3d.rotation.y += 0.01;
        }
        renderer.render(scene, camera);
    };
    animate();

    // Load Model
    // Simple extension check
    const ext = filepath.split('.').pop().toLowerCase();
    
    if (ext === 'glb' || ext === 'gltf') {
        const loader = new GLTFLoader();
        loader.load(filepath, (gltf) => {
            model3d = gltf.scene;
            
            // Normalize Scale
            const box = new THREE.Box3().setFromObject(model3d);
            const size = box.getSize(new THREE.Vector3());
            const center = box.getCenter(new THREE.Vector3());
            
            const maxDim = Math.max(size.x, size.y, size.z);
            const scale = 2.0 / maxDim; // Fit into view
            model3d.scale.setScalar(scale);
            model3d.position.sub(center.multiplyScalar(scale)); // Center it

            scene.add(model3d);
        }, undefined, (err) => {
            console.error("Failed to load model", err);
        });
    } else {
        console.warn('Unsupported file type for preview:', ext);
        // Temporarily support only GLTF/GLB since we only downloaded that loader
    }

    // Store state
    activePreview = {
        container,
        scene,
        renderer,
        requestID
    };
}

function disposePreview(container) {
    if (!activePreview || activePreview.container !== container) return;

    // Stop loop
    cancelAnimationFrame(activePreview.requestID);

    // Dispose Three.js resources
    activePreview.renderer.dispose();
    
    // Remove Canvas
    const canvas = container.querySelector('canvas');
    if (canvas) canvas.remove();

    // Show spinner again (reset state)
    const spinner = container.querySelector('.loading-spinner');
    if (spinner) spinner.style.display = 'block';
    
    activePreview = null;
}
