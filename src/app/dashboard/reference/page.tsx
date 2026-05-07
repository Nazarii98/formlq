"use client";

export default function ReferencePage() {
  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem-3rem)] space-y-3">
      <div>
        <h1 className="text-xl font-bold">Довідкові матеріали</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Формули та таблиці для підготовки до НМТ</p>
      </div>
      <div className="flex-1 rounded-2xl border border-border/50 overflow-hidden">
        <iframe
          src="/dovidka.pdf"
          className="w-full h-full"
          title="Довідкові матеріали НМТ"
        />
      </div>
    </div>
  );
}
