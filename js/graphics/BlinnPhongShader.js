import * as THREE from 'three';

export const BlinnPhongShader = {
    uniforms: {
        uColor: { value: new THREE.Color(0x00bcd4) }, // Default Cyan (fallback)
        uTexture: { value: null },                    // Texture
        uHasTexture: { value: false },                // Toggle
        uLightPos: { value: new THREE.Vector3(5, 5, 5) },
        uViewPos: { value: new THREE.Vector3(0, 0, 5) },
        uAmbientColor: { value: new THREE.Color(0x222222) },
        uSpecularColor: { value: new THREE.Color(0xffffff) },
        uShininess: { value: 32.0 }
    },

    vertexShader: `
        varying vec3 vNormal;
        varying vec3 vPosition;
        varying vec2 vUv;

        void main() {
            vNormal = normalize(normalMatrix * normal);
            vPosition = (modelViewMatrix * vec4(position, 1.0)).xyz;
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
    `,

    fragmentShader: `
        uniform vec3 uColor;
        uniform sampler2D uTexture;
        uniform bool uHasTexture;
        
        uniform vec3 uLightPos;
        uniform vec3 uViewPos;
        uniform vec3 uAmbientColor;
        uniform vec3 uSpecularColor;
        uniform float uShininess;

        varying vec3 vNormal;
        varying vec3 vPosition;
        varying vec2 vUv;

        void main() {
            // Base Color (Texture or Uniform)
            vec3 baseColor = uColor;
            if (uHasTexture) {
                vec4 texColor = texture2D(uTexture, vUv);
                baseColor = texColor.rgb;
            }

            // Ambient
            vec3 ambient = uAmbientColor * baseColor;

            // Diffuse
            vec3 lightDir = normalize(uLightPos - vPosition);
            vec3 normal = normalize(vNormal);
            float diff = max(dot(normal, lightDir), 0.0);
            vec3 diffuse = diff * baseColor;

            // Specular (Blinn-Phong)
            vec3 viewDir = normalize(uViewPos - vPosition);
            vec3 halfDir = normalize(lightDir + viewDir);
            float spec = pow(max(dot(normal, halfDir), 0.0), uShininess);
            vec3 specular = uSpecularColor * spec;

            vec3 finalColor = ambient + diffuse + specular;
            gl_FragColor = vec4(finalColor, 1.0);
        }
    `
};
