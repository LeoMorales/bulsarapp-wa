# Bulsarapp

A web application to visualize surname information in Argentina.

## Setup:


You can install the dependencies using conda:

`> conda env create -f bulsarapp/environment.yml`

This command will be create the env: _app_env_

`> conda activate app_env`

You need a mongodb server. You can run the _docker compose_ (if installed) in the db folder:

`> cd db/`

`> docker-compose up`

You need to know that the port of this database server is: __27018__

Then you can run the database loader script:

`> cd db/`

`> python load_mock_database.py`

> If you have a mongo server running in a different port, you must change the line #6 in the script → __MONGODB_PORT = 27018__
Now you have the user/pass → user/1234.


Finally, you must set the env vars and run the app:
`> cd ../bulsarapp/`

`> export FLASK_APP=bulsarapp.py`

`> export FLASK_DEBUG=1`

`> export FLASK_CONFIG=development`

`> conda activate app_env`

`> flask run`

Now go to http://localhost:5000/


> If you have a mongo server running in a different port, you must change the DevelopmentConfig class variable → __DEBUG_PORT = 27018__ in the file _bulsarapp/config.py_

All the data in this repository is mock data.


Used tools:

- flask
- pandas
- geopandas
- pymongo
- scikit-learn


- D3
- MongoDB

# Screenshots

![Login image](https://github.com/LeoMorales/bulsarapp-wa/tree/master/bulsarapp/screenshots/login.png)


![Index A image](https://github.com/LeoMorales/bulsarapp-wa/tree/master/bulsarapp/screenshots/indexa.png)


![Detail image](https://github.com/LeoMorales/bulsarapp-wa/tree/master/bulsarapp/screenshots/details.png)


![Distribution image](https://github.com/LeoMorales/bulsarapp-wa/tree/master/bulsarapp/screenshots/distributions.png)




# Contact

Please feel free to contact me if you have any question/comments at:
- twitter  -->  /_leomorales23
- linkedin -->  /morales-leo






