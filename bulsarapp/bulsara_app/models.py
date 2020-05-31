from flask_login import UserMixin
from .extensions import mongo_engine

class User(UserMixin, mongo_engine.Document):
    # pretty printed usa:
    # username = db.Column(db.String(15), unique=True)
    # email = db.Column(db.String(50), unique=True)
    # password = db.Column(db.String(80))
    meta = {'collection': 'users'}
    username = mongo_engine.StringField(max_length=30)
    password = mongo_engine.StringField()

class SurnameDistribution(UserMixin, mongo_engine.Document):
    # pretty printed usa:
    meta = {'collection': 'distribucion_apellidos_por_provincias'}
    GARCIA = mongo_engine.IntField()
    GONZALEZ = mongo_engine.IntField()
    provincia_nombre = mongo_engine.StringField()
    provincia_in1 = mongo_engine.StringField()
    
    