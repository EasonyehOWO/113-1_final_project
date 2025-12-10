import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

/**
 * Generates a thumbnail image from a 3D model file (Blob/File).
 * @param {File} file - The 3D model file (.glb/.gltf)
 * @returns {Promise<Blob>} - A promise that resolves to the image Blob (image/png)
 */
export async function generateThumbnail(file) {
    return new Promise((resolve, reject) => {
        const url = URL.createObjectURL(file);
        
        // 1. Setup Offscreen Scene
        const width = 512;
        const height = 512;
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0xf5f5f5); // Light gray background
        // Or transparent: renderer({ alpha: true }), scene.background = null;

        const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
        camera.position.set(0, 0, 5);

        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
        renderer.setSize(width, height);
        // We don't append renderer to DOM

        // Lights
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
        scene.add(ambientLight);
        const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
        dirLight.position.set(5, 5, 5);
        scene.add(dirLight);
        const backLight = new THREE.DirectionalLight(0xffffff, 0.3);
        backLight.position.set(-5, 0, -5);
        scene.add(backLight);

        // 2. Load Model
        const loader = new GLTFLoader();
        loader.load(url, (gltf) => {
            const model3d = gltf.scene;

            // 3. Normalize & Center
            const box = new THREE.Box3().setFromObject(model3d);
            const size = box.getSize(new THREE.Vector3());
            const center = box.getCenter(new THREE.Vector3());

            const maxDim = Math.max(size.x, size.y, size.z);
            const scale = 3.0 / maxDim; // Adjust scale to fit nicely
            model3d.scale.setScalar(scale);
            model3d.position.sub(center.multiplyScalar(scale));

            // Optional: Rotate slightly for better view
            model3d.rotation.y = Math.PI / 6; // 30 deg
            model3d.rotation.x = Math.PI / 12; // 15 deg

            scene.add(model3d);

            // 4. Render
            renderer.render(scene, camera);

            // 5. Capture
            renderer.domElement.toBlob((blob) => {
                // Cleanup
                renderer.dispose();
                URL.revokeObjectURL(url); // Release memory
                
                if (blob) {
                    resolve(blob);
                } else {
                    reject(new Error("Thumbnail generation failed: Blob is null"));
                }
            }, 'image/png');

        }, undefined, (err) => {
            URL.revokeObjectURL(url);
            renderer.dispose();
            reject(err);
        });
    });
}
