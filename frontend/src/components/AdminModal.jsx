import { X, Check, Loader2 } from 'lucide-react';
import AlertMessage from './AlertMessage';

/**
 * Shared modal for admin CRUD operations.
 *
 * @param {object} props
 * @param {boolean} props.open - Whether the modal is visible
 * @param {function} props.onClose - Handler to close the modal
 * @param {string} props.title - Modal heading
 * @param {string} [props.error] - Error message to display
 * @param {boolean} [props.saving] - Whether a save operation is in progress
 * @param {function} props.onSave - Handler for the save/submit button
 * @param {string} [props.saveLabel='Create'] - Label for the save button
 * @param {React.ReactNode} props.children - Form content
 * @param {string} [props.maxWidth='max-w-md'] - Max width class for the modal
 */
export default function AdminModal({
  open,
  onClose,
  title,
  error,
  saving = false,
  onSave,
  saveLabel = 'Create',
  children,
  maxWidth = 'max-w-md',
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/40" onClick={onClose} />
      <div className={`relative bg-white rounded-2xl shadow-xl w-full ${maxWidth} p-6`}>
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
        >
          <X size={20} />
        </button>

        <h2 className="text-lg font-bold text-gray-900 mb-5">{title}</h2>

        {error && <AlertMessage type="error" message={error} />}

        <div className="space-y-4">{children}</div>

        <div className="flex gap-3 mt-6 pt-4 border-t border-gray-100">
          <button
            onClick={onClose}
            className="btn-secondary !py-2 !px-4 text-sm flex-1"
          >
            Cancel
          </button>
          <button
            onClick={onSave}
            disabled={saving}
            className="btn-primary !py-2 !px-4 text-sm flex-1 flex items-center justify-center gap-1.5"
          >
            {saving ? (
              <Loader2 size={15} className="animate-spin" />
            ) : (
              <Check size={15} />
            )}
            {saveLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
