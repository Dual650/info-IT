from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
import os

db = SQLAlchemy()

class Registro(db.Model):
    # Identificador único do registro (Chave Primária)
    id = db.Column(db.Integer, primary_key=True)
    
    # CAMPO DE ORDENAÇÃO CRÍTICO: Registra o momento exato da criação (GMT/UTC)
    timestamp_registro = db.Column(db.DateTime, default=datetime.utcnow) 
    
    # Dados de Coleta e Ambiente
    posto = db.Column(db.String(100), nullable=False)
    computador_coleta = db.Column(db.String(100), nullable=False)
    
    # Dados do Procedimento
    # Este campo agora armazena o Número da Mesa OU o Local
    numero_mesa = db.Column(db.String(50)) 
    retaguarda_sim_nao = db.Column(db.String(10), default='NÃO') # SIM ou NÃO
    # Este campo agora armazena o Destino/Órgão OU o Setor Interno
    retaguarda_destino = db.Column(db.String(100), nullable=True) 
    
    # Dados de Tempo
    data = db.Column(db.String(10), nullable=False) # Ex: 01/05/2024
    hora_inicio = db.Column(db.String(5), nullable=False) # Ex: 09:00
    hora_termino = db.Column(db.String(5)) # Ex: 09:30
    
    # Detalhes da Ação
    procedimento = db.Column(db.Text, nullable=False)

    def __repr__(self):
        return f"Registro(ID={self.id}, Posto='{self.posto}', Data='{self.data}')"

def init_db(app):
    """
    Configura e inicializa o SQLAlchemy no aplicativo Flask.
    """
    database_url = os.environ.get('DATABASE_URL')
    
    if database_url:
        if database_url.startswith("postgres://"):
            database_url = database_url.replace("postgres://", "postgresql+psycopg2://", 1)
        app.config['SQLALCHEMY_DATABASE_URI'] = database_url
    else:
        app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///site.db'
    
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    db.init_app(app)
