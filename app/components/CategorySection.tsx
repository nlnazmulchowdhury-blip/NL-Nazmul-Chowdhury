import Link from "next/link";
import * as Icons from "lucide-react";
import ToolCard from "./ToolCard";

const iconCache = new Map<string, React.ComponentType<{ size?: number }>>();

function toPascalCase(str: string) {
  return str
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");
}

function getIcon(iconName: string) {
  const pascalName = toPascalCase(iconName);
  if (!iconCache.has(pascalName)) {
    const Icon = (Icons as any)[pascalName];
    iconCache.set(pascalName, (Icon || Icons.Package) as React.ComponentType<{ size?: number }>);
  }
  return iconCache.get(pascalName)!;
}

interface Tool {
  slug: string;
  name: string;
  description: string;
  icon: string;
  color?: string;
}

interface Category {
  slug: string;
  name: string;
  icon: string;
  tool_count: number;
  tools: Tool[];
}

export default function CategorySection({ category }: { category: Category }) {
  const Icon = getIcon(category.icon);
  const tools = category.tools.slice(0, 6);

  if (tools.length === 0) return null;

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
            <p className="text-xs text-gray-500">
              {category.tool_count} tools available
            </p>
          </div>
        </div>
        <Link
          href={`/category/${category.slug}`}
          className="text-sm font-medium text-indigo-600 hover:text-indigo-700 flex items-center gap-1 transition-colors"
        >
          View all
          <Icons.ArrowRight size={14} />
        </Link>
      </div>

      {/* Tools Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {tools.map((tool, i) => (
          <ToolCard key={tool.slug} tool={tool} index={i} />
        ))}
      </div>
    </section>
  );
}
