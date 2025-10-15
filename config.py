import os
from datetime import datetime

# --- Configuração de Segurança e Mensagens Flash ---
# A chave secreta é movida para cá, mas o Flask app ainda lerá do app.py
SECRET_KEY = 'uma_chave_secreta_muito_forte_e_dificil'

# --- Configuração do Banco de Dados ---
# Substitui o "postgres://" por "postgresql://" para compatibilidade com SQLAlchemy 1.4+ no Heroku
DATABASE_URL = os.environ.get('DATABASE_URL', 'sqlite:///site.db').replace("postgres://", "postgresql://", 1)

# --- Constantes do Projeto ---

# Opções de Postos de Trabalho
POSTOS = [
    "Andradina", "Assis", "Avaré", "Bauru", "Birigui", "Botucatu",
    "Dracena", "Itapetininga", "Itu", "Jahu", "Marília",
    "Ourinhos", "Penápolis", "Presidente Prudente", "Tatuí", "Tupã"
]

# Opções de Mesas e Locais Específicos
OPCOES_MESA = [str(i) for i in range(1, 41)] + ["Sala médica", "Exame teórico", "COREN", "Fazenda", "SERT", "Sabesp", "Recepção/Triagem", "Despachante"]
OPCOES_RETAGUARDA_DESTINO = ["COREN", "Poupatempo", "Fazenda", "Sabesp"]

# Configuração de Resumo
RESUMO_MAX_CARACTERES = 70

# Senha Mestra para Apagar Todos os Registros
SENHA_MESTRA = "PPT.123"

# Função auxiliar para formatação de filtros (Mantida aqui por ser genérica)
def aplicar_filtros(query, filtro_posto, filtro_data_html, filtro_coleta):
    from models import Registro # Importa o modelo aqui para evitar importação circular

    if filtro_posto and filtro_posto != 'Todos':
        query = query.filter(Registro.posto == filtro_posto)
            
    if filtro_data_html:
        try:
            data_obj = datetime.strptime(filtro_data_html, '%Y-%m-%d')
            data_formatada = data_obj.strftime('%d/%m/%Y')
            query = query.filter(Registro.data == data_formatada)
        except ValueError:
            pass

    if filtro_coleta and filtro_coleta != 'Todos':
        coleta_db_value = filtro_coleta.upper()
        query = query.filter(Registro.computador_coleta == coleta_db_value)
            
    return query.order_by(Registro.timestamp_registro.desc())
