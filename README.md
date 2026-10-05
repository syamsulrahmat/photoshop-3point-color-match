# Photoshop 3-Point Color Match

A Photoshop JSX script that automates the precise 3-point color matching technique using the Color Sampler tool and Curves. This is perfect for seamlessly matching the color grade and lighting of a CG render to a client's reference photo.

## Features
* **Full 3-Point Match (6 Samplers):** Automates the popular "PiXimperfect" technique. Select Shadows, Midtones, and Highlights on both your Target and Reference images, and the script builds a perfect 1-to-1 RGB Curve adjustment.
* **Flat Texture Match (2 Samplers):** Perfect for matching CG renders to flat color swatches. Shifts the midtones while safely anchoring your existing shadows and highlights so you don't crush your lighting.
* **100% Non-Destructive:** The result is a single, cleanly grouped Curves Adjustment Layer clipped directly to your target.

## Installation
1. Download the `ColorMatch.jsx` file.
2. Place it in your Photoshop Scripts folder:
   * **Windows:** `C:\Program Files\Adobe\Adobe Photoshop [Version]\Presets\Scripts\`
   * **Mac:** `Applications > Adobe Photoshop [Version] > Presets > Scripts >`
3. Restart Photoshop. The script will now be available under `File > Scripts > ColorMatch`.

## How to Use
1. Open your target image (e.g. CG render) and reference image in the same Photoshop document.
2. Select the **Color Sampler Tool** (hidden under the Eyedropper tool `I`).
   * *Tip: Change the Sample Size in the top bar to '11 by 11 Average' to prevent sampling noisy pixels.*
3. Click to drop your samplers:
   * **For a Full Match (Drop 6):** Target Shadow, Target Mid, Target Highlight -> Ref Shadow, Ref Mid, Ref Highlight.
   * **For a Flat Texture Match (Drop 2):** Target Mid -> Ref Flat Color.
4. Select your target layer in the Layers panel.
5. Go to `File > Scripts > ColorMatch` to generate the matching curve!
