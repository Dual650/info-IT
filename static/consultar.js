// ===============================================
// FUNÇÕES AUXILIARES DE FORMATAÇÃO E RESUMO
// ===============================================

// Função auxiliar para limitar o texto e adicionar reticências
function resumirProcedimento(texto, limite = 120) {
    if (!texto) return '';
    // Remove quebras de linha e múltiplos espaços em branco
    const textoLimpo = texto.replace(/(\r\n|\n|\r)/gm, ' ').replace(/\s+/g, ' ').trim();
    
    if (textoLimpo.length <= limite) {
        return textoLimpo;
    }
    
    // Retorna o resumo
    return textoLimpo.substring(0, limite) + '...';
}

// ===============================================
// FUNÇÃO PRINCIPAL DE RENDERIZAÇÃO DA TABELA
// ===============================================

function renderizarTabela(dados) {
    const corpoTabela = document.getElementById('corpoTabela');
    const tabela = document.getElementById('tabelaRegistros');
    const avisoVazio = document.getElementById('avisoVazio');

    // Limpa a tabela
    corpoTabela.innerHTML = '';

    if (dados.length === 0) {
        tabela.style.display = 'none';
        avisoVazio.style.display = 'block';
        return;
    }

    // Oculta o aviso e mostra a tabela
    avisoVazio.style.display = 'none';
    tabela.style.display = 'table';

    dados.forEach(registro => {
        const tr = document.createElement('tr');
        
        // Atributo para JS/Modal
        tr.setAttribute('data-registro-id', registro.id); 
        // A linha inteira é clicável para abrir o modal de visualização
        tr.setAttribute('onclick', `abrirModalVisualizacao(${registro.id})`);

        // ===============================================
        // LÓGICA DE FORMATAÇÃO DAS NOVAS COLUNAS
        // ===============================================

        // 1. COLUNA MESA
        let colunaMesa = '';
        const numMesa = registro.numero_mesa || 'XX'; 
        
        if (registro.coleta_imagem === 'SIM') {
            // Regra 1: Coleta de imagem? = SIM
            colunaMesa = `${numMesa} - Coleta de imagem`;
        } 
        else if (registro.mesa_atendimento === 'SIM') {
            // Regra 2: Mesa de atendimento? = SIM
            colunaMesa = `Mesa ${numMesa}`;
        }
        else {
            // Regra 3: Mesa de atendimento? = NÃO (Usa o campo 'Local')
            colunaMesa = registro.local || 'N/D';
        }

        // 2. COLUNA RETAGUARDA?
        let colunaRetaguarda = 'NÃO';
        let classeRetaguarda = 'fundo-nao';
        if (registro.retaguarda === 'SIM') {
            const orgao = registro.qual_orgao || 'N/D';
            colunaRetaguarda = `Retaguarda ${orgao}`;
            classeRetaguarda = 'fundo-sim';
        }
        
        // 3. COLUNA PROCEDIMENTO (RESUMO)
        const resumo = resumirProcedimento(registro.procedimento_completo);


        // ===============================================
        // MONTAGEM DAS CÉLULAS DA TABELA (8 Colunas no total)
        // ===============================================
        
        // Coluna 1: Posto
        tr.insertCell().textContent = registro.posto;

        // Coluna 2: Data
        tr.insertCell().textContent = registro.data; 

        // Coluna 3: Mesa
        tr.insertCell().textContent = colunaMesa;

        // Coluna 4: Retaguarda?
        const cellRetaguarda = tr.insertCell();
        cellRetaguarda.textContent = colunaRetaguarda;
        cellRetaguarda.classList.add(classeRetaguarda);
        cellRetaguarda.style.textAlign = 'center';

        // Coluna 5: Horário de Início
        tr.insertCell().textContent = registro.hora_inicio;

        // Coluna 6: Horário do Término
        tr.insertCell().textContent = registro.hora_termino;

        // Coluna 7: Procedimento Realizado (Resumo)
        const cellProcedimento = tr.insertCell();
        cellProcedimento.classList.add('procedimento-col');
        
        cellProcedimento.innerHTML = `
            <div class="procedimento-resumo">
                <span>${resumo}</span>
            </div>
        `;
        // Impedir que o clique na célula dispare o modal se o clique original foi no TR
        cellProcedimento.parentNode.removeAttribute('onclick');
        tr.setAttribute('onclick', `abrirModalVisualizacao(${registro.id})`);

        // Coluna 8: Ações (Ícones de Edição e Apagar)
        const cellAcoes = tr.insertCell();
        cellAcoes.classList.add('acoes-cell');
        
        // Escapa aspas simples no procedimento completo para o onclick do JS
        const procedimentoEscapado = registro.procedimento_completo ? registro.procedimento_completo.replace(/'/g, "\\'") : '';

        cellAcoes.innerHTML = `
            <button class="btn-acao btn-warning" title="Editar Procedimento" onclick="event.stopPropagation(); abrirModalEdicao(${registro.id}, '${procedimentoEscapado}')">
                <i class="fas fa-edit"></i>
            </button>
            <form method="POST" action="/apagar/${registro.id}" style="display:inline;" onsubmit="event.stopPropagation(); return confirm('Tem certeza que deseja apagar o registro ${registro.id}?');">
                <button type="submit" class="btn-acao btn-danger" title="Apagar Registro">
                    <i class="fas fa-trash"></i>
                </button>
            </form>
        `;

        corpoTabela.appendChild(tr);
    });
}

// ===============================================
// FUNÇÕES DE FILTRO E CHAMADA DE DADOS (Exemplo)
// ===============================================

// OBSERVAÇÃO: A função 'carregarRegistros' deve ser ajustada 
// no seu backend Flask para retornar todos os dados do formulário 
// (posto, data, coleta_imagem, mesa_atendimento, numero_mesa, local, 
// retaguarda, qual_orgao, hora_inicio, hora_termino, procedimento_completo, id)
// para que a lógica acima funcione corretamente.

function aplicarFiltros() {
    const posto = document.getElementById('filtroPosto').value;
    const data = document.getElementById('filtroData').value;
    const coleta = document.getElementById('filtroColeta').value;
    
    // Supondo que você tenha uma URL de API para buscar dados filtrados
    const url = `/api/registros?posto=${posto}&data=${data}&coleta=${coleta}`; 

    fetch(url)
        .then(response => response.json())
        .then(data => {
            renderizarTabela(data.registros); // Assumindo que a resposta JSON tem uma chave 'registros'
        })
        .catch(error => console.error('Erro ao carregar registros:', error));
}

function limparFiltros() {
    document.getElementById('filtroPosto').value = 'Todos';
    document.getElementById('filtroData').value = '';
    document.getElementById('filtroColeta').value = 'Todos';
    aplicarFiltros(); // Recarrega a tabela sem filtros
}

// Chamar a função de filtro ao carregar a página
window.onload = function() {
    aplicarFiltros();
};

// ===============================================
// LÓGICA DE MODAIS (Ajustada para o novo formato)
// ===============================================

function abrirModalVisualizacao(id) {
    const registro = dadosAtuais.find(r => r.id === id); // 'dadosAtuais' deve ser carregado pela sua função de filtro.
    if (!registro) return;

    document.getElementById('modalPosto').textContent = registro.posto || 'N/D';
    document.getElementById('modalData').textContent = registro.data || 'N/D';

    // Lógica para preencher o MODAL MESA (igual à lógica da tabela)
    let modalMesaContent = '';
    const numMesa = registro.numero_mesa || 'XX'; 
    if (registro.coleta_imagem === 'SIM') {
        modalMesaContent = `${numMesa} - Coleta de imagem`;
    } else if (registro.mesa_atendimento === 'SIM') {
        modalMesaContent = `Mesa ${numMesa}`;
    } else {
        modalMesaContent = registro.local || 'N/D';
    }
    document.getElementById('modalMesa').textContent = modalMesaContent;
    
    // Lógica para preencher o MODAL RETAGUARDA (igual à lógica da tabela)
    let modalRetaguardaContent = 'NÃO';
    if (registro.retaguarda === 'SIM') {
        const orgao = registro.qual_orgao || 'N/D';
        modalRetaguardaContent = `Retaguarda ${orgao}`;
    }
    document.getElementById('modalRetaguarda').textContent = modalRetaguardaContent;

    document.getElementById('modalColeta').textContent = registro.coleta_imagem || 'N/D';
    document.getElementById('modalHoraInicio').textContent = registro.hora_inicio || 'N/D';
    document.getElementById('modalHoraTermino').textContent = registro.hora_termino || 'N/D';
    document.getElementById('modalProcedimentoContent').textContent = registro.procedimento_completo || 'N/D';

    // Atualiza o formulário de apagar individual no footer do modal
    const formApagar = document.getElementById('formApagarIndividual');
    formApagar.action = `/apagar/${registro.id}`; 

    document.getElementById('modalVisualizacao').style.display = 'block';
}

let procedimentoOriginal = '';
function abrirModalEdicao(id, procedimento) {
    procedimentoOriginal = procedimento;
    document.getElementById('editIdHidden').value = id;
    document.getElementById('editProcedimento').value = procedimento;
    
    // Define a action do formulário para o ID correto
    const formEditar = document.getElementById('formEditarProcedimento');
    formEditar.action = `/editar/${id}`;
    
    document.getElementById('modalEdicao').style.display = 'block';
}

function tentarFecharEdicao() {
    const procedimentoAtual = document.getElementById('editProcedimento').value;
    if (procedimentoAtual !== procedimentoOriginal && procedimentoOriginal !== '') {
        if (!confirm('Você tem alterações não salvas. Deseja descartá-las?')) {
            return;
        }
    }
    document.getElementById('modalEdicao').style.display = 'none';
    procedimentoOriginal = ''; // Reseta a variável
}

// Variavel global para armazenar os dados e permitir o acesso pelos modais
let dadosAtuais = []; 
// Sobrescreva a função aplicarFiltros para preencher a variavel dadosAtuais
// (Isso é crucial para o modal de visualização funcionar)

function aplicarFiltros() {
    const posto = document.getElementById('filtroPosto').value;
    const data = document.getElementById('filtroData').value;
    const coleta = document.getElementById('filtroColeta').value;
    
    const url = `/api/registros?posto=${posto}&data=${data}&coleta=${coleta}`; 

    fetch(url)
        .then(response => response.json())
        .then(data => {
            dadosAtuais = data.registros; // Preenche a variável global para uso dos modais
            renderizarTabela(dadosAtuais);
        })
        .catch(error => console.error('Erro ao carregar registros:', error));
}
