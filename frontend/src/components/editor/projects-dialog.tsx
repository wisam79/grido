import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useEditorStore } from "@/lib/editor-store";
import { SaveProject, GetAllProjects, DeleteProject } from "../../../wailsjs/go/handlers/ProjectHandler";
import { domain } from "../../../wailsjs/go/models";
import { PHOTO_TEMPLATES, COLLAGE_TEMPLATES } from "@/lib/templates";
import { toast } from "sonner";
import { FolderOpen, Save, Trash2, Calendar, Layout, Loader2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { uid } from "@/lib/utils";

interface ProjectsDialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  trigger?: React.ReactNode;
}


export function ProjectsDialog({ open, onOpenChange, trigger }: ProjectsDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = open !== undefined;
  const isOpen = isControlled ? open : internalOpen;
  const setIsOpen = isControlled ? onOpenChange : setInternalOpen;

  const [activeTab, setActiveTab] = useState<string>("save");
  const [projectName, setProjectName] = useState("");
  const [projectsList, setProjectsList] = useState<domain.Project[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // تحميل قائمة المشاريع عند فتح نافذة الحوار أو الانتقال لتبويب القائمة
  const fetchProjects = async () => {
    setIsLoading(true);
    try {
      const list = await GetAllProjects();
      setProjectsList(list);
    } catch (err) {
      console.error("Failed to load projects:", err);
      toast.error("فشل في تحميل المشاريع من قاعدة البيانات");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchProjects();
    }
  }, [isOpen]);

  const handleSave = async () => {
    if (!projectName.trim()) {
      toast.error("يرجى إدخال اسم للمشروع");
      return;
    }

    const state = useEditorStore.getState();
    setIsLoading(true);
    try {
      const currentId = state.projectId || uid();
      const projectData = new domain.Project({
        id: currentId,
        name: projectName,
        mode: state.mode,
        canvasWidth: state.canvasWidth,
        canvasHeight: state.canvasHeight,
        backgroundColor: state.backgroundColor,
        elements: JSON.stringify(state.elements),
        slots: JSON.stringify(state.slots),
        template: state.template ? JSON.stringify(state.template) : "",
        collageTemplate: state.collageTemplate ? JSON.stringify(state.collageTemplate) : "",
        printSettings: JSON.stringify(state.printSettings),
      });

      await SaveProject(projectData);
      toast.success(state.projectId ? "تم تحديث المشروع بنجاح" : "تم حفظ المشروع بنجاح في قاعدة البيانات المحلية");
      setProjectName("");
      // تحديث المعرف في الستور ليكون هذا المعرف إذا كان جديداً
      useEditorStore.setState({ projectId: currentId });
      fetchProjects();
      setActiveTab("list"); // الانتقال التلقائي لقائمة المشاريع بعد الحفظ
    } catch (err) {
      console.error("Failed to save project:", err);
      toast.error("فشل في حفظ المشروع");
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoad = (project: domain.Project) => {
    try {
      const parsedElements = project.elements ? JSON.parse(project.elements) : [];
      const parsedSlots = project.slots ? JSON.parse(project.slots) : [];
      
      const parsedTemplate = project.template ? JSON.parse(project.template) : null;
      const parsedCollageTemplate = project.collageTemplate ? JSON.parse(project.collageTemplate) : null;
      const parsedPrintSettings = project.printSettings ? JSON.parse(project.printSettings) : undefined;

      const projectData = {
        mode: project.mode,
        canvasWidth: project.canvasWidth,
        canvasHeight: project.canvasHeight,
        backgroundColor: project.backgroundColor,
        elements: parsedElements,
        slots: parsedSlots,
        template: parsedTemplate,
        collageTemplate: parsedCollageTemplate,
        printSettings: parsedPrintSettings,
      };

      useEditorStore.getState().loadProject(projectData, project.id);

      toast.success(`تم تحميل المشروع: ${project.name}`);
      // ملء حقل الاسم تلقائياً لسهولة التحديث
      setProjectName(project.name);
      setIsOpen?.(false);
    } catch (err) {
      console.error("Failed to load project details:", err);
      toast.error("فشل في تحميل بيانات هذا المشروع");
    }
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeleteId(id);
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    try {
      await DeleteProject(deleteId);
      toast.success("تم حذف المشروع بنجاح");
      // إذا كان هذا هو المشروع المفتوح حالياً، فمسح المعرف
      const state = useEditorStore.getState();
      if (state.projectId === deleteId) {
        useEditorStore.setState({ projectId: null });
      }
      fetchProjects();
    } catch (err) {
      console.error("Failed to delete project:", err);
      toast.error("فشل في حذف المشروع");
    } finally {
      setDeleteId(null);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className="sm:max-w-[500px]" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-primary font-cairo">
            <Layout className="w-5 h-5" />
            <span>مكتبة المشاريع المحلية</span>
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full mt-4 font-cairo">
          <TabsList className="grid grid-cols-2 mb-4">
            <TabsTrigger value="save" className="flex items-center gap-1.5 justify-center">
              <Save className="w-3.5 h-3.5" />
              <span>حفظ المشروع الحالي</span>
            </TabsTrigger>
            <TabsTrigger value="list" className="flex items-center gap-1.5 justify-center" onClick={fetchProjects}>
              <FolderOpen className="w-3.5 h-3.5" />
              <span>المشاريع المحفوظة</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="save" className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="proj-name">اسم المشروع الجديد</Label>
              <Input
                id="proj-name"
                placeholder="أدخل اسماً مميزاً للمشروع..."
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSave()}
              />
            </div>
            <Button className="w-full gap-2 mt-2" onClick={handleSave} disabled={isLoading}>
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              <span>حفظ في قاعدة البيانات</span>
            </Button>
          </TabsContent>

          <TabsContent value="list" className="space-y-2">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                <Loader2 className="w-8 h-8 animate-spin text-primary mb-2" />
                <span className="text-xs">جاري جلب المشاريع...</span>
              </div>
            ) : projectsList.length === 0 ? (
              <div className="text-center py-10 border-2 border-dashed rounded-lg text-muted-foreground text-sm">
                لا توجد مشاريع محفوظة حالياً في قاعدة البيانات.
              </div>
            ) : (
              <div className="max-h-[300px] overflow-y-auto space-y-2 pr-1">
                {projectsList.map((project) => (
                  <div
                    key={project.id}
                    onClick={() => handleLoad(project)}
                    className="flex items-center justify-between p-3 rounded-lg border bg-muted/20 hover:bg-accent/40 cursor-pointer transition-colors duration-150 group"
                  >
                    <div className="space-y-1">
                      <h4 className="font-semibold text-sm text-foreground/90 group-hover:text-primary transition-colors">
                        {project.name}
                      </h4>
                      <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                        <span className="bg-primary/10 text-primary px-1.5 py-0.5 rounded text-[10px]">
                          {project.mode === "single" ? "صورة مفردة" : "كولاج مجمع"}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {project.updatedAt ? new Date(project.updatedAt).toLocaleDateString("ar-EG") : ""}
                        </span>
                      </div>
                    </div>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => handleDelete(project.id, e)}
                      className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10 opacity-80 hover:opacity-100"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-cairo text-right">حذف المشروع</AlertDialogTitle>
            <AlertDialogDescription className="font-cairo text-right">
              هل أنت متأكد من رغبتك في حذف هذا المشروع نهائياً؟ لا يمكن التراجع عن هذا الإجراء.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex flex-row-reverse gap-2 sm:justify-start">
            <AlertDialogCancel className="font-cairo">إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive hover:bg-destructive/90 text-white font-cairo">
              حذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}
