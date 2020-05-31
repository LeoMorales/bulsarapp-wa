import os
import click
from bulsara_app import create_app

app = create_app(os.getenv('FLASK_CONFIG') or 'production')

