import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { getCategories, getTools } from '../api';
import ToolCard from '../components/ToolCard';
import LoadingSpinner from '../components/LoadingSpinner';

export default function CategoryPage() {
  const { slug } = useParams();
  const [category, setCategory] = useState(null);
  const [tools, setTools] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);

    Promise.all([
      getCategories(),
      getTools(slug),
    ])
      .then(([categories, toolsData]) => {
        const cat = categories.find((c) => c.slug === slug);
        setCategory(cat);
        setTools(toolsData);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [slug]);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4">
        <LoadingSpinner message="Loading tools..." />
      </div>
    );
  }

  if (!category) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Category not found</h2>
        <Link to="/" className="text-indigo-600 hover:underline">Back to home</Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Back */}
      <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-indigo-600 mb-6 transition-colors">
        <ArrowLeft size={16} /> Back to Home
      </Link>

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">{category.name} Tools</h1>
        <p className="text-gray-500 mt-2">{category.description}</p>
        <p className="text-sm text-gray-400 mt-1">{tools.length} tools available</p>
      </div>

      {/* Tools Grid */}
      {tools.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-2xl">
          <p className="text-gray-500">No tools found in this category.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {tools.map((tool, i) => (
            <ToolCard key={tool.slug} tool={tool} index={i} />
          ))}
        </div>
      )}
    </div>
  );
}
