import React from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { SquaresFour, Faders } from '@phosphor-icons/react';

interface MobilePanelsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activeTab: 'templates' | 'properties';
  onActiveTabChange: (tab: 'templates' | 'properties') => void;
  templatesContent: React.ReactNode;
  propertiesContent: React.ReactNode;
}

export const MobilePanelsSheet = React.memo(function MobilePanelsSheet({
  open,
  onOpenChange,
  activeTab,
  onActiveTabChange,
  templatesContent,
  propertiesContent,
}: MobilePanelsSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[88vw] sm:w-[380px] p-0 font-cairo flex flex-col" dir="rtl">
        <SheetHeader className="px-4 py-3 border-b border-border bg-sidebar/50">
          <SheetTitle className="text-sm font-bold text-foreground flex items-center justify-between">
            <span>لوحات العمل</span>
          </SheetTitle>
        </SheetHeader>

        <Tabs
          value={activeTab}
          onValueChange={(val) => onActiveTabChange(val as 'templates' | 'properties')}
          className="flex-1 flex flex-col overflow-hidden"
          dir="rtl"
        >
          <div className="px-3 pt-2 pb-1 border-b border-border/60 bg-muted/20">
            <TabsList className="w-full grid grid-cols-2 h-9">
              <TabsTrigger value="properties" className="gap-1.5 text-xs font-semibold">
                <Faders className="w-5 h-5" />
                <span>الخصائص</span>
              </TabsTrigger>
              <TabsTrigger value="templates" className="gap-1.5 text-xs font-semibold">
                <SquaresFour className="w-5 h-5" />
                <span>القوالب</span>
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="flex-1 overflow-hidden">
            <TabsContent value="properties" className="h-full m-0 p-0 overflow-hidden">
              {propertiesContent}
            </TabsContent>
            <TabsContent value="templates" className="h-full m-0 p-0 overflow-hidden">
              {templatesContent}
            </TabsContent>
          </div>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
});
