// ColorMatch.jsx - Manual 3-Point Color Match with Auto-Blur
// Automates the PiXimperfect exact-match method and auto-averages textures.

#target photoshop

function main() {
    if (app.documents.length === 0) {
        alert("Please open a document.");
        return;
    }

    var doc = app.activeDocument;
    var len = doc.colorSamplers.length;
    
    if (len !== 6 && len !== 2) {
        alert("INSTRUCTIONS:\n\n" +
              "MODE A: Flat Texture Match (Use 2 Samplers)\n" +
              "   Point 1: Target Image's Midtone\n" +
              "   Point 2: Client's Flat Texture Color\n\n" +
              "MODE B: Full 3-Point Match (Use 6 Samplers)\n" +
              "   1, 2, 3: Target Image's Shadow, Midtone, Highlight\n" +
              "   4, 5, 6: Reference Image's Shadow, Midtone, Highlight\n\n" +
              "Place your samplers, select your Target Layer, and run this script. The script will automatically blur the image behind the scenes to extract the perfect smooth average color!");
        return;
    }
    
    doc.suspendHistory("Auto-Blur Color Match", "runAutoBlurMatch(doc, len)");
}

function runAutoBlurMatch(doc, len) {
    // 1. Stamp visible layers to a new temporary layer at the top
    var idMrgV = charIDToTypeID( "MrgV" );
    var desc = new ActionDescriptor();
    desc.putBoolean( charIDToTypeID( "Dplc" ), true );
    executeAction( idMrgV, desc, DialogModes.NO );
    
    var tempLayer = doc.activeLayer;
    tempLayer.name = "Temp_AutoBlur_Script";
    
    // 2. Apply a heavy Gaussian Blur to smooth out all texture and noise!
    // This perfectly replicates the user's manual blurring trick.
    tempLayer.applyGaussianBlur(25);
    
    // 3. Read the Color Samplers (they will now read the perfectly averaged, blurred colors!)
    var params = { castR: [], castG: [], castB: [] };
    
    if (len === 2) {
        var tM = doc.colorSamplers[0].color.rgb;
        var rM = doc.colorSamplers[1].color.rgb;
        
        params.castR = [ [Math.round(tM.red), Math.round(rM.red)] ];
        params.castG = [ [Math.round(tM.green), Math.round(rM.green)] ];
        params.castB = [ [Math.round(tM.blue), Math.round(rM.blue)] ];
        
    } else if (len === 6) {
        var tS = doc.colorSamplers[0].color.rgb;
        var tM = doc.colorSamplers[1].color.rgb;
        var tH = doc.colorSamplers[2].color.rgb;
        
        var rS = doc.colorSamplers[3].color.rgb;
        var rM = doc.colorSamplers[4].color.rgb;
        var rH = doc.colorSamplers[5].color.rgb;
        
        params.castR = [
            [Math.round(tS.red), Math.round(rS.red)],
            [Math.round(tM.red), Math.round(rM.red)],
            [Math.round(tH.red), Math.round(rH.red)]
        ];
        
        params.castG = [
            [Math.round(tS.green), Math.round(rS.green)],
            [Math.round(tM.green), Math.round(rM.green)],
            [Math.round(tH.green), Math.round(rH.green)]
        ];
        
        params.castB = [
            [Math.round(tS.blue), Math.round(rS.blue)],
            [Math.round(tM.blue), Math.round(rM.blue)],
            [Math.round(tH.blue), Math.round(rH.blue)]
        ];
    }
    
    // 4. Delete the temporary blurred layer to restore the sharp document
    tempLayer.remove();
    
    // 5. Ensure inputs are strictly ascending so Photoshop Curves don't cross over themselves
    function sortPts(pts) {
        if (pts.length === 1) return pts;
        pts.sort(function(a, b) { return a[0] - b[0]; });
        if (pts[1][0] <= pts[0][0]) pts[1][0] = Math.min(255, pts[0][0] + 1);
        if (pts[2][0] <= pts[1][0]) pts[2][0] = Math.min(255, pts[1][0] + 1);
        return pts;
    }
    
    params.castR = sortPts(params.castR);
    params.castG = sortPts(params.castG);
    params.castB = sortPts(params.castB);
    
    // 6. Generate the Curve layer
    makeCurvesLayer("Auto-Blurred 3-Point Match", "Nrml", [
        { ch: 'Rd  ', pts: params.castR },
        { ch: 'Grn ', pts: params.castG },
        { ch: 'Bl  ', pts: params.castB }
    ]);
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
        addCurvePoint(ptsList, 0, 0);
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
