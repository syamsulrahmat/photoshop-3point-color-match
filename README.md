# Photoshop Auto Color Match

A lightning-fast, pure ExtendScript plugin for Photoshop that instantly color-matches CG materials to flat client textures using algorithmic averaging. 

This tool completely removes the need for manual color picking. It leverages Photoshop's native C++ `Average` filter and Histogram data to mathematically extract dominant midtones and perfectly shift hues without destroying your CG contrast.

## Features
* **Automated Averaging:** No need to guess where the "average" color is. The script instantly averages out all noise, lighting, and pores to find the true mathematical color of both materials.
* **Contrast Preserving:** By extracting and mapping only the dominant Midtone, the generated Curve safely anchors your absolute blacks (0) and whites (255). This prevents the "crunchy" texture artifacts common in standard matching methods.
* **Instant & Offline:** Uses 100% native ExtendScript. Runs in milliseconds, zero external dependencies required.
* **Non-Destructive:** Outputs a perfectly clipped Curves Adjustment Layer so you can tweak the opacity manually.

## Installation
1. Download the `ColorMatch.jsx` file.
2. Place it in your Photoshop Scripts folder:
   * **Windows:** `C:\Program Files\Adobe\Adobe Photoshop [Version]\Presets\Scripts\`
   * **Mac:** `Applications > Adobe Photoshop [Version] > Presets > Scripts >`
3. Restart Photoshop. The script will now be available under `File > Scripts > ColorMatch`.

## How to Use
1. Open your target image (CG render) in Photoshop.
2. Use the **Lasso** or **Marquee** tool to make a rough selection around the specific material/siding you want to change.
3. Go to `File > Scripts > ColorMatch`.
4. A file browser will pop up. Select your client's flat reference texture (e.g. JPG swatch) from your hard drive.
5. The script will instantly analyze both, close the texture, and drop the perfect matching Curve onto your render!
