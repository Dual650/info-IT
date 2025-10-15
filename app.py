from flask import Flask, render_template, request, redirect, url_for, jsonify, flash
from datetime import datetime

# Importações dos novos arquivos
from config import POSTOS, OPCOES_MESA, OPCOES_RETAGUARDA_DESTINO, RESUMO_MAX_CARACTERES, SENHA_MESTRA, aplicar_filtros
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
    # Formatando a data de hoje no padrão DD/MM/AAAA para o banco de dados
    data_de_hoje = datetime.now().strftime('%d/%m/%Y')
    
    if request.method == 'POST':
        try:
            posto = request.form.get('posto')
            computador_coleta = request.form.get('computador_coleta')
            
            numero_mesa = request.form.get('numero_mesa')
            retaguarda_sim_nao = request.form.get('retaguarda_sim_nao')
            
            retaguarda_destino = request.form.get('retaguarda_destino')
            if retaguarda_sim_nao == 'NÃO':
                retaguarda_destino = None
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
            
            # ALTERAÇÃO: Redireciona de volta para a mesma página, limpando o formulário.
            flash('Procedimento registrado com sucesso! Você pode consultar o registro agora.', 'success')
            return redirect(url_for('formulario_registro'))
            
        except Exception as e:
            db.session.rollback()
            flash(f'Erro ao registrar procedimento: {e}', 'danger')
            return redirect(url_for('formulario_registro'))

    return render_template(
        'index.html', 
        postos=POSTOS, 
        data_de_hoje=data_de_hoje,
        opcoes_mesa=OPCOES_MESA, 
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
    
    # CORREÇÃO: Ordenar por ID de forma decrescente para garantir que os mais recentes apareçam primeiro.
    registros = query.order_by(Registro.id.desc()).all()

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
            retaguarda_display = "NÃO"
            
        registros_formatados.append({
            'posto': r.posto,
            'computador_coleta': r.computador_coleta,
            'numero_mesa': r.numero_mesa,
            'retaguarda_display': retaguarda_display,
            'data': r.data,
            'hora_inicio': r.hora_inicio,
            'hora_termino': r.hora_termino,
            'procedimento_resumo': procedimento_resumo,
            'procedimento_completo': procedimento_completo,
            'id': r.id
        })

    return jsonify(registros_formatados)


# --- Rota: Editar Ação Realizada (AJAX POST) ---
@app.route('/editar_procedimento/<int:registro_id>', methods=['POST'])
def editar_procedimento(registro_id):
    # 1. Tenta receber os dados JSON do frontend
    try:
        data = request.get_json()
        novo_procedimento = data.get('procedimento_completo')
        
        if not novo_procedimento:
            return jsonify({'success': False, 'message': 'Procedimento não fornecido.'}), 400
            
    except Exception as e:
        print(f"Erro ao processar JSON: {e}")
        return jsonify({'success': False, 'message': 'Formato de dado inválido.'}), 400

    # 2. Conecta ao banco de dados e atualiza o campo
    try:
        registro = Registro.query.get(registro_id)
        if not registro:
            return jsonify({'success': False, 'message': 'Registro não encontrado.'}), 404

        registro.procedimento = novo_procedimento
        db.session.commit()
        
        # 3. Retorna sucesso para o JavaScript
        return jsonify({'success': True, 'message': 'Registro atualizado com sucesso!'}), 200

    except Exception as e:
        db.session.rollback()
        print(f"Erro durante a atualização do BD (ID: {registro_id}): {e}")
        return jsonify({'success': False, 'message': 'Erro interno do servidor ao atualizar o BD.'}), 500


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


# --- Rota: Exportar para XLSX (Usa a função de export.py) ---
@app.route('/exportar', methods=['GET'])
def exportar_registros():
    filtro_posto = request.args.get('posto')
    filtro_data_html = request.args.get('data')
    filtro_coleta = request.args.get('coleta')

    return exportar_registros_para_excel(filtro_posto, filtro_data_html, filtro_coleta)


if __name__ == '__main__':
    # Cria as tabelas do BD, caso não existam
    with app.app_context():
        db.create_all()
        
    app.run(debug=True)
