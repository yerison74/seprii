/**
 * Componente temporal para buscar y mostrar detalles de la obra OB-2525
 * Puedes agregar este componente temporalmente a tu App.tsx para hacer pruebas
 */

import React, { useState } from 'react';
import { obrasService } from '../services/supabaseService';
import type { Obra } from '../types/database';

const BuscarObraTest: React.FC = () => {
  const [obra, setObra] = useState<Obra | null>(null);
  const [obras, setObras] = useState<Obra[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [idBuscado, setIdBuscado] = useState('OB-2525');

  const buscarObra = async () => {
    setLoading(true);
    setError(null);
    setObra(null);
    setObras([]);

    try {
      // Buscar usando el servicio
      const resultado = await obrasService.obtenerObras({
        search: idBuscado,
        limit: 10
      });

      if (resultado.data && resultado.data.length > 0) {
        setObras(resultado.data);
        if (resultado.data.length === 1) {
          setObra(resultado.data[0]);
        }
      } else {
        setError(`No se encontró ninguna obra con ID "${idBuscado}"`);
      }
    } catch (err: any) {
      setError(err.message || 'Error al buscar obra');
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      <h2>🔍 Buscar Obra para Pruebas</h2>
      
      <div style={{ marginBottom: '20px', display: 'flex', gap: '10px', alignItems: 'center' }}>
        <input
          type="text"
          value={idBuscado}
          onChange={(e) => setIdBuscado(e.target.value)}
          placeholder="ID de la obra (ej: OB-2525)"
          style={{ padding: '8px', fontSize: '16px', flex: 1, maxWidth: '300px' }}
        />
        <button
          onClick={buscarObra}
          disabled={loading}
          style={{
            padding: '10px 20px',
            fontSize: '16px',
            backgroundColor: '#42A5F5',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: loading ? 'not-allowed' : 'pointer'
          }}
        >
          {loading ? 'Buscando...' : 'Buscar'}
        </button>
      </div>

      {error && (
        <div style={{ 
          padding: '15px', 
          backgroundColor: '#ffebee', 
          color: '#c62828', 
          borderRadius: '5px',
          marginBottom: '20px'
        }}>
          ❌ {error}
        </div>
      )}

      {loading && (
        <div style={{ textAlign: 'center', padding: '20px' }}>
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#42A5F5] mx-auto"></div>
          <p>Buscando...</p>
        </div>
      )}

      {obra && (
        <div style={{ 
          backgroundColor: '#f5f5f5', 
          padding: '20px', 
          borderRadius: '8px',
          marginTop: '20px'
        }}>
          <h3 style={{ color: '#42A5F5', marginBottom: '15px' }}>
            ✅ Obra Encontrada
          </h3>
          
          <div style={{ 
            backgroundColor: 'white', 
            padding: '15px', 
            borderRadius: '5px',
            marginBottom: '15px'
          }}>
            <h4>📋 Detalles Completos (JSON):</h4>
            <pre style={{ 
              backgroundColor: '#263238', 
              color: '#aed581', 
              padding: '15px', 
              borderRadius: '5px',
              overflow: 'auto',
              fontSize: '12px'
            }}>
              {JSON.stringify(obra, null, 2)}
            </pre>
          </div>

          <div style={{ 
            backgroundColor: 'white', 
            padding: '15px', 
            borderRadius: '5px'
          }}>
            <h4>📊 Resumen:</h4>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <tbody>
                <tr>
                  <td style={{ padding: '8px', fontWeight: 'bold', width: '200px' }}>ID (interno):</td>
                  <td style={{ padding: '8px' }}>{obra.id}</td>
                </tr>
                <tr>
                  <td style={{ padding: '8px', fontWeight: 'bold' }}>Código:</td>
                  <td style={{ padding: '8px' }}>{obra.codigo || 'N/A'}</td>
                </tr>
                <tr>
                  <td style={{ padding: '8px', fontWeight: 'bold' }}>Nombre:</td>
                  <td style={{ padding: '8px' }}>{obra.nombre || 'N/A'}</td>
                </tr>
                <tr>
                  <td style={{ padding: '8px', fontWeight: 'bold' }}>Estado:</td>
                  <td style={{ padding: '8px' }}>{obra.estado || 'N/A'}</td>
                </tr>
                <tr>
                  <td style={{ padding: '8px', fontWeight: 'bold' }}>Responsable:</td>
                  <td style={{ padding: '8px' }}>{obra.responsable || 'N/A'}</td>
                </tr>
                <tr>
                  <td style={{ padding: '8px', fontWeight: 'bold' }}>Provincia:</td>
                  <td style={{ padding: '8px' }}>{obra.provincia || 'N/A'}</td>
                </tr>
                <tr>
                  <td style={{ padding: '8px', fontWeight: 'bold' }}>Municipio:</td>
                  <td style={{ padding: '8px' }}>{obra.municipio || 'N/A'}</td>
                </tr>
                <tr>
                  <td style={{ padding: '8px', fontWeight: 'bold' }}>Nivel:</td>
                  <td style={{ padding: '8px' }}>{obra.nivel || 'N/A'}</td>
                </tr>
                <tr>
                  <td style={{ padding: '8px', fontWeight: 'bold' }}>Fecha Inicio:</td>
                  <td style={{ padding: '8px' }}>{obra.fecha_inicio || 'N/A'}</td>
                </tr>
                <tr>
                  <td style={{ padding: '8px', fontWeight: 'bold' }}>Fecha Fin Estimada:</td>
                  <td style={{ padding: '8px' }}>{obra.fecha_fin_estimada || 'N/A'}</td>
                </tr>
                <tr>
                  <td style={{ padding: '8px', fontWeight: 'bold' }}>Fecha Inauguración:</td>
                  <td style={{ padding: '8px' }}>{obra.fecha_inauguracion || 'N/A'}</td>
                </tr>
                <tr>
                  <td style={{ padding: '8px', fontWeight: 'bold' }}>Descripción:</td>
                  <td style={{ padding: '8px' }}>{obra.descripcion || 'N/A'}</td>
                </tr>
                <tr>
                  <td style={{ padding: '8px', fontWeight: 'bold' }}>Latitud:</td>
                  <td style={{ padding: '8px' }}>{obra.latitud || 'N/A'}</td>
                </tr>
                <tr>
                  <td style={{ padding: '8px', fontWeight: 'bold' }}>Longitud:</td>
                  <td style={{ padding: '8px' }}>{obra.longitud || 'N/A'}</td>
                </tr>
                <tr>
                  <td style={{ padding: '8px', fontWeight: 'bold' }}>Created At:</td>
                  <td style={{ padding: '8px' }}>{obra.created_at || 'N/A'}</td>
                </tr>
                <tr>
                  <td style={{ padding: '8px', fontWeight: 'bold' }}>Updated At:</td>
                  <td style={{ padding: '8px' }}>{obra.updated_at || 'N/A'}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {obras.length > 1 && (
        <div style={{ 
          backgroundColor: '#f5f5f5', 
          padding: '20px', 
          borderRadius: '8px',
          marginTop: '20px'
        }}>
          <h3 style={{ color: '#42A5F5', marginBottom: '15px' }}>
            📋 Múltiples Obras Encontradas ({obras.length})
          </h3>
          {obras.map((obraItem, index) => (
            <div 
              key={obraItem.id} 
              style={{ 
                backgroundColor: 'white', 
                padding: '15px', 
                borderRadius: '5px',
                marginBottom: '10px',
                cursor: 'pointer',
                border: '1px solid #ddd'
              }}
              onClick={() => setObra(obraItem)}
            >
              <strong>{index + 1}. ID: {obraItem.id}</strong> | 
              Código: {obraItem.codigo || 'N/A'} | 
              Nombre: {obraItem.nombre?.substring(0, 50) || 'N/A'}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default BuscarObraTest;
