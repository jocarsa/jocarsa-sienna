/*
  Archivo principal y general de código
  Gestiona las llamadas y el uso de Aframe.io en este proyecto
*/

let memoria = [];

const sceneEl = document.querySelector("a-scene");
const instructionEl = document.getElementById("instruction");
const playerEl = document.querySelector("#player");

// === Chunk Management ===
const CHUNK_SIZE = 8; // Size of each chunk (16x16 blocks)
const LOAD_DISTANCE = 2; // Number of chunks to load around the player
let loadedChunks = {};

// Function to get chunk coordinates from world coordinates
function getChunkCoordinates(x, z) {
  return {
    x: Math.floor(x / CHUNK_SIZE),
    z: Math.floor(z / CHUNK_SIZE),
  };
}

// Function to load a chunk
function loadChunk(chunkX, chunkZ) {
  const chunkKey = `${chunkX},${chunkZ}`;
  if (!loadedChunks[chunkKey]) {
    loadedChunks[chunkKey] = true;
    console.log(`Loading chunk: ${chunkKey}`);

    // Check if the chunk exists in memoria
    const chunkBlocks = memoria.filter((block) => {
      const blockChunkX = Math.floor(block.x / CHUNK_SIZE);
      const blockChunkZ = Math.floor(block.z / CHUNK_SIZE);
      return blockChunkX === chunkX && blockChunkZ === chunkZ;
    });

    // If the chunk exists in memoria, restore it
    if (chunkBlocks.length > 0) {
      chunkBlocks.forEach((block) => {
        createBox(`${block.x} ${block.y} ${block.z}`, block.id, block.mat);
      });
    } else {
      // If the chunk doesn't exist in memoria, create new blocks
      for (let x = 0; x < CHUNK_SIZE; x++) {
        for (let z = 0; z < CHUNK_SIZE; z++) {
          const blockX = chunkX * CHUNK_SIZE + x;
          const blockZ = chunkZ * CHUNK_SIZE + z;
          createBox(`${blockX} 0 ${blockZ}`, memoria.length, "white");
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

// Function to unload a chunk
// Function to unload a chunk
function unloadChunk(chunkX, chunkZ) {
  const chunkKey = `${chunkX},${chunkZ}`;
  if (loadedChunks[chunkKey]) {
    loadedChunks[chunkKey] = false;
    console.log(`Unloading chunk: ${chunkKey}`);

    // Find all blocks in the chunk
    const blocksInChunk = memoria.filter((block) => {
      const blockChunkX = Math.floor(block.x / CHUNK_SIZE);
      const blockChunkZ = Math.floor(block.z / CHUNK_SIZE);
      return blockChunkX === chunkX && blockChunkZ === chunkZ;
    });

    // Remove blocks from the scene
    blocksInChunk.forEach((block) => {
      const blockId = `${block.x} ${block.y} ${block.z}`; // Match the identificador format
      const blockElement = document.querySelector(`[identificador="${blockId}"]`);
      if (blockElement) {
        blockElement.parentNode.removeChild(blockElement);
        console.log(`Removed block: ${blockId}`);
      }
    });

    console.log(`Unloaded ${blocksInChunk.length} blocks from chunk ${chunkKey}`);
  }
}

// Function to update chunks based on player position
// Function to update chunks based on player position
function updateChunks(playerPosition) {
  const playerChunk = getChunkCoordinates(playerPosition.x, playerPosition.z);

  // Load chunks within the load distance
  for (let dx = -LOAD_DISTANCE; dx <= LOAD_DISTANCE; dx++) {
    for (let dz = -LOAD_DISTANCE; dz <= LOAD_DISTANCE; dz++) {
      const chunkX = playerChunk.x + dx;
      const chunkZ = playerChunk.z + dz;
      loadChunk(chunkX, chunkZ);
    }
  }

  // Unload chunks outside the load distance
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

// === 1) SIMPLE GRAVITY COMPONENT (NO PHYSICS SYSTEM) ===
AFRAME.registerComponent("simple-gravity", {
  schema: {
    enabled: { default: true },
    gravity: { type: "number", default: -9.8 },
    raycastLength: { type: "number", default: 2 },
    groundThreshold: { type: "number", default: 1.01 }, // Distance to snap to ground
    smoothingFactor: { type: "number", default: 0.1 }, // Smoothing for vertical movement
  },
  init: function () {
    this.velocityY = 0;
    this.direction = new THREE.Vector3(0, -1, 0);
    this.raycaster = new THREE.Raycaster();
    this.isGrounded = false;
    this.targetY = this.el.object3D.position.y; // Target Y position for smoothing
  },
  tick: function (time, timeDelta) {
    if (!this.data.enabled) return;

    const delta = timeDelta / 1000; // ms -> s
    const el = this.el;
    const pos = el.object3D.position;

    // Raycast to detect ground
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

    // Snap to ground if close enough
    if (groundDist < this.data.groundThreshold && groundDist !== 0) {
      this.isGrounded = true;
      this.velocityY = 0;
      this.targetY = pos.y - groundDist + this.data.groundThreshold; // Set target Y position
    } else {
      this.isGrounded = false;
      this.velocityY += this.data.gravity * delta; // Apply gravity
      this.targetY += this.velocityY * delta; // Update target Y position
    }

    // Smoothly interpolate to the target Y position
    pos.y += (this.targetY - pos.y) * this.data.smoothingFactor;

    // Update chunks based on player position
    updateChunks(pos);
  },
});

// === 2) CREATE BLOCKS (NO static-body) ===
function createBox(position, id, material) {
  const caja = document.createElement("a-box");
  caja.setAttribute("position", position);
  caja.setAttribute("mixin", "mat" + material);
  caja.setAttribute("class", "clickable");
  caja.setAttribute("depth", "1");
  caja.setAttribute("height", "1");
  caja.setAttribute("width", "1");
  caja.setAttribute("identificador", `${position}`); // Use position as the unique identifier
  caja.setAttribute("shadow", "cast: true; receive: true");

  // Single 'click' event, check which mouse button was used
  caja.addEventListener("click", function (evt) {
    // Must have pointerEvent to see which button was pressed
    const mouseEvent = evt.detail.mouseEvent;
    console.log(evt);
    if (!mouseEvent) return;

    // LEFT-CLICK -> remove block
    if (mouseEvent.button === 0) {
      console.log("Left-click remove on:", caja);
      caja.parentNode.removeChild(caja);
      // Remove from memoria
      memoria = memoria.filter((block) => block.id !== id);
      localStorage.setItem("memoria", JSON.stringify(memoria));
    }
    // RIGHT-CLICK -> create new block adjacent
    else if (mouseEvent.button === 2) {
      console.log("El material activo es:", repositorioactivo);
      console.log(elementos[repositorioactivo].style.background);

      console.log("Right-click add block near:", caja);
      const intersection = evt.detail.intersection;
      if (!intersection) return;

      // Intersection point and normal
      const point = intersection.point.clone();
      const normal = intersection.face.normal.clone();

      // Move half a unit along the normal from the exact face contact
      // This ensures the new block is adjacent to the face clicked
      normal.multiplyScalar(0.5);
      point.add(normal);

      // Snap to integer grid
      const newPos = {
        x: Math.round(point.x),
        y: Math.round(point.y),
        z: Math.round(point.z),
      };
      const usuario = localStorage.getItem("siennausuario");
      // Create random material
      const newMat = elementos[repositorioactivo].style.background;

      // Actually create & add
      createBox(`${newPos.x} ${newPos.y} ${newPos.z}`, memoria.length, newMat);

      // Store in memory
      memoria.push({
        id: memoria.length,
        usuario: usuario,
        x: newPos.x,
        y: newPos.y,
        z: newPos.z,
        mat: newMat,
      });
      localStorage.setItem("memoria", JSON.stringify(memoria));
    }
  });

  sceneEl.appendChild(caja);
}

// Initialize memoria from localStorage or new
//if (localStorage.getItem("memoria") == null) {
  console.log("No hay memoria previa, cargo una nueva");
  const gridSize = 5;
  for (let x = -gridSize; x <= gridSize; x++) {
    for (let z = -gridSize; z <= gridSize; z++) {
      for (let y = -4; y <= 0; y++) {
        memoria.push({
          id: memoria.length,
          x: x,
          y: y,
          z: z,
          mat: css3Colors[Math.round(Math.random() * css3Colors.length)],
        });
      }
    }
  }
/*} else {
  console.log("Sí hay memoria previa, cargo la memoria existente");
  memoria = JSON.parse(localStorage.getItem("memoria"));
}*/

// Save once
localStorage.setItem("memoria", JSON.stringify(memoria));

// Re-create blocks from memoria
memoria.forEach(function (celda, index) {
  createBox(`${celda.x} ${celda.y} ${celda.z}`, celda.id, celda.mat);
});

// === Pointer Lock & Instruction Overlay handling ===
playerEl.addEventListener("click", function () {
  instructionEl.classList.add("hidden");
});

// Listen for pointerlockchange
document.addEventListener("pointerlockchange", function () {
  if (document.pointerLockElement === sceneEl.canvas) {
    console.log("Pointer Lock Engaged");
  } else {
    console.log("Pointer Lock Disengaged");
    instructionEl.classList.remove("hidden");
  }
});

document.addEventListener("pointerlockerror", function () {
  alert("Error attempting to enable pointer lock.");
  instructionEl.classList.remove("hidden");
});

instructionEl.addEventListener("click", function () {
  instructionEl.classList.add("hidden");
  sceneEl.canvas.requestPointerLock();
});
