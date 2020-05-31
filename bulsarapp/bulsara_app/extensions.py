'''
Usamos PyMongo para obtener información de la BD sin usar un modelo,
esto porque nuestro documento de ocurrencias de apellidos en las
provincias es dificil de modelar (ya que un documento tiene una "columna"
por cada apellido encontrado).
Usamos MongoEngine para trabajar con modelos: de usuarios, por ejemplo.
'''

from flask_pymongo import PyMongo
from flask_bootstrap import Bootstrap
from flask_login import LoginManager, UserMixin, login_user, login_required, logout_user, current_user
from flask_mongoengine import MongoEngine, Document
from flask_compress import Compress

mongo = PyMongo()
mongo_engine = MongoEngine()
bootstrap = Bootstrap()
login_manager = LoginManager()
compress = Compress()