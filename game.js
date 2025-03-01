import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';

// Scene, Camera, Renderer
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

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
document.body.addEventListener('click', () => controls.lock());
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
document.addEventListener('keydown', (e) => {
  keys[e.code] = true;
  if (e.code === 'Space' && isGrounded) {
    verticalVelocity = jumpStrength;
    isGrounded = false;
  }
});
document.addEventListener('keyup', (e) => keys[e.code] = false);

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

// Shooting Event
document.addEventListener('mousedown', () => {
  if (controls.isLocked) {
    shoot();
    shootSound.play();
  }
});

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
  if (keys['KeyW']) velocity.z -= moveSpeed;
  if (keys['KeyS']) velocity.z += moveSpeed;
  if (keys['KeyA']) velocity.x -= moveSpeed;
  if (keys['KeyD']) velocity.x += moveSpeed;

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