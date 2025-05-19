let originalData = [];

document.getElementById('csvFile').addEventListener('change', function (e) {
    const file = e.target.files[0];
    if (file) {
        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            transformHeader: function(header) {
                return header.replace(/\u00a0/g, '').trim(); // quita espacios invisibles y comunes
            },
            complete: function(results) {
                originalData = results.data;
                llenarServicios(originalData);
                aplicarFiltros(); // Mostrar todo al inicio
            }
        });
    }
});

function llenarServicios(data) {
    const servicioSet = new Set();
    data.forEach(row => {
        const s = row["Servicio a calificar"];
        if (s && s.trim()) servicioSet.add(s.trim());
    });

    const select = document.getElementById("servicioFiltro");
    select.innerHTML = '<option value="Todos">Todos</option>';
    servicioSet.forEach(serv => {
        const option = document.createElement("option");
        option.value = serv;
        option.text = serv;
        select.appendChild(option);
    });
}

function aplicarFiltros() {
    const inicioRaw = document.getElementById("fechaInicio").value;
    const finRaw = document.getElementById("fechaFin").value;
    const servicioSeleccionado = document.getElementById("servicioFiltro").value;

    let datosFiltrados = originalData.filter(row => {
        let fechaValida = true;
        let servicioValido = true;

        const fechaTexto = row["FECHA"]?.trim();
        let fecha;
        if (fechaTexto && fechaTexto.includes("/")) {
            const [d, m, a] = fechaTexto.split("/");
            fecha = new Date(`${a}-${m}-${d}`);
        }

        if (inicioRaw) {
            const inicio = new Date(inicioRaw);
            if (!fecha || fecha < inicio) fechaValida = false;
        }

        if (finRaw) {
            const fin = new Date(finRaw);
            if (!fecha || fecha > fin) fechaValida = false;
        }

        if (servicioSeleccionado !== "Todos") {
            servicioValido = row["Servicio a calificar"]?.trim() === servicioSeleccionado;
        }

        return fechaValida && servicioValido;
    });

    graficar(datosFiltrados);
}

function graficar(data) {
    const agentes = {};
    const servicios = {};
    const tiposServicio = { "Consulta": 0, "Procedimiento": 0, "Otro": 0 };
    const fechas = [];

    data.forEach(row => {
        const agente = row["Nombre"] || "Desconocido";
        const servicioRaw = row["Servicio a calificar"]?.trim() || "Otro";
        const fechaStr = row["FECHA"]?.trim();

        if (agente) agentes[agente] = (agentes[agente] || 0) + 1;
        if (servicioRaw) servicios[servicioRaw] = (servicios[servicioRaw] || 0) + 1;

        if (/consulta/i.test(servicioRaw)) {
            tiposServicio["Consulta"]++;
        } else if (/procedimiento/i.test(servicioRaw)) {
            tiposServicio["Procedimiento"]++;
        } else {
            tiposServicio["Otro"]++;
        }

        if (fechaStr && fechaStr.includes("/")) {
            const [d, m, a] = fechaStr.split("/");
            fechas.push(new Date(`${a}-${m}-${d}`));
        }
    });

    renderChart('chart1', 'Encuestas por agente', agentes, 'bar');
    renderChart('chart2', 'Tipos de servicio exactos', servicios, 'bar');
    renderChart('chart3', 'Resumen: Consultas vs Procedimientos', tiposServicio, 'pie');
    showDateRange(fechas);
}

function renderChart(canvasId, title, dataObject, chartType) {
    const ctx = document.getElementById(canvasId).getContext('2d');
    if (window[canvasId]) window[canvasId].destroy();
    window[canvasId] = new Chart(ctx, {
        type: chartType,
        data: {
            labels: Object.keys(dataObject),
            datasets: [{
                label: title,
                data: Object.values(dataObject),
                backgroundColor: [
                    'rgba(54, 162, 235, 0.5)',
                    'rgba(255, 99, 132, 0.5)',
                    'rgba(255, 206, 86, 0.5)',
                    'rgba(75, 192, 192, 0.5)'
                ],
                borderColor: [
                    'rgba(54, 162, 235, 1)',
                    'rgba(255, 99, 132, 1)',
                    'rgba(255, 206, 86, 1)',
                    'rgba(75, 192, 192, 1)'
                ],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { display: chartType === 'pie' }
            },
            scales: chartType === 'bar' ? {
                y: { beginAtZero: true }
            } : {}
        }
    });
}

function showDateRange(fechas) {
    if (fechas.length === 0) return;
    const minDate = new Date(Math.min(...fechas));
    const maxDate = new Date(Math.max(...fechas));
    document.getElementById("date-range").innerText =
        `Rango de fechas: ${minDate.toLocaleDateString()} - ${maxDate.toLocaleDateString()}`;
}
