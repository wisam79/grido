import os
from PIL import Image, ImageDraw

def generate_assets():
    res_dir = os.path.join(os.path.dirname(__file__), "resources")
    os.makedirs(res_dir, exist_ok=True)
    
    appicon_path = os.path.join(os.path.dirname(__file__), "..", "..", "appicon.png")
    if not os.path.exists(appicon_path):
        appicon_path = os.path.join(os.path.dirname(__file__), "..", "icon.ico")
        
    # Open the image keeping its original alpha channel
    app_img = Image.open(appicon_path).convert("RGBA")
    
    # ----------------------------------------------------
    # 1. Welcome & Finish Sidebar Bitmap (164 x 314)
    # ----------------------------------------------------
    w, h = 164, 314
    # Clean, flat, elegant dark background
    welcome_img = Image.new("RGB", (w, h), color="#0f172a")
    
    # Process App Icon
    icon_size = 90
    icon_resized = app_img.resize((icon_size, icon_size), Image.Resampling.LANCZOS)
    
    icon_x = (w - icon_size) // 2
    icon_y = 50
    
    # Paste icon using its own alpha channel to ensure perfect transparent corners
    welcome_img.paste(icon_resized, (icon_x, icon_y), icon_resized)
    
    # Add a simple elegant accent line below the icon
    draw = ImageDraw.Draw(welcome_img)
    draw.line([(32, 170), (w - 32, 170)], fill=(37, 99, 235), width=2)
    
    # Save welcome.bmp
    welcome_path = os.path.join(res_dir, "welcome.bmp")
    welcome_img.save(welcome_path, "BMP")
    print(f"Generated: {welcome_path}")

    # ----------------------------------------------------
    # 2. Header Bitmap (150 x 57)
    # ----------------------------------------------------
    hw, hh = 150, 57
    # Clean white background for header
    header_img = Image.new("RGB", (hw, hh), color="#ffffff")
    
    hicon_size = 40
    hicon_resized = app_img.resize((hicon_size, hicon_size), Image.Resampling.LANCZOS)
    
    hicon_x = hw - hicon_size - 10
    hicon_y = (hh - hicon_size) // 2
    
    # Paste using its own alpha channel
    header_img.paste(hicon_resized, (hicon_x, hicon_y), hicon_resized)
    
    header_path = os.path.join(res_dir, "header.bmp")
    header_img.save(header_path, "BMP")
    print(f"Generated: {header_path}")

if __name__ == "__main__":
    generate_assets()
