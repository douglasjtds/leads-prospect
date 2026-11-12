/** Resposta JSON padrão para rotas ainda não implementadas. */
export function naoImplementadoResponse(fase: number): Response {
  return Response.json({ erro: `não implementado (fase ${fase})` }, { status: 501 });
}
