/*
  Archivo principal y general de código
  Gestiona las llamadas y el uso de Aframe.io en este proyecto
*/

// === Global Parameters ===
const BOX_SIZE = 1; // Define the size of the box (width, height, depth)
let SPHERE_RADIUS = 3; // Radius for the sphere of boxes (can be adjusted dynamically)
const GAUSSIAN_SIGMA = 1; // Standard deviation for Gaussian distribution

let memoria = [];

const sceneEl = document.querySelector("a-scene");
const instructionEl = document.getElementById("instruction");
const playerEl = document.querySelector("#player");

// === Chunk Management ===
const CHUNK_SIZE = 8; // Size of each chunk (16x16 blocks)
const LOAD_DISTANCE = 2; // Number of chunks to load around the player
let loadedChunks = {};

// === Target Circle for Sphere Radius ===
const targetCircle = document.createElement("div");
targetCircle.style.position = "absolute";
targetCircle.style.top = "50%";
targetCircle.style.left = "50%";
targetCircle.style.transform = "translate(-50%, -50%)";
targetCircle.style.border = "2px solid white";
targetCircle.style.borderRadius = "50%";
targetCircle.style.pointerEvents = "none"; // Ensure it doesn't block clicks
document.body.appendChild(targetCircle);

// Function to update the target circle size
function updateTargetCircle() {
  const circleSize = SPHERE_RADIUS * 200; // Scale the circle size for visibility
  targetCircle.style.width = `${circleSize}px`;
  targetCircle.style.height = `${circleSize}px`;
}

// Initialize the target circle
updateTargetCircle();

// === Event Listeners for Keypad + and Keypad - ===
document.addEventListener("keydown", (event) => {
  if (event.key === "+" || event.key === "Add") {
    // Increase sphere radius
    SPHERE_RADIUS = Math.min(SPHERE_RADIUS + 1, 10); // Max radius of 10
    updateTargetCircle();

  } else if (event.key === "-" || event.key === "Subtract") {
    // Decrease sphere radius
    SPHERE_RADIUS = Math.max(SPHERE_RADIUS - 1, 1); // Min radius of 1
    updateTargetCircle();

  }
});

// Function to get chunk coordinates from world coordinates
function getChunkCoordinates(x, z) {
  return {
    x: Math.floor(x / (CHUNK_SIZE * BOX_SIZE)), // Adjust for BOX_SIZE
    z: Math.floor(z / (CHUNK_SIZE * BOX_SIZE)), // Adjust for BOX_SIZE
  };
}

// Function to load a chunk
function loadChunk(chunkX, chunkZ) {
  const chunkKey = `${chunkX},${chunkZ}`;
  if (!loadedChunks[chunkKey]) {
    loadedChunks[chunkKey] = true;


    // Check if the chunk exists in memoria
    const chunkBlocks = memoria.filter((block) => {
      const blockChunkX = Math.floor(block.x / CHUNK_SIZE);
      const blockChunkZ = Math.floor(block.z / CHUNK_SIZE);
      return blockChunkX === chunkX && blockChunkZ === chunkZ;
    });

    // If the chunk exists in memoria, restore it
    if (chunkBlocks.length > 0) {
      chunkBlocks.forEach((block) => {
        createBox(`${block.x * BOX_SIZE} ${block.y * BOX_SIZE} ${block.z * BOX_SIZE}`, block.id, block.mat);
      });
    } else {
      // If the chunk doesn't exist in memoria, create new blocks
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

// Function to unload a chunk
function unloadChunk(chunkX, chunkZ) {
  const chunkKey = `${chunkX},${chunkZ}`;
  if (loadedChunks[chunkKey]) {
    loadedChunks[chunkKey] = false;


    // Find all blocks in the chunk
    const blocksInChunk = memoria.filter((block) => {
      const blockChunkX = Math.floor(block.x / CHUNK_SIZE);
      const blockChunkZ = Math.floor(block.z / CHUNK_SIZE);
      return blockChunkX === chunkX && blockChunkZ === chunkZ;
    });

    // Remove blocks from the scene
    blocksInChunk.forEach((block) => {
      const blockId = `${block.x * BOX_SIZE} ${block.y * BOX_SIZE} ${block.z * BOX_SIZE}`;
      const blockElement = document.querySelector(`[identificador="${blockId}"]`);
      if (blockElement) {
        blockElement.parentNode.removeChild(blockElement);

      }
    });


  }
}

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

// === Gaussian Distribution Function ===
function gaussian(x, y, z, sigma) {
  const exponent = -(x * x + y * y + z * z) / (2 * sigma * sigma);
  return Math.exp(exponent);
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
  caja.setAttribute("depth", BOX_SIZE); // Use BOX_SIZE for depth
  caja.setAttribute("height", BOX_SIZE); // Use BOX_SIZE for height
  caja.setAttribute("width", BOX_SIZE); // Use BOX_SIZE for width
  caja.setAttribute("identificador", `${position}`); // Use position as the unique identifier
  caja.setAttribute("shadow", "cast: true; receive: true");

  // Single 'click' event, check which mouse button was used
  caja.addEventListener("click", function (evt) {
    // Must have pointerEvent to see which button was pressed
    const mouseEvent = evt.detail.mouseEvent;

    if (!mouseEvent) return;

    // LEFT-CLICK -> remove block
    if (mouseEvent.button === 0) {

      removeSphereOfBoxes(evt.detail.intersection.point);
    }
    // RIGHT-CLICK -> create new block adjacent
    else if (mouseEvent.button === 2) {




      createSphereOfBoxes(evt.detail.intersection.point, elementos[repositorioactivo].style.background);
    }
  });

  sceneEl.appendChild(caja);
}

// Function to create a sphere of boxes
function createSphereOfBoxes(centerPoint, material) {
  for (let dx = -SPHERE_RADIUS; dx <= SPHERE_RADIUS; dx++) {
    for (let dy = -SPHERE_RADIUS; dy <= SPHERE_RADIUS; dy++) {
      for (let dz = -SPHERE_RADIUS; dz <= SPHERE_RADIUS; dz++) {
        const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
        if (distance > SPHERE_RADIUS) continue; // Skip points outside the sphere

        // Calculate position
        const newPos = {
          x: Math.round(centerPoint.x / BOX_SIZE) * BOX_SIZE + dx * BOX_SIZE,
          y: Math.round(centerPoint.y / BOX_SIZE) * BOX_SIZE + dy * BOX_SIZE,
          z: Math.round(centerPoint.z / BOX_SIZE) * BOX_SIZE + dz * BOX_SIZE,
        };

        // Check if a box already exists at this position
        const blockId = `${newPos.x} ${newPos.y} ${newPos.z}`;
        const existingBlock = document.querySelector(`[identificador="${blockId}"]`);
        if (existingBlock) continue; // Skip if a block already exists

        // Create new box
        createBox(`${newPos.x} ${newPos.y} ${newPos.z}`, memoria.length, material);

        // Store in memory
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

// Function to remove a sphere of boxes
function removeSphereOfBoxes(centerPoint) {
  for (let dx = -SPHERE_RADIUS; dx <= SPHERE_RADIUS; dx++) {
    for (let dy = -SPHERE_RADIUS; dy <= SPHERE_RADIUS; dy++) {
      for (let dz = -SPHERE_RADIUS; dz <= SPHERE_RADIUS; dz++) {
        const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
        if (distance > SPHERE_RADIUS) continue; // Skip points outside the sphere

        // Calculate position
        const newPos = {
          x: Math.round(centerPoint.x / BOX_SIZE) * BOX_SIZE + dx * BOX_SIZE,
          y: Math.round(centerPoint.y / BOX_SIZE) * BOX_SIZE + dy * BOX_SIZE,
          z: Math.round(centerPoint.z / BOX_SIZE) * BOX_SIZE + dz * BOX_SIZE,
        };

        // Find and remove the block
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

// Initialize memoria from localStorage or new
if (localStorage.getItem("memoria") == null) {

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
} else {
  console.log("Sí hay memoria previa, cargo la memoria existente");
  memoria = JSON.parse(localStorage.getItem("memoria"));
}

// Save once
localStorage.setItem("memoria", JSON.stringify(memoria));

// Re-create blocks from memoria
memoria.forEach(function (celda, index) {
  createBox(`${celda.x * BOX_SIZE} ${celda.y * BOX_SIZE} ${celda.z * BOX_SIZE}`, celda.id, celda.mat);
});

// === Pointer Lock & Instruction Overlay handling ===
playerEl.addEventListener("click", function () {
  instructionEl.classList.add("hidden");
});

// Listen for pointerlockchange
document.addEventListener("pointerlockchange", function () {
  if (document.pointerLockElement === sceneEl.canvas) {

  } else {

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
