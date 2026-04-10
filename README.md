# 📊 Dividendos $ Opciones — App

Dashboard web para análisis semanal de Blue Chips USA con dividendo.

---

## 🚀 DESPLIEGUE PASO A PASO

### Paso 1 — Subir el código a GitHub

1. Ve a https://github.com y crea una cuenta (si no tienes)
2. Crea un nuevo repositorio: botón "+" → "New repository"
   - Nombre: `dividendos-opciones`
   - Privado o público (elige lo que prefieras)
   - Sin README (ya tenemos este)
3. Sigue las instrucciones que te da GitHub para subir el código
   (Normalmente: `git init`, `git add .`, `git commit -m "inicial"`, `git push`)

### Paso 2 — Desplegar el Backend en Railway

1. Ve a https://railway.app y regístrate con tu cuenta GitHub
2. "New Project" → "Deploy from GitHub repo"
3. Selecciona el repositorio `dividendos-opciones`
4. Railway detectará automáticamente que es Python
5. En "Settings" → "Root Directory": escribe `backend`
6. En "Variables" añade:
   - `ADMIN_KEY` = (elige una contraseña para el panel admin)
7. Railway te dará una URL tipo: `https://dividendos-xxx.railway.app`
8. **Anota esta URL** — la necesitarás en el paso 3

### Paso 3 — Actualizar la URL del backend en el frontend

En el archivo `vercel.json` cambia:
```
"dest": "https://your-backend.railway.app/api/$1"
```
Por la URL que te dio Railway:
```
"dest": "https://dividendos-xxx.railway.app/api/$1"
```
Guarda y vuelve a hacer push a GitHub.

### Paso 4 — Desplegar el Frontend en Vercel

1. Ve a https://vercel.com y regístrate con tu cuenta GitHub
2. "New Project" → selecciona `dividendos-opciones`
3. En "Root Directory": escribe `frontend`
4. En "Build Command": `npm run build`
5. En "Output Directory": `build`
6. Pulsa "Deploy"
7. Vercel te dará una URL tipo: `https://dividendos-opciones.vercel.app`

### Paso 5 — Conectar tu dominio (opcional)

1. En Vercel → tu proyecto → "Settings" → "Domains"
2. Añade tu dominio: `dividendosyopciones.com`
3. Sigue las instrucciones para actualizar los DNS en tu hosting

---

## 📅 USO SEMANAL (cada semana)

1. Exporta los 15 archivos Excel desde InvestingPro
2. Ve a tu app: `https://tu-dominio.com/#admin`
3. Arrastra los 15 archivos a la zona de subida
4. Introduce tu ADMIN_KEY
5. Pulsa "Procesar"
6. ¡Listo! El dashboard se actualiza para todos

---

## 🗂️ ESTRUCTURA DEL PROYECTO

```
dividendos-opciones/
├── frontend/          → React app (lo que ven los usuarios)
│   ├── src/
│   │   ├── App.js
│   │   ├── App.css
│   │   └── pages/
│   │       ├── Dashboard.js   → Tabla, sectores, gráficos
│   │       └── Admin.js       → Panel de subida de archivos
│   └── package.json
├── backend/           → Python API (procesa los Excel)
│   ├── app.py         → Servidor Flask
│   ├── scoring.py     → Motor de scoring
│   ├── requirements.txt
│   └── railway.json
├── vercel.json        → Config de despliegue
└── README.md
```

---

## 🔑 ACCESO AL PANEL ADMIN

URL: `https://tu-dominio.com/#admin`

Solo tú tienes la ADMIN_KEY. Los usuarios solo ven el dashboard público.

---

## ❓ AYUDA

Si tienes algún problema con el despliegue, consulta con quien te ayudó
a construir esta app.
