import { AlertCircle, CheckCircle2, X } from 'lucide-react';

/**
 * Shared alert banner for error/success messages.
 *
 * @param {object} props
 * @param {'error' | 'success'} props.type - Alert variant
 * @param {string} props.message - Alert text
 * @param {function} [props.onDismiss] - Optional dismiss handler (shows X button)
 */
export default function AlertMessage({ type = 'error', message, onDismiss }) {
  if (!message) return null;

  const isError = type === 'error';

  return (
    <div
      className={`mb-4 p-3 rounded-xl flex items-start gap-2.5 ${
        isError
          ? 'bg-red-50 border border-red-100'
          : 'bg-green-50 border border-green-100'
      }`}
    >
      {isError ? (
        <AlertCircle size={16} className="text-red-500 shrink-0 mt-0.5" />
      ) : (
        <CheckCircle2 size={16} className="text-green-500 shrink-0 mt-0.5" />
      )}
      <p className={`text-sm ${isError ? 'text-red-600' : 'text-green-600'}`}>
        {message}
      </p>
      {onDismiss && (
        <button
          onClick={onDismiss}
          className={`ml-auto ${isError ? 'text-red-400 hover:text-red-600' : 'text-green-400 hover:text-green-600'}`}
        >
          <X size={16} />
        </button>
      )}
    </div>
  );
}
