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
# O init_db lida com db.init_app(app) e db.create_all() dentro do contexto
init_db(app) 
# -----------------------------------

# --- Rota 1: Registro de Novo Procedimento (Index) ---
@app.route('/', methods=['GET', 'POST'])
def formulario_registro():
# ... (Corpo da função formulario_registro)
# ...

# --- Rota 2: Consulta de Registros Antigos ---
@app.route('/consultar', methods=['GET'])
def consultar_registro():
# ... (Corpo da função consultar_registro)
# ...

# --- Rota: Retorna os dados em JSON para o JavaScript ---
@app.route('/registros_json', methods=['GET'])
def registros_json():
# ... (Corpo da função registros_json)
# ...

# --- Rota: Editar Ação Realizada (AJAX POST) ---
@app.route('/editar_procedimento/<int:registro_id>', methods=['POST'])
def editar_procedimento(registro_id):
# ... (Corpo da função editar_procedimento)
# ...

# --- Rota: Apagar um Registro Individual (POST) ---
@app.route('/apagar/<int:id>', methods=['POST'])
def apagar_registro(id):
# ... (Corpo da função apagar_registro)
# ...

# --- Rota: Apagar TODOS os Registros (CRÍTICO - POST com Senha) ---
@app.route('/apagar_todos', methods=['POST'])
def apagar_todos_registros():
# ... (Corpo da função apagar_todos_registros)
# ...

# --- Rota: Exportar para XLSX (Usa a função de export.py) ---
@app.route('/exportar', methods=['GET'])
def exportar_registros():
# ... (Corpo da função exportar_registros)
# ...


# --- Início do bloco de execução principal (Linha 29 do log) ---
if __name__ == '__main__':
    # O Gunicorn ignora este bloco, ele é só para o ambiente de desenvolvimento.
    app.run(debug=True)
