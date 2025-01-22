/*
	Archivo principal y general de código
	Gestiona las llamadas y el uso de Aframe.io en este proyecto
*/

let memoria = [];

      // Prevent default context menu on right-click
      window.addEventListener(
        "contextmenu",
        function (e) {
          e.preventDefault();
        },
        false
      );

      const sceneEl = document.querySelector("a-scene");
      const instructionEl = document.getElementById("instruction");
      const playerEl = document.querySelector("#player");

      // === 1) SIMPLE GRAVITY COMPONENT (NO PHYSICS SYSTEM) ===
      AFRAME.registerComponent("simple-gravity", {
        schema: {
          enabled: { default: true },
          gravity: { type: "number", default: -9.8 },
          // how far below entity we check for ground; adjust to player's height
          raycastLength: { type: "number", default: 2 }
        },
        init: function () {
          this.velocityY = 0;
          this.direction = new THREE.Vector3(0, -1, 0);
          this.raycaster = new THREE.Raycaster();
          this.isGrounded = false;
        },
        tick: function (time, timeDelta) {
          if (!this.data.enabled) return;

          const delta = timeDelta / 1000; // ms -> s
          const el = this.el;
          const pos = el.object3D.position;

          // 1) Raycast straight down from player's current position
          const origin = new THREE.Vector3(pos.x, pos.y, pos.z);
          this.raycaster.set(origin, this.direction);
          // We only want to intersect with our blocks (class 'clickable')
          const clickableEls = document.querySelectorAll(".clickable");
          const meshList = [];
          clickableEls.forEach((cEl) => {
            if (cEl.object3D) {
              // The child is the actual mesh
              cEl.object3D.traverse(function (obj) {
                if (obj.isMesh) meshList.push(obj);
              });
            }
          });

          // Intersect
          const intersects = this.raycaster.intersectObjects(meshList, true);
          let groundDist = Infinity;
          if (intersects.length > 0) {
            groundDist = intersects[0].distance;
          }

          // 2) If we are "close enough" to the ground, snap to it
          //    Adjust the threshold to the player's "feet" offset
          const threshold = 1.01; // The distance from center to "feet"
          if (groundDist < threshold && groundDist !== 0) {
            this.isGrounded = true;
            this.velocityY = 0; // stop falling
            // Snap onto the block: push up so we sit on top.
            // groundDist is from player center down to the block.
            pos.y = pos.y - groundDist + threshold;
          } else {
            // 3) Not grounded -> apply gravity
            this.isGrounded = false;
            this.velocityY += this.data.gravity * delta; // v = v + g*dt
            pos.y += this.velocityY * delta; // y = y + v*dt
          }
        }
      });

      // === 2) CREATE BLOCKS (NO static-body) ===
      // Helper function to create a box
      function createBox(position, id, material) {
        const caja = document.createElement("a-box");
        caja.setAttribute("position", position);
        caja.setAttribute("rotation", "0 0 0");
        caja.setAttribute("mixin", "material" + material);
        caja.setAttribute("class", "clickable");
        caja.setAttribute("depth", "1");
        caja.setAttribute("height", "1");
        caja.setAttribute("width", "1");
        caja.setAttribute("identificador", id);

        // No static-body. Instead, we rely on raycast collisions (above).
        // For shadows
        caja.setAttribute("shadow", "cast: true; receive: true");

        caja.addEventListener("click", function () {
          console.log("Left-clicked on:", caja);
          caja.parentNode.removeChild(caja);
          // Remove from memoria as well
          memoria.splice(id, 1);
          localStorage.setItem("memoria", JSON.stringify(memoria));
        });

        caja.addEventListener("contextmenu", function (event) {
          event.preventDefault();
          console.log("Right-clicked on:", caja);
          const currentPosition = caja.getAttribute("position");
          const newPosition = {
            x: currentPosition.x,
            y: currentPosition.y + 1,
            z: currentPosition.z
          };
          createBox(
            `${newPosition.x} ${newPosition.y} ${newPosition.z}`,
            memoria.length, // new ID
            Math.ceil(Math.random() * 3)
          );
          // Also store the new box in memory & localStorage
          memoria.push({
            x: newPosition.x,
            y: newPosition.y,
            z: newPosition.z,
            mat: Math.ceil(Math.random() * 3)
          });
          localStorage.setItem("memoria", JSON.stringify(memoria));
        });

        sceneEl.appendChild(caja);
      }

      // Initialize memoria
      if (localStorage.getItem("memoria") == null) {
        console.log("No hay memoria previa, cargo una nueva");
        const gridSize = 15;
        for (let x = -gridSize; x <= gridSize; x++) {
          for (let z = -gridSize; z <= gridSize; z++) {
            for (let y = -5; y <= 0; y++) {
              memoria.push({
                x: x,
                y: y,
                z: z,
                mat: Math.ceil(Math.random() * 3)
              });
            }
          }
        }
      } else {
        console.log("Si que hay memoria previa, cargo la memoria existente");
        memoria = JSON.parse(localStorage.getItem("memoria"));
      }

      // Save the memory
      localStorage.setItem("memoria", JSON.stringify(memoria));

      // Re-create the boxes from memoria
      memoria.forEach(function (celda, index) {
        createBox(`${celda.x} ${celda.y} ${celda.z}`, index, celda.mat);
      });

      // === Pointer Lock & Instruction Overlay handling ===
      playerEl.addEventListener("click", function () {
        instructionEl.classList.add("hidden");
      });

      document.addEventListener("pointerlockchange", function () {
        if (
          document.pointerLockElement === sceneEl.canvas ||
          document.mozPointerLockElement === sceneEl.canvas ||
          document.webkitPointerLockElement === sceneEl.canvas
        ) {
          console.log("Pointer Lock Engaged");
          instructionEl.classList.add("hidden");
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
        // Trigger a click on the camera rig to engage pointer lock via look-controls
        playerEl.emit("click");
      });

      
