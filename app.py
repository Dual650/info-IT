from flask import Flask, render_template, request, redirect, url_for
from datetime import datetime
from flask_sqlalchemy import SQLAlchemy
import os

# --- Opções de Postos de Trabalho ---
POSTOS = [
    "Andradina Assis", "Avaré", "Bauru", "Birigui", "Botucatu",
    "Dracena", "Itapetininga", "Itu", "Jahu", "Marília",
    "Ourinhos", "Penápolis", "Presidente Prudente", "Tatuí", "Tupã"
]

app = Flask(__name__)

# --- Configuração do Banco de Dados ---
# 1. Tenta usar a variável de ambiente DATABASE_URL (para Render/PostgreSQL).
# 2. Se não encontrar (ambiente local), usa o SQLite.
# A função .replace é necessária para compatibilidade com o Render/SQLAlchemy.
DATABASE_URL = os.environ.get('DATABASE_URL', 'sqlite:///site.db').replace("postgres://", "postgresql://", 1)
app.config['SQLALCHEMY_DATABASE_URI'] = DATABASE_URL
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db = SQLAlchemy(app)

# --- Definição do Modelo (Tabela) do Banco de Dados ---
class Registro(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    posto = db.Column(db.String(50), nullable=False)
    # A data é armazenada como texto no formato DD/MM/AAAA
    data = db.Column(db.String(10), nullable=False) 
    hora_inicio = db.Column(db.String(5), nullable=False)
    hora_termino = db.Column(db.String(5), nullable=False)
    procedimento = db.Column(db.Text, nullable=False)
    # Coluna de registro para ordenação
    timestamp_registro = db.Column(db.DateTime, default=datetime.utcnow) 

    def __repr__(self):
        return f"Registro('{self.posto}', '{self.data}', '{self.hora_inicio}')"

# Cria as tabelas do banco de dados (crucial para o primeiro deploy)
with app.app_context():
    db.create_all()

# --- Rota 1: Registro de Novo Procedimento ---
@app.route('/', methods=['GET', 'POST'])
def formulario_registro():
    """
    Exibe o formulário de registro e salva novos dados no banco de dados.
    """
    # Formato DD/MM/AAAA para exibição e armazenamento
    data_de_hoje = datetime.now().strftime('%d/%m/%Y')
    
    if request.method == 'POST':
        # Coleta os dados do POST
        posto = request.form.get('posto')
        hora_inicio = request.form.get('hora_inicio')
        hora_termino = request.form.get('hora_termino')
        procedimento = request.form.get('procedimento')
        
        # Cria e salva o novo registro
        novo_registro = Registro(
            posto=posto,
            data=data_de_hoje,  # Usa a data atual
            hora_inicio=hora_inicio,
            hora_termino=hora_termino,
            procedimento=procedimento
        )
        db.session.add(novo_registro)
        db.session.commit()

        # Redireciona para evitar reenvio
        return redirect(url_for('formulario_registro'))

    return render_template(
        'index.html', 
        postos=POSTOS, 
        data_de_hoje=data_de_hoje
    )

# --- Rota 2: Consulta de Registros Antigos (Com Filtros) ---
@app.route('/consultar', methods=['GET'])
def consultar_registro():
    """
    Busca registros no banco de dados com base nos filtros (Posto e Data).
    """
    
    filtro_posto = request.args.get('posto')
    filtro_data_html = request.args.get('data') # Data no formato YYYY-MM-DD
    
    query = Registro.query
        
    # Aplicar filtro por Posto
    if filtro_posto and filtro_posto != 'Todos':
        query = query.filter(Registro.posto == filtro_posto)
            
    # Aplicar filtro por Data
    if filtro_data_html:
        # CONVERSÃO: YYYY-MM-DD (do HTML) para DD/MM/YYYY (do DB)
        try:
            data_obj = datetime.strptime(filtro_data_html, '%Y-%m-%d')
            data_formatada = data_obj.strftime('%d/%m/%Y')
            query = query.filter(Registro.data == data_formatada)
        except ValueError:
            pass
        
    # Executar a busca, ordenando do mais recente para o mais antigo
    registros = query.order_by(Registro.timestamp_registro.desc()).all()

    return render_template(
        'consultar.html', 
        postos=POSTOS, 
        registros=registros,
        filtro_posto=filtro_posto,
        filtro_data=filtro_data_html
    )

if __name__ == '__main__':
    # Rodar localmente (usará o SQLite)
    app.run(debug=True)
