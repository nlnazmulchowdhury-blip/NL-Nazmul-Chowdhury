/**
 * Shared page header layout for admin pages.
 *
 * @param {object} props
 * @param {string} props.title - Page heading
 * @param {string} [props.subtitle] - Description text below the title
 * @param {React.ReactNode} [props.actions] - Right-side action buttons
 */
export default function AdminPageHeader({ title, subtitle, actions }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
        {subtitle && <p className="text-gray-500 text-sm mt-1">{subtitle}</p>}
      </div>
      {actions && <div className="flex gap-3">{actions}</div>}
    </div>
  );
}
