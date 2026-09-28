Unicode true

####
## Wails NSIS Installer Script for Grido Studio
####

!define INFO_PRODUCTNAME "Grido Studio"
!define INFO_COMPANYNAME "Grido Studio"
!define PRODUCT_EXECUTABLE "GridoStudio.exe"

# Product metadata (source of truth — must mirror the git tag / build.ps1)
!define INFO_PROJECTNAME "GridoStudio"
!define INFO_PRODUCTVERSION "1.9.3"
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
    StrCmp $R0 "" +3
        nsExec::ExecToStack '$R0'
        Goto legacy_migration_done
    ReadRegStr $R0 HKLM "${UNINST_KEY}" "UninstallString"
    StrCmp $R0 "" legacy_migration_done
        nsExec::ExecToStack '$R0 /S'
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

    # Clean up user's data from AppData\Roaming and LocalAppData
    SetShellVarContext current
    RMDir /r "$APPDATA\GridoStudio"
    RMDir /r "$LOCALAPPDATA\GridoStudio"

    RMDir /r $INSTDIR

    Delete "$SMPROGRAMS\${INFO_PRODUCTNAME}.lnk"
    Delete "$DESKTOP\${INFO_PRODUCTNAME}.lnk"

    !insertmacro wails.unassociateFiles
    !insertmacro wails.unassociateCustomProtocols

    !insertmacro wails.deleteUninstaller
SectionEnd
