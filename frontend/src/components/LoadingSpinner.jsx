import { Loader2 } from 'lucide-react';

/**
 * Shared loading spinner with consistent styling.
 *
 * @param {object} props
 * @param {number} [props.size=24] - Icon size in px
 * @param {string} [props.className] - Additional wrapper classes
 * @param {string} [props.message] - Optional text below the spinner
 */
export default function LoadingSpinner({ size = 24, className = '', message }) {
  return (
    <div className={`flex flex-col items-center justify-center py-20 ${className}`}>
      <Loader2 size={size} className="animate-spin text-indigo-500" />
      {message && <p className="text-gray-500 text-sm mt-3">{message}</p>}
    </div>
  );
}
