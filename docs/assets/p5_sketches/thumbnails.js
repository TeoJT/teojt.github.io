


// let mockScene;
let pg;

const TOTAL_REALMS = 43;

let nextRealmID = 0;
let skyCount;
let treeCount;
let skyCountNext;
let treeCountNext;
let img_sky = [];
let img_grass;
let img_tree = [];
let img_white;
let typewriterFont;

let img_sky_default = [];
let img_grass_default;
let img_tree_default = []

let img_sky_next = [];
let img_grass_next;
let img_tree_next = [];

let groundSize = 400;
let renderDistance = 8;
let portalLight = 0;

      
let timeway_playerX = 1000;
let timeway_playerY = 0;
let timeway_playerZ = 1000;
let direction = 0;

let tree_geo = [];

let portalX = timeway_playerX;
let portalY = 0;
let portalZ = timeway_playerZ+4000;

const PATH = "/assets/p5_sketches/";
// const PATH = "";

let realm_sky_count = [];

let realm_tree_count = [];

let shader_vert_fog = `
precision highp float;
uniform mat4 uProjectionMatrix;
uniform mat4 uModelViewMatrix;

attribute vec3 aVertexColor;
attribute vec3 aPosition;
attribute vec2 aTexCoord;

varying vec4 vertColor;
varying vec4 vertTexCoord;

const float fadeStart = 800.0;
const float fadeLength = 1000.0;

void main() {
  vec4 viewModelPosition = uModelViewMatrix * vec4(aPosition, 1.0);
  gl_Position = uProjectionMatrix * viewModelPosition;  

  float z = gl_Position.z;
  float opacity = clamp(1.0-((z-fadeStart) / fadeLength), 0.0, 1.0);

  vertColor = vec4(aVertexColor, opacity);
  vertTexCoord = vec4(aTexCoord, 0.0, 1.0);
}`;

let shader_vert_stnd = `
precision highp float;
uniform mat4 uProjectionMatrix;
uniform mat4 uModelViewMatrix;

attribute vec3 aVertexColor;
attribute vec3 aPosition;
attribute vec2 aTexCoord;

varying vec4 vertColor;
varying vec4 vertTexCoord;

void main() {
  vec4 viewModelPosition = uModelViewMatrix * vec4(aPosition, 1.0);
  gl_Position = uProjectionMatrix * viewModelPosition;  

  vertColor = vec4(aVertexColor, 1.0);
  vertTexCoord = vec4(aTexCoord, 0.0, 1.0);
}`;


let shader_frag_stnd = `
precision mediump float;

uniform sampler2D utexture;
varying vec4 vertTexCoord;
varying vec4 vertColor;




void main(void)
{
    vec2 st = vertTexCoord.xy;
    gl_FragColor = texture2D(utexture, st)*vertColor*vertColor.a;
    //gl_FragColor = vec4(st.x, 0.0, st.y, 1.0);
}`;


let shader_frag_seethru = `
precision mediump float;

uniform sampler2D utexture;
varying vec4 vertTexCoord;
varying vec4 vertColor;




void main(void)
{
    vec2 st = vertTexCoord.xy;
    gl_FragColor = texture2D(utexture, st);
    //gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0) + texture2D(utexture, st);
    //if (gl_FragColor.a < 0.01) {
    //    discard;
    //}
}`;



let shader_frag_portalPlus = `
precision mediump float;



#define PI 3.1415926535
uniform float u_dir;
uniform float u_time;
uniform vec2 pixelRes;
uniform sampler2D utexture;
varying vec4 vertTexCoord;
varying vec4 vertColor;

float intensity = 0.043;
float frequency = 15.0;
const float xpos = 0.;

const float speed = 1.0;



float pixelate(float o, float res) {
    return (floor(o*res))/res;
}




void main(void)
{
    vec2 st = vertTexCoord.xy;
    
    float aspect = (pixelRes.x/pixelRes.y);
    vec2 tt = gl_FragCoord.xy/pixelRes.xy;
    //tt.x *= 2.;
    tt.y = 1.-tt.y;
    
    //st.x *= u_resolution.x/u_resolution.y;
    //st *= 1.1;
    //st.x *= 2.;
    st.y -= 0.05;

    
    
    float t = u_time*speed*PI;
    //float t = (ti-floor(ti))*PI;
    
    tt.x += u_dir;
    
    float wobble = cos((st.y+st.x)*frequency*2.+t) * intensity * sin(st.x*frequency + t);
    
    
    
    //Create a position vector
    vec2 p = vec2(((st.x)-xpos)-wobble, st.y-wobble*1.5);
    

    
    float img = sin(clamp(p.x*PI, 0., PI))*sin(clamp(p.y*PI, 0., PI))*2.;
    float b = pixelate(img, 3.516);
    vec3 color = vec3(b*1.160, b, b*2.);
    float opacity = color.b;
    
    color *= color.g >= 0.99 ? texture2D(utexture, tt).rgb : vec3(1.0);
    
    gl_FragColor = vec4(color, opacity) * vertColor*vertColor.a;
    if (gl_FragColor.a < 0.01) {
      discard;
    }
    //gl_FragColor = vec4(texture2D(utexture, tt).rgb, 1.0);
}`;


let portalPlusShader, standardShader, standardSeeThruShader;

let timewayMetaFiles = [];

function preloadTimeway() {
  img_sky_default[0] = loadImage(PATH+"img/pixelrealm-sky-legacy.png");
  img_grass_default = loadImage(PATH+"img/pixelrealm-grass-legacy.png");
  img_tree_default[0] = loadImage(PATH+"img/pixelrealm-terrain_object-legacy.png");
  img_white = loadImage(PATH+"img/white.png");
  
  for (let i = 0; i < TOTAL_REALMS; i++) {
    const dir = PATH+"img/realmtemplates/"+nf(i+1, 3, 0);
    timewayMetaFiles[i+1] = loadStrings(dir+"/meta.txt");
  }
  

  
}

let canvas;

function setupTimeway() {
  // pg = createGraphics(width, height, WEBGL);
  
  noiseSeed(92683);
    
  canvas.getTexture(img_sky_default[0]).setInterpolation(NEAREST, NEAREST);
  canvas.getTexture(img_grass_default).setInterpolation(NEAREST, NEAREST);
  canvas.getTexture(img_tree_default[0]).setInterpolation(NEAREST, NEAREST);
  
  img_sky[0] = img_sky_default[0];
  img_grass = img_grass_default;
  img_tree[0] = img_tree_default[0];
  skyCount = 1;
  treeCount = 1;
  
  portalPlusShader = createShader(shader_vert_fog, shader_frag_portalPlus);
  standardShader = createShader(shader_vert_fog, shader_frag_stnd);
  
  tree_geo[0] = buildGeometry(createTree);
  noLights();
  
  prepareLoadNext(int(random(0, TOTAL_REALMS)));
}

let imgLoadFailed = false;
function treeLoadFailCallback() {
  imgLoadFailed = true;
  print("Realm assets load failed.");
}
function dummyLoadSuccess() {
}

function prepareLoadNext(id) {
  const dir = PATH+"img/realmtemplates/"+nf(id+1, 3, 0);
  
  // TODO: Successful callback

  // console.log(id+1, timewayMetaFiles[id+1]);
  skyCountNext = int(timewayMetaFiles[id+1][0]);
  if (skyCountNext == 1) {
    img_sky_next[0] = loadImage(dir+"/pixelrealm-sky.png", dummyLoadSuccess, treeLoadFailCallback);
    // print(dir+"/pixelrealm-sky.png");
  }
  else {
    for (let i = 0; i < skyCountNext; i++) {
      img_sky_next[i] = loadImage(dir+"/pixelrealm-sky-"+str(i+1)+".png", dummyLoadSuccess, treeLoadFailCallback);
      // print(dir+"/pixelrealm-sky-"+str(i+1)+".png");
    }
  }
  
  // console.log(id+1, timewayMetaFiles[id+1]);
  treeCountNext = int(timewayMetaFiles[id+1][1]);
  for (let i = 0; i < treeCountNext; i++) {
    img_tree_next[i] = loadImage(dir+"/pixelrealm-terrain_object-"+str(i+1)+".png", dummyLoadSuccess, treeLoadFailCallback);
    // print(dir+"/pixelrealm-terrain_object-"+str(i+1)+".png")
  }
  
  img_grass_next = loadImage(dir+"/pixelrealm-grass.png", dummyLoadSuccess, treeLoadFailCallback);
  // print(dir+"/pixelrealm-grass.png");
  
}

function deleteTexture(img) {
    tex = canvas.getTexture(img);
    const gl = this._renderer.GL;
    gl.deleteTexture(tex.glTex);
}

let buildTreeIndex = 0;
function loadNext() {
  if (imgLoadFailed) {
    skyCountNext = 1;
    img_sky_next[0] = img_sky_default[0];
    treeCountNext = 1;
    img_tree_next[0] = img_tree_default[0];
    img_grass_next = img_grass_default;
    imgLoadFailed = false;
    img_sky[0] = img_sky_next[0];
    img_tree[0] = img_tree_next[0];
    img_grass = img_grass_next;
    buildTreeIndex = 0;
    tree_geo[0] = buildGeometry(createTree);
    return;
  }

  for (let i = 0; i < skyCount; i++) {
    deleteTexture(img_sky[i]);
  }
  
  skyCount = skyCountNext;
  for (let i = 0; i < skyCount; i++) {
    img_sky[i] = img_sky_next[i];
    canvas.getTexture(img_sky[i]).setInterpolation(NEAREST, NEAREST);
  }

  for (let i = 0; i < treeCount; i++) {
    deleteTexture(img_tree[i]);
  }
  
  treeCount = treeCountNext;
  for (let i = 0; i < treeCount; i++) {
    img_tree[i] = img_tree_next[i];
    buildTreeIndex = i;
    tree_geo[i] = buildGeometry(createTree);
    canvas.getTexture(img_tree[i]).setInterpolation(NEAREST, NEAREST);
  }
  
  deleteTexture(img_grass);
  img_grass = img_grass_next;
  canvas.getTexture(img_grass).setInterpolation(NEAREST, NEAREST);
}

function createTree() {
  let aspect = img_tree[buildTreeIndex].height/img_tree[buildTreeIndex].width;
  let wi = 100;
  let hi = wi*aspect;
  
  let hwi = wi/2;
  let sin_d = hwi;
  let cos_d = 0;
  let x1 = sin_d;
  let z1 = cos_d;
  let x2 = -sin_d;
  let z2 = -cos_d;
  let y1 = -hi;
  let y2 = 0;
  fill(255);
  textureMode(NORMAL);
  textureWrap(LINEAR);
  
  texture(img_tree[buildTreeIndex]);
  beginShape(QUADS);
  vertex(x1, y1, z1, 0, 0);           // Bottom left
  vertex(x2, y1, z2, 0.999, 0);    // Bottom right
  vertex(x2, y2, z2, 0.999, 0.999); // Top right
  vertex(x1, y2, z1, 0, 0.999);  // Top left
  endShape(CLOSE);
  
}

function getAnimationIndex() {
  return int(millis()/200);
}

function cameraa(playerX, playerY, playerZ, dirr) {
  let LOOK_DIST = 300;
  camera(playerX, playerY-80, playerZ, 
        playerX+sin(direction)*LOOK_DIST, playerY-80, playerZ+cos(direction)*LOOK_DIST, 
        0, 1, 0);
}

function renderPixelRealmMockup(playerX, playerY, playerZ, clearway=true, grass=img_grass, tree=img_tree, localTreeCount=treeCount, sky=img_sky, localSkyCount=skyCount, renderExtraObjects=undefined) {
      resetShader();
      // mockScene.begin();
      background(255);
      noStroke();
  
      gl = this._renderer.GL;
//       gl.disable(gl.DEPTH_TEST);
      //hint(DISABLE_DEPTH_TEST);
      // perspective(PI/3.0, mockScene.width/mockScene.height, 10, 1000000);
  
      const img = sky[getAnimationIndex()%localSkyCount];
      const scl = height/img.height;
      image(img, -width/2, -height/2, img.width*scl, height);
      //mockScene.hint(ENABLE_DEPTH_TEST);
      // gl.enable(gl.DEPTH_TEST);
      clearDepth();
  
      shader(standardShader);
      standardShader.setUniform("utexture", grass);
      
      
      push();
      cameraa(playerX, playerY, playerZ, direction);
      
      let chunkx = floor(playerX/groundSize)+1;
      let chunkz = floor(playerZ/groundSize)+1; 
  let iii = 0;
      let FADE_DIST_GROUND = pow(max(renderDistance-3, 0)*groundSize, 2);
      fill(255);
      textureMode(NORMAL);
      textureWrap(REPEAT);
      beginShape(QUADS);
      for (let tilez = chunkz-renderDistance-1; tilez < chunkz+renderDistance; tilez += 1) {
        for (let tilex = chunkx-renderDistance-1; tilex < chunkx+renderDistance; tilex += 1) {
          let x = groundSize*(tilex-0.5), z = groundSize*(tilez-0.5);
          let dist = pow((playerX-x), 2)+pow((playerZ-z), 2);
          let dontRender = false;
          if (dist > FADE_DIST_GROUND) {
            let fade = calculateFade(dist, FADE_DIST_GROUND);
            if (fade > 1) {
              // tint(255, fade);
              // fill(255, fade); 
            }
            else dontRender = true;
          } else {
            // noTint();
            // fill(255);
          } 
          if (!dontRender) {
            texture(grass);
            
            let v1 = createVector((tilex-1)*groundSize, 0, (tilez-1)*groundSize);          // Left, top
            let v2 = createVector((tilex)*groundSize, 0,  (tilez-1)*groundSize);          // Right, top
            let v3 = createVector((tilex)*groundSize, 0,  (tilez)*groundSize);          // Right, bottom
            let v4 = createVector((tilex-1)*groundSize, 0,  (tilez)*groundSize);          // Left, bottom
            
            vertex(v1.x, v1.y, v1.z, 0, 0);                                    
            vertex(v2.x, v2.y, v2.z, 2, 0);  
            vertex(v3.x, v3.y, v3.z, 2, 2);  
            vertex(v4.x, v4.y, v4.z, 0, 2);       
  
          }
        }
      }
      endShape(CLOSE);
      noTint();
      fill(255);
      
      renderObjects(playerX, playerY, playerZ, clearway, tree, localTreeCount);
  
      if (renderExtraObjects != undefined) {
        renderExtraObjects();
      }
  
      pop();
  
      if (!stillMode) {
        const PORTAL_LIGHT_RANGE = 600;
        
        if (portalZ-playerZ < PORTAL_LIGHT_RANGE) {
          portalLight = (1-((portalZ-playerZ)/PORTAL_LIGHT_RANGE))*255;
          
          // Walk through portal
          if (portalZ-playerZ < 0) {
            nextRealm();
          }
        }
        else {
          portalLight -= 5*delta;
        }
    
        if (portalLight > 0) {
          resetShader();
          clearDepth();
          blendMode(ADD);
          fill( portalLight );
          noStroke();
          rect(-width/2, -height/2, width, height);
          blendMode(BLEND);
        }
      }
    
  
}

// let threeMostRecent = [];

function nextRealm() {
  loadNext();

  let chooseNext = int(random(0, TOTAL_REALMS));

  prepareLoadNext(chooseNext);
  // prepareLoadNext(nextRealmID++);
  // if (nextRealmID >= TOTAL_REALMS) {
  //   nextRealmID = 0;
  // }
  portalZ = timeway_playerZ + 4000;
}


function calculateFade(dist, fadeDist) {
      let d = (dist-fadeDist);
      let scale = (5./pow(groundSize, 1.8));
      return 255-(d*scale);
}


function drawTree(tree, x, z, sc, img) {
      if (treeCount == 0) return;
      if (tree[img].width == 1 && tree[img].height == 1) return;
      shader(standardShader);
      fill(255);
      standardShader.setUniform("utexture", tree[img]);
      push();
      translate(x, 0, z);
      scale(sc);
      model(tree_geo[img]);
      pop();
}

function renderPortal(playerX, playerY, playerZ) {
      // Don't bother rendering the portal if it's far away from player.
      // This gives us some time to load the next realm sky.
      if (portalZ-playerZ > 2500) return;
  
      shader(portalPlusShader);
      portalPlusShader.setUniform("utexture", imgLoadFailed ? img_white : img_sky_next[0]);
      portalPlusShader.setUniform('u_time', millis()/1000);

      const scl = height/img_sky_next[0].height;
      portalPlusShader.setUniform('pixelRes', [img_sky_next[0].width*scl*2, height*2]);
      portalPlusShader.setUniform('u_dir', direction);
  
      let xcorrect = 24.54541+64;
      let zcorrect = -391.89288;
      beginShape(QUADS);
      vertex(-152.54541+xcorrect+portalX, -224.0, 391.89288+zcorrect+portalZ, 0.999, 0.0);
      vertex(-24.54541+xcorrect+portalX, -224.0, 391.89288+zcorrect+portalZ, 0.0, 0.0);
      vertex(-24.54541+xcorrect+portalX, 0.0, 391.89288+zcorrect+portalZ, 0.0, 0.999);
      vertex(-152.54541+xcorrect+portalX, 0.0, 391.89288+zcorrect+portalZ, 0.999, 0.999);
      endShape(CLOSE);
}


function renderObjects(playerX, playerY, playerZ, clearway, tree, localTreeCount) {
  
      renderPortal();
  
  
      shader(standardShader);
  
      let chunkx = floor(playerX/groundSize)+1;
      let chunkz = floor(playerZ/groundSize)+1; 
  
      let treeLikelyhood = 0.4;
      let randomOffset = 200;
      let CLEARWAY = 80;
      if (!clearway || stillMode) CLEARWAY = 0;
  
      for (let tilez = chunkz+renderDistance; tilez > chunkz-renderDistance; tilez -= 1) {
        for (let tilex = chunkx-renderDistance-1; tilex < chunkx+renderDistance; tilex += 1) {
          let x = (tilex-1)*groundSize;
          let z = (tilez-1)*groundSize;
          
          let noisePosition = noise(tilex, tilez);
          
          if (noisePosition > treeLikelyhood) {
              let pureStaticNoise = (noisePosition-treeLikelyhood);
              let offset = -randomOffset+(pureStaticNoise*randomOffset*2);
  
              let x = (groundSize*(tilex-1))+offset;
              let z = (groundSize*(tilez-1))+offset;
            
              if (x > playerX+CLEARWAY || x < playerX-CLEARWAY) {
                drawTree(tree, x, z, noise(tilex, tilez)*3, int(noisePosition*1259)%localTreeCount);
              }
          }
          
        }
      }
    }

function timeway() {
  background(220);
  push();
  renderPixelRealmMockup(timeway_playerX, timeway_playerY, timeway_playerZ);
  resetShader();
  pop();
  // image(mockScene, 0, 0, width, height);
  processMouse();

  if (!stillMode) {
      timeway_playerZ += 15*delta + mouseVel()*0.02*delta;
  }
  // else {
  //     timeway_playerX = mouseX*2-2000;
  //     timeway_playerZ = mouseY*2-500;
  //     if (mousePressed) {
  //       console.log(timeway_playerX, timeway_playerZ);
  //     }
  // }
  
}

let prevMouseX;
let prevMouseY;
let mouseVelX = 0;
let mouseVelY = 0;

function processMouse(useAbs=true, sped=0.98) {
  if (useAbs) {
    mouseVelX += abs(mouseX-prevMouseX);
    mouseVelY += abs(mouseY-prevMouseY);
  }
  else {
    mouseVelX += (mouseX-prevMouseX);
    mouseVelY += (mouseY-prevMouseY);
  }
  
  mouseVelX = min(mouseVelX, 1000);
  mouseVelY = min(mouseVelY, 1000);
  
  mouseVelX *= pow(sped,delta);
  mouseVelY *= pow(sped,delta);
  
  prevMouseX = mouseX;
  prevMouseY = mouseY;
}

function mouseVel() {
  return mouseVelX+mouseVelY;
}


















const sketchioCode = `
PShader gloopy = null;
PShader rainbow = null;
PShader neo = null;
PShader lava = null;
public void start() {
  rainbow = g.loadShader(getPath()+"/shaders/rainbow.glsl");
  neo = g.loadShader(getPath()+"/shaders/neo.glsl");
  gloopy = g.loadShader(getPath()+"/shaders/gloopy.glsl");
  lava = g.loadShader(getPath()+"/shaders/lava.glsl");
  print(getPath()+"/shaders/neo.glsl");
  print(getPath()+"/shaders/rainbow.glsl");
  print(getPath()+"/shaders/gloopy.glsl");
  print(getPath()+"/shaders/lava.glsl");
}

public void flash(int start, int end, int offset, int everyxbeat) {
    int wi = g.width;
    int hi = g.height;
    g.blendMode(PApplet.ADD);
    g.strokeWeight(1f);
    
    for (int y = start; y < end; y++) {
        float c = (1f-((float)(y-start)/(float)(end-start)))*255f*beatSaw(offset, everyxbeat);
        g.stroke(c);
        // if (curse) g.stroke(c, 20f, 20f);
        g.line(y, y, wi-y-1, y);
        g.line(wi-y, y, wi-y, hi-y-1);
        g.line(wi-y, hi-y, y+1, hi-y);
        g.line(y, hi-y, y, y+1);
    }
    g.blendMode(PApplet.NORMAL);
}

public void flashKick() {
    flash(0, 60, 0, 1);
}
public void flashSnare() {
    flash(25, 50, 1, 2);
}

public void cymbal() {
  flash(0, 100, 4, 16);
}

public void back() {
  g.background(120, 100, 140);
  int phase = ((beat()-1)/4)%4;
  if (phase == 0) {
    g.shader(rainbow);
    rainbow.set("u_resolution", (float)g.width, (float)g.height);
    rainbow.set("u_time", getTime());
  }
  else if (phase == 1) {
    g.shader(neo);
    neo.set("u_resolution", (float)g.width, (float)g.height);
    neo.set("u_time", getTime());
  }
  else if (phase == 2) {
    g.shader(gloopy);
    gloopy.set("u_resolution", (float)g.width, (float)g.height);
    gloopy.set("u_time", getTime());
  }
  else if (phase == 3) {
    g.shader(lava);
    lava.set("u_resolution", (float)g.width, (float)g.height);
    lava.set("u_time", getTime());
  }
  g.image(getImg("white"),0,0,g.width,g.height);
  g.resetShader();
}

public void run() {
  back();

  moveSprite("dancer", 0f, getAutoFloat("testdance")*500f);

  sprite("dancer", "n"+(((beat()-1)%8)+1));
  
  flashKick();
  
}

`;


const gloopy_shader_code = `
precision highp float;
precision highp int;

#define PROCESSING_TEXTURE_SHADER

#define PI 3.1415926535


uniform vec2 u_resolution;
uniform vec2 u_mouse;
uniform float u_time;

float intensity = 0.100;
float frequency = 10.608;
const float xpos = 0.;

const float speed = 1.0;

const vec3 base = vec3(0.000,0.048,0.125);
const vec3 brightness = vec3(0.876,0.565,0.995);

float pixelate(float o, float res) {
    return (floor(o*res))/res;
}

float tri(float delta) {
    return abs(2.*fract(delta)-1.);
}

vec3 hsv2rgb(vec3 c)
{
    vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
    vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
    return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
}

vec3 rgb2hsv(vec3 c)
{
    vec4 K = vec4(0.0, -1.0 / 3.0, 2.0 / 3.0, -1.0);
    vec4 p = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g));
    vec4 q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.r));

    float d = q.x - min(q.w, q.y);
    float e = 1.0e-10;
    return vec3(abs(q.z + (q.w - q.y) / (6.0 * d + e)), d / (q.x + e), q.x);
}

void main() {
    vec2 st = gl_FragCoord.xy/u_resolution.xy;
    float aspect = u_resolution.x/u_resolution.y;
    st.x *= u_resolution.x/u_resolution.y;

    
    
    //Sawtooth function,
    //THESE EMULATE THE TIME UNIFORM BEING CLAMPED TO 3.14
    float ti = u_time*speed;
    float t = (ti-floor(ti))*PI;
    
    
    //the core of the code, distorts the image making it wobbly.
    //Use an random number for the speed of the two wobble funcitons to
    //ensure they are unsynced for maximum randomness.
    //If you wish for the wooble to be lower you can change those values.
    //I recommend between 1.0-5.0.
    st *= 0.800;
    st += vec2(-0.410,-0.420);
    
    //Uncomment the following line and add it to ashe's town code along with
    //the wobble line.
    //float t = time*speed;
    float wobble = cos((st.y+st.x)*frequency*2.+t) * intensity * sin(st.x*frequency + t);
    
    
    
    //Create a position vector
    vec2 p = vec2(((st.x*aspect)-xpos)-wobble, st.y-wobble*1.5);
    
    
    
    vec3 color = vec3(0.);
    color = vec3(base.r+(tri(p.x))*brightness.r, base.g ,base.b+tri(p.y)*brightness.b);
    vec3 hsv = rgb2hsv(color);
    
    vec3 newColor = vec3(pixelate(hsv.r, 15.), hsv.g, pixelate(hsv.b, 7.));
    

    gl_FragColor = vec4(hsv2rgb(newColor), 1.0);
}
`;


const lava_shader_code = `
precision highp float;

#define PI 3.14

#define DARK vec3(0.157,0.142,0.655)
#define LIGHT vec3(0.690,0.110,0.110)

uniform vec2 u_resolution;
uniform vec2 u_mouse;
uniform float u_time;

mat2 rotate2d(float _angle){
    return mat2(cos(_angle),-sin(_angle),
                sin(_angle),cos(_angle));
}

float tri(float delta) {
    return abs(2.*fract(delta)-1.);
}

float saw(float delta) {
    return delta-floor(delta);
}

float pixelate(float o, float res) {
    if (o < 1.0) o = 0.;
    return (floor(o*res))/res;
}

float mod289(float x){return x - floor(x * (1.0 / 289.0)) * 289.0;}
vec4 mod289(vec4 x){return x - floor(x * (1.0 / 289.0)) * 289.0;}
vec4 perm(vec4 x){return mod289(((x * 34.0) + 1.0) * x);}

float noise(vec2 dp, float t){
    vec3 p = vec3(dp.x, t*0.2, dp.y);
    vec3 a = floor(p);
    vec3 d = p - a;
    d = d * d * (3.0 - 2.0 * d);

    vec4 b = a.xxyy + vec4(0.0, 1.0, 0.0, 1.0);
    vec4 k1 = perm(b.xyxy);
    vec4 k2 = perm(k1.xyxy + b.zzww);

    vec4 c = k2 + a.zzzz;
    vec4 k3 = perm(c);
    vec4 k4 = perm(c + 1.0);

    vec4 o1 = fract(k3 * (1.0 / 41.0));
    vec4 o2 = fract(k4 * (1.0 / 41.0));

    vec4 o3 = o2 * d.z + o1 * (1.0 - d.z);
    vec2 o4 = o3.yw * d.x + o3.xz * (1.0 - d.x);

    return o4.y * d.y + o4.x * (1.0 - d.y);
}

void main() {
    vec2 st = gl_FragCoord.xy/u_resolution.xy;
    st.x *= u_resolution.x/u_resolution.y;
    
    float t = u_time*3.;
    
    //st += vec2((t*0.056)*1.976, sin((t*0.044)*PI));
    st *= 0.3;
    st = rotate2d(t*0.1)*st;
    
    float magicValue = noise(st*15.+vec2(t, t*0.4), t)*2.5;
    vec3 color = DARK+vec3(pow(pixelate(magicValue, 2.4), 2.))*LIGHT;
    
    
    gl_FragColor = vec4(color,1.0);
}

`;

const neo_shader_code = `
// Author:
// Title:

precision highp float;

uniform vec2 u_resolution;
uniform vec2 u_mouse;
uniform float u_time;

float mod289(float x){return x - floor(x * (1.0 / 289.0)) * 289.0;}
vec4 mod289(vec4 x){return x - floor(x * (1.0 / 289.0)) * 289.0;}
vec4 perm(vec4 x){return mod289(((x * 34.0) + 1.0) * x);}

float noise(vec3 p){
    vec3 a = floor(p);
    vec3 d = p - a;
    d = d * d * (3.0 - 2.0 * d);

    vec4 b = a.xxyy + vec4(0.0, 1.0, 0.0, 1.0);
    vec4 k1 = perm(b.xyxy);
    vec4 k2 = perm(k1.xyxy + b.zzww);

    vec4 c = k2 + a.zzzz;
    vec4 k3 = perm(c);
    vec4 k4 = perm(c + 1.0);

    vec4 o1 = fract(k3 * (1.0 / 41.0));
    vec4 o2 = fract(k4 * (1.0 / 41.0));

    vec4 o3 = o2 * d.z + o1 * (1.0 - d.z);
    vec2 o4 = o3.yw * d.x + o3.xz * (1.0 - d.x);

    return o4.y * d.y + o4.x * (1.0 - d.y);
}

void main() {
    vec2 st = gl_FragCoord.xy/u_resolution.xy;
    st.x *= u_resolution.x/u_resolution.y;
    
    st += vec2(0.820,0.240);
    
    float freq = 14.;
    float speed = 2.;
    float p = sin(st.x*100.*noise(vec3(st*freq+u_time*speed, 1.))*0.1);

    vec3 color = vec3(0.001,0.151,1.);
    color.rg += vec2(pow (p, 6.0 ))*vec2(0.9,0.099);
    
    if (color.r < 0.1) {
        color = vec3(0., 0., 0.);
    }
    
    //color *= (3.-color); 
    //color-= vec3(smoothstep(0.0, 0.1, sin(st.y*100.)));

    gl_FragColor = vec4(color,1.0);
}

`;


const rainbow_shader_code = `
precision highp float;

#define PROCESSING_TEXTURE_SHADER

uniform float u_time;
uniform vec2 u_resolution;
uniform vec2 mouse;

const float pi = 3.14159265;

vec3 hueShift(vec3 color, float hue) {
    const vec3 k = vec3(0.57735, 0.57735, 0.57735);
    float cosAngle = cos(hue);
    return vec3(color * cosAngle + cross(k, color) * sin(hue) + k * dot(k, color) * (1.0 - cosAngle));
}


void main() {
    vec2 st = gl_FragCoord.xy/u_resolution.xy;
    st.x *= u_resolution.x/u_resolution.y;

    vec3 color = vec3(0.);
    
    float move = u_time*0.5;
    
    
    
    
    float numLights =  8.;
    
    
    
    float x1 = st.x+cos(u_time)*0.5;
    float y1 = st.y+move;
    
    float tileX1 = floor(x1*numLights);
    float tileY1 = floor(y1*numLights);
    
    float inverseSize = 0.1;
    
    float i1 = pow(abs(sin(x1*pi*numLights)), inverseSize)*pow(abs(sin(y1*pi*numLights))*0.100, inverseSize);
    vec3 c1 = hueShift(vec3(1.0, 0.0, 1.0), (floor(tileY1)+floor(tileX1))*0.1)+1.0;
    color += c1*i1*0.6;
    
    gl_FragColor = vec4(color,1.0);
}
`;


let img_nothing, img_snapto_64, img_music, img_dragger_64, img_cross, img_media_128, img_doc_128, img_code_128, img_cube_128, img_image_128, img_folder_128, img_back_arrow_128, img_pause_128, img_play_128;

let img_dancer = [];

let gloopyShader, lavaShader, neoShader, rainbowShader;

let textScrollY = 0;
let playhead = 0;
const bpm = 135;
const SKETCHIO_LENGTH = 853.3333129882812/60;

function preloadSketchio() {
}

function setupSketchio() {
  const dir = PATH+"img/Sketchio/";
  
  img_nothing = loadImage(dir+"nothing.png");
  img_snapto_64 = loadImage(dir+"snapto_64.png");
  img_music = loadImage(dir+"music.png");
  img_dragger_64 = loadImage(dir+"dragger_64.png");
  img_cross = loadImage(dir+"cross.png"); 
  img_media_128 = loadImage(dir+"media_128.png"); 
  img_doc_128 = loadImage(dir+"doc_128.png");
  img_code_128 = loadImage(dir+"code_128.png");
  img_cube_128 = loadImage(dir+"cube_128.png");
  img_image_128 = loadImage(dir+"image_128.png");
  img_folder_128 = loadImage(dir+"folder_128.png");
  img_back_arrow_128 = loadImage(dir+"back_arrow_128.png");
  img_pause_128 = loadImage(dir+"pause_128.png");
  // img_play_128 = loadImage(dir+"play_128.png");
  
  for (let i = 0; i < 8; i++) {
    img_dancer[i] = loadImage(dir+"n"+str(i+1)+".png");
    // print(dir+"n"+str(i+1)+".png");
  }
  
  
  gloopyShader = createShader(shader_vert_stnd, gloopy_shader_code);
  lavaShader = createShader(shader_vert_stnd, lava_shader_code);
  neoShader = createShader(shader_vert_stnd, neo_shader_code);
  rainbowShader = createShader(shader_vert_stnd, rainbow_shader_code);
}

function getTextHeight(txt) {
    const lineSpacing = 8;
    return ((textAscent()+textDescent()+lineSpacing)*(countNewlines(txt)+1));
}

function countNewlines(t) {
      let count = 0;
      for (let i = 0; i < t.length; i++) {
          if (t.charAt(i) == '\n') {
              count++;
          }
      }
      return count;
}

function sketchio() {
  if (mouseVelX >= -50) {
    playhead += (16.6/1000)*delta;
  }
  processMouse(false, 0.9);
  playhead += ((mouseVelX*delta)/5000);
  playhead = max(playhead, 0);
  if (playhead > SKETCHIO_LENGTH) {
    playhead = 0;
  }
  processBeat();
  
  resetShader();
  
  const BARS_COLOR = color(60);
  push();
  translate(-width/2, -height/2, 0);
  scale(width/1500);
  background(25);
  textFont(typewriterFont);
  noStroke();
  
  const HEIGHT = height*(1500/width);
  const WIDTH = width*(1500/width);
  gl = this._renderer.GL;
  
  gl.disable(gl.DEPTH_TEST);
  
  // Begin auto-gen stuff
  // const lowerit = 50;
  // fill(255, 127, 20);
  // rect(375.0, 705.375+lowerit, 28.0, 28.0);
  // image(img_snapto_64, 413.0, 705.375+lowerit, 28.0, 28.0);
  // image(img_music, 451.0, 705.375+lowerit, 28.0, 28.0);
  // image(img_dragger_64, 674.0, 705.375+lowerit, 28.0, 28.0);
  // image(img_cross, 717.0, 705.375+lowerit, 28.0, 28.0);
  
  fill(38);
  rect(WIDTH/2, 100, WIDTH/2, HEIGHT-100-50);
  fill(255);
  textSize(20);
  text(sketchioCode, WIDTH/2+4, 100+10-textScrollY, WIDTH/2-20, 9999);
  
  textScrollY += 2*delta;
  textScrollY += (-mouseVelY/50)*delta;
  // Manual text size (getTextSize doesnt seem to work)
  if (textScrollY > getTextHeight(sketchioCode)-150) {
    textScrollY = -HEIGHT+150;
  }
  
  // Upperbar
  fill(BARS_COLOR);
  rect(0, 0, 1500.0, 100.0);
  
  
  // push();
  textAlign(CENTER, TOP);
  // translate(-40, 15, 0);
  
  fill(255);
  textSize(18);
  
  text("Compile", 700.0, 79.0);
  image(img_media_128, 664.0, 2.0, 72.0, 72.0);
  textSize(18);
  
  text("Extern", 1329.0, 79.0);
  image(img_doc_128, 148.0, 5.0, 69.0, 69.0);
  textSize(18)
  text("Code", 1449.0, 80.0);
  image(img_code_128, 1412.0, 0.0, 75.0, 75.0);
  textSize(18)
  text("Automation", 580.0, 80.0);
  image(img_cube_128, 544.0, 2.0, 73.0, 73.0);
  textSize(18)
  text("Config", 182.0, 79.0);
  image(img_doc_128, 1294.0, 4.0, 70.0, 70.0);
  textSize(18)
  text("Render", 465.0, 80.0);
  image(img_image_128, 430.0, 4.0, 71.0, 71.0);
  textSize(18)
  text("Show files", 328.0, 80.0);
  image(img_folder_128, 293.0, 4.0, 71.0, 71.0);
  textSize(18)
  text("Explorer", 46.0, 79.0);
  image(img_back_arrow_128, 12.0, 6.0, 68.0, 68.0);
  
  // Lowerbar
  textAlign(LEFT, TOP);
  fill(BARS_COLOR);
  rect(0, HEIGHT-50, 1500.0, 50.0);
  
  // Bar
  fill(50);
  rect(70.0, HEIGHT-30.0, 1310.0, 4);
  
  // Notch
  const percent = playhead/SKETCHIO_LENGTH;
  const timeNotchPos = 70+1310*percent;
  fill(255);
  rect(timeNotchPos-4, HEIGHT-50, 8, 50); 
  
  textSize(20)
  fill(255);
  
//   const infotxt = nf(playhead, 2, 2) + "\nB " + nf(sound.beat+1, 3) + ":" + (sound.step+1);
  const infotxt = "T "+nf(playhead, 2, 2) + "\nB " + nf(beat+1, 3) + ":" + (step+1);
  
  text(infotxt, 1390.0, HEIGHT-52.0);
  image(img_pause_128, 10.0, HEIGHT-52.5, 50.0, 50.0);
  
  // End auto-gen stuff
  runSketchioProgram();
  
  pop();
  gl.enable(gl.DEPTH_TEST);
}

const FRAME_WIDTH = 585;
const FRAME_HEIGHT = 585;
const FRAME_X = 88;
const FRAME_Y = 150;

function runSketchioProgram() {
  // Our program inside of a program
  
  const phase = int((beat)/4)%4;
  if (phase == 0) {
    shader(rainbowShader);
    rainbowShader.setUniform("u_resolution", [width*1.5, height*1.5]);
    rainbowShader.setUniform("u_time", playhead);
    
  }
  else if (phase == 1) {
    shader(neoShader);
    neoShader.setUniform("u_resolution", [width*2, height*2]);
    neoShader.setUniform("u_time", playhead);
    
  }
  else if (phase == 2) {
    shader(gloopyShader);
    gloopyShader.setUniform("u_resolution", [width*2, height*2]);
    gloopyShader.setUniform("u_time", playhead);
  }
  else if (phase == 3) {
    shader(lavaShader);
    lavaShader.setUniform("u_resolution", [width, height]);
    lavaShader.setUniform("u_time", playhead);
  }
  
  
  const x = FRAME_X;
  const y = FRAME_Y;
  const wi = FRAME_WIDTH;
  const hi = FRAME_HEIGHT;
  rect(x, y, wi, hi);
  
  resetShader();
  
  image(img_dancer[(((beat)%8))], 102, 190);
  
  
  flashKick();
  cymbal();
  //flashSnare();
  
}

let beat, step;

function processBeat() {
      let t = playhead;
      
      if (bpm == 0) return;
      
      const beatspersecond = 60/bpm;

      const beatfloat = (t/beatspersecond);
      const stepfloat = (t/(beatspersecond/4));
    
      beat = max(int(beatfloat), 0);
      step = max(int(stepfloat)%4, 0);
}

function beatToTime(beat, step) {
      let beatspersecond = 60/bpm;
      let stepsspersecond = beatspersecond/4;
      return beatspersecond*(beat)+stepsspersecond*(step);
}

function beatSawXXX(beatoffset, stepoffset,  everyxbeat) {
      if (everyxbeat == 0) everyxbeat = 1;
      let t = (playhead)+beatToTime(beatoffset, stepoffset);
    
      let beatspersecond = 60/bpm;
      let beatfloat = (t/beatspersecond);
      let beat = int(beatfloat);
    
      if (beat % everyxbeat == 0) return 1-(beatfloat-beat);
      else return 0;
    }
    
    function framesPerBeat() {
      let beatspersecond = 60/bpm;
      let framesPerBeat = (display.BASE_FRAMERATE*beatspersecond);
      return framesPerBeat;
    }
    
    function framesPerQuarter() {
      return framesPerBeat()/4
    }
    
    function beatSawXX(beatoffset, everyxbeat) {
      return beatSawXXX(beatoffset, 0, everyxbeat);
    }
    
    function beatSawX(beatoffset) {
      return beatSawXXX(beatoffset, 0, 1);
    }
    
    function beatSawOffbeat(beatoffset, everyxbeat) {
      return beatSawXXX(beatoffset, 2, everyxbeat);
    }
    
    function beatSaw() {
      return beatSawXXX(0, 0, 1);
    }
    
    function stepSaw(offset) {
      let t = (playHead)+beatToTime(0, offset);
    
      let beatspersecond = 60/bpm;
      let stepfloat = (t/(beatspersecond/4));
    
      return 1-(stepfloat-(int(stepfloat)));
    }
    
function flash(xx, yy, offset, everyxbeat) {
	const wi = FRAME_WIDTH;
	const hi = FRAME_HEIGHT;
	blendMode(ADD);
	strokeWeight(1);
  
  // start += FRAME_X;
  // end += FRAME_Y;
	
	// for (let y = start; y < end; y++) {
	// 	let c = (1-((y-start)/(end-start)))*255*beatSaw(offset, everyxbeat);
	// 	stroke(c);
	// 	// if (curse) g.stroke(c, 20f, 20f);
	// 	line(y, y, wi-y-1, y);
	// 	line(wi-y, y, wi-y, hi-y-1);
	// 	line(wi-y, hi-y, y+1, hi-y);
	// 	line(y, hi-y, y, y+1);
	// }
  
  
    let c = max(0, xx*beatSawXX(offset, everyxbeat)-yy);
    noStroke();
    fill(c);
    rect(FRAME_X, FRAME_Y, wi, hi);
	blendMode(BLEND);
}

function flashKick() {
	flash(120, 50, 0, 1);
}

function cymbal() {
  flash(200, 0, 0, 4);
}






















let processing_angle_code = "";
let slidingTextWindow = 0;
let codeMicroStep = 0;
let depthSortFramebuffer, planetsFramebuffer;

let starfield, suntex, surftex1, surftex2;

let sun;
let planet1;
let planet2;

function preloadProcessingANGLE() {
  
}

function setupProcessingANGLE() {
  processing_angle_code = loadStrings(PATH+"img/ProcessingANGLE/glcode.txt");
  depthSortFramebuffer = createFramebuffer({ width: 320/2, height: 360/2 });
  planetsFramebuffer = createFramebuffer({ width: 512/2, height: 384/2 });
  starfield = loadImage(PATH+"img/ProcessingANGLE/starfield.jpg");
  suntex    = loadImage(PATH+"img/ProcessingANGLE/sun.jpg");  
  surftex1  = loadImage(PATH+"img/ProcessingANGLE/planet.jpg");  
  surftex2  = loadImage(PATH+"img/ProcessingANGLE/mercury.jpg");
  
  sun = buildGeometry(sungeo);
  planet1 = buildGeometry(planet1geo);
  planet2 = buildGeometry(planet2geo);
}

function sungeo() {
  noStroke();
  texture(suntex);
  sphere(150, 10, 10);
}

function planet1geo() {
  noStroke();
  texture(surftex1);
  sphere(150, 10, 10);
}

function planet2geo() {
  noStroke();
  texture(surftex2);
  sphere(50, 10, 10);
}

function processingANGLE() {
  background(50, 50, 70);
  
  resetShader();
  
  const FONT_SIZE = 10;
  const SLIDING_WINDOW_LENGTH = 100;
  
  processMouse(true, 0.95);
  codeMicroStep += 10*delta;
  codeMicroStep += mouseVel()*0.05*delta;
  
  if (codeMicroStep < 0) {
    slidingTextWindow--;
    codeMicroStep += 100;
  }
  if (codeMicroStep > 100) {
    slidingTextWindow++;
    codeMicroStep -= 100;
  }
  
  push();
  fill(255);
  textFont(typewriterFont, FONT_SIZE);
  textAlign(LEFT, TOP);
  
  
  rotateY(-0.4);
  rotateX(-1);
  
  let iii = 0;
  for (let i = slidingTextWindow; i < slidingTextWindow+SLIDING_WINDOW_LENGTH; i++) {
    text(processing_angle_code[i%processing_angle_code.length], -0, -height/2+(FONT_SIZE+4)*iii-100);
    iii++;
  }
  
  pop();
  depthSort();
  processingANGLEWindow(20, 20, "DepthSort", depthSortFramebuffer);
  
  planets();
  processingANGLEWindow(100, 240, "Planets", planetsFramebuffer);
  
}





function processingANGLEWindow(x, y, title, frame) {
  
  push();
  // rotateY(0.8);
  // rotateX(-0.2);
  const scl = (width/750);
  strokeWeight(2.5);
  stroke(255);
  noFill();
  const wi = frame.width*scl;
  const hi = frame.height*scl;
  x *= scl;
  y *= scl;
  
  y += sin(totalTime*0.02+y*0.28457)*7;
  
  image(frame, -width/2+x, -height/2+y, wi, hi);
  rect(-width/2+x, -height/2+y, wi, hi);
  rect(-width/2+x, -height/2+y-20, wi, 20);
  fill(255);
  textAlign(LEFT, TOP);
  textFont(typewriterFont, 12);
  text(title, -width/2+x+4, -height/2+y-18);
  pop();
}

function depthSort() {
  depthSortFramebuffer.begin();
  // size(640, 720, P3D);
  
  colorMode(HSB, 100, 100, 100, 100);
    
  noStroke();
  
  background(0);
  gl = this._renderer.GL;
  gl.disable(gl.DEPTH_TEST);
 
  // translate(-depthSortFramebuffer.width/2, -depthSortFramebuffer.height/2, -300);
  scale(0.5);
    
  let rot = totalTime*2;

  rotateZ(radians(90));
  rotateX(radians(rot/60.0 * 10));
  rotateY(radians(rot/60.0 * 30));
 
  blendMode(ADD);
    
  const TRIS = 28;
  for (let i = 0; i < TRIS; i++) {
    fill(map(i % 10, 0, 10, 0, 100), 100, 100, 30);
 
    // beginShape(TRIANGLES);
    // vertex(200, 50, -50);
    // vertex(100, 100, 50);
    // vertex(100, 0, 20);
    // endShape();
    triangle(50, -50, 100+100, 50, 0+50, 100);
 
    rotateY(radians(270.0/TRIS));
  }
  
  gl.enable(gl.DEPTH_TEST);
  blendMode(BLEND);
  depthSortFramebuffer.end();
  colorMode(RGB, 255, 255, 255, 255);
  
}



function planets() {
  planetsFramebuffer.begin();
  resetShader();
  background(0);
  noStroke();
  fill(255);
  
  gl = this._renderer.GL;
  gl.disable(gl.DEPTH_TEST);
  image(starfield, -planetsFramebuffer.width/2, -planetsFramebuffer.height/2, planetsFramebuffer.width, planetsFramebuffer.height);
  gl.enable(gl.DEPTH_TEST);
  scale(0.25);
  
  push();
  translate(planetsFramebuffer.width/2, planetsFramebuffer.height/2-150, -300);  
  
  push();
  rotateY(PI * totalTime / 500);
  texture(suntex)
  model(sun);
  pop();

  pointLight(255,  255,  255,  0,  -150/4,  0);  
  rotateY(PI * totalTime / 300);
  translate(0, 0, 300);

  texture(surftex2);
  model(planet2);  
  
  pop();
  
  // noLights();
  pointLight(255,  255,  255,  9999, 0, -100); 
  pointLight(255,  255,  255,  9999, 0, -100); 
  
  translate(-1.8 * planetsFramebuffer.width,  0.6 * planetsFramebuffer.height + sin(totalTime*0.021)*20,  -300);
  texture(surftex1);
  model(planet1);
  planetsFramebuffer.end();
}


// function section(txt, start, numLines) {
//   let startindexof = txt.indexOf('\n', 0);
//   console.log("startindexof "+startindexof);
//   let lineCounter = 1;
//   while (lineCounter != start || startindexof != -1) {
//     startindexof = txt.indexOf('\n', startindexof+1);
//     lineCounter++;
//   }
//   if (startindexof == -1) {
//     return "";
//   }
  
  
//   let lengthindexof = txt.indexOf('\n', 0);
//   lineCounter = 1;
//   while (lineCounter != numLines || lengthindexof != -1) {
//     lengthindexof = txt.indexOf('\n', lengthindexof+1);
//     lineCounter++;
//   }
//   if (lengthindexof == -1) {
//     lengthindexof = txt.length-1;
//   }
  
//   console.log("lengthindexof "+lengthindexof);
  
//   return txt.substring(startindexof, lengthindexof);
// }














let blog_playerX = 0;
let blog_playerY = 0;
let blog_playerZ = 0;
const NUM_ENTRIES = 9;

let blog_sky = [], blog_grass, blog_tree = [], blog_entries = [];
let entryShape;

function preloadTimewayBlog() {
  
}

function setupTimewayBlog() {
  let dir = PATH+"img/realmtemplates/010/";
  blog_sky[0] = loadImage(dir+"pixelrealm-sky.png");
  blog_grass = loadImage(dir+"pixelrealm-grass.png");
  blog_tree[0] = loadImage(dir+"pixelrealm-terrain_object-1.png");
  
  dir = PATH+"img/BlogEntries/";
  for (let i = 0; i < NUM_ENTRIES; i++) {
    blog_entries[i] = loadImage(dir+str(i+1)+".png");
  }
  
  canvas.getTexture(blog_sky[0]).setInterpolation(NEAREST, NEAREST);
  canvas.getTexture(blog_grass).setInterpolation(NEAREST, NEAREST);
  canvas.getTexture(blog_tree[0]).setInterpolation(NEAREST, NEAREST);
  
  entryShape = buildGeometry(createEntryGeo);
}

function createEntryGeo() {
  const scll = 0.5;
  const wi = 480*scll, hi = 270*scll;
  texture(blog_entries[0])
  beginShape(QUADS);
  vertex(0, -hi, 1, 0);
  vertex(wi, -hi, 0, 0);
  vertex(wi, 0, 0, 1);
  vertex(0, 0, 1, 1);
  endShape(CLOSE);
}

function timewayBlog() {
  background(220);
  renderPixelRealmMockup(blog_playerX, blog_playerY, blog_playerZ, false, blog_grass, blog_tree, 1, blog_sky, 1, blogObjects);
  
  
  processMouse();
  blog_playerX -= 5*delta + mouseVel()*0.005*delta;
}

function renderEntry(x, imgIndex) {
  push();
  standardShader.setUniform("utexture", blog_entries[imgIndex]);
  translate(x, 0, 700);
  model(entryShape);
  pop();
}

function blogObjects() {
  // resetShader();
  fill(255);
  
  let xxx = int(abs((blog_playerX)/300));
  for (let i = xxx; i < xxx+20; i++) {
    renderEntry(i*-300+1500, i%NUM_ENTRIES);
    
  }
}







let img_pages = [];

const MAX_DISS_PARTICLES = 300;

let dissParticlesBackX = [];
let dissParticlesBackY = [];
let dissParticlesBackImg = [];

const DISSERTATION_PAGE_START = 10;
const DISSERTATION_PAGE_END = 48;
const PAGE_BUFFER_LENGTH = 10;

let img_vulkan, img_processing;

let pageSpinRotation;

let lastRotateState = false;

let dissertationPage = 0;
let pageGeo;

function setupDissertation() {
  let dir = PATH+"img/Diss/";
  
  img_vulkan = loadImage(PATH+"img/OtherIcons/vulkan_logo_small.png");
  img_processing = loadImage(PATH+"img/OtherIcons/processing_logo_small.png");
  
  for (let i = 0; i < PAGE_BUFFER_LENGTH; i++) {
    img_pages[i] = loadImage(dir+"output_prefix-"+str(DISSERTATION_PAGE_START+i)+".png");
  }
//   pageGeo = buildGeometry(makePageGeo);
  pageSpinRotation = TWO_PI;
}

function addDissParticle() {
  const particlescl = 0.4;
  for (let i = 0; i < MAX_DISS_PARTICLES; i++) {
      if (dissParticlesBackImg[i] == undefined) {
        const imgIndex = int(random(0, 2));
        if (imgIndex == 0) {
          dissParticlesBackImg[i] = img_vulkan;
        }
        else if (imgIndex == 1) {
          dissParticlesBackImg[i] = img_processing;
        }
        
        dissParticlesBackX[i] = random(-width/2, width);
        dissParticlesBackY[i] = -300;
        break;
      }
  }
}

function runDissParticles() {
  if (int(random(0, 45)) == 0) {
    addDissParticle();
  }
  
  let particleCount = 0;
  for (let i = 0; i < MAX_DISS_PARTICLES; i++) {
    if (dissParticlesBackImg[i] != undefined) {
      dissParticlesBackY[i] += delta;
      particleCount++;
      
      if (dissParticlesBackY[i] > height*1.5) {
        dissParticlesBackImg[i] = undefined;
      }
    }
  }
  
  // print(particleCount);
}

function dissertation() {
  background(50, 50, 70);
  resetShader();
  
  const adjustscale = width/600;
  
  push();
  translate(0, 0, -200);
  
  const particlescl = 0.4;
  
  
  for (let i = 0; i < MAX_DISS_PARTICLES; i++) {
    if (dissParticlesBackImg[i] != undefined) {
      image(dissParticlesBackImg[i], -width/2+dissParticlesBackX[i], -height/2+dissParticlesBackY[i], dissParticlesBackImg[i].width*particlescl, dissParticlesBackImg[i].height*particlescl);
    }
  }
  
  pop();
  
  processMouse();
  pageSpinRotation += 0.01*delta+mouseVel()*0.0001*delta;
  
  const scl = 0.4*adjustscale;
  const wi = 414*scl;
  const hi = 586*scl;
  push();
  rotateY(pageSpinRotation);
  
  const invert = (pageSpinRotation-HALF_PI)%TWO_PI <= PI;
  // if (invert) {
  //   image(img_pages[dissertationPage], -wi/2, -hi/2, wi, hi);
  // }
  // else {
  //   image(img_pages[dissertationPage], wi/2, -hi/2, -wi, hi);
  // }
  
  if (lastRotateState != invert) {
    
    // deleteTexture(img_pages[dissertationPage%PAGE_BUFFER_LENGTH]);
    
    if (img_pages[dissertationPage%PAGE_BUFFER_LENGTH] == undefined) {
      const newIndex = DISSERTATION_PAGE_START+((PAGE_BUFFER_LENGTH+dissertationPage)%(DISSERTATION_PAGE_END-DISSERTATION_PAGE_START));
      const dir = PATH+"img/Diss/";
      img_pages[dissertationPage%PAGE_BUFFER_LENGTH] = loadImage(dir+"output_prefix-"+str(newIndex)+".png");
    }
    
    dissertationPage++;
    
    lastRotateState = invert;
  }
  
  textureMode(NORMAL);
  beginShape(QUADS);
  texture(img_pages[dissertationPage%PAGE_BUFFER_LENGTH]);
  vertex(-wi/2, -hi/2, 0, invert ? 1 : 0, 0);
  vertex( wi/2, -hi/2, 0, invert ? 0 : 1, 0);
  vertex( wi/2,  hi/2, 0, invert ? 0 : 1, 1);
  vertex(-wi/2,  hi/2, 0, invert ? 1 : 0, 1);
  endShape(CLOSE);
  
  
  pop();
}









let img_izz, img_shader, img_sketchiepad, img_terminaldisplay, img_terminalcal;

function setupOtherProjects() {
  const dir = PATH+"img/OtherIcons/";
  img_izz = loadImage(dir+"izz.png");
  img_shader = loadImage(dir+"shader.png");
  img_sketchiepad = loadImage(dir+"sketchiepad.png");
  img_terminaldisplay = loadImage(dir+"terminal-display.png");
  img_terminalcal = loadImage(dir+"termincal-cal.png");
  
  
  canvas.getTexture(img_izz).setInterpolation(NEAREST, NEAREST);
  canvas.getTexture(img_shader).setInterpolation(NEAREST, NEAREST);
  canvas.getTexture(img_sketchiepad).setInterpolation(NEAREST, NEAREST);
  canvas.getTexture(img_terminaldisplay).setInterpolation(NEAREST, NEAREST);
  canvas.getTexture(img_terminalcal).setInterpolation(NEAREST, NEAREST);
  
  standardSeeThruShader = createShader(shader_vert_stnd, shader_frag_seethru);
}

let otherProjectsSpin = 238;

function otherProjects() {
  background(50);
  // shader(standardSeeThruShader);
  
  
  const imgs = [img_izz, img_shader, img_sketchiepad, img_terminaldisplay, img_terminalcal];
  
  noStroke();
//   textureMode(NORMAL);
  
//   for (let i = 0; i < imgs.length; i++) {
//     push();
//     const d = frameCount*0.06;
//     const r = 50*(i+1);
//     translate(sin(d)*r, cos(r)*10*(i+1), cos(d)*r);
//     // image(imgs[i], -imgs[i].width/2, -imgs[i].height/2);
//     standardShader.setUniform("utexture", imgs[i]);
//     beginShape(QUADS);
//     texture(imgs[i]);
//     vertex(-imgs[i].width/2, -imgs[i].height/2, 0, 0, 0);
//     vertex(imgs[i].width/2, -imgs[i].height/2,  0, 1, 0);
//     vertex(imgs[i].width/2, imgs[i].height/2,   0, 1, 1);
//     vertex(-imgs[i].width/2, imgs[i].height/2,  0, 0, 1);
//     endShape(CLOSE);
//     // fill(255);
//     // rect(0, 0, 100, 100);
//     pop();
//   }
  
  
  processMouse();
  otherProjectsSpin += 0.02*delta+mouseVel()*0.0001*delta;
  
  for (let i = 0; i < imgs.length; i++) {
    const d = otherProjectsSpin*noise(i*2835);
    const r = 100*(i+1);
    image(imgs[i], -imgs[i].width/2+sin(d)*r, -imgs[i].height/2+cos(d)*r);
  }
  
  resetShader();
}
















let mode = 0;
let changeToMode = -1;
let modeChangeFade = 0;
let allowClickToFade = true;

function mousePressed() {
  if (allowClickToFade) {
    changeMode(0);

  }
  // changeMode((mode+1)%7);
}

function changeMode(newmode) 
{
  if (changeToMode == newmode) {
    return;
  }
  // if (millis() < 500) {
  //   return;
  // }
  modeChangeFade = 1;
  if (mode == 0) modeChangeFade = 29;
  changeToMode = newmode;
  // if (changeToMode > 2) {
  //   changeToMode = 1;
  // }
}

function setMode(newmode, clickToChange=true) {
  mode = newmode;
  changeToMode = newmode;
  modeChangeFade = 0;
  allowClickToFade = clickToChange;
}

let stillMode = false;
function timewayStillMode() {
  stillMode = true;
  portalX = -1000;
  portalY = 0;
  portalZ = 1000;
  timeway_playerX = -1130;
  timeway_playerZ = 506;
}

let delta = 0;
let lastFrameMillis = 0;
let thisFrameMillis = 0;
const BASE_FRAMERATE = 60;
let totalTime = 0;

function updateDelta() {
      lastFrameMillis = thisFrameMillis;
      thisFrameMillis = millis();


      const timeframe = 1000/BASE_FRAMERATE;
      const livefps = (timeframe/(thisFrameMillis-lastFrameMillis))*BASE_FRAMERATE;

      delta = min(BASE_FRAMERATE/livefps, 7.5);
      
      // Also update the time while we're at it.
      totalTime += delta;
}

function preload() {
  typewriterFont = loadFont(PATH+"img/SourceCodePro-Regular.ttf");
  preloadTimeway();
  preloadSketchio();
  preloadProcessingANGLE();
  preloadTimewayBlog();
}

function setup() {
  frameRate(60);
  canvas = createCanvas(windowWidth, windowHeight, WEBGL);
  // canvas = createCanvas(600, 400, WEBGL);
  prevMouseX = mouseX;
  prevMouseY = mouseY;

  lastFrameMillis = millis();
  thisFrameMillis = millis();
  
  setupTimeway();
  setupSketchio();
  setupProcessingANGLE();
  setupTimewayBlog();
  setupDissertation();
  setupOtherProjects();
  
  
}


function draw() {
  
  
  if (mode == 0) {
    background(60, 65, 74);
  }
  else if (mode == 1) {
    timeway();
  }
  else if (mode == 2) {
    sketchio();
  }
  else if (mode == 3) {
    processingANGLE();
  }
  else if (mode == 4) {
    timewayBlog();
  }
  else if (mode == 5) {
    dissertation();
  }
  else if (mode == 6) {
    otherProjects();
  }
  
  // Do this no matter what screen we're on
  runDissParticles();
  
  
  
  if (modeChangeFade >= 1) {
    const modeChangeFadebefore = modeChangeFade;
    modeChangeFade += delta;
    if (modeChangeFadebefore < 30 && modeChangeFade > 30) {  // used to be modeChangeFade == 30
      mode = changeToMode;
    }
    
    noStroke();
    if (modeChangeFade <= 30) {
      fill(60, 65, 74, (modeChangeFade/30)*255);
    }
    else if (modeChangeFade <= 60) {
      fill(60, 65, 74, 255-((modeChangeFade-30)/30)*255);
    }
    else if (modeChangeFade > 60) modeChangeFade = 0;
    
    resetShader();
    clearDepth();
    rect(-width/2, -height/2, width, height);
  }
  
  updateDelta();
}