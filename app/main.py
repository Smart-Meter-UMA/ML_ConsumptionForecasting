from flask import Flask, url_for, redirect, render_template, request, Response
import database as db
import json
from bson import json_util
from datetime import datetime, timedelta
from sklearn.preprocessing import MaxAbsScaler
from sklearn.metrics import mean_squared_error, mean_absolute_error
import joblib
import requests
import numpy as np

def smape(actual, predicted) -> float:
  
    if not all([isinstance(actual, np.ndarray), 
                isinstance(predicted, np.ndarray)]):
        actual, predicted = np.array(actual),
        np.array(predicted)
  
    return round(
        np.mean(
            np.abs(predicted - actual) / 
            ((np.abs(predicted) + np.abs(actual)))
        )*100, 2
    )

app = Flask(__name__)
HOST = "0.0.0.0"
PORT = 5000
DEBUG = False
app.secret_key = 'NAhtaq4#5DGS'

maxabs_scaler_dtvalue = joblib.load('maxabsscaler_datetimeandvalue.pkl')
maxabs_scaler_onlyvalue = joblib.load('maxabsscaler_onlyvalue.pkl')

#################################### Vista usuario ########################################################
@app.route('/', methods=['GET'])
def init():
    datemin, datemax = db.get_min_max_timestamp()
    return render_template('index.html', datemin = datemin, datemax = datemax)

#################################### API REST #############################################################
@app.route('/api/consumo', methods=['GET'])
def api_get_consumo():
    datetimeStr = request.args.get("datetime")
    data = None

    if datetimeStr:
        data = db.get_consumption_gt_timestamp(datetimeStr)
    else:
        data = db.get_consumption()

    response = json_util.dumps(data)    
    return Response(response, mimetype='application/json')

@app.route('/api/predicciones', methods=['GET'])
def api_get_predicciones():
    metodo = request.args.get("metodo")
    tipo = request.args.get("tipo")
    fecha = request.args.get("fecha")
    hora = request.args.get("hora")
    ruta = 'http://consumoserving:8501/v1/models/'

    if metodo and tipo and fecha and hora:
        metodo = int(metodo)
        tipo = str(tipo)
        fecha = str(fecha)
        hora = str(hora)

        date_obj = datetime.strptime(fecha + " " + hora, '%Y-%m-%d %H:%M') 
        
        if tipo in ['hour', 'day', 'week', 'month']: 
            if tipo == 'hour':
                entrada, salida = db.get_input_and_output(date_obj, 12, 4, timedelta(hours=3), timedelta(hours=1))
            elif tipo == 'day':
                entrada, salida = db.get_input_and_output(date_obj, 288, 96, timedelta(days=3), timedelta(days=1))
            elif tipo == 'week':
                entrada, salida = db.get_input_and_output(date_obj, 2016, 672, timedelta(days=21), timedelta(days=7))
            else:
                entrada, salida = db.get_input_and_output(date_obj, 8640, 2880, timedelta(days=90), timedelta(days=30))
        else:
            return {'error': 'Tipo no valido'}

        entrada_array = []
        if metodo == 0:
            ruta += 'only_value_'

            for elem in entrada:
                entrada_array.append([float(elem['value'])])

            entrada_scaled = maxabs_scaler_onlyvalue.transform(entrada_array)

        elif metodo == 1:
            ruta += 'datetime_and_value_'
            day = 24*60*60
            week = 7 * day
            month = (30.4167)*day
            year = (365.2425)*day

            for elem in entrada:
                timestamp_s = int(elem['timestamp'])
                day_sin = np.sin(timestamp_s * (2 * np.pi / day))
                day_cos = np.cos(timestamp_s * (2 * np.pi / day))
                week_sin = np.sin(timestamp_s * (2 * np.pi / week))
                week_cos = np.cos(timestamp_s * (2 * np.pi / week))
                year_sin = np.sin(timestamp_s * (2 * np.pi / year))
                year_cos = np.cos(timestamp_s * (2 * np.pi / year))    

                entrada_array.append([day_sin, day_cos, week_sin, week_cos, year_sin, year_cos, float(elem['value'])])

            entrada_scaled = maxabs_scaler_dtvalue.transform(entrada_array)
        
        else:
            return {'error': 'Formato de entrada no valido'}

        ruta += (tipo + '/versions/1:predict')
        entrada_scaled_reshape = entrada_scaled.reshape(1, entrada_scaled.shape[0], entrada_scaled.shape[1])
        entrada_json = json.dumps( { 'instances': entrada_scaled_reshape.tolist() } )
        response = requests.post(ruta, data=entrada_json)
        predicciones = np.reshape(response.json()['predictions'], -1)
        salida_values = np.array([d['value'] for d in salida])
        salida_timestamps = np.array([int(d['timestamp']) for d in salida]).tolist()

        res = {'input_array': entrada_scaled_reshape,
               'outputs_timestamp': salida_timestamps,
               'outputs_values': salida_values,
               'outputs_sum' : np.sum(salida_values),
               'predictions': predicciones,
               'predictions_sum' : np.sum(predicciones),
               'results': {
                            'mae': mean_absolute_error(salida_values, predicciones),
                            'mse': mean_squared_error(salida_values, predicciones),
                            'rmse': np.sqrt(mean_squared_error(salida_values, predicciones)),
                            'smape': smape(salida_values, predicciones)
                }
        }
        
        return json.loads(json_util.dumps(res))
    else:
        return {'error': 'Parametros insuficientes'}


if __name__ == '__main__':
    app.run(host=HOST, port=PORT, debug=DEBUG)
