SETUP = {
    url_data: '/data/departamento',
    url_data_provincia: '/data/provincia',
    url_data_lasker_provincia: '/lasker/provincia',
    current_dep_color: '#c6a5ff',
    lasker_div_id: "lasker-export-image",
    btn_export_lasker_map_selector: "#btn-export-lasker-image",
    department_clicked_color: "#8557d6",
    btn_export_most_frecuent_selector: '#btn-export-most-frecuent-image',
    most_frecuent_div_id: 'most-frecuent-export-image',
    btn_export_surnames_origin_selector: '#btn-export-surnames-origin-image',
    surnames_origin_div_id: 'surnames-origin-export-image',
    bar_base_color: "#d57ea2",
    bar_selected_color: "#bc2a66",
    /**
     * La configuración del gráfico de radar:
     */
    RADAR_CHART_OPTIONS: {
        scale: {
            angleLines: {
                display: true
            },
            ticks: {
                beginAtZero: true,
                min: 0,
                max: 100,
                stepSize: 25,
                callback: (value) => ( value == 100 ) ? 'MAX' : ''
            },
            pointLabels: {
                fontSize: 13
            }
        },
        legend:{
            display: false
        },
        tooltips: {
            enabled: false,
        }
    },

    RADAR_CHART_LABELS: [
        'Apellidos',
        'Alfa fisher',
        'Isonimia no sesgada',
        'Indicador A',
        'Indicador B',
        'Consanguinidad',
        'Empadronados',
    ],

};

MAP = {
    svg: null,
    width: null,
    height: null,
    topology: null,
    projection: null,
    path: null,
    bounds: null,
    distance: null,
    
    load_layer: (error, map, data_response) => {
        if(error) throw error;
        
        // SETUP DATA
        if ( data_response.status == 1200 ){
            MAP.lasker_data_province = data_response.data.lasker_data;
            MAP.lasker_data_current_department = MAP.lasker_data_province[ MAP.id_current_department ];
            
            // por cada distancia lasker hacia otros departamentos:
            let lasker_to_others = Object.entries(MAP.lasker_data_current_department);
            for (var i = 0; i < lasker_to_others.length; i++) {
                // Obtener el codigo a comparar
                let departamentoCodigo = lasker_to_others[i][0];
                // y el value para el feature del mapa
                let departamentoLaskerDistance = lasker_to_others[i][1];
               
                // Buscar el departamento correspondiente dentro del GeoJSON
                for (var j = 0; j < map.features.length; j++) {
                    var jsonDepartmentCode = map.features[j].properties.departamento_id;
                    if ( departamentoCodigo == jsonDepartmentCode ) {
                      // Le asignamos el value, que después usamos para pintar
                      map.features[j].properties.value = departamentoLaskerDistance;
                      // Stop looking through the JSON
                      break;
                    }
                }
            }
            
            MAP.setup_min_and_max();
        }

        
        // SETUP MAP:
        // selector del elem donde irá el mapa:
        MAP.lasker_map = d3.select("#map_lasker");
        
        MAP.width = MAP.lasker_map.node().getBoundingClientRect().width;
        MAP.height = MAP.width / 1.5;
        MAP.svg = MAP.lasker_map.append("svg")
                     .attr("width", MAP.width)
                     .attr("height", MAP.height);

        MAP.projection = d3.geoMercator()
           .translate([MAP.width / 2, MAP.height / 2]);

        // Definir path generator:
        MAP.path = d3.geoPath()  // path generator va a convertir GeoJSON a SVG paths
           .projection(MAP.projection)  // decirle que utilize la projection definida mas arriba

        MAP.bounds = d3.geoBounds(map),
            center = d3.geoCentroid(map);

        // Compute the angular distance between bound corners
        MAP.distance = d3.geoDistance(MAP.bounds[0], MAP.bounds[1]),
               scale = MAP.height / MAP.distance / Math.sqrt(0.6);

        // Update the projection scale and centroid
        MAP.projection.scale(scale).center(center);

        let lowColor = '#f9f9f9';
        let highColor = '#bc2a66';
        let minVal = d3.min(Object.values(MAP.lasker_data_current_department));
        let maxVal = d3.max(Object.values(MAP.lasker_data_current_department));
        let ramp = d3.scaleLinear().domain([minVal,maxVal]).range([lowColor,highColor])

        
        // DIBUJAR:
        // Bind the data to the SVG and create one path per GeoJSON feature
        MAP.svg.selectAll("path")
          .data(map.features)
          .enter()
          .append("path")
          .attr("d", MAP.path)
          .attr('class', 'department')
          .style("stroke", "#d4d1d1")
          .style("stroke-width", "1")
          .style(
            "fill",
            (d) => d.properties.departamento_id == MAP.id_current_department? SETUP.current_dep_color : ramp(d.properties.value)
          )
          .on('mousemove', MAP.on_hover_in_departamento )
          .on('click', (d, i) => {
            d3.select(d)
              .transition()
              .attr('r', 20);
          })
        ;

        MAP.is_department_selected = false;
        MAP.department_selected = null;
        
        d3.selectAll(".department")
          .on("click", function(){
              if (! MAP.is_department_selected){
                  // si no se había cliqueado en ningún lado
                  
                  MAP.is_department_selected = true;
              
                  MAP.department_selected = this;
                  d3.select(this)
                      .style("stroke", SETUP.department_clicked_color)  // un violetita
                      .style("stroke-width", "3px")
                  ;
                  d3.select("#departement_selected_indicator")
                      .style("display", "block");
              } else {
                  // si ya se había seleccionado un departamento:
                  
                  if (this == MAP.department_selected){
                      // y se vuelve a cliquear al mismo:
                      
                      MAP.is_department_selected = false;
              
                      d3.selectAll('.department')
                          .style("stroke", "#d4d1d1")  // un gris
                          .style("stroke-width", "1px")
                      ;
                      d3.select("#departement_selected_indicator")
                          .style("display", "none");
                  }
              }
              
          })
        
        
        // add a legend
        let w = 140, h = 300;

        let key = d3.select("#map_legend")
          .append("svg")
          .attr("width", w)
          .attr("height", h)
          .attr("class", "legend");

        let legend = key.append("defs")
          .append("svg:linearGradient")
          .attr("id", "gradient")
          .attr("x1", "100%")
          .attr("y1", "0%")
          .attr("x2", "100%")
          .attr("y2", "100%")
          .attr("spreadMethod", "pad");

        legend.append("stop")
          .attr("offset", "0%")
          .attr("stop-color", highColor)
          .attr("stop-opacity", 1);

        legend.append("stop")
          .attr("offset", "100%")
          .attr("stop-color", lowColor)
          .attr("stop-opacity", 1);

        key.append("rect")
          .attr("width", w - 100)
          .attr("height", h)
          .style("fill", "url(#gradient)")
          .attr("transform", "translate(0,10)");

        let y = d3.scaleLinear()
          .range([h, 0])
          .domain([minVal, maxVal]);

        let yAxis = d3.axisRight(y);

        key.append("g")
          .attr("class", "y axis")
          .attr("transform", "translate(41,10)")
          .call(yAxis)
        
        d3.select(SETUP.btn_export_lasker_map_selector).on('click', MAP.exportJPG);
    },
    
    on_hover_in_departamento: (feature) => {
        
        if (!MAP.is_department_selected) {
            // mostrar el efecto del hover y el label de la distancia 
            // solo si no hice clic en algún departamento...

            let lasker_text_departamento = feature.properties.value? 
                `Distancia a <b>${feature.properties.departamento_nombre}</b>` :
                'Distancia a';
            let lasker_text_departamento_value = feature.properties.value? 
                `${feature.properties.value.toFixed(3)}` :
                '-';
            d3.select('#map--lasker-distance-to-department-name').html(lasker_text_departamento);
            d3.select('#map__department_target_name').text(feature.properties.departamento_nombre);
            
            d3.select('#map--lasker-distance-to-department-value').html(lasker_text_departamento_value);

        }
    },
    
    setup_min_and_max: () => {
        
        let max_lasker = d3.max(Object.values(MAP.lasker_data_current_department));
        let min_lasker = d3.min(Object.values(MAP.lasker_data_current_department));
        let mean_lasker = d3.mean(Object.values(MAP.lasker_data_current_department));
        d3.select('#min-lasker-value').text(`${min_lasker.toFixed(3)}`);
        d3.select('#mean-lasker-value').text(`${mean_lasker.toFixed(3)}`);
        d3.select('#max-lasker-value').text(`${max_lasker.toFixed(3)}`);

    },
    
    exportJPG: () => {
        domtoimage.toJpeg(
            document.getElementById(SETUP.lasker_div_id),
            { 
                quality: 1,
                bgcolor: 'white'
            })
            .then(function (dataUrl) {
                var link = document.createElement('a');
                link.download = 'lasker_map.jpeg';
                link.href = dataUrl;
                link.click();
            });
    },
    
}

APP = {
    // vars:
    data: null,
    TEMPLATE_RESUMEN: null,
    PROVINCIA_NOMBRE: null,
    IS_BAR_SELECTED: false,
    SELECTED_BAR: null,
    
    // methods:
    init: () => {
        
        // We get and prepare the Mustache template, parsing it speeds up future uses
        APP.TEMPLATE_RESUMEN = d3.select('#template-listado-circuitos').html();
        Mustache.parse(APP.TEMPLATE_RESUMEN);

        const departamento_id = document.URL.split('/')[document.URL.split('/').length -1];
        MAP.id_current_department = departamento_id;
        console.log('init: ', departamento_id);
        
        const url_data = `${SETUP.url_data}/${departamento_id}`;
        // obtener los datos:
        d3.json(url_data, APP.handle_response_data);  // fin d3.json
                

    },
    
    handle_response_data: (response) => {
        /* Recepcion de los datos */
        
        if ( response.status != 1404 ){
            APP.data = response.data;
            console.log(APP.data.provincia_codigo);

            // Buscar la data de contexto provincial:
            const url_data_provincia = `${SETUP.url_data_provincia}/${APP.data.provincia_codigo}`;
            d3.json(
                url_data_provincia,
                (response) => {
                    APP.display_data(APP.data, response.data);
                }
            );
        } else {// end if
            d3.select('#departamento-nombre').text(' information not available');
        }
    },
    
    display_data: (data_departamento, data_provincia) => {
        /* Muestra la data recibida de la DB
         * claves(data_departamento) -> a, alfa_fisher, b, consanguinidad,
         *     departamento_id, departamento_nombre, ins, n, provincia_codigo,
         *     provincia_nombre, provincia_total, s, top_7_origin, top_7_predicted, top_7_surnames
         * 
         * claves(data_provincia) -> a, alfa_fisher, b, consanguinidad,
         *     departamentos_n, ins, maximos, medias, minimos, n, provincia_codigo,
         *     provincia_nombre, s
        ***/
        const departamento_nombre = data_departamento.departamento_nombre;
        d3.select('#map__department_name').text(departamento_nombre);
        d3.select('#departamento-nombre').text(departamento_nombre);
        d3.select('#indicators-chart-departamento-nombre').text(`Indicator value for the department ${departamento_nombre}`);
        d3.select('#indicators-chart-max-text')
            .text(`Maximum value of the indicator in ${data_departamento.provincia_nombre}`);
        d3.select('#indicators-chart-min-text')
            .text(`Minimum value of the indicator in ${data_departamento.provincia_nombre}`);
        d3.select('#indicators-chart-avg-text')
            .text(`Average value of the indicator in ${data_departamento.provincia_nombre}`);
        
        d3.select('#provincia-nombre').text(data_departamento.provincia_nombre);
        
        d3.select('.cantidad-indicadores').text(data_provincia.departamentos_n);
        d3.select('.cantidad-indicadores-2').text(data_provincia.departamentos_n);
        
        // Most common surname chart:
        APP.display_most_frecuent_surnames(data_departamento.top_7_surnames);
        
        // Inds against others departments:
        APP.display_inds(data_departamento, data_provincia);
        
        // Origin chart:
        APP.display_origin_chart(data_departamento.top_7_origin);
        
        // Lasker Map:
        APP.PROVINCIA_NOMBRE = data_departamento.provincia_nombre;
        APP.display_lasker_map(data_departamento.provincia_codigo);
    },
    
    display_most_frecuent_surnames: (top_7) => {

        const top_7_rank = UTILS.sortProperties(top_7);
        top_7_rank.forEach( (d) => {
            d.apellido =d[0];
            d.cantidad = +d[1];
        });

        // set the dimensions and margins of the graph
        var margin = {top: 10, right: 5, bottom: 25, left: 50},
            width = 480 - margin.left - margin.right,
            height = 320 - margin.top - margin.bottom;

        // set the ranges
        var x = d3.scaleBand()
                  .range([0, width])
                  .padding(0.1);
        var y = d3.scaleLinear()
                  .range([height, 0]);

        // append the svg object to the body of the page
        // append a 'group' element to 'svg'
        // moves the 'group' element to the top left margin
        var svg = d3.select("#top-7-surnames-chart")
                    .append("svg")
                        .attr("width", width + margin.left + margin.right)
                        .attr("height", height + margin.top + margin.bottom)
                    .append("g")
                        .attr("transform", 
                              "translate(" + margin.left + "," + margin.top + ")");

        // Scale the range of the data in the domains
        x.domain(top_7_rank.map( (d) => d.apellido ) );
        y.domain([0, d3.max(top_7_rank, (d) => d.cantidad)]);

        // append the rectangles for the bar chart
        svg.selectAll(".bar")
          .data(top_7_rank)
         .enter().append("rect")
          .attr("class", "bar apellido-bar")
          .attr("x", (d) => x(d.apellido) )
          .attr("width", x.bandwidth())
          .attr("y", (d) => y(d.cantidad) )
          .attr("height", (d) => height - y(d.cantidad) )
          .on('mousemove', (d) => {
              if ( ! APP.IS_BAR_SELECTED ){
                  let text_origin = `<b>${d.apellido}</b>: ${d.cantidad}`;
                  d3.select('#most-frecuent-chart--item-value').html(text_origin);
              }
              
          })
          .on('click',
              (d, i, n) => {
                  if (! APP.IS_BAR_SELECTED){
                      // si no se había cliqueado en ningún lado
                      APP.IS_BAR_SELECTED = true;
                      APP.SELECTED_BAR = d;
                      d3.select(n[i])
                          .style("fill", SETUP.bar_selected_color)
                          .style("stroke", "#e7bcce")
                          .style("stroke-width", "3px");
                  } else {
                      // si ya se había seleccionado un departamento:

                      if (d == APP.SELECTED_BAR){
                          // y se vuelve a cliquear al mismo:
                          APP.IS_BAR_SELECTED = false;
                          d3.selectAll('.apellido-bar')
                              .style("fill", SETUP.bar_base_color)
                              .style("stroke", "#bc2a66")
                              .style("stroke-width", "1px");
                      }
                  }
              }
          );
              
        // add the x Axis
        svg.append("g")
          .attr("transform", "translate(0," + height + ")")
          .call(d3.axisBottom(x));

        // add the y Axis
        svg.append("g")
          .call(d3.axisLeft(y));        

        //d3.select(SETUP.btn_export_most_frecuent_selector)
        //    .style('display', 'block');
        
        d3.select(SETUP.btn_export_most_frecuent_selector)
            .on('click', () => {
                domtoimage.toJpeg(
                    document.getElementById(SETUP.most_frecuent_div_id),
                    { 
                        quality: 1,
                        bgcolor: 'white'
                    })
                    .then(function (dataUrl) {
                        var link = document.createElement('a');
                        link.download = 'chart.jpeg';
                        link.href = dataUrl;
                        link.click();
                    });
            });

    },
    
    display_inds: (indicadores_departamento, indicadores_province) => {
        /* Para crear este grafico, necesitamos los datos del departamento actual
        ** mas los datos de los indices para los departamentos de la provincia entera
        **/
        var margin = {top: 5, right: 40, bottom: 20, left: 120},
            width = 500 - margin.left - margin.right,
            height = 50 - margin.top - margin.bottom,
            chart = d3.bullet().width(width).height(height);

        const data = UTILS.get_data_to_chart(indicadores_departamento, indicadores_province);
        
        // Define the div for the tooltip
        var div = d3.select("body").append("div")
            .attr("class", "tooltip")
            .style("opacity", 0);

        var svg = d3.select("#indicadores-bullet-chart-container").selectAll("svg")
            .data(data)
            .enter().append("svg")
            .attr("class", "bullet")
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom)
            .append("g")
            .attr("transform", "translate(" + margin.left + "," + margin.top + ")")
            .on('mousemove', (d) => {
                div.transition()
                    .duration(200)
                    .style("opacity", .9);
                
                let value_tooltip = format_value_tooltip(d);
                let position_x_tooltip =  d3.event.pageX > (window.innerWidth / 3) ? 
                    d3.event.pageX + 100 : d3.event.pageX - 200;
                div.html(value_tooltip)
                    .style("left", position_x_tooltip + "px")
                    .style("top", (d3.event.pageY - 64) + "px");
            })
            .on("mouseout", function(d) {
                div.transition()
                    .duration(500)
                    .style("opacity", 0);
            })
            .call(chart);

        var title = svg.append("g")
            .style("text-anchor", "end")
            .attr("transform", "translate(-6," + height / 2 + ")");

        title.append("text")
            .attr("class", "title")
            .text( (d) => d.title );

        title.append("text")
            .attr("class", "subtitle")
            .attr("dy", "1em")
            .text( (d) => d.subtitle );


        function randomize(d) {
            if (!d.randomizer) d.randomizer = randomizer(d);
            d.ranges = d.ranges.map(d.randomizer);
            d.markers = d.markers.map(d.randomizer);
            d.measures = d.measures.map(d.randomizer);
            return d;
        }

        function randomizer(d) {
            var k = d3.max(d.ranges) * 0.2;
            return (d) => Math.max(0, d + k * (Math.random() - 0.5) );
        }

        
        function format_value_tooltip(d){
            
            function get_table(val, min, max, mean){
                return `
                    <table>
                        <tr>
                            <th>Value:</th><td>${val}</td>
                        </tr>
                        <tr>
                            <th>Min:</th><td>${min}</td>
                        </tr>
                        <tr>
                            <th>Max:</th><td>${max}</td>
                        </tr>
                        <tr>
                            <th>Avg:</th><td>${mean}</td>
                        </tr>
                    </table>
                `;
            }

            
            if ( d.title == 'S' || d.title == 'N' )
                return get_table(
                    d.markers[0].toFixed(0),
                    d.ranges[0].toFixed(0),
                    d.ranges[1].toFixed(0),
                    d.measures[0].toFixed(0)
                );
            
            if ( d.title == 'INS' || d.title == 'C' || d.title == 'A' )
                return get_table(
                    d.markers[0].toFixed(5),
                    d.ranges[0].toFixed(5),
                    d.ranges[1].toFixed(5),
                    d.measures[0].toFixed(5)
                );
                       
            // B:
            return get_table(
                    d.markers[0].toFixed(3),
                    d.ranges[0].toFixed(3),
                    d.ranges[1].toFixed(3),
                    d.measures[0].toFixed(3)
                );            
        }
        
    },  // end display_bullet

    display_origin_chart: (top_origin) => {
        const rank_origin = UTILS.sortProperties(top_origin);
        rank_origin.forEach( (d) => {
            d.origen =d[0];
            d.cantidad = +d[1];
        });
        
        // set the dimensions and margins of the graph
        var margin = {top: 10, right: 30, bottom: 40, left: 100},
            width = 520 - margin.left - margin.right,
            height = 320 - margin.top - margin.bottom;

        // append the svg object to the body of the page
        var svg = d3.select("#origin-chart")
                    .append("svg")
                        .attr("width", width + margin.left + margin.right)
                        .attr("height", height + margin.top + margin.bottom)
                    .append("g")
                        .attr("transform",
                              "translate(" + margin.left + "," + margin.top + ")");

        
            // Add X axis
            var x = d3.scaleLinear()
                .domain([0, d3.max(rank_origin.map( (d) => d.cantidad )) ])
                .range([ 0, width]);
            svg.append("g")
              .attr("transform", "translate(0," + height + ")")
              .call(d3.axisBottom(x))
              .selectAll("text")
                .attr("transform", "translate(-10,0)rotate(-45)")
                .style("text-anchor", "end");

            // Y axis
            var y = d3.scaleBand()
              .range([ 0, height ])
              .domain(rank_origin.map( (d) => d.origen ) )
              .padding(1);
            svg.append("g")
              .call(d3.axisLeft(y))

            // Lines
            svg.selectAll("myline")
              .data(rank_origin)
              .enter()
              .append("line")
                //.attr("x1", (d) => x(d.cantidad) )
                .attr("x1", x(0) )
                .attr("x2", x(0))
                .attr("y1", (d) => y(d.origen) )
                .attr("y2", (d) => y(d.origen) )
                .attr("class", "origen-line")

            // Circles
            svg.selectAll("mycircle")
              .data(rank_origin)
              .enter()
              .append("circle")
                //.attr("cx", (d) => x(d.cantidad) )
                .attr("cx", x(0) )
                .attr("cy", (d) => y(d.origen) )
                .attr("r", "7")
                .attr("class", "origen-ball")
                .on('mousemove', (d) => {
                        console.log(d.origen);
                        console.log(d.cantidad);
                        let text_origin = `<b>${d.origen}</b>: ${d.cantidad}`;
                        d3.select('#origin-chart--item-value').html(text_origin);

                    }
                );
        
            // Change the X coordinates of line and circle
            svg.selectAll("circle")
              .transition()
              .duration(6000)
              .attr("cx", (d) => x(d.cantidad) )

            svg.selectAll("line")
              .transition()
              .duration(6000)
              .attr("x1", (d) => x(d.cantidad) )
        
        //d3.select(SETUP.btn_export_surnames_origin_selector)
        //    .style('display', 'block');
        
        d3.select(SETUP.btn_export_surnames_origin_selector)
            .on('click', () => {
                domtoimage.toJpeg(
                    document.getElementById(SETUP.surnames_origin_div_id),
                    { 
                        quality: 1,
                        bgcolor: 'white'
                    })
                    .then(function (dataUrl) {
                        var link = document.createElement('a');
                        link.download = 'chart.jpeg';
                        link.href = dataUrl;
                        link.click();
                    });
            });


    },
    
    display_circuits: (circuits) => {
        
        // acá hay un teje y maneje para ordenar los circuitos
        var circuits_rank = UTILS.sortProperties(
            circuits.map( (d) => {
                return {
                    'nombre': d['circuito_nombre'],
                    'empadronados': d['n'] 
                }
            })
        );
        
        const circuits_rank_aux = Array();
        circuits_rank.forEach( (d) => {
            circuits_rank_aux.push(
                {
                    'nombre': d[1]['nombre'],
                    'empadronados': +d[1]['empadronados']
                }
            );
        });
        
        // quedó ordenada de menor a mayor, dar vuelta:
        //circuits_rank_aux.reverse();

        var circuitsListHtml = Mustache.render(
            APP.TEMPLATE_RESUMEN,
            {
                "circuitos": circuits_rank_aux,
            },
            {},
            [ '<%', '%>' ]  //customTags
        );
        
        // dibujar:
        d3.select('#circuit-list-placeholder').html(circuitsListHtml);
        
        // Radar chart:
        //
        // obtener el contexto:    
        var ctx = document.getElementById('indicadoresChart').getContext('2d');

        // normalizar con el total de los datos (de todas las provincias)
        const minimos = UTILS.obtener_minimos(circuits);
        const maximos = UTILS.obtener_maximos(circuits);
        let data_item = null;
        
        circuits.forEach( (d) => {
            if ( d.circuito_nombre == circuits_rank_aux[0].nombre ){
                data_item = d;
            }
        });
        data_for_radar = [
            ( ( data_item.s - minimos.s) / ( maximos.s - minimos.s ) ) *100,
            ( ( data_item.alfa_fisher - minimos.alfa_fisher ) / ( maximos.alfa_fisher - minimos.alfa_fisher ) ) *100,
            ( ( data_item.ins - minimos.ins) / ( maximos.ins - minimos.ins ) ) *100,
            ( ( data_item.a - minimos.a ) / ( maximos.a - minimos.a ) ) *100,
            ( ( data_item.b - minimos.b) / ( maximos.b - minimos.b ) ) *100,
            ( ( data_item.consanguinidad - minimos.consanguinidad) / ( maximos.consanguinidad - minimos.consanguinidad ) ) *100,
            ( ( data_item.n - minimos.n) / ( maximos.n - minimos.n ) ) *100,
        ];

        // dataset:
        the_data = {
            labels: SETUP.RADAR_CHART_LABELS, 
            datasets: [{
                label: 'Indicadores',  //
                backgroundColor: "#081d5836",
                data: data_for_radar,
                pointRadius: 1,
            }]
        };

        var indicadoresRadarChart = new Chart(
            ctx,
            {
                type: 'radar',
                data: the_data,
                options: SETUP.RADAR_CHART_OPTIONS
            }
        );


    },
    
    
    display_lasker_map: (provincia_codigo) => {
        console.log('Codigo provincia:', provincia_codigo);
        const url_lasker_data = `${SETUP.url_data_lasker_provincia}/${provincia_codigo}`;
        
        d3.queue()
          .defer(d3.json, LAYERS_INDEX[provincia_codigo])
          .defer(d3.json, url_lasker_data)
          .await(MAP.load_layer);
    },
   
}





/**
***
***
***/
UTILS = {
    obtener_minimos: (data) => {
        /* Obtiene los mínimos de todos los indicadores 
         * Args:
         *     data: tiene la estructura de dataById. Qué documentación...
         *     claves n, s, ins, consanguinidad, alfa_fisher, a y b estan en data.
        **/
        const array_solo_clave = (data, clave) => Object.values(data).map( (data_i) => parseFloat(data_i[clave]) );
        return {
            n: d3.min( array_solo_clave( data, 'n') ),
            s: d3.min( array_solo_clave( data, 's') ),
            ins: d3.min( array_solo_clave( data, 'ins') ),
            consanguinidad: d3.min( array_solo_clave( data, 'consanguinidad') ),
            alfa_fisher: d3.min( array_solo_clave( data, 'alfa_fisher') ),
            a: d3.min( array_solo_clave( data, 'a') ),
            b: d3.min( array_solo_clave( data, 'b') ),
        };
    },
    obtener_maximos: (data) => {
        /* Obtiene los máximos de todos los indicadores 
         * Args:
         *     data: tiene la estructura de dataById. Qué documentación...
         *     claves n, s, ins, consanguinidad, alfa_fisher, a y b estan en data.
        **/
        const array_solo_clave = (data, clave) => Object.values(data).map( (data_i) => parseFloat(data_i[clave]) );
        return {
            n: d3.max( array_solo_clave( data, 'n') ),
            s: d3.max( array_solo_clave( data, 's') ),
            ins: d3.max( array_solo_clave( data, 'ins') ),
            consanguinidad: d3.max( array_solo_clave( data, 'consanguinidad') ),
            alfa_fisher: d3.max( array_solo_clave( data, 'alfa_fisher') ),
            a: d3.max( array_solo_clave( data, 'a') ),
            b: d3.max( array_solo_clave( data, 'b') ),
        };
    },
    
    sortProperties: (obj) => {
        /**
        * Retorna una lista (array) con los pares clave - valor,
        * ordenado por valor.
        */
        // gracias a: https://gist.github.com/umidjons/9614157
        // convert object into array
        var sortable=[];
        for(var key in obj)
            if(obj.hasOwnProperty(key))
                sortable.push([key, obj[key]]); // each item is an array in format [key, value]

        // sort items by value
        sortable.sort(function(a, b)
        {
            var x=a[1],
                y=b[1];
            return x>y ? -1 : x<y ? 1 : 0;
        });
        return sortable; // array in format [ [ key1, val1 ], [ key2, val2 ], ... ]
    },
    
    get_data_to_chart: (indicadores_departamento, indicadores_province) => {
        /*
        ** Prepara un arreglo de objetos donde cada uno de estos objetos
        ** corresponderá con un renglon del grafico de indicadores
        **/
        return [
            {
                "title":"N",
                "subtitle":"Electorate",
                "ranges":[ 
                    parseInt(indicadores_province['minimos']['n']),
                    parseInt(indicadores_province['maximos']['n'])
                ], // franjas anchas
                "measures":[ 
                    parseFloat(indicadores_province['medias']['n'])
                ],  // franjas finas
                "markers":[ parseFloat(indicadores_departamento['n']) ]
            },
            {
                "title":"S",
                "subtitle":"Different surnames",
                "ranges":[
                    parseInt(indicadores_province['minimos']['s']),
                    parseInt(indicadores_province['maximos']['s'])
                ], // franjas anchas
                "measures":[ indicadores_province['medias']['s'] ],  // franjas finas
                "markers":[ indicadores_departamento['s'] ]
            },
            {
                "title":"I",
                "subtitle":"Isonymy",
                "ranges":[
                    indicadores_province['minimos']['ins'],
                    indicadores_province['maximos']['ins'] 
                ], // franjas anchas
                "measures":[ indicadores_province['medias']['ins'] ],  // franjas finas
                "markers":[ indicadores_departamento['ins'] ]
            },
            {
                "title":"F",
                "subtitle":"Fisher's alpha",
                "ranges":[ 
                    indicadores_province['minimos']['alfa_fisher'],
                    indicadores_province['maximos']['alfa_fisher'] 
                ], // franjas anchas
                "measures":[ indicadores_province['medias']['alfa_fisher'] ],  // franjas finas
                "markers":[ indicadores_departamento['alfa_fisher'] ]
            },
            {
                "title":"C",
                "subtitle":"Inbreeding estimator",
                "ranges":[
                    indicadores_province['minimos']['consanguinidad'],
                    indicadores_province['maximos']['consanguinidad']
                ], // franjas anchas
                "measures":[ indicadores_province['medias']['consanguinidad'] ],  // franjas finas
                "markers":[ indicadores_departamento['consanguinidad'] ]
            },

            {
                "title":"A",
                "subtitle":"Index A",
                "ranges":[
                    indicadores_province['minimos']['a'],
                    indicadores_province['maximos']['a']
                ], // franjas anchas
                "measures":[ indicadores_province['medias']['a'] ],  // franjas finas
                "markers":[ indicadores_departamento['a'] ]
            },
            {
                "title":"B",
                "subtitle":"Index B",
                "ranges":[ 
                    indicadores_province['minimos']['b'],
                    indicadores_province['maximos']['b']
                ], // franjas anchas
                "measures":[ indicadores_province['medias']['b'] ],  // franjas finas
                "markers":[ indicadores_departamento['b'] ]
            },

        ];

    },
}

APP.init();



