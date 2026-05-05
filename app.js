import * as THREE from 'three';
const canvas=document.getElementById('game'),mini=document.getElementById('mini'),mctx=mini.getContext('2d');
const levelEl=document.getElementById('level'),timeEl=document.getElementById('time');
const camSel=document.getElementById('cam'),tiltBtn=document.getElementById('tiltBtn');
const resetBtn=document.getElementById('resetBtn'),nextBtn=document.getElementById('nextBtn'),win=document.getElementById('win'),cont=document.getElementById('continueBtn');

let audio; const initA=()=>{if(!audio)audio=new (window.AudioContext||window.webkitAudioContext)()};
const bump=i=>{initA();const o=audio.createOscillator(),g=audio.createGain();o.type='triangle';o.frequency.setValueAtTime(200,audio.currentTime);o.frequency.exponentialRampToValueAtTime(70,audio.currentTime+.07);g.gain.setValueAtTime(.22*i,audio.currentTime);g.gain.exponentialRampToValueAtTime(.001,audio.currentTime+.07);o.connect(g).connect(audio.destination);o.start();o.stop(audio.currentTime+.08);if(navigator.vibrate)navigator.vibrate(20)};

const scene=new THREE.Scene();scene.background=new THREE.Color(0x041008);
const cam=new THREE.PerspectiveCamera(50,innerWidth/innerHeight,.1,1000);
const ren=new THREE.WebGLRenderer({canvas,antialias:true});ren.setSize(innerWidth,innerHeight);ren.shadowMap.enabled=true;
addEventListener('resize',()=>{cam.aspect=innerWidth/innerHeight;cam.updateProjectionMatrix();ren.setSize(innerWidth,innerHeight)});

scene.add(new THREE.AmbientLight(0xafffc0,.55));
const sun=new THREE.DirectionalLight(0xffffff,1);sun.position.set(12,18,10);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);scene.add(sun);

const floorM=new THREE.MeshStandardMaterial({color:0x0c2e18,roughness:.9});
const wallM=new THREE.MeshStandardMaterial({color:0x1c8c3e,roughness:.6,metalness:.15});
const ballM=new THREE.MeshStandardMaterial({color:0xf0f0f0,metalness:.9,roughness:.15});
const goalM=new THREE.MeshStandardMaterial({color:0xffd700,emissive:0x553300,emissiveIntensity:.7});

let grid,cols,rows,floor,ball,goal,walls,ballPos={x:0,z:0},vel={x:0,z:0},r=.33,keys={},tilt={x:0,y:0},run=false,t0=0,lev=0,yaw=0,hold=false;

const LEVELS=[
[[1,1,1,1,1,1,1,1],[1,2,0,0,1,0,3,1],[1,0,1,0,1,0,1,1],[1,0,1,0,0,0,0,1],[1,0,1,1,1,1,0,1],[1,0,0,0,0,1,0,1],[1,1,1,0,0,0,0,1],[1,1,1,1,1,1,1,1]],
[[1,1,1,1,1,1,1,1,1],[1,2,0,1,0,0,0,0,1],[1,0,0,1,0,1,1,0,1],[1,0,1,1,0,1,3,0,1],[1,0,0,0,0,1,1,0,1],[1,1,1,1,0,0,0,0,1],[1,0,0,0,0,1,1,1,1],[1,0,1,1,0,0,0,0,1],[1,1,1,1,1,1,1,1,1]],
[[1,1,1,1,1,1,1,1,1,1],[1,2,0,0,0,1,0,0,0,1],[1,1,1,1,0,1,0,1,0,1],[1,0,0,0,0,1,0,1,0,1],[1,0,1,1,1,1,0,1,0,1],[1,0,0,0,0,0,0,1,0,1],[1,1,1,1,1,1,0,1,0,1],[1,0,0,0,0,0,0,0,0,1],[1,0,1,1,1,1,1,1,3,1],[1,1,1,1,1,1,1,1,1,1]],
[[1,1,1,1,1,1,1,1,1,1,1],[1,2,0,0,1,0,0,0,1,0,1],[1,0,1,0,1,0,1,0,1,0,1],[1,0,1,0,0,0,1,0,0,0,1],[1,0,1,1,1,1,1,1,1,0,1],[1,0,0,0,0,0,0,0,1,0,1],[1,1,1,1,1,0,1,0,1,0,1],[1,0,0,0,1,0,1,0,1,0,1],[1,0,1,0,1,0,1,0,1,3,1],[1,0,1,0,0,0,1,0,0,0,1],[1,1,1,1,1,1,1,1,1,1,1]]
];
function gen(w,h){const g=Array.from({length:h},()=>Array(w).fill(1));function c(x,y){g[y][x]=0;[[2,0],[-2,0],[0,2],[0,-2]].sort(()=>Math.random()-.5).forEach(([dx,dy])=>{const nx=x+dx,ny=y+dy;if(nx>0&&nx<w-1&&ny>0&&ny<h-1&&g[ny][nx]){g[y+dy/2][x+dx/2]=0;c(nx,ny)}})}c(1,1);g[1][1]=2;g[h-2][w-2]=3;return g}
while(LEVELS.length<10){const s=13+(LEVELS.length-4)*2;LEVELS.push(gen(s,s))}

function clear(){[walls,floor,ball,goal].forEach(o=>o&&scene.remove(o))}
function build(n){clear();grid=LEVELS[n].map(r=>[...r]);rows=grid.length;cols=grid[0].length;levelEl.textContent=n+1;
 floor=new THREE.Mesh(new THREE.PlaneGeometry(cols,rows),floorM);floor.rotation.x=-Math.PI/2;floor.position.set(cols/2-.5,0,rows/2-.5);floor.receiveShadow=true;scene.add(floor);
 walls=new THREE.Group();const b=new THREE.BoxGeometry(1,1,1);
 for(let y=0;y<rows;y++)for(let x=0;x<cols;x++)if(grid[y][x]===1){const m=new THREE.Mesh(b,wallM);m.position.set(x,.5,y);m.castShadow=m.receiveShadow=true;walls.add(m)}
 scene.add(walls);
 for(let y=0;y<rows;y++)for(let x=0;x<cols;x++){if(grid[y][x]===2)ballPos={x:x+.5,z:y+.5};if(grid[y][x]===3){goal=new THREE.Mesh(new THREE.CylinderGeometry(.28,.28,.12,20),goalM);goal.position.set(x+.5,.06,y+.5);scene.add(goal)}}
 ball=new THREE.Mesh(new THREE.SphereGeometry(r,32,32),ballM);ball.castShadow=true;ball.position.set(ballPos.x,r,ballPos.z);scene.add(ball);vel={x:0,z:0};t0=performance.now();run=true;nextBtn.hidden=true;
}
const isWall=(x,z)=>{const gx=Math.floor(x),gz=Math.floor(z);return gx<0||gz<0||gx>=cols||gz>=rows||grid[gz][gx]===1};

function update(dt){
 if(!run)return;
 const ax=(keys.ArrowLeft?-1:0)+(keys.ArrowRight?1:0)+tilt.x;
 const az=(keys.ArrowUp?-1:0)+(keys.ArrowDown?1:0)+tilt.y;
 let fx=ax, fz=az;
 if(camSel.value==='first'&&hold){fx+=Math.sin(yaw)*1.5; fz+=Math.cos(yaw)*1.5}
 vel.x+=fx*dt*7; vel.z+=fz*dt*7; vel.x*=0.91; vel.z*=0.91;
 let nx=ballPos.x+vel.x*dt, nz=ballPos.z+vel.z*dt;
 const rr=r*0.98;
 if(isWall(nx+Math.sign(vel.x)*rr,ballPos.z)||isWall(nx+Math.sign(vel.x)*rr,ballPos.z+rr*.6)||isWall(nx+Math.sign(vel.x)*rr,ballPos.z-rr*.6)){vel.x*=-0.35;nx=ballPos.x;bump(.7)}
 if(isWall(ballPos.x,nz+Math.sign(vel.z)*rr)||isWall(ballPos.x+rr*.6,nz+Math.sign(vel.z)*rr)||isWall(ballPos.x-rr*.6,nz+Math.sign(vel.z)*rr)){vel.z*=-0.35;nz=ballPos.z;bump(.7)}
 ballPos.x=nx; ballPos.z=nz; ball.position.set(nx,r,nz); ball.rotation.x+=vel.z*dt*4; ball.rotation.z-=vel.x*dt*4;
 if(grid[Math.floor(nz)][Math.floor(nx)]===3){run=false;bump(1);win.hidden=false}
 timeEl.textContent=((performance.now()-t0)/1000).toFixed(1);
 if(goal)goal.rotation.y+=dt;
 // camera
 const mode=camSel.value, bx=ballPos.x, bz=ballPos.z;
 if(mode==='top'){cam.position.set(bx,Math.max(cols,rows)*1.1,bz+0.01);cam.lookAt(bx,0,bz)}
 else if(mode==='side'){cam.position.set(bx+Math.max(cols,rows)*0.7,5,bz);cam.lookAt(bx,0,bz)}
 else if(mode==='follow'){const tx=bx - vel.x*2, tz=bz - vel.z*2; cam.position.lerp(new THREE.Vector3(tx,4,tz+4),0.08); cam.lookAt(bx,0,bz)}
 else { // first
  cam.position.set(bx,r*1.6,bz); cam.rotation.set(0,yaw,0); ball.visible=false;
 }
 if(mode!=='first')ball.visible=true;
 // minimap
 mctx.clearRect(0,0,90,90); const sx=90/cols, sy=90/rows; mctx.fillStyle='#0a2'; for(let y=0;y<rows;y++)for(let x=0;x<cols;x++)if(grid[y][x]===1)mctx.fillRect(x*sx,y*sy,sx,sy); mctx.fillStyle='#fd0'; const gx=grid.flat().findIndex((v,i)=>v===3); const gy=Math.floor(gx/cols), gxx=gx%cols; mctx.beginPath(); mctx.arc(gxx*sx+sx/2,gy*sy+sy/2,3,0,7); mctx.fill(); mctx.fillStyle='#fff'; mctx.beginPath(); mctx.arc(ballPos.x*sx,ballPos.z*sy,3,0,7); mctx.fill();
}

let last=0;function loop(t){const dt=Math.min(.033,(t-last)/1000);last=t;update(dt);ren.render(scene,cam);requestAnimationFrame(loop)}requestAnimationFrame(loop);
addEventListener('keydown',e=>{if(e.key.startsWith('Arrow')){keys[e.key]=true;e.preventDefault();initA()}});addEventListener('keyup',e=>keys[e.key]=false);
resetBtn.onclick=()=>build(lev);nextBtn.onclick=()=>{lev++;build(lev);win.hidden=true};cont.onclick=()=>{lev=lev<9?lev+1:0;build(lev);win.hidden=true};
canvas.addEventListener('pointerdown',e=>{hold=true;initA()});addEventListener('pointerup',()=>hold=false);canvas.addEventListener('pointermove',e=>{if(camSel.value==='first'&&e.buttons)yaw-=e.movementX*0.004});
function en(){if(typeof DeviceOrientationEvent!=='undefined'&&DeviceOrientationEvent.requestPermission){DeviceOrientationEvent.requestPermission().then(p=>{if(p==='granted'){addEventListener('deviceorientation',h);tiltBtn.style.display='none'}})}else{addEventListener('deviceorientation',h);tiltBtn.style.display='none'}}
function h(e){initA();tilt.x=Math.max(-1,Math.min(1,(e.gamma||0)/25));tilt.y=Math.max(-1,Math.min(1,(e.beta||0)/25))}
if('ondeviceorientation'in window)tiltBtn.style.display='inline-block';tiltBtn.onclick=en;
if('serviceWorker'in navigator)addEventListener('load',()=>navigator.serviceWorker.register('./sw.js'));
build(0);
