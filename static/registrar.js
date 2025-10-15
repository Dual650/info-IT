// static/registrar.js

document.addEventListener('DOMContentLoaded', function() {
    
    // ===========================================
    // LÓGICA 1: RETAGUARDA (DESTINO / SETOR)
    // ===========================================

    // Função para exibir/ocultar o campo Destino (Órgão) OU o campo Setor Interno
    function toggleRetaguardaDestinoSetor() {
        var selectRetaguarda = document.getElementById('retaguarda_sim_nao');
        
        // Elementos SIM (Destino/Órgão)
        var divDestino = document.getElementById('retaguardaDestinoDiv');
        var selectDestino = document.getElementById('retaguarda_destino');
        
        // Elementos NÃO (Setor Interno)
        var divSetor = document.getElementById('retaguardaSetorDiv');
        var selectSetor = document.getElementById('retaguarda_setor');

        if (selectRetaguarda.value === 'SIM') {
            // Se SIM: Mostra Destino (Órgão), Oculta Setor
            divDestino.style.display = 'block';
            selectDestino.setAttribute('required', 'required');
            
            divSetor.style.display = 'none';
            selectSetor.removeAttribute('required');
            selectSetor.value = ''; // Reset
            
        } else if (selectRetaguarda.value === 'NÃO') {
            // Se NÃO: Oculta Destino (Órgão), Mostra Setor Interno
            divDestino.style.display = 'none';
            selectDestino.removeAttribute('required');
            selectDestino.value = ''; // Reset
            
            divSetor.style.display = 'block';
            selectSetor.setAttribute('required', 'required');
        } 
        // Não há necessidade de 'else' (Seleção Vazia), pois o Flask exige um valor padrão
    }
    
    // Inicialização da Retaguarda
    const selectRetaguardaSimNao = document.getElementById('retaguarda_sim_nao');
    if (selectRetaguardaSimNao) {
        selectRetaguardaSimNao.addEventListener('change', toggleRetaguardaDestinoSetor);
        toggleRetaguardaDestinoSetor(); // Chama no carregamento para definir o estado inicial
    }


    // ===========================================
    // LÓGICA 2: MESA DE ATENDIMENTO / LOCAL
    // ===========================================
    
    // Função para exibir o campo Número da Mesa ou o campo Local
    function toggleMesaLocal() {
        const selectMesaSimNao = document.getElementById('mesa_sim_nao');
        const mesaNumeroDiv = document.getElementById('mesaNumeroDiv');
        const localDiv = document.getElementById('localDiv');
        const selectNumeroMesa = document.getElementById('numero_mesa');
        const selectLocal = document.getElementById('local');

        if (selectMesaSimNao.value === 'SIM') {
            // Se SIM: Mostra Número da Mesa, Oculta Local
            mesaNumeroDiv.style.display = 'block';
            localDiv.style.display = 'none';
            
            // Requer o campo visível, desobriga e reseta o campo oculto
            selectNumeroMesa.setAttribute('required', 'required');
            selectLocal.removeAttribute('required');
            selectLocal.value = ''; 

        } else if (selectMesaSimNao.value === 'NÃO') {
            // Se NÃO: Oculta Número da Mesa, Mostra Local
            mesaNumeroDiv.style.display = 'none';
            localDiv.style.display = 'block';
            
            // Requer o campo visível, desobriga e reseta o campo oculto
            selectLocal.setAttribute('required', 'required');
            selectNumeroMesa.removeAttribute('required');
            selectNumeroMesa.value = ''; 
            
        } else {
            // Estado inicial/Seleção Vazia: Oculta ambos
            mesaNumeroDiv.style.display = 'none';
            localDiv.style.display = 'none';
            selectNumeroMesa.removeAttribute('required');
            selectLocal.removeAttribute('required');
            selectNumeroMesa.value = ''; 
            selectLocal.value = ''; 
        }
    }

    // Inicialização da Mesa/Local
    const selectMesaSimNao = document.getElementById('mesa_sim_nao');
    if (selectMesaSimNao) {
        selectMesaSimNao.addEventListener('change', toggleMesaLocal);
        toggleMesaLocal(); // Chama no carregamento
    }
    
    
    // ===========================================
    // LÓGICA 3: FLASH MESSAGES (Para o caso de o JS ser o único arquivo extra)
    // ===========================================

    // Lógica para fechar as Flash Messages automaticamente 
    const flashAlerts = document.querySelectorAll('.alert-flash');
    flashAlerts.forEach(alert => {
        if (typeof bootstrap !== 'undefined' && bootstrap.Alert) {
            setTimeout(() => {
                const bsAlert = bootstrap.Alert.getInstance(alert) || new bootstrap.Alert(alert);
                bsAlert.close();
            }, 5000); 
        }
    });
});
