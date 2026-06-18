import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Upload, Shield, Zap, Cpu, AlertCircle, Loader2, RefreshCw } from 'lucide-react';
import { getCategories } from '../api';
import CategorySection from '../components/CategorySection';
import AdBanner from '../components/AdBanner';

export default function HomePage() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchCategories = () => {
    setLoading(true);
    setError(null);
    getCategories()
      .then((data) => {
        if (Array.isArray(data)) {
          setCategories(data);
        } else {
          console.warn('Unexpected API response format:', data);
          setCategories([]);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load categories:', err.message);
        setError(err.message || 'Failed to load tools. Please try again later.');
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const features = [
    { icon: Upload, title: 'Easy Upload', desc: 'Drag & drop or browse files' },
    { icon: Zap, title: 'Fast Processing', desc: 'Convert in seconds' },
    { icon: Shield, title: 'Secure', desc: 'Files auto-delete after 1 hour' },
    { icon: Cpu, title: 'Free Forever', desc: 'No hidden charges' },
  ];

  return (
    <div>
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-indigo-50/40 via-white to-white">
        {/* Background grid decoration */}
        <div className="absolute inset-0 bg-grid opacity-50" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-20 md:pt-24 md:pb-28">
          <div className="text-center max-w-3xl mx-auto">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-50 border border-indigo-100 mb-6">
              <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse-subtle" />
              <span className="text-xs font-medium text-indigo-600">Free Online Converter</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 tracking-tight leading-tight">
              All-in-One File
              <br />
              <span className="text-gradient">Conversion Platform</span>
            </h1>

            <p className="mt-5 text-lg text-gray-500 max-w-xl mx-auto leading-relaxed">
              Convert images, PDFs, text, and more — all in one place. Fast, secure, and completely free. No sign-up required.
            </p>

            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link to="/tools" className="btn-primary text-base flex items-center gap-2">
                Start Converting <ArrowRight size={18} />
              </Link>
              <Link to="/tool/image-to-jpg" className="btn-secondary text-base">
                Try Image to JPG
              </Link>
            </div>

            {/* Stats */}
            <div className="mt-12 flex items-center justify-center gap-8 sm:gap-12">
              {[
                { label: 'Tools', value: '22+' },
                { label: 'Format Support', value: '50+' },
                { label: 'Free', value: '100%' },
              ].map((stat) => (
                <div key={stat.label} className="text-center">
                  <div className="text-2xl sm:text-3xl font-bold text-gray-900">{stat.value}</div>
                  <div className="text-xs sm:text-sm text-gray-400 font-medium">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Wave separator */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 40" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full">
            <path d="M0 20Q360 40 720 20Q1080 0 1440 20V40H0V20Z" fill="white" />
          </svg>
        </div>
      </section>

      {/* Features strip */}
      <section className="bg-white py-8 border-b border-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {features.map((feat) => (
              <div key={feat.title} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50/50">
                <div className="w-9 h-9 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
                  <feat.icon size={18} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">{feat.title}</p>
                  <p className="text-xs text-gray-500">{feat.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Ad Banner Top */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
        <AdBanner position="top" />
      </div>

      {/* Category Sections */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-10 mb-16">
        {loading ? (
          /* Loading skeleton grid */
          <div className="space-y-10">
            {[1, 2, 3].map((i) => (
              <div key={i}>
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gray-100 animate-pulse-subtle" />
                    <div>
                      <div className="h-5 w-32 bg-gray-100 rounded animate-pulse-subtle" />
                      <div className="h-3 w-24 bg-gray-50 rounded mt-1 animate-pulse-subtle" />
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                  {Array.from({ length: 6 }).map((_, j) => (
                    <div key={j} className="bg-gray-50 rounded-2xl h-32 animate-pulse-subtle" />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          /* Error state */
          <div className="text-center py-16">
            <div className="w-16 h-16 rounded-2xl bg-red-50 flex items-center justify-center mx-auto mb-4">
              <AlertCircle size={28} className="text-red-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Unable to Load Tools</h3>
            <p className="text-sm text-gray-500 max-w-md mx-auto mb-6">
              {error}. This might be because the backend is starting up or there's a network issue.
            </p>
            <button
              onClick={fetchCategories}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-indigo-600 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 transition-all"
            >
              <RefreshCw size={16} />
              Try Again
            </button>
          </div>
        ) : categories.length === 0 ? (
          /* Empty state */
          <div className="text-center py-16">
            <div className="w-16 h-16 rounded-2xl bg-gray-50 flex items-center justify-center mx-auto mb-4">
              <Zap size={28} className="text-gray-300" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Tools Available Yet</h3>
            <p className="text-sm text-gray-500 max-w-md mx-auto">
              Tools are being added. Check back soon or visit the admin panel to add conversion tools.
            </p>
          </div>
        ) : (
          /* Categories loaded successfully */
          (categories ?? []).map((category) => (
            <CategorySection key={category.slug} category={category} />
          ))
        )}
      </div>

      {/* CTA */}
      <section className="bg-gradient-to-r from-indigo-600 to-purple-600 py-16">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Ready to Convert?
          </h2>
          <p className="text-indigo-100 mb-8 text-lg">
            No sign-up required. Just upload, convert, and download.
          </p>
          <Link
            to="/tools"
            className="inline-flex items-center gap-2 bg-white text-indigo-600 px-8 py-3.5 rounded-xl font-semibold hover:bg-indigo-50 transition-all shadow-xl shadow-indigo-900/20"
          >
            Get Started Now <ArrowRight size={18} />
          </Link>
        </div>
      </section>
    </div>
  );
}
