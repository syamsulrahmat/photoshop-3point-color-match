// ColorMatch.jsx - Manual 3-Point Color Match via Color Samplers
// Automates the PiXimperfect exact-match method.

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
              "TIP: In the top toolbar, change the Color Sampler 'Sample Size' from 'Point Sample' to '11 by 11 Average' to avoid selecting bad/noisy pixels on textures!\n\n" +
              "MODE A: Flat Texture Match (Use 2 Samplers)\n" +
              "   Point 1: Target Image's Midtone\n" +
              "   Point 2: Client's Flat Texture Color\n" +
              "   (This tints the CG midtones while perfectly preserving your CG shadows and highlights!)\n\n" +
              "MODE B: Full 3-Point Match (Use 6 Samplers)\n" +
              "   1, 2, 3: Target Image's Shadow, Midtone, Highlight\n" +
              "   4, 5, 6: Reference Image's Shadow, Midtone, Highlight\n\n" +
              "Place either 2 or 6 samplers, select your Target Layer, and run this script.");
        return;
    }
    
    var params = { castR: [], castG: [], castB: [] };
    
    if (len === 2) {
        // FLAT TEXTURE MODE
        var tM = doc.colorSamplers[0].color.rgb;
        var rM = doc.colorSamplers[1].color.rgb;
        
        params.castR = [ [Math.round(tM.red), Math.round(rM.red)] ];
        params.castG = [ [Math.round(tM.green), Math.round(rM.green)] ];
        params.castB = [ [Math.round(tM.blue), Math.round(rM.blue)] ];
        
    } else if (len === 6) {
        // FULL 3-POINT MODE
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
    
    // Ensure inputs are strictly ascending so Photoshop Curves don't cross over themselves and error
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
    
    doc.suspendHistory("Color Match via Samplers", "applyColorMatchCurves(params)");
}

function applyColorMatchCurves(params) {
    makeCurvesLayer("Exact 3-Point Color Match", "Nrml", [
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
    
    // Automatically clip to the layer below
    lay.putBoolean(sTID('group'), true);
    
    if (blendMode !== 'Nrml') {
        lay.putEnumerated(cTID('Md  '), cTID('BlnM'), cTID(blendMode));
    }
    
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
