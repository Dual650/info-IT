from flask import send_file, flash, redirect, url_for
from datetime import datetime
import pandas as pd
import io

from config import aplicar_filtros
from models import Registro

def exportar_registros_para_excel(filtro_posto, filtro_data_html, filtro_coleta):
    """
    Função principal para buscar, formatar e exportar registros para um arquivo XLSX.
    """
    query = Registro.query
    query = aplicar_filtros(query, filtro_posto, filtro_data_html, filtro_coleta)
    registros = query.all()

    if not registros:
        flash('Não há registros para exportar com os filtros selecionados.', 'danger')
        return redirect(url_for('consultar_registro'))

    dados = []
    for r in registros:
        
        # 1. Formatação da Retaguarda para a planilha
        if r.retaguarda_sim_nao == 'SIM' and r.retaguarda_destino:
            retaguarda_export = f"Retaguarda {r.retaguarda_destino}"
        else:
            retaguarda_export = "NÃO"
        
        # 2. Tentativa de conversão para objetos Date/Time do Python (melhor para formatação no Excel)
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
            'Retaguarda': retaguarda_export, 
            'Coleta de imagem?': r.computador_coleta.upper(),
            'Data': data_obj,
            'Horário de Início': inicio_obj,
            'Horário de Término': termino_obj,
            'Procedimento Realizado': r.procedimento
        })

    df = pd.DataFrame(dados)
    output = io.BytesIO()
    
    try:
        # A lógica de formatação do Excel está mantida aqui, pois é parte integrante da exportação
        with pd.ExcelWriter(output, engine='xlsxwriter') as writer:
            df.to_excel(writer, index=False, sheet_name='Registros Técnicos')
            workbook = writer.book
            sheet = writer.sheets['Registros Técnicos']
            
            # Formatos de Célula
            header_format = workbook.add_format({'bold': True, 'font_size': 14, 'align': 'center', 'valign': 'vcenter', 'border': 1, 'bg_color': '#D3D3D3'})
            default_data_format = workbook.add_format({'font_size': 12, 'align': 'center', 'valign': 'vcenter', 'border': 1})
            date_format = workbook.add_format({'font_size': 12, 'align': 'center', 'valign': 'vcenter', 'border': 1, 'num_format': 'dd/mm/yyyy'})
            time_format = workbook.add_format({'font_size': 12, 'align': 'center', 'valign': 'vcenter', 'border': 1, 'num_format': 'hh:mm'})
            sim_format = workbook.add_format({'font_size': 12, 'bold': True, 'align': 'center', 'valign': 'vcenter', 'border': 1, 'bg_color': '#C6EFCE'})
            nao_format = workbook.add_format({'font_size': 12, 'bold': True, 'align': 'center', 'valign': 'vcenter', 'border': 1, 'bg_color': '#FFC7CE'})
            proc_format = workbook.add_format({'font_size': 12, 'align': 'left', 'valign': 'top', 'border': 1, 'text_wrap': True, 'num_format': '@'})

            # Definição de Larguras e Aplicação de Formatos
            col_widths = {
                'Posto': 15, 'Nº da Mesa': 10, 'Retaguarda': 25,
                'Coleta de imagem?': 18, 'Data': 15,
                'Horário de Início': 15, 'Horário de Término': 15, 'Procedimento Realizado': 60
            }
            
            for col_num, col_name in enumerate(df.columns):
                width = col_widths.get(col_name, 15)
                sheet.write(0, col_num, col_name, header_format)
                sheet.set_column(col_num, col_num, width)
                
            cols_to_format = {name: df.columns.get_loc(name) for name in df.columns}
            
            for row_num, row_data in df.iterrows():
                row_xlsx = row_num + 1
                
                # Aplica formatos específicos
                sheet.write(row_xlsx, cols_to_format['Data'], row_data['Data'], date_format)
                sheet.write(row_xlsx, cols_to_format['Horário de Início'], row_data['Horário de Início'], time_format)
                sheet.write(row_xlsx, cols_to_format['Horário de Término'], row_data['Horário de Término'], time_format)
                sheet.write(row_xlsx, cols_to_format['Procedimento Realizado'], row_data['Procedimento Realizado'], proc_format)
                
                # --- CORREÇÃO AQUI: Formato condicional APENAS para Coleta de imagem? ---
                coleta_value = row_data['Coleta de imagem?']
                coleta_format = sim_format if coleta_value == 'SIM' else nao_format
                sheet.write(row_xlsx, cols_to_format['Coleta de imagem?'], coleta_value, coleta_format)
                
                # Formato padrão para Retaguarda
                retaguarda_value = row_data['Retaguarda']
                # Retaguarda agora usa o formato padrão de dados
                sheet.write(row_xlsx, cols_to_format['Retaguarda'], retaguarda_value, default_data_format)

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
