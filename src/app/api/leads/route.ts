import { naoImplementadoResponse } from '@/lib/http';

export function GET(): Response {
  return naoImplementadoResponse(5);
}
