from flask import Flask, render_template, request, redirect, url_for, send_file
from datetime import datetime
from flask_sqlalchemy import SQLAlchemy
import os
import io
import pandas as pd # Importa Pandas

# --- Opções de Postos de Trabalho ---
POSTOS = [
    "Andradina", "Assis", "Avaré", "Bauru", "Birigui", "Botucatu",
    "Dracena", "Itapetininga", "Itu", "Jahu", "Marília",
    "Ourinhos", "Penápolis", "Presidente Prudente", "Tatuí", "Tupã"
]

app = Flask(__name__)

# --- Configuração do Banco de Dados ---
DATABASE_URL = os.environ.get('DATABASE_URL', 'sqlite:///site.db').replace("postgres://", "postgresql://", 1)
app.config['SQLALCHEMY_DATABASE_URI'] = DATABASE_URL
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db = SQLAlchemy(app)

# --- Definição do Modelo (Tabela) do Banco de Dados ---
class Registro(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    posto = db.Column(db.String(50), nullable=False)
    data = db.Column(db.String(10), nullable=False) 
    hora_inicio = db.Column(db.String(5), nullable=False)
    hora_termino = db.Column(db.String(5), nullable=False)
    procedimento = db.Column(db.Text, nullable=False)
    timestamp_registro = db.Column(db.DateTime, default=datetime.utcnow) 

    def __repr__(self):
        return f"Registro('{self.posto}', '{self.data}', '{self.hora_inicio}')"

# Cria as tabelas do banco de dados (crucial para o primeiro deploy)
with app.app_context():
    db.create_all()

# Função auxiliar para aplicar filtros (usada na consulta e exportação)
def aplicar_filtros(query, filtro_posto, filtro_data_html):
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
            
    return query.order_by(Registro.timestamp_registro.desc())

# --- Rota 1: Registro de Novo Procedimento ---
@app.route('/', methods=['GET', 'POST'])
def formulario_registro():
    """
    Exibe o formulário de registro e salva novos dados no banco de dados.
    """
    data_de_hoje = datetime.now().strftime('%d/%m/%Y')
    
    if request.method == 'POST':
        posto = request.form.get('posto')
        hora_inicio = request.form.get('hora_inicio')
        hora_termino = request.form.get('hora_termino')
        procedimento = request.form.get('procedimento')
        
        novo_registro = Registro(
            posto=posto,
            data=data_de_hoje,
            hora_inicio=hora_inicio,
            hora_termino=hora_termino,
            procedimento=procedimento
        )
        db.session.add(novo_registro)
        db.session.commit()

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
    filtro_data_html = request.args.get('data')
    
    query = Registro.query
    query = aplicar_filtros(query, filtro_posto, filtro_data_html)
        
    registros = query.all()

    return render_template(
        'consultar.html', 
        postos=POSTOS, 
        registros=registros,
        filtro_posto=filtro_posto,
        filtro_data=filtro_data_html
    )
    
# --- Rota 3: Exportar para XLSX ---
@app.route('/exportar', methods=['GET'])
def exportar_registros():
    """
    Exporta os registros filtrados para um arquivo Excel (.xlsx).
    """
    filtro_posto = request.args.get('posto')
    filtro_data_html = request.args.get('data')

    query = Registro.query
    query = aplicar_filtros(query, filtro_posto, filtro_data_html)
    registros = query.all()

    # Mapeia os dados do SQLAlchemy para um formato que o Pandas entenda
    dados = [{
        'Posto': r.posto,
        'Data': r.data,
        'Início': r.hora_inicio,
        'Término': r.hora_termino,
        'Procedimento Realizado': r.procedimento
    } for r in registros]

    if not dados:
        # Se não houver dados, retorna para a página de consulta com uma mensagem
        return redirect(url_for('consultar_registro'))

    # Cria um DataFrame do Pandas
    df = pd.DataFrame(dados)

    # Usa io.BytesIO para criar o arquivo Excel na memória
    output = io.BytesIO()
    with pd.ExcelWriter(output, engine='openpyxl') as writer:
        df.to_excel(writer, index=False, sheet_name='Registros Técnicos')
    output.seek(0)

    data_exportacao = datetime.now().strftime('%Y%m%d_%H%M%S')
    filename = f"registros_tecnicos_{data_exportacao}.xlsx"

    # Retorna o arquivo para download
    return send_file(
        output,
        mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        download_name=filename,
        as_attachment=True
    )

if __name__ == '__main__':
    app.run(debug=True)
