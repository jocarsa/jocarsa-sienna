/*
	  Archivo principal y general de código
	  Gestiona las llamadas y el uso de Aframe.io en este proyecto
	*/

	let memoria = [];

	const sceneEl = document.querySelector("a-scene");
	const instructionEl = document.getElementById("instruction");
	const playerEl = document.querySelector("#player");

	// === 1) SIMPLE GRAVITY COMPONENT (NO PHYSICS SYSTEM) ===
	AFRAME.registerComponent("simple-gravity", {
	  schema: {
		 enabled: { default: true },
		 gravity: { type: "number", default: -9.8 },
		 // how far below entity we check for ground
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
		 // We only want to intersect with blocks (class 'clickable')
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

		 // 2) If we are close enough to ground, snap to it
		 //    threshold = distance from center to feet ~0.5 if 1m tall
		 const threshold = 1.01;
		 if (groundDist < threshold && groundDist !== 0) {
		   this.isGrounded = true;
		   this.velocityY = 0;
		   // snap onto the block
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
	// We will do left-click (button===0) to remove, right-click (button===2) to add
	function createBox(position, id, material) {
	  const caja = document.createElement("a-box");
	  caja.setAttribute("position", position);
	  caja.setAttribute("mixin", "mat" + material);
	  caja.setAttribute("class", "clickable");
	  caja.setAttribute("depth", "1");
	  caja.setAttribute("height", "1");
	  caja.setAttribute("width", "1");
	  caja.setAttribute("identificador", id);
	  caja.setAttribute("shadow", "cast: true; receive: true");

	  // Single 'click' event, check which mouse button was used
	  caja.addEventListener("click", function (evt) {
		 // Must have pointerEvent to see which button was pressed
		 const mouseEvent = evt.detail.mouseEvent;
		 console.log(evt)
		 if (!mouseEvent) return;
		
		 // LEFT-CLICK -> remove block
		 if (mouseEvent.button === 0) {
		   console.log("Left-click remove on:", caja);
		   caja.parentNode.removeChild(caja);
		   // remove from memoria
		   memoria.splice(id, 1);
		   localStorage.setItem("memoria", JSON.stringify(memoria));
		 }
		 // RIGHT-CLICK -> create new block adjacent
		 else if (mouseEvent.button === 2) {
		 	console.log("El material activo es:",repositorioactivo);
		 	console.log(elementos[repositorioactivo].style.background)
		 	
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
		     z: Math.round(point.z)
		   };
			const usuario = localStorage.getItem("siennausuario")
		   // Create random material
		   const newMat = elementos[repositorioactivo].style.background;

		   // Actually create & add
		   createBox(
		     `${newPos.x} ${newPos.y} ${newPos.z}`,
		     memoria.length, // new ID
		     newMat
		   );

		   // Store in memory
		   memoria.push({
		   	usuario:usuario,
		     x: newPos.x,
		     y: newPos.y,
		     z: newPos.z,
		     mat: newMat
		   });
		   localStorage.setItem("memoria", JSON.stringify(memoria));
		 }
	  });

	  sceneEl.appendChild(caja);
	}

	// Initialize memoria from localStorage or new
	if (localStorage.getItem("memoria") == null) {
	  console.log("No hay memoria previa, cargo una nueva");
	  const gridSize = 15;
	  for (let x = -gridSize; x <= gridSize; x++) {
		 for (let z = -gridSize; z <= gridSize; z++) {
		   for (let y = -2; y <= 0; y++) {
		     memoria.push({
		       x: x,
		       y: y,
		       z: z,
		       mat: css3Colors[Math.round(Math.random()*css3Colors.length)]
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
	  createBox(`${celda.x} ${celda.y} ${celda.z}`, index, celda.mat);
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
      
