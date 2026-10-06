// ColorMatch_Pure.jsx - Lightning Fast Offline Version
// No Python required. Uses Photoshop's native C++ Average Filter and Histogram.

#target photoshop

function main() {
    if (app.documents.length === 0) {
        alert("Please open a document containing your CG render.");
        return;
    }

    var doc = app.activeDocument;
    
    var hasSelection = true;
    try {
        var bnd = doc.selection.bounds;
    } catch(e) {
        hasSelection = false;
    }
    
    if (!hasSelection) {
        var proceed = confirm("Warning: You didn't make a selection (marching ants)!\n\nThe script will average the ENTIRE image, which might grab colors from your sky or background instead of the specific material. Do you want to proceed anyway?");
        if (!proceed) return;
    }
    
    var refFile = File.openDialog("Select the Client Reference Image (e.g. Texture or Swatch)", "*.*");
    
    if (refFile === null) {
        return; // User cancelled the file picker
    }
    
    doc.suspendHistory("Pure Color Match", "runPureMatch(doc, doc.activeLayer, refFile, hasSelection)");
}

function runPureMatch(doc, targetLayer, refFile, hasSelection) {
    // ==========================================
    // 1. EXTRACT TARGET AVERAGE COLOR
    // ==========================================
    
    // Duplicate the target layer so we don't destroy the original
    var tempTarget = targetLayer.duplicate(doc, ElementPlacement.PLACEATBEGINNING);
    doc.activeLayer = tempTarget;
    
    // Apply the Average filter (this perfectly averages the selected area into a solid color block)
    var idAvrg = charIDToTypeID( "Avrg" );
    executeAction( idAvrg, undefined, DialogModes.NO );
    
    // Because the selected area is now 100% one solid color, the histogram will have a single massive spike.
    // We can just read the highest peak of the histogram to get the exact RGB value of the selected area!
    var tColor = [
        getHistogramPeak(doc.channels[0].histogram),
        getHistogramPeak(doc.channels[1].histogram),
        getHistogramPeak(doc.channels[2].histogram)
    ];
    
    // Delete the temporary target layer
    tempTarget.remove();
    
    
    // ==========================================
    // 2. EXTRACT REFERENCE AVERAGE COLOR
    // ==========================================
    
    // Open the reference texture file silently in the background
    var refDoc = app.open(refFile);
    refDoc.selection.selectAll();
    
    // Apply the Average filter
    executeAction( idAvrg, undefined, DialogModes.NO );
    
    // Read the histogram peaks for the reference texture
    var rColor = [
        getHistogramPeak(refDoc.channels[0].histogram),
        getHistogramPeak(refDoc.channels[1].histogram),
        getHistogramPeak(refDoc.channels[2].histogram)
    ];
    
    // Close the reference document without saving
    refDoc.close(SaveOptions.DONOTSAVECHANGES);
    
    
    // ==========================================
    // 3. GENERATE THE CURVES LAYER
    // ==========================================
    
    app.activeDocument = doc;
    doc.activeLayer = targetLayer;
    
    // Clear the selection so Photoshop doesn't automatically create a pixel mask
    if (hasSelection) {
        try { doc.selection.deselect(); } catch(e) {}
    }
    
    // Build the curve using the extracted Midtones!
    makeCurvesLayer("Pure Color Match", "Nrml", [
        { ch: 'Rd  ', pts: [[tColor[0], rColor[0]]] },
        { ch: 'Grn ', pts: [[tColor[1], rColor[1]]] },
        { ch: 'Bl  ', pts: [[tColor[2], rColor[2]]] }
    ]);
}

// Helper: Finds the color value (0-255) that has the most pixels in the selection
function getHistogramPeak(hist) {
    var maxCount = -1;
    var maxIndex = 0;
    for (var i = 0; i < 256; i++) {
        if (hist[i] > maxCount) {
            maxCount = hist[i];
            maxIndex = i;
        }
    }
    return maxIndex;
}

// ============================================================================
// ActionManager (Layer Creation)
// ============================================================================

function cTID(s) { return app.charIDToTypeID(s); }
function sTID(s) { return app.stringIDToTypeID(s); }

function makeCurvesLayer(name, blendMode, channels) {
    var d = new ActionDescriptor();
    var r = new ActionReference();
    r.putClass(cTID('AdjL'));
    d.putReference(cTID('null'), r);
    
    var lay = new ActionDescriptor();
    lay.putString(cTID('Nm  '), name);
    lay.putBoolean(sTID('group'), true); // Clip mask
    
    var crv = new ActionDescriptor();
    var adj = new ActionList();
    
    for (var i = 0; i < channels.length; i++) {
        var c = new ActionDescriptor();
        var cr = new ActionReference();
        cr.putEnumerated(cTID('Chnl'), cTID('Chnl'), cTID(channels[i].ch));
        c.putReference(cTID('Chnl'), cr);
        
        var ptsList = new ActionList();
        
        // Photoshop requires curves to be anchored at the ends
        addCurvePoint(ptsList, 0, 0);
        
        // Add the dominant color shift (Midtone)
        for (var j = 0; j < channels[i].pts.length; j++) {
            addCurvePoint(ptsList, channels[i].pts[j][0], channels[i].pts[j][1]);
        }
        
        addCurvePoint(ptsList, 255, 255);
        
        c.putList(cTID('Crv '), ptsList);
        adj.putObject(cTID('CrvA'), c);
    }
    
    crv.putList(cTID('Adjs'), adj);
    lay.putObject(cTID('Type'), cTID('Crvs'), crv);
    d.putObject(cTID('Usng'), cTID('AdjL'), lay);
    executeAction(cTID('Mk  '), d, DialogModes.NO);
}

function addCurvePoint(list, x, y) {
    var p = new ActionDescriptor();
    p.putDouble(cTID('Hrzn'), x);
    p.putDouble(cTID('Vrtc'), y);
    list.putObject(cTID('Pnt '), p);
}

// Run the script
main();
