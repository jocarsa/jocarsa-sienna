<div id="repositorio">
<?php
	include "lib/colores.php";
	foreach($css3_colors as $color){
		echo '<div class="elemento activo" style="background:'.$color.';"></div>';
	}
?>
    
    </div>
    
<style>
	<?php include "repositorio.css";?>
</style>
<script>
	<?php include "repositorio.js";?>
</script>
