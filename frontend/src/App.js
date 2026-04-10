import React, { useState, useEffect, useMemo } from 'react';
import './App.css';
import Dashboard from './pages/Dashboard';
import Admin from './pages/Admin';

function App() {
  const [page, setPage] = useState('dashboard');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const res = await fetch('https://raw.githubusercontent.com/Tolloter/dividendos-opciones/main/data.json');
      const json = await res.json();
      setData(json);
    } catch (e) {
      console.error('Error fetching data:', e);
    } finally {
      setLoading(false);
    }
  };

  const isAdmin = window.location.hash === '#admin';

  return (
    <div className="app">
      {isAdmin ? (
        <Admin onDataUpdated={fetchData} />
      ) : (
        <Dashboard data={data} loading={loading} />
      )}
    </div>
  );
}

export default App;
