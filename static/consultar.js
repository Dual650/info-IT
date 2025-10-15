// --- Variáveis de estado e elementos DOM ---
const corpoTabela = document.getElementById('corpoTabela');
const tabelaRegistros = document.getElementById('tabelaRegistros');
const avisoVazio = document.getElementById('avisoVazio');
const btnExportar = document.getElementById('btnExportar');

// Elementos dos filtros 
const filtroPosto = document.getElementById('filtroPosto');
const filtroData = document.getElementById('filtroData');
const filtroColeta = document.getElementById('filtroColeta');

// Elementos das Modals
const modalVisualizacao = document.getElementById('modalVisualizacao');
const modalEdicao = document.getElementById('modalEdicao');
const formEditarProcedimento = document.getElementById('formEditarProcedimento');


// --- Funções de Utilitário ---

/**
 * Exibe uma mensagem flash manual (imita o comportamento do Flask)
 */
function showFlashMessage(message, category) {
    const container = document.querySelector('.container-formal');
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${category} alert-dismissible fade show alert-flash`;
    alertDiv.setAttribute('role', 'alert');
    alertDiv.innerHTML = `${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>`;
    
    container.insertBefore(alertDiv, container.firstChild);
    
    setTimeout(() => {
        // Tenta fechar usando a API do Bootstrap
        const bsAlert = bootstrap.Alert.getInstance(alertDiv) || new bootstrap.Alert(alertDiv);
        bsAlert.close();
    }, 5000);
}


// --- Funções de Filtro e Aplicação ---

/**
 * Constrói a URL de consulta com base nos filtros atuais e carrega os dados.
 */
function aplicarFiltros() {
    const posto = filtroPosto.value === 'Todos' ? '' : filtroPosto.value;
    const data = filtroData.value;
    const coleta = filtroColeta.value === 'Todos' ? '' : filtroColeta.value;

    // Atualiza a URL do navegador com os filtros para persistência
    const newUrl = new URL(window.location.pathname, window.location.origin);
    
    if (posto) newUrl.searchParams.set('posto', posto); else newUrl.searchParams.delete('posto');
    if (data) newUrl.searchParams.set('data', data); else newUrl.searchParams.delete('data');
    if (coleta) newUrl.searchParams.set('coleta', coleta); else newUrl.searchParams.delete('coleta');
    
    // Atualiza o histórico do navegador e carrega os dados
    window.history.pushState({}, '', newUrl);
    carregarRegistros();
}

/**
 * Limpa todos os campos de filtro e recarrega a tabela.
 */
function limparFiltros() {
    filtroPosto.value = 'Todos';
    filtroData.value = '';
    filtroColeta.value = 'Todos';
    
    // Limpa a URL e recarrega
    const newUrl = new URL(window.location.pathname, window.location.origin);
    window.history.pushState({}, '', newUrl);
    carregarRegistros();
}

/**
 * Carrega os registros do servidor via AJAX e preenche a tabela.
 */
async function carregarRegistros() {
    corpoTabela.innerHTML = ''; // Limpa a tabela antes de carregar
    
    const searchParams = new URLSearchParams(window.location.search);
    const apiUrl = `/registros_json?${searchParams.toString()}`;
    
    // Atualiza o link de exportação para refletir os filtros atuais
    btnExportar.href = `/exportar?${searchParams.toString()}`;

    try {
        const response = await fetch(apiUrl);
        if (!response.ok) {
            throw new Error(`Erro ao carregar dados: ${response.statusText}`);
        }
        const registros = await response.json();
        
        if (registros.length === 0) {
            tabelaRegistros.style.display = 'none';
            avisoVazio.style.display = 'block';
        } else {
            tabelaRegistros.style.display = 'table';
            avisoVazio.style.display = 'none';
            
            registros.forEach(registro => {
                const row = corpoTabela.insertRow();
                // O campo retaguarda_display já traz o SIM/NÃO e o destino
                row.innerHTML = `
                    <td>${registro.posto}</td>
                    <td>${registro.data}</td>
                    <td>${registro.numero_mesa} (${registro.computador_coleta})</td>
                    <td>${registro.retaguarda_display}</td>
                    <td>${registro.hora_inicio}</td>
                    <td>${registro.hora_termino || '-'}</td>
                    <td>
                        <span class="procedimento-resumo" data-bs-toggle="tooltip" title="${registro.procedimento_completo}">
                            ${registro.procedimento_resumo}
                        </span>
                    </td>
                    <td class="acoes-cell">
                        <button class="btn btn-info btn-sm icon-action" onclick="abrirModalVisualizacao(${registro.id}, this)" title="Visualizar/Apagar">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="btn btn-warning btn-sm icon-action" onclick="abrirModalEdicao(${registro.id}, '${registro.procedimento_completo.replace(/'/g, "\\'")}')" title="Editar">
                            <i class="fas fa-pen"></i>
                        </button>
                    </td>
                `;
            });

            // Inicializa tooltips do Bootstrap
            const tooltipTriggerList = document.querySelectorAll('[data-bs-toggle="tooltip"]')
            const tooltipList = [...tooltipTriggerList].map(tooltipTriggerEl => new bootstrap.Tooltip(tooltipTriggerEl))
        }

    } catch (error) {
        console.error('Erro ao carregar os registros:', error);
        showFlashMessage('Erro ao conectar ou carregar os dados do servidor.', 'danger');
    }
}

// --- Funções da Modal de Visualização (Detalhes e Apagar) ---

/**
 * Abre a modal de visualização e preenche com os dados do registro.
 */
function abrirModalVisualizacao(id, element) {
    const row = element.closest('tr'); // Encontra a linha da tabela
    const cells = row.querySelectorAll('td');

    // Mapeamento dos dados para a modal
    const mesa_coleta_split = cells[2].textContent.match(/(.*) \((.*)\)/); // Ex: Mesa (Coleta)
    const retaguarda_split = cells[3].textContent.match(/(SIM|NÃO)(?: \((.*)\))?/); // Ex: SIM (Destino)

    document.getElementById('modalPosto').textContent = cells[0].textContent;
    document.getElementById('modalData').textContent = cells[1].textContent;
    
    document.getElementById('modalMesa').textContent = mesa_coleta_split ? mesa_coleta_split[1] : cells[2].textContent;
    document.getElementById('modalColeta').textContent = mesa_coleta_split ? mesa_coleta_split[2] : 'NÃO';

    document.getElementById('modalRetaguarda').textContent = retaguarda_split[0];
    
    document.getElementById('modalHoraInicio').textContent = cells[4].textContent;
    document.getElementById('modalHoraTermino').textContent = cells[5].textContent;
    
    const procedimentoCompleto = row.querySelector('.procedimento-resumo').title;
    document.getElementById('modalProcedimentoContent').textContent = procedimentoCompleto;

    // Atualiza o formulário de exclusão individual
    const formApagar = document.getElementById('formApagarIndividual');
    formApagar.action = `/apagar/${id}`;
    
    modalVisualizacao.style.display = 'block';
}

/**
 * Função que lida com o envio do formulário de exclusão individual.
 */
function handleApagarRegistro(event, form) {
    event.preventDefault(); 
    
    if (window.confirm('Tem certeza que deseja apagar este registro? Esta ação é irreversível.')) {
        form.submit();
    }
    return false;
}

// --- Funções da Modal de Edição ---

/**
 * Abre a modal de edição.
 */
function abrirModalEdicao(id, procedimento) {
    document.getElementById('editProcedimento').value = procedimento;
    formEditarProcedimento.action = `/editar_procedimento/${id}`;
    modalEdicao.style.display = 'block';
}

// Escutador para submissão do formulário de edição (AJAX)
formEditarProcedimento.addEventListener('submit', async function(event) {
    event.preventDefault();
    
    const novoProcedimento = document.getElementById('editProcedimento').value;
    const actionUrl = this.action;

    try {
        const response = await fetch(actionUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ procedimento_completo: novoProcedimento })
        });
        
        const result = await response.json();
        
        if (result.success) {
            showFlashMessage('Procedimento atualizado com sucesso!', 'success');
            modalEdicao.style.display = 'none';
            carregarRegistros(); // Recarrega a tabela para mostrar o item atualizado
        } else {
            showFlashMessage(result.message || 'Erro desconhecido ao atualizar.', 'danger');
        }

    } catch (error) {
        console.error('Erro de rede/servidor durante a edição:', error);
        showFlashMessage('Erro de comunicação com o servidor. Tente novamente.', 'danger');
    }
});


// --- Inicialização ---

document.addEventListener('DOMContentLoaded', () => {
    // Carrega a tabela assim que a página estiver pronta
    carregarRegistros();

    // Define os handlers para fechar modais ao clicar fora
    window.onclick = function(event) {
        if (event.target == modalVisualizacao) {
            modalVisualizacao.style.display = "none";
        }
        if (event.target == modalEdicao) {
            modalEdicao.style.display = "none";
        }
        if (event.target == document.getElementById('modalApagarTudo')) {
            document.getElementById('modalApagarTudo').style.display = "none";
        }
    }
});
