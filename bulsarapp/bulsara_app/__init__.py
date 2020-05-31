from flask import Flask
from config import config
from .extensions import (mongo, bootstrap, login_manager, mongo_engine, compress)
from .main import main as main_blueprint

def create_app(config_name):
    
    print(f'Initializing app with configuration: {config_name}')
    print(config[config_name])
    
    app = Flask(__name__)
    app.config.from_object(config[config_name])
    config[config_name].init_app(app)

    # inits varios: 
    bootstrap.init_app(app)
    
    mongo.init_app(app)
    mongo_engine.init_app(app)
        
    app.register_blueprint(main_blueprint)
    login_manager.init_app(app)
    login_manager.login_view = 'main.login'
    
    compress.init_app(app)

    return app

