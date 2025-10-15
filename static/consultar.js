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
    
    // Auto-fechar o alerta
    if (typeof bootstrap !== 'undefined' && bootstrap.Alert) {
        setTimeout(() => {
            const bsAlert = bootstrap.Alert.getInstance(alertDiv) || new bootstrap.Alert(alertDiv);
            bsAlert.close();
        }, 5000); 
    }
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
                // Adiciona um atributo de dados com o ID do registro para referência
                row.setAttribute('data-id', registro.id); 
                
                row.innerHTML = `
                    <td>${registro.posto}</td> <td>${registro.data}</td> <td>${registro.mesa_display}</td> <td>${registro.retaguarda_display}</td> <td>${registro.hora_inicio}</td> <td>${registro.hora_termino || '-'}</td> <td class="procedimento-resumo-cell">
                        <span class="procedimento-resumo" 
                              data-bs-toggle="tooltip" 
                              title="${registro.procedimento_completo}"
                              data-procedimento-completo="${registro.procedimento_completo.replace(/"/g, '&quot;')}"
                              >
                            ${registro.procedimento_resumo}
                        </span>
                    </td>
                    <td class="acoes-cell">
                        <button class="btn btn-warning btn-sm icon-action" 
                                onclick="abrirModalEdicao(${registro.id}, this)" 
                                title="Editar Procedimento"
                                >
                            <i class="fas fa-pen"></i>
                        </button>
                        <button class="btn btn-info btn-sm icon-action ms-1" 
                                onclick="abrirModalVisualizacao(${registro.id}, this)" 
                                title="Visualizar Detalhes/Apagar"
                                >
                            <i class="fas fa-eye"></i>
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

// --- Funções das Modals ---

/**
 * Abre a modal de visualização e preenche com os dados do registro.
 */
function abrirModalVisualizacao(id, element) {
    const row = element.closest('tr'); // Encontra a linha da tabela
    const procedimentoSpan = row.querySelector('.procedimento-resumo');
    
    // 1. Coleta dados da linha
    const posto = row.cells[0].textContent;
    const data = row.cells[1].textContent;
    const mesaDisplay = row.cells[2].textContent;
    const retaguardaDisplay = row.cells[3].textContent;
    const horaInicio = row.cells[4].textContent;
    const horaTermino = row.cells[5].textContent;
    const procedimentoCompleto = procedimentoSpan.getAttribute('data-procedimento-completo');

    // Tenta extrair Coleta? para a Modal de Visualização (Não está na coluna principal)
    let coletaSimNao = 'NÃO';
    if (mesaDisplay.includes('Coleta de imagem')) {
        coletaSimNao = 'SIM';
    } else if (mesaDisplay.includes('Mesa')) {
        // Se for Mesa, mas não for Coleta de Imagem, Coleta é NÂO
        coletaSimNao = 'NÃO';
    }


    // 2. Preenche a modal
    document.getElementById('modalPosto').textContent = posto;
    document.getElementById('modalData').textContent = data;
    document.getElementById('modalMesaDisplay').textContent = mesaDisplay; 
    document.getElementById('modalRetaguardaDisplay').textContent = retaguardaDisplay; 
    document.getElementById('modalColeta').textContent = coletaSimNao;
    document.getElementById('modalHoraInicio').textContent = horaInicio;
    document.getElementById('modalHoraTermino').textContent = horaTermino;
    document.getElementById('modalProcedimentoContent').textContent = procedimentoCompleto;

    // 3. Atualiza o formulário de exclusão individual (inclui filtros para redirecionamento)
    const formApagar = document.getElementById('formApagarIndividual');
    formApagar.action = `/apagar/${id}?posto=${filtroPosto.value}&data=${filtroData.value}&coleta=${filtroColeta.value}`;

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

/**
 * Abre a modal de edição, buscando o procedimento completo na linha da tabela.
 */
function abrirModalEdicao(id, element) {
    const row = element.closest('tr');
    const procedimentoSpan = row.querySelector('.procedimento-resumo');
    
    // Pega o procedimento completo do atributo de dados
    const procedimentoCompleto = procedimentoSpan.getAttribute('data-procedimento-completo'); 

    document.getElementById('editProcedimento').value = procedimentoCompleto;
    
    // O ID é necessário no handler de submissão do formulário
    formEditarProcedimento.setAttribute('data-registro-id', id); 
    
    modalEdicao.style.display = 'block';
}

// Escutador para submissão do formulário de edição (AJAX)
formEditarProcedimento.addEventListener('submit', async function(event) {
    event.preventDefault();
    
    const novoProcedimento = document.getElementById('editProcedimento').value;
    const registroId = this.getAttribute('data-registro-id');
    const actionUrl = `/editar_procedimento/${registroId}`;

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

            // --- ATUALIZA A LINHA DA TABELA (7ª COLUNA) SEM RECARREGAR TUDO ---
            const row = corpoTabela.querySelector(`tr[data-id="${registroId}"]`);
            if (row) {
                const resumoSpan = row.querySelector('.procedimento-resumo');
                
                // 1. Atualiza o resumo visível
                resumoSpan.textContent = result.novo_resumo;
                
                // 2. Atualiza os atributos de dados (tooltip e completo)
                resumoSpan.title = novoProcedimento;
                resumoSpan.setAttribute('data-procedimento-completo', novoProcedimento);

                // Re-inicializa o tooltip se necessário (depende da versão do Bootstrap)
                if (typeof bootstrap !== 'undefined' && bootstrap.Tooltip) {
                    const tooltipInstance = bootstrap.Tooltip.getInstance(resumoSpan);
                    if (tooltipInstance) {
                        tooltipInstance.dispose(); // Remove o antigo
                    }
                    new bootstrap.Tooltip(resumoSpan); // Cria o novo
                }
            }
            // -------------------------------------------------------------------

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
