import React from 'react';
import {
  CheckCircle,
  Warning,
  Info,
  TableChart
} from '@mui/icons-material';
import { PLANTILLA_OBRAS_COLUMNAS, PLANTILLA_TIPO_OBRA_VALORES } from '../constants/obraPlantillaCarga';

const columnasPorGrupo = PLANTILLA_OBRAS_COLUMNAS.reduce<Record<string, string[]>>((acc, col) => {
  if (!acc[col.grupo]) acc[col.grupo] = [];
  acc[col.grupo].push(col.key);
  return acc;
}, {});

const UploadInstructions: React.FC = () => {  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
      <h3 className="text-xl font-semibold mb-4">
        📋 Instrucciones para Cargar Datos
      </h3>
      
      <div className="bg-blue-50 border border-blue-200 text-blue-800 px-4 py-3 rounded mb-4">
        <p className="text-sm">
          <strong>Formato recomendado:</strong> Excel (.xlsx) o CSV para facilitar la edición
        </p>
      </div>

      <h4 className="text-lg font-medium mb-3">
        📊 Estructura de la Plantilla
      </h4>
      
      <div className="space-y-3 mb-4">
        <div className="flex items-start gap-3">
          <TableChart className="text-[#42A5F5] mt-1" />
          <div>
            <div className="font-medium text-sm">Columna obligatoria:</div>
            <div className="text-sm text-gray-600">
              <strong>codigo</strong> — identifica la obra; si ya existe, se actualiza.
            </div>
          </div>
        </div>

        {Object.entries(columnasPorGrupo).map(([grupo, keys]) => (
          <div key={grupo} className="flex items-start gap-3">
            <TableChart className="text-[#42A5F5] mt-1" />
            <div>
              <div className="font-medium text-sm">{grupo}</div>
              <div className="text-sm text-gray-600">{keys.join(', ')}</div>
            </div>
          </div>
        ))}
        
        <div className="flex items-start gap-3">
          <CheckCircle className="text-green-500 mt-1" />
          <div>
            <div className="font-medium text-sm">Estados válidos recomendados:</div>
            <div className="text-sm text-gray-600">
              ACTIVA, INAUGURADA, TERMINADA, DETENIDA, PRELIMINARES, INTERVENIDA MANTENIMIENTO, NO ESPECIFICADO
            </div>
          </div>
        </div>
        
        <div className="flex items-start gap-3">
          <Info className="text-blue-500 mt-1" />
          <div>
            <div className="font-medium text-sm">Formato de fechas:</div>
            <div className="text-sm text-gray-600">YYYY-MM-DD (ejemplo: 2024-01-15)</div>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <Info className="text-blue-500 mt-1" />
          <div>
            <div className="font-medium text-sm">Valores para tipo_obra:</div>
            <div className="text-sm text-gray-600">{PLANTILLA_TIPO_OBRA_VALORES.join(', ')}</div>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <Info className="text-blue-500 mt-1" />
          <div>
            <div className="font-medium text-sm">REG-DIST / distrito MINERD:</div>
            <div className="text-sm text-gray-600">Formato 01-01 (equivale a distrito_minerd_sigede en obras)</div>
          </div>
        </div>
      </div>

      <hr className="my-4 border-gray-200" />

      <h4 className="text-lg font-medium mb-3">
        🔧 Pasos para Usar la Plantilla
      </h4>
      
      <div className="space-y-3">
        <div className="flex items-start gap-3">
          <CheckCircle className="text-green-500 mt-1" />
          <div>
            <div className="font-medium text-sm">1. Descargar plantilla</div>
            <div className="text-sm text-gray-600">Haz clic en &quot;Descargar Plantilla Excel&quot; o &quot;Descargar Plantilla XML&quot;</div>
          </div>
        </div>
        
        <div className="flex items-start gap-3">
          <CheckCircle className="text-green-500 mt-1" />
          <div>
            <div className="font-medium text-sm">2. Editar en Excel</div>
            <div className="text-sm text-gray-600">Abre el archivo en Excel y modifica los datos según tus necesidades</div>
          </div>
        </div>
        
        <div className="flex items-start gap-3">
          <CheckCircle className="text-green-500 mt-1" />
          <div>
            <div className="font-medium text-sm">3. Guardar archivo</div>
            <div className="text-sm text-gray-600">Guarda como Excel (.xlsx) o usa la plantilla XML según prefieras</div>
          </div>
        </div>
        
        <div className="flex items-start gap-3">
          <CheckCircle className="text-green-500 mt-1" />
          <div>
            <div className="font-medium text-sm">4. Subir archivo</div>
            <div className="text-sm text-gray-600">Arrastra el archivo Excel o XML al área de carga o haz clic para seleccionarlo</div>
          </div>
        </div>
      </div>

      <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded mt-4">
        <p className="text-sm">
          <strong>Importante:</strong> Asegúrate de que los códigos de obra sean únicos. 
          Si un código ya existe, se actualizará la obra existente.
        </p>
      </div>
    </div>
  );
};

export default UploadInstructions;
