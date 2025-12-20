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
        uShininess: { value: 32.0 },
        uRoughness: { value: 0.5 },
        uUseLightFollow: { value: false },
        uLightIntensity: { value: 1.0 },
        uEmissive: { value: new THREE.Color(0x000000) },
        uEmissiveMap: { value: null },
        uHasEmissiveMap: { value: false }
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
        uniform float uShininess; // Base shininess (legacy)
        uniform float uRoughness; // PBR Roughness (0.0 - 1.0)
        uniform bool uUseLightFollow;
        uniform float uLightIntensity;
        
        uniform vec3 uEmissive;
        uniform sampler2D uEmissiveMap;
        uniform bool uHasEmissiveMap;

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

            // Determine Light Position
            vec3 finalLightPos = uLightPos;
            if (uUseLightFollow) {
                finalLightPos = uViewPos; // Light comes from Camera
            }

            // Ambient
            vec3 ambient = uAmbientColor * baseColor;

            // Diffuse
            vec3 lightDir = normalize(finalLightPos - vPosition);
            vec3 normal = normalize(vNormal);
            float diff = max(dot(normal, lightDir), 0.0);
            
            // Auto-detect Light Toggle via Intensity
            // (Passed via uRoughness or separate uniform? Better separate)
            
            vec3 diffuse = diff * baseColor * uLightIntensity;

            // Specular (Blinn-Phong)
            // Approximate Shininess from Roughness
            // Smooth (0.0) -> Sharp High Shininess (e.g. 1000)
            // Rough (1.0) -> Dull Low Shininess (e.g. 10)
            float shininess = pow(1000.0, 1.0 - uRoughness);
            
            // If Roughness is very high, specular should be very weak
            float specStrength = 1.0 - uRoughness; 

            vec3 viewDir = normalize(uViewPos - vPosition);
            vec3 halfDir = normalize(lightDir + viewDir);
            float spec = pow(max(dot(normal, halfDir), 0.0), shininess);
            vec3 specular = uSpecularColor * spec * specStrength * uLightIntensity;

            // Emissive
            vec3 emissive = uEmissive;
            if (uHasEmissiveMap) {
                vec4 emissiveTex = texture2D(uEmissiveMap, vUv);
                emissive = emissiveTex.rgb;
            }

            vec3 finalColor = ambient + diffuse + specular + emissive;
            gl_FragColor = vec4(finalColor, 1.0);
        }
    `
};
