from flask import Flask, render_template, request, redirect, url_for, send_file
from datetime import datetime
from flask_sqlalchemy import SQLAlchemy
import os
import io
import pandas as pd
from openpyxl.utils.dataframe import dataframe_to_rows
from openpyxl.styles import Font, Alignment, PatternFill
from openpyxl import Workbook
import io

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
    # NOVO CAMPO
    computador_coleta = db.Column(db.String(3), nullable=False) 
    # Fim NOVO CAMPO
    data = db.Column(db.String(10), nullable=False) 
    hora_inicio = db.Column(db.String(5), nullable=False)
    hora_termino = db.Column(db.String(5), nullable=False)
    procedimento = db.Column(db.Text, nullable=False)
    timestamp_registro = db.Column(db.DateTime, default=datetime.utcnow) 

    def __repr__(self):
        return f"Registro('{self.posto}', '{self.data}', '{self.hora_inicio}')"

# Cria as tabelas do banco de dados (AVISO: Pode ser necessário recriar as tabelas no Render, 
# se o banco já existir, para que a coluna 'computador_coleta' seja adicionada. 
# Se o banco for novo, db.create_all() funciona.)
with app.app_context():
    db.create_all()

# Função auxiliar para aplicar filtros (sem alterações)
def aplicar_filtros(query, filtro_posto, filtro_data_html):
    if filtro_posto and filtro_posto != 'Todos':
        query = query.filter(Registro.posto == filtro_posto)
            
    if filtro_data_html:
        try:
            data_obj = datetime.strptime(filtro_data_html, '%Y-%m-%d')
            data_formatada = data_obj.strftime('%d/%m/%Y')
            query = query.filter(Registro.data == data_formatada)
        except ValueError:
            pass
            
    return query.order_by(Registro.timestamp_registro.desc())

# --- Rota 1: Registro de Novo Procedimento (COM NOVO CAMPO) ---
@app.route('/', methods=['GET', 'POST'])
def formulario_registro():
    """
    Exibe o formulário de registro e salva novos dados no banco de dados.
    """
    data_de_hoje = datetime.now().strftime('%d/%m/%Y')
    
    if request.method == 'POST':
        posto = request.form.get('posto')
        computador_coleta = request.form.get('computador_coleta') # NOVO
        hora_inicio = request.form.get('hora_inicio')
        hora_termino = request.form.get('hora_termino')
        procedimento = request.form.get('procedimento')
        
        novo_registro = Registro(
            posto=posto,
            computador_coleta=computador_coleta, # NOVO
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

# --- Rota 2: Consulta de Registros Antigos (Sem Alterações) ---
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
    
# --- Rota 3: Exportar para XLSX (ATUALIZADA COM FORMATO CONDICIONAL) ---
@app.route('/exportar', methods=['GET'])
def exportar_registros():
    filtro_posto = request.args.get('posto')
    filtro_data_html = request.args.get('data')

    query = Registro.query
    query = aplicar_filtros(query, filtro_posto, filtro_data_html)
    registros = query.all()

    if not registros:
        return redirect(url_for('consultar_registro'))

    # 1. Preparar os dados para o DataFrame
    dados = []
    for r in registros:
        try:
            data_obj = datetime.strptime(r.data, '%d/%m/%Y').date()
        except ValueError:
            data_obj = r.data
            
        dados.append({
            'Posto': r.posto,
            'Computador da coleta?': r.computador_coleta, # NOVO CAMPO
            'Data': data_obj,
            'Início': r.hora_inicio,
            'Término': r.hora_termino,
            'Procedimento Realizado': r.procedimento
        })

    df = pd.DataFrame(dados)

    # 2. Configurar o Writer e o Workbook
    output = io.BytesIO()
    writer = pd.ExcelWriter(output, engine='openpyxl')
    df.to_excel(writer, index=False, sheet_name='Registros Técnicos')
    workbook = writer.book
    sheet = writer.sheets['Registros Técnicos']

    # --- 3. Definir Estilos ---
    
    # Cores
    FILL_GRAY = PatternFill(start_color="D3D3D3", end_color="D3D3D3", fill_type="solid")
    FILL_GREEN = PatternFill(start_color="C6EFCE", end_color="C6EFCE", fill_type="solid") # Verde claro
    FILL_RED = PatternFill(start_color="FFC7CE", end_color="FFC7CE", fill_type="solid")   # Vermelho claro

    # Fontes e Alinhamento
    header_font = Font(size=16, bold=True, color="000000")
    header_alignment = Alignment(horizontal='center', vertical='center', wrapText=True)
    
    data_font = Font(size=12, color="000000") 
    data_font_bold = Font(size=12, bold=True, color="000000") # Negrito para a nova coluna
    data_alignment = Alignment(horizontal='center', vertical='top')
    procedimento_alignment = Alignment(horizontal='left', vertical='top', wrapText=True)

    # --- 4. Aplicar Estilos de Cabeçalho e Largura de Coluna ---
    
    col_config = {
        'Posto': 15,
        'Computador da coleta?': 18, # Largura ajustada para o novo título
        'Data': 15,
        'Início': 12,
        'Término': 12,
        'Procedimento Realizado': 60
    }
    
    # Itera sobre as colunas da planilha e aplica Largura e Estilo de Cabeçalho
    for i, col_name in enumerate(df.columns):
        col_letter = sheet.cell(row=1, column=i+1).column_letter
        
        sheet.column_dimensions[col_letter].width = col_config.get(col_name, 15)
        
        header_cell = sheet.cell(row=1, column=i+1)
        header_cell.font = header_font
        header_cell.fill = FILL_GRAY
        header_cell.alignment = header_alignment


    # --- 5. Aplicar Estilos e Formatos ao Corpo da Planilha (Dados) ---
    
    # Itera sobre todas as células de dados (começa na linha 2)
    for row_idx, row in enumerate(sheet.iter_rows(min_row=2, max_col=len(df.columns))):
        
        # Obter o valor da coluna 'Computador da coleta?' desta linha
        # A nova coluna está no índice 1 (coluna B)
        valor_coleta = row[1].value 

        for col_idx, cell in enumerate(row):
            col_name = df.columns[col_idx]
            
            # A. Formatação base (Tamanho 12 e Centralizado)
            cell.alignment = data_alignment
            cell.font = data_font # Padrão (será sobrescrito na coluna 'coleta')
            
            # B. Formatação Condicional e Estilo da Coluna 'Computador da coleta?'
            if col_name == 'Computador da coleta?':
                cell.font = data_font_bold # Negrito
                if valor_coleta == 'Sim':
                    cell.fill = FILL_GREEN
                elif valor_coleta == 'Não':
                    cell.fill = FILL_RED
            
            # C. Formatos Específicos (Manter formatação de data/hora)
            elif col_name == 'Data':
                cell.number_format = 'DD/MM/YYYY' 
            elif col_name in ['Início', 'Término']:
                cell.number_format = 'HH:MM'
            elif col_name == 'Procedimento Realizado':
                cell.alignment = procedimento_alignment 
                sheet.row_dimensions[row_idx + 2].height = 40


    # 6. Salvar e Retornar
    writer.close()
    output.seek(0)

    data_exportacao = datetime.now().strftime('%Y%m%d_%H%M%S')
    filename = f"registros_tecnicos_{data_exportacao}.xlsx"

    return send_file(
        output,
        mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        download_name=filename,
        as_attachment=True
    )

if __name__ == '__main__':
    app.run(debug=True)
