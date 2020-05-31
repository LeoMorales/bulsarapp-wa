from flask import render_template, session, redirect, url_for, current_app, flash
from . import main
from ..extensions import mongo, login_manager
from ..models import User, SurnameDistribution
from .forms import NameForm, SurnameForm, LoginForm
from flask import jsonify
from werkzeug.security import check_password_hash
from flask_login import login_user, login_required, logout_user, current_user

# Necesario cuando trabajamos con login_manager
@login_manager.user_loader
def load_user(user_id):
    return User.objects(pk=user_id).first()

@main.route('/', methods=['GET'])
@login_required
def index():
    return render_template('index.html')

@main.route('/origen', methods=['GET', 'POST'])
@login_required
def origen():
    form = SurnameForm()
    if form.validate_on_submit():
        # si se envió el formulario, guardar la info en la session y redireccionar
        session['surname'] = form.surname.data
        session['origen'] = get_surname_tag(session['surname'])
        return redirect(url_for('.origen'))  # el endpoint es esta misma funcion        
    
    return render_template('origen.html',
                           surname=session.get('surname'),
                           origen=session.get('origen'),
                           form=form)

@main.route('/test')
def handle_test():
    return render_template('test_hover_map.html')

@main.route('/indicadores-por-provincias')
@login_required
def indicadores_por_provincias():
    return render_template('map__indicadores_por_provincias.html')

@main.route('/indicadores-por-departamentos')
@login_required
def indicadores_por_departamentos():
    return render_template('map__indicadores_por_departamentos.html')

@main.route('/distribucion-por-provincias')
@login_required
def distribucion_por_provincias():
    return render_template('map__distribucion_apellidos_provincias.html')

@main.route('/distribucion-por-departamentos')
@login_required
def distribucion_por_departamentos():
    return render_template('map__distribucion_apellidos_departamentos.html')

           
@main.route('/login', methods=['GET', 'POST'])
def login():
    form = LoginForm()

    if form.validate_on_submit():
        print('Login:')
        print(form.username.data)
        print(form.password.data)
        check_user = User.objects(username=form.username.data).first()
        if check_user:
            if check_password_hash(check_user['password'], form.password.data):
                flash('Logged in successfully.')
                login_user(check_user, remember=form.remember.data)
                session['logged_in'] = True
                return redirect(url_for('main.index'))
        
        return redirect(url_for('main.login'))
    return render_template('login.html', form=form)

@main.route('/about')
@login_required
def about():
    return render_template('about.html')

@main.route('/logout', methods = ['GET'])
@login_required
def logout():
    logout_user()
    session['logged_in'] = False
    return redirect(url_for('main.login'))


@main.route('/distribucion-origenes-por-provincias')
@login_required
def distribucion_origenes_por_provincias():
    return render_template('map__distribucion_origenes_provincias.html')

@main.route('/distribucion-origenes-por-departamentos')
@login_required
def distribucion_origenes_por_departamentos():
    return render_template('map__distribucion_origenes_departamentos.html')

@main.route('/detalle/departamento/<departamento_id>')
@login_required
def detalle_departamento(departamento_id):
    return render_template('detalle_departamento.html')


############################################################################################################################################################################################################################################################################################################################################################################################################################################################################################################################
# JSON RESPONSE
@main.route('/distribucion/<apellido>')
@login_required
def get_distribucion_de_apellido(apellido):
    apellido_solicitado = apellido.upper()
    collection = mongo.db.distribucion_apellidos_por_provincias
    cursor = collection.find(
        {},  # todos los documentos
        {
            "provincia_nombre": 1,
            "provincia_in1": 1,
            apellido_solicitado: 1,  # lease 'MORALES', ... 
            "_id": 0
        }
    )
    
    #  [ {provincia_in1: "02", provincia_nombre: "Capital Federal", apellido?: cantidad?}, ... ]
    data_response = list()
    status = 1200
    for data_provincia in cursor:
        # comprobar si se encontró el apellido buscado:
        if apellido_solicitado in data_provincia:
            data_response.append(data_provincia)
        else:
            # 
            status = 1404
            data_provincia.update({apellido_solicitado: 0})
            data_response.append(data_provincia)
    # si no se encontró el apelllido como atributo en los documentos de provincias,
    # la lista data_response estará vacía. ERROR: es mejor retornar valor = 0
    
    return jsonify(
        apellido=apellido_solicitado,
        data=data_response,
        status=status
    )


#JSON RESPONSE:
@main.route('/indicadores/departamentos')
@login_required
def get_indicadores_departamentos():
    '''
        Retorna los indicadores por departamento:
        
        keys(response): ['data', 'status']
        
        type(response['data']): list
        type(response['status']): int
        
        keys(response['data'][0]): [
            "a", "alfa_fisher", "b", "consanguinidad",
            "departamento_id", "departamento_nombre",
            "ins", "n", "provincia_nombre", "s"
        ]
    '''
    collection = mongo.db.indicadores_por_departamentos
    cursor = collection.find(
        {},  # todos los documentos
        {
            "_id": 0
        }
    )
    
    data_response = list()
    status = 1200
    for data_departamento in cursor:
        data_response.append(data_departamento)
    
    return jsonify(
        data=data_response,
        status=status
    )


# JSON RESPONSE:
@main.route('/distribucion/por-departamentos/<apellido>')
@login_required
def distribucion_de_apellido_por_departamentos(apellido):
    apellido_solicitado = apellido.upper()
    collection = mongo.db.distribucion_apellidos_por_departamentos
    cursor = collection.find(
        {},  # todos los documentos
        {
            "provincia_nombre": 1,
            "provincia_in1": 1,
            "departamento_id": 1,
            "departamento_nombre": 1,
            apellido_solicitado: 1,  # lease 'MORALES', ... 
            "_id": 0
        }
    )
    
    data_response = list()
    status = 1200
    for data_provincia in cursor:
        # comprobar si se encontró el apellido buscado:
        if apellido_solicitado in data_provincia:
            data_response.append(data_provincia)
        else:
            # 
            status = 1404
            data_provincia.update({apellido_solicitado: 0})
            data_response.append(data_provincia)
    # si no se encontró el apelllido como atributo en los documentos de provincias,
    # la lista data_response estará vacía. ERROR: es mejor retornar valor = 0
    
    return jsonify(
        apellido=apellido_solicitado,
        data=data_response,
        status=status
    )

#JSON RESPONSE:
@main.route('/origenes/provincias')
@login_required
def get_origenes_provincias():
    '''
        Retorna las cantidades de apellidos de c/origen por provincia:
        
        keys(response): ['data', 'status']
        
        type(response['data']): list
        type(response['status']): int
        
        keys(response['data'][0]): [
            "AFRICANO", "ALEMAN", "ANDINO", "ARABE",
            "ARMENIO", "BELGA", "BRIT\u00c1NICO",
            "CHINO", "COREANO", "ESCANDINAVO", "ESPA\u00d1OL",
            "ESTE EUROPEO", "FRANCES", "GERMANICO", "GRIEGO",
            "HEBREO", "HINDU", "HOLANDES", "IBERICO", "ITALIANO",
            "JAPONES", "JUJUY", "NOA", "PORTUGUES", "SUIZOS",
            "SUR", "TAILANDIA", "TIERRAS BAJAS", "VASCO", "GERMANICO-ALEMAN"
            "provincia_codigo", "provincia_nombre" 
        ]
    '''
    collection = mongo.db.distribucion_origenes_provincias
    ALL = {}
    cursor = collection.find(
        ALL,  # todos los documentos
        {
            "_id": 0  # el id no...
        }
    )
    
    data_response = list()
    status = 1200
    for data_provincia in cursor:
        data_response.append(data_provincia)
    
    return jsonify(
        data=data_response,
        status=status
    )

@main.route('/origenes/nbayes/provincias')
@login_required
def get_origenes_provincias_predicted():
    '''
        Retorna las cantidades de apellidos de c/origen por provincia:
        
        keys(response): ['data', 'status']
        
        type(response['data']): list
        type(response['status']): int
        
        keys(response['data'][0]): [
            "AAR",
            "AFRICANO", "ALEMAN", "ANDINO", "ARABE",
            "ARMENIO", "BELGA", "BRIT\u00c1NICO",
            "CHINO", "COREANO", "ESCANDINAVO", "ESPA\u00d1OL",
            "ESTE EUROPEO", "FRANCES", "GERMANICO", "GRIEGO",
            "HEBREO", "HINDU", "HOLANDES", "IBERICO", "ITALIANO",
            "JAPONES", "JUJUY", "NOA", "PORTUGUES", "SUIZOS",
            "SUR", "TAILANDIA", "TIERRAS BAJAS", "VASCO",
            "provincia_codigo", "provincia_nombre" 
        ]
    '''
    collection = mongo.db.distribucion_origenes_provincias_predicted
    cursor = collection.find(
        {},  # todos los documentos
        {
            "_id": 0  # el id no...
        }
    )
    
    data_response = list()
    status = 1200
    for data_provincia in cursor:
        data_response.append(data_provincia)
    
    return jsonify(
        data=data_response,
        status=status
    )


# JSON RESPONSE:
@main.route('/origenes/departamentos')
@login_required
def get_origenes_departamentos():
    collection = mongo.db.distribucion_origenes_departamentos
    cursor = collection.find(
        {},  # todos los documentos
        {
            "_id": 0
        }
    )
    
    data_response = list()
    status = 1200
    for data_provincia in cursor:
        data_response.append(data_provincia)
        
    return jsonify(
        data=data_response,
        status=status
    )

# JSON RESPONSE:
@main.route('/origenes/nbayes/departamentos')
@login_required
def get_origenes_departamentos_nbayes():
    collection = mongo.db.distribucion_origenes_departamentos_predicted
    cursor = collection.find(
        {},  # todos los documentos
        {
            "_id": 0
        }
    )
 

    data_response = list()
    status = 1200
    for data_provincia in cursor:
        data_response.append(data_provincia)
        
    return jsonify(
        data=data_response,
        status=status
    )


# JSON RESPONSE:
@main.route('/data/departamento/<departamento_id>')
@login_required
def get_data_departamento(departamento_id):
    print('buscar departamento:', departamento_id)
    collection = mongo.db.departamentos_detalles
    data_response = collection.find_one(
        {
            'departamento_id': departamento_id
        },
        {
            "_id": 0,
            "circuitos": 0
        }
    )
    status = 1200
    
    if data_response:
        data_response['provincia_total'] = 100000
    else:
        status = 1404
    
    return jsonify(
        data=data_response,
        status=status
    )


# JSON RESPONSE:
@main.route('/data/provincia/<provincia_code>')
@login_required
def get_data_provincia(provincia_code):
    collection = mongo.db.provincias_detalles
    #if not isinstance(provincia_code, int):
    #    return jsonify(
    #        data={ 'error': 'code not integer'},
    #        status=1500
    #    )

    data_response = collection.find_one(
        {
            'provincia_codigo': provincia_code
        },
        {
            "_id": 0
        }
    )
    status = 1200
    if not data_response:
        status = 1404
    
    return jsonify(
        data=data_response,
        status=status
    )

# JSON RESPONSE:
@main.route('/data/departamentos/<provincia_id>')
@login_required
def get_data_departamentos_para_provincia(provincia_id):
    print('buscar departamento:', provincia_id)
    collection = mongo.db.departamentos_detalles
    cursor_response = collection.find(
        {
            'provincia_codigo': provincia_id
        },
        {
            "_id": 0,
            "circuitos": 0
        }
    )
    status = 1200
    data_response = []
    for data_provincia in cursor_response:
        data_response.append(data_provincia)

    if not data_response:
        status = 1404
    
    return jsonify(
        data=data_response,
        status=status
    )


# JSON RESPONSE:
@main.route('/lasker/provincia/<provincia_id>')
@login_required
def get_lasker_por_departamento_para_provincia(provincia_id):
    print('buscar provincia:', provincia_id)
    collection = mongo.db.provincias_lasker
    data_response = collection.find_one(
        { 'provincia_codigo': provincia_id },
        { "_id": 0 }
    )
    status = 1200
    if not data_response:
        status = 1404
    
    return jsonify(
        data=data_response,
        status=status
    )

