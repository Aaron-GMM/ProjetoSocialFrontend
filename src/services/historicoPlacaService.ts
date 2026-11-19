import { historicoRepository } from '../repositories/historicoPlacaRepository';

export const historicoService = {
  async excluirEvento(placaId: string, eventoId: string): Promise<void> {
    await historicoRepository.excluirEvento(placaId, eventoId);
  },
  async obterHistorico(placaId: string, page = 1, pageSize = 5) {
    return await historicoRepository.listarHistorico(placaId, page, pageSize);
  },

  async atualizarEvento(placaId: string, eventoId: string, dados: FormData) {
    return await historicoRepository.atualizarEvento(placaId, eventoId, dados);
  }
};