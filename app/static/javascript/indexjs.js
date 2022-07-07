const form = document.querySelector("#formPred");
const tipoPrediccion = document.querySelector("#selectPred");

const num_mediciones_hora = 4;
const num_mediciones_dia = num_mediciones_hora * 24;
const num_mediciones_semana = num_mediciones_dia * 7;
const num_mediciones_mes = num_mediciones_dia * 30;

const segundos_hora = 60 * 60;
const segundos_dia = segundos_hora * 24;
const segundos_semana = segundos_dia * 7;
const segundos_mes = segundos_dia * 30;

let data, data2;
let segundos_min, segundos_max, stamp_min_aux, stamp_max_aux;

let config, config2;
let myChart, myBar;
let spinner = document.getElementById('spinner');

function myFunc(vars) {
    return vars
}

function padTo2Digits(num) {
    return num.toString().padStart(2, '0');
}

function formatDate(date) {
    return (
        [
            padTo2Digits(date.getDate()),
            padTo2Digits(date.getMonth() + 1),
            date.getFullYear()
        ].join('-') +
        ' ' +
        [
            padTo2Digits(date.getHours()),
            padTo2Digits(date.getMinutes()),
            padTo2Digits(date.getSeconds()),
        ].join(':')
    );
}

tipoPrediccion.addEventListener("change", function (event) {
    let alertaInfo = document.querySelector("#alertainfo");

    switch (event.target.value) {
        case 'hour':
            segundos_min = 3 * segundos_hora - 900;
            segundos_max = segundos_hora;
            break;
        case 'day':
            segundos_min = 3 * segundos_dia - 900;
            segundos_max = segundos_dia;
            break;
        case 'week':
            segundos_min = 3 * segundos_semana - 900;
            segundos_max = segundos_semana;
            break;
        case 'month':
            segundos_min = 3 * segundos_mes - 900;
            segundos_max = segundos_mes;
            break;
    }

    stamp_min_aux = stampmin + segundos_min;
    stamp_max_aux = stampmax - segundos_max;

    datemin = new Date(stamp_min_aux * 1000);
    datemax = new Date(stamp_max_aux * 1000);
    alertaInfo.innerHTML = "INFO: La fecha seleccionada debe estar entre " + formatDate(datemin) + " y " + formatDate(datemax);
    alertaInfo.style.display = 'block';
});

form.addEventListener("submit", function (event) {
    // stop form submission
    event.preventDefault();
    spinner.style.display = 'block';
    let alerta = document.querySelector("#alerta");
    alerta.style.display = 'None';
    let circleProgress = document.querySelector("#circleProgress");
    let bloqueresultado = document.querySelector("#resultado");

    let metodo = form.elements["selectEntrada"].value;
    let tipo = form.elements["selectPred"].value;
    let fecha = form.elements["datePred"].value;
    let hora = form.elements["timePred"].value;

    let dateObj = new Date(fecha + " " + hora);
    let stamp = dateObj.getTime() / 1000;

    if (stamp < stamp_min_aux || stamp > stamp_max_aux) {
        datemin = new Date(stamp_min_aux * 1000);
        datemax = new Date(stamp_max_aux * 1000);
        alerta.innerHTML = "ERROR: La fecha seleccionada no es válida";
        alerta.style.display = 'block';
        spinner.style.display = 'none';
    } else {
        var xhttp = new XMLHttpRequest();
        xhttp.onreadystatechange = function () {
            if (this.readyState == 4 && this.status == 200) {
                var resultado = JSON.parse(xhttp.responseText);

                if (resultado.hasOwnProperty("error")) {
                    alert(resultado["error"]);
                } else {
                    fechas = []

                    for (let i = 0; i < resultado['outputs_values'].length; i++) {
                        fechas.push(formatDate(new Date(resultado['outputs_timestamp'][i] * 1000)));
                    }


                    // INICIO GRAFICO LINEAL

                    data = {
                        labels: fechas,
                        datasets: [
                            {
                                type: 'line',
                                label: 'Prediction (kWh)',
                                data: resultado['predictions'],
                                fill: false,
                                borderColor: 'rgb(51, 255, 104)',
                            },
                            {
                                type: 'line',
                                label: 'Real (kWh)',
                                data: resultado['outputs_values'],
                                fill: false,
                                borderColor: 'rgb(255, 99, 132)',
                            }
                        ]
                    };

                    config = {
                        type: 'line',
                        data: data,
                        options: {
                            scales: {
                                y: {
                                    beginAtZero: true
                                }
                            }
                        }
                    };

                    if (myChart) {
                        myChart.destroy();
                    }

                    myChart = new Chart(
                        document.getElementById('linechart'),
                        config,
                    );

                    // FIN GRAFICO LINEAL

                    // INICIO SMAPE

                    circleProgress.innerHTML = '<div class="col">\
                                                <h3>SMAPE</h2>\
                                                <div class="progress mx-auto" data-value="' + resultado['results'].smape + '">\
                                                    <span class="progress-left">\
                                                                <span class="progress-bar border-primary"></span>\
                                                    </span>\
                                                    <span class="progress-right">\
                                                                <span class="progress-bar border-primary"></span>\
                                                    </span>\
                                                    <div class="progress-value w-100 h-100 rounded-circle d-flex align-items-center justify-content-center">\
                                                    <div class="h2 font-weight-bold">' + resultado['results'].smape + '<sup class="small">%</sup></div>\
                                                    </div>\
                                                </div>\
                                            </div>';

                    $(function () {

                        $(".progress").each(function () {

                            var value = $(this).attr('data-value');
                            var left = $(this).find('.progress-left .progress-bar');
                            var right = $(this).find('.progress-right .progress-bar');

                            if (value > 0) {
                                if (value <= 50) {
                                    right.css('transform', 'rotate(' + percentageToDegrees(value) + 'deg)')
                                } else {
                                    right.css('transform', 'rotate(180deg)')
                                    left.css('transform', 'rotate(' + percentageToDegrees(value - 50) + 'deg)')
                                }
                            }

                        })

                        function percentageToDegrees(percentage) {

                            return percentage / 100 * 360

                        }

                    });

                    // FIN SMAPE

                    // INICIO MSE 

                    mse_html = '<div class="col">\
                                <h3>MSE</h2>\
                                <div class="progress mx-auto" data-value="' + resultado['results'].mse + '">\
                                    <span class="progress-left">\
                                                <span class="progress-bar border-primary"></span>\
                                    </span>\
                                    <span class="progress-right">\
                                                <span class="progress-bar border-primary"></span>\
                                    </span>\
                                    <div class="progress-value w-100 h-100 rounded-circle d-flex align-items-center justify-content-center">\
                                    <div class="h2 font-weight-bold">' + (Math.round((resultado['results'].mse + Number.EPSILON) * 100000) / 100000) + '<sup class="small"></sup></div>\
                                    </div>\
                                </div>\
                            </div>';
                    circleProgress.insertAdjacentHTML('beforeend', mse_html);

                    // FIN MSE

                    // INICIO MAE

                    mae_html = '<div class="col">\
                                <h3>MAE</h2>\
                                <div class="progress mx-auto" data-value="' + resultado['results'].mse + '">\
                                    <span class="progress-left">\
                                                <span class="progress-bar border-primary"></span>\
                                    </span>\
                                    <span class="progress-right">\
                                                <span class="progress-bar border-primary"></span>\
                                    </span>\
                                    <div class="progress-value w-100 h-100 rounded-circle d-flex align-items-center justify-content-center">\
                                    <div class="h2 font-weight-bold">' + (Math.round((resultado['results'].mae + Number.EPSILON) * 100000) / 100000) + '<sup class="small"></sup></div>\
                                    </div>\
                                </div>\
                            </div>';
                    circleProgress.insertAdjacentHTML('beforeend', mae_html);

                    // FIN MAE

                    // INICIO RMSE

                    rmse_html = '<div class="col">\
                                <h3>RMSE</h2>\
                                <div class="progress mx-auto" data-value="' + resultado['results'].mse + '">\
                                    <span class="progress-left">\
                                                <span class="progress-bar border-primary"></span>\
                                    </span>\
                                    <span class="progress-right">\
                                                <span class="progress-bar border-primary"></span>\
                                    </span>\
                                    <div class="progress-value w-100 h-100 rounded-circle d-flex align-items-center justify-content-center">\
                                    <div class="h2 font-weight-bold">' + (Math.round((resultado['results'].rmse + Number.EPSILON) * 100000) / 100000) + '<sup class="small"></sup></div>\
                                    </div>\
                                </div>\
                            </div>';
                    circleProgress.insertAdjacentHTML('beforeend', rmse_html);

                    // FIN RMSE

                    // INICIO GRAFICO DE BARRAS

                    data2 = {
                        labels: ['Real', 'Predicciones'],
                        datasets: [{
                            label: 'Comparación del consumo total (kWh)',
                            data: [resultado['outputs_sum'], resultado['predictions_sum']],
                            backgroundColor: [
                                'rgba(255, 99, 132, 0.2)',
                                'rgba(75, 192, 192, 0.2)',
                            ],
                            borderColor: [
                                'rgb(255, 99, 132)',
                                'rgb(75, 192, 192)',
                            ],
                            borderWidth: 1
                        }]
                    };

                    config2 = {
                        type: 'bar',
                        data: data2,
                        options: {
                            scales: {
                                y: {
                                    beginAtZero: true
                                }
                            }
                        },
                    };

                    if (myBar) {
                        myBar.destroy();
                    }

                    myBar = new Chart(
                        document.getElementById('barchart'),
                        config2,
                    );

                };

                // FIN GRAFICO DE BARRAS
                spinner.style.display = 'none';
            };
        }
        xhttp.open("GET", "/api/predicciones?" + "metodo=" + metodo + "&tipo=" + tipo + "&fecha=" + fecha + "&hora=" + hora, true);
        xhttp.send();
    }
});