import { HtmlPreview } from "@/components/html-preview";

export default function HtmlPreviewPage() {
  return (
    <section className="flex flex-col items-center justify-center gap-6 py-8 md:py-12 px-4">
      <div className="inline-block max-w-2xl text-center justify-center mb-6">
        <h1 className="text-3xl font-bold">HTML预览</h1>
        <p className="text-default-500 mt-3">
          在线HTML预览工具，支持代码编辑和实时预览
        </p>
      </div>

      <div className="w-full max-w-6xl">
        <HtmlPreview />
      </div>
    </section>
  );
}
