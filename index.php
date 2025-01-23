<?php
	// Archivo principal que contiene las llamadas a los componentes y la carga del contenido aframe en formato estático html
?>
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>jocarsa | sienna</title>
    <script src="https://aframe.io/releases/1.6.0/aframe.min.js"></script>
    <script src="lib/colores.js"></script>
	
	<script>
      window.addEventListener("contextmenu", function (e) {
        e.preventDefault();
      });
    </script>
    
    <style>
    	<?php include "estilo/estilo.css"?>
    </style>
  </head>
  <body>
    <div id="instruction">Click to enter VR / Engage Pointer Lock</div>
    <?php include "componentes/login/login.php"; ?>
	 
    <a-scene shadow="type: pcfsoft" physics="gravity: -9.8;" >
      <a-assets>
      <?php
      	include "lib/colores.php";
      	foreach($css3_colors as $color){
      		echo '
      			<a-mixin
		       id="mat'.$color.'"
		       material="src: img/bloque.jpg; color: '.$color.';"
		     ></a-mixin>
      		';
      	}
      ?>
        
        
      </a-assets>


      <a-sky color="#ECECEC"></a-sky>

      <a-entity
        light="type: directional; intensity: 1; castShadow: true"
        position="10 15 10"
      ></a-entity>

      <a-entity
        light="type: ambient; intensity: 0.3"
      ></a-entity>

      <a-entity
        id="player"
        position="0 1 0"
        wasd-controls
        look-controls="pointerLockEnabled: true"
        simple-gravity
      >
        <a-entity id="camera" camera>
          <a-cursor
            id="cursor"
            fuse="false"
            raycaster="objects: .clickable"
            material="color: black; shader: flat"
            geometry="primitive: ring; radiusInner: 0.005; radiusOuter: 0.01"
          ></a-cursor>
        </a-entity>
      </a-entity>
    </a-scene>
    <script>
    	<?php include "codigo/codigo.js"; ?>
    </script>
    <?php include "componentes/guardar/guardar.php"; ?>
    
    <?php include "componentes/repositorio/repositorio.php"; ?>
  </body>
</html>

