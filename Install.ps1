Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

[System.Windows.Forms.Application]::EnableVisualStyles()

$scriptName = "ColorMatch.jsx"
$scriptPath = Join-Path $PSScriptRoot $scriptName

if (-not (Test-Path $scriptPath)) {
    [System.Windows.Forms.MessageBox]::Show("Error: Cannot find $scriptName in the current folder.`nPlease make sure this installer is in the same folder as the script.", "Installer Error", 0, [System.Windows.Forms.MessageBoxIcon]::Error)
    exit
}

# Find Adobe Photoshop installations in Program Files
$adobePath = "C:\Program Files\Adobe"
$psFolders = @()
if (Test-Path $adobePath) {
    $psFolders = Get-ChildItem -Path $adobePath -Directory | Where-Object { $_.Name -match "Adobe Photoshop" }
}

if ($psFolders.Count -eq 0) {
    [System.Windows.Forms.MessageBox]::Show("Could not find any Adobe Photoshop installations in C:\Program Files\Adobe.", "Installer Error", 0, [System.Windows.Forms.MessageBoxIcon]::Error)
    exit
}

$selectedPaths = @()

if ($psFolders.Count -eq 1) {
    $selectedPaths += $psFolders[0]
} else {
    # Create GUI Form to select versions
    $form = New-Object System.Windows.Forms.Form
    $form.Text = "ColorMatch Installer"
    $form.Size = New-Object System.Drawing.Size(400,300)
    $form.StartPosition = "CenterScreen"
    $form.FormBorderStyle = "FixedDialog"
    $form.MaximizeBox = $false
    
    $label = New-Object System.Windows.Forms.Label
    $label.Location = New-Object System.Drawing.Point(20,20)
    $label.Size = New-Object System.Drawing.Size(350,20)
    $label.Text = "Multiple Photoshop versions found. Select where to install:"
    $form.Controls.Add($label)
    
    $checkedListBox = New-Object System.Windows.Forms.CheckedListBox
    $checkedListBox.Location = New-Object System.Drawing.Point(20,50)
    $checkedListBox.Size = New-Object System.Drawing.Size(340,150)
    $checkedListBox.CheckOnClick = $true
    foreach ($folder in $psFolders) {
        $checkedListBox.Items.Add($folder.Name, $true) > $null
    }
    $form.Controls.Add($checkedListBox)
    
    $button = New-Object System.Windows.Forms.Button
    $button.Location = New-Object System.Drawing.Point(140,210)
    $button.Size = New-Object System.Drawing.Size(100, 30)
    $button.Text = "Install"
    $button.DialogResult = [System.Windows.Forms.DialogResult]::OK
    $form.Controls.Add($button)
    
    $form.AcceptButton = $button
    
    $result = $form.ShowDialog()
    if ($result -eq [System.Windows.Forms.DialogResult]::OK) {
        foreach ($item in $checkedListBox.CheckedItems) {
            $folder = $psFolders | Where-Object { $_.Name -eq $item }
            $selectedPaths += $folder
        }
    } else {
        exit
    }
}

if ($selectedPaths.Count -eq 0) {
    exit
}

$installedCount = 0
$adminRequired = $false

foreach ($folder in $selectedPaths) {
    $destDir = Join-Path $folder.FullName "Presets\Scripts"
    
    if (-not (Test-Path $destDir)) {
        try {
            New-Item -ItemType Directory -Force -Path $destDir | Out-Null
        } catch {
            $adminRequired = $true
            break
        }
    }
    
    try {
        Copy-Item -Path $scriptPath -Destination $destDir -Force -ErrorAction Stop
        $installedCount++
    } catch {
        $adminRequired = $true
        break
    }
}

if ($adminRequired) {
    [System.Windows.Forms.MessageBox]::Show("Permission Denied: Windows is blocking access to 'C:\Program Files\'.`n`nPlease right-click 'Install.bat' and select 'Run as Administrator'.", "Admin Required", 0, [System.Windows.Forms.MessageBoxIcon]::Warning)
    exit
}

if ($installedCount -gt 0) {
    [System.Windows.Forms.MessageBox]::Show("Successfully installed ColorMatch to $installedCount version(s) of Photoshop!`n`nPlease restart Photoshop if it is currently open.", "Installation Complete", 0, [System.Windows.Forms.MessageBoxIcon]::Information)
}
