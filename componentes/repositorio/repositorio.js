var repositorioactivo = 0;
var elementos = document.querySelectorAll("#repositorio .elemento")	// Selecciono los elementos	
    	
    	document.addEventListener("wheel",function(event){									// Cuando toque la rueda
    		console.log(event)
    		
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
    		if(repositorioactivo < 0){														// Si el cursor se me sale por la derecha
    			repositorioactivo = elementos.length-1;															// Vuelve a aparecer por la izquierda
    		}
    		elementos[repositorioactivo].classList.add("activo")						// Al elemento activo le pongo la clase correspondiente
    		
    		document.querySelector("#repositorio #contenedor").style.top = -Math.floor(repositorioactivo/28)*54+"px"
    	})
