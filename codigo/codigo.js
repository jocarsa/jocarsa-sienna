/*
  Archivo principal y general de código
  Gestiona las llamadas y el uso de Aframe.io en este proyecto
*/

const BOX_SIZE = 1; // Define the size of each box
let SPHERE_RADIUS = 3; // Sphere radius used when adding/removing blocks
const GAUSSIAN_SIGMA = 1; // Standard deviation for Gaussian distribution

let memoria = [];

// === For loading user GLB ===
let userModelUrl = null; // Will store the blob URL after file upload

const sceneEl = document.querySelector("a-scene");
const instructionEl = document.getElementById("instruction");
const playerEl = document.querySelector("#player");

// === Chunk Management ===
const CHUNK_SIZE = 8;     // Each chunk is 8 x 8 blocks
const LOAD_DISTANCE = 2;  // How many chunks around the player to load
let loadedChunks = {};

// === Target Circle for Sphere Radius ===
const targetCircle = document.createElement("div");
targetCircle.style.position = "absolute";
targetCircle.style.top = "50%";
targetCircle.style.left = "50%";
targetCircle.style.transform = "translate(-50%, -50%)";
targetCircle.style.border = "2px solid white";
targetCircle.style.borderRadius = "50%";
targetCircle.style.pointerEvents = "none"; // so clicks pass through
document.body.appendChild(targetCircle);

/** Updates the "visual circle" on screen that shows SPHERE_RADIUS */
function updateTargetCircle() {
  const circleSize = SPHERE_RADIUS * 200; // Arbitrary scale for display
  targetCircle.style.width = `${circleSize}px`;
  targetCircle.style.height = `${circleSize}px`;
}
updateTargetCircle();

// === Keyboard: Increase/Decrease SPHERE_RADIUS with + and - keys ===
document.addEventListener("keydown", (event) => {
  if (event.key === "+" || event.key === "Add") {
    // Increase
    SPHERE_RADIUS = Math.min(SPHERE_RADIUS + 1, 10);
    updateTargetCircle();
  } else if (event.key === "-" || event.key === "Subtract") {
    // Decrease
    SPHERE_RADIUS = Math.max(SPHERE_RADIUS - 1, 0);
    updateTargetCircle();
  }
});

// === Convert world (x, z) to chunk coords ===
function getChunkCoordinates(x, z) {
  return {
    x: Math.floor(x / (CHUNK_SIZE * BOX_SIZE)),
    z: Math.floor(z / (CHUNK_SIZE * BOX_SIZE))
  };
}

// === Load a chunk if not already loaded ===
function loadChunk(chunkX, chunkZ) {
  const chunkKey = `${chunkX},${chunkZ}`;
  if (!loadedChunks[chunkKey]) {
    loadedChunks[chunkKey] = true;

    // Check if chunk blocks are in memoria
    const chunkBlocks = memoria.filter((block) => {
      const blockChunkX = Math.floor(block.x / CHUNK_SIZE);
      const blockChunkZ = Math.floor(block.z / CHUNK_SIZE);
      return blockChunkX === chunkX && blockChunkZ === chunkZ;
    });

    // If chunk data is found in memoria, recreate those blocks
    if (chunkBlocks.length > 0) {
      chunkBlocks.forEach((block) => {
        createBox(
          `${block.x * BOX_SIZE} ${block.y * BOX_SIZE} ${block.z * BOX_SIZE}`,
          block.id,
          block.mat
        );
      });
    } else {
      // Otherwise, create a new "flat" chunk (or any generation logic you like)
      for (let x = 0; x < CHUNK_SIZE; x++) {
        for (let z = 0; z < CHUNK_SIZE; z++) {
          const blockX = chunkX * CHUNK_SIZE + x;
          const blockZ = chunkZ * CHUNK_SIZE + z;
          createBox(`${blockX * BOX_SIZE} 0 ${blockZ * BOX_SIZE}`, memoria.length, "white");
          memoria.push({
            id: memoria.length,
            x: blockX,
            y: 0,
            z: blockZ,
            mat: "white",
          });
        }
      }
    }
  }
}

// === Unload a chunk if it's too far from the player ===
function unloadChunk(chunkX, chunkZ) {
  const chunkKey = `${chunkX},${chunkZ}`;
  if (loadedChunks[chunkKey]) {
    loadedChunks[chunkKey] = false;

    // Find blocks in this chunk
    const blocksInChunk = memoria.filter((block) => {
      const blockChunkX = Math.floor(block.x / CHUNK_SIZE);
      const blockChunkZ = Math.floor(block.z / CHUNK_SIZE);
      return blockChunkX === chunkX && blockChunkZ === chunkZ;
    });

    // Remove them from the scene
    blocksInChunk.forEach((block) => {
      const blockId = `${block.x * BOX_SIZE} ${block.y * BOX_SIZE} ${block.z * BOX_SIZE}`;
      const blockElement = document.querySelector(`[identificador="${blockId}"]`);
      if (blockElement) {
        blockElement.parentNode.removeChild(blockElement);
      }
    });
  }
}

// === Called every frame to ensure needed chunks are loaded/unloaded ===
function updateChunks(playerPosition) {
  const playerChunk = getChunkCoordinates(playerPosition.x, playerPosition.z);

  // Load near chunks
  for (let dx = -LOAD_DISTANCE; dx <= LOAD_DISTANCE; dx++) {
    for (let dz = -LOAD_DISTANCE; dz <= LOAD_DISTANCE; dz++) {
      const chunkX = playerChunk.x + dx;
      const chunkZ = playerChunk.z + dz;
      loadChunk(chunkX, chunkZ);
    }
  }

  // Unload far chunks
  for (const chunkKey in loadedChunks) {
    if (loadedChunks[chunkKey]) {
      const [chunkX, chunkZ] = chunkKey.split(",").map(Number);
      if (
        Math.abs(chunkX - playerChunk.x) > LOAD_DISTANCE ||
        Math.abs(chunkZ - playerChunk.z) > LOAD_DISTANCE
      ) {
        unloadChunk(chunkX, chunkZ);
      }
    }
  }
}

// === SIMPLE GRAVITY COMPONENT ===
AFRAME.registerComponent("simple-gravity", {
  schema: {
    enabled: { default: true },
    gravity: { type: "number", default: -9.8 },
    raycastLength: { type: "number", default: 2 },
    groundThreshold: { type: "number", default: 1.01 },
    smoothingFactor: { type: "number", default: 0.1 },
  },
  init: function () {
    this.velocityY = 0;
    this.direction = new THREE.Vector3(0, -1, 0);
    this.raycaster = new THREE.Raycaster();
    this.isGrounded = false;
    this.targetY = this.el.object3D.position.y;
  },
  tick: function (time, timeDelta) {
    if (!this.data.enabled) return;

    const delta = timeDelta / 1000; // convert ms to seconds
    const el = this.el;
    const pos = el.object3D.position;

    // Raycast downward
    const origin = new THREE.Vector3(pos.x, pos.y, pos.z);
    this.raycaster.set(origin, this.direction);
    const clickableEls = document.querySelectorAll(".clickable");
    const meshList = [];
    clickableEls.forEach((cEl) => {
      cEl.object3D.traverse(function (obj) {
        if (obj.isMesh) meshList.push(obj);
      });
    });

    const intersects = this.raycaster.intersectObjects(meshList, true);
    let groundDist = Infinity;
    if (intersects.length > 0) {
      groundDist = intersects[0].distance;
    }

    // Snap if close enough to ground
    if (groundDist < this.data.groundThreshold && groundDist !== 0) {
      this.isGrounded = true;
      this.velocityY = 0;
      this.targetY = pos.y - groundDist + this.data.groundThreshold;
    } else {
      // Apply gravity
      this.isGrounded = false;
      this.velocityY += this.data.gravity * delta;
      this.targetY += this.velocityY * delta;
    }

    // Smooth approach
    pos.y += (this.targetY - pos.y) * this.data.smoothingFactor;

    // Update the chunk system based on the new position
    updateChunks(pos);
  },
});

// === CREATE BLOCKS ===
function createBox(position, id, material) {
  const caja = document.createElement("a-box");
  caja.setAttribute("position", position);
  caja.setAttribute("mixin", "mat" + material);  // e.g. "matblue"
  caja.setAttribute("class", "clickable");
  caja.setAttribute("depth", BOX_SIZE);
  caja.setAttribute("height", BOX_SIZE);
  caja.setAttribute("width", BOX_SIZE);
  caja.setAttribute("identificador", `${position}`);
  caja.setAttribute("shadow", "cast: true; receive: true");

  // Single 'click' event => determine left or right mouse button
  caja.addEventListener("click", function (evt) {
    const mouseEvent = evt.detail.mouseEvent;
    if (!mouseEvent) return;

    // LEFT-CLICK => remove sphere of blocks
    if (mouseEvent.button === 0) {
      removeSphereOfBoxes(evt.detail.intersection.point);
    }
    // RIGHT-CLICK => add sphere of blocks
    else if (mouseEvent.button === 2) {
      // Example: Use the currently active color or set "blue" as default
      createSphereOfBoxes(evt.detail.intersection.point, "blue");
    }
  });

  sceneEl.appendChild(caja);
}

// === CREATE A SPHERE OF BOXES ===
function createSphereOfBoxes(centerPoint, material) {
  for (let dx = -SPHERE_RADIUS; dx <= SPHERE_RADIUS; dx++) {
    for (let dy = -SPHERE_RADIUS; dy <= SPHERE_RADIUS; dy++) {
      for (let dz = -SPHERE_RADIUS; dz <= SPHERE_RADIUS; dz++) {
        const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
        if (distance > SPHERE_RADIUS) continue;

        const newPos = {
          x: Math.round(centerPoint.x / BOX_SIZE) * BOX_SIZE + dx * BOX_SIZE,
          y: Math.round(centerPoint.y / BOX_SIZE) * BOX_SIZE + dy * BOX_SIZE,
          z: Math.round(centerPoint.z / BOX_SIZE) * BOX_SIZE + dz * BOX_SIZE,
        };

        const blockId = `${newPos.x} ${newPos.y} ${newPos.z}`;
        const existingBlock = document.querySelector(`[identificador="${blockId}"]`);
        if (existingBlock) continue; // Skip if there's already a block

        createBox(blockId, memoria.length, material);
        memoria.push({
          id: memoria.length,
          x: newPos.x / BOX_SIZE,
          y: newPos.y / BOX_SIZE,
          z: newPos.z / BOX_SIZE,
          mat: material,
        });
        localStorage.setItem("memoria", JSON.stringify(memoria));
      }
    }
  }
}

// === REMOVE A SPHERE OF BOXES ===
function removeSphereOfBoxes(centerPoint) {
  for (let dx = -SPHERE_RADIUS; dx <= SPHERE_RADIUS; dx++) {
    for (let dy = -SPHERE_RADIUS; dy <= SPHERE_RADIUS; dy++) {
      for (let dz = -SPHERE_RADIUS; dz <= SPHERE_RADIUS; dz++) {
        const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
        if (distance > SPHERE_RADIUS) continue;

        const newPos = {
          x: Math.round(centerPoint.x / BOX_SIZE) * BOX_SIZE + dx * BOX_SIZE,
          y: Math.round(centerPoint.y / BOX_SIZE) * BOX_SIZE + dy * BOX_SIZE,
          z: Math.round(centerPoint.z / BOX_SIZE) * BOX_SIZE + dz * BOX_SIZE,
        };

        const blockId = `${newPos.x} ${newPos.y} ${newPos.z}`;
        const blockElement = document.querySelector(`[identificador="${blockId}"]`);
        if (blockElement) {
          blockElement.parentNode.removeChild(blockElement);

          // Remove from memoria
          memoria = memoria.filter((block) => {
            const blockPos = `${block.x * BOX_SIZE} ${block.y * BOX_SIZE} ${block.z * BOX_SIZE}`;
            return blockPos !== blockId;
          });
          localStorage.setItem("memoria", JSON.stringify(memoria));
        }
      }
    }
  }
}

// === LOAD OR INIT MEMORIA FROM localStorage ===
if (localStorage.getItem("memoria") == null) {
  // Example: generate a small region
  const gridSize = 5;
  for (let x = -gridSize; x <= gridSize; x++) {
    for (let z = -gridSize; z <= gridSize; z++) {
      for (let y = -4; y <= 0; y++) {
        memoria.push({
          id: memoria.length,
          x: x,
          y: y,
          z: z,
          // Use random color from a big color array (css3Colors)
          mat: css3Colors[Math.floor(Math.random() * css3Colors.length)],
        });
      }
    }
  }
} else {
  console.log("Sí hay memoria previa, cargo la memoria existente");
  memoria = JSON.parse(localStorage.getItem("memoria"));
}
localStorage.setItem("memoria", JSON.stringify(memoria));

// Recreate blocks from memoria
memoria.forEach(function (celda) {
  createBox(
    `${celda.x * BOX_SIZE} ${celda.y * BOX_SIZE} ${celda.z * BOX_SIZE}`,
    celda.id,
    celda.mat
  );
});

/*
  =============== FILE UPLOADER FOR GLB MODELS ===============
  Let the user upload a GLB model, store it in userModelUrl
*/
document.getElementById('glbUploader').addEventListener('change', function (e) {
  const file = e.target.files[0];
  if (!file) return;

  // Convert file to a blob: URL
  userModelUrl = URL.createObjectURL(file);
  console.log("New model URL:", userModelUrl);

  // Automatically spawn some random copies:
  spawnRandomAliens();  
});

/*
  =============== SPAWN RANDOM MODELS (the uploaded GLB) ===============
*/
function spawnRandomAliens() {
  if (!userModelUrl) {
    console.log("No .glb file uploaded yet!");
    return;
  }

  // Decide how many to spawn, e.g. 5..10
  const count = Math.floor(Math.random() * 6) + 5;
  for (let i = 0; i < count; i++) {
    // Random position
    const x = Math.floor(Math.random() * 50) - 25;
    const z = Math.floor(Math.random() * 50) - 25;
    const y = 1;

    const alienEl = document.createElement("a-entity");
    alienEl.setAttribute("gltf-model", `url(${userModelUrl})`);
    alienEl.setAttribute("position", `${x} ${y} ${z}`);
    alienEl.setAttribute("scale", "0.5 0.5 0.5");
    alienEl.setAttribute("animation-mixer", ""); // If your GLB has animations

    sceneEl.appendChild(alienEl);
  }
}

// === Pointer Lock & Instruction Overlay ===
playerEl.addEventListener("click", function () {
  instructionEl.classList.add("hidden");
});

document.addEventListener("pointerlockchange", function () {
  if (document.pointerLockElement === sceneEl.canvas) {
    // pointer locked
  } else {
    instructionEl.classList.remove("hidden");
  }
});

document.addEventListener("pointerlockerror", function () {
  alert("Error intentando activar pointer lock.");
  instructionEl.classList.remove("hidden");
});

instructionEl.addEventListener("click", function () {
  instructionEl.classList.add("hidden");
  sceneEl.canvas.requestPointerLock();
});

