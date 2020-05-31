// TIPO_BUSQUEDA: define si al hacer click en "Buscar" se va a buscar un solo apellido o una lista de apellidos:
var TIPO_BUSQUEDA_SIMPLE = false; // 'simple' o 'multiple'

// BARRA DE PROGRESO:
var PROGRESS_BAR = document.getElementsByClassName("progress-bar")[0];

// We define a variable holding the current key to visualize on the map.
// En este contexto el currentKey corresponde al apellido buscado
var currentKey = '';

// Referencia a los features:
var the_features;

// We add a listener to the browser window, calling updateLegend when
// the window is resized.
window.onresize = updateLegend;

// We specify the dimensions for the map container. We use the same
// width and height as specified in the CSS above.
var width = 600,
    height = 760;

// We define a variable to later hold the data of the CSV.
var mapData = {};

// We get and prepare the Mustache template, parsing it speeds up future uses
var TEMPLATE_RESUMEN = d3.select('#template').html();
Mustache.parse(TEMPLATE_RESUMEN);

var TEMPLATE_DETALLE_PROVINCIA = d3.select('#template-detalle-provincia').html();
Mustache.parse(TEMPLATE_DETALLE_PROVINCIA);

// We create a SVG element in the map container and give it some
// dimensions. We can use a viewbox and preserve the aspect ratio. This
// also allows a responsive map which rescales and looks good even on
// different screen sizes
var svg = d3.select('#map').append('svg')
  .attr("preserveAspectRatio", "xMidYMid")
  .attr("viewBox", "0 0 " + width + " " + height);

// We add a <g> element to the SVG element and give it a class to
// style. We also add a class name for Colorbrewer.
var mapFeatures = svg.append('g')
  .attr('class', 'features YlGnBu');

// We add a <div> container for the tooltip, which is hidden by default.
var tooltip = d3.select("#map")
  .append("div")
  .attr("class", "tooltip hidden");

// Define the zoom and attach it to the map
var zoom = d3.behavior.zoom()
  .scaleExtent([1, 10])
  .on('zoom', doZoom);
svg.call(zoom);

// We define a geographical projection
//     https://github.com/mbostock/d3/wiki/Geo-Projections
// and set some dummy initial scale. The correct scale, center and
// translate parameters will be set once the features are loaded.
var projection = d3.geo.mercator()
  .scale(1);

// We prepare a path object and apply the projection to it.
var path = d3.geo.path()
  .projection(projection);

// We prepare an object to later have easier access to the data.
var dataById = d3.map();

// We prepare a quantize scale to categorize the values in 9 groups.
// The scale returns text values which can be used for the color CSS
// classes (q0-9, q1-9 ... q8-9). The domain will be defined once the
// values are known.
var quantize = d3.scale.quantize()
  .range(d3.range(9).map(function(i) { return 'q' + i + '-9'; }));

// We prepare a number format which will always return 0 decimal places.
var formatNumber = d3.format('.0f');

// For the legend, we prepare a very simple linear scale. Domain and
// range will be set later as they depend on the data currently shown.
var legendX = d3.scale.linear();

// We use the scale to define an axis. The tickvalues will be set later
// as they also depend on the data.
var legendXAxis = d3.svg.axis()
  .scale(legendX)
  .orient("bottom")
  .tickSize(13)
  .tickFormat(function(d) {
    return formatNumber(d);
  });

// We create an SVG element in the legend container and give it some
// dimensions.
var legendSvg = d3.select('#legend').append('svg')
  .attr('width', '100%')
  .attr('height', '44');

// To this SVG element, we add a <g> element which will hold all of our
// legend entries.
var g = legendSvg.append('g')
    .attr("class", "legend-key YlGnBu")
    .attr("transform", "translate(" + 20 + "," + 20 + ")");

// We add a <rect> element for each quantize category. The width and
// color of the rectangles will be set later.
g.selectAll("rect")
    .data(quantize.range().map(function(d) {
      return quantize.invertExtent(d);
    }))
  .enter().append("rect");

// We add a <text> element acting as the caption of the legend. The text
// will be set later.
g.append("text")
    .attr("class", "caption")
    .attr("y", -6)


function savePNG(){
    domtoimage.toBlob(document.getElementById('mapa-img'))
    .then(function (blob) {
        window.saveAs(blob, 'mapa.png');
    });
}


function exportJPG(){
    domtoimage.toJpeg(
        document.getElementById('mapa-img'),
        { 
            quality: 0.95,
            bgcolor: 'white'
        })
        .then(function (dataUrl) {
            var link = document.createElement('a');
            link.download = 'map.jpeg';
            link.href = dataUrl;
            link.click();
        });
}
/**
 * Function to update the legend.
 * Somewhat based on http://bl.ocks.org/mbostock/4573883
 */
function updateLegend() {

  // We determine the width of the legend. It is based on the width of
  // the map minus some spacing left and right.
  var legendWidth = d3.select('#map').node().getBoundingClientRect().width - 50;

  // We determine the domain of the quantize scale which will be used as
  // tick values. We cannot directly use the scale via quantize.scale()
  // as this returns only the minimum and maximum values but we need all
  // the steps of the scale. The range() function returns all categories
  // and we need to map the category values (q0-9, ..., q8-9) to the
  // number values. To do this, we can use invertExtent().
  var legendDomain = quantize.range().map(function(d) {
    var r = quantize.invertExtent(d);
    return r[1];
  });
  // Since we always only took the upper limit of the category, we also
  // need to add the lower limit of the very first category to the top
  // of the domain.
  legendDomain.unshift(quantize.domain()[0]);

  // On smaller screens, there is not enough room to show all 10
  // category values. In this case, we add a filter leaving only every
  // third value of the domain.
  if (legendWidth < 400) {
    legendDomain = legendDomain.filter(function(d, i) {
      return i % 3 == 0;
    });
  }

  // We set the domain and range for the x scale of the legend. The
  // domain is the same as for the quantize scale and the range takes up
  // all the space available to draw the legend.
  legendX
    .domain(quantize.domain())
    .range([0, legendWidth]);

  // We update the rectangles by (re)defining their position and width
  // (both based on the legend scale) and setting the correct class.
  g.selectAll("rect")
    .data(quantize.range().map(function(d) {
      return quantize.invertExtent(d);
    }))
    .attr("height", 8)
    .attr("x", function(d) { return legendX(d[0]); })
    .attr("width", function(d) { return legendX(d[1]) - legendX(d[0]); })
    .attr('class', function(d, i) {
      return quantize.range()[i];
    });

  // We update the legend caption. To do this, we take the text of the
  // currently selected dropdown option.
  //var keyDropdown = d3.select('#select-key').node();
  //var selectedOption = keyDropdown.options[keyDropdown.selectedIndex];
  g.selectAll('text.caption')
    .text('Contador apellidos');

  // We set the calculated domain as tickValues for the legend axis.
  legendXAxis
    .tickValues(legendDomain)

  // We call the axis to draw the axis.
  g.call(legendXAxis);
}

/**
 *    Actualiza la barra de progreso:
 *    value va de 0 a 1.
 */
function update_progress_bar(value){
    PROGRESS_BAR.setAttribute("style", `width: ${value}%;`);
    PROGRESS_BAR.innerText = `${value.toFixed(0)}%`;
    
    if(value.toFixed(0) >= 99){
        setTimeout(
            () => {
                PROGRESS_BAR.setAttribute("style", `width: 0%;`);
                PROGRESS_BAR.innerText = `0%`;
                // y la ocultamos
                d3.select('#barra-de-progreso').classed("hidden", true);

            }, 3000);
    }
}

function loadGISLayer(){
    // Load the features from the GeoJSON.
    d3.json("/static/capas/geojson/argentina_provincias.geojson", function(error, features) {

      // Guardamos los features para poder usarlos luego al buscar la data de un apellido:
      the_features = features;

      // Get the scale and center parameters from the features.
      var scaleCenter = calculateScaleCenter(features);

      // Apply scale, center and translate parameters.
      projection.scale(scaleCenter.scale)
        .center(scaleCenter.center)
        .translate([width/2, height/2]);

    });

}

function searchSurnameData(){
    // Hide the initial container.
    d3.select('#initial').classed("hidden", true);
    // Ocultar tambien el detalle de dapartamento, por si está abierto:
    d3.select('#detalle-provincia').classed("hidden", true);

    // ocultar cartelito:
    d3.select('#cartelito-no-existe').classed("hidden", true);

    // mostrar el indicador de búsqueda
    d3.select('#searching-indicator').classed("hidden", false);
    // Mostrar el mapa:
    d3.select('#mapa-img').classed("hidden", false);
    // Mostrar la botonera:
    d3.select('.buttons-box').classed("hidden", false);
    
    // verificar modo:
    if ( TIPO_BUSQUEDA_SIMPLE ) {
        
        busqueda_simple();
        
    } else {
        
        busqueda_compuesta();
        
    }

}


function busqueda_simple(){
   
    //obtener apellido buscado:
    var apellido_a_buscar = document.getElementById("apellido-a-buscar").value.toLocaleUpperCase()
    // limpiar/validar??

    var url_data = '/distribucion/' + apellido_a_buscar;
    currentKey = apellido_a_buscar;

    d3.json(
        url_data,
        function(response) {
            // Cuando llega la resp, ocultar el "Buscando..."
            d3.select('#searching-indicator').classed("hidden", true);

            // We store the data object in the variable which is accessible from
            // outside of this function.
            mapData = response.data;
            
            if(response.status == '1404'){
                document.querySelector("#cartelito-no-existe span").innerText = currentKey;
                d3.select('#cartelito-no-existe').classed("hidden", false);
                return;
            }

            if ( mapData.length != 0 ) {

                // This maps the data of the CSV so it can be easily accessed by
                // the ID of the municipality, for example: dataById[2196]
                dataById = d3.nest()
                    .key(function(d) { return d.provincia_in1; })
                    .rollup(function(d) {
                        //console.log('nest - rollup');
                        //console.log(d);
                        //console.log(d[0]);
                        return d[0]; 
                    })
                    .map(mapData);

                // We add the features to the <g> element created before.
                // D3 wants us to select the (non-existing) path objects first ...
                mapFeatures.selectAll('path')
                    // ... and then enter the data. For each feature, a <path>
                    // element is added.
                    .data(the_features.features)
                    .enter().append('path')
                    // As "d" attribute, we set the path of the feature.
                    .attr('d', path)
                    // When the mouse moves over a feature, show the tooltip.
                    .on('mousemove', showTooltip)
                    // When the mouse moves out of a feature, hide the tooltip.
                    .on('mouseout', hideTooltip)
                    // When a feature is clicked, show the details of it.
                    .on('click', showDetails);

                // Call the function to update the map colors.
                updateMapColors();


                // Mostrar resumen:
                mostrarResumen();

                //  END: if ( mapData.length != 0 )

            } else {
                document.querySelector("#cartelito-no-existe span").innerText = currentKey;
                d3.select('#cartelito-no-existe').classed("hidden", false);

            }

        });  // fin d3.json

}


function busqueda_compuesta(){
    /**
    * Manejador cuando se buscan muchos apellidos (separados por coma)
    */
    
    //obtener apellido buscado:
    var apellidos_a_buscar = document.getElementById("apellido-a-buscar").value.toLocaleUpperCase()
    // split por ','
    apellidos_a_buscar = apellidos_a_buscar.split(',');
    apellidos_a_buscar = apellidos_a_buscar.map(
        apellido => apellido.trim()
    );

    currentKey = 'total';  // hay que calcular el total siempre, sino no sirve
    apellidos_no_encontrados = '';
    mapData = {};
    
    // contamos cuantos de cuantos apellidos se retorno la respuesta
    // para la barra de progreso:
    var respuestas = 0;
    // mostramos la barra de progreso:
    d3.select('#barra-de-progreso').classed("hidden", false);
    // setear el titulo:
    updateMapTitle(`Mapa distribución para múltiples apellidos [${ respuestas }]`);


    for (apellido_a_buscar in apellidos_a_buscar){
        var url_data = '/distribucion/' + apellidos_a_buscar[apellido_a_buscar];
        console.log(url_data);
        
        d3.json(
            url_data,
            function(data) {
                // Cuando llega la resp, ocultar el "Buscando..."
                d3.select('#searching-indicator').classed("hidden", true);

                // We store the data object in the variable which is accessible from
                // outside of this function.

                // Si es la primera vez que busco un apellido, cargamos mapData
                if ( Object.entries(mapData).length === 0 ){

                    console.log('seteando mapData');
                    mapData = data.data;

                    // Aprovechamos para ocultar el "Buscando..."
                    d3.select('#searching-indicator').classed("hidden", true);

                } else {

                    //mapData = Object.assign(mapData, data.data);
                    var result;

                    // bucle para actualizar la provincia con la informacion de un nuevo apellido:
                    for (clave_provincia in mapData){
                        result = data.data.find(obj => {
                            return obj.provincia_in1 === mapData[clave_provincia].provincia_in1;
                        })

                        mapData[clave_provincia] = Object.assign(mapData[clave_provincia], result);
                    }
                    
                }
                
                for (clave_provincia in mapData){
                    mapData[clave_provincia]['total'] = suma_cantidades_de_apellidos(mapData[clave_provincia]);
                }



                if ( mapData.length != 0 ) {

                    // This maps the data of the CSV so it can be easily accessed by
                    // the ID of the municipality, for example: dataById[2196]
                    dataById = d3.nest()
                        .key(function(d) { return d.provincia_in1; })
                        .rollup(function(d) {
                            //console.log('nest - rollup');
                            //console.log(d);
                            //console.log(d[0]);
                            return d[0]; 
                        })
                        .map(mapData);

                    // We add the features to the <g> element created before.
                    // D3 wants us to select the (non-existing) path objects first ...
                    mapFeatures.selectAll('path')
                        // ... and then enter the data. For each feature, a <path>
                        // element is added.
                        .data(the_features.features)
                        .enter().append('path')
                        // As "d" attribute, we set the path of the feature.
                        .attr('d', path)
                        // When the mouse moves over a feature, show the tooltip.
                        .on('mousemove', showTooltip)
                        // When the mouse moves out of a feature, hide the tooltip.
                        .on('mouseout', hideTooltip)
                        // When a feature is clicked, show the details of it.
                        .on('click', showDetails);

                    // Call the function to update the map colors.
                    updateMapColors();


                    // Mostrar resumen:
                    mostrarResumen();

                    // Update progress bar:
                    respuestas += 1;
                    progreso = (respuestas * 100) / apellidos_a_buscar.length;
                    update_progress_bar(progreso);
                    updateMapTitle(`Mapa distribución para múltiples apellidos [${ respuestas }]`);

                    //  END: if ( mapData.length != 0 )

                } else {
                    // Caso no se puede dar
                    // porque en caso de no encontrar un apellido como columna en la BD
                    // se retorna data con nombres e ids de provincias y cantidades igual a 0
                    console.log('Error len mapData igual a 0');
                }

            });  // fin d3.json
    
    }  // END: for loop
    
    if (apellidos_no_encontrados.length !== 0){
        document.querySelector("#cartelito-no-existe span").innerText = apellidos_no_encontrados;
        d3.select('#cartelito-no-existe').classed("hidden", false);
    }


    
}

/**
 * Función para realizar la sumatoria de cantidades de apellidos de una
 * provincia cuando se busca de a muchos apellidos.
 */
function suma_cantidades_de_apellidos(obj) {
    return Object.keys(obj)
        .reduce(
            (sum,key) => {
                if ((key != 'provincia_in1') & (key != 'provincia_nombre') & (key != 'total')) 
                    return sum+parseFloat( obj[key] || 0 );
                else
                    return sum+0
            }, 0);
}

/**
 * update map title
 *
 */
function updateMapTitle(titulo){
    // Set titulo:
    document.getElementById('map-title').innerText = titulo;
}

/**
 * Update the colors of the features on the map. Each feature is given a
 * CSS class based on its value.
 */
function updateMapColors() {

  // Set the domain of the values (the minimum and maximum values of
  // all values of the current key) to the quantize scale.
  quantize.domain([
    d3.min(mapData, function(d) { return getValueOfData(d); }),
    d3.max(mapData, function(d) { return getValueOfData(d); })
  ]);
  // Update the class (determining the color) of the features.
  mapFeatures.selectAll('path')
    .attr('class', function(f) {
      // Use the quantized value for the class
      return quantize(getValueOfData(dataById[getIdOfFeature(f)]));
    });

  // We call the function to update the legend.
  updateLegend();

}

/**
 * Muestra el resumen de ocurrencias del apellido buscado, por provincia:
 */
function mostrarResumen(){
    // Render the Mustache template with the data object and put the
    // resulting HTML output in the details container.
    var customTags = [ '<%', '%>' ];
    //var detailsHtml = Mustache.render("{{name}} area {{area}}", data_item);
    
    // Listado de provincias con las cantidades del/ de los apellidos buscados:
    var detailText = [];
    
    // obtenerCantidadPorProvincia:
    // y el total!
    var total = 0;
    
    mapData.forEach(
        (value, _key, _map) => {
            total += value[currentKey];
            detailText.push(
                {
                    "nombre": value['provincia_nombre'],
                    "cantidad": value[currentKey]
                }
            );

        }
    )  // end forEach

    // calcular el porcentaje que representa:
    var TOTAL_EMPADRONADOS_ARG = 30530194;
    var porcentaje = ( total * 100 ) / TOTAL_EMPADRONADOS_ARG;
    // renderizar el tamplate:
    var detailsHtml = Mustache.render(
        TEMPLATE_RESUMEN,
        {
            "buscado": ( currentKey == 'total' ) ? '*' : currentKey ,
            "total": total,
            "porcentaje": porcentaje.toFixed(2),
            "detalle": detailText
        },
        {},
        customTags
    );

    // Hide the initial container.
    d3.select('#initial').classed("hidden", true);

    // Put the HTML output in the details container and show (unhide) it.
    //d3.select('#details').html('DETALLE BUSQUEDA'+mapData[0][currentKey]+ ' ' + mapData[0].provincia_nombre);
    d3.select('#details').html(detailsHtml);
    d3.select('#details').classed("hidden", false);

}
/**
 * Show the details of a feature in the details <div> container.
 * The content is rendered with a Mustache template.
 *
 * @param {object} f - A GeoJSON Feature object.
 */
function showDetails(feature) {
    // Get the ID of the feature.
    var id = getIdOfFeature(feature);
    // Use the ID to get the data entry.
    var data_item = dataById[id];
    var cantidades_de_apellidos = [];

    for ( key in data_item){
        if ((key != 'provincia_in1') & (key != 'provincia_nombre') & (key != 'total')) 
            cantidades_de_apellidos.push(
                {
                    apellido: key,
                    "cantidad": data_item[key]
                }
            );
    }

    // Render the Mustache template with the data object and put the
    // resulting HTML output in the details container.
    var customTags = [ '<%', '%>' ];
    var detailsHtml = Mustache.render(
      TEMPLATE_DETALLE_PROVINCIA,
      {
          nombre: data_item.provincia_nombre,
          total: data_item.total,
          detalles_apellidos: cantidades_de_apellidos
      },
      {},
      customTags
    );
    //var detailsHtml = Mustache.render("{{name}} area {{area}}", data_item);

    // Hide the initial container.
    d3.select('#details').classed("hidden", true);

    // Put the HTML output in the details container and show (unhide) it.
    d3.select('#detalle-provincia').html(detailsHtml);
    d3.select('#detalle-provincia').classed("hidden", false);
}

/**
 * Hide the details <div> container and show the initial content instead.
 * Conectado al evento utilizando onCLick...
 */
function hideDetailsProvincia() {
  // Hide the details
    d3.select('#detalle-provincia').classed("hidden", true);
    d3.select('#details').classed("hidden", false);
}

/**
 * Show a tooltip with the name of the feature.
 *
 * @param {object} f - A GeoJSON Feature object.
 */
function showTooltip(f) {
  // Get the ID of the feature.
  var id = getIdOfFeature(f);
  // Use the ID to get the data entry.
  var d = dataById[id];

  // Get the current mouse position (as integer)
  var mouse = d3.mouse(d3.select('#map').node()).map(
    function(d) { return parseInt(d); }
  );

  // Calculate the absolute left and top offsets of the tooltip. If the
  // mouse is close to the right border of the map, show the tooltip on
  // the left.
  //var left = Math.min(width - 4 * d.name.length, mouse[0] + 5);
  var left = Math.min(width - 4 * d.provincia_nombre.length, mouse[0] + 5);
  var top = mouse[1] + 25;

  // Show the tooltip (unhide it) and set the name of the data entry.
  // Set the position as calculated before.
  tooltip.classed('hidden', false)
    .attr("style", "left:" + left + "px; top:" + top + "px")
    //.html(d.name);
    .html(d.provincia_nombre +': '+d[currentKey]);
}

/**
 * Hide the tooltip.
 */
function hideTooltip() {
  tooltip.classed('hidden', true);
}

/**
 * Zoom the features on the map. This rescales the features on the map.
 * Keep the stroke width proportional when zooming in.
 */
function doZoom() {
  mapFeatures.attr("transform",
    "translate(" + d3.event.translate + ") scale(" + d3.event.scale + ")")
    // Keep the stroke width proportional. The initial stroke width
    // (0.5) must match the one set in the CSS.
    .style("stroke-width", 0.5 / d3.event.scale + "px");
}

/**
 * Calculate the scale factor and the center coordinates of a GeoJSON
 * FeatureCollection. For the calculation, the height and width of the
 * map container is needed.
 *
 * Thanks to: http://stackoverflow.com/a/17067379/841644
 *
 * @param {object} features - A GeoJSON FeatureCollection object
 *   containing a list of features.
 *
 * @return {object} An object containing the following attributes:
 *   - scale: The calculated scale factor.
 *   - center: A list of two coordinates marking the center.
 */
function calculateScaleCenter(features) {
  // Get the bounding box of the paths (in pixels!) and calculate a
  // scale factor based on the size of the bounding box and the map
  // size.
  var bbox_path = path.bounds(features),
      scale = 0.95 / Math.max(
        (bbox_path[1][0] - bbox_path[0][0]) / width,
        (bbox_path[1][1] - bbox_path[0][1]) / height
      );

  // Get the bounding box of the features (in map units!) and use it
  // to calculate the center of the features.
  var bbox_feature = d3.geo.bounds(features),
      center = [
        (bbox_feature[1][0] + bbox_feature[0][0]) / 2,
        (bbox_feature[1][1] + bbox_feature[0][1]) / 2];

  return {
    'scale': scale,
    'center': center
  };
}

/**
 * Helper function to access the (current) value of a data object.
 *
 * Use "+" to convert text values to numbers.
 *
 * @param {object} d - A data object representing an entry (one line) of
 * the data CSV.
 */
function getValueOfData(d) {
  return +d[currentKey];
}

/**
 * Helper function to retrieve the ID of a feature. The ID is found in
 * the properties of the feature.
 *
 * @param {object} f - A GeoJSON Feature object.
 */
function getIdOfFeature(f) {
  return f.properties['in1'];
}


/**
 * EVENTS BIND:
 */

// Listen to click of the button
var boton_buscar = d3.select('#btn-buscar-apellido');  // referencia para utilizar luego
boton_buscar.on('click', searchSurnameData);

// Listen to click of the png button
d3.select('#btn-export-png').on('click', savePNG);
d3.select('#btn-export-jpg').on('click', exportJPG);

/**
 * START POINT:
 */
loadGISLayer();

/* event listener */
document.getElementById("apellido-a-buscar").addEventListener('input', tipeo_usuario);

/* function */
function tipeo_usuario(){
    var apellido_a_buscar = this.value;
    
    if ( apellido_a_buscar.indexOf(',') != -1 ) {
        //console.log('Buscar muchos');
        boton_buscar.text('Buscar muchos');
        TIPO_BUSQUEDA_SIMPLE = false;
        
    } else {
        //console.log('Buscar uno');
        boton_buscar.text('Buscar');
        TIPO_BUSQUEDA_SIMPLE = true;
    }
}