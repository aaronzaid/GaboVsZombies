let scene,camera,renderer;
let zombies=[],bullets=[];
let keys={};

let health=200,maxHealth=200;
let heals=3;
let running=false;
let player="GABO";

let velY=0,gravity=-0.01,canJump=true;

let flashlight;

let isMobile=/Android|iPhone/i.test(navigator.userAgent);

// UI
const menu=document.getElementById("menu");
const loginPanel=document.getElementById("login");
const registerPanel=document.getElementById("register");
const introPanel=document.getElementById("intro");
const hud=document.getElementById("hud");
const gameOver=document.getElementById("gameOver");

// UI funciones
function hideAll(){
  menu.style.display="none";
  loginPanel.classList.add("hidden");
  registerPanel.classList.add("hidden");
  introPanel.classList.add("hidden");
}
function showLogin(){hideAll();loginPanel.classList.remove("hidden");}
function showRegister(){hideAll();registerPanel.classList.remove("hidden");}
function backMenu(){hideAll();menu.style.display="flex";}

// login
function register(){localStorage.setItem(regUser.value,regPass.value);}
function login(){
  if(localStorage.getItem(loginUser.value)===loginPass.value){
    hideAll(); introPanel.classList.remove("hidden");
  }else alert("Error");
}

// start
function startGame(){
  player=document.getElementById("character").value;

  hideAll();
  hud.classList.remove("hidden");

  init();
  running=true;

  if(!isMobile) document.body.requestPointerLock();
}

// init
function init(){
  scene=new THREE.Scene();
  scene.background=new THREE.Color(0x050510);
  scene.fog=new THREE.Fog(0x050510,10,150);

  camera=new THREE.PerspectiveCamera(75,innerWidth/innerHeight,0.1,1000);
  camera.position.y=1.7;

  renderer=new THREE.WebGLRenderer({antialias:true});
  renderer.setSize(innerWidth,innerHeight);
  document.body.appendChild(renderer.domElement);

  // 🌙 iluminación
  scene.add(new THREE.AmbientLight(0x404070,2));

  let moon=new THREE.DirectionalLight(0x8899ff,2.5);
  moon.position.set(30,50,20);
  scene.add(moon);

  // 🔦 linterna
  flashlight=new THREE.SpotLight(0xffffff,6,100,Math.PI/6);
  camera.add(flashlight);
  camera.add(flashlight.target);
  scene.add(camera);

  // suelo
  let floor=new THREE.Mesh(
    new THREE.PlaneGeometry(300,300),
    new THREE.MeshStandardMaterial({color:0x0f3d0f})
  );
  floor.rotation.x=-Math.PI/2;
  scene.add(floor);

  // mapa
  for(let i=0;i<10;i++) createHouse();
  for(let i=0;i<20;i++) createTree();
  for(let i=0;i<6;i++) createLamp();

  setInterval(createZombie,1800);

  // mouse
  document.addEventListener("mousemove",e=>{
    if(!isMobile && document.pointerLockElement){
      camera.rotation.y-=e.movementX*0.002;
    }
  });

  // móvil mirar
  if(isMobile){
    let lastX=0;
    window.addEventListener("touchmove",e=>{
      let x=e.touches[0].clientX;
      camera.rotation.y -= (x-lastX)*0.005;
      lastX=x;
    });
  }

  document.addEventListener("keydown",e=>{
    keys[e.key.toLowerCase()]=true;

    if(e.code==="Space" && canJump){
      velY=0.2; canJump=false;
    }

    if(e.key==="f") flashlight.visible=!flashlight.visible;

    // ❤️ curación
    if(e.key==="e" && heals>0){
      health=Math.min(maxHealth,health+40);
      heals--;
      console.log("curas:",heals);
    }
  });

  document.addEventListener("keyup",e=>keys[e.key.toLowerCase()]=false);

  document.addEventListener("click",shoot);
  if(isMobile) shootBtn.addEventListener("touchstart",shoot);

  animate();
}

// movimiento
function move(){
  if(isMobile){
    camera.translateZ(-0.08);
  }else{
    let speed=keys["shift"]?0.18:0.1;
    if(keys["w"]) camera.translateZ(-speed);
    if(keys["s"]) camera.translateZ(speed);
    if(keys["a"]) camera.translateX(-speed);
    if(keys["d"]) camera.translateX(speed);
  }
}

// 🏠 casas
function createHouse(){
  let x=(Math.random()-0.5)*200;
  let z=(Math.random()-0.5)*200;

  let base=new THREE.Mesh(
    new THREE.BoxGeometry(6,4,6),
    new THREE.MeshStandardMaterial({color:0x555})
  );
  base.position.set(x,2,z);

  let roof=new THREE.Mesh(
    new THREE.ConeGeometry(5,2,4),
    new THREE.MeshStandardMaterial({color:0xaa0000})
  );
  roof.position.set(x,5,z);

  scene.add(base,roof);
}

// 🌲 árboles
function createTree(){
  let x=(Math.random()-0.5)*200;
  let z=(Math.random()-0.5)*200;

  let trunk=new THREE.Mesh(
    new THREE.CylinderGeometry(0.3,0.5,3),
    new THREE.MeshStandardMaterial({color:0x5a3d1c})
  );
  trunk.position.set(x,1.5,z);

  let leaves=new THREE.Mesh(
    new THREE.SphereGeometry(2),
    new THREE.MeshStandardMaterial({color:0x0f5c0f})
  );
  leaves.position.set(x,4,z);

  scene.add(trunk,leaves);
}

// 💡 faroles
function createLamp(){
  let x=(Math.random()-0.5)*200;
  let z=(Math.random()-0.5)*200;

  let pole=new THREE.Mesh(
    new THREE.CylinderGeometry(0.2,0.2,5),
    new THREE.MeshStandardMaterial({color:0x333})
  );
  pole.position.set(x,2.5,z);

  let light=new THREE.PointLight(0xffeeaa,2,20);
  light.position.set(x,5,z);

  scene.add(pole,light);
}

// 🧟 zombie mejorado
function createZombie(){
  let z=new THREE.Group();

  let body=new THREE.Mesh(
    new THREE.CylinderGeometry(0.5,0.7,2),
    new THREE.MeshStandardMaterial({color:0x2e8b57})
  );

  let head=new THREE.Mesh(
    new THREE.SphereGeometry(0.5),
    new THREE.MeshStandardMaterial({color:0x66ff66})
  );
  head.position.y=1.5;

  let eye1=new THREE.Mesh(
    new THREE.SphereGeometry(0.1),
    new THREE.MeshBasicMaterial({color:0xff0000})
  );
  let eye2=eye1.clone();

  eye1.position.set(0.2,1.6,0.4);
  eye2.position.set(-0.2,1.6,0.4);

  z.add(body,head,eye1,eye2);

  z.position.set((Math.random()-0.5)*100,1,(Math.random()-0.5)*100);
  z.health=4;

  scene.add(z);
  zombies.push(z);
}

// disparo
function shoot(){
  if(!running) return;

  let b=new THREE.Mesh(
    new THREE.SphereGeometry(0.1),
    new THREE.MeshBasicMaterial({color:"yellow"})
  );

  b.position.copy(camera.position);

  let dir=new THREE.Vector3();
  camera.getWorldDirection(dir);
  b.velocity=dir.multiplyScalar(2);

  scene.add(b);
  bullets.push(b);
}

// update
function update(){
  move();

  // salto
  velY+=gravity;
  camera.position.y+=velY;

  if(camera.position.y<=1.7){
    camera.position.y=1.7;
    velY=0;
    canJump=true;
  }

  // balas
  bullets.forEach((b,bi)=>{
    b.position.add(b.velocity);

    zombies.forEach((z,zi)=>{
      if(b.position.distanceTo(z.position)<1){
        z.health--;
        scene.remove(b);
        bullets.splice(bi,1);

        if(z.health<=0){
          scene.remove(z);
          zombies.splice(zi,1);
        }
      }
    });
  });

  // zombies
  zombies.forEach(z=>{
    let dir=camera.position.clone().sub(z.position).normalize();
    z.position.add(dir.multiplyScalar(0.04));

    if(z.position.distanceTo(camera.position)<1){
      health-=0.3;

      if(health<=0){
        running=false;
        gameOver.classList.remove("hidden");
        gameOverText.textContent=player+" murió por tonto 💀";
      }
    }
  });

  lifeBar.style.width=(health/maxHealth*100)+"%";
}

// loop
function animate(){
  requestAnimationFrame(animate);
  if(running){
    update();
    renderer.render(scene,camera);
  }
}