import Link from "next/link";
import * as Icons from "lucide-react";

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
    iconCache.set(pascalName, (Icon || Icons.Wrench) as React.ComponentType<{ size?: number }>);
  }
  return iconCache.get(pascalName)!;
}

interface ToolCardTool {
  slug: string;
  name: string;
  description: string;
  icon: string;
  color?: string;
}

export default function ToolCard({
  tool,
  index = 0,
}: {
  tool: ToolCardTool;
  index?: number;
}) {
  const Icon = getIcon(tool.icon);
  const color = tool.color || "#6366f1";
  const animationDelay = `${index * 0.05}s`;

  return (
    <Link
      href={`/tool/${tool.slug}`}
      className="card-hover group relative bg-white rounded-2xl border border-gray-100 p-5 block"
      style={{ animationDelay }}
    >
      {/* Gradient overlay */}
      <div
        className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-5 transition-opacity duration-300"
        style={{
          background: `linear-gradient(135deg, ${color}88, ${color}22)`,
        }}
      />

      <div className="relative">
        {/* Icon Circle */}
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center mb-4 transition-transform duration-300 group-hover:scale-110"
          style={{
            background: `linear-gradient(135deg, ${color}15, ${color}08)`,
            color: color,
          }}
        >
          <Icon size={22} />
        </div>

        {/* Name */}
        <h3 className="text-sm font-semibold text-gray-900 mb-1.5 group-hover:text-indigo-600 transition-colors">
          {tool.name}
        </h3>

        {/* Description */}
        <p className="text-xs text-gray-500 leading-relaxed line-clamp-2">
          {tool.description}
        </p>

        {/* Bottom indicator */}
        <div className="mt-4 flex items-center gap-1.5 text-xs font-medium text-indigo-500 opacity-0 group-hover:opacity-100 transition-all translate-y-1 group-hover:translate-y-0">
          <span>Convert now</span>
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M5 12h14" />
            <path d="m12 5 7 7-7 7" />
          </svg>
        </div>
      </div>
    </Link>
  );
}
