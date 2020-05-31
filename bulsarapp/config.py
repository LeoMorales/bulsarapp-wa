import os
basedir = os.path.abspath(os.path.dirname(__file__))


class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'hard to guess string'

    @staticmethod
    def init_app(app):
        pass


class DevelopmentConfig(Config):
    DEBUG = True
    DEBUG_PORT = 27018
    DATABASE_NAME = 'bulsarapp_db'
    
    # MONGO_URI: pyMongo
    MONGO_URI = f'mongodb://localhost:{DEBUG_PORT}/{DATABASE_NAME}'
    
    # MONGODB_SETTINGS: mongo_engine
    MONGODB_SETTINGS = {
        'db': DATABASE_NAME,
        'host': 'localhost',
        'port': DEBUG_PORT
    }



class TestingConfig(Config):
    TESTING = True

    # MONGO_URI: pyMongo
    DB_USER = 'db_user_testing'        # <-- replace here your Atlas db user
    DB_PASS = 'a_secret_password'      # <-- replace here your Atlas db pass
    DATABASE_NAME = 'app_db_testing'   # <-- replace here your Atlas db name
    
    MONGO_URI = f'mongodb+srv://{DB_USER}:{DB_PASS}@cluster0-bodtn.mongodb.net/{DATABASE_NAME}'
    
    # MONGODB_SETTINGS: mongo_engine
    MONGODB_SETTINGS = {
        'host': f'mongodb+srv://cluster0-bodtn.mongodb.net/{DATABASE_NAME}',
        'db': DATABASE_NAME,
        'username': DB_USER,
        'password': DB_PASS,
    }


class ProductionConfig(Config):
    PRODUCTION = True

    # MONGO_URI: pyMongo
    DB_USER = 'db_user_prod'       # <-- replace here your Atlas db user
    DB_PASS = 'a_secret_password'  # <-- replace here your Atlas db pass
    DATABASE_NAME = 'app_db'       # <-- replace here your Atlas db name
    
    MONGO_URI = f'mongodb+srv://{DB_USER}:{DB_PASS}@cluster0-bodtn.mongodb.net/{DATABASE_NAME}'
    
    # MONGODB_SETTINGS: mongo_engine
    MONGODB_SETTINGS = {
        'host': f'mongodb+srv://cluster0-bodtn.mongodb.net/{DATABASE_NAME}',
        'db': DATABASE_NAME,
        'username': DB_USER,
        'password': DB_PASS,
    }


config = {
    'development': DevelopmentConfig,
    'testing': TestingConfig,
    'production': ProductionConfig,
    'default': DevelopmentConfig
}
