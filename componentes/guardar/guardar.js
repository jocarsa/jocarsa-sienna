/*
	Escuchador del boton de guardar.
	Realiza una petición asincrónica al servidor enviándole los datos del terreno y el usuario
*/
document.querySelector("#guardar").onclick = function(){
			console.log("vamos a guardar")
			const url = 'back/siennaback.php?router=actualiza'; // Replace with your target URL
			
			const datos = {
				 usuario: localStorage.getItem("siennausuario"),
				 terreno: JSON.parse(localStorage.getItem("memoria"))
			};
			console.log("envio",datos)
			fetch(url, {
				 method: 'POST', // Use POST, PUT, DELETE, etc. as needed
				 headers: {
					  'Content-Type': 'application/json' // Set the content type to JSON
				 },
				 body: JSON.stringify(datos) // Convert the JavaScript object to a JSON string
			})
			.then(response => {
				 if (!response.ok) {
					  throw new Error(`HTTP error! Status: ${response.status}`);
				 }
				 return response.text(); // Parse JSON response if needed
			})
			.then(responseData => {
				 console.log('Response:', responseData);
			})
			.catch(error => {
				 console.error('Error:', error);
			});
		}
		
		// === Save memoria to Disk ===
document.querySelector("#saveToDisk").onclick = function () {
  const dataStr = JSON.stringify(memoria);
  const dataBlob = new Blob([dataStr], { type: "application/json" });
  const url = URL.createObjectURL(dataBlob);

  const a = document.createElement("a");
  a.href = url;
  a.download = "memoria.json";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

// === Load memoria from Disk ===
document.querySelector("#loadFromDisk").onclick = function () {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = "application/json";
  input.onchange = function (event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (e) {
      const content = e.target.result;
      try {
        const newMemoria = JSON.parse(content);

        // Clear the current scene
        document.querySelectorAll(".clickable").forEach((el) => el.remove());

        // Update memoria and localStorage
        memoria = newMemoria;
        localStorage.setItem("memoria", JSON.stringify(memoria));

        // Recreate blocks from the new memoria
        memoria.forEach(function (celda, index) {
          createBox(
            `${celda.x * BOX_SIZE} ${celda.y * BOX_SIZE} ${celda.z * BOX_SIZE}`,
            celda.id,
            celda.mat
          );
        });
      } catch (error) {
        console.error("Error parsing JSON file:", error);
        alert("Invalid JSON file.");
      }
    };
    reader.readAsText(file);
  };
  input.click();
};

// === Clean Start ===
document.querySelector("#cleanStart").onclick = function () {
  // Clear the current scene
  document.querySelectorAll(".clickable").forEach((el) => el.remove());

  // Reset memoria to a small 4x4 island
  memoria = [];
  const gridSize = 2; // 4x4 island
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

  // Update localStorage
  localStorage.setItem("memoria", JSON.stringify(memoria));

  // Recreate blocks from the new memoria
  memoria.forEach(function (celda, index) {
    createBox(
      `${celda.x * BOX_SIZE} ${celda.y * BOX_SIZE} ${celda.z * BOX_SIZE}`,
      celda.id,
      celda.mat
    );
  });
};
