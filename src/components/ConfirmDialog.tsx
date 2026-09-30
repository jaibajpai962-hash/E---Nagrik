import Modal from './Modal';
interface Props { title: string; message: string; confirmText?: string; onConfirm: () => void; onCancel: () => void }
export default function ConfirmDialog({ title, message, confirmText = 'Confirm', onConfirm, onCancel }: Props) {
  return (
    <Modal title={title} onClose={onCancel}>
      <p className="text-sm text-muted">{message}</p>
      <div className="mt-5 flex justify-end gap-2">
        <button className="btn-outline" onClick={onCancel}>Cancel</button>
        <button className="btn-danger" onClick={onConfirm}>{confirmText}</button>
      </div>
    </Modal>
  );
}
