<?php
	// Archivo principal que contiene las llamadas a los componentes y la carga del contenido aframe en formato estático html
?>
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>jocarsa | sienna</title>
    <script src="https://aframe.io/releases/1.6.0/aframe.min.js"></script>
	
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
        <a-mixin
          id="material1"
          material="src: img/bloque.jpg; color: #ffcccc;"
        ></a-mixin>
        <a-mixin
          id="material2"
          material="src: img/bloque.jpg; color: #ccffcc;"
        ></a-mixin>
        <a-mixin
          id="material3"
          material="src: img/bloque.jpg; color: #ccccff;"
        ></a-mixin>
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
    <div id="repositorio">
    	<div class="elemento activo"></div>
    	<div class="elemento"></div>
    	<div class="elemento"></div>
    	<div class="elemento"></div>
    	<div class="elemento"></div>
    	<div class="elemento"></div>
    	<div class="elemento"></div>
    </div>
    <style>
    	#repositorio{
    		position:absolute;
    		bottom:20px;
    		left:50%;
    		width:400px;
    		height:50px;
    		margin-left:-200px;
    		background:white;
    		z-index:1000;
    		padding:20px;
    	}
    	#repositorio .elemento{
    		width:50px;
    		height:50px;
    		box-sizing:border-box;
    		border:1px solid grey;
    		display:inline-block;
    	}
    	#repositorio .activo{
    		border:3px solid red;
    	}
    </style>
    <script>
    	let repositorioactivo = 0;
    	document.addEventListener("wheel",function(event){									// Cuando toque la rueda
    		console.log(event)
    		let elementos = document.querySelectorAll("#repositorio .elemento")	// Selecciono los elementos
    		elementos.forEach(function(elemento){											// Y para cada uno de ellos
    			elemento.classList.remove("activo")											// Les quito a todos la clase activo
    		})
    		if(event.deltaY > 0){																// Si el ratón va hacia abajo
    			repositorioactivo++;																// Subo uno en el repositorio activo
    		}else{
    			repositorioactivo--																// enc aso contrario bajo
    		}
    		if(repositorioactivo >= elementos.length){									// Si el cursor se me sale por la derecha
    			repositorioactivo = 0;															// Vuelve a aparecer por la izquierda
    		}
    		elementos[repositorioactivo].classList.add("activo")						// Al elemento activo le pongo la clase correspondiente
    	})
    </script>
  </body>
</html>

