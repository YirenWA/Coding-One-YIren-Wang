import { 
  WebGLRenderer, ACESFilmicToneMapping, sRGBEncoding, 
  Color, CylinderGeometry, 
  RepeatWrapping, DoubleSide, BoxGeometry, Mesh, PointLight, MeshPhysicalMaterial, PerspectiveCamera,
  Scene, PMREMGenerator, PCFSoftShadowMap,
  Vector2, TextureLoader, SphereGeometry, MeshStandardMaterial
} from 'https://cdn.skypack.dev/three@0.137';
import { OrbitControls } from 'https://cdn.skypack.dev/three-stdlib@2.8.5/controls/OrbitControls';
import { RGBELoader } from 'https://cdn.skypack.dev/three-stdlib@2.8.5/loaders/RGBELoader';
import { mergeBufferGeometries } from 'https://cdn.skypack.dev/three-stdlib@2.8.5/utils/BufferGeometryUtils';
import SimplexNoise from 'https://cdn.skypack.dev/simplex-noise@3.0.0';

// envmap https://polyhaven.com/a/herkulessaulen



//SCENE
const scene = new Scene();
scene.background = new Color("#000000");

//CAMERA
const camera = new PerspectiveCamera(30, innerWidth / innerHeight, 0.1, 1000);
camera.position.set(60,62,50);

const renderer = new WebGLRenderer({ antialias: true });
renderer.setSize(innerWidth, innerHeight);
renderer.toneMapping = ACESFilmicToneMapping;
renderer.outputEncoding = sRGBEncoding;
renderer.physicallyCorrectLights = true;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

//LIGHT
const light = new PointLight( new Color("#FF7577").convertSRGBToLinear().convertSRGBToLinear(), 80, 200 );
light.position.set(5, 15, 10);

light.castShadow = true; 
light.shadow.mapSize.width = 52; 
light.shadow.mapSize.height = 512; 
light.shadow.camera.near = 0.5; 
light.shadow.camera.far = 200; 
scene.add( light );

const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0,0,0);
controls.dampingFactor = 0.05;
controls.enableDamping = true;

let pmrem = new PMREMGenerator(renderer);
pmrem.compileEquirectangularShader();

let envmap;

const MAX_HEIGHT = 8;


//TEXTURES
(async function() {
  let envmapTexture = await new RGBELoader().loadAsync("textures/envmap.hdr");
  let rt = pmrem.fromEquirectangular(envmapTexture);
  envmap = rt.texture;

  let textures = {
    dirt: await new TextureLoader().loadAsync("textures/SD.png"),
    dirt2: await new TextureLoader().loadAsync("textures/Textures_Coral.jpg"),
    Coral: await new TextureLoader().loadAsync("textures/Textures_Coral.jpg"),
    sand: await new TextureLoader().loadAsync("textures/Textures_Coral1.jpg"),
    water: await new TextureLoader().loadAsync("textures/sea.png"),
    Coral1: await new TextureLoader().loadAsync("textures/Textures_Coral1.jpg"),
    tree: await new TextureLoader().loadAsync("textures/Textures_Coral1.jpg"),
  };

  const simplex = new SimplexNoise(); // optional seed as a string parameter

  for(let i = -10; i <= 20; i++) {
    for(let j = -10; j <= 20; j++) {
      let position = tileToPosition(i, j);

      if(position.length() > 24) continue;
      let noise = (simplex.noise3D(i * 0.08, j * 0.15, Math.asin(i * 0.02)) + 0.5) * 0.82;
      noise = Math.tan(noise, 1.2);
      hex(noise * MAX_HEIGHT, position, envmap);
    } 
  }

  let Coral1Mesh = hexMesh(Coral1Geo, textures.Coral1);
  let CoralMesh = hexMesh(CoralGeo, textures.Coral);
  let dirt2Mesh = hexMesh(dirt2Geo, textures.dirt2);
  let dirtMesh  = hexMesh(dirtGeo, textures.dirt);
  let sandMesh  = hexMesh(sandGeo, textures.sand);
  scene.add(Coral1Mesh, dirtMesh, dirt2Mesh, sandMesh, CoralMesh);

  let seaTexture = textures.water;
  seaTexture.repeat = new Vector2(1, 0.7);
  seaTexture.wrapS = RepeatWrapping;
  seaTexture.wrapT = RepeatWrapping;

  let seaMesh = new Mesh(
    new SphereGeometry(20, 34, MAX_HEIGHT * 5, 1500),
    new MeshPhysicalMaterial({
      envMap: envmap,
      color: new Color("#55aaff").convertSRGBToLinear().multiplyScalar(3),
      ior: 1.4,
      transmission: 1,
      transparent: true,
      thickness: 1,
      envMapIntensity: 0.2, 
      roughness: 1.05,
      metalness: 0.02,
      roughnessMap: seaTexture,
      metalnessMap: seaTexture,
    })
  );
  seaMesh.receiveShadow = true;
  seaMesh.rotation.y = -Math.PI * 0.1 * 0.2;
  seaMesh.position.set(0, MAX_HEIGHT * 0.2, 0);
  scene.add(seaMesh);


  let mapContainer = new Mesh(
    new SphereGeometry(1, 15, MAX_HEIGHT * 0.25, 50, 1, true),
    new MeshPhysicalMaterial({
      envMap: 1,
      envMapIntensity: 10, 
      side: DoubleSide,
    })
  );
  mapContainer.receiveShadow = true;
  mapContainer.rotation.y = -Math.PI * 0.333 * 0.5;
  mapContainer.position.set(0, MAX_HEIGHT * 0.125, 0);
  scene.add(mapContainer);


  let mapFloor = new Mesh();
  mapFloor.receiveShadow = true;
  mapFloor.position.set(0, -MAX_HEIGHT * 0.05, 0);
  scene.add(mapFloor);

  clouds();
  renderer.setAnimationLoop(() => {
    controls.update();
    renderer.render(scene, camera);
  });
})();

function tileToPosition(tileX, tileY) {
  return new Vector2((tileX + (tileY % 2) * 0.5) * 1.77, tileY * 1.535);
}

function hexGeometry(height, position) {
  let geo  = new CylinderGeometry(0.15, 0.8, Math.abs( height*0.6), 10, 10, false);  
  geo.translate(position.x, height * 0.6, position.y);
  return geo;
}

const Coral1_HEIGHT = MAX_HEIGHT * 0.8;
const DIRT_HEIGHT = MAX_HEIGHT * 0.7;
const Coral_HEIGHT = MAX_HEIGHT * 0.5;
const SAND_HEIGHT = MAX_HEIGHT * 0.3;
const DIRT2_HEIGHT = MAX_HEIGHT * 0;

let Coral1Geo = new BoxGeometry(0,0,0);
let dirtGeo = new BoxGeometry(0,0,0);
let dirt2Geo = new BoxGeometry(0,0,0);
let sandGeo = new BoxGeometry(0,0,0);
let CoralGeo = new BoxGeometry(0,0,0);

function hex(height, position) {
  let geo = hexGeometry(height, position);

  if(height > Coral1_HEIGHT) {
    Coral1Geo = mergeBufferGeometries([geo, Coral1Geo]);

    if(Math.random() > 0.8) {
      Coral1Geo = mergeBufferGeometries([Coral1Geo, Coral1(height, position)]);
    }
  } else if(height > DIRT_HEIGHT) {
    dirtGeo = mergeBufferGeometries([geo, dirtGeo]);

    if(Math.random() > 0.8) {
      CoralGeo = mergeBufferGeometries([CoralGeo, tree(height, position)]);
    }
  } else if(height > Coral_HEIGHT) {
    CoralGeo = mergeBufferGeometries([geo, CoralGeo]);
  } else if(height > SAND_HEIGHT) { 
    sandGeo = mergeBufferGeometries([geo, sandGeo]);

    if(Math.random() > 0.8 && Coral1Geo) {
      Coral1Geo = mergeBufferGeometries([Coral1Geo, Coral1(height, position)]);
    }
  } else if(height > DIRT2_HEIGHT) {
    dirt2Geo = mergeBufferGeometries([geo, dirt2Geo]);
  } 
}

function hexMesh(geo, map) {
  let mat = new MeshPhysicalMaterial({ 
    envMap: envmap, 
    envMapIntensity: 0.135, 
    flatShading: true,
    map
  });

  let mesh = new Mesh(geo, mat);
  mesh.castShadow = true; 
  mesh.receiveShadow = true; 

  return mesh;
}

function tree(height, position) {
  const treeHeight = Math.random() * 1 + 2.25;

  const geo = new CylinderGeometry(0, 1.5, treeHeight, 3);
  geo.translate(position.x, height + treeHeight * 0 + 1, position.y);
  
  const geo2 = new CylinderGeometry(0, 1.15, treeHeight, 3);
  geo2.translate(position.x, height + treeHeight * 0.6 + 1, position.y);
  
  const geo3 = new CylinderGeometry(0, 0.8, treeHeight, 3);
  geo3.translate(position.x, height + treeHeight * 1.25 + 1, position.y);

  return mergeBufferGeometries([geo, geo2, geo3]);
}

function Coral1(height, position) {
  const px = Math.random() * 0.2;
  const pz = Math.random() * 2.8;

  const geo = new SphereGeometry(Math.random() * 0.3 + 0.1, 7, 7);
  geo.translate(position.x + px, height, position.y + pz);

  return geo;
}

function clouds() {
  let geo = new SphereGeometry(2, 2, 2); 
  let count = Math.floor(Math.sin(Math.random(), 10) * 6);

  for(let i = 0; i < count; i++) {
    const puff1 = new SphereGeometry(2.2, 20, 10);
    const puff2 = new SphereGeometry(1.5, 20, 10);
    const puff3 = new SphereGeometry(1.9, 20, 10);
    const puff4 = new SphereGeometry(1.1, 20, 10);
   
    puff1.translate(-1.85, Math.random() * 1, 0);
    puff2.translate(0,     Math.random() * 1, 0);
    puff3.translate(1.85,  Math.random() * 1, 0);
    puff4.translate(0,     Math.random() * 1, 0);

    const cloudGeo = mergeBufferGeometries([puff1, puff2, puff3, puff4]);
    cloudGeo.translate( 
      Math.random() * 20 - 10, 
      Math.random() * 7 + 7, 
      Math.random() * 7 + 7,
      Math.random() * 20 - 10
    );
    cloudGeo.rotateY(Math.random() * Math.PI );
    geo = mergeBufferGeometries([geo, cloudGeo]);
  }
  
  const mesh = new Mesh(
    geo,
    new MeshStandardMaterial({
      envMap: envmap, 
      envMapIntensity: 0.75, 
      flatShading: true,
      // transparent: true,
      // opacity: 0.85,
    })
  );

  //function animateLoop(){
    //Clock
    //const elapsedTime = clock.getElapsedTime();
   // camera.position.y = Math.sin(elapsedTime)*0.5;
   // camera.position.x = Math.cos(elapsedTime)*0.5;
    //renderer
    //renderer.render(scene, camera);
  
    //window.requestAnimationFrame(animateLoop);
  //}
  scene.add(mesh);
  
}