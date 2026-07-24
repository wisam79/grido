Unicode true

####
## Wails NSIS Installer Script for Grido Studio
####

!define INFO_PRODUCTNAME "Grido Studio"
!define INFO_COMPANYNAME "Grido Studio"

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
OutFile "..\..\bin\${INFO_PROJECTNAME}-${ARCH}-installer.exe"
InstallDir "$PROGRAMFILES64\${INFO_PRODUCTNAME}"
InstallDirRegKey HKLM "Software\${INFO_PRODUCTNAME}" "Install_Dir"
ShowInstDetails show

Function .onInit
   !insertmacro wails.checkArchitecture
FunctionEnd

Function .onInstSuccess
   IfSilent 0 +2
       Exec 'explorer.exe "$INSTDIR\${PRODUCT_EXECUTABLE}"'
FunctionEnd

Function CreateDesktopShortcut
    CreateShortCut "$DESKTOP\${INFO_PRODUCTNAME}.lnk" "$INSTDIR\${PRODUCT_EXECUTABLE}"
FunctionEnd

Section
    !insertmacro wails.setShellContext

    !insertmacro wails.webview2runtime

    # Force kill running app instances to release file lock before overwriting
    ExecWait 'taskkill /F /IM "${PRODUCT_EXECUTABLE}" /T'
    Sleep 1000

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

    RMDir /r "$AppData\${PRODUCT_EXECUTABLE}"

    RMDir /r $INSTDIR

    Delete "$SMPROGRAMS\${INFO_PRODUCTNAME}.lnk"
    Delete "$DESKTOP\${INFO_PRODUCTNAME}.lnk"

    !insertmacro wails.unassociateFiles
    !insertmacro wails.unassociateCustomProtocols

    !insertmacro wails.deleteUninstaller
SectionEnd
