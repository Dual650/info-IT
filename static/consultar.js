document.addEventListener('DOMContentLoaded', function() {
    // 1. URL da API para buscar os dados (inclui os parâmetros de filtro da URL atual)
    const urlParams = new URLSearchParams(window.location.search);
    const queryString = urlParams.toString();
    const apiUrl = `/registros_json?${queryString}`;
    
    // 2. Elementos DOM
    const corpoTabela = document.getElementById('corpoTabela');
    const avisoVazio = document.getElementById('avisoVazio');
    const modalVisualizacao = document.getElementById('modalProcedimento');
    const modalEdicao = document.getElementById('modalEdicao'); 

    // Referências do Modal de Edição
    const editIdDisplay = document.getElementById('editIdDisplay');
    const editIdHidden = document.getElementById('editIdHidden');
    const editProcedimento = document.getElementById('editProcedimento');
    const formEditarProcedimento = document.getElementById('formEditarProcedimento');
    
    // Referências do Modal de Visualização
    const modalTitulo = document.getElementById('modalTitulo');
    const modalPosto = document.getElementById('modalPosto');
    const modalMesa = document.getElementById('modalMesa');
    const modalRetaguarda = document.getElementById('modalRetaguarda');
    const modalColeta = document.getElementById('modalColeta');
    const modalData = document.getElementById('modalData');
    const modalHoraInicio = document.getElementById('modalHoraInicio');
    const modalHoraTermino = document.getElementById('modalHoraTermino');
    const modalContent = document.getElementById('modalProcedimentoContent');
    const formApagarIndividual = document.getElementById('formApagarIndividual');
    const btnExportar = document.getElementById('btnExportar');

    // 3. Atualizar link de exportação com os filtros atuais
    btnExportar.href = `/exportar?${queryString}`;
    
    // 4. Função para abrir o Modal de Edição
    window.editarProcedimento = function(registroId, procedimentoAtual) {
        // Preenche os campos do modal de edição
        editIdDisplay.textContent = registroId;
        editIdHidden.value = registroId;
        editProcedimento.value = procedimentoAtual;
        
        // Define a URL de ação do formulário 
        formEditarProcedimento.action = `/editar_procedimento/${registroId}`;
        
        // Exibe o modal
        modalEdicao.style.display = 'block';
    }

    // 5. Adicionar listener para submissão do formulário de edição (AJAX)
    formEditarProcedimento.addEventListener('submit', function(e) {
        e.preventDefault(); // Impede o envio tradicional do formulário
        
        const registroId = editIdHidden.value;
        const novoProcedimento = editProcedimento.value;
        
        // ATENÇÃO: A URL DEVE SER IMPLEMENTADA NO FLASK
        fetch(`/editar_procedimento/${registroId}`, {
            method: 'POST', 
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
                'procedimento_completo': novoProcedimento 
            })
        })
        .then(response => {
            if (response.ok) {
                // Se a atualização for bem-sucedida
                document.getElementById('modalEdicao').style.display = 'none'; // Fecha o modal
                alert('Ação realizada atualizada com sucesso!');
                carregarRegistros(); // Recarrega a tabela para mostrar a alteração
            } else {
                alert('Erro ao atualizar. Verifique a conexão e o servidor.');
            }
        })
        .catch(error => {
            console.error('Erro de rede:', error);
            alert('Erro de conexão ao tentar atualizar o registro.');
        });
    });


    // 6. Função para carregar e renderizar os dados
    function carregarRegistros() {
        fetch(apiUrl)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`Erro HTTP: ${response.status}`);
                }
                return response.json();
            })
            .then(registros => {
                corpoTabela.innerHTML = ''; 

                if (registros.length === 0) {
                    avisoVazio.style.display = 'block';
                    document.getElementById('tabelaRegistros').style.display = 'none';
                    return;
                }

                avisoVazio.style.display = 'none';
                document.getElementById('tabelaRegistros').style.display = 'table';

                registros.forEach(registro => {
                    const row = corpoTabela.insertRow();
                    
                    const coletaSimNao = registro.computador_coleta === 'SIM';
                    const coletaCellClass = coletaSimNao ? 'fundo-sim' : 'fundo-nao';
                    const retaguardaCellClass = ''; 
                    
                    // Escapar as aspas simples e duplas do procedimento para usar no parâmetro da função JS
                    const procedimentoEscapado = registro.procedimento_completo
                        .replace(/'/g, "\\'")
                        .replace(/"/g, '\\"');
                    
                    row.innerHTML = `
                        <td>${registro.posto}</td>
                        <td>${registro.numero_mesa}</td>
                        <td class="${retaguardaCellClass}">${registro.retaguarda_display}</td>
                        <td class="${coletaCellClass}">${registro.computador_coleta}</td>
                        <td>${registro.data}</td>
                        <td>${registro.hora_inicio}</td>
                        <td>${registro.hora_termino}</td>
                        <td class="procedimento-resumo" title="${registro.procedimento_completo}">${registro.procedimento_resumo}</td>
                        <td class="acoes-cell">
                            <button type="button" class="btn-acao btn-edit" title="Editar Ação Realizada" onclick="event.stopPropagation(); editarProcedimento(${registro.id}, '${procedimentoEscapado}');">
                                <i class="fas fa-edit"></i>
                            </button>
                            
                            <form method="POST" action="/apagar/${registro.id}" style="display:inline;" onsubmit="return confirm('Tem certeza que deseja apagar o registro ID ${registro.id}?');">
                                <button type="submit" class="btn-acao btn-danger-individual" title="Apagar registro individual" onclick="event.stopPropagation();">
                                    <i class="fas fa-trash-alt"></i>
                                </button>
                            </form>
                        </td>
                    `;
                    
                    // Adicionar evento de clique na linha para abrir o modal de VISUALIZAÇÃO
                    row.addEventListener('click', function(event) {
                        // Verifica se o clique não foi em um botão de ação
                        if (!event.target.closest('.btn-acao')) {
                            abrirModalVisualizacao(registro);
                        }
                    });
                });
            })
            .catch(error => {
                console.error('Erro ao buscar registros:', error);
                corpoTabela.innerHTML = `<tr><td colspan="9">Erro ao carregar dados. Tente recarregar a página.</td></tr>`;
                avisoVazio.style.display = 'none';
                document.getElementById('tabelaRegistros').style.display = 'table';
            });
    }

    // 7. Função para abrir o Modal de Visualização
    function abrirModalVisualizacao(registro) {
        modalTitulo.textContent = `Detalhes do Registro`; 
        modalPosto.textContent = registro.posto;
        modalMesa.textContent = registro.numero_mesa;
        modalRetaguarda.textContent = registro.retaguarda_display;
        modalColeta.textContent = registro.computador_coleta;
        modalData.textContent = registro.data;
        modalHoraInicio.textContent = registro.hora_inicio;
        modalHoraTermino.textContent = registro.hora_termino;
        modalContent.textContent = registro.procedimento_completo;
        
        formApagarIndividual.action = `/apagar/${registro.id}`;
        
        modalVisualizacao.style.display = 'block';
    }

    // 8. Fechar modal ao clicar fora dele
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

    // Inicia o carregamento dos registros
    carregarRegistros();
});
