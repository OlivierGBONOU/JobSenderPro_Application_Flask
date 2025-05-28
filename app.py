from flask import Flask, render_template, request, jsonify, session, redirect, url_for
import pandas as pd
import smtplib
import re
import os
import base64
import time
import random
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.base import MIMEBase
from email import encoders
from werkzeug.utils import secure_filename
import json

app = Flask(__name__)
app.secret_key = 'jobsender_secret_key_2024'
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max file size

UPLOAD_FOLDER = 'uploads'
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# Configuration SMTP
SMTP_CONFIG = {
    'Gmail': {'server': 'smtp.gmail.com', 'port': 587},
    'Outlook': {'server': 'smtp-mail.outlook.com', 'port': 587},
    'Yahoo': {'server': 'smtp.mail.yahoo.com', 'port': 587}
}

def validate_email(email):
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return re.match(pattern, email) is not None

def markdown_to_html(text):
    if not text:
        return ""
    # Gras
    text = re.sub(r'\*\*(.*?)\*\*', r'<strong>\1</strong>', text)
    # Italique
    text = re.sub(r'\*(.*?)\*', r'<em>\1</em>', text)
    # Surlignage
    text = re.sub(r'==(.*?)==', r'<mark>\1</mark>', text)
    # Retours à la ligne
    text = text.replace('\n', '<br>')
    return text

def substitute_variables(template, row):
    result = template
    for col, value in row.items():
        if pd.notna(value):
            result = result.replace(f'{{{col}}}', str(value))
    return result

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/upload', methods=['POST'])
def upload_file():
    if 'file' not in request.files:
        return jsonify({'error': 'Aucun fichier sélectionné'})
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'Aucun fichier sélectionné'})
    
    if file:
        filename = secure_filename(file.filename)
        filepath = os.path.join(UPLOAD_FOLDER, filename)
        file.save(filepath)
        
        try:
            if filename.endswith('.csv'):
                df = pd.read_csv(filepath)
            else:
                df = pd.read_excel(filepath)
            
            session['data'] = df.to_dict('records')
            session['columns'] = list(df.columns)
            
            return jsonify({
                'success': True,
                'columns': list(df.columns),
                'preview': df.head().to_dict('records'),
                'total_rows': len(df)
            })
        except Exception as e:
            return jsonify({'error': f'Erreur lors du chargement: {str(e)}'})

@app.route('/upload_attachment', methods=['POST'])
def upload_attachment():
    if 'attachment' not in request.files:
        return jsonify({'error': 'Aucun fichier'})
    
    file = request.files['attachment']
    if file.filename == '':
        return jsonify({'error': 'Aucun fichier sélectionné'})
    
    # Vérifier la taille (10MB max)
    file.seek(0, os.SEEK_END)
    file_size = file.tell()
    file.seek(0)
    
    if file_size > 10 * 1024 * 1024:
        return jsonify({'error': 'Fichier trop volumineux (max 10MB)'})
    
    filename = secure_filename(file.filename)
    filepath = os.path.join(UPLOAD_FOLDER, filename)
    file.save(filepath)
    
    if 'attachments' not in session:
        session['attachments'] = []
    
    session['attachments'].append({
        'filename': filename,
        'filepath': filepath,
        'size': file_size
    })
    session.modified = True
    
    return jsonify({'success': True, 'filename': filename, 'size': file_size})

@app.route('/save_config', methods=['POST'])
def save_config():
    data = request.json
    session.update(data)
    session.modified = True
    return jsonify({'success': True})

@app.route('/preview')
def preview_email():
    if 'data' not in session or not session['data']:
        return jsonify({'error': 'Aucune donnée chargée'})
    
    template = session.get('email_template', '')
    row_index = int(request.args.get('row', 0))
    
    if row_index >= len(session['data']):
        return jsonify({'error': 'Index invalide'})
    
    row = session['data'][row_index]
    content = substitute_variables(template, row)
    html_content = markdown_to_html(content)
    
    return jsonify({
        'content': html_content,
        'subject': substitute_variables(session.get('email_subject', ''), row)
    })

@app.route('/send_emails', methods=['POST'])
def send_emails():
    data = request.json
    send_type = data.get('type', 'test')
    
    if 'data' not in session:
        return jsonify({'error': 'Aucune donnée chargée'})
    
    # Configuration SMTP
    smtp_config = {
        'email': session.get('smtp_email'),
        'password': session.get('smtp_password'),
        'provider': session.get('smtp_provider'),
        'server': session.get('smtp_server'),
        'port': session.get('smtp_port')
    }
    
    if not all([smtp_config['email'], smtp_config['password']]):
        return jsonify({'error': 'Configuration SMTP incomplète'})
    
    # Sélection des destinataires
    recipients = []
    email_col = session.get('email_column')
    
    if send_type == 'test':
        recipients = [session['data'][0]] if session['data'] else []
    elif send_type == 'selected':
        selected_indices = data.get('selected', [])
        recipients = [session['data'][i] for i in selected_indices if i < len(session['data'])]
    else:  # mass
        recipients = session['data'][:50]
    
    # Envoi des emails
    sent_count = 0
    errors = []
    
    try:
        # Configuration du serveur SMTP
        if smtp_config['provider'] in SMTP_CONFIG:
            server_config = SMTP_CONFIG[smtp_config['provider']]
        else:
            server_config = {'server': smtp_config['server'], 'port': int(smtp_config['port'])}
        
        server = smtplib.SMTP(server_config['server'], server_config['port'])
        server.starttls()
        server.login(smtp_config['email'], smtp_config['password'])
        
        for i, recipient in enumerate(recipients):
            try:
                email_addr = recipient.get(email_col)
                if not email_addr or not validate_email(email_addr):
                    errors.append(f"Email invalide: {email_addr}")
                    continue
                
                # Créer le message
                msg = MIMEMultipart()
                msg['From'] = smtp_config['email']
                msg['To'] = email_addr
                msg['Subject'] = substitute_variables(session.get('email_subject', ''), recipient)
                
                # Corps du message
                body = substitute_variables(session.get('email_template', ''), recipient)
                html_body = markdown_to_html(body)
                msg.attach(MIMEText(html_body, 'html'))
                
                # Pièces jointes
                if 'attachments' in session:
                    for attachment in session['attachments']:
                        with open(attachment['filepath'], 'rb') as f:
                            part = MIMEBase('application', 'octet-stream')
                            part.set_payload(f.read())
                            encoders.encode_base64(part)
                            part.add_header('Content-Disposition', f'attachment; filename= {attachment["filename"]}')
                            msg.attach(part)
                
                # Envoyer
                server.send_message(msg)
                sent_count += 1
                
                # Délai entre envois
                if send_type == 'mass' and i < len(recipients) - 1:
                    time.sleep(random.randint(4, 10))
                    
            except Exception as e:
                errors.append(f"Erreur pour {email_addr}: {str(e)}")
        
        server.quit()
        
        # Mettre à jour les statistiques
        session['emails_sent'] = session.get('emails_sent', 0) + sent_count
        session.modified = True
        
        return jsonify({
            'success': True,
            'sent': sent_count,
            'errors': errors,
            'total_sent': session.get('emails_sent', 0)
        })
        
    except Exception as e:
        return jsonify({'error': f'Erreur SMTP: {str(e)}'})

@app.route('/stats')
def get_stats():
    if 'data' not in session:
        return jsonify({'error': 'Aucune donnée'})
    
    data = session['data']
    email_col = session.get('email_column')
    sector_col = session.get('sector_column')
    
    stats = {
        'total_companies': len(data),
        'valid_emails': sum(1 for row in data if validate_email(row.get(email_col, ''))),
        'completeness': sum(1 for row in data if all(row.get(col) for col in [email_col, session.get('name_column'), session.get('company_column')] if col)) / len(data) * 100 if data else 0,
        'emails_sent': session.get('emails_sent', 0)
    }
    
    # Répartition par secteur
    sector_data = {}
    if sector_col:
        for row in data:
            sector = row.get(sector_col, 'Non défini')
            sector_data[sector] = sector_data.get(sector, 0) + 1
    
    stats['sector_distribution'] = sector_data
    
    return jsonify(stats)

@app.route('/export_csv')
def export_csv():
    if 'data' not in session:
        return jsonify({'error': 'Aucune donnée'})
    
    df = pd.DataFrame(session['data'])
    filename = 'export_jobsender.csv'
    filepath = os.path.join(UPLOAD_FOLDER, filename)
    df.to_csv(filepath, index=False)
    
    return jsonify({'success': True, 'filename': filename})

@app.route('/clean_emails')
def clean_emails():
    if 'data' not in session:
        return jsonify({'error': 'Aucune donnée'})
    
    email_col = session.get('email_column')
    if not email_col:
        return jsonify({'error': 'Colonne email non définie'})
    
    original_count = len(session['data'])
    session['data'] = [row for row in session['data'] if validate_email(row.get(email_col, ''))]
    session.modified = True
    
    return jsonify({
        'success': True,
        'removed': original_count - len(session['data']),
        'remaining': len(session['data'])
    })

@app.route('/reset')
def reset_data():
    session.clear()
    return jsonify({'success': True})

if __name__ == '__main__':
    app.run(debug=True)