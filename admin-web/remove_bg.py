import os
from rembg import remove
from PIL import Image

image_dir = r"c:\projects\grido\admin-web\public"
images = [
    "3d-monitor.jpg",
    "3d-edit.jpg",
    "3d-shield.jpg",
    "3d-zap.jpg",
    "3d-printer.jpg"
]

for img_name in images:
    input_path = os.path.join(image_dir, img_name)
    output_name = img_name.replace(".jpg", ".png")
    output_path = os.path.join(image_dir, output_name)
    
    if os.path.exists(input_path):
        print(f"Processing {input_path}...")
        try:
            with open(input_path, 'rb') as i:
                with open(output_path, 'wb') as o:
                    input_data = i.read()
                    # Apply background removal
                    output_data = remove(input_data)
                    o.write(output_data)
            print(f"Saved {output_path}")
        except Exception as e:
            print(f"Error processing {input_path}: {e}")
    else:
        print(f"File not found: {input_path}")
