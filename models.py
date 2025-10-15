from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
from app import app # Importa a instância do app Flask
from config import DATABASE_URL

# Configuração do Banco de Dados
app.config['SQLALCHEMY_DATABASE_URI'] = DATABASE_URL
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db = SQLAlchemy(app)

# Definição do Modelo (Tabela) do Banco de Dados
class Registro(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    posto = db.Column(db.String(50), nullable=False)
    computador_coleta = db.Column(db.String(3), nullable=False) # 'SIM' ou 'NÃO'
    
    # NOVOS CAMPOS ADICIONADOS
    numero_mesa = db.Column(db.String(50), nullable=False) # Ex: 1 a 40, Sala médica, COREN, etc.
    retaguarda_sim_nao = db.Column(db.String(4), nullable=False) # 'SIM' ou 'NÃO'
    retaguarda_destino = db.Column(db.String(50), nullable=True) # Destino (apenas se SIM)
    
    data = db.Column(db.String(10), nullable=False) # 'DD/MM/YYYY'
    hora_inicio = db.Column(db.String(5), nullable=False)
    hora_termino = db.Column(db.String(5), nullable=False)
    procedimento = db.Column(db.Text, nullable=False)
    timestamp_registro = db.Column(db.DateTime, default=datetime.utcnow)

    def __repr__(self):
        return f"Registro('{self.posto}', '{self.data}', '{self.hora_inicio}')"

# Cria as tabelas do banco de dados (Necessário deletar site.db se estiver usando localmente)
with app.app_context():
    db.create_all()
