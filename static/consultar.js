document.addEventListener('DOMContentLoaded', function() {
    // 1. URL da API para buscar os dados (inclui os parâmetros de filtro da URL atual)
    const urlParams = new URLSearchParams(window.location.search);
    const queryString = urlParams.toString();
    const apiUrl = `/registros_json?${queryString}`;
    
    // 2. Elementos DOM
    const corpoTabela = document.getElementById('corpoTabela');
    const avisoVazio = document.getElementById('avisoVazio');
    const modal = document.getElementById('modalProcedimento');
    
    // Novas referências do Modal
    const modalId = document.getElementById('modalId');
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

    // 4. Função para carregar e renderizar os dados
    function carregarRegistros() {
        fetch(apiUrl)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`Erro HTTP: ${response.status}`);
                }
                return response.json();
            })
            .then(registros => {
                // Limpa o corpo da tabela antes de adicionar novos dados
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
                    
                    // LÓGICA DE APLICAÇÃO DE CLASSES
                    
                    // Coluna 'Coleta?'
                    const coletaSimNao = registro.computador_coleta === 'SIM';
                    const coletaCellClass = coletaSimNao ? 'fundo-sim' : 'fundo-nao';
                    
                    // Coluna 'Retaguarda': NÃO recebe classe de fundo.
                    const retaguardaCellClass = ''; 
                    
                    row.innerHTML = `
                        <td>${registro.posto}</td>
                        <td>${registro.numero_mesa}</td>
                        <td class="${retaguardaCellClass}">${registro.retaguarda_display}</td>
                        <td class="${coletaCellClass}">${registro.computador_coleta}</td>
                        <td>${registro.data}</td>
                        <td>${registro.hora_inicio}</td>
                        <td>${registro.hora_termino}</td>
                        <td class="procedimento-resumo" title="${registro.procedimento_completo}">${registro.procedimento_resumo}</td>
                        <td>
                            <form method="POST" action="/apagar/${registro.id}" style="display:inline;" onsubmit="return confirm('Tem certeza que deseja apagar o registro ID ${registro.id}?');">
                                <button type="submit" class="btn-acao btn-danger-individual" title="Apagar registro individual">
                                    <i class="fas fa-trash-alt"></i>
                                </button>
                            </form>
                        </td>
                    `;
                    
                    // Adicionar evento de clique na linha para abrir o modal, excluindo a célula de Ações
                    row.addEventListener('click', function(event) {
                        // Verifica se o clique não foi no botão de apagar
                        if (!event.target.closest('.btn-acao')) {
                            abrirModal(registro);
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

    // 5. Função para abrir o Modal (ATUALIZADA)
    function abrirModal(registro) {
        // Preenche todos os campos do modal
        modalId.textContent = registro.id; 
        modalTitulo.textContent = `Detalhes do Registro (ID: ${registro.id})`; // Mantém o ID no título, mas não no corpo
        modalPosto.textContent = registro.posto;
        modalMesa.textContent = registro.numero_mesa;
        modalRetaguarda.textContent = registro.retaguarda_display;
        modalColeta.textContent = registro.computador_coleta;
        modalData.textContent = registro.data;
        modalHoraInicio.textContent = registro.hora_inicio;
        modalHoraTermino.textContent = registro.hora_termino;
        modalContent.textContent = registro.procedimento_completo;
        
        // Atualiza a URL do formulário de exclusão individual
        formApagarIndividual.action = `/apagar/${registro.id}`;
        
        modal.style.display = 'block';
    }

    // 6. Fechar modal ao clicar fora dele
    window.onclick = function(event) {
        if (event.target == modal) {
            modal.style.display = "none";
        }
        if (event.target == document.getElementById('modalApagarTudo')) {
            document.getElementById('modalApagarTudo').style.display = "none";
        }
    }

    // Inicia o carregamento dos registros
    carregarRegistros();
});
