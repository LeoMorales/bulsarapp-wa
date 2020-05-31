from pymongo import MongoClient
import pandas as pd
import json
from pprint import pprint

MONGODB_PORT = 27018  # TODO: load from config file
client = MongoClient(port=MONGODB_PORT)
print(client.list_database_names())

database_bulsarapp = client['bulsarapp_db']
print(database_bulsarapp.list_collection_names())

##########################################################################################
# indicadores_por_departamentos
##########################################################################################
print('LOADING: Indicators')

coleccion_indicadores_departamentos = database_bulsarapp['indicadores_por_departamentos']

VALUES_CSV_FILENAME = 'mock_data/departments_values_03.csv'
department_values_csv = pd.read_csv(
    VALUES_CSV_FILENAME,
    dtype={
        'departamento_id_detalle': 'object'
    }
)

coleccion_indicadores_departamentos.drop()
for document_to_insert in department_values_csv.to_dict(orient='records'):
    coleccion_indicadores_departamentos.insert_one(document_to_insert).inserted_id

print('LOADING OK: Indicators')


##########################################################################################
# distribucion_apellidos_por_departamentos
##########################################################################################
print('LOADING: Distributions')
coleccion_distribucion_departamentos = database_bulsarapp['distribucion_apellidos_por_departamentos']
DISTRIBUCION_CSV_FILENAME = 'mock_data/departments_surnames_distribution_mock.csv'
distribucion_df_mock = pd.read_csv(
    DISTRIBUCION_CSV_FILENAME,
    dtype={
        'departamento_id': 'object'
    }
)

coleccion_distribucion_departamentos.drop()
for document_to_insert in distribucion_df_mock.to_dict(orient='records'):
    coleccion_distribucion_departamentos.insert_one(document_to_insert).inserted_id

print('LOADING OK: Distribution:', coleccion_distribucion_departamentos.estimated_document_count())


##########################################################################################
# distribucion_origenes_departamentos
##########################################################################################
print('LOADING: Origins')
ORIGIN_CSV_FILENAME = 'mock_data/departments_origin_distribution.csv'
origenes_por_departamento_mock = pd.read_csv(
    ORIGIN_CSV_FILENAME,
    dtype={
        'departamento_id': 'object'
    }
)

coleccion_distribucion_origenes_departamentos = database_bulsarapp['distribucion_origenes_departamentos']
print(coleccion_distribucion_origenes_departamentos.estimated_document_count())

coleccion_distribucion_origenes_departamentos.drop()
for document_to_insert in origenes_por_departamento_mock.to_dict(orient='records'):
    coleccion_distribucion_origenes_departamentos.insert_one(document_to_insert).inserted_id

print('LOADING OK: Origins:', coleccion_distribucion_origenes_departamentos.estimated_document_count())

##########################################################################################
# distribucion_origenes_departamentos_predicted
##########################################################################################
print('LOADING: Origins predicted')
ORIGIN_MODEL_CSV_FILENAME = 'mock_data/departments_origin_by_model_distribution.csv'
origenes_por_departamento_por_modelo_mock = pd.read_csv(
    ORIGIN_MODEL_CSV_FILENAME,
    dtype={
        'departamento_id': 'object'
    }
)

coleccion_distribucion_origenes_por_modelo_departamentos = (
	database_bulsarapp['distribucion_origenes_departamentos_predicted']
)
print(coleccion_distribucion_origenes_por_modelo_departamentos.estimated_document_count())

coleccion_distribucion_origenes_por_modelo_departamentos.drop()
for document_to_insert in origenes_por_departamento_por_modelo_mock.to_dict(orient='records'):
    coleccion_distribucion_origenes_por_modelo_departamentos.insert_one(document_to_insert).inserted_id

print('LOADING OK: Origins predicted')


##########################################################################################
# departamentos_detalles
##########################################################################################
print('LOADING: Department details')
DETALLES_MOCK_CSV_FILENAME = 'mock_data/detalles_departamentos_mock_cordoba_catamarca.csv'
mock_detalles_departamentos_cordoba_catamarca = pd.read_csv(
    DETALLES_MOCK_CSV_FILENAME,
    dtype={
        'departamento_id': 'object'
    }
)
print(mock_detalles_departamentos_cordoba_catamarca.shape)

PROVINCIAS_SUBSET_NOMBRES = ['Córdoba', 'Catamarca']
mock_indicadores_departamentos_cordoba_catamarca = department_values_csv[department_values_csv.provincia_nombre.isin(PROVINCIAS_SUBSET_NOMBRES)]
print(mock_indicadores_departamentos_cordoba_catamarca.shape)

# mergear...
mock_detalle_final = pd.merge(
    mock_indicadores_departamentos_cordoba_catamarca,
    mock_detalles_departamentos_cordoba_catamarca,
    left_on='departamento_id_detalle',
    right_on='departamento_id'
)

# renombrar id_detalle...
mock_detalle_final.rename(columns={'departamento_id_detalle': 'departamento_id'}, inplace=True)
mock_detalle_final.drop(columns=['departamento_id_x', 'departamento_id_y'], inplace=True)

coleccion_detalles_departamentos = database_bulsarapp['departamentos_detalles']
print()
print(coleccion_detalles_departamentos.estimated_document_count())

coleccion_detalles_departamentos.drop()
for document_to_insert in mock_detalle_final.to_dict(orient='records'):
    # parsear las cadenas de diccionarios:
    document_to_insert['top_7_surnames'] = json.loads(document_to_insert['top_7_surnames'].replace("'", '"'))
    document_to_insert['top_7_origin'] = json.loads(document_to_insert['top_7_origin'].replace("'", '"'))
    coleccion_detalles_departamentos.insert_one(document_to_insert).inserted_id
    
print("LOADING OK: Detalles:", coleccion_detalles_departamentos.estimated_document_count())


##########################################################################################
# provincias_detalles
##########################################################################################
print('LOADING: Province details')
DETALLES_PROVINCIA_MOCK_CSV_FILENAME = 'mock_data/province_details_mock.csv'
mock_detalles_provincias_df = pd.read_csv(
    DETALLES_PROVINCIA_MOCK_CSV_FILENAME,
    dtype={
        'departamento_id': 'object',
        'provincia_codigo': 'object'
    }
)

coleccion_detalles_provincias = database_bulsarapp['provincias_detalles']

print()
print(coleccion_detalles_provincias.estimated_document_count())

coleccion_detalles_provincias.drop()
for document_to_insert in mock_detalles_provincias_df.to_dict(orient='records'):
    document_to_insert['maximos'] = json.loads(document_to_insert['maximos'].replace("'", '"'))
    document_to_insert['medias'] = json.loads(document_to_insert['medias'].replace("'", '"'))
    document_to_insert['minimos'] = json.loads(document_to_insert['minimos'].replace("'", '"'))
    coleccion_detalles_provincias.insert_one(document_to_insert).inserted_id


##########################################################################################
# lasker cordoba
##########################################################################################
print('LOADING: Cordoba Lasker')

LASKER_CORDOBA_MOCK_CSV_FILENAME = 'mock_data/lasker_cordoba_mock.csv'
mock_lasker_cordoba_df = pd.read_csv(
    LASKER_CORDOBA_MOCK_CSV_FILENAME,
    dtype={
        'provincia_codigo': 'object'
    }
)

# coleccion de trabajo: provincias_lasker
coleccion_provincias_lasker = database_bulsarapp['provincias_lasker']

print()
print(coleccion_provincias_lasker.estimated_document_count())

coleccion_provincias_lasker.drop()
for document_to_insert in mock_lasker_cordoba_df.to_dict(orient='records'):
    document_to_insert['lasker_data'] = json.loads(document_to_insert['lasker_data'].replace("'", '"'))
    coleccion_provincias_lasker.insert_one(document_to_insert).inserted_id

print('LOADING OK: Cordoba Lasker', coleccion_provincias_lasker.estimated_document_count())

######################
# Load test user:
######################

from pymongo import MongoClient
from werkzeug.security import generate_password_hash

user_collection = database_bulsarapp['users']

new_user__username = 'user'
new_user__hashed_password = generate_password_hash(
    '1234',
    method='sha256'
)

new_user = dict(
    username=new_user__username,
    password=new_user__hashed_password
)

result = user_collection.insert_one(new_user)

print('The user has been created successfully')