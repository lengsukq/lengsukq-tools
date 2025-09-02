import { MarkdownPreview } from "@/components/markdown-preview";

export default function MarkdownPreviewPage() {
  return (
    <section className="flex flex-col items-center justify-center gap-6 py-8 md:py-12 px-4">
      <div className="inline-block max-w-2xl text-center justify-center mb-6">
        <h1 className="text-3xl font-bold">Markdown预览</h1>
        <p className="text-default-500 mt-3">在线Markdown编辑器和预览工具</p>
      </div>

      <div className="w-full max-w-6xl">
        <MarkdownPreview />
      </div>
    </section>
  );
}
