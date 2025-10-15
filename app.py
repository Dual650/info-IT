from flask import Flask, render_template, request, redirect, url_for, jsonify, flash
from datetime import datetime
from sqlalchemy import desc

# Importações dos arquivos de configuração e modelo
# Importa todas as listas de opções do seu config.py
from config import POSTOS, OPCOES_LOCAIS, OPCOES_RETAGUARDA_DESTINO, OPCOES_SETORES_INTERNOS, OPCOES_MESA_ATENDIMENTO, RESUMO_MAX_CARACTERES, SENHA_MESTRA, aplicar_filtros 
from models import db, Registro, init_db
from export import exportar_registros_para_excel

app = Flask(__name__)

# --- Configuração de Segurança ---
app.config['SECRET_KEY'] = 'uma_chave_secreta_muito_forte_e_dificil'

# --- Inicialização do Banco de Dados ---
# Configura e conecta o objeto 'db' ao aplicativo 'app'
init_db(app) 
# -----------------------------------

# --- Rota 1: Registro de Novo Procedimento (Index) ---
@app.route('/', methods=['GET', 'POST'])
def formulario_registro():
    # Formata a data de hoje no padrão DD/MM/AAAA para o banco de dados
    data_de_hoje = datetime.now().strftime('%d/%m/%Y')
    
    if request.method == 'POST':
        try:
            posto = request.form.get('posto')
            computador_coleta = request.form.get('computador_coleta')
            
            # 1. Lógica de Consolidação: MESA/LOCAL (Salva em 'numero_mesa' no DB)
            mesa_sim_nao = request.form.get('mesa_sim_nao')
            
            # Se for SIM, o valor é o 'numero_mesa' (ex: "1", "35")
            if mesa_sim_nao == 'SIM':
                numero_mesa_final = request.form.get('numero_mesa')
                if not numero_mesa_final:
                    flash('ERRO: Se "Mesa?" é SIM, o Número da Mesa é obrigatório.', 'danger')
                    return redirect(url_for('formulario_registro'))
            
            # Se for NÃO, o valor é o 'local' (ex: "Sala médica")
            else: # mesa_sim_nao == 'NÃO'
                numero_mesa_final = request.form.get('local')
                if not numero_mesa_final:
                    flash('ERRO: Se "Mesa?" é NÃO, o Local é obrigatório.', 'danger')
                    return redirect(url_for('formulario_registro'))
                
            # 2. Lógica de Consolidação: RETAGUARDA (Salva em 'retaguarda_destino' no DB)
            retaguarda_sim_nao = request.form.get('retaguarda_sim_nao')
            
            # Se for SIM, o valor é o 'retaguarda_destino' (ex: "COREN", "Poupatempo")
            if retaguarda_sim_nao == 'SIM':
                retaguarda_destino_final = request.form.get('retaguarda_destino')
                if not retaguarda_destino_final:
                    flash('ERRO: Se "Retaguarda?" é SIM, o Destino (Órgão) é obrigatório.', 'danger')
                    return redirect(url_for('formulario_registro'))
            
            # Se for NÃO, o valor é o 'retaguarda_setor' (ex: "RH", "Financeiro")
            else: # retaguarda_sim_nao == 'NÃO'
                retaguarda_destino_final = request.form.get('retaguarda_setor')
                if not retaguarda_destino_final:
                    flash('ERRO: Se "Retaguarda?" é NÃO, o Setor Interno é obrigatório.', 'danger')
                    return redirect(url_for('formulario_registro'))

            hora_inicio = request.form.get('hora_inicio')
            hora_termino = request.form.get('hora_termino')
            procedimento = request.form.get('procedimento')
            
            novo_registro = Registro(
                posto=posto,
                computador_coleta=computador_coleta,
                numero_mesa=numero_mesa_final, # Consolidado (Mesa ou Local)
                retaguarda_sim_nao=retaguarda_sim_nao,
                retaguarda_destino=retaguarda_destino_final, # Consolidado (Destino ou Setor)
                data=data_de_hoje,
                hora_inicio=hora_inicio,
                hora_termino=hora_termino,
                procedimento=procedimento
                # timestamp_registro é preenchido automaticamente pelo models.py
            )
            db.session.add(novo_registro)
            db.session.commit()
            
            flash('Procedimento registrado com sucesso! Você pode consultar o registro agora.', 'success')
            return redirect(url_for('formulario_registro'))
            
        except Exception as e:
            db.session.rollback()
            flash(f'Erro ao registrar procedimento: {e}', 'danger')
            return redirect(url_for('formulario_registro'))

    # PASSAGEM DE DADOS DO CONFIG PARA O TEMPLATE
    return render_template(
        'index.html', 
        postos=POSTOS, 
        data_de_hoje=data_de_hoje,
        opcoes_locais=OPCOES_LOCAIS,
        opcoes_retaguarda=OPCOES_RETAGUARDA_DESTINO,
        opcoes_setores=OPCOES_SETORES_INTERNOS,
        # Usa a lista OPCOES_MESA_ATENDIMENTO do seu config.py
        numeros_mesa=OPCOES_MESA_ATENDIMENTO 
    )

# --- Rota 2: Consulta de Registros Antigos (Inalterada da correção anterior) ---
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

# --- Rota: Retorna os dados em JSON para o JavaScript (Inalterada da correção anterior) ---
@app.route('/registros_json', methods=['GET'])
def registros_json():
    filtro_posto = request.args.get('posto')
    filtro_data_html = request.args.get('data')
    filtro_coleta = request.args.get('coleta')

    # Reordenar por timestamp_registro de forma descendente (mais recente primeiro)
    query = Registro.query.order_by(desc(Registro.timestamp_registro))
    query = aplicar_filtros(query, filtro_posto, filtro_data_html, filtro_coleta)
    
    registros = query.all()

    registros_formatados = []
    for r in registros:
        
        # 1. Coluna MESA/LOCAL (3ª Coluna)
        if r.computador_coleta == 'SIM':
            mesa_display = f"{r.numero_mesa} - Coleta de imagem" 
        elif r.numero_mesa.isdigit():
            mesa_display = f"Mesa {r.numero_mesa}"
        else:
            mesa_display = r.numero_mesa 
            
        # 2. Coluna RETAGUARDA? (4ª Coluna)
        if r.retaguarda_sim_nao == 'SIM':
            retaguarda_display = f"Retaguarda {r.retaguarda_destino}"
        else:
            retaguarda_display = f"Não ({r.retaguarda_destino})" 

        # 3. Coluna PROCEDIMENTO REALIZADO (Resumo, 7ª Coluna)
        procedimento_completo = r.procedimento
        procedimento_resumo = procedimento_completo
        if len(procedimento_completo) > RESUMO_MAX_CARACTERES:
            procedimento_resumo = procedimento_completo[:RESUMO_MAX_CARACTERES] + '...'
            
        registros_formatados.append({
            'id': r.id,
            'posto': r.posto,
            'data': r.data, 
            'mesa_display': mesa_display,
            'retaguarda_display': retaguarda_display,
            'hora_inicio': r.hora_inicio,
            'hora_termino': r.hora_termino,
            'procedimento_resumo': procedimento_resumo,
            'procedimento_completo': procedimento_completo,
            'computador_coleta': r.computador_coleta, 
            'retaguarda_sim_nao': r.retaguarda_sim_nao
        })

    return jsonify(registros_formatados)


# --- Rotas de Ação (Apagar, Editar, Exportar - Inalteradas) ---
@app.route('/editar_procedimento/<int:registro_id>', methods=['POST'])
def editar_procedimento(registro_id):
    try:
        data = request.get_json()
        novo_procedimento = data.get('procedimento_completo')
        
        if not novo_procedimento:
            return jsonify({'success': False, 'message': 'Procedimento não fornecido.'}), 400

        registro = Registro.query.get(registro_id)
        if not registro:
            return jsonify({'success': False, 'message': 'Registro não encontrado.'}), 404

        registro.procedimento = novo_procedimento
        db.session.commit()
        
        procedimento_resumo = novo_procedimento
        if len(novo_procedimento) > RESUMO_MAX_CARACTERES:
            procedimento_resumo = novo_procedimento[:RESUMO_MAX_CARACTERES] + '...'

        return jsonify({'success': True, 'message': 'Registro atualizado com sucesso!', 'novo_resumo': procedimento_resumo}), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': 'Erro interno do servidor ao atualizar o BD.'}), 500

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
        
    filtro_posto = request.args.get('posto')
    filtro_data = request.args.get('data')
    filtro_coleta = request.args.get('coleta')
    return redirect(url_for('consultar_registro', posto=filtro_posto, data=filtro_data, coleta=filtro_coleta))

@app.route('/apagar_todos', methods=['POST'])
def apagar_todos_registros():
    senha_digitada = request.form.get('senha_confirmacao')

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

@app.route('/exportar', methods=['GET'])
def exportar_registros():
    filtro_posto = request.args.get('posto')
    filtro_data_html = request.args.get('data')
    filtro_coleta = request.args.get('coleta')

    return exportar_registros_para_excel(filtro_posto, filtro_data_html, filtro_coleta)


if __name__ == '__main__':
    with app.app_context():
        db.create_all() 
        
    app.run(debug=True)
