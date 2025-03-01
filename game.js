import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';

// Scene, Camera, Renderer
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Check if device is mobile
const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

// Lighting
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);
const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
directionalLight.position.set(0, 10, 0);
scene.add(directionalLight);

// Floor
const floorGeometry = new THREE.PlaneGeometry(100, 100);
const floorMaterial = new THREE.MeshBasicMaterial({ color: 0xaaaaaa });
const floor = new THREE.Mesh(floorGeometry, floorMaterial);
floor.rotation.x = -Math.PI / 2;
scene.add(floor);

// Walls
const wallMaterial = new THREE.MeshBasicMaterial({ color: 0x555555 });
const wallGeometry = new THREE.BoxGeometry(10, 5, 1);
const walls = [
  { position: [0, 2.5, -20], rotation: [0, 0, 0] },
  { position: [0, 2.5, 20], rotation: [0, 0, 0] },
  { position: [-20, 2.5, 0], rotation: [0, Math.PI / 2, 0] },
  { position: [20, 2.5, 0], rotation: [0, Math.PI / 2, 0] }
].map(w => {
  const wall = new THREE.Mesh(wallGeometry, wallMaterial);
  wall.position.set(...w.position);
  wall.rotation.set(...w.rotation);
  scene.add(wall);
  return wall;
});

// Pointer Lock Controls
const controls = new PointerLockControls(camera, document.body);

// Modified click event for desktop to handle both desktop and mobile
if (!isMobile) {
  document.body.addEventListener('click', () => controls.lock());
}

scene.add(controls.getObject());
camera.position.y = 1;

// Movement Variables
const moveSpeed = 0.1;
const gravity = 0.005;
const jumpStrength = 0.2;
let velocity = new THREE.Vector3();
let verticalVelocity = 0;
let isGrounded = true;
const keys = {};

// Desktop keyboard controls
document.addEventListener('keydown', (e) => {
  keys[e.code] = true;
  if (e.code === 'Space' && isGrounded) {
    verticalVelocity = jumpStrength;
    isGrounded = false;
  }
});
document.addEventListener('keyup', (e) => keys[e.code] = false);

// Mobile touch controls
const joystickArea = document.getElementById('joystickArea');
const shootBtn = document.getElementById('shootBtn');

// Virtual joystick variables
let joystickActive = false;
let joystickOrigin = { x: 0, y: 0 };
let joystickPosition = { x: 0, y: 0 };
const joystickThumb = document.createElement('div');

if (isMobile) {
  // Create joystick thumb
  joystickThumb.style.position = 'absolute';
  joystickThumb.style.width = '40px';
  joystickThumb.style.height = '40px';
  joystickThumb.style.borderRadius = '50%';
  joystickThumb.style.backgroundColor = 'rgba(255, 255, 255, 0.7)';
  joystickThumb.style.top = '50%';
  joystickThumb.style.left = '50%';
  joystickThumb.style.transform = 'translate(-50%, -50%)';
  joystickThumb.style.pointerEvents = 'none';
  joystickArea.appendChild(joystickThumb);

  // Touch events for joystick
  joystickArea.addEventListener('touchstart', handleJoystickStart, false);
  joystickArea.addEventListener('touchmove', handleJoystickMove, false);
  joystickArea.addEventListener('touchend', handleJoystickEnd, false);

  // Shoot button for mobile
  shootBtn.addEventListener('touchstart', (e) => {
    e.preventDefault();
    shoot();
    shootSound.play();
  }, false);

  // Setup device orientation for looking around
  window.addEventListener('deviceorientation', handleOrientation, true);

  // Prevent default touch actions on the canvas
  renderer.domElement.addEventListener('touchstart', (e) => e.preventDefault(), { passive: false });
  renderer.domElement.addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });
}

// Handle joystick touch start
function handleJoystickStart(e) {
  e.preventDefault();
  const touch = e.touches[0];
  const rect = joystickArea.getBoundingClientRect();
  joystickActive = true;
  joystickOrigin = {
    x: touch.clientX - rect.left,
    y: touch.clientY - rect.top
  };
  joystickPosition = { ...joystickOrigin };
  updateJoystickThumb();
}

// Handle joystick touch move
function handleJoystickMove(e) {
  e.preventDefault();
  if (!joystickActive) return;
  
  const touch = e.touches[0];
  const rect = joystickArea.getBoundingClientRect();
  joystickPosition = {
    x: touch.clientX - rect.left,
    y: touch.clientY - rect.top
  };
  
  // Calculate distance from center
  const dx = joystickPosition.x - joystickOrigin.x;
  const dy = joystickPosition.y - joystickOrigin.y;
  const distance = Math.sqrt(dx * dx + dy * dy);
  
  // Limit distance to joystick radius
  const maxRadius = 40;
  if (distance > maxRadius) {
    joystickPosition.x = joystickOrigin.x + dx * maxRadius / distance;
    joystickPosition.y = joystickOrigin.y + dy * maxRadius / distance;
  }
  
  updateJoystickThumb();
}

// Handle joystick touch end
function handleJoystickEnd(e) {
  e.preventDefault();
  joystickActive = false;
  joystickPosition = { ...joystickOrigin };
  updateJoystickThumb();
}

// Update joystick thumb position
function updateJoystickThumb() {
  joystickThumb.style.left = `${joystickPosition.x}px`;
  joystickThumb.style.top = `${joystickPosition.y}px`;
}

// Handle device orientation for mobile look controls
let deviceOrientationControls = {
  alpha: 0,
  beta: 0,
  gamma: 0,
  initialized: false,
  initialBeta: 0,
  initialGamma: 0
};

function handleOrientation(e) {
  if (!isMobile || !e.beta || !e.gamma) return;
  
  if (!deviceOrientationControls.initialized) {
    deviceOrientationControls.initialized = true;
    deviceOrientationControls.initialBeta = e.beta;
    deviceOrientationControls.initialGamma = e.gamma;
  }
  
  deviceOrientationControls.beta = e.beta - deviceOrientationControls.initialBeta;
  deviceOrientationControls.gamma = e.gamma - deviceOrientationControls.initialGamma;
}

// Scoring System
let score = 0;
const scoreDisplay = document.createElement('div');
scoreDisplay.style.position = 'absolute';
scoreDisplay.style.top = '10px';
scoreDisplay.style.right = '10px';
scoreDisplay.style.color = 'white';
scoreDisplay.style.fontSize = '20px';
document.body.appendChild(scoreDisplay);
function updateScore(points) {
  score += points;
  scoreDisplay.innerText = `Score: ${score}`;
}

// Enemy Classes
class Enemy {
  constructor() {
    this.mesh = new THREE.Mesh(
      new THREE.BoxGeometry(1, 1, 1),
      new THREE.MeshBasicMaterial({ color: 0xff0000 }) // Red
    );
    this.health = 100;
    this.speed = 0.05;
  }
  update(playerPos) {
    const direction = new THREE.Vector3().subVectors(playerPos, this.mesh.position).normalize();
    this.mesh.position.add(direction.multiplyScalar(this.speed));
  }
}

class FastEnemy extends Enemy {
  constructor() {
    super();
    this.speed = 0.1;
    this.mesh.material.color.set(0x00ff00); // Green
  }
}

class StrongEnemy extends Enemy {
  constructor() {
    super();
    this.health = 200;
    this.mesh.material.color.set(0x0000ff); // Blue
  }
}

// Enemies
const enemies = [];
function spawnEnemy() {
  const types = [Enemy, FastEnemy, StrongEnemy];
  const EnemyType = types[Math.floor(Math.random() * types.length)];
  const enemy = new EnemyType();
  enemy.mesh.position.set(Math.random() * 40 - 20, 0.5, Math.random() * 20 - 10);
  scene.add(enemy.mesh);
  enemies.push(enemy);
}
for (let i = 0; i < 3; i++) spawnEnemy();

// Bullets
const bullets = [];
const bulletGeometry = new THREE.SphereGeometry(0.1, 8, 8);
const bulletMaterial = new THREE.MeshBasicMaterial({ color: 0xffff00 }); // Yellow
function shoot() {
  const bullet = new THREE.Mesh(bulletGeometry, bulletMaterial);
  bullet.position.copy(camera.position);
  const direction = new THREE.Vector3();
  camera.getWorldDirection(direction);
  bullet.velocity = direction.clone().multiplyScalar(0.5);
  scene.add(bullet);
  bullets.push(bullet);
}

// Sound Effects (Replace with actual audio files)
const shootSound = new Audio('shoot.wav');
const defeatSound = new Audio('defeat.wav');

// Desktop Shooting Event (Only for non-mobile)
if (!isMobile) {
  document.addEventListener('mousedown', () => {
    if (controls.isLocked) {
      shoot();
      shootSound.play();
    }
  });
}

// Minimap
const minimapCanvas = document.createElement('canvas');
minimapCanvas.width = 200;
minimapCanvas.height = 200;
minimapCanvas.style.position = 'absolute';
minimapCanvas.style.top = '10px';
minimapCanvas.style.left = '10px';
minimapCanvas.style.backgroundColor = '#90EE90'; // Light green radar background
document.body.appendChild(minimapCanvas);
const minimapCtx = minimapCanvas.getContext('2d');

// Animation Loop
function animate() {
  requestAnimationFrame(animate);
  
  // Player Movement
  velocity.x = 0;
  velocity.z = 0;
  
  // Keyboard movement for desktop
  if (keys['KeyW']) velocity.z -= moveSpeed;
  if (keys['KeyS']) velocity.z += moveSpeed;
  if (keys['KeyA']) velocity.x -= moveSpeed;
  if (keys['KeyD']) velocity.x += moveSpeed;
  
  // Joystick movement for mobile
  if (isMobile && joystickActive) {
    const dx = joystickPosition.x - joystickOrigin.x;
    const dy = joystickPosition.y - joystickOrigin.y;
    
    // Calculate normalized direction
    const length = Math.sqrt(dx * dx + dy * dy);
    if (length > 0) {
      // Forward/backward movement (dy)
      velocity.z = (dy / length) * moveSpeed;
      
      // Left/right movement (dx)
      velocity.x = (dx / length) * moveSpeed;
    }
    
    // Apply device orientation for looking around if initialized
    if (deviceOrientationControls.initialized) {
      // Use beta (up/down) and gamma (left/right) to rotate the camera
      const rotationX = THREE.MathUtils.degToRad(deviceOrientationControls.gamma * 0.5);
      const rotationY = THREE.MathUtils.degToRad(deviceOrientationControls.beta * 0.5);
      
      camera.rotation.y -= rotationX;
      
      // Limit vertical rotation to avoid flipping
      camera.rotation.x = Math.max(-Math.PI/4, Math.min(Math.PI/4, camera.rotation.x - rotationY));
    }
  }
  
  verticalVelocity -= gravity;
  controls.getObject().position.y += verticalVelocity;
  if (controls.getObject().position.y <= 1) {
    controls.getObject().position.y = 1;
    verticalVelocity = 0;
    isGrounded = true;
  }
  controls.getObject().translateX(velocity.x);
  controls.getObject().translateZ(velocity.z);
  
  // Update Bullets
  for (let bIndex = bullets.length - 1; bIndex >= 0; bIndex--) {
    const bullet = bullets[bIndex];
    bullet.position.add(bullet.velocity);
    for (let eIndex = enemies.length - 1; eIndex >= 0; eIndex--) {
      const enemy = enemies[eIndex];
      if (bullet.position.distanceTo(enemy.mesh.position) < 1) {
        enemy.health -= 50;
        if (enemy.health <= 0) {
          defeatSound.play();
          scene.remove(enemy.mesh);
          enemies.splice(eIndex, 1);
          updateScore(10);
          spawnEnemy();
        }
        scene.remove(bullet);
        bullets.splice(bIndex, 1);
        break; // Bullet can only hit one enemy
      }
    }
    // Remove bullets out of bounds
    if (bullet.position.x < -50 || bullet.position.x > 50 || bullet.position.z < -50 || bullet.position.z > 50) {
      scene.remove(bullet);
      bullets.splice(bIndex, 1);
    }
  }
  
  // Update Enemies
  const playerPos = controls.getObject().position;
  enemies.forEach(enemy => enemy.update(playerPos));
  
  // Draw Minimap
  minimapCtx.fillStyle = '#90EE90';
  minimapCtx.fillRect(0, 0, minimapCanvas.width, minimapCanvas.height);
  minimapCtx.fillStyle = 'green';
  minimapCtx.fillRect(98, 98, 5, 5); // Player at center
  enemies.forEach(enemy => {
    const relativeX = 100 + (enemy.mesh.position.x - playerPos.x) * 2;
    const relativeZ = 100 + (enemy.mesh.position.z - playerPos.z) * 2;
    minimapCtx.fillStyle = `#${enemy.mesh.material.color.getHexString()}`;
    minimapCtx.fillRect(relativeX, relativeZ, 3, 3);
  });
  
  renderer.render(scene, camera);
}
animate();

// Window Resize Handler
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});