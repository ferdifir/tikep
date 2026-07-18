import { SearchX } from "lucide-react";

export function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="flex min-h-64 flex-col items-center justify-center px-8 text-center">
      <SearchX className="mb-3 h-9 w-9 text-gray-300" />
      <h2 className="text-sm font-semibold text-gray-900">{title}</h2>
      <p className="mt-1 text-sm leading-6 text-gray-500">{body}</p>
    </div>
  );
}
