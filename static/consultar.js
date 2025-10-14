document.addEventListener('DOMContentLoaded', function() {
    // 1. URL da API para buscar os dados (inclui os parâmetros de filtro da URL atual)
    const urlParams = new URLSearchParams(window.location.search);
    const queryString = urlParams.toString();
    const apiUrl = `/registros_json?${queryString}`;
    
    // 2. Elementos DOM
    const corpoTabela = document.getElementById('corpoTabela');
    const avisoVazio = document.getElementById('avisoVazio');
    const modal = document.getElementById('modalProcedimento');
    const modalId = document.getElementById('modalId');
    const modalPosto = document.getElementById('modalPosto');
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
                    
                    // Coluna 'Coleta?' com destaque
                    const coletaCellClass = registro.computador_coleta === 'SIM' ? 'coleta-negrito' : '';
                    
                    // Coluna 'Retaguarda' com o formato customizado
                    const retaguardaCellClass = registro.retaguarda_display !== 'NÃO' ? 'coleta-negrito' : '';
                    
                    row.innerHTML = `
                        <td>${registro.id}</td>
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
                corpoTabela.innerHTML = `<tr><td colspan="10">Erro ao carregar dados. Tente recarregar a página.</td></tr>`;
                avisoVazio.style.display = 'none';
                document.getElementById('tabelaRegistros').style.display = 'table';
            });
    }

    // 5. Função para abrir o Modal
    function abrirModal(registro) {
        modalId.textContent = registro.id;
        modalPosto.textContent = registro.posto;
        modalContent.textContent = registro.procedimento_completo; // .textContent para inserir como texto simples
        
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
