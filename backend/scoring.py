import pandas as pd
import numpy as np
from datetime import datetime
import os

def read_ip(path):
    try:
        df = pd.read_excel(path, header=None)
        headers = list(df.iloc[7])
        rows = []
        for _, row in df.iloc[9:].iterrows():
            vals = list(row)
            if str(vals[2]) in ['nan', '']: continue
            rec = {}
            for i, h in enumerate(headers):
                if str(h) == 'nan': continue
                v = vals[i] if i < len(vals) else np.nan
                rec[h] = np.nan if str(v) in ['#RESTRICTED!', '-', 'NM-', 'nan', 'NaN', ''] else v
            rows.append(rec)
        return pd.DataFrame(rows)
    except:
        return pd.DataFrame()

def norm_ticker(ft):
    s = str(ft)
    return s.split(':')[-1].strip() if ':' in s else s.strip()

def safe(v):
    try:
        f = float(v)
        return np.nan if np.isnan(f) else f
    except:
        return np.nan

def pct(v):
    f = safe(v)
    if np.isnan(f): return np.nan
    return round(f * 100, 2) if abs(f) < 5 and f != 0 else round(f, 2)

def nd(v, dec=2):
    if v is None or (isinstance(v, float) and np.isnan(v)): return None
    try:
        f = float(v)
        return None if np.isnan(f) else round(f, dec)
    except:
        return None if str(v) in ['nan', 'NaN', 'None', ''] else str(v)

def process_files(upload_dir, sector_map):
    file_map = {
        'Market_View': None, 'Dividendos': None, 'Risk': None,
        'Eficiencia': None, 'Fundamental': None, 'Fundamental_2': None,
        'Valoracion': None, 'Estado': None, 'Tecnico': None,
        'Previsiones': None, 'Previsiones_2': None,
        'Predicciones': None, 'Predicciones_2': None,
    }

    for fname in os.listdir(upload_dir):
        if not fname.endswith('.xlsx'): continue
        fl = fname.lower()
        if 'market_view' in fl: file_map['Market_View'] = fname
        elif 'dividendos' in fl: file_map['Dividendos'] = fname
        elif 'risk' in fl: file_map['Risk'] = fname
        elif 'eficiencia' in fl: file_map['Eficiencia'] = fname
        elif 'fundamental_2' in fl or 'fundamental 2' in fl: file_map['Fundamental_2'] = fname
        elif 'fundamental' in fl: file_map['Fundamental'] = fname
        elif 'valoraci' in fl: file_map['Valoracion'] = fname
        elif 'estado' in fl: file_map['Estado'] = fname
        elif 'cnico' in fl or 'tecnico' in fl: file_map['Tecnico'] = fname
        elif 'previsiones_2' in fl or 'previsiones 2' in fl: file_map['Previsiones_2'] = fname
        elif 'previsiones' in fl: file_map['Previsiones'] = fname
        elif 'predicciones_2' in fl or 'predicciones 2' in fl: file_map['Predicciones_2'] = fname
        elif 'predicciones' in fl: file_map['Predicciones'] = fname

    if not file_map['Market_View']:
        raise ValueError("Market_View file not found")

    dfs = {}
    for key, fname in file_map.items():
        if fname:
            df = read_ip(os.path.join(upload_dir, fname))
            if len(df) > 0:
                df['_tk'] = df['Full Ticker'].apply(norm_ticker)
                dfs[key] = df

    base = dfs['Market_View'].copy()
    for key in ['Dividendos','Risk','Eficiencia','Fundamental','Fundamental_2',
                'Valoracion','Estado','Tecnico','Previsiones','Previsiones_2',
                'Predicciones','Predicciones_2']:
        if key in dfs:
            cols = [c for c in dfs[key].columns if c not in base.columns or c == '_tk']
            base = base.merge(dfs[key][cols], on='_tk', how='left', suffixes=('', '_dup'))
    base = base[[c for c in base.columns if not c.endswith('_dup')]]

    companies = []
    for _, r in base.iterrows():
        company = score_company(r, sector_map)
        companies.append(company)

    companies.sort(key=lambda x: (x['tier'], -x['score_base']))

    # Stats
    tiers = [c['tier'] for c in companies]
    weiss_compra = sum(1 for c in companies if '🟢' in str(c.get('weiss_signal', '')))
    sectors_dist = {}
    for c in companies:
        s = c['sector']
        sectors_dist[s] = sectors_dist.get(s, 0) + 1

    stats = {
        't1': tiers.count(1), 't2': tiers.count(2),
        't3': tiers.count(3), 't4': tiers.count(4),
        'total': len(companies), 'weiss_compra': weiss_compra,
        'sectors': sectors_dist,
        'beta_media': round(float(np.nanmean([safe(c['beta']) for c in companies if safe(c['beta']) and safe(c['beta']) < 9])), 2),
        'yield_media': round(float(np.nanmean([safe(c['yield_pct']) for c in companies if safe(c['yield_pct']) and safe(c['yield_pct']) > 0])), 2),
    }

    return {
        'companies': companies,
        'stats': stats,
        'updated_at': datetime.now().isoformat()
    }

def score_company(r, sector_map):
    tk = str(r.get('_tk', ''))
    nombre = str(r.get('Nombre', ''))[:40]
    precio = safe(r.get('Precio actual'))
    sector = sector_map.get(tk, 'N/D')

    is_reit = sector == 'Real Estate'
    is_bank = sector == 'Bancos'
    is_adr  = str(r.get('Moneda de los dividendos', 'USD')) not in ['USD', 'nan', '']

    altman   = safe(r.get('Fórmula Altman Z-Score'))
    beneish  = safe(r.get('Fórmula Beneish M-Score'))
    piok     = safe(r.get('Puntuación Piotroski'))
    beta     = safe(r.get('Beta (5 años)'))
    gross_m  = pct(r.get('Margen de beneficio bruto medio (a 5 años)'))
    roic     = pct(r.get('Rendimiento medio sobre el capital invertido (5 años)'))
    deuda_cap= pct(r.get('Deuda Total/Capital total'))
    cob_int  = safe(r.get('Ratio de cobertura de intereses del EBITDA'))
    if np.isnan(cob_int if cob_int else np.nan):
        cob_int = safe(r.get('Cobertura \n ntereses'))
    ip_label = str(r.get('Etiqueta de valor razonable', ''))
    fwd_pe   = safe(r.get('Relación PER (Fwd)'))
    ev_ebitda= safe(r.get('Ratio VE/EBITDA'))
    yield_a  = pct(r.get('Rentabilidad por dividendos (excluyendo los dividendos especiales)',
                          r.get('Rendimiento del dividendo')))
    payout_fcl = pct(r.get('Ratio de pago del flujo de caja libre'))
    payout_affo= pct(r.get('Ratio de pago de los AFFO (REIT)'))
    payout_eps = pct(r.get('Payout'))
    payout_use = payout_affo if is_reit and payout_affo and not np.isnan(payout_affo) else (
                 payout_fcl if payout_fcl and not np.isnan(payout_fcl) else payout_eps)
    cagr3    = pct(r.get('TCAC de los dividendos (3 años)'))
    cagr10   = pct(r.get('TCAC de los dividendos (10 años)'))
    yield_m10= pct(r.get('Mediana de la rentabilidad por dividendos (a 10 años)'))
    div_yrs  = safe(r.get('Crecimiento de dividendos'))
    ip_score = safe(r.get('Puntuación global'))
    ret_52w  = pct(r.get('asset_price_change_pct_52w_high'))
    sloan    = safe(r.get('Ratio Sloan'))
    montier  = safe(r.get('Puntuación C de James Montier'))
    dnet_ebitda = safe(r.get('Deuda neta / EBITDA'))
    ratio_neg90 = safe(r.get('Ratio de revisiones negativas del BPA, últimos 90 días'))
    ratio_pos90 = safe(r.get('Ratio de revisiones positivas del BPA, últimos 90 días'))
    vol30    = pct(r.get('Volatilidad realizada (anualizada a 30 días)'))
    vol90    = pct(r.get('Volatilidad realizada (anualizada a 90 días)'))
    mm200    = safe(r.get('Media móvil de 200 días'))
    mm50     = safe(r.get('Media móvil de 50 días'))
    s1d      = str(r.get('technical_signal_1d', ''))
    s1w      = str(r.get('technical_signal_1w', ''))
    atr      = safe(r.get('atr_14d'))
    adx      = safe(r.get('adx_14d'))
    rsi      = safe(r.get('Índice de Fuerza Relativa (14d)'))
    earnings_d = safe(r.get('Días hasta los siguientes resultados'))
    dps      = safe(r.get('Dividendo por acción (excluyendo los dividendos especiales)',
                          r.get('Dividendo por acción')))
    chowder  = pct(r.get('Número de regla de Chowder'))
    roe5y    = pct(r.get('Rendimiento medio del capital ordinario (5 años)'))
    roa10y   = pct(r.get('Rendimiento medio de los activos (a 10 años)'))
    op_m     = pct(r.get('Margen operativo medio (a 5 años)', r.get('Margen EBIT')))
    net_m    = pct(r.get('Margen de beneficio neto medio para los accionistas (a 5 años)'))
    ebitda_m = pct(r.get('Margen EBITDA'))
    fcl_m    = pct(r.get('Margen de flujo de caja libre apalancado'))
    pb       = safe(r.get('Precio/Valor libro'))
    pe_ttm   = safe(r.get('PER'))
    pfcf     = safe(r.get('Precio / FCF últimos 12 meses'))
    peg      = safe(r.get('Ratio PEG a futuro'))
    curr_r   = safe(r.get('Ratio de solvencia'))
    eps_surp = safe(r.get('eps_surprise'))
    rev_surp = safe(r.get('revenue_surprise'))
    ip_fcaja = str(r.get('Etiqueta de flujo de caja', ''))
    ip_crec  = str(r.get('Etiqueta de crecimiento', ''))
    ip_benef = str(r.get('Etiqueta de beneficios', ''))
    ip_mom   = str(r.get('Etiqueta de tendencia de precio', ''))
    moneda   = str(r.get('Moneda de los dividendos', 'USD'))

    # ── EXCLUSIONES ─────────────────────────
    excl = []
    if altman and not np.isnan(altman) and altman < 3.0 and not is_bank and not is_reit:
        excl.append(f"Altman Z={altman:.2f}<3")
    if piok and not np.isnan(piok) and piok <= 3:
        excl.append(f"Piotroski={int(piok)}≤3")
    if payout_use and not np.isnan(payout_use) and payout_use > 120:
        excl.append(f"Payout={payout_use:.0f}%>120%")
    if deuda_cap and not np.isnan(deuda_cap) and deuda_cap > (70 if is_reit else 55):
        excl.append(f"D/Cap={deuda_cap:.0f}%")
    if beneish and not np.isnan(beneish) and beneish > -1.78:
        excl.append(f"Beneish={beneish:.2f}")
    excluded = len(excl) > 0

    # ── SCORING ──────────────────────────────
    def v(x): return x if x and not (isinstance(x, float) and np.isnan(x)) else None

    sA = 0
    if v(gross_m): sA += 8 if gross_m > 60 else (5 if gross_m >= 40 else 2)
    if v(roic):    sA += 9 if roic > 15 else (6 if roic >= 8 else 2)
    if v(piok):    sA += 8 if piok >= 7 else (5 if piok >= 5 else 2)

    sB = 0
    if v(altman):
        if is_bank or is_reit: sB += 3
        else: sB += 8 if altman > 6 else (5 if altman >= 3 else 0)
    if v(deuda_cap): sB += 7 if deuda_cap < 20 else (4 if deuda_cap <= 40 else 1)
    if v(cob_int):   sB += 5 if cob_int > 10 else (3 if cob_int >= 5 else 1)

    sC = 0
    ipl = ip_label.lower()
    sC += 10 if 'ganga' in ipl else (7 if 'infravalorado' in ipl else (5 if 'precio justo' in ipl else 0))
    if v(fwd_pe) and not is_reit:
        sC += 6 if fwd_pe < 12 else (4 if fwd_pe <= 18 else (2 if fwd_pe <= 25 else 0))
    if v(ev_ebitda):
        sC += 8 if ev_ebitda < 8 else (5 if ev_ebitda <= 14 else (2 if ev_ebitda <= 20 else 0))

    sD = 0
    if v(yield_a):    sD += 4 if yield_a > 3.5 else (3 if yield_a >= 2 else (2 if yield_a >= 1 else 1))
    if v(payout_use): sD += 3 if payout_use < 55 else (2 if payout_use <= 75 else (1 if payout_use <= 95 else 0))
    if v(cagr3):      sD += 3 if cagr3 > 10 else (2 if cagr3 >= 5 else 1)

    sE = 0
    if v(beta):    sE += 5 if beta < 0.5 else (3 if beta < 0.75 else (2 if beta < 1.0 else 0))
    if v(beneish): sE += 4 if beneish < -2.22 else (2 if beneish < -1.78 else 0)
    if v(ip_score):sE += 3 if ip_score > 3.0 else (2 if ip_score >= 2.5 else 0)
    if v(ret_52w): sE += 3 if ret_52w > -20 else (2 if ret_52w >= -40 else 1)

    score_base = min(sA + sB + sC + sD + sE, 100)

    # ── BONUS ────────────────────────────────
    bonus = 0
    weiss_pct = None
    weiss_sig = 'N/A'
    if v(div_yrs) and div_yrs >= 5 and v(yield_a) and v(yield_m10) and yield_m10 > 0:
        wp = round((yield_a / yield_m10 - 1) * 100, 1)
        weiss_pct = wp
        if wp >= 20:    bonus += 5; weiss_sig = 'ZONA COMPRA'
        elif wp >= 0:   bonus += 3; weiss_sig = 'NEUTRA'
        elif wp >= -10: bonus += 1; weiss_sig = 'LIGERAMENTE CARA'
        else:           weiss_sig = 'CARA'
    elif not v(div_yrs) or div_yrs < 5:
        weiss_sig = 'HISTORIAL <5Y'

    if v(ratio_pos90):
        bonus += 3 if ratio_pos90 > 0.6 else (1 if ratio_pos90 >= 0.4 else 0)

    buy_kw = ['compra', 'buy', 'strong']
    if any(k in s1d.lower() for k in buy_kw) and any(k in s1w.lower() for k in buy_kw): bonus += 2
    elif any(k in s1d.lower() for k in buy_kw) or any(k in s1w.lower() for k in buy_kw): bonus += 1

    # ── RED FLAGS L2 ─────────────────────────
    rf2 = []
    if v(sloan) and sloan > 0.10: rf2.append(f"Sloan={sloan:.3f}")
    if v(montier) and montier >= 5: rf2.append(f"Montier={montier:.0f}")
    if v(ratio_neg90) and ratio_neg90 > 0.6: rf2.append("Analistas bajando BPA")
    tier_drop = len(rf2) > 0

    # ── TIER ─────────────────────────────────
    if excluded: tier = 4
    elif score_base >= 70: tier = 2 if tier_drop else 1
    elif score_base >= 50: tier = 3 if tier_drop else 2
    elif score_base >= 35: tier = 4 if tier_drop else 3
    else: tier = 4

    # ── ESTRATEGIA ───────────────────────────
    if tier == 4: estrat = 'EVITAR'
    elif tier == 1 and v(beta) and beta < 0.65 and v(yield_a) and yield_a > 2 and score_base >= 80: estrat = 'WHEEL'
    elif tier == 1 and v(beta) and beta < 0.65: estrat = 'CSP'
    elif v(precio) and precio > 300: estrat = 'BPS'
    elif tier == 3: estrat = 'BPS'
    else: estrat = 'CSP'

    # ── RECOMENDACIÓN ────────────────────────
    if tier == 4: recom = 'EVITAR'
    elif score_base >= 70 and ('ganga' in ipl or 'infravalorado' in ipl): recom = 'COMPRAR'
    elif score_base >= 60 and ('ganga' in ipl or 'infravalorado' in ipl): recom = 'ACUMULAR'
    elif score_base >= 50: recom = 'MANTENER'
    elif score_base >= 35: recom = 'REDUCIR'
    else: recom = 'EVITAR'

    # ── STRIKES ──────────────────────────────
    s10  = round(precio * 0.90, 2) if v(precio) else None
    s5   = round(precio * 0.95, 2) if v(precio) else None
    satr = round(precio - 2 * atr, 2) if v(precio) and v(atr) else None

    # ── SEÑAL TEC ────────────────────────────
    buy_kws = ['compra', 'buy', 'strong buy']
    sel_kws = ['venta', 'sell', 'strong sell']
    ib_d = any(k in s1d.lower() for k in buy_kws)
    is_d = any(k in s1d.lower() for k in sel_kws)
    ib_w = any(k in s1w.lower() for k in buy_kws)
    is_w = any(k in s1w.lower() for k in sel_kws)
    if ib_d and ib_w:   stec = 'COMPRA FUERTE'
    elif ib_d or ib_w:  stec = 'COMPRA'
    elif is_d and is_w: stec = 'VENTA FUERTE'
    elif is_d or is_w:  stec = 'VENTA'
    else:               stec = 'NEUTRAL'

    # ── TEND. DIV ────────────────────────────
    if not v(cagr3) or not v(cagr10) or cagr10 == 0: tend_div = 'N/D'
    elif cagr3 > cagr10 * 1.1: tend_div = 'Acelerando'
    elif cagr3 >= cagr10 * 0.9: tend_div = 'Estable'
    elif cagr3 >= 0: tend_div = 'Desacelerando'
    else: tend_div = 'Cayendo'

    # ── ACCIÓN AHORA ─────────────────────────
    if tier == 4 or excluded: accion = 'NO OPERAR'
    elif v(earnings_d) and earnings_d <= 7: accion = f'ESPERAR EARNINGS ({int(earnings_d)}d)'
    elif v(earnings_d) and earnings_d <= 14: accion = f'PRECAUCIÓN EARNINGS ({int(earnings_d)}d)'
    elif v(vol30) and v(vol90) and vol30 > vol90 and tier in [1, 2]: accion = f'ABRIR {estrat} — Prima alta'
    elif v(vol30) and v(vol90) and vol30 < vol90 and tier in [1, 2]: accion = f'VERIFICAR IV Rank — Vol baja'
    elif stec in ['COMPRA FUERTE', 'COMPRA'] and tier in [1, 2]: accion = f'ABRIR {estrat} — Señal alcista'
    elif stec in ['VENTA FUERTE', 'VENTA'] and tier in [1, 2]: accion = f'ESPERAR REBOTE'
    elif tier == 1: accion = f'ABRIR {estrat}'
    elif tier == 2: accion = f'REVISAR IV — {estrat}'
    elif tier == 3: accion = 'BPS si IV Rank >30'
    else: accion = 'NO OPERAR'

    return {
        'ticker': tk, 'nombre': nombre, 'sector': sector, 'precio': nd(precio),
        'accion': accion, 'score_base': score_base, 'bonus': bonus,
        'score_total': score_base + bonus,
        'desglose': f"A:{sA} B:{sB} C:{sC} D:{sD} E:{sE}",
        'tier': tier, 'estrategia': estrat, 'recomend': recom,
        'strike10': nd(s10), 'strike5': nd(s5), 'strike_atr': nd(satr),
        'excl': ' | '.join(excl) if excl else None,
        'alertas_rf2': ' | '.join(rf2) if rf2 else None,
        # Valoración
        'ip_label': ip_label, 'fwd_pe': nd(fwd_pe, 1), 'pe_ttm': nd(pe_ttm, 1),
        'ev_ebitda': nd(ev_ebitda, 1), 'pfcf': nd(pfcf, 1), 'peg': nd(peg, 2),
        'pb': nd(pb, 2), 'upside': None,
        # Calidad
        'gross_pct': nd(gross_m, 1), 'op_pct': nd(op_m, 1), 'net_pct': nd(net_m, 1),
        'roe5y': nd(roe5y, 1), 'roic5y': nd(roic, 1), 'roa10y': nd(roa10y, 1),
        'piotroski': nd(piok, 0), 'ebitda_pct': nd(ebitda_m, 1), 'fcl_pct': nd(fcl_m, 1),
        # Salud
        'dcap': nd(deuda_cap, 1), 'cob_int': nd(cob_int, 1), 'curr_r': nd(curr_r, 2),
        'altman': nd(altman, 2), 'beneish': nd(beneish, 3), 'sloan': nd(sloan, 3),
        'montier': nd(montier, 0), 'payout_fcl': nd(payout_fcl, 1),
        # Dividendo
        'yield_pct': nd(yield_a, 2), 'dps': nd(dps, 2), 'payout_eps': nd(payout_eps, 1),
        'cagr3y': nd(cagr3, 1), 'cagr10y': nd(cagr10, 1), 'chowder': nd(chowder, 1),
        'yield_med10y': nd(yield_m10, 2), 'div_anos': nd(div_yrs, 0),
        'tend_div': tend_div, 'weiss_pct': nd(weiss_pct, 1), 'weiss_signal': weiss_sig,
        # Riesgo
        'beta': nd(beta, 2), 'rsi': nd(rsi, 1), 'vol30': nd(vol30, 1),
        'vol90': nd(vol90, 1), 'ret_52w': nd(ret_52w, 1),
        # Técnico
        'senal_tec': stec, 'earnings_d': nd(earnings_d, 0),
        'mm200': nd(mm200, 2), 'mm50': nd(mm50, 2),
        'atr': nd(atr, 2), 'adx': nd(adx, 1),
        # IP Health
        'ip_score': nd(ip_score, 2), 'ip_fcaja': ip_fcaja,
        'ip_crec': ip_crec, 'ip_benef': ip_benef, 'ip_mom': ip_mom,
        # Previsiones
        'eps_surp': nd(eps_surp, 1), 'rev_surp': nd(rev_surp, 1),
        'rev_pos90': nd(ratio_pos90, 2),
        # Flags
        'is_adr': is_adr, 'moneda': moneda,
    }
