import React, { useState, useMemo } from 'react';
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis,
  Tooltip, ResponsiveContainer
} from 'recharts';

const TIER_COLORS = { 1: '#2ECC71', 2: '#F39C12', 3: '#E67E22', 4: '#E74C3C' };
const TIER_LABELS = { 1: 'TIER 1', 2: 'TIER 2', 3: 'TIER 3', 4: 'TIER 4' };

const COLUMN_GROUPS = {
  'Identificación': ['ticker','nombre','sector','precio'],
  'Acción': ['accion','estrategia','recomend','score_total','tier'],
  'Scoring': ['score_base','bonus','desglose','strike10','strike5'],
  'Valoración': ['ip_label','fwd_pe','pe_ttm','ev_ebitda','pfcf','peg','pb'],
  'Calidad': ['gross_pct','op_pct','net_pct','roic5y','roe5y','roa10y','piotroski','ebitda_pct','fcl_pct'],
  'Salud': ['dcap','cob_int','altman','beneish','sloan','payout_fcl'],
  'Dividendo': ['yield_pct','dps','cagr3y','cagr10y','chowder','yield_med10y','tend_div','weiss_pct','weiss_signal','div_anos'],
  'Riesgo': ['beta','rsi','vol30','vol90','ret_52w'],
  'Técnico': ['senal_tec','earnings_d','mm200','mm50','atr','adx'],
  'IP Health': ['ip_score','ip_fcaja','ip_crec','ip_benef','ip_mom'],
};

const COL_LABELS = {
  ticker:'Ticker',nombre:'Nombre',sector:'Sector',precio:'Precio',
  accion:'Acción Ahora',estrategia:'Estrategia',recomend:'Recomend.',
  score_total:'Score Total',score_base:'Score Base',tier:'Tier',
  bonus:'Bonus',desglose:'Desglose',strike10:'Strike -10%',strike5:'Strike -5%',
  ip_label:'IP Label',fwd_pe:'Fwd P/E',pe_ttm:'P/E TTM',ev_ebitda:'EV/EBITDA',
  pfcf:'P/FCF',peg:'PEG',pb:'P/B',
  gross_pct:'Gross%',op_pct:'Op%',net_pct:'Net%',roic5y:'ROIC%',
  roe5y:'ROE%',roa10y:'ROA%',piotroski:'Piotroski',ebitda_pct:'EBITDA%',fcl_pct:'FCL%',
  dcap:'D/Cap%',cob_int:'Cob.Int',altman:'Altman Z',beneish:'Beneish',
  sloan:'Sloan',payout_fcl:'Payout FCL%',
  yield_pct:'Yield%',dps:'DPS',cagr3y:'CAGR 3Y%',cagr10y:'CAGR 10Y%',
  chowder:'Chowder',yield_med10y:'Yield Med10Y',tend_div:'Tend.Div',
  weiss_pct:'Weiss%',weiss_signal:'Weiss Signal',div_anos:'Div Años',
  beta:'Beta',rsi:'RSI',vol30:'Vol30d%',vol90:'Vol90d%',ret_52w:'52wHi%',
  senal_tec:'Señal Tec.',earnings_d:'Earnings(d)',mm200:'MM200',mm50:'MM50',
  atr:'ATR',adx:'ADX',
  ip_score:'IP Score',ip_fcaja:'Flujo Caja',ip_crec:'Crecim.',
  ip_benef:'Beneficios',ip_mom:'Momentum',
};

function scoreColor(score) {
  if (score >= 70) return '#2ECC71';
  if (score >= 50) return '#F39C12';
  if (score >= 35) return '#E67E22';
  return '#E74C3C';
}

function weissClass(sig) {
  if (!sig) return 'weiss-na';
  if (sig === 'ZONA COMPRA') return 'weiss-compra';
  if (sig === 'NEUTRA' || sig === 'LIGERAMENTE CARA') return 'weiss-neutra';
  if (sig === 'CARA') return 'weiss-cara';
  return 'weiss-na';
}

function weissLabel(sig) {
  const map = {
    'ZONA COMPRA': '🟢 COMPRA', 'NEUTRA': '⚪ NEUTRA',
    'LIGERAMENTE CARA': '⚪ Liger. cara', 'CARA': '🔴 CARA',
    'HISTORIAL <5Y': '⚠️ <5Y', 'N/A': '—'
  };
  return map[sig] || sig || '—';
}

function accionClass(accion) {
  if (!accion) return 'accion-revisar';
  if (accion.startsWith('ABRIR')) return 'accion-abrir';
  if (accion.startsWith('NO') || accion.startsWith('NO OPERAR')) return 'accion-no';
  if (accion.startsWith('ESPERAR') || accion.startsWith('PRECAUCIÓN')) return 'accion-esperar';
  return 'accion-revisar';
}

function senalClass(s) {
  if (s === 'COMPRA FUERTE') return 'senal-fuerte-alcista';
  if (s === 'COMPRA') return 'senal-alcista';
  if (s === 'VENTA') return 'senal-bajista';
  if (s === 'VENTA FUERTE') return 'senal-fuerte-bajista';
  return 'senal-neutral';
}

function fmt(val, key) {
  if (val === null || val === undefined) return <span style={{color:'var(--text-muted)'}}>—</span>;
  if (key === 'precio' || key === 'strike10' || key === 'strike5' || key === 'mm200' || key === 'mm50') {
    return `$${Number(val).toLocaleString('en-US', {minimumFractionDigits:2, maximumFractionDigits:2})}`;
  }
  if (['yield_pct','gross_pct','op_pct','net_pct','roic5y','roe5y','roa10y',
       'ebitda_pct','fcl_pct','dcap','payout_fcl','cagr3y','cagr10y',
       'vol30','vol90','ret_52w','weiss_pct'].includes(key)) {
    return `${val}%`;
  }
  return String(val);
}

function CellRenderer({ c, val }) {
  if (c === 'tier') return (
    <span className={`tier-badge tier-${val}`}>{TIER_LABELS[val]}</span>
  );
  if (c === 'score_base' || c === 'score_total') return (
    <div className="score-cell">
      <div className="score-bar-wrap">
        <div className="score-bar-fill" style={{width:`${val}%`, background:scoreColor(val)}}/>
      </div>
      <span className="score-num" style={{color:scoreColor(val)}}>{val}</span>
    </div>
  );
  if (c === 'weiss_signal') return (
    <span className={`weiss-badge ${weissClass(val)}`}>{weissLabel(val)}</span>
  );
  if (c === 'accion') return (
    <span className={`accion-badge ${accionClass(val)}`}>{val || '—'}</span>
  );
  if (c === 'senal_tec') return (
    <span className={senalClass(val)}>{val || '—'}</span>
  );
  if (c === 'nombre') return <span style={{maxWidth:180,overflow:'hidden',textOverflow:'ellipsis',display:'block'}}>{val}</span>;
  return <span>{fmt(val, c)}</span>;
}

export default function Dashboard({ data, loading }) {
  const [view, setView] = useState('tabla');
  const [sectorFilter, setSectorFilter] = useState('todos');
  const [tierFilter, setTierFilter] = useState('todos');
  const [recomFilter, setRecomFilter] = useState('todos');
  const [weissFilter, setWeissFilter] = useState('todos');
  const [search, setSearch] = useState('');
  const [sortCol, setSortCol] = useState('score_base');
  const [sortDir, setSortDir] = useState('desc');
  const [colGroup, setColGroup] = useState('Identificación');
  const [activeSector, setActiveSector] = useState(null);

  const companies = data?.companies || [];
  const stats = data?.stats || {};

  const sectors = useMemo(() =>
    ['todos', ...new Set(companies.map(c => c.sector).filter(Boolean).sort())],
    [companies]
  );

  const filtered = useMemo(() => {
    let arr = [...companies];
    if (search) {
      const q = search.toLowerCase();
      arr = arr.filter(c => c.ticker.toLowerCase().includes(q) || c.nombre.toLowerCase().includes(q));
    }
    if (sectorFilter !== 'todos') arr = arr.filter(c => c.sector === sectorFilter);
    if (tierFilter !== 'todos') arr = arr.filter(c => c.tier === Number(tierFilter));
    if (recomFilter !== 'todos') arr = arr.filter(c => c.recomend === recomFilter);
    if (weissFilter !== 'todos') arr = arr.filter(c => c.weiss_signal === weissFilter);
    if (activeSector) arr = arr.filter(c => c.sector === activeSector);

    arr.sort((a, b) => {
      const av = a[sortCol], bv = b[sortCol];
      if (av === null || av === undefined) return 1;
      if (bv === null || bv === undefined) return -1;
      const cmp = typeof av === 'number' ? av - bv : String(av).localeCompare(String(bv));
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return arr;
  }, [companies, search, sectorFilter, tierFilter, recomFilter, weissFilter, activeSector, sortCol, sortDir]);

  function handleSort(col) {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortCol(col); setSortDir('desc'); }
  }

  const groupCols = COLUMN_GROUPS[colGroup] || [];
  const visibleCols = colGroup === 'Identificación'
    ? groupCols
    : ['ticker', ...groupCols.filter(c => c !== 'ticker')];

  // Sector data for charts
  const sectorData = useMemo(() => {
    const map = {};
    companies.forEach(c => {
      if (!map[c.sector]) map[c.sector] = {name:c.sector.split('/')[0].trim(), t1:0,t2:0,t3:0,t4:0,total:0};
      map[c.sector][`t${c.tier}`]++;
      map[c.sector].total++;
    });
    return Object.values(map).sort((a,b) => b.total - a.total);
  }, [companies]);

  const tierPieData = [
    {name:'Tier 1', value: stats.t1 || 0, color:'#2ECC71'},
    {name:'Tier 2', value: stats.t2 || 0, color:'#F39C12'},
    {name:'Tier 3', value: stats.t3 || 0, color:'#E67E22'},
    {name:'Tier 4', value: stats.t4 || 0, color:'#E74C3C'},
  ];

  const weissData = useMemo(() => {
    const wz = companies.filter(c => c.weiss_signal === 'ZONA COMPRA');
    return wz.sort((a,b) => (b.weiss_pct||0) - (a.weiss_pct||0)).slice(0,15)
      .map(c => ({name:c.ticker, value:Number(c.weiss_pct)||0, tier:c.tier}));
  }, [companies]);

  if (loading) return (
    <div className="loading-screen">
      <div className="loading-spinner"/>
      <span className="loading-text">Cargando datos...</span>
    </div>
  );

  if (!companies.length) return (
    <div className="loading-screen">
      <div className="empty-icon">📊</div>
      <div className="empty-title">Sin datos disponibles</div>
      <div className="empty-text">El administrador actualizará los datos próximamente.</div>
      <a href="https://t.me/dividendosyopciones" target="_blank" rel="noreferrer" className="telegram-btn" style={{marginTop:8}}>
        💬 Únete al grupo
      </a>
    </div>
  );

  return (
    <div>
      {/* Header */}
      <div className="header">
        <div className="header-logo">
          <div style={{width:36,height:36,background:'linear-gradient(135deg,#D4A843,#7A5B20)',borderRadius:8,display:'flex',alignItems:'center',justifyContent:'center',fontSize:18}}>📈</div>
          <div>
            <div className="header-title">Dividendos $ Opciones</div>
            <div className="header-subtitle">Análisis semanal de Blue Chips USA</div>
          </div>
        </div>
        <div className="header-right">
          {data?.updated_at && (
            <span className="updated-badge">
              Actualizado: {new Date(data.updated_at).toLocaleDateString('es-ES', {day:'2-digit',month:'short',year:'numeric'})}
            </span>
          )}
          <a href="https://t.me/dividendosyopciones" target="_blank" rel="noreferrer" className="telegram-btn">
            ✈️ Telegram
          </a>
        </div>
      </div>

      <div className="main-layout">
        {/* Sidebar */}
        <div className="sidebar">
          <div className="sidebar-label" style={{padding:'12px 24px 6px'}}>Vistas</div>
          {['tabla','sectores','graficos'].map(v => (
            <div className="sidebar-section" key={v}>
              <div className={`sidebar-item ${view===v?'active':''}`} onClick={()=>{setView(v);setActiveSector(null);}}>
                {v==='tabla'?'📊 Tabla General':v==='sectores'?'🏭 Por Sectores':'📈 Gráficos'}
              </div>
            </div>
          ))}

          <div className="sidebar-divider"/>
          <div className="sidebar-label" style={{padding:'0 24px 6px'}}>Filtrar por Tier</div>
          {[['todos','Todos',stats.total],['1','🟢 Tier 1',stats.t1],['2','🟡 Tier 2',stats.t2],['3','🟠 Tier 3',stats.t3],['4','🔴 Tier 4',stats.t4]].map(([v,l,n])=>(
            <div className="sidebar-section" key={v}>
              <div className={`sidebar-item ${tierFilter===v?'active':''}`} onClick={()=>setTierFilter(v)}>
                {l} <span className="count">{n||0}</span>
              </div>
            </div>
          ))}

          <div className="sidebar-divider"/>
          <div className="sidebar-label" style={{padding:'0 24px 6px'}}>Señal Weiss</div>
          {[['todos','Todos'],['ZONA COMPRA','🟢 Zona Compra'],['NEUTRA','⚪ Neutra'],['CARA','🔴 Cara']].map(([v,l])=>(
            <div className="sidebar-section" key={v}>
              <div className={`sidebar-item ${weissFilter===v?'active':''}`} onClick={()=>setWeissFilter(v)}>
                {l} {v==='ZONA COMPRA'&&<span className="count">{stats.weiss_compra||0}</span>}
              </div>
            </div>
          ))}

          <div className="sidebar-divider"/>
          <div className="sidebar-label" style={{padding:'0 24px 6px'}}>Recomendación</div>
          {[['todos','Todos'],['COMPRAR','COMPRAR'],['ACUMULAR','ACUMULAR'],['MANTENER','MANTENER'],['EVITAR','EVITAR']].map(([v,l])=>(
            <div className="sidebar-section" key={v}>
              <div className={`sidebar-item ${recomFilter===v?'active':''}`} onClick={()=>setRecomFilter(v)}>
                {l}
              </div>
            </div>
          ))}
        </div>

        {/* Main content */}
        <div className="content">
          {/* Stats */}
          <div className="stats-row">
            <div className="stat-card">
              <div className="stat-label">Total Empresas</div>
              <div className="stat-value gold">{stats.total||0}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Tier 1 — CORE</div>
              <div className="stat-value green">{stats.t1||0}</div>
              <div className="stat-sub">Wheel / CSP</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Tier 2 — Táctica</div>
              <div className="stat-value" style={{color:'#F39C12'}}>{stats.t2||0}</div>
              <div className="stat-sub">CSP activa</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Weiss Zona Compra</div>
              <div className="stat-value green">{stats.weiss_compra||0}</div>
              <div className="stat-sub">Baratas vs historia</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Beta Media</div>
              <div className="stat-value">{stats.beta_media||'—'}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Yield Medio</div>
              <div className="stat-value gold">{stats.yield_media||'—'}%</div>
            </div>
          </div>

          {/* ── VIEW: TABLA ── */}
          {view === 'tabla' && (
            <>
              <div className="section-header">
                <span className="section-title">Universo Completo</span>
                <span className="section-sub">{filtered.length} empresas</span>
              </div>

              {/* Column group tabs */}
              <div className="panel-tabs">
                {Object.keys(COLUMN_GROUPS).map(g => (
                  <button key={g} className={`tab-btn ${colGroup===g?'active':''}`} onClick={()=>setColGroup(g)}>{g}</button>
                ))}
              </div>

              {/* Filters */}
              <div className="filters-bar">
                <input className="search-input" placeholder="🔍 Buscar ticker o empresa..." value={search} onChange={e=>setSearch(e.target.value)}/>
                <select className="filter-select" value={sectorFilter} onChange={e=>setSectorFilter(e.target.value)}>
                  {sectors.map(s=><option key={s} value={s}>{s==='todos'?'Todos los sectores':s}</option>)}
                </select>
                <span className="results-count">{filtered.length} resultados</span>
              </div>

              {/* Table */}
              <div className="table-wrapper">
                <table>
                  <thead>
                    <tr>
                      {visibleCols.map((c) => {
                        const isTickerFixed = colGroup !== 'Identificación' && c === 'ticker';
                        const isFirstGroup = !isTickerFixed && groupCols.indexOf(c) === 0;
                        return (
                          <th key={c} colSpan={1} style={{textAlign:'center',padding:'4px 10px 0',position:isTickerFixed?'sticky':undefined,left:isTickerFixed?0:undefined,background:isTickerFixed?'var(--bg-card)':undefined,zIndex:isTickerFixed?3:undefined}}>
                            {isFirstGroup ? colGroup : ''}
                          </th>
                        );
                      })}
                    </tr>
                    <tr>
                      {visibleCols.map(c => {
                        const isTickerFixed = colGroup !== 'Identificación' && c === 'ticker';
                        return (
                          <th key={c} onClick={()=>handleSort(c)} className={sortCol===c?'sorted':''}
                            style={{position:isTickerFixed?'sticky':undefined,left:isTickerFixed?0:undefined,background:isTickerFixed?'var(--bg-card)':undefined,zIndex:isTickerFixed?3:undefined,color:isTickerFixed?'var(--gold)':undefined}}>
                            {COL_LABELS[c]||c}
                            <span className={`sort-icon ${sortCol===c?'active':''}`}>
                              {sortCol===c ? (sortDir==='asc'?'↑':'↓') : '↕'}
                            </span>
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(company => (
                      <tr key={company.ticker}>
                        {visibleCols.map(c => {
                          const isTickerFixed = colGroup !== 'Identificación' && c === 'ticker';
                          return (
                            <td key={c}
                              className={c==='nombre'||c==='accion'?'primary':c==='ticker'?'mono primary':''}
                              style={{position:isTickerFixed?'sticky':undefined,left:isTickerFixed?0:undefined,background:isTickerFixed?'var(--bg-card)':undefined,zIndex:isTickerFixed?2:undefined,fontWeight:isTickerFixed?700:undefined,color:isTickerFixed?'var(--gold)':undefined,borderRight:isTickerFixed?'1px solid var(--border)':undefined}}>
                              <CellRenderer c={c} val={company[c]}/>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {/* ── VIEW: SECTORES ── */}
          {view === 'sectores' && (
            <>
              <div className="section-header">
                <span className="section-title">Rankings por Sector</span>
                {activeSector && (
                  <button style={{background:'none',border:'1px solid var(--border)',borderRadius:6,color:'var(--text-muted)',padding:'4px 10px',cursor:'pointer',fontSize:12}}
                    onClick={()=>setActiveSector(null)}>✕ {activeSector}</button>
                )}
              </div>

              {!activeSector ? (
                <div className="sector-grid">
                  {sectorData.map(s => (
                    <div className="sector-card" key={s.name} onClick={()=>{setActiveSector(s.name);setView('tabla');}}>
                      <div className="sector-card-header">
                        <span className="sector-name">{s.name}</span>
                        <span className="sector-count">{s.total} empresas</span>
                      </div>
                      <div className="sector-tiers">
                        {s.t1>0&&<div className="sector-tier-bar" style={{background:'#2ECC71',flex:s.t1}} title={`T1: ${s.t1}`}/>}
                        {s.t2>0&&<div className="sector-tier-bar" style={{background:'#F39C12',flex:s.t2}} title={`T2: ${s.t2}`}/>}
                        {s.t3>0&&<div className="sector-tier-bar" style={{background:'#E67E22',flex:s.t3}} title={`T3: ${s.t3}`}/>}
                        {s.t4>0&&<div className="sector-tier-bar" style={{background:'#E74C3C',flex:s.t4}} title={`T4: ${s.t4}`}/>}
                      </div>
                      <div style={{display:'flex',gap:8,marginTop:8}}>
                        {[['T1',s.t1,'#2ECC71'],['T2',s.t2,'#F39C12'],['T3',s.t3,'#E67E22'],['T4',s.t4,'#E74C3C']].map(([l,n,col])=>
                          n>0&&<span key={l} style={{fontSize:11,color:col,fontFamily:'var(--font-mono)'}}>{l}:{n}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}
            </>
          )}

          {/* ── VIEW: GRAFICOS ── */}
          {view === 'graficos' && (
            <>
              <div className="section-header">
                <span className="section-title">Análisis Visual</span>
              </div>
              <div className="charts-grid">
                <div className="chart-card">
                  <div className="chart-title">Distribución por Tiers</div>
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie data={tierPieData} cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={3} dataKey="value">
                        {tierPieData.map((e,i)=><Cell key={i} fill={e.color}/>)}
                      </Pie>
                      <Tooltip content={({payload})=>payload?.length?(
                        <div className="custom-tooltip">{payload[0].name}: <b>{payload[0].value}</b></div>
                      ):null}/>
                    </PieChart>
                  </ResponsiveContainer>
                  <div style={{display:'flex',justifyContent:'center',gap:16,marginTop:8}}>
                    {tierPieData.map(t=>(
                      <div key={t.name} style={{display:'flex',alignItems:'center',gap:5,fontSize:11}}>
                        <div style={{width:8,height:8,borderRadius:'50%',background:t.color}}/>
                        <span style={{color:'var(--text-muted)'}}>{t.name}: <span style={{color:'var(--text-primary)'}}>{t.value}</span></span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="chart-card">
                  <div className="chart-title">Top Señal Weiss — Zona Compra</div>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={weissData} margin={{top:0,right:0,left:-20,bottom:0}}>
                      <XAxis dataKey="name" tick={{fill:'var(--text-muted)',fontSize:10}} axisLine={false} tickLine={false}/>
                      <YAxis tick={{fill:'var(--text-muted)',fontSize:10}} axisLine={false} tickLine={false}/>
                      <Tooltip content={({payload,label})=>payload?.length?(
                        <div className="custom-tooltip">{label}: <b>+{payload[0].value}%</b> vs mediana histórica</div>
                      ):null}/>
                      <Bar dataKey="value" radius={[4,4,0,0]}>
                        {weissData.map((e,i)=><Cell key={i} fill={TIER_COLORS[e.tier]||'#D4A843'}/>)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="chart-card" style={{gridColumn:'1/-1'}}>
                  <div className="chart-title">Empresas por Sector y Tier</div>
                  <ResponsiveContainer width="100%" height={240}>
                    <BarChart data={sectorData} margin={{top:0,right:0,left:-20,bottom:30}}>
                      <XAxis dataKey="name" tick={{fill:'var(--text-muted)',fontSize:10,angle:-30,textAnchor:'end'}} axisLine={false} tickLine={false}/>
                      <YAxis tick={{fill:'var(--text-muted)',fontSize:10}} axisLine={false} tickLine={false}/>
                      <Tooltip content={({payload,label})=>payload?.length?(
                        <div className="custom-tooltip">
                          <b>{label}</b>
                          {payload.map(p=><div key={p.name} style={{color:p.fill}}>{p.name}: {p.value}</div>)}
                        </div>
                      ):null}/>
                      <Bar dataKey="t1" name="Tier 1" stackId="a" fill="#2ECC71" radius={[0,0,0,0]}/>
                      <Bar dataKey="t2" name="Tier 2" stackId="a" fill="#F39C12"/>
                      <Bar dataKey="t3" name="Tier 3" stackId="a" fill="#E67E22"/>
                      <Bar dataKey="t4" name="Tier 4" stackId="a" fill="#E74C3C" radius={[4,4,0,0]}/>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </>
          )}

          {/* Footer */}
          <div className="gold-line"/>
          <div style={{textAlign:'center',fontSize:11,color:'var(--text-muted)',paddingBottom:24}}>
            ⚠️ Exclusivamente educativo. No constituye asesoramiento financiero. Realiza tu propia investigación antes de operar. &nbsp;|&nbsp;
            <a href="https://t.me/dividendosyopciones" target="_blank" rel="noreferrer" style={{color:'var(--gold)',textDecoration:'none'}}>
              💬 Dividendos $ Opciones
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
