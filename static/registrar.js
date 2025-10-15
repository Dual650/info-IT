document.addEventListener('DOMContentLoaded', function() {

    // --- Elementos do formulário MESA / LOCAL ---
    const mesaSimNaoSelect = document.getElementById('mesa_sim_nao');
    const mesaNumeroDiv = document.getElementById('mesaNumeroDiv');
    const localDiv = document.getElementById('localDiv');
    const numeroMesaSelect = document.getElementById('numero_mesa');
    const localSelect = document.getElementById('local');

    // --- Elementos do formulário RETAGUARDA ---
    const retaguardaSimNaoSelect = document.getElementById('retaguarda_sim_nao');
    const retaguardaDestinoDiv = document.getElementById('retaguardaDestinoDiv');
    const retaguardaSetorDiv = document.getElementById('retaguardaSetorDiv');
    const retaguardaDestinoSelect = document.getElementById('retaguarda_destino');
    const retaguardaSetorSelect = document.getElementById('retaguarda_setor');

    // Função para gerenciar a visibilidade MESA/LOCAL
    function toggleMesaLocalFields() {
        if (mesaSimNaoSelect.value === 'SIM') {
            // Se SIM (Mesa de atendimento)
            mesaNumeroDiv.style.display = 'block';
            localDiv.style.display = 'none';
            // Adiciona 'required' à mesa e remove do local
            numeroMesaSelect.setAttribute('required', 'required');
            localSelect.removeAttribute('required');
        } else if (mesaSimNaoSelect.value === 'NÃO') {
            // Se NÃO (Local)
            mesaNumeroDiv.style.display = 'none';
            localDiv.style.display = 'block';
            // Adiciona 'required' ao local e remove da mesa
            localSelect.setAttribute('required', 'required');
            numeroMesaSelect.removeAttribute('required');
        } else {
            // Estado inicial ou desabilitado
            mesaNumeroDiv.style.display = 'none';
            localDiv.style.display = 'none';
            numeroMesaSelect.removeAttribute('required');
            localSelect.removeAttribute('required');
        }
    }

    // Função para gerenciar a visibilidade RETAGUARDA
    function toggleRetaguardaFields() {
        if (retaguardaSimNaoSelect.value === 'SIM') {
            // Se SIM (Destino Externo)
            retaguardaDestinoDiv.style.display = 'block';
            retaguardaSetorDiv.style.display = 'none';
            // Adiciona 'required' ao destino e remove do setor
            retaguardaDestinoSelect.setAttribute('required', 'required');
            retaguardaSetorSelect.removeAttribute('required');
        } else if (retaguardaSimNaoSelect.value === 'NÃO') {
            // Se NÃO (Setor Interno)
            retaguardaDestinoDiv.style.display = 'none';
            retaguardaSetorDiv.style.display = 'block';
            // Adiciona 'required' ao setor e remove do destino
            retaguardaSetorSelect.setAttribute('required', 'required');
            retaguardaDestinoSelect.removeAttribute('required');
        } else {
            // Estado inicial ou desabilitado
            retaguardaDestinoDiv.style.display = 'none';
            retaguardaSetorDiv.style.display = 'none';
            retaguardaDestinoSelect.removeAttribute('required');
            retaguardaSetorSelect.removeAttribute('required');
        }
    }

    // Adiciona ouvintes de eventos
    mesaSimNaoSelect.addEventListener('change', toggleMesaLocalFields);
    retaguardaSimNaoSelect.addEventListener('change', toggleRetaguardaFields);

    // Inicializa a visibilidade no carregamento da página com base nos valores selecionados (se houver)
    // Os selects são inicializados com 'NÃO' selecionado no index.html, então eles chamarão a lógica para esconder
    toggleMesaLocalFields();
    toggleRetaguardaFields();

    // --- Função para esconder o alerta flash após um tempo ---
    const alertFlash = document.querySelector('.alert-flash');
    if (alertFlash) {
        setTimeout(() => {
            alertFlash.classList.remove('show');
            alertFlash.classList.add('fade');
            // Remove o elemento do DOM após a transição de fade (opcional)
            setTimeout(() => alertFlash.remove(), 500); 
        }, 5000); // 5000 milissegundos = 5 segundos
    }

});
