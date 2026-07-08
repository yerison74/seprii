import {
  normalizarNoContrato,
  normalizarRegDist,
  normalizarTextoClave,
} from './techadoNormalizar';

export interface ObraMatchCandidata {
  id: string;
  contrato?: string | null;
  distrito_minerd_sigede?: string | null;
  nombre?: string | null;
  provincia?: string | null;
  municipio?: string | null;
}

export interface MatrizMatchInput {
  no_contrato: string;
  reg_dist?: string | null;
  plantel: string;
  provincia?: string | null;
  municipio?: string | null;
}

function puntajeNombre(plantel: string, nombreObra: string): number {
  const p = normalizarTextoClave(plantel);
  const n = normalizarTextoClave(nombreObra);
  if (!p || !n) return 0;
  if (p === n) return 100;
  if (n.includes(p) || p.includes(n)) return 80;
  const palabrasP = p.split(' ').filter((w) => w.length > 3);
  const coinciden = palabrasP.filter((w) => n.includes(w)).length;
  return palabrasP.length ? Math.round((coinciden / palabrasP.length) * 60) : 0;
}

/**
 * Busca obra en catálogo obras usando:
 * 1) contrato + distrito_minerd_sigede (reg_dist)
 * 2) contrato + nombre plantel
 * 3) distrito + nombre
 */
export function buscarObraIdParaMatriz(
  obras: ObraMatchCandidata[],
  input: MatrizMatchInput,
): string | null {
  const contrato = normalizarNoContrato(input.no_contrato);
  const regDist = normalizarRegDist(input.reg_dist);
  const plantel = (input.plantel || '').trim();
  if (!contrato && !regDist && !plantel) return null;

  type Scored = { id: string; score: number };
  const scored: Scored[] = [];

  for (const obra of obras) {
    const oContrato = normalizarNoContrato(obra.contrato);
    const oReg = normalizarRegDist(obra.distrito_minerd_sigede);
    let score = 0;

    if (contrato && oContrato && contrato === oContrato) score += 40;
    if (regDist && oReg && regDist === oReg) score += 45;
    if (contrato && oContrato && contrato === oContrato && regDist && oReg && regDist === oReg) {
      score += 25;
    }

    const nombreScore = puntajeNombre(plantel, obra.nombre || '');
    score += nombreScore;

    if (
      input.provincia &&
      obra.provincia &&
      normalizarTextoClave(input.provincia) === normalizarTextoClave(obra.provincia)
    ) {
      score += 5;
    }
    if (
      input.municipio &&
      obra.municipio &&
      normalizarTextoClave(input.municipio) === normalizarTextoClave(obra.municipio)
    ) {
      score += 5;
    }

    if (score >= 50) scored.push({ id: obra.id, score });
  }

  if (scored.length === 0) return null;
  scored.sort((a, b) => b.score - a.score);
  if (scored.length > 1 && scored[0].score === scored[1].score && scored[0].score < 90) {
    return null;
  }
  return scored[0].id;
}

export function construirIndiceObras(obras: ObraMatchCandidata[]) {
  return obras;
}
