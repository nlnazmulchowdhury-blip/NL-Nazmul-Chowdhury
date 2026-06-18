export default function AdBanner({
  position = "top",
  className = "",
}: {
  position?: "top" | "bottom";
  className?: string;
}) {
  return (
    <div
      className={className}
      style={{
        minHeight: position === "top" ? "90px" : "120px",
      }}
    >
      <div className="flex justify-center items-center h-full rounded-2xl bg-gradient-to-r from-indigo-50/50 to-purple-50/50 border border-indigo-100/50 text-xs text-gray-400">
        Ad Space
      </div>
    </div>
  );
}
