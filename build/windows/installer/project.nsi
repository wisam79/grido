Unicode true

####
## Wails NSIS Installer Script for Grido Studio
####

!define INFO_PRODUCTNAME "Grido Studio"
!define INFO_COMPANYNAME "Grido Studio"
!define PRODUCT_EXECUTABLE "GridoStudio.exe"

# Product metadata (source of truth — must mirror the git tag / build.ps1)
!define INFO_PROJECTNAME "GridoStudio"
!define INFO_PRODUCTVERSION "1.32.0"
!define INFO_COPYRIGHT "© 2026 Grido Studio"

!ifndef WAILS_INSTALL_SCOPE
    !define WAILS_INSTALL_SCOPE "user"
!endif

!include "wails_tools.nsh"

# Version information
VIProductVersion "${INFO_PRODUCTVERSION}.0"
VIFileVersion    "${INFO_PRODUCTVERSION}.0"

VIAddVersionKey "CompanyName"     "${INFO_COMPANYNAME}"
VIAddVersionKey "FileDescription" "${INFO_PRODUCTNAME} Installer"
VIAddVersionKey "ProductVersion"  "${INFO_PRODUCTVERSION}"
VIAddVersionKey "FileVersion"     "${INFO_PRODUCTVERSION}"
VIAddVersionKey "LegalCopyright"  "${INFO_COPYRIGHT}"
VIAddVersionKey "ProductName"     "${INFO_PRODUCTNAME}"

# Enable HiDPI support
ManifestDPIAware true

# Modern UI v2 Configuration
!include "MUI2.nsh"

# Branding & Icons
!define MUI_ICON "..\icon.ico"
!define MUI_UNICON "..\icon.ico"
!define MUI_WELCOMEFINISHPAGE_BITMAP "resources\welcome.bmp"
!define MUI_UNWELCOMEFINISHPAGE_BITMAP "resources\welcome.bmp"
!define MUI_HEADERIMAGE
!define MUI_HEADERIMAGE_BITMAP "resources\header.bmp"
!define MUI_HEADERIMAGE_UNBITMAP "resources\header.bmp"
!define MUI_HEADERIMAGE_RIGHT

!define MUI_ABORTWARNING
!define MUI_BRANDINGTEXT "Grido Studio - Digital Canvas & Print Suite"

# Finish page options
!define MUI_FINISHPAGE_NOAUTOCLOSE
!define MUI_FINISHPAGE_RUN "$INSTDIR\${PRODUCT_EXECUTABLE}"
!define MUI_FINISHPAGE_SHOWREADME ""
!define MUI_FINISHPAGE_SHOWREADME_NOTCHECKED
!define MUI_FINISHPAGE_SHOWREADME_TEXT "$(DESC_CreateDesktopShortcut)"
!define MUI_FINISHPAGE_SHOWREADME_FUNCTION CreateDesktopShortcut

# Pages
!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_INSTFILES
!insertmacro MUI_PAGE_FINISH

# Uninstaller Pages
!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES

# Languages (Arabic & English) - Must be after pages
!insertmacro MUI_LANGUAGE "Arabic"
!insertmacro MUI_LANGUAGE "English"

# Language Strings
LangString DESC_CreateDesktopShortcut ${LANG_ARABIC} "إنشاء اختصار على سطح المكتب"
LangString DESC_CreateDesktopShortcut ${LANG_ENGLISH} "Create Desktop Shortcut"

# Product Details
Name "${INFO_PRODUCTNAME}"
OutFile "..\nsis\GridoStudio-installer.exe" # Resolves to build/windows/nsis/GridoStudio-installer.exe (consumed by sign task & release.yml)
InstallDir "$LOCALAPPDATA\Programs\${INFO_PRODUCTNAME}"
InstallDirRegKey HKCU "Software\${INFO_PRODUCTNAME}" "Install_Dir"
ShowInstDetails show

Function .onInit
   !insertmacro wails.checkArchitecture

   # Prevent running multiple installer instances at the same time
   System::Call 'kernel32::CreateMutex(p 0, i 0, t "GridoStudio_Installer_Mutex") ?e'
   Pop $R0
   StrCmp $R0 0 +3
       MessageBox MB_OK|MB_ICONEXCLAMATION "مثبت Grido Studio قيد التشغيل بالفعل." /SD IDOK
       Abort
FunctionEnd

Function .onInstSuccess
    IfSilent is_silent done
    is_silent:
        ExecShell "open" "$INSTDIR\${PRODUCT_EXECUTABLE}"
    done:
FunctionEnd

Function CreateDesktopShortcut
    CreateShortCut "$DESKTOP\${INFO_PRODUCTNAME}.lnk" "$INSTDIR\${PRODUCT_EXECUTABLE}"
FunctionEnd

# يحمي بيانات المستخدم من uninstallers القديمة التي كانت تحذف AppData أثناء
# ترحيل التثبيت من machine-scope. النقل داخل المجلد الأب نفسه ذري ولا ينسخ DB/WAL.
Function PreserveLegacyUserData
    ClearErrors
    IfFileExists "$APPDATA\GridoStudio.__migration_backup" 0 preserve_roaming_source
    IfFileExists "$APPDATA\GridoStudio" preserve_conflict 0
    Rename "$APPDATA\GridoStudio.__migration_backup" "$APPDATA\GridoStudio"
    IfErrors preserve_failed

    preserve_roaming_source:
    IfFileExists "$APPDATA\GridoStudio" 0 preserve_local_backup
    Rename "$APPDATA\GridoStudio" "$APPDATA\GridoStudio.__migration_backup"
    IfErrors preserve_failed

    preserve_local_backup:
    IfFileExists "$LOCALAPPDATA\GridoStudio.__migration_backup" 0 preserve_local_source
    IfFileExists "$LOCALAPPDATA\GridoStudio" preserve_conflict 0
    Rename "$LOCALAPPDATA\GridoStudio.__migration_backup" "$LOCALAPPDATA\GridoStudio"
    IfErrors preserve_failed

    preserve_local_source:
    IfFileExists "$LOCALAPPDATA\GridoStudio" 0 preserve_done
    Rename "$LOCALAPPDATA\GridoStudio" "$LOCALAPPDATA\GridoStudio.__migration_backup"
    IfErrors preserve_failed

    preserve_done:
    Return

    preserve_conflict:
    MessageBox MB_OK|MB_ICONSTOP "تعذر تأمين بيانات Grido قبل الترقية لوجود نسخة احتياطية متعارضة. لم تُحذف البيانات؛ أعد تسمية مجلد GridoStudio.__migration_backup ثم أعد المحاولة." /SD IDOK
    Abort

    preserve_failed:
    Call RestoreLegacyUserData
    MessageBox MB_OK|MB_ICONSTOP "تعذر تأمين بيانات Grido قبل تشغيل أداة الإزالة القديمة. أُوقفت الترقية لحماية المشاريع والوسائط." /SD IDOK
    Abort
FunctionEnd

Function RestoreLegacyUserData
    ClearErrors
    IfFileExists "$APPDATA\GridoStudio.__migration_backup" 0 restore_local
    IfFileExists "$APPDATA\GridoStudio" restore_conflict 0
    Rename "$APPDATA\GridoStudio.__migration_backup" "$APPDATA\GridoStudio"
    IfErrors restore_failed

    restore_local:
    IfFileExists "$LOCALAPPDATA\GridoStudio.__migration_backup" 0 restore_done
    IfFileExists "$LOCALAPPDATA\GridoStudio" restore_conflict 0
    Rename "$LOCALAPPDATA\GridoStudio.__migration_backup" "$LOCALAPPDATA\GridoStudio"
    IfErrors restore_failed

    restore_done:
    Return

    restore_conflict:
    MessageBox MB_OK|MB_ICONSTOP "لم تُستعد بيانات Grido تلقائياً لأن مجلد الهدف أُعيد إنشاؤه. بياناتك محفوظة في GridoStudio.__migration_backup؛ أُوقفت الترقية دون حذفها." /SD IDOK
    Abort

    restore_failed:
    MessageBox MB_OK|MB_ICONSTOP "فشلت استعادة بيانات Grido تلقائياً. بياناتك محفوظة في مجلد GridoStudio.__migration_backup؛ أُوقفت الترقية دون حذفها." /SD IDOK
    Abort
FunctionEnd

Section
    !insertmacro wails.setShellContext

    !insertmacro wails.webview2runtime

    # Force kill running app instances silently without opening black command prompt windows
    nsExec::ExecToStack 'taskkill /F /IM "GridoStudio.exe" /T'
    nsExec::ExecToStack 'taskkill /F /IM "Grido Studio.exe" /T'
    nsExec::ExecToStack 'taskkill /F /IM "grido.exe" /T'
    Sleep 1000

    # Non-blocking legacy migration: clean up old machine-scope shortcuts & trigger silent uninstaller if present
    SetShellVarContext all
    Delete "$SMPROGRAMS\${INFO_PRODUCTNAME}.lnk"
    Delete "$DESKTOP\${INFO_PRODUCTNAME}.lnk"
    !insertmacro wails.setShellContext

    ReadRegStr $R0 HKLM "${UNINST_KEY}" "QuietUninstallString"
    StrCmp $R0 "" legacy_read_normal
        Call PreserveLegacyUserData
        nsExec::ExecToStack '$R0'
        Pop $R1
        Pop $R2
        Call RestoreLegacyUserData
        StrCmp $R1 "0" legacy_migration_done
        MessageBox MB_OK|MB_ICONSTOP "فشلت إزالة النسخة القديمة (رمز $R1). أُعيدت بياناتك، وأُوقفت الترقية دون استبدال البرنامج." /SD IDOK
        Abort

    legacy_read_normal:
    ReadRegStr $R0 HKLM "${UNINST_KEY}" "UninstallString"
    StrCmp $R0 "" legacy_migration_done
        Call PreserveLegacyUserData
        nsExec::ExecToStack '$R0 /S'
        Pop $R1
        Pop $R2
        Call RestoreLegacyUserData
        StrCmp $R1 "0" legacy_migration_done
        MessageBox MB_OK|MB_ICONSTOP "فشلت إزالة النسخة القديمة (رمز $R1). أُعيدت بياناتك، وأُوقفت الترقية دون استبدال البرنامج." /SD IDOK
        Abort
    legacy_migration_done:

    # Clean up legacy binaries if present to avoid dual-binary confusion
    Delete "$INSTDIR\Grido Studio.exe"
    Delete "$INSTDIR\grido.exe"

    SetOutPath $INSTDIR

    !insertmacro wails.files

    CreateShortcut "$SMPROGRAMS\${INFO_PRODUCTNAME}.lnk" "$INSTDIR\${PRODUCT_EXECUTABLE}"
    CreateShortCut "$DESKTOP\${INFO_PRODUCTNAME}.lnk" "$INSTDIR\${PRODUCT_EXECUTABLE}"

    !insertmacro wails.associateFiles
    !insertmacro wails.associateCustomProtocols

    !insertmacro wails.writeUninstaller
SectionEnd

Section "uninstall"
    !insertmacro wails.setShellContext

    # بيانات المستخدم (المشاريع، القوالب، الحفظ التلقائي والوسائط) تبقى محفوظة
    # افتراضياً لإتاحة إعادة التثبيت أو الترقية من دون فقدان العمل.
    # حذف البيانات يحتاج إجراءً صريحاً مستقلاً داخل التطبيق، لا uninstall صامتاً.
    SetShellVarContext current

    RMDir /r $INSTDIR

    Delete "$SMPROGRAMS\${INFO_PRODUCTNAME}.lnk"
    Delete "$DESKTOP\${INFO_PRODUCTNAME}.lnk"

    !insertmacro wails.unassociateFiles
    !insertmacro wails.unassociateCustomProtocols

    !insertmacro wails.deleteUninstaller
SectionEnd
