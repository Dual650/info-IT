// static/consultar.js

document.addEventListener('DOMContentLoaded', function() {
    // 1. URL da API para buscar os dados (usa os filtros da URL atual)
    const urlParams = new URLSearchParams(window.location.search);
    const queryString = urlParams.toString();
    const apiUrl = `/registros_json?${queryString}`;
    
    // 2. Elementos DOM
    const corpoTabela = document.getElementById('corpoTabela');
    const avisoVazio = document.getElementById('avisoVazio');
    const modalVisualizacao = document.getElementById('modalVisualizacao');
    const modalEdicao = document.getElementById('modalEdicao'); 
    const modalApagarTudo = document.getElementById('modalApagarTudo');

    // Referências do Modal de Edição
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

    // 3. Variável de estado para verificar se houve alteração
    let textoFoiAlterado = false;
    
    // 4. Atualizar link de exportação com os filtros atuais
    btnExportar.href = `/exportar?${queryString}`;
    
    // 5. Função para abrir o Modal de Edição (TORNDA GLOBAL)
    window.editarProcedimento = function(registroId, procedimentoAtual) {
        editIdHidden.value = registroId;
        editProcedimento.value = procedimentoAtual;
        editProcedimento.setAttribute('data-original-value', procedimentoAtual);
        textoFoiAlterado = false;
        
        formEditarProcedimento.action = `/editar_procedimento/${registroId}`;
        
        modalEdicao.style.display = 'block';
        if(modalVisualizacao) modalVisualizacao.style.display = 'none';
    }

    // 6. Listener para rastrear alterações no campo de texto
    if (editProcedimento) {
        editProcedimento.addEventListener('input', function() {
            const originalValue = editProcedimento.getAttribute('data-original-value');
            textoFoiAlterado = this.value !== originalValue;
        });
    }

    // 7. Função para tentar fechar o modal de edição (com confirmação) (TORNDA GLOBAL)
    window.tentarFecharEdicao = function() {
        if (textoFoiAlterado) {
            const fechar = confirm("Você tem alterações não salvas. Deseja realmente fechar a janela e descartar as modificações?");
            if (fechar) {
                modalEdicao.style.display = 'none';
                textoFoiAlterado = false; 
            }
        } else {
            modalEdicao.style.display = 'none';
        }
    }


    // 8. Listener para submissão do formulário de edição (AJAX)
    if (formEditarProcedimento) {
        formEditarProcedimento.addEventListener('submit', function(e) {
            e.preventDefault(); 
            
            const registroId = editIdHidden.value;
            const novoProcedimento = editProcedimento.value;
            
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
                    document.getElementById('modalEdicao').style.display = 'none';
                    alert('Ação realizada atualizada com sucesso!');
                    textoFoiAlterado = false;
                    carregarRegistros(); 
                } else {
                    alert('Erro ao atualizar. Verifique a conexão e o servidor.');
                }
            })
            .catch(error => {
                console.error('Erro de rede:', error);
                alert('Erro de conexão ao tentar atualizar o registro.');
            });
        });
    }


    // 9. Função para carregar e renderizar os dados (TORNDA GLOBAL)
    window.carregarRegistros = function() {
        if (!corpoTabela) return; // Evita erro se o elemento não existir
        
        fetch(apiUrl)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`Erro HTTP: ${response.status}`);
                }
                return response.json();
            })
            .then(registros => {
                corpoTabela.innerHTML = ''; 

                const tabelaRegistros = document.getElementById('tabelaRegistros');
                if (registros.length === 0) {
                    avisoVazio.style.display = 'block';
                    if(tabelaRegistros) tabelaRegistros.style.display = 'none';
                    return;
                }

                avisoVazio.style.display = 'none';
                if(tabelaRegistros) tabelaRegistros.style.display = 'table';

                registros.forEach(registro => {
                    const row = corpoTabela.insertRow();
                    
                    const coletaSimNao = registro.computador_coleta === 'SIM';
                    const coletaCellClass = coletaSimNao ? 'fundo-sim' : 'fundo-nao';
                    const retaguardaCellClass = registro.retaguarda_display.toLowerCase().includes('sim') ? 'fundo-sim' : '';
                    
                    // Escapa o procedimento para o onclick
                    const procedimentoEscapado = registro.procedimento_completo
                        .replace(/'/g, "\\'")
                        .replace(/"/g, '\\"');
                    
                    // Stringify e escape para passar o objeto completo no onclick de visualização
                    const registroJsonEscapado = JSON.stringify(registro).replace(/"/g, '&quot;');
                    
                    row.innerHTML = `
                        <td>${registro.id}</td> 
                        <td>${registro.posto}</td>
                        <td>${registro.numero_mesa}</td>
                        <td class="${coletaCellClass}">${registro.computador_coleta}</td>
                        <td class="${retaguardaCellClass}">${registro.retaguarda_display}</td>
                        <td>${registro.data}</td>
                        <td>${registro.hora_inicio}</td>
                        <td>${registro.hora_termino}</td>
                        <td class="procedimento-col">
                            <div class="procedimento-resumo" title="${registro.procedimento_completo}">
                                <span>${registro.procedimento_resumo}</span>
                                <button type="button" class="btn btn-sm btn-outline-secondary p-0 px-1" title="Ver detalhes" onclick="event.stopPropagation(); abrirModalVisualizacao('${registroJsonEscapado}');">
                                     <i class="fas fa-eye"></i>
                                </button>
                            </div>
                        </td>
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
                    
                    // Adiciona listener na linha para abrir o modal de visualização (se não for botão de ação)
                    row.addEventListener('click', function(event) {
                        if (!event.target.closest('.btn-acao') && !event.target.closest('button')) {
                            // Reverte o JSON escapado para objeto JS
                            const registroObjeto = JSON.parse(registroJsonEscapado.replace(/&quot;/g, '"'));
                            abrirModalVisualizacao(registroObjeto);
                        }
                    });
                });
            })
            .catch(error => {
                console.error('Erro ao buscar registros:', error);
                corpoTabela.innerHTML = `<tr><td colspan="10">Erro ao carregar dados. Tente recarregar a página.</td></tr>`;
                avisoVazio.style.display = 'none';
                if(tabelaRegistros) tabelaRegistros.style.display = 'table';
            });
    }
    
    // 10. Função para aplicar filtros (Faz o redirecionamento com os filtros na URL) (TORNDA GLOBAL)
    window.aplicarFiltros = function() {
        const posto = document.getElementById('filtroPosto').value;
        const data = document.getElementById('filtroData').value;
        const coleta = document.getElementById('filtroColeta').value;

        let url = '/consultar';
        let params = [];
        if (posto !== 'Todos') params.push(`posto=${posto}`);
        if (data) params.push(`data=${data}`);
        if (coleta !== 'Todos') params.push(`coleta=${coleta}`);

        window.location.href = url + (params.length > 0 ? '?' + params.join('&') : '');
    }

    // 11. Função para abrir o Modal de Visualização (TORNDA GLOBAL)
    window.abrirModalVisualizacao = function(registro) {
        modalTitulo.textContent = `Detalhes do Registro (ID: ${registro.id})`; 
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

    // 12. Fechar modal ao clicar fora dele (TORNDA GLOBAL)
    window.onclick = function(event) {
        if (event.target == modalVisualizacao) {
            modalVisualizacao.style.display = "none";
        }
        if (event.target == modalEdicao) { 
            tentarFecharEdicao();
        }
        if (event.target == modalApagarTudo) {
            modalApagarTudo.style.display = "none";
        }
    }

    // 13. Lógica para fechar as Flash Messages automaticamente
    const flashAlerts = document.querySelectorAll('.alert-flash');
    flashAlerts.forEach(alert => {
        if (typeof bootstrap !== 'undefined' && bootstrap.Alert) {
            setTimeout(() => {
                const bsAlert = bootstrap.Alert.getInstance(alert) || new bootstrap.Alert(alert);
                bsAlert.close();
            }, 5000); 
        }
    });


    // Inicia o carregamento dos registros ao carregar a página
    carregarRegistros();
});
