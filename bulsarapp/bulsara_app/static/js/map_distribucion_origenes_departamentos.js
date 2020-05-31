SETUP = {
    url_data: '/origenes/departamentos',
    url_data_predicted: '/origenes/nbayes/departamentos',
    clave_en_data: 'departamento_id',
    offset_x: 60,
    offset_y: 40,
    url_gis_layer: "/static/capas/geojson/ign-departamentos.geojson",
    tooltip_field_to_show: 'departamento_nombre',
    tooltip_top_offset: 95,    
}

APP = {
    // We specify the dimensions for the map container. We use the same
    // width and height as specified in the CSS above.
    data_base: null,
    data_predicted: null,
    width: 600,
    height: 420,
    svg: null,
    mapFeatures: null,
    tooltip: null,
    zoom: null,
    projection:null,
    path: null,
    dataById: null,
    quantize: null,
    formatNumber: null,
    legendX: null,
    legendXAxis: null,
    legendSvg: null,
    g: null,
    // We define a variable to later hold the data of the CSV.
    mapData: null,
    //template: null,
    legendWidth: null,
    legendDomain: null,
    keyDropdown: null,
    selectedOption: null,
    TEMPLATE_RESUMEN: null,
    
    // We define a variable holding the current key to visualize on the map.
    currentKey: 'AFRICANO',
    default_options: null,  // se inicializan con init_select
    showing_predicted: false,
    default_options_entries: {
        'AFRICANO': 'Africano',
        'ALEMAN': 'Aleman',
        'ANDINO': 'Andino',
        'ARABE': 'Arabe',
        'ARMENIO': 'Armenio',
        'BELGA': 'Belga',
        'BRITÁNICO': 'Británico',
        'CHINO': 'Chino',
        'COREANO': 'Coreano',
        'ESCANDINAVO': 'Escandinavo',
        'ESPAÑOL': 'Español',
        'ESTE EUROPEO': 'Este Europeo',
        'FRANCES': 'Frances',
        'GERMANICO': 'Germanico',
        'GRIEGO': 'Griego',
        'HEBREO': 'Hebreo',
        'HINDU': 'Hindu',
        'HOLANDES': 'Holandes',
        'IBERICO': 'Iberico',
        'ITALIANO': 'Italiano',
        'JAPONES': 'Japones',
        'JUJUY': 'Jujuy',
        'NOA': 'Noa',
        'PORTUGUES': 'Portugues',
        'SUIZOS': 'Suizos',
        'SUR': 'Sur',
        'TAILANDIA': 'Tailandia',
        'TIERRAS BAJAS': 'Tierras Bajas',
        'VASCO': 'Vasco'
    },
    predicted_options: null,  // inicializar igual que el de arriba con dos elementos mas.
    
    filtro: {
        selected: null,
        /* La funcion _handle_change_ busca la geometría del departamento seleccionado,
         * obtiene su centroide y hace zoom hasta esta geometria
         * Args:
         *    - department_selected_code: es un string que representa un codigo de departamento.
         */
        handle_change: (department_selected_code) => {
            d3.select(".filtered").classed("filtered", false);
            APP.filtro.selected = department_selected_code;
            d3
                .selectAll('.departamento')
                .each(
                    function(geometria) {
                        cb = d3.select(this);
                        if (geometria.properties.in1 == APP.filtro.selected){

                            var bounds = APP.path.bounds(geometria),
                                  dx = bounds[1][0] - bounds[0][0],
                                  dy = bounds[1][1] - bounds[0][1],
                                  x = (bounds[0][0] + bounds[1][0]) / 2,
                                  y = (bounds[0][1] + bounds[1][1]) / 2,
                                  scale = Math.max(1, Math.min(4, 0.4 / Math.max(dx / APP.width, dy / APP.height))),
                                  translate = [APP.width / 2 - scale * x, APP.height / 2 - scale * y];
                              APP.svg.transition()
                                  .duration(750)
                                  .call(APP.zoom.translate(translate).scale(scale).event); // not in d3 v4
                            //console.log( geometria.properties.in1, geometria.properties.nam );
                            cb.attr('class', cb.attr('class') + ' filtered');
                            //hideDetails();
                        }
                    }
                )
        },
        onFilterListKeyUp: function() {
            var input, filter, ul, li, a, i, txtValue;
            input = document.getElementById("filter-input");
            filter = input.value.toUpperCase();
            ul = document.getElementById("filter-item-list");
            li = ul.getElementsByTagName("li");
            for (i = 0; i < li.length; i++) {
                a = li[i].getElementsByTagName("a")[0];
                txtValue = a.textContent || a.innerText;
                if (txtValue.toUpperCase().indexOf(filter) > -1) {
                    li[i].style.display = "";
                } else {
                    li[i].style.display = "none";
                }
            }
        },
        createListItem: function(item_text, target) {
            var ul = document.getElementById("filter-item-list");
            var li = document.createElement("li");
            var a = document.createElement("a");
            a.appendChild(document.createTextNode(item_text));
            a.setAttribute("href", "#");
            li.appendChild(a);
            li.setAttribute("class", "filter-result-item");
            li.style.display = "none";
            li.addEventListener(
                "click",
                function(event){
                    APP.filtro.handle_change(target);
                    event.preventDefault();  // evitamos el salto...
                });

            return li

        },
        
        loadFilterList: function() {
            var ul = document.getElementById("filter-item-list");
            APP.mapData
                .forEach(
                    (elem) => {
                        ul.appendChild(
                            this.createListItem(
                                `${elem.departamento_nombre} (${elem.provincia_nombre})`,
                                elem.departamento_id
                            ),
                        );
                    }
                )

        }
    },

    connect_events: function(){
        // Listen to changes of the dropdown to select the key to visualize on
        // the map.
        d3.select('#select-key').on('change', APP.on_selector_change);
        
        // We add a listener to the browser window, calling updateLegend when
        // the window is resized.
        window.onresize = APP.updateLegend;
        
        // sidebar-button: boton para desplegar la cajita:
        const buttons = document.querySelectorAll(".sidebar-button");

        buttons.forEach(
            button => button.addEventListener(
                "click",
                _ => { document.getElementById("sidebar").classList.toggle("collapsed"); }
            )
        );

    },
    
    on_selector_change: function(a) {
        // Change the current key and call the function to update the colors.
        APP.currentKey = d3.select(this).property('value');
        var options_showed = APP.showing_predicted? APP.predicted_options : APP.default_options;
        
        for (i in options_showed){
            if (options_showed[i].selected ){
                APP.selected_option = i;
                break;
            }
        }
        console.log('update key', APP.currentKey, 'index:', APP.selected_option);
        APP.updateMapColors();
    },
    
    prepare_mustache: function (){

        // We get and prepare the Mustache template, parsing it speeds up future uses
        //APP.template = d3.select('#template').html();
        //Mustache.parse(APP.template);
        // We get and prepare the Mustache template, parsing it speeds up future uses
        APP.TEMPLATE_RESUMEN = d3.select('#template').html();
        Mustache.parse(APP.TEMPLATE_RESUMEN);

    },

    init: function(){
        
        this.prepare_mustache();
        this.init_select();
        
        // We create a SVG element in the map container and give it some
        // dimensions. We can use a viewbox and preserve the aspect ratio. This
        // also allows a responsive map which rescales and looks good even on
        // different screen sizes
        APP.svg = d3.select('#map').append('svg')
          .attr("preserveAspectRatio", "xMidYMid")
          .attr("viewBox", "0 0 " + APP.width + " " + APP.height);
        
        // We add a <g> element to the SVG element and give it a class to
        // style. We also add a class name for Colorbrewer.
        APP.mapFeatures = APP.svg.append('g')
            .attr('class', 'features YlGnBu');
        
        // We add a <div> container for the tooltip, which is hidden by default.
        APP.tooltip = d3.select("#map")
            .append("div")
            .attr("class", "tooltip hidden");

        // Define the zoom and attach it to the map
        APP.zoom = d3.behavior.zoom()
            .scaleExtent([1, 10])
            .on('zoom', this.doZoom);
        APP.svg.call(APP.zoom);
        
        // We define a geographical projection
        //     https://github.com/mbostock/d3/wiki/Geo-Projections
        // and set some dummy initial scale. The correct scale, center and
        // translate parameters will be set once the features are loaded.
        APP.projection = d3.geo.mercator()
            .scale(1);
        // We prepare a path object and apply the projection to it.
        APP.path = d3.geo.path()
            .projection(APP.projection);

        // We prepare an object to later have easier access to the data.
        APP.dataById = d3.map();
        
        // We prepare a quantize scale to categorize the values in 9 groups.
        // The scale returns text values which can be used for the color CSS
        // classes (q0-9, q1-9 ... q8-9). The domain will be defined once the
        // values are known.
        APP.quantize = d3.scale.quantize()
            .range(d3.range(9).map(function(i) { return 'q' + i + '-9'; }));

        // Formatear con 0 decimal places.
        APP.formatNumber = d3.format('.0f');

        // For the legend, we prepare a very simple linear scale. Domain and
        // range will be set later as they depend on the data currently shown.
        APP.legendX = d3.scale.linear();

        // We use the scale to define an axis. The tickvalues will be set later
        // as they also depend on the data.
        APP.legendXAxis = d3.svg.axis()
            .scale(APP.legendX)
            .orient("bottom")
            .tickSize(13)
            .tickFormat(function(d) {
                return APP.formatNumber(d);
            });

        // We create an SVG element in the legend container and give it some
        // dimensions.
        APP.legendSvg = d3.select('#legend')
            .append('svg')
            .attr('width', '100%')
            .attr('height', '44');

        // To this SVG element, we add a <g> element which will hold all of our
        // legend entries.
        APP.g = APP.legendSvg.append('g')
            .attr("class", "legend-key YlGnBu")
            .attr("transform", "translate(" + 20 + "," + 20 + ")");

        // We add a <rect> element for each quantize category. The width and
        // color of the rectangles will be set later.
        APP.g.selectAll("rect")
            .data(APP.quantize.range().map(function(d) {
                return APP.quantize.invertExtent(d);
            }))
            .enter()
            .append("rect");

        // We add a <text> element acting as the caption of the legend. The text
        // will be set later.
        APP.g.append("text")
            .attr("class", "caption")
            .attr("y", -6)
        
        this.loadGISLayer();
        this.connect_events();

    },
    
    init_select: () => {
        /***
         * Inicializa las opciones del selector:
         * - opciones por defecto y
         * - opciones con modelo 
         *
         * Ademas dibuja las opciones por defecto
        **/
        
        // Por cada opcion por defecto, creamos el obj option
        APP.default_options = Array();
        APP.predicted_options = Array();
        
        Object.entries(APP.default_options_entries).forEach(([value, text]) => {
            // Creamos y agregamos la nueva opción:
            var option = document.createElement("option");
            option.text = text;
            option.value = value;
            APP.default_options.push(option);
            APP.predicted_options.push(option);
        });
        
        // agregar las dos restantes cuando tenemos las predicted:
        var option_aar = document.createElement("option");
        option_aar.text = 'AAR';
        option_aar.value = 'AAR';
        APP.predicted_options.push(option_aar);
        
        var option_ger = document.createElement("option");
        option_ger.text = 'GER-ALE';
        option_ger.value = 'GERMANICO-ALEMAN';
        APP.predicted_options.push(option_ger);
        
        //al principio, seleccionar una al azar:
        var selected_random_opt = Math.floor(
            (Math.random() * Object.keys(APP.default_options).length ) + 1
        );
        APP.selected_option = selected_random_opt;
        APP.display_options(APP.default_options, selected_random_opt);
    },
    
    display_options: ( options_to_show, selected_index = 0 ) => {
        /***
         * Dibuja las opciones recibidas situando el selector en el index recibido.
         *
         * options_to_show: array de objetos option (html)
         * selected_index: int en donde se va a situar el selector.
         **/

        var origenes_select = document.getElementById("select-key");
        // limpiar:
        var length = origenes_select.options.length;
        for (i = 0; i < length; i++) {
            origenes_select.remove(origenes_select.options[i]);
        }
        // Agregar las opciones:
        for ( i in options_to_show ){
            origenes_select.add(options_to_show[i]);
        }

        selected_index = selected_index > (options_to_show.length -1) ? 0 : selected_index;
        origenes_select.options[selected_index].selected = "selected";
        APP.currentKey = origenes_select.options[selected_index].value;
    },
        
    toogle_predicted: () => {
        APP.showing_predicted = !APP.showing_predicted;
        var options_to_show = APP.showing_predicted? APP.predicted_options : APP.default_options;
        
        // comprobar si cuando cambiamos de opciones todavía tenemos
        // el index que teníamos sigue disponible.
        
        console.log(APP.selected_option);
        if ( ! APP.showing_predicted ){
            if ( ( APP.currentKey == 'AAR' ) || ( APP.currentKey == 'GERMANICO-ALEMAN' ) ){
                APP.currentKey = 'VASCO';
                APP.selected_option = APP.default_options.length -1;
            }            
        }
        
        console.log(APP.selected_option);
        APP.display_options(options_to_show, APP.selected_option);
        
        var data_to_show = APP.showing_predicted? APP.data_predicted : APP.data_base;
        //APP.updateMapColors();
        APP.display_data(data_to_show);
    },
    
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
    calculateScaleCenter: function(features) {
        // Get the bounding box of the paths (in pixels!) and calculate a
        // scale factor based on the size of the bounding box and the map
        // size.
        var bbox_path = APP.path.bounds(features),
            scale = 0.95 / Math.max(
                (bbox_path[1][0] - bbox_path[0][0]) / APP.width,
                (bbox_path[1][1] - bbox_path[0][1]) / APP.height
            );

        // Get the bounding box of the features (in map units!) and use it
        // to calculate the center of the features.
        var bbox_feature = d3.geo.bounds(features),
            center = [
                (bbox_feature[1][0] + bbox_feature[0][0]) / 2 - SETUP.offset_x,
                (bbox_feature[1][1] + bbox_feature[0][1]) / 2 - SETUP.offset_y
            ];

        return {
            'scale': scale,
            'center': center
        };
    },

    buscar_datos: function(){
        //var url_data = '/distribucion/' + 'MORALES';
        // TODO: cambio
        //url_data = '/origenes/provincias';
        url_data = SETUP.url_data;
 
        // obtener los datos:
        d3.json(
            url_data,
            (response) => {
                // guardamos para cambiar despues
                APP.data_base = response.data;
                APP.display_data(response.data)
            }
        );  // fin d3.json
        
        // obtener los datos:
        d3.json(
            SETUP.url_data_predicted,
            (response) => {
                // guardamos para cambiar despues
                APP.data_predicted = response.data;
                //APP.display_data(response.data)
            }
        );  // fin d3.json

    },
    
    display_data: (data) => {

        // We store the data object in the variable which is accessible from
        // outside of this function.
        APP.mapData = data;

        // This maps the data of the CSV so it can be easily accessed by
        // the ID of the municipality, for example: dataById[2196]
        APP.dataById = d3.nest()
            // TODO:
            //.key(function(d) { return d.provincia_codigo; })
            .key(function(d) { return d[SETUP.clave_en_data]; })
            .rollup(function(d) {
                return d[0]; 
            })
            .map(APP.mapData);

        // We add the features to the <g> element created before.
        // D3 wants us to select the (non-existing) path objects first ...
        APP.mapFeatures.selectAll('path')
            // ... and then enter the data. For each feature, a <path>
            // element is added.
            .data(APP.the_features.features)
            .enter()
            .append('path')
            // As "d" attribute, we set the path of the feature.
            .attr('d', APP.path)
            // When the mouse moves over a feature, show the tooltip.
            .on('mousemove', APP.showTooltip)
            // When the mouse moves out of a feature, hide the tooltip.
            .on('mouseout', APP.hideTooltip)
            // When a feature is clicked, show the details of it.
            //.on('click', showDetails);

        // Call the function to update the map colors.
        APP.updateMapColors();
        
        // Cargar el filtro:
        APP.filtro.loadFilterList();

    },
    
    /**
    * Update the colors of the features on the map. Each feature is given a
    * CSS class based on its value.
    */
    updateMapColors: function() {
        // Set the domain of the values (the minimum and maximum values of
        // all values of the current key) to the quantize scale.
        APP.quantize.domain([
            //d3.min(APP.mapData, function(d) { return APP.getValueOfData(d); }),
            10,
            d3.max(APP.mapData, function(d) { return APP.getValueOfData(d); })
        ]);
        
        // Update the class (determining the color) of the features.
        APP.mapFeatures.selectAll('path')
            .attr('class', function(f) {
                // Use the quantized value for the class
                // Acá se produce "LA correspondencia" entre la capa y la data
                // Se busca retornar una clase css para que se coloree correctamente:
                // .q0-9, .q1-9, .q2-9, .q3-9, .q4-9, .q5-9, .q6-9, .q7-9, .q8-9, .q-missing

                //console.log('value for class:', getIdOfFeature(f), dataById[getIdOfFeature(f)]);
                try {
                    if ( APP.getValueOfData(APP.dataById[APP.getIdOfFeature(f)]) >= 10 ){
                        color = APP.quantize(
                            APP.getValueOfData(
                                APP.dataById[APP.getIdOfFeature(f)]
                            ));
                    } else {
                        color = 'q-too-low-value';
                    }
                }
                catch(TypeError) {
                  console.log('Error al encontrar la data correspondiente al feature:', APP.getIdOfFeature(f));
                  console.log(f.properties.nam);
                  color = 'q-missing';         
                }

                // Agrego ademas el departamento para poder filtrar:
                return 'departamento ' + color;
            });

        // We call the function to update the legend.
        APP.updateLegend();
        APP.mostrarResumen();
    },
    
    /**
     * Muestra el resumen de ocurrencias del apellido buscado, por provincia:
     */
    mostrarResumen: function(){
        /**
         * Tenemos un array disponible con registros:
         * {GONZALEZ: 1234, departamento_id: "0034035", departamento_nombre: "PATIÑO", provincia_nombre: "Formosa"}
         */
    
        return;
        // Render the Mustache template with the data object and put the
        // resulting HTML output in the details container.
        var customTags = [ '<%', '%>' ];
        //var detailsHtml = Mustache.render("{{name}} area {{area}}", data_item);
        var detailText = [];
        var origenes_por_provincia = [];

        APP.mapData.forEach(
            (value, key, map) => {
                /**
                ** Estandariza la información de mapData para acumular por provincia.
                ** La data estandarizada queda en data_departamentos.
                */
                origenes_por_provincia.push(
                    {
                        "provincia_nombre": value['provincia_nombre'],
                        "cantidad": value[APP.currentKey]
                    }
                );
            }
        );

        // ranking por cantidad:
        origenes_por_provincia.sort((a, b) => (a.cantidad < b.cantidad) ? 1 : -1)

        var detailsHtml = Mustache.render(
            APP.TEMPLATE_RESUMEN,
            {
                "detalle": origenes_por_provincia
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

    },

    
    /**
    * Helper function to access the (current) value of a data object.
    *
    * Use "+" to convert text values to numbers.
    *
    * @param {object} d - A data object representing an entry (one line) of
    * the data CSV.
    */
    getValueOfData: function(d) {
        return +d[APP.currentKey];
    },

    /**
    * Helper function to retrieve the ID of a feature. The ID is found in
    * the properties of the feature.
    *
    * @param {object} f - A GeoJSON Feature object.
    */
    getIdOfFeature: function(f) {
        return f.properties['in1'];
    },

    
    updateLegend: function() {
        /**
        * Function to update the legend.
        * Somewhat based on http://bl.ocks.org/mbostock/4573883
        */

        // We determine the width of the legend. It is based on the width of
        // the map minus some spacing left and right.
        APP.legendWidth = d3.select('#map').node().getBoundingClientRect().width - 50;

        // We determine the domain of the quantize scale which will be used as
        // tick values. We cannot directly use the scale via quantize.scale()
        // as this returns only the minimum and maximum values but we need all
        // the steps of the scale. The range() function returns all categories
        // and we need to map the category values (q0-9, ..., q8-9) to the
        // number values. To do this, we can use invertExtent().
        APP.legendDomain = APP.quantize.range().map(function(d) {
            var r = APP.quantize.invertExtent(d);
            return r[1];
        });
        // Since we always only took the upper limit of the category, we also
        // need to add the lower limit of the very first category to the top
        // of the domain.
        APP.legendDomain.unshift(APP.quantize.domain()[0]);

        // On smaller screens, there is not enough room to show all 10
        // category values. In this case, we add a filter leaving only every
        // third value of the domain.
        if (APP.legendWidth < 400) {
            APP.legendDomain = APP.legendDomain.filter(function(d, i) {
                return i % 3 == 0;
            });
        }

        // We set the domain and range for the x scale of the legend. The
        // domain is the same as for the quantize scale and the range takes up
        // all the space available to draw the legend.
        APP.legendX
            .domain(APP.quantize.domain())
            .range([0, APP.legendWidth]);

        // We update the rectangles by (re)defining their position and width
        // (both based on the legend scale) and setting the correct class.
        APP.g.selectAll("rect")
            .data(APP.quantize.range().map(function(d) {
                return APP.quantize.invertExtent(d);
            }))
            .attr("height", 8)
            .attr("x", function(d) { return APP.legendX(d[0]); })
            .attr("width", function(d) { return APP.legendX(d[1]) - APP.legendX(d[0]); })
            .attr('class', function(d, i) {
                return APP.quantize.range()[i];
            });

        // We update the legend caption. To do this, we take the text of the
        // currently selected dropdown option.
        APP.keyDropdown = d3.select('#select-key').node();
        APP.selectedOption = APP.keyDropdown.options[APP.keyDropdown.selectedIndex];
        APP.g.selectAll('text.caption')
            .text(APP.selectedOption.text);

        // We set the calculated domain as tickValues for the legend axis.
        APP.legendXAxis
            .tickValues(APP.legendDomain)

        // We call the axis to draw the axis.
        APP.g.call(APP.legendXAxis);
    },
    
    loadGISLayer: function(){
        // Load the features from the GeoJSON.
        // TODO:
        //d3.json("/static/capas/geojson/ign-departamentos.geojson", function(error, features) {
        d3.json(SETUP.url_gis_layer, function(error, features) {

            // Guardamos los features para poder usarlos luego al buscar la data de un apellido:
            APP.the_features = features;

            // Get the scale and center parameters from the features.
            APP.scaleCenter = APP.calculateScaleCenter(features);

            // Apply scale, center and translate parameters.
            APP.projection.scale(APP.scaleCenter.scale)
            .center(APP.scaleCenter.center)
            .translate([APP.width/2, APP.height/2]);

            APP.luego_de_cargar_capa();

        });

    },
    
    luego_de_cargar_capa: function(){
        APP.buscar_datos();
    },
    /**
    * Zoom the features on the map. This rescales the features on the map.
    * Keep the stroke width proportional when zooming in.
    */
    doZoom: function() {
        APP.mapFeatures.attr("transform",
            "translate(" + d3.event.translate + ") scale(" + d3.event.scale + ")")
            // Keep the stroke width proportional. The initial stroke width
            // (0.5) must match the one set in the CSS.
            .style("stroke-width", 0.9 / d3.event.scale + "px");
    },
    
    /**
    * Show a tooltip with the name of the feature.
    *
    * @param {object} f - A GeoJSON Feature object.
    */
    showTooltip: function(f) {
        // Get the ID of the feature.
        var id = APP.getIdOfFeature(f);
        // Use the ID to get the data entry.
        var d = APP.dataById[id];

        // Get the current mouse position (as integer)
        var mouse = d3
            .mouse(d3.select('#map').node())
            .map(
                function(d) { return parseInt(d); }
            );
        

        // Calculate the absolute left and top offsets of the tooltip. If the
        // mouse is close to the right border of the map, show the tooltip on
        // the left.
        var left = Math.min(APP.width - 4 * d.provincia_nombre.length, mouse[0] + 5);
        var top = mouse[1] + SETUP.tooltip_top_offset;

        // Show the tooltip (unhide it) and set the name of the data entry.
        // Set the position as calculated before.
        //debugger;
        APP.tooltip.classed('hidden', false)
            .attr("style", "left:" + left + "px; top:" + top + "px; text-align: center;")
            .html(`${d[SETUP.tooltip_field_to_show]}<br>${d['provincia_nombre']} <br>[${APP.getValueOfData(d)}]`);
    },

    /**
    * Hide the tooltip.
    */
    hideTooltip: function() {
        APP.tooltip.classed('hidden', true);
    }


}


APP.init();



