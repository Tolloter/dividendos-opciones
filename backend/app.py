from flask import Flask, request, jsonify
from flask_cors import CORS
import pandas as pd
import numpy as np
import json
import os
from werkzeug.utils import secure_filename
from scoring import process_files

app = Flask(__name__)
CORS(app, resources={r"/api/*": {
    "origins": ["https://dividendos-opciones.vercel.app",
                "https://dividendos-opciones-*.vercel.app",
                "http://localhost:3000"],
    "methods": ["GET", "POST", "OPTIONS"],
    "allow_headers": ["Content-Type", "X-Admin-Key"]
}})

UPLOAD_FOLDER = 'uploads'
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['MAX_CONTENT_LENGTH'] = 50 * 1024 * 1024  # 50MB

# Store latest results in memory (replace with DB for production)
latest_data = {"companies": [], "updated_at": None, "stats": {}}

SECTOR_MAP = {
    'ABM':'Industriales','ABT':'Salud / Farma','ADP':'Servicios Prof.',
    'AGCO':'Industriales','ALG':'Industriales','AROW':'Bancos',
    'ASB':'Bancos','AWR':'Utilities','BALL':'Materiales',
    'BDX':'Salud / Farma','BF.B':'Consumo Básico','BKH':'Utilities',
    'CBSH':'Bancos','CHE':'Salud / Farma','CI':'Salud / Farma',
    'CLX':'Consumo Básico','CMCSA':'Comunicación','CPK':'Utilities',
    'CVS':'Salud / Farma','CWT':'Utilities','DHI':'Consumo Discrecional',
    'DHR':'Salud / Farma','ELS':'Real Estate','EMN':'Materiales',
    'ES':'Utilities','EXR':'Real Estate','FDS':'Servicios Prof.',
    'FLO':'Consumo Básico','FMNB':'Bancos','FRME':'Bancos',
    'FULT':'Bancos','GABC':'Bancos','GIS':'Consumo Básico',
    'GPC':'Consumo Discrecional','GS':'Bancos','GTY':'Real Estate',
    'HD':'Consumo Discrecional','HRL':'Consumo Básico','HSY':'Consumo Básico',
    'HTO':'Utilities','HUM':'Salud / Farma','HWC':'Bancos',
    'JBSS':'Consumo Básico','JKHY':'Tecnología','KMB':'Consumo Básico',
    'LOW':'Consumo Discrecional','LZB':'Consumo Discrecional','MAA':'Real Estate',
    'MAS':'Industriales','MDT':'Salud / Farma','MGA':'Consumo Discrecional',
    'MKC':'Consumo Básico','MTB':'Bancos','MZTI':'Industriales',
    'NBTB':'Bancos','NJR':'Utilities','NKE':'Consumo Discrecional',
    'NWN':'Utilities','OMC':'Servicios Prof.','OXM':'Consumo Discrecional',
    'PAYX':'Servicios Prof.','PEBO':'Bancos','PEP':'Consumo Básico',
    'PFE':'Salud / Farma','PII':'Consumo Discrecional','PPG':'Materiales',
    'PSA':'Real Estate','RF':'Bancos','RGCO':'Utilities',
    'RHI':'Servicios Prof.','RNST':'Bancos','ROP':'Tecnología',
    'SGC':'Consumo Discrecional','SWK':'Industriales','TGT':'Consumo Discrecional',
    'TMO':'Salud / Farma','TMP':'Bancos','TNC':'Industriales',
    'TROW':'Asset Managers','TSN':'Consumo Básico','TTC':'Industriales',
    'TU':'Comunicación','UFPI':'Industriales','UGI':'Utilities',
    'UNH':'Salud / Farma','UVV':'Consumo Básico','WAFD':'Bancos',
    'WASH':'Bancos','WTRG':'Utilities',
}

@app.route('/api/health', methods=['GET'])
def health():
    return jsonify({"status": "ok"})

@app.route('/api/upload', methods=['POST'])
def upload_files():
    """Admin endpoint to upload InvestingPro Excel files"""
    admin_key = request.headers.get('X-Admin-Key', '')
    if admin_key != os.environ.get('ADMIN_KEY', 'dividendos2026'):
        return jsonify({"error": "Unauthorized"}), 401

    files = request.files.getlist('files')
    if not files:
        return jsonify({"error": "No files provided"}), 400

    saved = []
    for f in files:
        if f.filename.endswith('.xlsx'):
            filename = secure_filename(f.filename)
            f.save(os.path.join(app.config['UPLOAD_FOLDER'], filename))
            saved.append(filename)

    if not saved:
        return jsonify({"error": "No valid xlsx files"}), 400

    # Process
    try:
        results = process_files(app.config['UPLOAD_FOLDER'], SECTOR_MAP)
        global latest_data
        latest_data = results
        return jsonify({"success": True, "companies": len(results['companies']), "saved": saved})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/data', methods=['GET'])
def get_data():
    """Public endpoint - returns all company data"""
    return jsonify(latest_data)

@app.route('/api/sectors', methods=['GET'])
def get_sectors():
    """Returns list of available sectors"""
    if not latest_data['companies']:
        return jsonify([])
    sectors = sorted(list(set(c['sector'] for c in latest_data['companies'] if c['sector'] != 'N/D')))
    return jsonify(sectors)

if __name__ == '__main__':
    app.run(debug=False, host='0.0.0.0', port=5000)
