import AVFoundation
import AppKit
import CoreGraphics
import Foundation

let width = 1920
let height = 1080
let fps: Int32 = 30
let durationSeconds = 27
let totalFrames = Int(fps) * durationSeconds

let root = URL(fileURLWithPath: FileManager.default.currentDirectoryPath)
let assets = root.appendingPathComponent("marketing-video")
let outputDir = root.appendingPathComponent("promo/output")
try? FileManager.default.createDirectory(at: outputDir, withIntermediateDirectories: true)
let framesDir = outputDir.appendingPathComponent("clean-frames")
try? FileManager.default.removeItem(at: framesDir)
try FileManager.default.createDirectory(at: framesDir, withIntermediateDirectories: true)

let colorSpace = CGColorSpaceCreateDeviceRGB()
let modules: [(name: String, subtitle: String, image: String, accent: NSColor)] = [
    ("The Support Hub", "Empower users to self serve.", "service-desk.png", NSColor(hex: "#246BFD")),
    ("Human Hub", "HR portal.", "human-hub.png", NSColor(hex: "#00A676")),
    ("Project Hub", "Manage & track work in progress.", "project-hub.png", NSColor(hex: "#D99A21")),
    ("Customer Hub", "Real-time insights into customers.", "customer-hub.png", NSColor(hex: "#C14D7A")),
    ("Insight Hub", "The single pane of glass.", "insight-hub.png", NSColor(hex: "#5D5FEF"))
]
let screenshots = Dictionary(uniqueKeysWithValues: modules.map {
    ($0.image, NSImage(contentsOf: assets.appendingPathComponent($0.image))!)
})

func clamp(_ x: Double, _ a: Double = 0, _ b: Double = 1) -> Double {
    min(max(x, a), b)
}

func smooth(_ x: Double) -> Double {
    let t = clamp(x)
    return t * t * (3 - 2 * t)
}

func lerp(_ a: CGFloat, _ b: CGFloat, _ t: Double) -> CGFloat {
    a + (b - a) * CGFloat(t)
}

func sceneProgress(_ seconds: Double, _ start: Double, _ end: Double) -> Double {
    smooth((seconds - start) / (end - start))
}

func withAlpha(_ color: NSColor, _ alpha: CGFloat) -> NSColor {
    color.withAlphaComponent(alpha)
}

func fillRect(_ ctx: CGContext, _ rect: CGRect, _ color: NSColor) {
    ctx.setFillColor(color.cgColor)
    ctx.fill(rect)
}

func strokeLine(_ ctx: CGContext, _ from: CGPoint, _ to: CGPoint, _ color: NSColor, _ width: CGFloat = 2) {
    ctx.setStrokeColor(color.cgColor)
    ctx.setLineWidth(width)
    ctx.move(to: from)
    ctx.addLine(to: to)
    ctx.strokePath()
}

func rounded(_ ctx: CGContext, _ rect: CGRect, _ radius: CGFloat, fill: NSColor, stroke: NSColor? = nil, line: CGFloat = 1) {
    let path = CGPath(roundedRect: rect, cornerWidth: radius, cornerHeight: radius, transform: nil)
    ctx.setFillColor(fill.cgColor)
    ctx.addPath(path)
    ctx.fillPath()
    if let stroke {
        ctx.setStrokeColor(stroke.cgColor)
        ctx.setLineWidth(line)
        ctx.addPath(path)
        ctx.strokePath()
    }
}

func drawText(_ string: String, _ rect: CGRect, size: CGFloat, weight: NSFont.Weight = .regular, color: NSColor = NSColor(hex: "#111827"), align: NSTextAlignment = .left) {
    let paragraph = NSMutableParagraphStyle()
    paragraph.alignment = align
    paragraph.lineBreakMode = .byWordWrapping
    let attrs: [NSAttributedString.Key: Any] = [
        .font: NSFont.systemFont(ofSize: size, weight: weight),
        .foregroundColor: color,
        .paragraphStyle: paragraph
    ]
    NSString(string: string).draw(in: rect, withAttributes: attrs)
}

func drawBackground(_ ctx: CGContext) {
    let colors = [
        NSColor(hex: "#F8FBFF").cgColor,
        NSColor(hex: "#F3FFF9").cgColor,
        NSColor(hex: "#FFF7E8").cgColor
    ] as CFArray
    let locations: [CGFloat] = [0, 0.52, 1]
    let gradient = CGGradient(colorsSpace: colorSpace, colors: colors, locations: locations)!
    ctx.drawLinearGradient(
        gradient,
        start: CGPoint(x: 0, y: 0),
        end: CGPoint(x: CGFloat(width), y: CGFloat(height)),
        options: []
    )
    ctx.setStrokeColor(NSColor(hex: "#FFFFFF").withAlphaComponent(0.55).cgColor)
    ctx.setLineWidth(1)
    for x in stride(from: 120, through: width, by: 160) {
        ctx.move(to: CGPoint(x: x, y: 0))
        ctx.addLine(to: CGPoint(x: x, y: height))
    }
    ctx.strokePath()
}

func shadow(_ ctx: CGContext, alpha: CGFloat = 0.12, blur: CGFloat = 24, y: CGFloat = 14) {
    ctx.setShadow(offset: CGSize(width: 0, height: y), blur: blur, color: NSColor.black.withAlphaComponent(alpha).cgColor)
}

func drawIcon(_ ctx: CGContext, center: CGPoint, kind: Int, color: NSColor, progress: Double = 1) {
    ctx.saveGState()
    ctx.setStrokeColor(color.cgColor)
    ctx.setLineWidth(5)
    ctx.setLineCap(.round)
    ctx.setLineJoin(.round)
    let p = CGFloat(progress)
    switch kind {
    case 0:
        let r = CGRect(x: center.x - 34, y: center.y - 26, width: 68 * p, height: 52)
        ctx.stroke(r)
        strokeLine(ctx, CGPoint(x: center.x - 18, y: center.y + 2), CGPoint(x: center.x - 4, y: center.y + 16), color, 5)
        strokeLine(ctx, CGPoint(x: center.x - 4, y: center.y + 16), CGPoint(x: center.x + 24, y: center.y - 12), color, 5)
    case 1:
        ctx.strokeEllipse(in: CGRect(x: center.x - 26, y: center.y - 34, width: 52 * p, height: 52))
        strokeLine(ctx, CGPoint(x: center.x, y: center.y + 18), CGPoint(x: center.x, y: center.y + 44 * p), color, 5)
    case 2:
        ctx.stroke(CGRect(x: center.x - 32, y: center.y - 32, width: 64 * p, height: 64))
        strokeLine(ctx, CGPoint(x: center.x - 18, y: center.y - 6), CGPoint(x: center.x + 18 * p, y: center.y - 6), color, 5)
        strokeLine(ctx, CGPoint(x: center.x - 18, y: center.y + 14), CGPoint(x: center.x + 10 * p, y: center.y + 14), color, 5)
    case 3:
        ctx.strokeEllipse(in: CGRect(x: center.x - 34, y: center.y - 24, width: 68 * p, height: 48))
        strokeLine(ctx, CGPoint(x: center.x - 10, y: center.y), CGPoint(x: center.x + 10 * p, y: center.y), color, 5)
    default:
        let points = [
            CGPoint(x: center.x - 34, y: center.y + 24),
            CGPoint(x: center.x - 14, y: center.y - 8),
            CGPoint(x: center.x + 6, y: center.y + 8),
            CGPoint(x: center.x + 34, y: center.y - 28)
        ]
        for i in 0..<(points.count - 1) {
            strokeLine(ctx, points[i], points[i + 1], color, 5)
        }
    }
    ctx.restoreGState()
}

func drawModuleCard(_ ctx: CGContext, rect: CGRect, module: (name: String, subtitle: String, image: String, accent: NSColor), index: Int, appear: Double, compact: Bool = false) {
    if appear <= 0 { return }
    ctx.saveGState()
    ctx.setAlpha(CGFloat(appear))
    let yOffset = CGFloat((1 - appear) * 38)
    let card = rect.offsetBy(dx: 0, dy: yOffset)
    shadow(ctx, alpha: 0.10, blur: 22, y: 12)
    rounded(ctx, card, 18, fill: .white, stroke: NSColor(hex: "#E2DED4"), line: 1.5)
    ctx.setShadow(offset: .zero, blur: 0)
    rounded(ctx, CGRect(x: card.minX + 22, y: card.minY + 24, width: 76, height: 76), 20, fill: withAlpha(module.accent, 0.12))
    drawIcon(ctx, center: CGPoint(x: card.minX + 60, y: card.minY + 62), kind: index, color: module.accent, progress: appear)
    drawText(module.name, CGRect(x: card.minX + 118, y: card.minY + 22, width: card.width - 144, height: 34), size: compact ? 28 : 32, weight: .semibold)
    drawText(module.subtitle, CGRect(x: card.minX + 118, y: card.minY + 62, width: card.width - 144, height: 30), size: compact ? 18 : 22, color: NSColor(hex: "#6B645A"))
    rounded(ctx, CGRect(x: card.minX + 24, y: card.maxY - 18, width: card.width - 48, height: 4), 2, fill: withAlpha(module.accent, 0.18))
    rounded(ctx, CGRect(x: card.minX + 24, y: card.maxY - 18, width: (card.width - 48) * CGFloat(appear), height: 4), 2, fill: module.accent)
    ctx.restoreGState()
}

func drawScreenshot(_ ctx: CGContext, image: NSImage, rect: CGRect, alpha: Double = 1) {
    ctx.saveGState()
    ctx.setAlpha(CGFloat(alpha))
    shadow(ctx, alpha: 0.16, blur: 30, y: 18)
    rounded(ctx, rect, 24, fill: .white, stroke: NSColor(hex: "#DDD8CE"), line: 1.2)
    ctx.setShadow(offset: .zero, blur: 0)
    let clip = CGPath(roundedRect: rect.insetBy(dx: 12, dy: 12), cornerWidth: 18, cornerHeight: 18, transform: nil)
    ctx.addPath(clip)
    ctx.clip()
    image.draw(in: rect.insetBy(dx: 12, dy: 12), from: .zero, operation: .copy, fraction: 1)
    ctx.restoreGState()
}

func drawFrame(_ ctx: CGContext, seconds: Double) {
    drawBackground(ctx)
    drawText("The Hub Suite", CGRect(x: 88, y: 58, width: 360, height: 40), size: 28, weight: .semibold, color: NSColor(hex: "#1E293B"))
    drawText("Five hubs. One Single Pane of Glass.", CGRect(x: 1170, y: 60, width: 650, height: 34), size: 22, color: NSColor(hex: "#53606D"), align: .right)

    if seconds < 6.0 {
        let appear = sceneProgress(seconds, 0.0, 1.2)
        ctx.saveGState()
        ctx.setAlpha(CGFloat(appear))
        drawText("Five hubs. One Single Pane of Glass.", CGRect(x: 130, y: 170, width: 1200, height: 90), size: 68, weight: .bold)
        drawText("Each hub is a pillar, with centralised reporting and oversight through Insight Hub.", CGRect(x: 134, y: 280, width: 1120, height: 42), size: 28, color: NSColor(hex: "#53606D"))
        ctx.restoreGState()

        let startX: CGFloat = 285
        let y: CGFloat = 540
        for (i, module) in modules.enumerated() {
            let p = clamp(sceneProgress(seconds, 1.0 + Double(i) * 0.18, 2.2 + Double(i) * 0.18))
            ctx.saveGState()
            ctx.setAlpha(CGFloat(p))
            let x = startX + CGFloat(i) * 335
            rounded(ctx, CGRect(x: x - 72, y: y - 72, width: 144, height: 144), 32, fill: withAlpha(module.accent, 0.12), stroke: withAlpha(module.accent, 0.32), line: 1.5)
            drawIcon(ctx, center: CGPoint(x: x, y: y), kind: i, color: module.accent, progress: p)
            drawText(module.name.replacingOccurrences(of: "The ", with: ""), CGRect(x: x - 135, y: y + 102, width: 270, height: 64), size: 24, weight: .semibold, align: .center)
            ctx.restoreGState()
        }
    } else if seconds < 18.0 {
        let sceneStart = 6.0
        let slot = 2.4
        let index = min(4, max(0, Int((seconds - sceneStart) / slot)))
        let module = modules[index]
        let localSeconds = (seconds - sceneStart).truncatingRemainder(dividingBy: slot)
        let inT = sceneProgress(localSeconds, 0.0, 0.45)
        let outT = 1 - sceneProgress(localSeconds, 1.9, 2.4)
        let visible = min(inT, outT)

        ctx.saveGState()
        ctx.setAlpha(CGFloat(visible))
        rounded(ctx, CGRect(x: 130, y: 188, width: 112, height: 112), 28, fill: withAlpha(module.accent, 0.12), stroke: withAlpha(module.accent, 0.28), line: 1.5)
        drawIcon(ctx, center: CGPoint(x: 186, y: 244), kind: index, color: module.accent, progress: inT)
        drawText(module.name, CGRect(x: 130, y: 330, width: 560, height: 78), size: 54, weight: .bold)
        drawText(module.subtitle, CGRect(x: 134, y: 422, width: 600, height: 70), size: 28, color: NSColor(hex: "#53606D"))
        rounded(ctx, CGRect(x: 132, y: 512, width: 320, height: 6), 3, fill: withAlpha(module.accent, 0.18))
        rounded(ctx, CGRect(x: 132, y: 512, width: 320 * CGFloat(sceneProgress(localSeconds, 0.3, 1.8)), height: 6), 3, fill: module.accent)

        let image = screenshots[module.image]!
        let x = lerp(790, 720, inT)
        drawScreenshot(ctx, image: image, rect: CGRect(x: x, y: 190, width: 1040, height: 585), alpha: visible)
        ctx.restoreGState()
    } else if seconds < 23.0 {
        let flow = sceneProgress(seconds, 18.0, 20.0)
        drawText("Centralised reporting and oversight.", CGRect(x: 0, y: 140, width: CGFloat(width), height: 72), size: 58, weight: .bold, align: .center)
        drawText("Insight Hub brings the pillars together, so senior managers see what they need at a single glance.", CGRect(x: 0, y: 224, width: CGFloat(width), height: 42), size: 28, color: NSColor(hex: "#53606D"), align: .center)

        let insight = modules[4]
        let center = CGPoint(x: 960, y: 590)
        let satellites: [(index: Int, point: CGPoint)] = [
            (0, CGPoint(x: 430, y: 460)),
            (1, CGPoint(x: 645, y: 740)),
            (2, CGPoint(x: 1275, y: 740)),
            (3, CGPoint(x: 1490, y: 460))
        ]

        for (order, item) in satellites.enumerated() {
            let lineT = clamp(flow * 1.25 - Double(order) * 0.12)
            let from = item.point
            strokeLine(ctx, from, CGPoint(x: lerp(from.x, center.x, lineT), y: lerp(from.y, center.y, lineT)), withAlpha(modules[item.index].accent, 0.55), 5)
        }

        ctx.saveGState()
        ctx.setAlpha(CGFloat(flow))
        shadow(ctx, alpha: 0.12, blur: 26, y: 12)
        rounded(ctx, CGRect(x: center.x - 138, y: center.y - 138, width: 276, height: 276), 52, fill: .white, stroke: withAlpha(insight.accent, 0.42), line: 2)
        ctx.setShadow(offset: .zero, blur: 0)
        rounded(ctx, CGRect(x: center.x - 72, y: center.y - 72, width: 144, height: 144), 34, fill: withAlpha(insight.accent, 0.14))
        drawIcon(ctx, center: center, kind: 4, color: insight.accent, progress: flow)
        drawText("Insight\nHub", CGRect(x: center.x - 100, y: center.y + 88, width: 200, height: 72), size: 28, weight: .bold, align: .center)
        ctx.restoreGState()

        for (order, item) in satellites.enumerated() {
            let module = modules[item.index]
            let appear = clamp(flow * 1.5 - Double(order) * 0.12)
            let x = item.point.x
            let y = item.point.y
            ctx.saveGState()
            ctx.setAlpha(CGFloat(appear))
            rounded(ctx, CGRect(x: x - 86, y: y - 86, width: 172, height: 172), 36, fill: .white, stroke: NSColor(hex: "#DDD8CE"), line: 1.5)
            rounded(ctx, CGRect(x: x - 54, y: y - 54, width: 108, height: 108), 26, fill: withAlpha(module.accent, 0.12))
            drawIcon(ctx, center: CGPoint(x: x, y: y), kind: item.index, color: module.accent, progress: appear)
            drawText(module.name.replacingOccurrences(of: "The ", with: "").replacingOccurrences(of: " ", with: "\n"), CGRect(x: x - 118, y: y + 102, width: 236, height: 72), size: 23, weight: .semibold, align: .center)
            ctx.restoreGState()
        }
    } else {
        let end = sceneProgress(seconds, 23.0, 26.6)
        fillRect(ctx, CGRect(x: 0, y: 0, width: width, height: height), withAlpha(NSColor(hex: "#111827"), CGFloat(end)))
        ctx.saveGState()
        ctx.setAlpha(CGFloat(end))
        drawText("Five hubs. One Single Pane of Glass.", CGRect(x: 0, y: 342, width: CGFloat(width), height: 96), size: 74, weight: .bold, color: .white, align: .center)
        drawText("Everything senior managers need, visible at a single glance.", CGRect(x: 0, y: 462, width: CGFloat(width), height: 48), size: 34, color: NSColor(hex: "#D7DBE3"), align: .center)
        let startX: CGFloat = 650
        for (i, module) in modules.enumerated() {
            rounded(ctx, CGRect(x: startX + CGFloat(i) * 132, y: 600, width: 92, height: 92), 24, fill: withAlpha(module.accent, 0.18), stroke: withAlpha(module.accent, 0.5))
            drawIcon(ctx, center: CGPoint(x: startX + CGFloat(i) * 132 + 46, y: 646), kind: i, color: module.accent)
        }
        ctx.restoreGState()
    }
}

for frame in 0..<totalFrames {
    let bitmap = NSBitmapImageRep(
        bitmapDataPlanes: nil,
        pixelsWide: width,
        pixelsHigh: height,
        bitsPerSample: 8,
        samplesPerPixel: 4,
        hasAlpha: true,
        isPlanar: false,
        colorSpaceName: .deviceRGB,
        bytesPerRow: 0,
        bitsPerPixel: 0
    )!
    let ctx = CGContext(
        data: bitmap.bitmapData,
        width: width,
        height: height,
        bitsPerComponent: 8,
        bytesPerRow: bitmap.bytesPerRow,
        space: colorSpace,
        bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue
    )!
    let nsContext = NSGraphicsContext(cgContext: ctx, flipped: false)
    NSGraphicsContext.saveGraphicsState()
    NSGraphicsContext.current = nsContext
    drawFrame(ctx, seconds: Double(frame) / Double(fps))
    NSGraphicsContext.restoreGraphicsState()
    let png = bitmap.representation(using: .png, properties: [:])!
    let path = framesDir.appendingPathComponent(String(format: "frame_%05d.png", frame))
    try png.write(to: path)
    if frame % 90 == 0 {
        print("Rendered frame \(frame)/\(totalFrames)")
    }
}

print("Wrote frames to \(framesDir.path)")

extension NSColor {
    convenience init(hex: String) {
        let value = hex.trimmingCharacters(in: CharacterSet(charactersIn: "#"))
        let scanner = Scanner(string: value)
        var rgb: UInt64 = 0
        scanner.scanHexInt64(&rgb)
        let r = CGFloat((rgb >> 16) & 0xff) / 255
        let g = CGFloat((rgb >> 8) & 0xff) / 255
        let b = CGFloat(rgb & 0xff) / 255
        self.init(calibratedRed: r, green: g, blue: b, alpha: 1)
    }
}
