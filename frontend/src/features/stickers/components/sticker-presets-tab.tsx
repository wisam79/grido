import { Button } from '@/components/ui/button';
import { BookmarkSimple, FloppyDisk, Plus, Trash } from '@/components/ui/icons';
import { Input } from '@/components/ui/input';

import type { StickerUserPreset } from '../types';

export interface StickerPresetsTabProps {
  templatePresets: StickerUserPreset[];
  /** إجمالي القوالب عبر كل القوالب — يُعرض عند وجود قوالب لغير هذا القالب */
  presetsTotal: number;
  newPresetName: string;
  setNewPresetName: (name: string) => void;
  onSavePreset: () => void;
  onDeletePreset: (id: string, name: string) => void;
  onApplyPreset: (preset: StickerUserPreset) => void;
}

/** تبويب «قوالبي» في لوح خصائص الملصق — حفظ واسترجاع تخصيصات القالب الحالي */
export function StickerPresetsTab({
  templatePresets,
  presetsTotal,
  newPresetName,
  setNewPresetName,
  onSavePreset,
  onDeletePreset,
  onApplyPreset,
}: StickerPresetsTabProps) {
  return (
    <div className="space-y-3">
      {/* حفظ التخصيص الحالي */}
      <div className="p-3 rounded-md bg-card/60 border border-border/40 space-y-2.5">
        <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
          <FloppyDisk className="w-4 h-4 text-primary" weight="duotone" />
          <span>حفظ التخصيص</span>
        </div>
        <p className="text-mini text-muted-foreground leading-relaxed">
          احفظ النصوص والألوان والخط لاسترجاعها لاحقاً.
        </p>
        <div className="flex items-center gap-1.5">
          <Input
            type="text"
            value={newPresetName}
            onChange={(e) => setNewPresetName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') onSavePreset();
            }}
            placeholder="اسم القالب"
            className="h-8 text-xs font-medium rounded-md flex-1 bg-background/80"
          />
          <Button
            type="button"
            size="sm"
            onClick={onSavePreset}
            className="h-8 px-3 rounded-md text-xs font-bold gap-1 cursor-pointer shrink-0 bg-primary-action text-primary-foreground hover:bg-primary-action-hover"
          >
            <Plus className="w-3.5 h-3.5" weight="bold" />
            <span>حفظ</span>
          </Button>
        </div>
      </div>

      {/* قائمة القوالب المحفوظة */}
      <div className="space-y-2">
        <div className="flex items-center justify-between px-0.5">
          <span className="text-xs font-bold text-foreground">
            القوالب المحفوظة ({templatePresets.length})
          </span>
          {presetsTotal > templatePresets.length && (
            <span className="text-micro text-muted-foreground">{presetsTotal} قالب إجمالي</span>
          )}
        </div>

        {templatePresets.length > 0 ? (
          <div className="space-y-2">
            {templatePresets.map((preset) => (
              <div
                key={preset.id}
                className="p-2.5 rounded-md bg-card/60 hover:bg-card border border-border/40 hover:border-primary/40 transition-colors space-y-2"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-foreground truncate" title={preset.name}>
                    {preset.name}
                  </span>

                  {/* Color Dots */}
                  <div className="flex items-center gap-1 shrink-0">
                    <span
                      className="w-3 h-3 rounded-full border border-black/10 shadow-2xs"
                      style={{ backgroundColor: preset.params.primaryColor }}
                      title={`الرئيسي: ${preset.params.primaryColor}`}
                    />
                    <span
                      className="w-3 h-3 rounded-full border border-black/10 shadow-2xs"
                      style={{ backgroundColor: preset.params.secondaryColor }}
                      title={`الثانوي: ${preset.params.secondaryColor}`}
                    />
                    <span
                      className="w-3 h-3 rounded-full border border-black/10 shadow-2xs"
                      style={{ backgroundColor: preset.params.backgroundColor }}
                      title={`الخلفية: ${preset.params.backgroundColor}`}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2 pt-1 border-t border-border/20">
                  <span className="text-micro text-muted-foreground font-mono">
                    {new Date(preset.createdAt).toLocaleDateString('ar-EG-u-nu-latn', {
                      month: 'short',
                      day: 'numeric',
                    })}
                  </span>

                  <div className="flex items-center gap-1.5">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => onDeletePreset(preset.id, preset.name)}
                      className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md cursor-pointer"
                      title="حذف"
                    >
                      <Trash className="w-3.5 h-3.5" />
                    </Button>

                    <Button
                      type="button"
                      size="sm"
                      onClick={() => onApplyPreset(preset)}
                      className="h-7 px-3 text-xs font-bold rounded-md cursor-pointer bg-primary/15 text-primary hover:bg-primary-action hover:text-primary-foreground transition-colors gap-1"
                    >
                      <span>تطبيق</span>
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-4 rounded-md bg-card/30 border border-dashed border-border/50 text-center space-y-1.5">
            <BookmarkSimple className="w-7 h-7 mx-auto text-muted-foreground/60" weight="duotone" />
            <p className="text-xs font-semibold text-foreground/80">لا قوالب محفوظة</p>
            <p className="text-mini text-muted-foreground leading-relaxed">
              اكتب اسماً بالأعلى واضغط "حفظ" لاستخدامه لاحقاً.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
