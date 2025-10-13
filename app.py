from flask import Flask, render_template, request, redirect, url_for, send_file, jsonify
from datetime import datetime, time
from flask_sqlalchemy import SQLAlchemy
import os
import io
import pandas as pd
import io

# --- Opções de Postos de Trabalho ---
POSTOS = [
    "Andradina", "Assis", "Avaré", "Bauru", "Birigui", "Botucatu",
    "Dracena", "Itapetininga", "Itu", "Jahu", "Marília",
    "Ourinhos", "Penápolis", "Presidente Prudente", "Tatuí", "Tupã"
]

app = Flask(__name__)

# --- Configuração do Banco de Dados (Pronto para Render/PostgreSQL) ---
DATABASE_URL = os.environ.get('DATABASE_URL', 'sqlite:///site.db').replace("postgres://", "postgresql://", 1)
app.config['SQLALCHEMY_DATABASE_URI'] = DATABASE_URL
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db = SQLAlchemy(app)

# --- Definição do Modelo (Tabela) do Banco de Dados ---
class Registro(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    posto = db.Column(db.String(50), nullable=False)
    computador_coleta = db.Column(db.String(3), nullable=False) 
    data = db.Column(db.String(10), nullable=False) 
    hora_inicio = db.Column(db.String(5), nullable=False)
    hora_termino = db.Column(db.String(5), nullable=False)
    procedimento = db.Column(db.Text, nullable=False)
    timestamp_registro = db.Column(db.DateTime, default=datetime.utcnow) 

    def __repr__(self):
        return f"Registro('{self.posto}', '{self.data}', '{self.hora_inicio}')"

# Cria as tabelas do banco de dados
with app.app_context():
    db.create_all()

# --- CONSTANTE para Resumo ---
RESUMO_MAX_CARACTERES = 70 

# Função auxiliar para aplicar filtros
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

# --- Rota 1: Registro de Novo Procedimento ---
@app.route('/', methods=['GET', 'POST'])
def formulario_registro():
    data_de_hoje = datetime.now().strftime('%d/%m/%Y')
    
    if request.method == 'POST':
        posto = request.form.get('posto')
        computador_coleta = request.form.get('computador_coleta')
        hora_inicio = request.form.get('hora_inicio')
        hora_termino = request.form.get('hora_termino')
        procedimento = request.form.get('procedimento')
        
        novo_registro = Registro(
            posto=posto,
            computador_coleta=computador_coleta,
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

# --- Rota 2: Consulta de Registros Antigos ---
@app.route('/consultar', methods=['GET'])
def consultar_registro():
    filtro_posto = request.args.get('posto')
    filtro_data_html = request.args.get('data')

    return render_template(
        'consultar.html', 
        postos=POSTOS, 
        filtro_posto=filtro_posto or 'Todos', 
        filtro_data=filtro_data_html
    )

# --- Rota: Retorna os dados em JSON para o JavaScript ---
@app.route('/registros_json', methods=['GET'])
def registros_json():
    filtro_posto = request.args.get('posto')
    filtro_data_html = request.args.get('data')
    
    query = Registro.query
    query = aplicar_filtros(query, filtro_posto, filtro_data_html)
    registros = query.all()

    registros_formatados = []
    for r in registros:
        
        procedimento_completo = r.procedimento
        procedimento_resumo = procedimento_completo
        if len(procedimento_completo) > RESUMO_MAX_CARACTERES:
            procedimento_resumo = procedimento_completo[:RESUMO_MAX_CARACTERES] + '...'
            
        registros_formatados.append({
            'posto': r.posto,
            'computador_coleta': r.computador_coleta,
            'data': r.data,
            'hora_inicio': r.hora_inicio,
            'hora_termino': r.hora_termino,
            'procedimento_resumo': procedimento_resumo, 
            'procedimento_completo': procedimento_completo,
            'id': r.id
        })

    return jsonify(registros_formatados)


# --- Rota 3: Exportar para XLSX (VERSÃO FINAL E OTIMIZADA) ---
@app.route('/exportar', methods=['GET'])
def exportar_registros():
    filtro_posto = request.args.get('posto')
    filtro_data_html = request.args.get('data')

    query = Registro.query
    query = aplicar_filtros(query, filtro_posto, filtro_data_html)
    registros = query.all()

    if not registros:
        return redirect(url_for('consultar_registro'))

    # 1. Preparar os dados para o DataFrame (Conversão de tipos para Formatação Excel)
    dados = []
    for r in registros:
        data_obj = r.data
        inicio_obj = r.hora_inicio
        termino_obj = r.hora_termino
        
        # Converte Data (DD/MM/YYYY string para objeto date)
        try:
            data_obj = datetime.strptime(r.data, '%d/%m/%Y').date()
        except ValueError:
            pass
            
        # Converte Hora (HH:MM string para objeto time)
        try:
            inicio_obj = datetime.strptime(r.hora_inicio, '%H:%M').time()
        except ValueError:
            pass 
            
        try:
            termino_obj = datetime.strptime(r.hora_termino, '%H:%M').time()
        except ValueError:
            pass 

        # Assegura que SIM/NÃO está em caixa alta para a exibição no Excel
        coleta_status = r.computador_coleta.upper() 

        dados.append({
            'Posto': r.posto,
            # Coluna alterada: 'Computador da coleta?' para 'Coleta de imagem?'
            'Coleta de imagem?': coleta_status,  
            'Data': data_obj, # Objeto date
            # Colunas alteradas: 'Início' e 'Término' para 'Horário de Início' e 'Horário de Término'
            'Horário de Início': inicio_obj, # Objeto time
            'Horário de Término': termino_obj, # Objeto time
            'Procedimento Realizado': r.procedimento # Texto Completo
        })

    # Renomeando as colunas do DataFrame para corresponder aos títulos finais
    df = pd.DataFrame(dados)
    # Pandas automaticamente mantém a capitalização das chaves do dicionário

    # 2. Configurar o Writer e o Workbook
    output = io.BytesIO()
    
    try:
        # Usa o Pandas com o engine 'xlsxwriter'
        with pd.ExcelWriter(output, engine='xlsxwriter') as writer:
            df.to_excel(writer, index=False, sheet_name='Registros Técnicos')
            workbook = writer.book
            sheet = writer.sheets['Registros Técnicos']
            
            # --- DEFINIÇÃO DOS FORMATOS (xlsxwriter) ---
            
            # 1. Formato de Cabeçalho (Tam 14, Negrito, Centralizado, Bordas, Cinza Claro)
            header_format = workbook.add_format({
                'bold': True,
                'font_size': 14,
                'align': 'center',
                'valign': 'vcenter',
                'border': 1,
                'bg_color': '#D3D3D3'
            })
            
            # 2. Formato de Dados Padrão (Tam 12, Centralizado, Bordas)
            default_data_format = workbook.add_format({
                'font_size': 12,
                'align': 'center',
                'valign': 'vcenter',
                'border': 1
            })
            
            # 3. Formato de Data (DD/MM/YYYY)
            date_format = workbook.add_format({
                'font_size': 12,
                'align': 'center',
                'valign': 'vcenter',
                'border': 1,
                'num_format': 'dd/mm/yyyy'
            })
            
            # 4. Formato de Hora (HH:MM - 24h)
            time_format = workbook.add_format({
                'font_size': 12,
                'align': 'center',
                'valign': 'vcenter',
                'border': 1,
                'num_format': 'hh:mm'
            })

            # 5. Formato para SIM (Verde, Negrito, Centralizado) - NOVO: bold=True
            sim_format = workbook.add_format({
                'font_size': 12,
                'bold': True, # Negrito
                'align': 'center',
                'valign': 'vcenter',
                'border': 1,
                'bg_color': '#C6EFCE' # Verde Claro
            })
            
            # 6. Formato para NÃO (Vermelho, Negrito, Centralizado) - NOVO: bold=True
            nao_format = workbook.add_format({
                'font_size': 12,
                'bold': True, # Negrito
                'align': 'center',
                'valign': 'vcenter',
                'border': 1,
                'bg_color': '#FFC7CE' # Vermelho Claro
            })

            # 7. Formato Procedimento (Texto Puro, Quebra de Linha, Alinhado à esquerda)
            proc_format = workbook.add_format({
                'font_size': 12,
                'align': 'left',
                'valign': 'top',
                'border': 1,
                'text_wrap': True,
                'num_format': '@' # CRUCIAL: Define a célula como formato TEXTO puro
            })
            
            # --- APLICAÇÃO DOS FORMATOS ---
            
            col_widths = {
                'Posto': 15,
                'Coleta de imagem?': 18, 
                'Data': 15,
                'Horário de Início': 15,
                'Horário de Término': 15,
                'Procedimento Realizado': 60
            }
            
            for col_num, col_name in enumerate(df.columns):
                width = col_widths.get(col_name, 15)
                sheet.write(0, col_num, col_name, header_format)
                sheet.set_column(col_num, col_num, width) 
                
            # Mapeamento de índices de colunas
            col_data_idx = df.columns.get_loc('Data')
            col_inicio_idx = df.columns.get_loc('Horário de Início')
            col_termino_idx = df.columns.get_loc('Horário de Término')
            col_coleta_idx = df.columns.get_loc('Coleta de imagem?')
            col_proc_idx = df.columns.get_loc('Procedimento Realizado')
            col_posto_idx = df.columns.get_loc('Posto')
            
            
            for row_num, row_data in df.iterrows():
                row_xlsx = row_num + 1 
                
                # 1. Aplicação dos formatos de Data e Hora
                sheet.write(row_xlsx, col_data_idx, row_data['Data'], date_format)
                sheet.write(row_xlsx, col_inicio_idx, row_data['Horário de Início'], time_format)
                sheet.write(row_xlsx, col_termino_idx, row_data['Horário de Término'], time_format)
                
                # 2. Aplicação do formato Condicional (Coleta de imagem?)
                coleta_value = row_data['Coleta de imagem?'] # Já está em caixa alta
                coleta_format = sim_format if coleta_value == 'SIM' else nao_format
                sheet.write(row_xlsx, col_coleta_idx, coleta_value, coleta_format)
                
                # 3. Aplicação do formato Procedimento (Texto Puro, Quebra de Linha)
                sheet.write(row_xlsx, col_proc_idx, row_data['Procedimento Realizado'], proc_format)
                
                # 4. Aplicação do formato padrão
                sheet.write(row_xlsx, col_posto_idx, row_data['Posto'], default_data_format)
                
                for col_idx, col_name in enumerate(df.columns):
                     if col_idx not in [col_data_idx, col_inicio_idx, col_termino_idx, col_coleta_idx, col_proc_idx, col_posto_idx]:
                        sheet.write(row_xlsx, col_idx, row_data[col_name], default_data_format)


    except Exception as e:
        print(f"Erro CRÍTICO na exportação: {e}")
        return "Erro interno ao gerar o arquivo Excel.", 500

    # 3. Salvar e Retornar
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
