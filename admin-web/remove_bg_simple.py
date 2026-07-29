from PIL import Image
import os

image_dir = r"c:\projects\grido\admin-web\public"
images = [
    "3d-monitor.jpg",
    "3d-edit.jpg",
    "3d-shield.jpg",
    "3d-zap.jpg",
    "3d-printer.jpg"
]

def remove_bg(img_path, out_path):
    img = Image.open(img_path)
    img = img.convert("RGBA")
    datas = img.getdata()

    new_data = []
    # #181818 is (24, 24, 24)
    # We remove anything close to this dark charcoal color
    for item in datas:
        # Check if color is close to #181818
        if item[0] < 35 and item[1] < 35 and item[2] < 35:
            # Change to transparent
            new_data.append((255, 255, 255, 0))
        else:
            new_data.append(item)

    img.putdata(new_data)
    img.save(out_path, "PNG")

for img_name in images:
    in_p = os.path.join(image_dir, img_name)
    out_p = os.path.join(image_dir, img_name.replace(".jpg", ".png"))
    if os.path.exists(in_p):
        print(f"Processing {in_p}")
        remove_bg(in_p, out_p)
print("Done!")
