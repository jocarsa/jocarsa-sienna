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


<script src="https://cdn.jsdelivr.net/npm/aframe-instanced-mesh@0.5.0/dist/aframe-instanced-mesh.min.js"></script>
	    <script src="https://unpkg.com/aframe-postprocessing-component@2.1.1/dist/aframe-postprocessing-component.min.js"></script>

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
    <div id="instruction">Click para entrar en el juego</div>
    <?php include "componentes/login/login.php"; ?>
	   
		
    <a-scene 
    shadow="type: pcfsoft" 
    physics="gravity: -9.8;"  
    fog="type: linear; color: #ffffff; near: 10; far: 50" 
    >
   <!--  -->
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
        
       
			 <img id="cielo" src="img/cielo.jpg">

      </a-assets>


      <a-sky src="#cielo" material="fog: false;"></a-sky>

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
        <a-entity dof="focalLength: 5; fStop: 0.1; focusDistance: 2"></a-entity>
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
<?php include "componentes/guardar/guardar.php"; ?>
    <script>
    	<?php include "codigo/codigo.js"; ?>
    </script>
    
    
    <?php include "componentes/repositorio/repositorio.php"; ?>
       
  </body>
</html>

