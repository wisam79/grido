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
import { serializeEditorState, projectFileToDomainProject, domainProjectToProjectFile } from "@/lib/io/project-serializer";
import { SaveProject, GetAllProjects, DeleteProject } from "../../../../wailsjs/go/handlers/ProjectHandler";
import { ExportBackup, ImportBackup, ResetLibrary } from "../../../../wailsjs/go/handlers/BackupHandler";
import { SaveFileDialog } from "../../../../wailsjs/go/main/App";
import { domain } from "../../../../wailsjs/go/models";
import { toast } from "sonner";
import { Spinner } from "@/components/ui/huge-icon";
import {
  FolderOpen24Regular,
  FolderOpen16Regular,
  Save16Regular,
  Delete16Regular,
  Calendar20Regular,
  Database16Regular,
  ArrowDownload16Regular,
  ArrowUpload16Regular,
  Warning16Regular,
  Search16Regular,
  ArrowSort20Regular,
  Pin16Regular,
  PinOff16Regular,
} from "@fluentui/react-icons";
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
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

  // Backup & Import states
  const [backupActionLoading, setBackupActionLoading] = useState(false);
  const [importConfirmOpen, setImportConfirmOpen] = useState(false);
  const [importJsonData, setImportJsonData] = useState("");
  const [importMode, setImportMode] = useState<"merge" | "overwrite">("merge");
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);

  // Search & Sort & Pin states
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"date_desc" | "date_asc" | "name_asc">("date_desc");
  const [pinnedProjects, setPinnedProjects] = useState<string[]>(() => {
    try {
      const savedPinned = localStorage.getItem("grido_pinned_projects");
      if (savedPinned) return JSON.parse(savedPinned);
    } catch { /* ignore */ }
    return [];
  });

  const togglePin = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setPinnedProjects(prev => {
      const newPinned = prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id];
      localStorage.setItem("grido_pinned_projects", JSON.stringify(newPinned));
      return newPinned;
    });
  };

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
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsLoading(false);
      setBackupActionLoading(false);
      Promise.resolve().then(() => {
        fetchProjects();
      });
    } else {
      setIsLoading(false);
      setBackupActionLoading(false);
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
      const projectFile = serializeEditorState(state);
      const projectData = projectFileToDomainProject(projectFile, currentId, projectName);

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
      const projectData = domainProjectToProjectFile(project);

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

  // Backup & Import implementations
  const handleExportBackup = async () => {
    setBackupActionLoading(true);
    try {
      const dataStr = await ExportBackup();
      if (!dataStr || dataStr === "[]" || dataStr === "null") {
        toast.warning("لا توجد مشاريع في قاعدة البيانات لتصديرها");
        return;
      }
      
      const res = await SaveFileDialog(dataStr, "grido_backup.json", "Grido Backup (*.json)", "*.json");
      if (res === "success") {
        toast.success("تم تصدير النسخة الاحتياطية بنجاح");
      } else if (res === "") {
        toast.info("تم إلغاء التصدير");
      }
    } catch (err) {
      console.error(err);
      toast.error("فشل تصدير النسخة الاحتياطية");
    } finally {
      setBackupActionLoading(false);
    }
  };

  const handleImportFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      try {
        const parsed = JSON.parse(content);
        if (!Array.isArray(parsed)) {
          toast.error("ملف النسخة الاحتياطية غير صالح - يجب أن يكون مصفوفة مشاريع");
          return;
        }
        setImportJsonData(content);
        setImportConfirmOpen(true);
      } catch {
        toast.error("فشل قراءة الملف - ملف غير صالح");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const handleConfirmImport = async () => {
    if (!importJsonData) return;
    setBackupActionLoading(true);
    setImportConfirmOpen(false);
    try {
      await ImportBackup(importJsonData, importMode);
      toast.success("تم استيراد المشاريع بنجاح");
      fetchProjects();
    } catch (err) {
      console.error(err);
      toast.error("فشل استيراد المشاريع");
    } finally {
      setBackupActionLoading(false);
      setImportJsonData("");
    }
  };

  const handleConfirmReset = async () => {
    setResetConfirmOpen(false);
    setBackupActionLoading(true);
    try {
      await ResetLibrary();
      toast.success("تم تفريغ مكتبة المشاريع بالكامل");
      const state = useEditorStore.getState();
      if (state.projectId) {
        useEditorStore.setState({ projectId: null });
      }
      fetchProjects();
    } catch (err) {
      console.error(err);
      toast.error("فشل تهيئة مكتبة المشاريع");
    } finally {
      setBackupActionLoading(false);
    }
  };

  const filteredProjects = projectsList
    .filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => {
      // Pinned projects always at the top
      const aPinned = pinnedProjects.includes(a.id);
      const bPinned = pinnedProjects.includes(b.id);
      if (aPinned && !bPinned) return -1;
      if (!aPinned && bPinned) return 1;

      // Sort logic
      if (sortBy === "date_desc") {
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      } else if (sortBy === "date_asc") {
        return new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
      } else if (sortBy === "name_asc") {
        return a.name.localeCompare(b.name, "ar-SA");
      }
      return 0;
    });

  return (
    <>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
        <DialogContent className="sm:max-w-[520px] bg-card/95 backdrop-blur-2xl border border-border/80 dark:border-white/10 shadow-xl rounded-2xl p-5 font-cairo fluent-specular" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-foreground font-cairo">
              <FolderOpen24Regular className="text-primary w-6 h-6 shrink-0" />
              <span>مكتبة المشاريع المحلية</span>
            </DialogTitle>
          </DialogHeader>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full mt-4 font-cairo">
            <TabsList className="grid grid-cols-3 mb-4">
              <TabsTrigger value="save" className="flex items-center gap-1.5 justify-center">
                <Save16Regular className="w-3.5 h-3.5 shrink-0" />
                <span>حفظ المشروع</span>
              </TabsTrigger>
              <TabsTrigger value="list" className="flex items-center gap-1.5 justify-center" onClick={fetchProjects}>
                <FolderOpen16Regular className="w-3.5 h-3.5 shrink-0" />
                <span>المشاريع</span>
              </TabsTrigger>
              <TabsTrigger value="backup" className="flex items-center gap-1.5 justify-center">
                <Database16Regular className="w-3.5 h-3.5 shrink-0" />
                <span>نسخ احتياطي</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="save" className="space-y-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="proj-name" className="text-xs font-semibold">اسم المشروع</Label>
                <Input
                  id="proj-name"
                  placeholder="اسم المشروع..."
                  className="h-8 text-xs rounded-md"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSave()}
                />
              </div>
              <Button className="w-full h-8 gap-2 mt-2 rounded-md font-semibold text-xs shadow-xs" onClick={handleSave} disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Spinner className="w-3.5 h-3.5" size={14} />
                    <span>جاري الحفظ ...</span>
                  </>
                ) : (
                  <>
                    <Save16Regular className="w-3.5 h-3.5 shrink-0" />
                    <span>حفظ المشروع</span>
                  </>
                )}
              </Button>
            </TabsContent>

            <TabsContent value="list" className="space-y-3 py-1">
              {/* شريط البحث والفرز */}
              <div className="flex gap-2 items-center">
                <div className="relative flex-1">
                  <Search16Regular className="absolute right-2.5 top-2 text-muted-foreground w-4 h-4 shrink-0" />
                  <Input
                    placeholder="بحث في المشاريع..."
                    className="pr-8 h-8 text-xs rounded-md"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <div className="flex bg-muted/30 rounded-md border border-border/40 p-0.5 h-8 items-center">
                  <button 
                    type="button"
                    onClick={() => setSortBy(sortBy === "date_desc" ? "date_asc" : "date_desc")}
                    className={`h-7 px-2.5 flex items-center justify-center rounded-md text-xs transition-colors cursor-pointer ${sortBy.startsWith("date") ? "bg-background shadow-2xs text-primary font-bold" : "text-muted-foreground hover:text-foreground"}`}
                    title="الفرز حسب التاريخ"
                  >
                    <Calendar20Regular className="w-3.5 h-3.5 shrink-0" />
                  </button>
                  <button 
                    type="button"
                    onClick={() => setSortBy("name_asc")}
                    className={`h-7 px-2.5 flex items-center justify-center rounded-md text-xs transition-colors cursor-pointer ${sortBy.startsWith("name") ? "bg-background shadow-2xs text-primary font-bold" : "text-muted-foreground hover:text-foreground"}`}
                    title="الفرز الأبجدي"
                  >
                    <ArrowSort20Regular className="w-3.5 h-3.5 shrink-0" />
                  </button>
                </div>
              </div>

              {isLoading ? (
                <div className="flex flex-col items-center justify-center py-8 text-muted-foreground border rounded-xl bg-muted/10">
                  <Spinner className="w-7 h-7 text-primary mb-2" size={28} />
                  <span className="text-xs font-medium">جاري تحميل المشاريع ...</span>
                </div>
              ) : projectsList.length === 0 ? (
                <div className="text-center py-10 border-2 border-dashed rounded-xl text-muted-foreground text-xs">
                  لا توجد مشاريع محفوظة
                </div>
              ) : filteredProjects.length === 0 ? (
                <div className="text-center py-10 border border-dashed rounded-xl text-muted-foreground text-xs">
                  لم يتم العثور على نتائج
                </div>
              ) : (
                <div className="max-h-[320px] overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                  {filteredProjects.map((project) => {
                    const isPinned = pinnedProjects.includes(project.id);
                    return (
                    <div
                      key={project.id}
                      onClick={() => handleLoad(project)}
                      className="flex items-center justify-between p-2.5 rounded-xl border border-border/60 bg-muted/20 hover:bg-accent/40 cursor-pointer transition-colors duration-150 group relative overflow-hidden fluent-specular"
                    >
                      {isPinned && <div className="absolute top-0 right-0 w-1.5 h-full bg-primary/80" />}
                      <div className="space-y-1 pl-2 pr-1">
                        <h4 className="font-semibold text-xs text-foreground/90 group-hover:text-primary transition-colors flex items-center gap-1.5">
                          {isPinned && <Pin16Regular className="text-primary w-3 h-3 shrink-0" />}
                          {project.name}
                        </h4>
                        <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                          <span className="bg-primary/10 text-primary px-1.5 py-0.5 rounded-md font-semibold">
                            {project.mode === "single" ? "صورة مفردة" : "كولاج مجمع"}
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar20Regular className="w-3 h-3 shrink-0" />
                            {project.updatedAt ? new Date(project.updatedAt).toLocaleDateString("ar-EG") : ""}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity gap-0.5">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => togglePin(e, project.id)}
                          className="h-7 w-7 p-0 rounded-md text-muted-foreground hover:text-primary hover:bg-primary/10"
                          title={isPinned ? "إلغاء التثبيت" : "تثبيت في الأعلى"}
                        >
                          {isPinned ? <PinOff16Regular className="w-3.5 h-3.5 shrink-0" /> : <Pin16Regular className="w-3.5 h-3.5 shrink-0" />}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => handleDelete(project.id, e)}
                          className="h-7 w-7 p-0 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                        >
                          <Delete16Regular className="w-3.5 h-3.5 shrink-0" />
                        </Button>
                      </div>
                    </div>
                  )})}
                </div>
              )}
            </TabsContent>

            <TabsContent value="backup" className="space-y-4 py-2">
              <div className="space-y-3">
                <div className="p-3 border border-border/60 rounded-xl bg-card shadow-xs flex items-center justify-between fluent-specular">
                  <div>
                    <h4 className="text-xs font-bold text-foreground/90">تصدير نسخة احتياطية</h4>
                    <p className="text-[11px] text-muted-foreground">حفظ جميع المشاريع في ملف JSON</p>
                  </div>
                  <Button 
                    size="sm" 
                    onClick={handleExportBackup} 
                    disabled={backupActionLoading}
                    className="gap-1.5 h-8 px-3 rounded-md text-xs font-semibold shadow-xs"
                  >
                    {backupActionLoading ? (
                      <>
                        <Spinner className="w-3.5 h-3.5" size={14} />
                        <span>جاري التصدير ...</span>
                      </>
                    ) : (
                      <>
                        <ArrowDownload16Regular className="w-3.5 h-3.5 shrink-0" />
                        <span>تصدير JSON</span>
                      </>
                    )}
                  </Button>
                </div>

                <div className="p-3 border border-border/60 rounded-xl bg-card shadow-xs flex items-center justify-between fluent-specular">
                  <div>
                    <h4 className="text-xs font-bold text-foreground/90">استيراد نسخة احتياطية</h4>
                    <p className="text-[11px] text-muted-foreground">استعادة المشاريع من ملف JSON</p>
                  </div>
                  <label className="cursor-pointer">
                    <span className="inline-flex items-center justify-center rounded-md text-xs font-semibold transition-colors focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 bg-secondary text-secondary-foreground shadow-xs hover:bg-secondary/80 h-8 px-3 gap-1.5">
                      <ArrowUpload16Regular className="w-3.5 h-3.5 shrink-0" />
                      <span>رفع ملف</span>
                    </span>
                    <input
                      type="file"
                      accept=".json"
                      onChange={handleImportFileChange}
                      className="hidden"
                      disabled={backupActionLoading}
                    />
                  </label>
                </div>

                <div className="p-3 border rounded-xl bg-red-500/5 border-red-500/20 flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-red-600 dark:text-red-400">تهيئة مكتبة المشاريع</h4>
                    <p className="text-[11px] text-red-500/70">حذف جميع المشاريع المحفوظة نهائياً</p>
                  </div>
                  <Button 
                    variant="destructive" 
                    size="sm" 
                    onClick={() => setResetConfirmOpen(true)}
                    disabled={backupActionLoading}
                    className="gap-1.5 h-8 px-3 rounded-md text-xs font-semibold bg-red-600 hover:bg-red-700 text-white shadow-xs"
                  >
                    <Delete16Regular className="w-3.5 h-3.5 shrink-0" />
                    <span>حذف الكل</span>
                  </Button>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </DialogContent>

        <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
          <AlertDialogContent dir="rtl">
            <AlertDialogHeader>
              <AlertDialogTitle className="font-cairo text-right">حذف المشروع</AlertDialogTitle>
              <AlertDialogDescription className="font-cairo text-right text-xs">
                هل أنت متأكد من رغبتك في حذف هذا المشروع نهائياً؟ لا يمكن التراجع عن هذا الإجراء.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="font-cairo">
              <AlertDialogCancel className="font-cairo h-8 px-4 text-xs font-semibold rounded-md">إلغاء</AlertDialogCancel>
              <AlertDialogAction onClick={confirmDelete} className="bg-destructive hover:bg-destructive/90 text-white font-cairo h-8 px-4 text-xs font-semibold rounded-md shadow-xs">
                حذف
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </Dialog>

      {/* تأكيد الاستيراد وخيارات الدمج/الاستبدال */}
      <Dialog open={importConfirmOpen} onOpenChange={setImportConfirmOpen}>
        <DialogContent className="sm:max-w-[400px]" dir="rtl">
          <DialogHeader>
            <DialogTitle className="font-cairo flex items-center gap-2 text-sm font-bold text-foreground">
              <ArrowUpload16Regular className="text-primary w-4 h-4 shrink-0" />
              <span>استيراد المشاريع</span>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2 font-cairo">
            <p className="text-xs text-muted-foreground">
              تم التحقق من ملف النسخة الاحتياطية بنجاح. يرجى اختيار طريقة الاستيراد:
            </p>
            <RadioGroup 
              value={importMode} 
              onValueChange={(val: any) => setImportMode(val)}
              className="space-y-2"
            >
              <div className="flex items-center space-x-reverse space-x-2 border border-border/60 rounded-xl p-3 hover:bg-accent/40 cursor-pointer fluent-specular transition-colors">
                <RadioGroupItem value="merge" id="r-merge" />
                <Label htmlFor="r-merge" className="cursor-pointer flex-1 space-y-0.5">
                  <div className="font-semibold text-xs text-foreground">دمج المشاريع (Merge)</div>
                  <div className="text-[10px] text-muted-foreground">إضافة المشاريع الجديدة وتحديث المشاريع المتشابهة بالمعرف</div>
                </Label>
              </div>
              <div className="flex items-center space-x-reverse space-x-2 border rounded-xl p-3 hover:bg-accent/40 cursor-pointer border-red-500/20 hover:border-red-500/30 transition-colors">
                <RadioGroupItem value="overwrite" id="r-overwrite" />
                <Label htmlFor="r-overwrite" className="cursor-pointer flex-1 space-y-0.5">
                  <div className="font-semibold text-xs text-red-600 dark:text-red-400">استبدال بالكامل (Overwrite)</div>
                  <div className="text-[10px] text-muted-foreground">مسح كافة المشاريع الحالية واستبدالها بمحتويات ملف النسخة الاحتياطية</div>
                </Label>
              </div>
            </RadioGroup>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={() => setImportConfirmOpen(false)} className="h-8 px-4 text-xs font-semibold rounded-md">
                إلغاء
              </Button>
              <Button onClick={handleConfirmImport} disabled={backupActionLoading} className="h-8 px-4 text-xs font-semibold rounded-md shadow-xs bg-primary hover:bg-primary/90 text-primary-foreground">
                {backupActionLoading ? (
                  <>
                    <Spinner className="w-3.5 h-3.5" size={14} />
                    <span>جاري الاستيراد ...</span>
                  </>
                ) : (
                  "تأكيد الاستيراد"
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* تأكيد التهيئة ومسح قاعدة البيانات */}
      <AlertDialog open={resetConfirmOpen} onOpenChange={setResetConfirmOpen}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-cairo text-right flex items-center gap-2 text-red-600 dark:text-red-400 text-sm font-bold">
              <Warning16Regular className="w-4 h-4 shrink-0" />
              <span>تحذير: تهيئة مكتبة المشاريع</span>
            </AlertDialogTitle>
            <AlertDialogDescription className="font-cairo text-right text-xs">
              أنت على وشك حذف جميع المشاريع المحفوظة محلياً بشكل نهائي من قاعدة البيانات. لا يمكن التراجع عن هذا الإجراء أبداً. ننصح بتصدير نسخة احتياطية أولاً.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="font-cairo">
            <AlertDialogCancel className="font-cairo h-8 px-4 text-xs font-semibold rounded-md">إلغاء</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmReset} 
              className="bg-red-600 hover:bg-red-700 text-white font-cairo h-8 px-4 text-xs font-semibold rounded-md shadow-xs"
            >
              تأكيد حذف كل المشاريع
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
