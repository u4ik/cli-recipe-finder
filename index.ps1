param(
    [string]$PicturePath,
    [string]$RecipeName
)

if (!$PicturePath) {
    "`nSorry, no picture was given to me.`n"
    "Usage:`n$PSCommandPath [-PicturePath] full_path_to_image_file`n"
    break
}

Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

function display([System.Drawing.Image]$img) {
    $w_form = 400 # form width
    $h_form = 250 # form height

    $b = [int]$img.Size.Width
    $h = [int]$img.Size.Height
    $b_thumb = $b
    $h_thumb = $h

    # portrait picture higher than 500px or landscape picture wider than 700px?
    if ( ($b -gt $h) -and ($b -gt 700) ) {
        $b_thumb = 700
        $h_thumb = [int](700 * $h / $b)
        $imgthumb = $img.GetThumbnailImage($b_thumb, $h_thumb, $null, 0) # create bitmap with 700px width
    }
    elseif ( ($b -le $h) -and ($h -gt 500) ) {
        $b_thumb = [int](500 * $b / $h)
        $h_thumb = 500
        $imgthumb = $img.GetThumbnailImage($b_thumb, $h_thumb, $null, 0) # create bitmap with 500px height
    }
    else {
        $imgthumb=$img
    }

    $form = New-Object Windows.Forms.Form

    # $form.Text = "Picture"
    $form.Text = $RecipeName
    # $form.Size = New-Object System.Drawing.Size($w_form,$h_form) # minimal size
    $form.Size = New-Object System.Drawing.Size($b,$h) # minimal size
    $form.StartPosition = "CenterScreen"
    # $form.AutoSize = $True
    $form.AutoSize = $True
    $form.AutoSizeMode = "GrowOnly" # or "GrowAndShrink"
   
    $form.Topmost = $True

    $font_normal = New-Object System.Drawing.Font("Tahoma",13,[Drawing.FontStyle]::Regular)
    $font_bold = New-Object System.Drawing.Font("Tahoma",16,[Drawing.FontStyle]::Bold)

    $PictureBox = New-Object Windows.Forms.PictureBox
    # $PictureBox.Location = New-Object System.Drawing.Point(0,0)
    $PictureBox.Location = New-Object System.Drawing.Point(0,0)
    $PictureBox.Size = New-Object System.Drawing.Size($b_thumb, $h_thumb)

    $PictureBox.Image = $imgthumb;
    $form.Controls.Add($PictureBox)

    $LabelDescription = New-Object Windows.Forms.Label
    $LabelDescription.Location = New-Object System.Drawing.Point(5,5)
    #$LabelDescription.Size = New-Object System.Drawing.Size(375,25)
    $LabelDescription.Font = $font_bold;
    # $LabelDescription.Text = "original size: $b x $h, display size: $b_thumb x $h_thumb"
    $LabelDescription.AutoSize = $True
    $form.Controls.Add($LabelDescription)

    # $OKButton = New-Object System.Windows.Forms.Button
    # $OKButton.Size = New-Object System.Drawing.Size(75,45)
    # # OKButton centered under the picture
    # $OKButton.Location = New-Object System.Drawing.Point( (($form.Size.Width - $OKButton.Size.Width) / 2),(50+$h_thumb) )
    # $OKButton.Text = "OK"
    # $OKButton.Font = $font_bold
    # $OKButton.DialogResult = [System.Windows.Forms.DialogResult]::OK
    # $form.Controls.Add($OKButton)
    # $form.AcceptButton = $OKButton

    return $form.ShowDialog()
}

# read image file to byte array
try {
    $img = [System.IO.File]::ReadAllBytes("$PicturePath")
}
catch {
    "Error reading file. Please give me the full path to the image file.`nExiting ..."
    break
}

$ms = New-Object System.IO.MemoryStream # i need some memory
$ms.Write($img, 0, $img.Length) # image bytes to memory stream

# convert image to Windows System Bitmap
try {
    $img = [System.Drawing.Image]::FromStream($ms,$true,$true)
}
catch {
    "Error loading image.`nExiting ..."
    $ms.Dispose() # free memory
    break
}
$ms.Dispose() # free memory

display($img)