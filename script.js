let scene, camera, renderer;
let zombies = [], bullets = [];
let keys = {};

let health = 200, maxHealth = 200;
let heals = 3;
let running = false;
let player = "GABO";

let velY = 0, gravity = -0.01, canJump = true;
let flashlight;

let isMobile = /Android|iPhone/i.test(navigator.userAgent);

// UI
const menu = document.getElementById("menu");
const loginPanel = document.getElementById("login");
const registerPanel = document.getElementById("register");
const introPanel = document.getElementById("intro");
const hud = document.getElementById("hud");
const gameOver = document.getElementById("gameOver");
const mobileControls = document.getElementById("mobileControls");

// Variables Controles Móviles
let joyMoveX = 0, joyMoveZ = 0;
let isJoystickActive = false;
let prevTouchX = 0;

// UI control
function hideAll() {
  menu.style.display = "none";
  loginPanel.classList.add("hidden");
  registerPanel.classList.add("hidden");
  introPanel.classList.add("hidden");
}
function showLogin() { hideAll(); loginPanel.classList.remove("hidden"); }
function showRegister() { hideAll(); registerPanel.classList.remove("hidden"); }
function backMenu() { hideAll(); menu.style.display = "flex"; }

// 🔐 REGISTRO
function register() {
  const user = document.getElementById("regUser").value.trim();
  const pass = document.getElementById("regPass").value.trim();
  if (user === "" || pass === "") return alert("Completa campos");
  if (localStorage.getItem("user_" + user)) return alert("Usuario ya existe");
  localStorage.setItem("user_" + user, pass);
  alert("Cuenta creada");
  backMenu();
}

// 🔐 LOGIN
function login() {
  const user = document.getElementById("loginUser").value.trim();
  const pass = document.getElementById("loginPass").value.trim();
  const saved = localStorage.getItem("user_" + user);
  if (saved === null) return alert("Usuario no existe");
  if (saved !== pass) return alert("Contraseña incorrecta");
  alert("Bienvenido " + user);
  hideAll();
  introPanel.classList.remove("hidden");
}

// start
function startGame() {
  player = document.getElementById("character").value;
  hideAll();
  hud.classList.remove("hidden");
  
  if (isMobile) {
    mobileControls.classList.remove("hidden");
    if (document.documentElement.requestFullscreen) {
      document.documentElement.requestFullscreen();
    }
  } else {
    document.body.requestPointerLock();
  }

  init();
  running = true;
}

// init
function init() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x050510);
  scene.fog = new THREE.FogExp2(0x050510, 0.025);

  camera = new THREE.PerspectiveCamera(75, innerWidth / innerHeight, 0.1, 1000);
  camera.position.y = 1.7;

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(innerWidth, innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  document.body.appendChild(renderer.domElement);

  scene.add(new THREE.AmbientLight(0x101020, 1.0)); 

  let moon = new THREE.DirectionalLight(0x8899ff, 1.2);
  moon.position.set(30, 50, 20);
  moon.castShadow = true;
  scene.add(moon);

  // LINTERNA MEJORADA[cite: 3]
  flashlight = new THREE.SpotLight(0xffffff, 12, 50, Math.PI / 5, 0.3, 1);
  flashlight.castShadow = true;
  camera.add(flashlight);
  camera.add(flashlight.target);
  flashlight.position.set(0, 0, 0);
  flashlight.target.position.set(0, 0, -1);
  scene.add(camera);

  // suelo
  let floor = new THREE.Mesh(
    new THREE.PlaneGeometry(300, 300),
    new THREE.MeshStandardMaterial({ color: 0x0f2a0f })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);

  for (let i = 0; i < 12; i++) createHouse();
  for (let i = 0; i < 30; i++) createTree();
  for (let i = 0; i < 8; i++) createLamp();

  // APARICIÓN MÁS RÁPIDA[cite: 3]
  setInterval(createZombie, 1200);

  document.addEventListener("mousemove", e => {
    if (!isMobile && document.pointerLockElement) {
      camera.rotation.y -= e.movementX * 0.002;
    }
  });

  document.addEventListener("keydown", e => {
    keys[e.key.toLowerCase()] = true;
    if (e.code === "Space" && canJump) { velY = 0.2; canJump = false; }
    if (e.key.toLowerCase() === "f") flashlight.visible = !flashlight.visible;
    if (e.key.toLowerCase() === "e" && heals > 0) {
      health = Math.min(maxHealth, health + 40);
      heals--;
    }
  });
  document.addEventListener("keyup", e => keys[e.key.toLowerCase()] = false);
  document.addEventListener("mousedown", shoot);
  
  window.addEventListener('resize', () => {
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
  });

  setupMobileControls();
  animate();
}

function setupMobileControls() {
  if (!isMobile) return;
  const joyArea = document.getElementById('joystickArea');
  const joyKnob = document.getElementById('joystickKnob');
  const lookArea = document.getElementById('lookArea');
  const shootBtn = document.getElementById('shootBtn');

  shootBtn.addEventListener('touchstart', (e) => { e.preventDefault(); shoot(); });

  lookArea.addEventListener('touchstart', e => { prevTouchX = e.touches[0].clientX; }, { passive: false });
  lookArea.addEventListener('touchmove', e => {
    e.preventDefault();
    let deltaX = e.touches[0].clientX - prevTouchX;
    camera.rotation.y -= deltaX * 0.005;
    prevTouchX = e.touches[0].clientX;
  }, { passive: false });

  joyArea.addEventListener('touchstart', (e) => { e.preventDefault(); isJoystickActive = true; handleJoyMove(e); }, { passive: false });
  joyArea.addEventListener('touchmove', handleJoyMove, { passive: false });
  joyArea.addEventListener('touchend', () => {
    isJoystickActive = false;
    joyKnob.style.transform = `translate(-50%, -50%)`;
    joyMoveX = 0; joyMoveZ = 0;
  });

  function handleJoyMove(e) {
    if (!isJoystickActive) return;
    let rect = joyArea.getBoundingClientRect();
    let touch = e.touches[0];
    let x = touch.clientX - rect.left - rect.width / 2;
    let y = touch.clientY - rect.top - rect.height / 2;
    let radius = rect.width / 2;
    let dist = Math.min(Math.sqrt(x * x + y * y), radius);
    let angle = Math.atan2(y, x);
    joyKnob.style.transform = `translate(calc(-50% + ${Math.cos(angle) * dist}px), calc(-50% + ${Math.sin(angle) * dist}px))`;
    joyMoveX = (Math.cos(angle) * dist) / radius;
    joyMoveZ = (Math.sin(angle) * dist) / radius;
  }
}

function move() {
  if (isMobile) {
    if (isJoystickActive) {
      camera.translateZ(joyMoveZ * 0.12);
      camera.translateX(joyMoveX * 0.12);
    }
  } else {
    let speed = keys["shift"] ? 0.22 : 0.12;
    if (keys["w"]) camera.translateZ(-speed);
    if (keys["s"]) camera.translateZ(speed);
    if (keys["a"]) camera.translateX(-speed);
    if (keys["d"]) camera.translateX(speed);
  }
}

function createHouse() {
  let base = new THREE.Mesh(new THREE.BoxGeometry(6, 4, 6), new THREE.MeshStandardMaterial({ color: 0x444444 }));
  base.position.set((Math.random() - 0.5) * 150, 2, (Math.random() - 0.5) * 150);
  base.castShadow = true; base.receiveShadow = true;
  let roof = new THREE.Mesh(new THREE.ConeGeometry(5, 2, 4), new THREE.MeshStandardMaterial({ color: 0xaa0000 }));
  roof.position.set(base.position.x, 5, base.position.z);
  roof.castShadow = true;
  scene.add(base, roof);
}

function createTree() {
  let trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.5, 3), new THREE.MeshStandardMaterial({ color: 0x3b2a1a }));
  trunk.position.set((Math.random() - 0.5) * 150, 1.5, (Math.random() - 0.5) * 150);
  trunk.castShadow = true; trunk.receiveShadow = true;
  let leaves = new THREE.Mesh(new THREE.SphereGeometry(2), new THREE.MeshStandardMaterial({ color: 0x0a3b0a }));
  leaves.position.set(trunk.position.x, 4, trunk.position.z);
  leaves.castShadow = true;
  scene.add(trunk, leaves);
}

function createLamp() {
  let x = (Math.random() - 0.5) * 150;
  let z = (Math.random() - 0.5) * 150;
  let pole = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 5), new THREE.MeshStandardMaterial({ color: 0x222222 }));
  pole.position.set(x, 2.5, z);
  pole.castShadow = true;
  let light = new THREE.PointLight(0xffeeaa, 2, 25);
  light.position.set(x, 5, z);
  let bulb = new THREE.Mesh(new THREE.SphereGeometry(0.3), new THREE.MeshBasicMaterial({ color: 0xffeeaa }));
  bulb.position.set(x, 5.2, z);
  scene.add(pole, light, bulb);
}

function createZombie() {
  let z = new THREE.Group();
  let body = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.7, 2), new THREE.MeshStandardMaterial({ color: 0x1c5a38 }));
  body.castShadow = true;
  let head = new THREE.Mesh(new THREE.SphereGeometry(0.5), new THREE.MeshStandardMaterial({ color: 0x44aa44 }));
  head.position.y = 1.5;
  head.castShadow = true;
  let eye1 = new THREE.Mesh(new THREE.SphereGeometry(0.1), new THREE.MeshBasicMaterial({ color: 0xff0000 }));
  let eye2 = eye1.clone();
  eye1.position.set(0.2, 1.6, 0.4); eye2.position.set(-0.2, 1.6, 0.4);
  z.add(body, head, eye1, eye2);
  z.position.set((Math.random() - 0.5) * 120, 1, (Math.random() - 0.5) * 120);
  z.health = 4;
  scene.add(z);
  zombies.push(z);
}

function shoot() {
  if (!running) return;
  let b = new THREE.Mesh(new THREE.SphereGeometry(0.1), new THREE.MeshBasicMaterial({ color: 0xffff00 }));
  b.position.copy(camera.position);
  let dir = new THREE.Vector3();
  camera.getWorldDirection(dir);
  b.velocity = dir.multiplyScalar(2.5);
  scene.add(b);
  bullets.push(b);
}

function update() {
  move();
  velY += gravity;
  camera.position.y += velY;
  if (camera.position.y <= 1.7) { camera.position.y = 1.7; velY = 0; canJump = true; }

  bullets.forEach((b, bi) => {
    b.position.add(b.velocity);
    zombies.forEach((z, zi) => {
      if (b.position.distanceTo(z.position) < 1.3) {
        z.health--;
        scene.remove(b);
        bullets.splice(bi, 1);
        if (z.health <= 0) { scene.remove(z); zombies.splice(zi, 1); }
      }
    });
    if (b.position.distanceTo(camera.position) > 100) { scene.remove(b); bullets.splice(bi, 1); }
  });

  zombies.forEach(z => {
    let dir = camera.position.clone().sub(z.position);
    dir.y = 0;
    dir.normalize();
    // ZOMBIES MÁS RÁPIDOS[cite: 3]
    z.position.add(dir.multiplyScalar(0.12));

    if (z.position.distanceTo(camera.position) < 1.5) {
      health -= 0.8; // Daño aumentado ligeramente[cite: 3]
      if (health <= 0) {
        running = false;
        gameOver.classList.remove("hidden");
        document.getElementById("gameOverText").textContent = player + " fue devorado 🧟";
      }
    }
  });

  document.getElementById("lifeBar").style.width = (health / maxHealth * 100) + "%";
}

function animate() {
  requestAnimationFrame(animate);
  if (running) {
    update();
    renderer.render(scene, camera);
  }
}