import AppKit

guard CommandLine.arguments.count == 3,
      let source = NSImage(contentsOfFile: CommandLine.arguments[1]),
      let bitmap = NSBitmapImageRep(
        bitmapDataPlanes: nil, pixelsWide: 1024, pixelsHigh: 1024,
        bitsPerSample: 8, samplesPerPixel: 4, hasAlpha: true, isPlanar: false, colorSpaceName: .deviceRGB,
        bytesPerRow: 0, bitsPerPixel: 0
      ),
      let context = NSGraphicsContext(bitmapImageRep: bitmap) else {
    fatalError("Cannot load the website icon or create the icon canvas")
}

NSGraphicsContext.saveGraphicsState()
NSGraphicsContext.current = context
source.draw(in: NSRect(x: 36, y: 36, width: 952, height: 952))
NSGraphicsContext.restoreGraphicsState()

guard let png = bitmap.representation(using: .png, properties: [:]) else {
    fatalError("Cannot encode the desktop icon")
}
try png.write(to: URL(fileURLWithPath: CommandLine.arguments[2]))
