// static/registrar.js

document.addEventListener('DOMContentLoaded', function() {
    // 1. Função para exibir/ocultar o campo de destino da Retaguarda
    function toggleRetaguardaDestino() {
        var selectRetaguarda = document.getElementById('retaguarda_sim_nao');
        var divDestino = document.getElementById('retaguardaDestinoDiv');
        var selectDestino = document.getElementById('retaguarda_destino');

        if (selectRetaguarda.value === 'SIM') {
            divDestino.style.display = 'block';
            selectDestino.setAttribute('required', 'required');
        } else {
            divDestino.style.display = 'none';
            selectDestino.removeAttribute('required');
            selectDestino.value = ''; 
        }
    }
    
    // 2. Chama a função no carregamento inicial para o estado correto
    toggleRetaguardaDestino();

    // 3. Adiciona o listener de mudança ao select
    const selectRetaguardaSimNao = document.getElementById('retaguarda_sim_nao');
    if (selectRetaguardaSimNao) {
        selectRetaguardaSimNao.addEventListener('change', toggleRetaguardaDestino);
    }


    // 4. Lógica para fechar as Flash Messages automaticamente (assumindo Bootstrap JS está carregado)
    const flashAlerts = document.querySelectorAll('.alert-flash');
    flashAlerts.forEach(alert => {
        // Verifica se a classe 'bootstrap' está disponível
        if (typeof bootstrap !== 'undefined' && bootstrap.Alert) {
            setTimeout(() => {
                const bsAlert = bootstrap.Alert.getInstance(alert) || new bootstrap.Alert(alert);
                bsAlert.close();
            }, 5000); 
        }
    });
});
