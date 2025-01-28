<?php
	/*
		Archivo que gestiona el componente del botón de guardado
	*/
?>
<header>
<h1>
	<img src="sienna.png">jocarsa | sienna 
</h1>
<input type="file" id="glbUploader" accept=".glb" style="margin-left:20px;">

<div id="botonera">
<button id="guardar">Guardar</button>
<button id="saveToDisk">Guardar en local</button>
<button id="loadFromDisk">Cargar desde local</button>
<button id="cleanStart">Borrar</button>
</div>
</header>
    
<style>
	<?php include "guardar.css";?>
</style>
<script>
	<?php include "guardar.js";?>
</script>
