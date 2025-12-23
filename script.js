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

// Helper to create Polaroid texture
const createPolaroidTexture = (imageElement) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    // Determine dimensions based on image aspect ratio
    // We want a fixed width for the Polaroid card, but height varies
    const cardWidth = 350;
    const padding = 25;
    const bottomPadding = 80; 
    
    // Calculate image dimensions to fit within the card width (minus padding)
    const imgAvailableWidth = cardWidth - (padding * 2);
    const imgNaturalRatio = imageElement.width / imageElement.height;
    
    // Calculated height for the image area
    const imgDrawHeight = imgAvailableWidth / imgNaturalRatio;
    
    // Total card height
    const cardHeight = padding + imgDrawHeight + bottomPadding;
    
    canvas.width = cardWidth;
    canvas.height = cardHeight;
    
    // 1. Draw Paper Background (White/Cream)
    ctx.fillStyle = '#f8f8f8';
    ctx.fillRect(0, 0, cardWidth, cardHeight);
    
    // Add subtle shadow/gradient for depth
    const grad = ctx.createLinearGradient(0, 0, cardWidth, cardHeight);
    grad.addColorStop(0, '#ffffff');
    grad.addColorStop(1, '#f0f0f0');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, cardWidth, cardHeight);
    
    // 2. Draw Photo
    try {
        ctx.drawImage(imageElement, padding, padding, imgAvailableWidth, imgDrawHeight);
    } catch (e) {
        // Fallback
        ctx.fillStyle = '#333';
        ctx.fillRect(padding, padding, imgAvailableWidth, imgDrawHeight);
    }
    
    // 3. Draw Inner Shadow on photo edge
    ctx.strokeStyle = 'rgba(0,0,0,0.1)';
    ctx.lineWidth = 1;
    ctx.strokeRect(padding, padding, imgAvailableWidth, imgDrawHeight);
    
    const texture = new THREE.Texture(canvas);
    texture.needsUpdate = true;
    
    // Return texture AND aspect ratio for sprite scaling
    return { texture, aspectRatio: cardWidth / cardHeight };
};

// --- Photos ---
// Instruct user to name files photo1.jpg, photo2.jpg, etc. or just use a loop to try loading
// Since we can't list files in client-side JS without a server, we will try to load a range of numbered files.
// Or we can provide a default list and comments.

const photoUrls = [];
// Automatically try to load p1.jpg through p50.jpg
// Users just need to drop files named p1.jpg, p2.jpg, etc. into the 'images' folder.
for (let i = 1; i <= 50; i++) {
    photoUrls.push(`./images/p${i}.jpg`);
}

// Also adding support for png just in case, though mixing arrays is tricky without checking existence.
// A better approach for a static site is to just define a list of potential filenames.
// Let's stick to a convention: p1.jpg, p2.jpg... 

const photoObjects = [];
const photoTextureLoader = new THREE.ImageLoader(); // Changed to ImageLoader to manipulate canvas

photoUrls.forEach((url, i) => {
    // Enable cross-origin for canvas manipulation
    photoTextureLoader.setCrossOrigin('anonymous');
    
    photoTextureLoader.load(
        url, 
        (image) => {
            // Success callback
            const { texture, aspectRatio } = createPolaroidTexture(image);
            
            const material = new THREE.SpriteMaterial({ 
                map: texture, 
                opacity: 0, 
                transparent: true,
                depthTest: false // Render on top of particles
            });
            const sprite = new THREE.Sprite(material);
            sprite.renderOrder = 999;
            
            // Base scale - Adaptive based on generated card aspect ratio
            // We keep width fixed at roughly 8 units
            sprite.userData.baseScaleX = 8;
            sprite.userData.baseScaleY = 8 / aspectRatio;
            
            sprite.scale.set(sprite.userData.baseScaleX, sprite.userData.baseScaleY, 1);
            sprite.userData.isExpanded = false;

            // Random Rotation (Tilt)
            // Increased range for more casual/messy look
            sprite.userData.randomRotation = randomRange(-0.5, 0.5); // +/- ~30 degrees (was 0.25)
            sprite.material.rotation = sprite.userData.randomRotation;

            // Tree Position (scattered on surface)
            const normHeight = Math.random(); 
            const height = -50 + normHeight * 100; 
            const radiusAtHeight = 45 * (1 - normHeight) + 5; 
            const angle = randomRange(0, Math.PI * 2);
            
            sprite.userData.treePos = new THREE.Vector3(
                Math.cos(angle) * radiusAtHeight,
                height,
                Math.sin(angle) * radiusAtHeight
            );

            // Random Float Parameters
            sprite.userData.floatSpeed = randomRange(0.8, 2.0); // Faster speed
            sprite.userData.floatOffset = randomRange(0, Math.PI * 2);
            sprite.userData.floatAmp = randomRange(2.0, 4.0); // Larger amplitude (was 0.5-1.5)

            // Explosion Position - Safe Zone & No Overlap
            let safePos = new THREE.Vector3();
            let attempts = 0;
            let valid = false;
            
            while (!valid && attempts < 100) {
                // Modified range to keep photos in bottom 2/3 of screen
                // Camera Y is 30. Looking at (0,10,0).
                // Screen top is roughly Y=60-70, Bottom is Y=-10 to -20
                // To restrict to bottom 2/3, we want lower Y values.
                // Range: X(-35 to 35), Y(-25 to 35), Z(0 to 60)
                // Previous Y was (-5 to 55)
                
                safePos.set(
                    randomRange(-35, 35),
                    randomRange(-25, 35), // Shifted down. Max height lowered.
                    randomRange(0, 60)
                );
                
                // Check collision
                valid = true;
                for (let p of photoObjects) {
                    // Buffer distance: 
                    // Each photo is roughly 10 units wide/tall. 
                    // We want at least 15 units distance center-to-center to ensure no overlap even with rotation
                    if (p.userData.explosionPos && p.userData.explosionPos.distanceTo(safePos) < 15) { 
                        valid = false;
                        break;
                    }
                }
                attempts++;
            }
            
            // If we failed to find a spot (rare with few photos), force push it further away to minimize visual overlap
            if (!valid) {
                 safePos.z -= 10; 
            }
            
            sprite.userData.explosionPos = safePos.clone();

            // Current Pos (start at tree)
            sprite.position.copy(sprite.userData.treePos);

            scene.add(sprite);
            photoObjects.push(sprite);
        },
        undefined, // onProgress
        (err) => {
            // onError: File not found or load error
            // We just ignore it, so only existing files are added.
            // console.warn('Could not load photo:', url);
        }
    );
});

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
// Audio Auto-play handling
const bgm = document.getElementById('bgm');
// Try to play immediately (might work if user has interacted with domain before)
bgm.play().catch(e => {
    console.log("Autoplay prevented, waiting for interaction");
});

// Drag logic variables
let isDragging = false;
let previousMousePosition = { x: 0, y: 0 };
let particleRotationOffset = 0;

window.addEventListener('click', () => {
    // Ensure music plays on first click if autoplay was blocked
    if (bgm.paused) {
        bgm.play();
    }

    // Only check for photo clicks if exploded (photos are visible)
    if (isExploded) {
        raycaster.setFromCamera(mouseVector, camera);
        const intersects = raycaster.intersectObjects(photoObjects);

        if (intersects.length > 0) {
            // Clicked on a photo
            const targetSprite = intersects[0].object;
            
            // If already expanded, shrink it back
            if (targetSprite.userData.isExpanded) {
                targetSprite.userData.isExpanded = false;
                targetSprite.renderOrder = 999; // Reset order
            } else {
                // Shrink any other expanded photos
                photoObjects.forEach(p => {
                    p.userData.isExpanded = false;
                    p.renderOrder = 999; // Reset order
                });
                // Expand this one
                targetSprite.userData.isExpanded = true;
                targetSprite.renderOrder = 10000; // Bring to front
            }
            return; // Handled photo click, don't toggle tree
        }
        
        // Clicked on background while exploded -> check if we need to close a photo
        let hadExpanded = false;
        photoObjects.forEach(p => {
            if (p.userData.isExpanded) {
                p.userData.isExpanded = false;
                p.renderOrder = 999; // Reset order
                hadExpanded = true;
            }
        });
        
        if (hadExpanded) return; // Just closed a photo, don't toggle tree
    }

    // Toggle tree state (if not handled above)
    isExploded = !isExploded;
    star.visible = !isExploded;
    
    // If going back to tree mode, ensure all photos are reset
    if (!isExploded) {
        photoObjects.forEach(p => {
            p.userData.isExpanded = false;
            p.renderOrder = 999; // Reset order
        });
    }
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
// For Raycaster
const mouseVector = new THREE.Vector2();
const raycaster = new THREE.Raycaster();

// --- Drag & Touch Interaction ---
const onDragStart = (x, y) => {
    // Ensure music plays on interaction
    if (bgm && bgm.paused) {
        bgm.play().catch(() => {});
    }

    // 粒子云展开后禁用拖动
    // Dragging disabled when exploded
};

const onDragMove = (x, y) => {
    if (isDragging && isExploded) {
        const deltaMove = {
            x: x - previousMousePosition.x,
            y: y - previousMousePosition.y
        };
        
        // Horizontal drag rotates the particle cloud
        // Mobile sensitivity might need to be higher, but this is a good start
        particleRotationOffset += deltaMove.x * 0.005; 
        
        previousMousePosition = { x, y };
    }
};

const onDragEnd = () => {
    // We set isDragging to false with a small timeout to prevent click trigger immediately after drag
    setTimeout(() => {
        isDragging = false;
    }, 10);
};

// Mouse Listeners
document.addEventListener('mousedown', (e) => onDragStart(e.clientX, e.clientY));
document.addEventListener('mouseup', onDragEnd);

document.addEventListener('mousemove', (event) => {
    mouseX = (event.clientX - window.innerWidth / 2) * 0.001;
    mouseY = (event.clientY - window.innerHeight / 2) * 0.001;
    
    // Update normalized device coordinates for Raycaster
    mouseVector.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouseVector.y = -(event.clientY / window.innerHeight) * 2 + 1;

    onDragMove(event.clientX, event.clientY);
});

// Touch Listeners
document.addEventListener('touchstart', (e) => {
    if (e.touches.length === 1) {
        onDragStart(e.touches[0].clientX, e.touches[0].clientY);
    }
}, { passive: false });

document.addEventListener('touchmove', (e) => {
    if (e.touches.length === 1) {
        onDragMove(e.touches[0].clientX, e.touches[0].clientY);
    }
}, { passive: false });

document.addEventListener('touchend', onDragEnd);
// --------------------------------

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
        
        // Apply Drag Rotation
        particles.rotation.y += particleRotationOffset;
        
        // Decay the offset (inertia/damping)
        particleRotationOffset *= 0.95; 
    } else {
        // Reset offset when not exploded
        particleRotationOffset = 0;
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

    // Update Photos
    const photoLerpFactor = 0.05;
    const targetOpacity = isExploded ? 1.0 : 0.0;
    
    photoObjects.forEach(sprite => {
        // Position
        const targetPos = isExploded ? sprite.userData.explosionPos : sprite.userData.treePos;
        
        // Add Floating Motion (Harry Potter style)
        // Only float when exploded and NOT expanded (inspected)
        let floatY = 0;
        if (isExploded && !sprite.userData.isExpanded) {
             floatY = Math.sin(time * sprite.userData.floatSpeed + sprite.userData.floatOffset) * sprite.userData.floatAmp;
        }

        // Lerp to target position
        sprite.position.x += (targetPos.x - sprite.position.x) * photoLerpFactor;
        sprite.position.y += ((targetPos.y + floatY) - sprite.position.y) * photoLerpFactor;
        sprite.position.z += (targetPos.z - sprite.position.z) * photoLerpFactor;
        
        // Scale
        // Increased zoom scale from 2.5 to 4.0 for larger view
        const scaleMult = sprite.userData.isExpanded ? 4.0 : 1.0;
        const targetScaleX = sprite.userData.baseScaleX * scaleMult;
        const targetScaleY = sprite.userData.baseScaleY * scaleMult;
        
        sprite.scale.x += (targetScaleX - sprite.scale.x) * 0.1;
        sprite.scale.y += (targetScaleY - sprite.scale.y) * 0.1;

        // Rotation (Straighten when expanded)
        const targetRotation = sprite.userData.isExpanded ? 0 : sprite.userData.randomRotation;
        sprite.material.rotation += (targetRotation - sprite.material.rotation) * 0.1;

        // Opacity
        sprite.material.opacity += (targetOpacity - sprite.material.opacity) * 0.05;
        // Optimization: set visible to false if opacity is very low
        sprite.visible = sprite.material.opacity > 0.01;
    });

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
