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

    

    // 5. Função para abrir o Modal de Edição (Inicializa o rastreamento)

    window.editarProcedimento = function(registroId, procedimentoAtual) {

        // 5a. Preenche e rastreia o valor original

        editIdHidden.value = registroId;

        editProcedimento.value = procedimentoAtual;

        editProcedimento.setAttribute('data-original-value', procedimentoAtual); // Salva o valor original

        textoFoiAlterado = false; // Reseta o estado

        

        // 5b. Define a URL de ação do formulário 

        formEditarProcedimento.action = `/editar_procedimento/${registroId}`;

        

        // 5c. Exibe o modal

        modalEdicao.style.display = 'block';

    }



    // 6. Listener para rastrear alterações no campo de texto

    editProcedimento.addEventListener('input', function() {

        const originalValue = editProcedimento.getAttribute('data-original-value');

        // Define textoFoiAlterado como true se o valor atual for diferente do original

        textoFoiAlterado = this.value !== originalValue;

    });



    // 7. NOVA FUNÇÃO para tentar fechar o modal de edição (chamada pelo 'X' e pelo clique fora)

    window.tentarFecharEdicao = function() {

        if (textoFoiAlterado) {

            // Se o texto foi alterado, solicita confirmação

            const fechar = confirm("Você tem alterações não salvas. Deseja realmente fechar a janela e descartar as modificações?");

            if (fechar) {

                // Se confirmado, fecha e reseta o estado

                modalEdicao.style.display = 'none';

                textoFoiAlterado = false; 

            }

            // Se não confirmado, o modal permanece aberto

        } else {

            // Se nada foi alterado, fecha o modal sem aviso

            modalEdicao.style.display = 'none';

        }

    }





    // 8. Adicionar listener para submissão do formulário de edição (AJAX)

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

                // Atualização bem-sucedida: fecha, avisa, reseta estado

                document.getElementById('modalEdicao').style.display = 'none';

                alert('Ação realizada atualizada com sucesso!');

                textoFoiAlterado = false; // Reseta o estado após salvar

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





    // 9. Função para carregar e renderizar os dados

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

                    

                    row.addEventListener('click', function(event) {

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



    // 10. Função para abrir o Modal de Visualização

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



    // 11. Fechar modal ao clicar fora dele 

    window.onclick = function(event) {

        if (event.target == modalVisualizacao) {

            modalVisualizacao.style.display = "none";

        }

        if (event.target == modalEdicao) { 

            // Se o clique for no fundo do modal de edição, chama a função de confirmação

            tentarFecharEdicao();

        }

        if (event.target == document.getElementById('modalApagarTudo')) {

            document.getElementById('modalApagarTudo').style.display = "none";

        }

    }



    // Inicia o carregamento dos registros

    carregarRegistros();

});
