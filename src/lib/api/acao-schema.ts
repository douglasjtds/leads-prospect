import { z } from 'zod';
import { RESULTADOS_REVISAO, STATUS, VARIANTES, type Acao } from '@/lib/domain/types';

// Validação do corpo do PATCH /api/leads/:placeId (ARCHITECTURE §5).

export const acaoSchema = z.discriminatedUnion('tipo', [
  z.object({ tipo: z.literal('enviei'), variante: z.enum(VARIANTES, { error: 'Variante desconhecida.' }).optional() }),
  z.object({ tipo: z.literal('mudarStatus'), status: z.enum(STATUS, { error: 'Status desconhecido.' }) }),
  z.object({ tipo: z.literal('revisar'), resultado: z.enum(RESULTADOS_REVISAO, { error: 'Resultado de revisão desconhecido.' }) }),
  z.object({ tipo: z.literal('pular'), motivo: z.string().trim().min(1, 'Informe o motivo.').max(200, 'Motivo longo demais.') }),
  z.object({ tipo: z.literal('salvarObs'), texto: z.string({ error: 'Texto obrigatório.' }).trim().max(5000, 'Observação longa demais.') }),
], { error: 'Tipo de ação desconhecido.' });

export const patchBodySchema = z.object({ acao: acaoSchema }, { error: 'Envie { acao }.' });

// Garante em tempo de compilação que o schema e o tipo do domínio não divergem.
type AcaoValidada = z.infer<typeof acaoSchema>;
const _confere: (a: AcaoValidada) => Acao = (a) => a;
const _confereVolta: (a: Acao) => AcaoValidada = (a) => a;
void _confere;
void _confereVolta;
