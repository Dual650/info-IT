from flask import Flask, render_template, request, redirect, url_for, send_file, jsonify, flash
from datetime import datetime
from flask_sqlalchemy import SQLAlchemy
import os
import io
import pandas as pd

# --- Opções de Postos de Trabalho ---
POSTOS = [
    "Andradina", "Assis", "Avaré", "Bauru", "Birigui", "Botucatu",
    "Dracena", "Itapetininga", "Itu", "Jahu", "Marília",
    "Ourinhos", "Penápolis", "Presidente Prudente", "Tatuí", "Tupã"
]

# --- NOVAS OPÇÕES DE CAMPOS ---
OPCOES_MESA = [str(i) for i in range(1, 41)] + ["Sala médica", "Exame teórico", "COREN", "Fazenda", "SERT", "Sabesp", "Recepção/Triagem", "Despachante"]
OPCOES_RETAGUARDA_DESTINO = ["COREN", "Poupatempo", "Fazenda", "Sabesp"]


app = Flask(__name__)

# --- Configuração de Segurança e Mensagens Flash ---
app.config['SECRET_KEY'] = 'uma_chave_secreta_muito_forte_e_dificil' 

# --- Configuração do Banco de Dados ---
DATABASE_URL = os.environ.get('DATABASE_URL', 'sqlite:///site.db').replace("postgres://", "postgresql://", 1)
app.config['SQLALCHEMY_DATABASE_URI'] = DATABASE_URL
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db = SQLAlchemy(app)

# --- Definição do Modelo (Tabela) do Banco de Dados ---
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

# Cria as tabelas do banco de dados (Será necessário DELETAR o arquivo 'site.db' local para recriar as tabelas com as novas colunas, se estiver usando SQLite)
with app.app_context():
    # ATENÇÃO: Se estiver usando SQLite localmente (site.db), você precisará deletar o arquivo
    # site.db para que esta linha crie as novas colunas.
    # Em produção, use migrações (Alembic/Flask-Migrate).
    db.create_all()

# --- CONSTANTE para Resumo ---
RESUMO_MAX_CARACTERES = 70 

# Função auxiliar para aplicar filtros
def aplicar_filtros(query, filtro_posto, filtro_data_html, filtro_coleta):
    # A função original não precisa de filtro de mesa ou retaguarda por enquanto
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

# --- Rota 1: Registro de Novo Procedimento (Index) ---
@app.route('/', methods=['GET', 'POST'])
def formulario_registro():
    data_de_hoje = datetime.now().strftime('%d/%m/%Y')
    
    if request.method == 'POST':
        try:
            posto = request.form.get('posto')
            computador_coleta = request.form.get('computador_coleta')
            
            # NOVOS CAMPOS NO POST
            numero_mesa = request.form.get('numero_mesa')
            retaguarda_sim_nao = request.form.get('retaguarda_sim_nao')
            
            # O campo retaguarda_destino só é obrigatório se for 'SIM'
            retaguarda_destino = request.form.get('retaguarda_destino')
            if retaguarda_sim_nao == 'NÃO':
                retaguarda_destino = None # Armazena como NULL/None se a opção for NÃO
            elif retaguarda_sim_nao == 'SIM' and not retaguarda_destino:
                flash('ERRO: Se "Retaguarda?" for SIM, o Destino é obrigatório.', 'danger')
                return redirect(url_for('formulario_registro'))

            hora_inicio = request.form.get('hora_inicio')
            hora_termino = request.form.get('hora_termino')
            procedimento = request.form.get('procedimento')
            
            novo_registro = Registro(
                posto=posto,
                computador_coleta=computador_coleta,
                numero_mesa=numero_mesa,
                retaguarda_sim_nao=retaguarda_sim_nao,
                retaguarda_destino=retaguarda_destino,
                data=data_de_hoje,
                hora_inicio=hora_inicio,
                hora_termino=hora_termino,
                procedimento=procedimento
            )
            db.session.add(novo_registro)
            db.session.commit()
            
            flash('Procedimento registrado com sucesso!', 'success')
            return redirect(url_for('formulario_registro'))
            
        except Exception as e:
            db.session.rollback()
            flash(f'Erro ao registrar procedimento: {e}', 'danger')
            return redirect(url_for('formulario_registro'))

    return render_template(
        'index.html', 
        postos=POSTOS, 
        data_de_hoje=data_de_hoje,
        opcoes_mesa=OPCOES_MESA, # Passa as opções para o template
        opcoes_retaguarda=OPCOES_RETAGUARDA_DESTINO
    )

# --- Rota 2: Consulta de Registros Antigos ---
@app.route('/consultar', methods=['GET'])
def consultar_registro():
    filtro_posto = request.args.get('posto')
    filtro_data_html = request.args.get('data')
    filtro_coleta = request.args.get('coleta')

    return render_template(
        'consultar.html', 
        postos=POSTOS, 
        filtro_posto=filtro_posto or 'Todos', 
        filtro_data=filtro_data_html,
        filtro_coleta=filtro_coleta or 'Todos'
    )

# --- Rota: Retorna os dados em JSON para o JavaScript ---
@app.route('/registros_json', methods=['GET'])
def registros_json():
    filtro_posto = request.args.get('posto')
    filtro_data_html = request.args.get('data')
    filtro_coleta = request.args.get('coleta')

    query = Registro.query
    query = aplicar_filtros(query, filtro_posto, filtro_data_html, filtro_coleta)
    registros = query.all()

    registros_formatados = []
    for r in registros:
        
        procedimento_completo = r.procedimento
        procedimento_resumo = procedimento_completo
        if len(procedimento_completo) > RESUMO_MAX_CARACTERES:
            procedimento_resumo = procedimento_completo[:RESUMO_MAX_CARACTERES] + '...'
            
        # FORMATO DE EXIBIÇÃO PARA CONSULTA: "Retaguarda Poupatempo" ou "NÃO"
        if r.retaguarda_sim_nao == 'SIM' and r.retaguarda_destino:
            retaguarda_display = f"Retaguarda {r.retaguarda_destino}"
        else:
            retaguarda_display = "NÃO" # Se não é SIM, exibe NÃO
            
        registros_formatados.append({
            'posto': r.posto,
            'computador_coleta': r.computador_coleta,
            'numero_mesa': r.numero_mesa,
            'retaguarda_display': retaguarda_display, # AGORA COM O NOVO FORMATO
            'data': r.data,
            'hora_inicio': r.hora_inicio,
            'hora_termino': r.hora_termino,
            'procedimento_resumo': procedimento_resumo, 
            'procedimento_completo': procedimento_completo,
            'id': r.id
        })

    return jsonify(registros_formatados)


# --- Rota: Apagar um Registro Individual (POST) ---
@app.route('/apagar/<int:id>', methods=['POST'])
def apagar_registro(id):
    registro_a_apagar = Registro.query.get_or_404(id)
    try:
        db.session.delete(registro_a_apagar)
        db.session.commit()
        flash(f'Registro ID {id} de {registro_a_apagar.posto} apagado com sucesso!', 'success')
    except Exception as e:
        db.session.rollback()
        flash(f'Erro ao apagar registro {id}: {e}', 'danger')
        
    return redirect(url_for('consultar_registro'))


# --- Rota: Apagar TODOS os Registros (CRÍTICO - POST com Senha) ---
@app.route('/apagar_todos', methods=['POST'])
def apagar_todos_registros():
    senha_digitada = request.form.get('senha_confirmacao')
    SENHA_MESTRA = "PPT.123" 

    if senha_digitada != SENHA_MESTRA:
        flash('ERRO: Senha incorreta. A exclusão em massa foi cancelada.', 'danger')
        
        filtro_posto = request.form.get('posto_filtro_hidden')
        filtro_data = request.form.get('data_filtro_hidden')
        filtro_coleta = request.form.get('coleta_filtro_hidden')
        
        url_retorno = url_for('consultar_registro', posto=filtro_posto, data=filtro_data, coleta=filtro_coleta)
        return redirect(url_retorno)


    try:
        num_registros_apagados = db.session.query(Registro).delete()
        db.session.commit()
        
        flash(f'SUCESSO: {num_registros_apagados} registros foram APAGADOS permanentemente!', 'warning')
        return redirect(url_for('consultar_registro'))
    except Exception as e:
        db.session.rollback()
        flash(f'Erro CRÍTICO ao apagar todos os registros: {e}', 'danger')
        return redirect(url_for('consultar_registro'))


# --- Rota: Exportar para XLSX ---
@app.route('/exportar', methods=['GET'])
def exportar_registros():
    filtro_posto = request.args.get('posto')
    filtro_data_html = request.args.get('data')
    filtro_coleta = request.args.get('coleta')

    query = Registro.query
    query = aplicar_filtros(query, filtro_posto, filtro_data_html, filtro_coleta)
    registros = query.all()

    if not registros:
        flash('Não há registros para exportar com os filtros selecionados.', 'danger')
        return redirect(url_for('consultar_registro'))

    dados = []
    for r in registros:
        
        # Lógica de formatação para a exportação (Novo requisito)
        if r.retaguarda_sim_nao == 'SIM' and r.retaguarda_destino:
            retaguarda_export = f"Retaguarda {r.retaguarda_destino}"
        else:
            retaguarda_export = "NÃO"
        
        data_obj = r.data
        inicio_obj = r.hora_inicio
        termino_obj = r.hora_termino
        
        try:
            data_obj = datetime.strptime(r.data, '%d/%m/%Y').date()
        except ValueError:
            pass
            
        try:
            inicio_obj = datetime.strptime(r.hora_inicio, '%H:%M').time()
        except ValueError:
            pass 
            
        try:
            termino_obj = datetime.strptime(r.hora_termino, '%H:%M').time()
        except ValueError:
            pass 

        dados.append({
            'Posto': r.posto,
            'Nº da Mesa': r.numero_mesa,
            'Retaguarda': retaguarda_export, # Coluna única e formatada
            'Coleta de imagem?': r.computador_coleta.upper(),  
            'Data': data_obj,
            'Horário de Início': inicio_obj, 
            'Horário de Término': termino_obj,
            'Procedimento Realizado': r.procedimento
        })

    df = pd.DataFrame(dados)

    output = io.BytesIO()
    
    try:
        with pd.ExcelWriter(output, engine='xlsxwriter') as writer:
            df.to_excel(writer, index=False, sheet_name='Registros Técnicos')
            workbook = writer.book
            sheet = writer.sheets['Registros Técnicos']
            
            # Formatos 
            header_format = workbook.add_format({'bold': True, 'font_size': 14, 'align': 'center', 'valign': 'vcenter', 'border': 1, 'bg_color': '#D3D3D3'})
            default_data_format = workbook.add_format({'font_size': 12, 'align': 'center', 'valign': 'vcenter', 'border': 1})
            date_format = workbook.add_format({'font_size': 12, 'align': 'center', 'valign': 'vcenter', 'border': 1, 'num_format': 'dd/mm/yyyy'})
            time_format = workbook.add_format({'font_size': 12, 'align': 'center', 'valign': 'vcenter', 'border': 1, 'num_format': 'hh:mm'})
            sim_format = workbook.add_format({'font_size': 12, 'bold': True, 'align': 'center', 'valign': 'vcenter', 'border': 1, 'bg_color': '#C6EFCE'})
            nao_format = workbook.add_format({'font_size': 12, 'bold': True, 'align': 'center', 'valign': 'vcenter', 'border': 1, 'bg_color': '#FFC7CE'})
            proc_format = workbook.add_format({'font_size': 12, 'align': 'left', 'valign': 'top', 'border': 1, 'text_wrap': True, 'num_format': '@'})

            # --- APLICAÇÃO DOS FORMATOS ---
            col_widths = {
                'Posto': 15, 'Nº da Mesa': 10, 'Retaguarda': 25, 
                'Coleta de imagem?': 18, 'Data': 15,
                'Horário de Início': 15, 'Horário de Término': 15, 'Procedimento Realizado': 60
            }
            
            for col_num, col_name in enumerate(df.columns):
                width = col_widths.get(col_name, 15)
                sheet.write(0, col_num, col_name, header_format)
                sheet.set_column(col_num, col_num, width) 
                
            # Mapeamento das colunas por nome (mais seguro)
            cols_to_format = {name: df.columns.get_loc(name) for name in df.columns}
            
            for row_num, row_data in df.iterrows():
                row_xlsx = row_num + 1 
                
                # Aplica formatos específicos
                sheet.write(row_xlsx, cols_to_format['Data'], row_data['Data'], date_format)
                sheet.write(row_xlsx, cols_to_format['Horário de Início'], row_data['Horário de Início'], time_format)
                sheet.write(row_xlsx, cols_to_format['Horário de Término'], row_data['Horário de Término'], time_format)
                sheet.write(row_xlsx, cols_to_format['Procedimento Realizado'], row_data['Procedimento Realizado'], proc_format)
                
                # Formato para Coleta?
                coleta_value = row_data['Coleta de imagem?']
                coleta_format = sim_format if coleta_value == 'SIM' else nao_format
                sheet.write(row_xlsx, cols_to_format['Coleta de imagem?'], coleta_value, coleta_format)
                
                # Formato para Retaguarda
                retaguarda_value = row_data['Retaguarda']
                retaguarda_format = sim_format if 'Retaguarda' in retaguarda_value else nao_format
                sheet.write(row_xlsx, cols_to_format['Retaguarda'], retaguarda_value, retaguarda_format)

                # Formato padrão para as demais colunas
                for col_idx, col_name in enumerate(df.columns):
                    if col_name not in ['Data', 'Horário de Início', 'Horário de Término', 'Procedimento Realizado', 'Coleta de imagem?', 'Retaguarda']:
                        sheet.write(row_xlsx, col_idx, row_data[col_name], default_data_format)


    except Exception as e:
        print(f"Erro CRÍTICO na exportação: {e}")
        flash("Erro interno ao gerar o arquivo Excel. Verifique o log.", 'danger')
        return redirect(url_for('consultar_registro'))

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
