document.addEventListener('DOMContentLoaded', function() {
    // URL base da API para buscar os registros
    const registrosApiUrl = '/registros_json';
    const registrosTableBody = document.getElementById('registrosTableBody');
    const noResultsMessage = document.getElementById('noResultsMessage');
    const filtroForm = document.getElementById('filtroForm');
    const exportarExcelBtn = document.getElementById('exportarExcelBtn');

    // Elementos do Modal de Edição/Visualização
    const registroModal = new bootstrap.Modal(document.getElementById('registroModal'));
    const modalIdDisplay = document.getElementById('modalIdDisplay');
    const modalPosto = document.getElementById('modalPosto');
    const modalData = document.getElementById('modalData');
    const modalMesaDisplay = document.getElementById('modalMesaDisplay');
    const modalRetaguardaDisplay = document.getElementById('modalRetaguardaDisplay');
    const modalColeta = document.getElementById('modalColeta');
    const modalHoraInicio = document.getElementById('modalHoraInicio');
    const modalHoraTermino = document.getElementById('modalHoraTermino');
    const modalProcedimento = document.getElementById('modalProcedimento');
    const salvarEdicaoBtn = document.getElementById('salvarEdicaoBtn');

    // Variável para armazenar o ID do registro sendo editado
    let registroAtualId = null; 

    /**
     * Constrói a URL da API com base nos filtros atuais do formulário.
     * @returns {string} URL completa com parâmetros de busca.
     */
    function construirUrlComFiltros() {
        // Usa o URLSearchParams para obter os filtros da URL atual (após o envio do filtroForm)
        const params = new URLSearchParams(window.location.search);
        
        let url = `${registrosApiUrl}?`;
        
        // Verifica se há filtro de posto
        if (params.get('posto') && params.get('posto') !== 'Todos') {
            url += `posto=${params.get('posto')}&`;
        }
        
        // Verifica se há filtro de data (no formato YYYY-MM-DD)
        if (params.get('data')) {
            url += `data=${params.get('data')}&`;
        }
        
        // Verifica se há filtro de coleta
        if (params.get('coleta') && params.get('coleta') !== 'Todos') {
            url += `coleta=${params.get('coleta')}&`;
        }
        
        return url;
    }

    /**
     * Carrega os dados da API e preenche a tabela.
     */
    function carregarRegistros() {
        registrosTableBody.innerHTML = '<tr><td colspan="9" class="text-center text-info"><i class="fas fa-spinner fa-spin me-2"></i> Carregando registros...</td></tr>';
        noResultsMessage.style.display = 'none';

        const urlComFiltros = construirUrlComFiltros();
        
        // Define a URL de exportação para que ela use os mesmos filtros
        const exportarUrlBase = exportarExcelBtn.href.split('?')[0];
        exportarExcelBtn.href = exportarUrlBase + urlComFiltros.replace(registrosApiUrl, '/exportar');

        fetch(urlComFiltros)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`Erro de rede: ${response.status}`);
                }
                return response.json();
            })
            .then(registros => {
                registrosTableBody.innerHTML = ''; // Limpa a mensagem de carregamento
                
                if (registros.length === 0) {
                    noResultsMessage.style.display = 'block';
                    registrosTableBody.innerHTML = '<tr><td colspan="9" class="text-center text-muted">Nenhum registro encontrado.</td></tr>';
                    return;
                }

                registros.forEach(registro => {
                    const row = registrosTableBody.insertRow();
                    row.innerHTML = `
                        <td>${registro.id}</td>
                        <td>${registro.posto}</td>
                        <td>${registro.data}</td>
                        <td>${registro.mesa_display}</td>
                        <td>${registro.retaguarda_display}</td>
                        <td>${registro.hora_inicio}</td>
                        <td>${registro.hora_termino}</td>
                        <td>${registro.procedimento_resumo}</td>
                        <td>
                            <button class="btn btn-sm btn-info view-btn me-1" data-registro='${JSON.stringify(registro).replace(/'/g, "&apos;")}' title="Ver/Editar">
                                <i class="fas fa-eye"></i>
                            </button>
                            <form method="POST" action="/apagar/${registro.id}${window.location.search}" style="display:inline;" onsubmit="return confirm('Tem certeza que deseja apagar o registro ID ${registro.id} do posto ${registro.posto}?');">
                                <button type="submit" class="btn btn-sm btn-danger" title="Apagar">
                                    <i class="fas fa-trash-alt"></i>
                                </button>
                            </form>
                        </td>
                    `;
                });

                // Re-adiciona os ouvintes de evento para os botões de visualização/edição
                adicionarOuvintesViewButtons();
            })
            .catch(error => {
                console.error('Erro ao carregar registros:', error);
                registrosTableBody.innerHTML = '<tr><td colspan="9" class="text-center text-danger"><i class="fas fa-exclamation-triangle me-2"></i> Erro ao conectar ou carregar os dados do servidor.</td></tr>';
                noResultsMessage.style.display = 'none';
            });
    }

    /**
     * Adiciona ouvintes de clique aos botões de Visualizar/Editar.
     */
    function adicionarOuvintesViewButtons() {
        document.querySelectorAll('.view-btn').forEach(button => {
            button.addEventListener('click', function() {
                // Parseia o JSON armazenado no atributo data-registro
                const registro = JSON.parse(this.getAttribute('data-registro'));
                
                // Preenche os campos do modal
                registroAtualId = registro.id;
                modalIdDisplay.textContent = `#${registro.id}`;
                modalPosto.textContent = registro.posto;
                modalData.textContent = registro.data;
                modalMesaDisplay.textContent = registro.mesa_display;
                modalRetaguardaDisplay.textContent = registro.retaguarda_display;
                modalColeta.textContent = registro.computador_coleta;
                modalHoraInicio.textContent = registro.hora_inicio;
                modalHoraTermino.textContent = registro.hora_termino;
                modalProcedimento.value = registro.procedimento_completo;

                // Mostra o modal
                registroModal.show();
            });
        });
    }

    /**
     * Gerencia a ação de salvar a edição do procedimento.
     */
    salvarEdicaoBtn.addEventListener('click', function() {
        if (!registroAtualId) return;

        const novoProcedimento = modalProcedimento.value;
        
        // Desabilita o botão para evitar cliques duplos
        salvarEdicaoBtn.disabled = true;
        salvarEdicaoBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i> Salvando...';

        fetch(`/editar_procedimento/${registroAtualId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ procedimento_completo: novoProcedimento })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                // Recarrega os registros para atualizar a tabela (melhor UX)
                registroModal.hide();
                carregarRegistros(); 
                alert('Procedimento atualizado com sucesso!');
            } else {
                alert(`Erro ao salvar: ${data.message}`);
            }
        })
        .catch(error => {
            console.error('Erro de edição:', error);
            alert('Erro ao se comunicar com o servidor para salvar a edição.');
        })
        .finally(() => {
            // Reabilita o botão
            salvarEdicaoBtn.disabled = false;
            salvarEdicaoBtn.innerHTML = '<i class="fas fa-save me-1"></i> Salvar Edição';
        });
    });

    // Inicia o carregamento dos registros assim que a página estiver pronta
    carregarRegistros();
    
    // Esconder o alerta flash após um tempo
    const alertFlash = document.querySelector('.alert-flash');
    if (alertFlash) {
        setTimeout(() => {
            alertFlash.classList.remove('show');
            alertFlash.classList.add('fade');
            setTimeout(() => alertFlash.remove(), 500); 
        }, 5000); 
    }
});
