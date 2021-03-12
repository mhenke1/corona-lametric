const express = require('express');
const app = express();
const Promise = require('bluebird');
const needle = require('needle');
const csv = require('csv-parser')
const NodeCache = require('node-cache');
const dataCache = new NodeCache({stdTTL: 3600, checkperiod: 7200});

function getData() {
    return new Promise((resolve, reject) => {
        const results = [];
        const frames = [];

        needle
            .get('https://pavelmayer.de/covid/risks/all-series.csv')
            .pipe(csv())
            .on('data', (data) => results.push(data))
            .on('end', () => {
                filteredResults = results.filter(function (ort) {
                    if (ort.Landkreis.includes("Reutlingen") ||
                        ort.Landkreis.includes("Hildesheim") ||
                        ort.Landkreis.includes("Köln")) {
                        return true;
                    }
                    return false;
                }).map(function (ort) {
                    ort.Landkreis = ort.Landkreis.split(" ")[1];
                    if (ort.Landkreis == "Hildesheim") {
                        ort.Landkreis = "HI"
                    }
                    if (ort.Landkreis == "Köln") {
                        ort.Landkreis = "K"
                    }
                    if (ort.Landkreis == "Reutlingen") {
                        ort.Landkreis = "RT"
                    }
                    return ort;
                }).map(function (ort) {
                    ortsname = ort.Landkreis;
                    risiko = Math.round(parseFloat(ort.Kontaktrisiko));
                    faelle = Math.round(parseFloat(ort.FaellePro100kLetzte7Tage));
                    frame = {
                        'text': ortsname + ' 1:' + risiko + ' ' + faelle,
                        'icon': 'a35937',
                    }
                    frames.push(frame);
                });
                resolve({ 'frames': frames });
            });
    })
};


app.get('/data', function (request, response) {
    if (dataCache.get('data')) {
        response.send(dataCache.get('data'));
      }
      else {
        getData()
            .then((result) => {
                dataCache.set('data', result);
                response.json(result);
            })
            .catch((error) =>
                response.json(
                    {
                        'frames': [
                            {
                                'text': 'Error',
                                'icon': 'a6175',
                                'index': 0,
                            },
                        ],
                    }));
                };
});

// load local VCAP configuration  and service credentials
let vcapLocal;
try {
    vcapLocal = require('./vcap-local.json');
    console.log('Loaded local VCAP', vcapLocal);
}
catch (e) { }

let port = process.env.PORT || 3000;
app.listen(port, function () {
    console.log('To view your app, open this link in your browser: http://localhost:' + port);
});
