import React, { useRef, useState } from 'react';
import { Roofing, Upload, Link as LinkIcon, Add } from '@mui/icons-material';
import type { MatrizGeneralVista } from '../types/database';
import { techadoAPI } from '../services/api';
import { parsearMatrizTechadoDesdeFile } from '../utils/parsearMatrizTechadoExcel';
import MatrizGeneralTable from './MatrizGeneralTable';
import TechadoMatrizEditor from './TechadoMatrizEditor';
import TechadoObraEditor from './TechadoObraEditor';
import NuevoTechadoDialog from './NuevoTechadoDialog';
import ModuloPageHeader from './ui/ModuloPageHeader';
import { TECHADO_MODULO } from '../constants/techadoModulo';
import { BTN_PRIMARY, BTN_SECONDARY, BTN_GHOST } from '../constants/buttonStyles';
import { CA_ALERTA_OK, CA_ALERTA_ERROR } from '../constants/cargaArchivosUi';

interface TechadoProps {
  refreshTrigger?: number;
  soloLectura?: boolean;
  /** Notifica a la app que obras u otros datos compartidos cambiaron (p. ej. Gestión de Obras). */
  onDatosActualizados?: () => void;
}

type VistaTechado = 'lista' | 'matriz' | 'obra';

const Techado: React.FC<TechadoProps> = ({
  refreshTrigger,
  soloLectura = false,
  onDatosActualizados,
}) => {
  const [vista, setVista] = useState<VistaTechado>('lista');
  const [matrizId, setMatrizId] = useState<string | null>(null);
  const [obraId, setObraId] = useState<string | null>(null);
  const [obraNombre, setObraNombre] = useState<string>('');
  const [listRefresh, setListRefresh] = useState(0);
  const [importando, setImportando] = useState(false);
  const [vinculando, setVinculando] = useState(false);
  const [nuevoDialogOpen, setNuevoDialogOpen] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const bumpList = () => {
    setListRefresh((n) => n + 1);
    onDatosActualizados?.();
  };

  const handleFilaClick = (fila: MatrizGeneralVista) => {
    const id = fila.id || fila.matriz_general_id;
    if (!id) return;
    setMatrizId(id);
    setVista('matriz');
  };

  const handleImport = async (file: File) => {
    try {
      setImportando(true);
      setStatusMsg(null);
      const filas = await parsearMatrizTechadoDesdeFile(file);
      if (filas.length === 0) {
        setStatusMsg({ type: 'err', text: 'No se encontraron filas en la hoja MATRIZ GENERAL.' });
        return;
      }
      const res = await techadoAPI.importarExcel(filas);
      const r = res.data.data;
      const partes = [
        `${r.matrizCreadas ?? 0} planteles nuevos`,
        `${r.matrizActualizadas ?? 0} actualizados`,
        `${r.contratosCreados ?? 0} contratos nuevos`,
        `${r.contratosActualizados ?? 0} contratos actualizados`,
        `${r.obrasVinculadas} obras vinculadas`,
        `${r.sinObra} sin match en catálogo`,
      ];
      if (r.errores?.length) partes.push(`${r.errores.length} advertencias`);
      setStatusMsg({
        type: 'ok',
        text: `Importación completada: ${partes.join(', ')}.`,
      });
      bumpList();
    } catch (err: any) {
      setStatusMsg({ type: 'err', text: err.response?.data?.error || 'Error al importar Excel' });
    } finally {
      setImportando(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const handleVincular = async () => {
    try {
      setVinculando(true);
      const res = await techadoAPI.vincularObras();
      const { vinculadas, sinObra } = res.data.data;
      setStatusMsg({
        type: 'ok',
        text: `Vinculación: ${vinculadas} obras enlazadas por contrato + distrito regional (REG-DIST). ${sinObra} sin coincidencia.`,
      });
      bumpList();
    } catch (err: any) {
      setStatusMsg({ type: 'err', text: err.response?.data?.error || 'Error al vincular obras' });
    } finally {
      setVinculando(false);
    }
  };

  const handleTechadoCreado = (matrizId: string, info: { obraVinculada: boolean }) => {
    const extra = info.obraVinculada
      ? ' Obra SIGEDE vinculada automáticamente.'
      : ' Puede vincular la obra después con «Vincular obras» o en el editor.';
    setStatusMsg({ type: 'ok', text: `Techado creado correctamente.${extra}` });
    bumpList();
    setMatrizId(matrizId);
    setVista('matriz');
  };

  if (vista === 'obra' && obraId) {
    return (
      <TechadoObraEditor
        obraId={obraId}
        obraNombre={obraNombre}
        soloLectura={soloLectura}
        onVolver={() => setVista('matriz')}
        onGuardado={bumpList}
      />
    );
  }

  if (vista === 'matriz' && matrizId) {
    return (
      <TechadoMatrizEditor
        matrizId={matrizId}
        soloLectura={soloLectura}
        onVolver={() => { setVista('lista'); setMatrizId(null); }}
        onAbrirObra={(id, nombre) => {
          setObraId(id);
          setObraNombre(nombre || '');
          setVista('obra');
        }}
        onGuardado={bumpList}
      />
    );
  }

  return (
    <div className="flex flex-col min-h-0">
      <ModuloPageHeader
        icon={<Roofing />}
        title={TECHADO_MODULO.label}
        description="Matriz General del programa Techado. REG-DIST = distrito_minerd_sigede en obras."
      >
        {!soloLectura && (
          <>
            <button
              type="button"
              onClick={() => setNuevoDialogOpen(true)}
              className={BTN_PRIMARY}
            >
              <Add fontSize="small" className="mr-1.5" />
              Nuevo techado
            </button>
            <input
              ref={fileRef}
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleImport(f);
              }}
            />
            <button
              type="button"
              disabled={importando}
              onClick={() => fileRef.current?.click()}
              className={BTN_GHOST}
            >
              <Upload fontSize="small" className="mr-1.5" />
              {importando ? 'Importando…' : 'Importar Excel'}
            </button>
            <button
              type="button"
              disabled={vinculando}
              onClick={handleVincular}
              className={BTN_SECONDARY}
            >
              <LinkIcon fontSize="small" className="mr-1.5" />
              {vinculando ? 'Vinculando…' : 'Vincular obras'}
            </button>
          </>
        )}
      </ModuloPageHeader>

      {statusMsg && (
        <div className={`mx-4 sm:mx-6 mb-2 ${statusMsg.type === 'ok' ? CA_ALERTA_OK : CA_ALERTA_ERROR}`}>
          {statusMsg.text}
        </div>
      )}

      <MatrizGeneralTable
        key={listRefresh}
        refreshTrigger={refreshTrigger}
        onFilaClick={handleFilaClick}
      />

      <NuevoTechadoDialog
        open={nuevoDialogOpen}
        onClose={() => setNuevoDialogOpen(false)}
        onCreado={handleTechadoCreado}
      />
    </div>
  );
};

export default Techado;
