import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import * as Icons from 'lucide-react';
import ToolCard from './ToolCard';
import { getTools } from '../api';

const iconCache = {};

function toPascalCase(str) {
  return str.split('-').map(part => part.charAt(0).toUpperCase() + part.slice(1)).join('');
}

function getIcon(iconName, size = 24) {
  const key = `${iconName}-${size}`;
  if (!iconCache[key]) {
    const pascalName = toPascalCase(iconName);
    const Icon = Icons[pascalName];
    iconCache[key] = Icon || Icons.Package;
  }
  return iconCache[key];
}

export default function CategorySection({ category }) {
  const [tools, setTools] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    setLoading(true);

    getTools(category.slug)
      .then((data) => {
        if (mounted) {
          setTools(data.slice(0, 6));
          setLoading(false);
        }
      })
      .catch((err) => {
        console.error(`Failed to load tools for category "${category.slug}":`, err.message || err);
        if (mounted) setLoading(false);
      });

    return () => { mounted = false; };
  }, [category.slug]);

  const Icon = getIcon(category.icon);
  const displayCount = tools.length;

  if (displayCount === 0 && !loading) return null;

  return (
    <section className="mb-10">
      {/* Category Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
            <Icon size={20} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900">{category.name}</h2>
            <p className="text-xs text-gray-500">{category.tool_count} tools available</p>
          </div>
        </div>
        <Link
          to={`/category/${category.slug}`}
          className="text-sm font-medium text-indigo-600 hover:text-indigo-700 flex items-center gap-1 transition-colors"
        >
          View all
          <Icons.ArrowRight size={14} />
        </Link>
      </div>

      {/* Tools Grid */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-gray-50 rounded-2xl h-32 animate-pulse-subtle" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {tools.map((tool, i) => (
            <ToolCard key={tool.slug} tool={tool} index={i} />
          ))}
        </div>
      )}
    </section>
  );
}
