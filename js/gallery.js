models.forEach(model => {
    const container = document.getElementById(`preview-${model.id}`);
    const filepath = container.dataset.filepath;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf5f5f5);

    const camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 1000);
    camera.position.set(0, 0, 5);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.shadowMap.enabled = true;

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 5, 5);
    directionalLight.castShadow = true;
    scene.add(directionalLight);

    const extension = filepath.split('.').pop().toLowerCase();
    const loader = getLoader(extension);
    
    if (loader) {
        loader.load(
            filepath,
            (object) => {
                const spinner = container.querySelector('.loading-spinner');
                if (spinner) spinner.remove();
                let model3d = object.scene || object;

                const box = new THREE.Box3().setFromObject(model3d);
                const center = box.getCenter(new THREE.Vector3());
                const size = box.getSize(new THREE.Vector3());
                const maxDim = Math.max(size.x, size.y, size.z);
                const scale = 3 / maxDim;
                
                model3d.scale.multiplyScalar(scale);
                model3d.position.sub(center.multiplyScalar(scale));
                
                scene.add(model3d);

                container.appendChild(renderer.domElement);

                let time = 0;
                function animate() {
                    requestAnimationFrame(animate);
                    time += 0.01;
                    model3d.rotation.y = time;
                    renderer.render(scene, camera);
                }
                animate();
            },
            undefined,
            (error) => {
                console.error('Error loading model:', error);
                const spinner = container.querySelector('.loading-spinner');
                if (spinner) {
                    spinner.style.borderTopColor = '#ff4757';
                }
            }
        );
    }
});

function getLoader(extension) {
    switch(extension) {
        case 'gltf':
        case 'glb':
            if (typeof THREE.GLTFLoader !== 'undefined') {
                return new THREE.GLTFLoader();
            }
            console.error('GLTFLoader not available');
            return null;
        case 'obj':
            if (typeof THREE.OBJLoader !== 'undefined') {
                return new THREE.OBJLoader();
            }
            console.error('OBJLoader not available');
            return null;
        default:
            return null;
    }
}

// Handle window resize
window.addEventListener('resize', () => {
    // Could add resize handling for renderers if needed
});
