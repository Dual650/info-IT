// Acessa as URLs globais definidas no consultar.html
const JSON_URL = URLS.registrosJson;
const DELETE_BASE_URL = URLS.apagarRegistro;
const EXPORT_BASE_URL = URLS.exportarRegistros;

/**
 * Carrega os registros via AJAX com base nos filtros e popula a tabela.
 */
function carregarRegistros() {
    const posto = $('#posto').val();
    const data = $('#data').val();
    const coleta = $('#coleta').val();
    const $tbody = $('#tabelaRegistros tbody');
    const $avisoVazio = $('#avisoVazio');

    $tbody.empty();
    $avisoVazio.hide();
    $('#tabelaRegistros').show();
    
    // Constrói os parâmetros da query para o JSON e Exportação
    const queryParams = `posto=${posto}&data=${data}&coleta=${coleta}`;
    
    // Atualiza o link de exportação
    $('#btnExportar').attr('href', `${EXPORT_BASE_URL}?${queryParams}`);

    $.getJSON(`${JSON_URL}?${queryParams}`, function(registros) {
        if (registros.length === 0) {
            $avisoVazio.show();
            $('#tabelaRegistros').hide();
            return;
        }

        $.each(registros, function(i, registro) {
            const coletaClass = registro.computador_coleta === 'SIM' ? 'coleta-negrito' : '';
            
            // Cria o URL de exclusão individual
            const deleteUrl = DELETE_BASE_URL + registro.id;
            
            // Monta o formulário de exclusão individual
            const deleteForm = `
                <form method="POST" action="${deleteUrl}" onsubmit="return confirm('Tem certeza que deseja apagar o Registro ${registro.id}?');" style="display:inline;">
                    <button type="submit" class="btn-acao btn-danger-individual" title="Apagar Registro Individual">
                        <i class="fas fa-times"></i>
                    </button>
                </form>
            `;
            
            const row = $(`
                <tr data-procedimento="${registro.procedimento_completo.replace(/"/g, '&quot;')}" data-registro-id="${registro.id}">
                    <td>${registro.id}</td>
                    <td>${registro.posto}</td>
                    <td class="${coletaClass}">${registro.computador_coleta}</td>
                    <td>${registro.data}</td>
                    <td>${registro.hora_inicio}</td>
                    <td>${registro.hora_termino}</td>
                    <td class="procedimento-resumo">${registro.procedimento_resumo}</td>
                    <td>${deleteForm}</td>
                </tr>
            `);
            $tbody.append(row);
        });
    }).fail(function() {
        alert("Erro ao carregar os dados.");
    });
}


$(document).ready(function() {
    
    // 1. Carrega os registros ao iniciar a página
    carregarRegistros();
    
    // 2. Adiciona o evento de clique ao botão de filtro 
    $('#btnFiltrar').on('click', function() {
        // Redireciona para a rota /consultar com os parâmetros de filtro (recarga completa da página)
        const posto = $('#posto').val();
        const data = $('#data').val();
        const coleta = $('#coleta').val();
        window.location.href = `/consultar?posto=${posto}&data=${data}&coleta=${coleta}`;
    });


    // ===============================================
    // Lógica do MODAL para visualização do procedimento
    // (Esta lógica é a mesma que você já tinha)
    // ===============================================
    const modal = $('#procedimentoModal');
    const closeBtn = $('.close-button');
    const modalTexto = $('#modalProcedimentoTexto');
    const modalId = $('#modalRegistroId');

    // Abre o modal ao clicar em qualquer linha da tabela (delegação de evento)
    $(document).on('click', '#tabelaRegistros tbody tr', function(e) {
        if ($(e.target).closest('form, button').length) {
            return; 
        }
        
        const procedimentoCompleto = $(this).data('procedimento');
        const registroId = $(this).find('td:first').text(); 
        
        modalTexto.text(procedimentoCompleto);
        modalId.text(registroId);
        modal.css('display', 'block');
    });

    // Fecha o modal
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
    // (Esta lógica é a mesma que você já tinha)
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
