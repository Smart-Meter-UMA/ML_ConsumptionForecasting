import pymongo
import time
from bson.timestamp import Timestamp
from bson.objectid import ObjectId
from datetime import datetime, timezone

uri = "mongodb+srv://Yeray:yerayTFG@cluster0.zecgf.mongodb.net/SmartMeter?retryWrites=true&w=majority&ssl=true&ssl_cert_reqs=CERT_NONE"
client = pymongo.MongoClient(uri)
db = client.SmartMeter
    
# Obtenemos los datos de la colección
consumption_data = db['Consumption']

def get_consumption():
    data = consumption_data.find().sort("timestamp", 1)
    lista = []
    for d in data:
        lista.append(d)
    return lista

def get_consumption_gt_timestamp(datetimeStr):
    minDate = int(datetime.strptime(datetimeStr, "%Y-%m-%d %H:%M:%S").timestamp())
    data = consumption_data.find({"timestamp": {"$gte": minDate}}).sort("timestamp", 1)
    lista = []
    for d in data:
        lista.append(d)
    return lista

def get_consumption_between_dates(minDatetime, maxDatetime):
    minDate = int(minDatetime.timestamp())
    maxDate = int(maxDatetime.timestamp())
    data = consumption_data.find({"timestamp": {"$gte": minDate, "$lte": maxDate}}).sort("timestamp", 1)

    lista = []
    for d in data:
        lista.append(d)
    return lista

def get_min_max_timestamp():
    res = consumption_data.aggregate([ 
    { "$group": { 
        "_id": None,
        "max": { "$max": "$timestamp" }, 
        "min": { "$min": "$timestamp" } 
    }
    }
    ])

    for i in res:
        min = i['min']
        max = i['max']

    return min, max


def get_input_and_output(date_obj, input, output, tdMin, tdMax):
    minDate = int((date_obj - tdMin).timestamp())
    maxDate = int((date_obj + tdMax).timestamp())
    data = consumption_data.find({"timestamp": {"$gte": minDate + 1, "$lte": maxDate}}).sort("timestamp", 1)

    lista = []
    for d in data:
        lista.append(d)

    
    return lista[0:input], lista[input:input+output]