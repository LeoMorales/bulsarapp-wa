from flask_wtf import FlaskForm
from wtforms import StringField, SubmitField, PasswordField, BooleanField
from wtforms.validators import DataRequired, InputRequired, Email, Length

## forms:
class NameForm(FlaskForm):
    name = StringField('What is your name?', validators=[DataRequired()])
    submit = SubmitField('Submit')

class SurnameForm(FlaskForm):
    surname = StringField('¿De qué apellido desea obtener el origen?', validators=[DataRequired()])
    submit = SubmitField('Buscar')

class LoginForm(FlaskForm):
    username = StringField(
        'Username',
        validators=[
            InputRequired(),
            Length(min=3, max=15)
        ]
    )
    password = PasswordField(
        'Password',
        validators=[
            InputRequired(),
            Length(min=4, max=80)
        ]
    )
    remember = BooleanField('Remember me')
