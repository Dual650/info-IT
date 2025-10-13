$(document).ready(function() {
    
    // Função para carregar e renderizar os dados (MANTIDA no HTML ou pode ser movida se preferir)
    // Para simplificar a transferência, vamos garantir que a função 'carregarRegistros' 
    // está disponível ou recriá-la aqui se necessário. 
    // **Nota:** A função 'carregarRegistros' usa as rotas url_for do Flask, então ela 
    // deve ser reescrita para aceitar os URLs como parâmetros ou usar os atributos data-url.
    // Para esta demonstração, a lógica de carregamento via `$.getJSON` **permanecerá** no 
    // `consultar.html` para aproveitar o `url_for` e a renderização do Jinja, mas as 
    // interações (Modal e Exclusão) serão movidas.

    // ===============================================
    // Lógica do MODAL para visualização do procedimento
    // ===============================================
    const modal = $('#procedimentoModal');
    const closeBtn = $('.close-button');
    const modalTexto = $('#modalProcedimentoTexto');
    const modalId = $('#modalRegistroId');

    // 1. Abre o modal ao clicar em qualquer linha da tabela
    // Usamos $(document).on para garantir que funciona em linhas carregadas via AJAX
    $(document).on('click', '#tabelaRegistros tbody tr', function(e) {
        // Previne abrir modal se o clique foi no botão de ação/exclusão
        if ($(e.target).closest('form, button').length) {
            return; 
        }
        
        // Pega os dados armazenados na linha (data-procedimento)
        const procedimentoCompleto = $(this).data('procedimento');
        const registroId = $(this).find('td:first').text(); 
        
        modalTexto.text(procedimentoCompleto);
        modalId.text(registroId);
        modal.css('display', 'block');
    });

    // 2. Fecha o modal
    closeBtn.on('click', function() {
        modal.css('display', 'none');
    });
    $(window).on('click', function(event) {
        if ($(event.target).is(modal)) {
            modal.css('display', 'none');
        }
    });

    // ===============================================
    // Lógica para APAGAR TODOS os Registros (CRÍTICO)
    // ===============================================
    $('#formApagarTudo').submit(function(e) {
        e.preventDefault(); // Impede o envio imediato
        
        const confirmacao = confirm(
            "🚨 ATENÇÃO: Você tem certeza que deseja APAGAR TODOS os registros do banco de dados?\n\n" +
            "ESTA AÇÃO É IRREVERSÍVEL! TODOS OS DADOS SERÃO PERDIDOS."
        );

        if (confirmacao) {
            // Se o usuário confirmar, permite o envio do formulário
            this.submit();
        }
    });

});
