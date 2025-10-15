import os
from datetime import datetime
from sqlalchemy import desc

# --- Configurações Gerais ---
RESUMO_MAX_CARACTERES = 70
SENHA_MESTRA = 'PPT.123' # Senha Mestra para Apagar Todos os Registros

# --- Opções de Formulário (Novas estruturas) ---
POSTOS = [
    "Andradina", "Assis", "Avaré", "Bauru", "Birigui", "Botucatu",
    "Dracena", "Itapetininga", "Itu", "Jahu", "Marília",
    "Ourinhos", "Penápolis", "Presidente Prudente", "Tatuí", "Tupã"
]
# Localização: Mesa (SIM)
OPCOES_MESA_ATENDIMENTO = [str(i) for i in range(1, 41)]
# Localização: Local (NÃO)
OPCOES_LOCAIS = ["Sala médica", "Exame teórico", "COREN", "Fazenda", "SERT", "Sabesp", "Recepção/Triagem", "Despachante", "Outro Local"]

# Retaguarda: Destino (SIM)
OPCOES_RETAGUARDA_DESTINO = ["COREN", "Poupatempo", "Fazenda", "Sabesp", "Outro Destino Externo"]
# Retaguarda: Setor Interno (NÃO)
OPCOES_SETORES_INTERNOS = ["RH", "Financeiro", "Comercial", "Outro Setor Interno"]


# --- Função de Filtragem de Dados (Contém a Ordenação por Timestamp) ---

def aplicar_filtros(query, filtro_posto, filtro_data_html, filtro_coleta):
    from models import Registro # Importa o modelo aqui para evitar importação circular

    # 1. Filtro de Posto
    if filtro_posto and filtro_posto != 'Todos':
        query = query.filter(Registro.posto == filtro_posto)
            
    # 2. Filtro de Data
    if filtro_data_html:
        try:
            # Converte data de HTML (YYYY-MM-DD) para o formato do BD (DD/MM/YYYY)
            data_obj = datetime.strptime(filtro_data_html, '%Y-%m-%d')
            data_formatada = data_obj.strftime('%d/%m/%Y')
            query = query.filter(Registro.data == data_formatada)
        except ValueError:
            pass

    # 3. Filtro de Coleta (Retaguarda?)
    if filtro_coleta and filtro_coleta != 'Todos':
        coleta_db_value = filtro_coleta.upper()
        query = query.filter(Registro.retaguarda_sim_nao == coleta_db_value)
            
    # ORDENAÇÃO CRÍTICA: Ordena pelo registro mais novo (timestamp_registro decrescente)
    return query.order_by(desc(Registro.timestamp_registro))
