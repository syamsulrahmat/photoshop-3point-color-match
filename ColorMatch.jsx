// ColorMatch.jsx - The Ultimate AI Integration
// Extracts selection, prompts for reference file, runs Python AI invisibly, and builds the Curve.

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
        var proceed = confirm("Warning: You didn't make a selection (marching ants)!\n\nThe AI will analyze the ENTIRE image, which might grab colors from your sky or background instead of the specific material. Do you want to proceed anyway?");
        if (!proceed) return;
    }
    
    // Prompt the user to select the Client Reference image from their hard drive
    var refFile = File.openDialog("Select the Client Reference Image (e.g. Texture or Swatch)", "*.*");
    
    if (refFile === null) {
        return; // User cancelled the file picker
    }
    
    doc.suspendHistory("AI Color Match", "runFullAIPipeline(doc, doc.activeLayer, refFile, hasSelection)");
}

function runFullAIPipeline(doc, targetLayer, refFile, hasSelection) {
    var tempDir = Folder.temp;
    var targetPng = new File(tempDir + "/ai_target.png");
    var scriptOutput = new File(tempDir + "/ai_curve_output.jsx");
    
    // Clean up old files
    if (targetPng.exists) targetPng.remove();
    if (scriptOutput.exists) scriptOutput.remove();

    // --- EXPORT TARGET ---
    exportSelectionToPNG(doc, targetPng, hasSelection);
    
    // Restore active layer just in case
    doc.activeLayer = targetLayer;
    
    // --- RUN PYTHON AI ---
    var pythonScript = "C:\\Users\\PC-207\\Nextcloud\\SMB RRI\\Projects\\Antigravity\\Photoshop color matching tool\\ai_headless_worker.py";
    var pythonExe = "C:\\Python314\\python.exe";
    var logFile = new File(tempDir + "/ai_log.txt");
    if (logFile.exists) logFile.remove();
    
    // Ensure refFile is a valid File object (openDialog sometimes returns a string)
    var refFileObj = (refFile instanceof File) ? refFile : new File(refFile);
    
    // Create a robust batch file to handle execution and log any python crashes
    var batFile = new File(tempDir + "/run_ai_match.bat");
    batFile.encoding = "UTF-8"; // CRITICAL: Fixes silent fail when path has Japanese characters
    batFile.open("w");
    batFile.writeln('chcp 65001 > nul'); // Force command prompt to use UTF-8
    batFile.writeln('@echo off');
    batFile.writeln('"' + pythonExe + '" "' + pythonScript + '" "' + targetPng.fsName + '" "' + refFileObj.fsName + '" "' + scriptOutput.fsName + '" > "' + logFile.fsName + '" 2>&1');
    batFile.close();
    
    $.sleep(200); // Give Windows a moment to flush the file to disk
    
    // Execute the batch file asynchronously and poll for completion
    batFile.execute();
    
    // Wait for up to 15 seconds for Python to finish
    var maxWait = 30; // 30 * 500ms = 15 seconds
    while (maxWait > 0 && !scriptOutput.exists) {
        $.sleep(500);
        
        // If the log file exists and contains the word "Traceback" or "Error", it crashed!
        if (logFile.exists) {
            logFile.open("r");
            var logText = logFile.read();
            logFile.close();
            if (logText.indexOf("Traceback") !== -1 || logText.indexOf("Error:") !== -1) {
                break; // Break early if Python crashed
            }
        }
        maxWait--;
    }
    
    // --- READ AND APPLY CURVE ---
    // Deselect so Photoshop doesn't automatically create a pixel mask on the Curve
    try { doc.selection.deselect(); } catch(e) {}

    if (scriptOutput.exists) {
        $.evalFile(scriptOutput);
    } else {
        var errorMsg = "The AI failed to generate the curve.\n\n";
        if (logFile.exists) {
            logFile.open("r");
            errorMsg += "PYTHON ERROR LOG:\n" + logFile.read();
            logFile.close();
        }
        alert(errorMsg);
    }
    
    // Clean up
    if (targetPng.exists) targetPng.remove();
    if (scriptOutput.exists) scriptOutput.remove();
}

function exportSelectionToPNG(doc, fileObj, hasSelection) {
    if (!hasSelection) {
        doc.selection.selectAll();
    }
    
    try {
        doc.selection.copy();
    } catch(e) {
        // If selection is empty, just create a blank tiny doc
        var blankDoc = app.documents.add(10, 10, doc.resolution, "TempExp", NewDocumentMode.RGB, DocumentFill.TRANSPARENT);
        saveAsPNG(blankDoc, fileObj);
        blankDoc.close(SaveOptions.DONOTSAVECHANGES);
        return;
    }
    
    var tempDoc = app.documents.add(doc.width, doc.height, doc.resolution, "TempExp", NewDocumentMode.RGB, DocumentFill.TRANSPARENT);
    tempDoc.paste();
    
    // Trim away all the blank transparency to make the file tiny and fast for Python to read
    tempDoc.trim(TrimType.TRANSPARENT);
    
    saveAsPNG(tempDoc, fileObj);
    tempDoc.close(SaveOptions.DONOTSAVECHANGES);
}

function saveAsPNG(doc, fileObj) {
    var opts = new PNGSaveOptions();
    opts.compression = 9; // Fast save
    doc.saveAs(fileObj, opts, true, Extension.LOWERCASE);
}

// ============================================================================
// ActionManager Helpers for the AI to call
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
    lay.putBoolean(sTID('group'), true); // Restored Clipping Mask
    
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
