// Scene Setup
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });

renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.getElementById('canvas-container').appendChild(renderer.domElement);

// Camera Position
camera.position.z = 120;
camera.position.y = 30;

// Variables
let particles;
let positions = [];
let treePositions = [];
let explosionPositions = [];
let colors = [];
const particleCount = 30000;
let isExploded = false;

// Geometry
const geometry = new THREE.BufferGeometry();
const colorObj = new THREE.Color();

// Helper to generate random number in range
const randomRange = (min, max) => Math.random() * (max - min) + min;

// Generate Particles
for (let i = 0; i < particleCount; i++) {
    // --- Tree Shape Generation ---
    // Spiral Cone
    
    // Use a biased random for height to reduce density at the tip (which has less volume)
    // We want more particles at the bottom (normHeight close to 0)
    const normHeight = Math.pow(Math.random(), 1.5); // 0 to 1, biased towards 0
    const height = -60 + normHeight * 120;
    
    // Radius decreases as we go up
    const baseRadius = 45;
    const radiusAtHeight = baseRadius * (1 - normHeight);
    
    // Spiral angle logic for structure (optional, mixed with random for volume)
    // We use a mix of structured spiral and random noise
    const spiralAngle = height * 0.2; 
    const randomAngle = randomRange(0, Math.PI * 2);
    
    // Distribute points: some follow spiral strongly, some random
    // But for a dense tree, just random angle in volume is fine, 
    // maybe bias radius to be outer shell for definition
    const r = radiusAtHeight * Math.sqrt(Math.random()); 
    const theta = randomAngle;

    const x = Math.cos(theta) * r;
    const z = Math.sin(theta) * r;
    const y = height;

    treePositions.push(x, y, z);
    positions.push(x, y, z); // Start at tree position

    // --- Explosion Shape Generation ---
    // Large sphere burst
    const expRadius = randomRange(50, 200);
    const expTheta = randomRange(0, Math.PI * 2);
    const expPhi = randomRange(0, Math.PI);
    
    const ex = expRadius * Math.sin(expPhi) * Math.cos(expTheta);
    const ey = expRadius * Math.sin(expPhi) * Math.sin(expTheta);
    const ez = expRadius * Math.cos(expPhi);
    
    explosionPositions.push(ex, ey, ez);

    // --- Colors ---
    const rand = Math.random();
    if (rand < 0.6) {
        // Green Tree Needles - Darker green to reduce overexposure
        // Hue around 0.3 (Green), Saturation 0.8, Lightness 0.1-0.3
        colorObj.setHSL(randomRange(0.28, 0.35), 0.8, randomRange(0.1, 0.3));
    } else if (rand < 0.8) {
        // Gold Lights
        colorObj.setHSL(randomRange(0.1, 0.14), 1.0, 0.6);
    } else if (rand < 0.9) {
        // Red Ornaments
        colorObj.setHex(0xc41e3a); // Deeper red
    } else {
        // White/Silver sparkles
        colorObj.setHex(0xffffff);
    }
    
    colors.push(colorObj.r, colorObj.g, colorObj.b);
}

geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

// Texture for glow
const getTexture = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 128; // Increased resolution for HD
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    const grad = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    // Sharper gradient for clearer particles
    grad.addColorStop(0, 'rgba(255,255,255,1)');
    grad.addColorStop(0.2, 'rgba(255,255,255,0.9)'); // Solid core
    grad.addColorStop(0.4, 'rgba(255,255,255,0.2)'); // Quick falloff
    grad.addColorStop(1.0, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 128, 128);
    const texture = new THREE.Texture(canvas);
    texture.needsUpdate = true;
    return texture;
};

const material = new THREE.PointsMaterial({
    size: 1.5, // Slightly smaller size for sharper look with more particles
    vertexColors: true,
    map: getTexture(),
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    transparent: true,
    opacity: 0.95, // Increased opacity for brightness
    sizeAttenuation: true
});

particles = new THREE.Points(geometry, material);
scene.add(particles);

// Star Top
// Create a 5-pointed star shape
const createStarShape = (outerRadius, innerRadius) => {
    const shape = new THREE.Shape();
    const points = 5;
    for (let i = 0; i < points * 2; i++) {
        const angle = (i / (points * 2)) * Math.PI * 2 + Math.PI / 2; // Start at top
        const r = (i % 2 === 0) ? outerRadius : innerRadius;
        const x = Math.cos(angle) * r;
        const y = Math.sin(angle) * r;
        if (i === 0) shape.moveTo(x, y);
        else shape.lineTo(x, y);
    }
    shape.closePath();
    return shape;
};

const starShape = createStarShape(2.5, 1.2);
const starGeometry = new THREE.ExtrudeGeometry(starShape, {
    depth: 0.5,
    bevelEnabled: true,
    bevelThickness: 0.2,
    bevelSize: 0.1,
    bevelSegments: 1
});
starGeometry.center(); // Center the geometry for proper rotation

const starMaterial = new THREE.MeshBasicMaterial({ color: 0xffff00 }); 
const star = new THREE.Mesh(starGeometry, starMaterial);
star.position.set(0, 62, 0);
scene.add(star);

// Add a glow sprite behind the star
const spriteMaterial = new THREE.SpriteMaterial({ 
    map: getTexture(), 
    color: 0xff8800, // Orange glow to be less blinding
    transparent: true, 
    opacity: 0.4, 
    blending: THREE.AdditiveBlending
});
const starGlow = new THREE.Sprite(spriteMaterial);
starGlow.scale.set(10, 10, 1.0); // Reduced scale
star.add(starGlow);


// Interaction
// Raycaster could be used to click *on* the tree, but full screen click is easier for this UX
window.addEventListener('click', () => {
    isExploded = !isExploded;
    star.visible = !isExploded;
});

// Resize
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// Mouse Interaction
let targetRotationX = 0;
let targetRotationY = 0;
let mouseX = 0;
let mouseY = 0;

document.addEventListener('mousemove', (event) => {
    mouseX = (event.clientX - window.innerWidth / 2) * 0.001;
    mouseY = (event.clientY - window.innerHeight / 2) * 0.001;
});

// Animation
const clock = new THREE.Clock();

function animate() {
    requestAnimationFrame(animate);
    
    const time = clock.getElapsedTime();
    const delta = clock.getDelta();

    // Smooth rotation
    particles.rotation.y += 0.003;
    if(isExploded) {
        particles.rotation.y -= 0.004; // Spin faster/differently when exploded
    }

    // Star animation
    star.rotation.y -= 0.02;
    star.rotation.z = Math.sin(time * 2) * 0.1;
    const pulse = 1 + Math.sin(time * 3) * 0.1;
    star.scale.set(pulse, pulse, pulse);

    // Camera drift based on mouse
    camera.position.x += (mouseX * 100 - camera.position.x) * 0.05;
    camera.position.y += (-mouseY * 100 + 30 - camera.position.y) * 0.05;
    camera.lookAt(0, 10, 0);

    // Particle Transition
    const positionsAttribute = particles.geometry.attributes.position;
    const currentPos = positionsAttribute.array;
    const targetPos = isExploded ? explosionPositions : treePositions;
    
    // Using a simple lerp for all particles
    // For 20k particles, this is okay on modern devices.
    // Optimization: logic can be done in vertex shader for better performance,
    // but JS is easier to write and sufficient here.
    
    const lerpFactor = 0.06; // Adjust speed here

    for (let i = 0; i < particleCount; i++) {
        const i3 = i * 3;
        
        currentPos[i3]     += (targetPos[i3]     - currentPos[i3])     * lerpFactor;
        currentPos[i3 + 1] += (targetPos[i3 + 1] - currentPos[i3 + 1]) * lerpFactor;
        currentPos[i3 + 2] += (targetPos[i3 + 2] - currentPos[i3 + 2]) * lerpFactor;
        
        // Add a little "breath" or "wind" motion when in tree mode
        if (!isExploded) {
             // Removed wiggle for "straight" look
             // currentPos[i3] += Math.sin(time * 2 + currentPos[i3+1] * 0.1) * 0.05;
        }
    }
    
    positionsAttribute.needsUpdate = true;

    renderer.render(scene, camera);
}

animate();
