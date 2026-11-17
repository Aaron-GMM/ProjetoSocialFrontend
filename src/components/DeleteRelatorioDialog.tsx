import { useRef, useState } from 'react';
import { isAxiosError } from 'axios';
import { Box, Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle } from '@mui/material';
import DeleteOutlineIcon from '@mui/icons-material/Delete';
import { toast } from 'sonner';
import { toastOptions } from '../lib/toastOptions';
import { historicoService } from '../services/historicoPlacaService';
import type { EventoPlacaResponse } from '../types/historico';

interface Props {
  placaId: string;
  evento: EventoPlacaResponse;
  onClose: () => void;
  onDeleted: (eventoId: string) => void;
}

export function DeleteRelatorioDialog({ placaId, evento, onClose, onDeleted }: Props) {
  const [submitting, setSubmitting] = useState(false);
  const pending = useRef(false);
  const cancelButton = useRef<HTMLButtonElement>(null);

  function fechar() {
    if (!pending.current) onClose();
  }

  async function confirmar() {
    if (pending.current) return;
    pending.current = true;
    setSubmitting(true);
    try {
      await historicoService.excluirEvento(placaId, evento.id);
    } catch (cause) {
      const status = isAxiosError(cause) ? cause.response?.status : undefined;
      toast.error(status === 403
        ? 'Você não tem permissão para excluir este relatório.'
        : status === 404
          ? 'Este relatório não foi encontrado. Atualize o histórico.'
          : status === 400
            ? 'O registro inicial não pode ser excluído enquanto for o único registro ativo da placa.'
            : status === 409 || status === 422
            ? 'Este registro não pode ser excluído. Verifique as regras de exclusão.'
            : 'Não foi possível excluir o relatório. Tente novamente.', toastOptions);
      pending.current = false;
      setSubmitting(false);
      return;
    }
    toast.success('Relatório excluído com sucesso.', toastOptions);
    onDeleted(evento.id);
  }

  return (
    <Dialog open onClose={fechar} fullWidth maxWidth="sm"
      aria-labelledby="delete-report-title" aria-describedby="delete-report-description" aria-busy={submitting}
      slotProps={{ transition: { onEntered: () => cancelButton.current?.focus() }, paper: { sx: { bgcolor: '#fff', borderRadius: 3 } } }}>
      <DialogTitle id="delete-report-title" sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <Box aria-hidden="true" sx={{ width: 56, height: 56, flexShrink: 0, display: 'grid', placeItems: 'center', borderRadius: '50%', bgcolor: '#ffdddd', color: 'error.main' }}>
          <DeleteOutlineIcon sx={{ fontSize: 32 }} />
        </Box>
        Excluir relatório?
      </DialogTitle>
      <DialogContent sx={{ pt: '12px !important' }}>
        <DialogContentText id="delete-report-description">
          Deseja excluir o registro de <strong>{evento.tipo_evento}</strong> de <strong>{evento.timestamp.slice(0, 10).split('-').reverse().join('/')}</strong>?
          <br />Esta ação não poderá ser desfeita.
        </DialogContentText>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 3, gap: 1, flexWrap: 'wrap' }}>
        <Button ref={cancelButton} size="large" variant="outlined" color="inherit" disabled={submitting} onClick={fechar}>Cancelar</Button>
        <Button size="large" variant="contained" color="error" disabled={submitting} onClick={() => void confirmar()}>
          {submitting ? 'Excluindo…' : 'Excluir relatório'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
