"use client";
import React from "react";
import { useStore } from "@/lib/store";

interface SliderRowProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit?: string;
  onChange: (v: number) => void;
}

function SliderRow({ label, value, min, max, step, unit = "", onChange }: SliderRowProps) {
  return (
    <div className="flex flex-col gap-0.5 mb-2">
      <div className="flex justify-between text-xs text-gray-500">
        <span>{label}</span>
        <span className="font-mono text-gray-700">{value}{unit}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full h-1.5 accent-blue-600 cursor-pointer"
      />
    </div>
  );
}

export function GlobalControls() {
  const { settings, updateSettings } = useStore();

  return (
    <div className="flex flex-col gap-1 text-sm">
      <div className="font-semibold text-xs uppercase tracking-widest text-gray-400 mb-1">Typography</div>
      <SliderRow label="MCQ Font Size" value={settings.mcqFontSize} min={8} max={16} step={0.5} unit="px" onChange={(v) => updateSettings({ mcqFontSize: v })} />
      <SliderRow label="Prop Font Size" value={settings.propFontSize} min={7} max={14} step={0.5} unit="px" onChange={(v) => updateSettings({ propFontSize: v })} />

      <div className="font-semibold text-xs uppercase tracking-widest text-gray-400 mb-1 mt-2">Spacing</div>
      <SliderRow label="Density" value={settings.density} min={0.6} max={2.0} step={0.05} onChange={(v) => updateSettings({ density: v })} />
      <SliderRow label="Column Gap" value={settings.columnGap} min={4} max={24} step={1} unit="mm" onChange={(v) => updateSettings({ columnGap: v })} />

      <div className="font-semibold text-xs uppercase tracking-widest text-gray-400 mb-1 mt-2">Page Margins (mm)</div>
      <div className="grid grid-cols-2 gap-x-3">
        <SliderRow label="Top" value={settings.marginTop} min={5} max={40} step={1} unit="mm" onChange={(v) => updateSettings({ marginTop: v })} />
        <SliderRow label="Bottom" value={settings.marginBottom} min={5} max={40} step={1} unit="mm" onChange={(v) => updateSettings({ marginBottom: v })} />
        <SliderRow label="Left" value={settings.marginLeft} min={5} max={40} step={1} unit="mm" onChange={(v) => updateSettings({ marginLeft: v })} />
        <SliderRow label="Right" value={settings.marginRight} min={5} max={40} step={1} unit="mm" onChange={(v) => updateSettings({ marginRight: v })} />
      </div>

      <div className="font-semibold text-xs uppercase tracking-widest text-gray-400 mb-1 mt-2">Content</div>

      <label className="flex items-center gap-2 cursor-pointer select-none">
        <div
          onClick={() => updateSettings({ enableExplanations: !settings.enableExplanations })}
          className={`w-9 h-5 rounded-full transition-colors relative ${settings.enableExplanations ? "bg-blue-600" : "bg-gray-300"}`}
        >
          <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${settings.enableExplanations ? "translate-x-4" : "translate-x-0.5"}`} />
        </div>
        <span className="text-xs text-gray-700">Enable Explanations</span>
      </label>

      <label className="flex items-center gap-2 cursor-pointer select-none mt-1">
        <div
          onClick={() => updateSettings({ showDuplicateHighlighting: !settings.showDuplicateHighlighting })}
          className={`w-9 h-5 rounded-full transition-colors relative ${settings.showDuplicateHighlighting ? "bg-orange-500" : "bg-gray-300"}`}
        >
          <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${settings.showDuplicateHighlighting ? "translate-x-4" : "translate-x-0.5"}`} />
        </div>
        <span className="text-xs text-gray-700">Duplicate Highlighting</span>
      </label>

      <div className="mt-2">
        <SliderRow
          label="Fuzzy Threshold"
          value={Math.round(settings.fuzzyThreshold * 100)}
          min={50} max={100} step={5} unit="%"
          onChange={(v) => updateSettings({ fuzzyThreshold: v / 100 })}
        />
      </div>
    </div>
  );
}
