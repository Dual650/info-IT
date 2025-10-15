from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
from config import DATABASE_URL # Mantém a importação da URL aqui

# 1. Cria a instância do SQLAlchemy SEM a aplicação (app)
db = SQLAlchemy()

# 2. Definição do Modelo (Tabela) do Banco de Dados (Permanece igual)
class Registro(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    posto = db.Column(db.String(50), nullable=False)
    computador_coleta = db.Column(db.String(3), nullable=False) # 'SIM' ou 'NÃO'
    
    # NOVOS CAMPOS ADICIONADOS
    numero_mesa = db.Column(db.String(50), nullable=False)
    retaguarda_sim_nao = db.Column(db.String(4), nullable=False)
    retaguarda_destino = db.Column(db.String(50), nullable=True)
    
    data = db.Column(db.String(10), nullable=False) # 'DD/MM/YYYY'
    hora_inicio = db.Column(db.String(5), nullable=False)
    hora_termino = db.Column(db.String(5), nullable=False)
    procedimento = db.Column(db.Text, nullable=False)
    timestamp_registro = db.Column(db.DateTime, default=datetime.utcnow)

    def __repr__(self):
        return f"Registro('{self.posto}', '{self.data}', '{self.hora_inicio}')"

# 3. Função para inicializar o DB que será chamada em app.py
def init_db(app):
    app.config['SQLALCHEMY_DATABASE_URI'] = DATABASE_URL
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    db.init_app(app) # Conecta a instância db com a aplicação Flask

    with app.app_context():
        db.create_all()

    return db
