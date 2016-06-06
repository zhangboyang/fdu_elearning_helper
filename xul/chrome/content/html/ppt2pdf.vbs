'http://superuser.com/questions/641471/how-can-i-automatically-convert-powerpoint-to-pdf

Option Explicit

Sub WriteLine (strLine)
    WScript.Stdout.WriteLine strLine
End Sub

' http://msdn.microsoft.com/en-us/library/office/aa432714(v=office.12).aspx
Const msoFalse = 0   ' False.
Const msoTrue = -1   ' True.

' http://msdn.microsoft.com/en-us/library/office/bb265636(v=office.12).aspx
Const ppFixedFormatIntentScreen = 1 ' Intent is to view exported file on screen.
Const ppFixedFormatIntentPrint = 2  ' Intent is to print exported file.

' http://msdn.microsoft.com/en-us/library/office/ff746754.aspx
Const ppFixedFormatTypeXPS = 1  ' XPS format
Const ppFixedFormatTypePDF = 2  ' PDF format

' http://msdn.microsoft.com/en-us/library/office/ff744564.aspx
Const ppPrintHandoutVerticalFirst = 1   ' Slides are ordered vertically, with the first slide in the upper-left corner and the second slide below it.
Const ppPrintHandoutHorizontalFirst = 2 ' Slides are ordered horizontally, with the first slide in the upper-left corner and the second slide to the right of it.

' http://msdn.microsoft.com/en-us/library/office/ff744185.aspx
Const ppPrintOutputSlides = 1               ' Slides
Const ppPrintOutputTwoSlideHandouts = 2     ' Two Slide Handouts
Const ppPrintOutputThreeSlideHandouts = 3   ' Three Slide Handouts
Const ppPrintOutputSixSlideHandouts = 4     ' Six Slide Handouts
Const ppPrintOutputNotesPages = 5           ' Notes Pages
Const ppPrintOutputOutline = 6              ' Outline
Const ppPrintOutputBuildSlides = 7          ' Build Slides
Const ppPrintOutputFourSlideHandouts = 8    ' Four Slide Handouts
Const ppPrintOutputNineSlideHandouts = 9    ' Nine Slide Handouts
Const ppPrintOutputOneSlideHandouts = 10    ' Single Slide Handouts

' http://msdn.microsoft.com/en-us/library/office/ff745585.aspx
Const ppPrintAll = 1            ' Print all slides in the presentation.
Const ppPrintSelection = 2      ' Print a selection of slides.
Const ppPrintCurrent = 3        ' Print the current slide from the presentation.
Const ppPrintSlideRange = 4     ' Print a range of slides.
Const ppPrintNamedSlideShow = 5 ' Print a named slideshow.

' http://msdn.microsoft.com/en-us/library/office/ff744228.aspx
Const ppShowAll = 1             ' Show all.
Const ppShowNamedSlideShow = 3  ' Show named slideshow.
Const ppShowSlideRange = 2      ' Show slide range.

Const ppWindowMaximized = 3
Const ppWindowMinimized = 2
Const ppWindowNormal = 1

' https://msdn.microsoft.com/zh-cn/library/bb251061%28v=office.12%29.aspx
Const ppSaveAsPDF = 32


'
' This is the actual script
'

'WriteLine "PPT ת PDF �ļ�ת����"
WriteLine "����ת���ļ���ʽ, ���Ժ� ..."
WriteLine "========================================"

Dim inputFile
Dim outputFile
Dim objPPT
Dim objPresentation
Dim objPrintOptions
Dim objFso

If WScript.Arguments.Count <> 2 Then
    WriteLine "û��ָ�������ļ���������ļ�"
    WScript.Quit
End If

inputFile = WScript.Arguments(0)
outputFile = WScript.Arguments(1)

Set objFso = CreateObject("Scripting.FileSystemObject")

If Not objFso.FileExists( inputFile ) Then
    WriteLine "�޷��ҵ������ļ� " & inputFile
    WScript.Quit
End If
inputFile = objFso.GetAbsolutePathName(inputFile)

If objFso.FileExists( outputFile ) Then
    WriteLine "����ļ� " & outputFile & " �Ѿ�����"
    WScript.Quit
End If
outputFile = objFso.GetAbsolutePathName(outputFile)

'WriteLine "���� PPT �ļ�: " & inputFile
'WriteLine "��� PDF �ļ�: " & outputFile
'WriteLine "========================================"

WriteLine "���ڴ������� ..."
Set objPPT = CreateObject("PowerPoint.Application")

objPPT.Visible = True

' may cause PPT to crash when objPPT.ExportAsFixedFormat
objPPT.WindowState = ppWindowMinimized


WriteLine "����ִ�д����� (������Ҫ�ϳ�ʱ��) ..."
objPPT.Presentations.Open inputFile

Set objPresentation = objPPT.ActivePresentation
Set objPrintOptions = objPresentation.PrintOptions

objPrintOptions.Ranges.Add 1,objPresentation.Slides.Count
objPrintOptions.RangeType = ppShowAll

WriteLine "���ڵ��� (������Ҫ�ϳ�ʱ��) ..."

' Reference for this at http://msdn.microsoft.com/en-us/library/office/ff746080.aspx
'objPresentation.ExportAsFixedFormat outputFile, ppFixedFormatTypePDF, ppFixedFormatIntentScreen, msoFalse, ppPrintHandoutHorizontalFirst, ppPrintOutputSlides, msoFalse, objPrintOptions.Ranges(1), ppPrintAll, "PPT2PDF", False, False, False, False, False

' WPS compatible
objPresentation.SaveAs outputFile, ppSaveAsPDF

WriteLine "����ִ�йر����� ..."
objPresentation.Close
objPPT.Quit

WriteLine "ת�����!"