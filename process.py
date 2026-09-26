from PIL import Image

# Open the image
img = Image.open('assets/images/newlogo2.jpeg')
img = img.convert("RGBA")
datas = img.getdata()

newData = []
for item in datas:
    # Change all white (also shades of whites)
    # pixels to transparent
    if item[0] > 240 and item[1] > 240 and item[2] > 240:
        newData.append((255, 255, 255, 0))
    else:
        newData.append(item)

img.putdata(newData)

# Save as transparent png for splash
img.save('assets/images/logo-transparent.png', "PNG")

# Also save as app-icon.png with white bg
icon = Image.open('assets/images/newlogo2.jpeg')
# Resize icon to square
w, h = icon.size
sz = max(w, h)
icon_sq = Image.new("RGB", (sz, sz), (255, 255, 255))
icon_sq.paste(icon, ((sz - w) // 2, (sz - h) // 2))
icon_sq = icon_sq.resize((1024, 1024), Image.LANCZOS)
icon_sq.save('assets/images/app-icon.png', "PNG")

print("Images saved.")
