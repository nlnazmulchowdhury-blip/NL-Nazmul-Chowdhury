import { Link } from 'react-router-dom';
import { Github, Heart } from 'lucide-react';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-gray-50 border-t border-gray-100 mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <Link to="/" className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                <span className="text-white font-bold text-xs">P</span>
              </div>
              <span className="font-semibold text-gray-900">
                Pro<span className="text-indigo-600">Converter</span>BD
              </span>
            </Link>
            <p className="text-sm text-gray-500 leading-relaxed">
              Your all-in-one online file conversion platform. Fast, secure, and free.
            </p>
          </div>

          {/* Tools */}
          <div>
            <h4 className="text-xs font-semibold text-gray-900 uppercase tracking-wider mb-3">Tools</h4>
            <ul className="space-y-2">
              {['Image to JPG', 'PDF to JPG', 'Compress Image', 'QR Generator'].map((tool) => (
                <li key={tool}>
                  <Link
                    to={`/tool/${tool.toLowerCase().replace(/\s+/g, '-')}`}
                    className="text-sm text-gray-500 hover:text-indigo-600 transition-colors"
                  >
                    {tool}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Categories */}
          <div>
            <h4 className="text-xs font-semibold text-gray-900 uppercase tracking-wider mb-3">Categories</h4>
            <ul className="space-y-2">
              {['Image', 'PDF', 'Text', 'Color', 'Media'].map((cat) => (
                <li key={cat}>
                  <Link
                    to={`/category/${cat.toLowerCase()}`}
                    className="text-sm text-gray-500 hover:text-indigo-600 transition-colors"
                  >
                    {cat}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className="text-xs font-semibold text-gray-900 uppercase tracking-wider mb-3">Company</h4>
            <ul className="space-y-2">
              <li><Link to="/" className="text-sm text-gray-500 hover:text-indigo-600 transition-colors">About</Link></li>
              <li><Link to="/" className="text-sm text-gray-500 hover:text-indigo-600 transition-colors">Privacy</Link></li>
              <li><Link to="/" className="text-sm text-gray-500 hover:text-indigo-600 transition-colors">Terms</Link></li>
              <li><Link to="/" className="text-sm text-gray-500 hover:text-indigo-600 transition-colors">Contact</Link></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-200 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-gray-400">
            &copy; {currentYear} ProConverterBD. All rights reserved.
          </p>
          <p className="text-xs text-gray-400 flex items-center gap-1">
            Made with <Heart size={12} className="text-red-400" /> in Bangladesh
          </p>
        </div>
      </div>
    </footer>
  );
}
