from pymongo import MongoClient
from werkzeug.security import generate_password_hash

client = MongoClient(port=27018)
db = client.bulsarapp_db
user_collection = db.users

new_user__username = input('Enter a username: ')
new_user__hashed_password = generate_password_hash(
    input('Enter the new password: '),
    method='sha256'
)

new_user = dict(
    username=new_user__username,
    password=new_user__hashed_password
)

result = user_collection.insert_one(new_user)

print('The user has been created successfully')