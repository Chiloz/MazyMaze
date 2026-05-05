import * as THREE from 'three';
const canvas=document.getElementById('game');
const levelEl=document.getElementById('level');
const timeEl=document.getElementById('time');
const tiltBtn=document.getElementById('tiltBtn');
const resetBtn=document.getElementById('resetBtn');
const nextBtn=document.getElementById('nextBtn');
const win=document.getElementById('win');
const continueBtn=document.getElementById('continueBtn');

let audioCtx; function initAudio(){if(!audioCtx)audioCtx=new(window.AudioContext||window.webkitAudioContext)();}
function bump(i=1){initAudio();const o=audioCtx.createOscillator(),g=audioCtx.createGain();o.type='triangle';o.frequency.setValueAtTime(220,audioCtx.currentTime);o.frequency.exponentialRampToValueAtTime(80,audioCtx.currentTime+0.07);g.gain.setValueAtTime(0.25*i,audioCtx.currentTime);g.gain.exponentialRampToValueAtTime(0.001,audioCtx.currentTime+0.07);o.connect(g).connect(audioCtx.destination);o.start();o.stop(audioCtx.currentTime+0.08);if(navigator.vibrate)navigator.vibrate(25);}
let rollSrc,rollGain;function startRoll(){initAudio();if(rollSrc)return;const buf=audioCtx.createBuffer(1,audioCtx.sampleRate*2,audioCtx.sampleRate);const d=buf.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1;rollSrc=audioCtx.createBufferSource();rollSrc.buffer=buf;rollSrc.loop=true;const f=audioCtx.createBiquadFilter();f.type='lowpass';f.frequency.value=600;rollGain=audioCtx.createGain();rollGain.gain.value=0;rollSrc.connect(f).connect(rollGain).connect(audioCtx.destination);rollSrc.start();}
function setRoll(v){if(rollGain)rollGain.gain.value=Math.min(0.12,v*0.12);}

const scene=new THREE.Scene();scene.background=new THREE.Color(0x06140a);
const camera=new THREE.PerspectiveCamera(45,innerWidth/innerHeight,0.1,1000);
const renderer=new THREE.WebGLRenderer({canvas,antialias:true});renderer.setSize(innerWidth,innerHeight);renderer.shadowMap.enabled=true;
window.addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);});
scene.add(new THREE.AmbientLight(0x90ffb0,0.6));
const sun=new THREE.DirectionalLight(0xffffff,1);sun.position.set(10,20,10);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);scene.add(sun);

const floorMat=new THREE.MeshStandardMaterial({color:0x0f3d1e,roughness:0.9});
const wallMat=new THREE.MeshStandardMaterial({color:0x1a7f37,roughness:0.7,metalness:0.1});
const ballMat=new THREE.MeshStandardMaterial({color:0xe8e8e8,metalness:0.8,roughness:0.2});
const goalMat=new THREE.MeshStandardMaterial({color:0xffd700,emissive:0x442200,emissiveIntensity:0.6});

let floor,ball,goal,wallsGroup;let grid,cols,rows;let ballPos={x:0,z:0},vel={x:0,z:0},radius=0.35;let keys={},tilt={x:0,y:0},running=false,startTime=0,currentLevel=0;

const LEVELS=[
[[1,1,1,1,1,1,1,1],[1,2,0,0,1,0,3,1],[1,0,1,0,1,0,1,1],[1,0,1,0,0,0,0,1],[1,0,1,1,1,1,0,1],[1,0,0,0,0,1,0,1],[1,1,1,0,0,0,0,1],[1,1,1,1,1,1,1,1]],
[[1,1,1,1,1,1,1,1,1],[1,2,0,1,0,0,0,0,1],[1,0,0,1,0,1,1,0,1],[1,0,1,1,0,1,3,0,1],[1,0,0,0,0,1,1,0,1],[1,1,1,1,0,0,0,0,1],[1,0,0,0,0,1,1,1,1],[1,0,1,1,0,0,0,0,1],[1,1,1,1,1,1,1,1,1]],
[[1,1,1,1,1,1,1,1,1,1],[1,2,0,0,0,1,0,0,0,1],[1,1,1,1,0,1,0,1,0,1],[1,0,0,0,0,1,0,1,0,1],[1,0,1,1,1,1,0,1,0,1],[1,0,0,0,0,0,0,1,0,1],[1,1,1,1,1,1,0,1,0,1],[1,0,0,0,0,0,0,0,0,1],[1,0,1,1,1,1,1,1,3,1],[1,1,1,1,1,1,1,1,1,1]],
[[1,1,1,1,1,1,1,1,1,1,1],[1,2,0,0,1,0,0,0,1,0,1],[1,0,1,0,1,0,1,0,1,0,1],[1,0,1,0,0,0,1,0,0,0,1],[1,0,1,1,1,1,1,1,1,0,1],[1,0,0,0,0,0,0,0,1,0,1],[1,1,1,1,1,0,1,0,1,0,1],[1,0,0,0,1,0,1,0,1,0,1],[1,0,1,0,1,0,1,0,1,3,1],[1,0,1,0,0,0,1,0,0,0,1],[1,1,1,1,1,1,1,1,1,1,1]]
];
function gen(w,h){const g=Array.from({length:h},()=>Array(w).fill(1));function carve(x,y){g[y][x]=0;const dirs=[[2,0],[-2,0],[0,2],[0,-2]].sort(()=>Math.random()-0.5);for(const[dx,dy]of dirs){const nx=x+dx,ny=y+dy;if(nx>0&&nx<w-1&&ny>0&&ny<h-1&&g[ny][nx]===1){g[y+dy/2][x+dx/2]=0;carve(nx,ny);}}}carve(1,1);g[1][1]=2;g[h-2][w-2]=3;return g;}
while(LEVELS.length<10){const s=11+LEVELS.length*2;LEVELS.push(gen(s,s));}

function clear(){[wallsGroup,floor,ball,goal].forEach(o=>o&&scene.remove(o));}
function build(n){clear();grid=LEVELS[n].map(r=>[...r]);rows=grid.length;cols=grid[0].length;levelEl.textContent=n+1;
 floor=new THREE.Mesh(new THREE.PlaneGeometry(cols,rows),floorMat);floor.rotation.x=-Math.PI/2;floor.position.set(cols/2-0.5,0,rows/2-0.5);floor.receiveShadow=true;scene.add(floor);
 wallsGroup=new THREE.Group();const box=new THREE.BoxGeometry(1,1,1);
 for(let y=0;y<rows;y++)for(let x=0;x<cols;x++)if(grid[y][x]===1){const m=new THREE.Mesh(box,wallMat);m.position.set(x,0.5,y);m.castShadow=true;m.receiveShadow=true;wallsGroup.add(m);}
 scene.add(wallsGroup);
 for(let y=0;y<rows;y++)for(let x=0;x<cols;x++){if(grid[y][x]===2)ballPos={x:x+0.5,z:y+0.5};if(grid[y][x]===3){goal=new THREE.Mesh(new THREE.CylinderGeometry(0.3,0.3,0.1,24),goalMat);goal.position.set(x+0.5,0.05,y+0.5);scene.add(goal);}}
 ball=new THREE.Mesh(new THREE.SphereGeometry(radius,32,32),ballMat);ball.castShadow=true;ball.position.set(ballPos.x,radius,ballPos.z);scene.add(ball);vel={x:0,z:0};
 const cx=cols/2-0.5,cz=rows/2-0.5,d=Math.max(cols,rows)*0.9;camera.position.set(cx+d*0.3,d*0.8,cz+d);camera.lookAt(cx,0,cz);
 startTime=performance.now();running=true;nextBtn.hidden=true;
}
function hit(nx,nz){const gx=Math.floor(nx),gz=Math.floor(nz);if(gx<0||gz<0||gx>=cols||gz>=rows)return true;return grid[gz][gx]===1;}
function update(dt){if(!running)return;const ax=(keys.ArrowLeft?-1:0)+(keys.ArrowRight?1:0)+tilt.x;const az=(keys.ArrowUp?-1:0)+(keys.ArrowDown?1:0)+tilt.y;vel.x+=ax*dt*8;vel.z+=az*dt*8;vel.x*=0.92;vel.z*=0.92;const s=Math.hypot(vel.x,vel.z);if(s>0.02){startRoll();setRoll(s/3);}else setRoll(0);let nx=ballPos.x+vel.x*dt,nz=ballPos.z+vel.z*dt;if(hit(nx,ballPos.z)){vel.x*=-0.4;nx=ballPos.x;bump(Math.min(1,Math.abs(vel.x)));}if(hit(ballPos.x,nz)){vel.z*=-0.4;nz=ballPos.z;bump(Math.min(1,Math.abs(vel.z)));}ballPos.x=nx;ballPos.z=nz;ball.position.set(nx,radius,nz);ball.rotation.x+=vel.z*dt*5;ball.rotation.z-=vel.x*dt*5;const gx=Math.floor(nx),gz=Math.floor(nz);if(grid[gz]&&grid[gz][gx]===3){running=false;setRoll(0);bump(1.2);win.hidden=false;if(currentLevel===9)win.querySelector('h2').textContent='You Beat All 10!';}timeEl.textContent=((performance.now()-startTime)/1000).toFixed(1);if(goal)goal.rotation.y+=dt;}
let last=0;function loop(t){const dt=Math.min(0.033,(t-last)/1000);last=t;update(dt);renderer.render(scene,camera);requestAnimationFrame(loop);}requestAnimationFrame(loop);
window.addEventListener('keydown',e=>{if(e.key.startsWith('Arrow')){keys[e.key]=true;e.preventDefault();initAudio();}});window.addEventListener('keyup',e=>{keys[e.key]=false;});
resetBtn.onclick=()=>build(currentLevel);nextBtn.onclick=()=>{currentLevel++;build(currentLevel);win.hidden=true;};continueBtn.onclick=()=>{if(currentLevel<9)currentLevel++;else currentLevel=0;build(currentLevel);win.hidden=true;};
function enable(){if(typeof DeviceOrientationEvent!=='undefined'&&typeof DeviceOrientationEvent.requestPermission==='function'){DeviceOrientationEvent.requestPermission().then(p=>{if(p==='granted'){window.addEventListener('deviceorientation',h);tiltBtn.style.display='none';}});}else{window.addEventListener('deviceorientation',h);tiltBtn.style.display='none';}}
function h(e){initAudio();const g=e.gamma||0,b=e.beta||0;tilt.x=Math.max(-1,Math.min(1,g/25));tilt.y=Math.max(-1,Math.min(1,b/25));}
if('ondeviceorientation' in window)tiltBtn.style.display='inline-block';tiltBtn.onclick=enable;
if('serviceWorker'in navigator){window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js'));}
build(0);
