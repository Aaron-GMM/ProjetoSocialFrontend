import { useEffect, useRef, useState } from 'react';
import { 
  Dialog, DialogTitle, DialogContent, IconButton, 
  CircularProgress, Pagination, Box, Typography 
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import HistoryIcon from '@mui/icons-material/History';
import { historicoService } from '../services/historicoPlacaService';
import type { EventoPlacaResponse } from '../types/historico';
import { DetalhesVistoriaDialog } from './DetalheVistoriaDialog';
import { EditRelatorioDialog } from './EditRelatorioDialog';
import './HistoricoDialog.css';
import { DeleteRelatorioDialog } from './DeleteRelatorioDialog';
import { toast } from 'sonner';
import { toastOptions } from '../lib/toastOptions';

interface HistoricoDialogProps {
  placaId: string;
  open: boolean;
  onClose: () => void;
  enderecoPlaca?: string;
  onDeleted?: () => void;
}

function dataFormatada(data: string) {
  return data.slice(0, 10).split('-').reverse().join('/');
}

export function HistoricoDialog({ placaId, open, onClose, onDeleted, enderecoPlaca = 'Endereço não informado' }: HistoricoDialogProps) {
  const [loading, setLoading] = useState(false);
  const [itens, setItens] = useState<EventoPlacaResponse[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [eventoSelecionado, setEventoSelecionado] = useState<EventoPlacaResponse | null>(null);
  
  const [modalEdicaoAberto, setModalEdicaoAberto] = useState(false);
  const [eventoEditando, setEventoEditando] = useState<EventoPlacaResponse | null>(null);
  
  const [eventoExcluindo, setEventoExcluindo] = useState<EventoPlacaResponse | null>(null);
  const [revisao, setRevisao] = useState(0);
  const [total, setTotal] = useState(0);
  const requestVersion = useRef(0);
  const pageSize = 5;

  useEffect(() => {
    if (!open) return;
    let ativo = true;
    const version = ++requestVersion.current;

    async function carregarDados() {
      setLoading(true);
      try {
        const resultado = await historicoService.obterHistorico(placaId, page, pageSize);
        if (ativo && version === requestVersion.current) {
          const ultimaPagina = Math.max(1, Math.ceil(resultado.total / resultado.page_size));
          if (page > ultimaPagina) { setPage(ultimaPagina); return; }
          setTotal(resultado.total);
          setItens(resultado.items);
          setTotalPages(Math.ceil(resultado.total / resultado.page_size) || 1);
        }
      } catch {
        if (ativo && version === requestVersion.current) toast.error('Não foi possível atualizar o histórico. Tente abrir novamente.', toastOptions);
      } finally {
        if (ativo && version === requestVersion.current) setLoading(false);
      }
    }

    carregarDados();
    return () => { ativo = false; };
  }, [placaId, page, open, revisao]);

  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth aria-labelledby="modal-historico-titulo">
        <DialogTitle className="historico-modal-header">
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <HistoryIcon color="action" />
            <Box>
              <Typography variant="h6" component="h2" id="modal-historico-titulo">
                Histórico de registros
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Acompanhe todas as alterações realizadas nessa placa ao longo do tempo
              </Typography>
            </Box>
          </Box>
          <IconButton onClick={onClose} aria-label="Fechar modal" size="small">
            <CloseIcon />
          </IconButton>
        </DialogTitle>

        <DialogContent dividers className="historico-modal-content">
          {loading ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', py: 4, gap: 2 }}>
              <CircularProgress size={32} />
              <Typography variant="body2" color="textSecondary">Carregando histórico...</Typography>
            </Box>
          ) : itens.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Typography variant="body2" color="textSecondary">Nenhum registro encontrado no histórico desta placa.</Typography>
            </Box>
          ) : (
            <ol className="plate-timeline">
              {itens.map((evento) => (
                <li key={evento.id} onClick={() => setEventoSelecionado(evento)} style={{ cursor: 'pointer' }}>
                  <div className="plate-event-text">
                    <time dateTime={evento.timestamp}>{dataFormatada(evento.timestamp)}</time>
                    <p>
                      <strong>{evento.tipo_evento}</strong> · Conservação: {evento.estado_conservacao}
                    </p>
                    {evento.observacao && <p className="plate-obs">{evento.observacao}</p>}
                    <p>Responsável ID: {evento.created_by}</p>
                  </div>
                  <figure>
                    <div className="plate-event-photo">
                      {evento.foto_url && (
                        <img src={evento.foto_url} alt={`Foto do evento — ${evento.tipo_evento}`} />
                      )}
                    </div>
                    <figcaption>{evento.tipo_evento}</figcaption>
                  </figure>
                </li>
              ))}
            </ol>
          )}
        </DialogContent>

        <Box component="div" sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
          <Pagination 
            count={totalPages} 
            page={page} 
            onChange={(_, novaPagina) => setPage(novaPagina)} 
            color="primary" 
            size="medium"
            shape='rounded'
            variant='outlined'
            disabled={loading}
          />
        </Box>
      </Dialog>

      <DetalhesVistoriaDialog 
        open={Boolean(eventoSelecionado)}
        onClose={() => setEventoSelecionado(null)}
        evento={eventoSelecionado}
        onEditar={(ev) => {
          setEventoSelecionado(null); // Fecha os detalhes
          setEventoEditando(ev);      // Guarda o evento
          setModalEdicaoAberto(true); // Abre o seu novo modal de edição
        }}
        onExcluir={(ev) => {
          setEventoExcluindo(ev);
        }}
      />

      {eventoExcluindo && <DeleteRelatorioDialog
        key={eventoExcluindo.id}
        placaId={placaId}
        evento={eventoExcluindo}
        onClose={() => setEventoExcluindo(null)}
        onDeleted={(eventoId) => {
          requestVersion.current += 1;
          setItens((atuais) => atuais.filter((item) => item.id !== eventoId));
          const novoTotal = Math.max(0, total - 1);
          const paginas = Math.max(1, Math.ceil(novoTotal / pageSize));
          setTotal(novoTotal);
          setTotalPages(paginas);
          setPage((atual) => Math.min(atual, paginas));
          setEventoSelecionado(null);
          setEventoExcluindo(null);
          setRevisao((valor) => valor + 1);
          onDeleted?.();
        }}
      />}

      {/* O SEU NOVO MODAL DE EDIÇÃO */}
      <EditRelatorioDialog
        open={modalEdicaoAberto}
        onClose={() => setModalEdicaoAberto(false)}
        evento={eventoEditando}
        placaId={placaId}
        enderecoPlaca={enderecoPlaca}
        onSuccess={() => {
          setPage(1); 
        }}
      />
    </>
  );
}