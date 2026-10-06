import sys
import cv2
import numpy as np
from sklearn.cluster import KMeans
import os

def get_dominant_colors(image_path, k=3):
    # Read with alpha channel to respect Photoshop's transparency masks
    img = cv2.imdecode(np.fromfile(image_path, dtype=np.uint8), cv2.IMREAD_UNCHANGED)
    
    if img is None:
        return [[0,0,0], [128,128,128], [255,255,255]]

    # Bilateral blur smooths texture but keeps boundaries
    # We must drop alpha for BilateralFilter
    img_bgr = img[:,:,:3] if len(img.shape) == 3 and img.shape[2] >= 3 else img
    blurred = cv2.bilateralFilter(img_bgr, d=9, sigmaColor=75, sigmaSpace=75)
    
    # If image has an alpha channel, ONLY use opaque pixels!
    if len(img.shape) == 3 and img.shape[2] == 4:
        mask = img[:,:,3] > 0
        pixels = blurred[mask]
        pixels = pixels[:, ::-1] # BGR to RGB
    else:
        pixels = cv2.cvtColor(blurred, cv2.COLOR_BGR2RGB).reshape((-1, 3))
        
    if len(pixels) == 0:
        return [[0,0,0], [128,128,128], [255,255,255]]
        
    # Subsample to speed up K-Means
    if len(pixels) > 50000:
        np.random.seed(42)
        idx = np.random.choice(len(pixels), 50000, replace=False)
        pixels = pixels[idx]

    kmeans = KMeans(n_clusters=min(k, len(pixels)), random_state=42, n_init=10)
    kmeans.fit(pixels)
    
    colors = kmeans.cluster_centers_
    sorted_colors = sorted(colors, key=lambda c: 0.299*c[0] + 0.587*c[1] + 0.114*c[2])
    
    while len(sorted_colors) < 3:
        sorted_colors.append(sorted_colors[-1])
        
    return np.round(sorted_colors).astype(int).tolist()

if __name__ == "__main__":
    t_path = sys.argv[1]
    r_path = sys.argv[2]
    out_jsx_path = sys.argv[3]
    
    t_colors = get_dominant_colors(t_path, k=1)
    r_colors = get_dominant_colors(r_path, k=1)
    
    # We only use the single most dominant average color to prevent extreme contrast stretching
    # and "crunchy" textures that happen when trying to map noise to noise.
    
    jsx_code = f"""
    var params = {{
        castR: [
            [{t_colors[0][0]}, {r_colors[0][0]}]
        ],
        castG: [
            [{t_colors[0][1]}, {r_colors[0][1]}]
        ],
        castB: [
            [{t_colors[0][2]}, {r_colors[0][2]}]
        ]
    }};
    
    function sortPts(pts) {{
        return pts;
    }}
    
    params.castR = sortPts(params.castR);
    params.castG = sortPts(params.castG);
    params.castB = sortPts(params.castB);
    
    makeCurvesLayer('AI Color Match', 'Nrml', [
        {{ ch: 'Rd  ', pts: params.castR }},
        {{ ch: 'Grn ', pts: params.castG }},
        {{ ch: 'Bl  ', pts: params.castB }}
    ]);
    """
    
    with open(out_jsx_path, "w", encoding="utf-8") as f:
        f.write(jsx_code)
