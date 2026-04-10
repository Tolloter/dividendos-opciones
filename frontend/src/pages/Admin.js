import React, { useState, useRef } from 'react';

const REQUIRED_FILES = [
  'Market_View', 'Dividendos', 'Risk', 'Eficiencia',
  'Fundamental', 'Fundamental_2', 'Valoracion', 'Estado',
  'Tecnico', 'Previsiones', 'Previsiones_2', 'Predicciones', 'Predicciones_2'
];

export default function Admin({ onDataUpdated }) {
  const [files, setFiles] = useState([]);
  const [adminKey, setAdminKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState(null);
  const [dragover, setDragover] = useState(false);
  const inputRef = useRef();

  function detectType(name) {
    const n = name.toLowerCase();
    if (n.includes('market_view') || n.includes('market view')) return 'Market_View';
    if (n.includes('fundamental_2') || n.includes('fundamental 2')) return 'Fundamental_2';
    if (n.includes('fundamental')) return 'Fundamental';
    if (n.includes('dividendos')) return 'Dividendos';
    if (n.includes('risk')) return 'Risk';
    if (n.includes('eficiencia')) return 'Eficiencia';
    if (n.includes('valoraci')) return 'Valoracion';
    if (n.includes('estado')) return 'Estado';
    if (n.includes('cnico') || n.includes('tecnico')) return 'Tecnico';
    if (n.includes('previsiones_2') || n.includes('previsiones 2')) return 'Previsiones_2';
    if (n.includes('previsiones')) return 'Previsiones';
    if (n.includes('predicciones_2') || n.includes('predicciones 2')) return 'Predicciones_2';
    if (n.includes('predicciones')) return 'Predicciones';
    return 'Desconocido';
  }

  function onDrop(e) {
    e.preventDefault(); setDragover(false);
    const dropped = Array.from(e.dataTransfer.files).filter(f => f.name.endsWith('.json'));
    setFiles(prev => [...prev, ...dropped]);
  }

  function onSelect(e) {
    const selected = Array.from(e.target.files).filter(f => f.name.endsWith('.json'));
    setFiles(prev => [...prev, ...selected]);
  }

  function removeFile(idx) {
    setFiles(prev => prev.filter((_,i)=>i!==idx));
  }

  async function handleUpload() {
    if (!files.length) { setMsg({type:'error',text:'Añade al menos un archivo Excel'}); return; }
    if (!adminKey) { setMsg({type:'error',text:'Introduce la clave de administrador'}); return; }
    setLoading(true); setMsg(null);
    try {
    const fileText = await files[0].text();
const jsonData = JSON.parse(fileText);
const res = await fetch('/api/upload-json', {
  method: 'POST',
  headers: {
    'X-Admin-Key': adminKey,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(jsonData),
});
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Error al procesar');
      setMsg({type:'success', text:`✅ ${json.companies} empresas procesadas correctamente`});
      onDataUpdated();
      setFiles([]);
    } catch (e) {
      setMsg({type:'error', text:`❌ ${e.message}`});
    } finally {
      setLoading(false);
    }
  }

  const detectedTypes = files.map(f => detectType(f.name));
  const missing = REQUIRED_FILES.filter(r => !detectedTypes.includes(r));

  return (
    <div>
      <div className="header">
        <div className="header-logo">
          <div style={{width:36,height:36,background:'linear-gradient(135deg,#D4A843,#7A5B20)',borderRadius:8,display:'flex',alignItems:'center',justifyContent:'center',fontSize:18}}>⚙️</div>
          <div>
            <div className="header-title">Panel de Administración</div>
            <div className="header-subtitle">Dividendos $ Opciones</div>
          </div>
        </div>
        <a href="/" className="telegram-btn" style={{textDecoration:'none'}}>← Volver al dashboard</a>
      </div>

      <div className="admin-page">
        <div className="admin-card">
          <div className="admin-title">Actualizar Datos Semanales</div>
          <div className="admin-subtitle">
            Sube los 15 archivos Excel de InvestingPro. El sistema procesará el scoring y actualizará el dashboard automáticamente.
          </div>

          {/* Upload zone */}
          <div
            className={`upload-zone ${dragover?'dragover':''}`}
            onDragOver={e=>{e.preventDefault();setDragover(true);}}
            onDragLeave={()=>setDragover(false)}
            onDrop={onDrop}
            onClick={()=>inputRef.current.click()}
          >
            <div className="upload-icon">📂</div>
            <div className="upload-text">Arrastra los Excel aquí o haz clic para seleccionar</div>
            <div className="upload-sub">Acepta archivos .xlsx · Múltiples archivos a la vez</div>
            <input ref={inputRef} type="file" multiple accept=".xlsx" style={{display:'none'}} onChange={onSelect}/>
          </div>

          {/* File list */}
          {files.length > 0 && (
            <div className="file-list">
              {files.map((f,i) => (
                <div className="file-item" key={i}>
                  <span className="file-ok">✓</span>
                  <span style={{flex:1}}>{f.name}</span>
                  <span style={{color:'var(--text-muted)',fontSize:11,marginRight:8}}>
                    → {detectType(f.name)}
                  </span>
                  <span style={{cursor:'pointer',color:'var(--text-muted)'}} onClick={()=>removeFile(i)}>✕</span>
                </div>
              ))}
            </div>
          )}

          {/* Missing files warning */}
          {files.length > 0 && missing.length > 0 && (
            <div style={{padding:'10px 12px',background:'rgba(243,156,18,0.08)',border:'1px solid rgba(243,156,18,0.2)',borderRadius:8,marginBottom:16,fontSize:12,color:'#F39C12'}}>
              ⚠️ Faltan: {missing.join(', ')}
            </div>
          )}

          {/* Admin key */}
          <input
            className="admin-input"
            type="password"
            placeholder="🔑 Clave de administrador"
            value={adminKey}
            onChange={e=>setAdminKey(e.target.value)}
          />

          <button className="btn-primary" onClick={handleUpload} disabled={loading || !files.length}>
            {loading ? '⏳ Procesando...' : `🚀 Procesar ${files.length} archivo${files.length!==1?'s':''}`}
          </button>

          {msg && <div className={`admin-msg ${msg.type}`}>{msg.text}</div>}

          {/* Instructions */}
          <div style={{marginTop:28,padding:16,background:'var(--bg-secondary)',borderRadius:8}}>
            <div style={{fontSize:12,color:'var(--text-secondary)',fontWeight:600,marginBottom:8}}>📋 Instrucciones</div>
            <ol style={{fontSize:12,color:'var(--text-muted)',paddingLeft:16,lineHeight:1.8}}>
              <li>Exporta los 15 archivos desde InvestingPro (tu watchlist "Dividendos")</li>
              <li>Arrastra todos los archivos a la zona de arriba</li>
              <li>Introduce la clave de administrador</li>
              <li>Pulsa "Procesar" y espera el mensaje de confirmación</li>
              <li>El dashboard se actualiza automáticamente para todos los usuarios</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}
