import React, { useMemo } from 'react';
import { Roofing } from '@mui/icons-material';
import type { Obra, ObraMatrizTechadoResumen } from '../types/database';
import { camposTechadoSinDuplicar, adendasVisiblesParaObra, formatearAdendaTechado } from '../utils/obraDetalleTechado';
import { TECHADO_MODULO } from '../constants/techadoModulo';

interface ObraTechadoResumenSectionProps {
  obra: Obra;
  entradas: ObraMatrizTechadoResumen[];
  compacto?: boolean;
}

const ObraTechadoResumenSection: React.FC<ObraTechadoResumenSectionProps> = ({
  obra,
  entradas,
  compacto = false,
}) => {
  const tarjetas = useMemo(
    () =>
      entradas.map((entrada) => {
        const campos = camposTechadoSinDuplicar(obra, entrada.matriz, entrada.contrato);
        const adendas = adendasVisiblesParaObra(entrada.adendas, entrada.contrato);
        const porGrupo = campos.reduce<Record<string, typeof campos>>((acc, c) => {
          if (!acc[c.grupo]) acc[c.grupo] = [];
          acc[c.grupo].push(c);
          return acc;
        }, {});
        return { entrada, campos, porGrupo, adendas };
      }),
    [entradas, obra],
  );

  if (entradas.length === 0) return null;

  return (
    <section>
      <div className="flex items-center gap-2 mb-3">
        <Roofing fontSize="small" className="text-amber-700" />
        <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
          {TECHADO_MODULO.label} ({entradas.length})
        </h4>
      </div>
      <p className="text-xs text-stone-500 mb-3">
        Información del programa Techado vinculada a este ID SIGEDE. No se repiten datos ya
        mostrados en la ficha de la obra.
      </p>

      <div className="space-y-4">
        {tarjetas.map(({ entrada, campos, porGrupo, adendas }) => (
          <div
            key={entrada.matriz.id}
            className="border border-amber-200/80 rounded-xl bg-amber-50/40 overflow-hidden"
          >
            <div className="px-4 py-3 border-b border-amber-200/60 bg-amber-50/80">
              <div className="font-semibold text-stone-800 text-sm">
                {entrada.matriz.plantel}
              </div>
              <div className="text-xs text-stone-500 mt-0.5 flex flex-wrap gap-x-3 gap-y-1">
                <span>Lote {entrada.matriz.lote}</span>
                <span className="font-mono">Contrato {entrada.contrato.no_contrato}</span>
                {entrada.matriz.reg_dist && <span>REG-DIST {entrada.matriz.reg_dist}</span>}
              </div>
            </div>

            {campos.length === 0 ? (
              <p className="px-4 py-3 text-sm text-stone-500 italic">
                Los datos de Techado coinciden con la ficha de la obra; no hay campos adicionales.
              </p>
            ) : (
              <div className="p-4 space-y-4">
                {Object.entries(porGrupo).map(([grupo, items]) => (
                  <div key={grupo}>
                    {!compacto && (
                      <div className="text-xs font-semibold text-amber-900/80 mb-2">{grupo}</div>
                    )}
                    <div
                      className={`grid gap-3 ${
                        compacto ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
                      }`}
                    >
                      {items.map((c) => (
                        <div key={`${grupo}-${c.label}`}>
                          <div className="text-xs text-gray-500 mb-0.5">{c.label}</div>
                          <div className="text-sm font-medium text-gray-800 break-words">{c.value}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {adendas.length > 0 && (
              <div className="px-4 pb-4">
                <div className="text-xs font-semibold text-stone-500 mb-2">Adendas</div>
                <ul className="text-sm text-stone-700 space-y-1">
                  {adendas.map((a) => (
                    <li key={a.id} className="flex gap-2">
                      <span className="text-amber-600">•</span>
                      <span>{formatearAdendaTechado(a)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
};

export default ObraTechadoResumenSection;
