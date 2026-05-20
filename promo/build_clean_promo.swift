import AVFoundation
import AppKit
import CoreGraphics
import Foundation

let width = 1920
let height = 1080
let fps: Int32 = 30
let durationSeconds = 34
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
        NSColor(hex: "#E7F3FF").cgColor,
        NSColor(hex: "#D5E8FF").cgColor,
        NSColor(hex: "#F6FAFF").cgColor
    ] as CFArray
    let locations: [CGFloat] = [0, 0.58, 1]
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
    ctx.setFillColor(color.cgColor)
    ctx.setLineWidth(5)
    ctx.setLineCap(.round)
    ctx.setLineJoin(.round)
    let p = CGFloat(progress)
    switch kind {
    case 0:
        rounded(ctx, CGRect(x: center.x - 42, y: center.y - 34, width: 84 * p, height: 68), 10, fill: color)
        rounded(ctx, CGRect(x: center.x - 29, y: center.y - 20, width: 58 * p, height: 40), 5, fill: NSColor(hex: "#E8F1FF"))
        strokeLine(ctx, CGPoint(x: center.x - 22, y: center.y + 8), CGPoint(x: center.x - 4, y: center.y - 10), color, 5)
        strokeLine(ctx, CGPoint(x: center.x - 4, y: center.y - 10), CGPoint(x: center.x + 22, y: center.y + 16), color, 5)
    case 1:
        ctx.fillEllipse(in: CGRect(x: center.x - 25, y: center.y + 24, width: 50 * p, height: 50))
        let body = CGPath(roundedRect: CGRect(x: center.x - 58, y: center.y - 58, width: 116 * p, height: 70), cornerWidth: 30, cornerHeight: 30, transform: nil)
        ctx.addPath(body)
        ctx.fillPath()
        let arch = CGMutablePath()
        arch.move(to: CGPoint(x: center.x - 34, y: center.y - 20))
        arch.addQuadCurve(to: CGPoint(x: center.x + 34, y: center.y - 20), control: CGPoint(x: center.x, y: center.y - 54))
        ctx.setStrokeColor(NSColor(hex: "#DFF5EE").cgColor)
        ctx.setLineWidth(7)
        ctx.addPath(arch)
        ctx.strokePath()
    case 2:
        rounded(ctx, CGRect(x: center.x - 40, y: center.y - 48, width: 80 * p, height: 96), 12, fill: color)
        rounded(ctx, CGRect(x: center.x - 24, y: center.y - 28, width: 48 * p, height: 13), 5, fill: NSColor(hex: "#FFF2D3"))
        rounded(ctx, CGRect(x: center.x - 24, y: center.y + 0, width: 38 * p, height: 13), 5, fill: NSColor(hex: "#FFF2D3"))
        rounded(ctx, CGRect(x: center.x - 24, y: center.y + 28, width: 44 * p, height: 13), 5, fill: NSColor(hex: "#FFF2D3"))
    case 3:
        let eye = CGPath(ellipseIn: CGRect(x: center.x - 58, y: center.y - 36, width: 116 * p, height: 72), transform: nil)
        ctx.addPath(eye)
        ctx.fillPath()
        ctx.setFillColor(NSColor(hex: "#F8E3EC").cgColor)
        ctx.fillEllipse(in: CGRect(x: center.x - 24, y: center.y - 24, width: 48 * p, height: 48))
        ctx.setFillColor(color.cgColor)
        ctx.fillEllipse(in: CGRect(x: center.x - 10, y: center.y - 10, width: 20 * p, height: 20))
    default:
        let points = [
            CGPoint(x: center.x - 48, y: center.y - 38),
            CGPoint(x: center.x - 16, y: center.y - 6),
            CGPoint(x: center.x + 10, y: center.y - 22),
            CGPoint(x: center.x + 52, y: center.y + 40)
        ]
        for i in 0..<(points.count - 1) {
            strokeLine(ctx, points[i], points[i + 1], color, 8)
        }
        for point in points {
            ctx.setFillColor(color.cgColor)
            ctx.fillEllipse(in: CGRect(x: point.x - 8, y: point.y - 8, width: 16, height: 16))
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

func drawReportingHub(_ ctx: CGContext, seconds: Double, start: Double, end: Double, title: String, subtitle: String, dark: Bool = false) {
    let flow = sceneProgress(seconds, start, start + 2.0)
    let fadeOut = 1 - sceneProgress(seconds, end - 0.8, end)
    let alpha = min(flow, fadeOut)
    if alpha <= 0 { return }

    let titleColor = dark ? NSColor.white : NSColor(hex: "#102033")
    let bodyColor = dark ? NSColor(hex: "#D7E6F7") : NSColor(hex: "#53606D")
    let lineColor = dark ? NSColor(hex: "#9FC6FF") : NSColor(hex: "#74A8F4")

    ctx.saveGState()
    ctx.setAlpha(CGFloat(alpha))
    drawText(title, CGRect(x: 0, y: 126, width: CGFloat(width), height: 80), size: 58, weight: .bold, color: titleColor, align: .center)
    drawText(subtitle, CGRect(x: 230, y: 214, width: CGFloat(width - 460), height: 72), size: 28, color: bodyColor, align: .center)

    let insight = modules[4]
    let center = CGPoint(x: 960, y: 595)
    let satellites: [(index: Int, point: CGPoint)] = [
        (0, CGPoint(x: 420, y: 500)),
        (1, CGPoint(x: 650, y: 765)),
        (2, CGPoint(x: 1270, y: 765)),
        (3, CGPoint(x: 1500, y: 500))
    ]

    for (order, item) in satellites.enumerated() {
        let lineT = clamp(flow * 1.25 - Double(order) * 0.12)
        let from = item.point
        strokeLine(ctx, from, CGPoint(x: lerp(from.x, center.x, lineT), y: lerp(from.y, center.y, lineT)), withAlpha(modules[item.index].accent, dark ? 0.75 : 0.58), 5)
    }

    ctx.saveGState()
    ctx.setAlpha(CGFloat(flow))
    shadow(ctx, alpha: dark ? 0.30 : 0.16, blur: 30, y: 14)
    rounded(ctx, CGRect(x: center.x - 140, y: center.y - 140, width: 280, height: 280), 52, fill: dark ? NSColor(hex: "#F8FBFF") : .white, stroke: withAlpha(insight.accent, 0.48), line: 2)
    ctx.setShadow(offset: .zero, blur: 0)
    rounded(ctx, CGRect(x: center.x - 74, y: center.y - 74, width: 148, height: 148), 34, fill: withAlpha(insight.accent, 0.14))
    drawIcon(ctx, center: center, kind: 4, color: insight.accent, progress: flow)
    drawText("Insight Hub", CGRect(x: center.x - 120, y: center.y - 178, width: 240, height: 42), size: 28, weight: .bold, color: titleColor, align: .center)
    ctx.restoreGState()

    for (order, item) in satellites.enumerated() {
        let module = modules[item.index]
        let appear = clamp(flow * 1.45 - Double(order) * 0.12)
        let x = item.point.x
        let y = item.point.y
        ctx.saveGState()
        ctx.setAlpha(CGFloat(appear))
        rounded(ctx, CGRect(x: x - 86, y: y - 86, width: 172, height: 172), 36, fill: dark ? NSColor(hex: "#F8FBFF") : .white, stroke: dark ? withAlpha(lineColor, 0.36) : NSColor(hex: "#C7D8EE"), line: 1.5)
        rounded(ctx, CGRect(x: x - 54, y: y - 54, width: 108, height: 108), 26, fill: withAlpha(module.accent, 0.13))
        drawIcon(ctx, center: CGPoint(x: x, y: y), kind: item.index, color: module.accent, progress: appear)
        drawText(module.name.replacingOccurrences(of: "The ", with: "").replacingOccurrences(of: " ", with: "\n"), CGRect(x: x - 118, y: y + 104, width: 236, height: 72), size: 23, weight: .semibold, color: titleColor, align: .center)
        ctx.restoreGState()
    }
    ctx.restoreGState()
}

func drawFrame(_ ctx: CGContext, seconds: Double) {
    drawBackground(ctx)
    drawText("The Hub Suite", CGRect(x: 88, y: 58, width: 360, height: 40), size: 28, weight: .semibold, color: NSColor(hex: "#1E293B"))
    drawText("Five hubs. One Single Pane of Glass.", CGRect(x: 1170, y: 60, width: 650, height: 34), size: 22, color: NSColor(hex: "#53606D"), align: .right)

    if seconds < 6.5 {
        drawReportingHub(
            ctx,
            seconds: seconds,
            start: 0.0,
            end: 6.5,
            title: "Five hubs. One Single Pane of Glass.",
            subtitle: "Each hub is a pillar, with centralised reporting and oversight through Insight Hub."
        )
    } else if seconds < 21.5 {
        let sceneStart = 6.5
        let slot = 3.0
        let index = min(4, max(0, Int((seconds - sceneStart) / slot)))
        let module = modules[index]
        let localSeconds = (seconds - sceneStart).truncatingRemainder(dividingBy: slot)
        let inT = sceneProgress(localSeconds, 0.0, 0.55)
        let outT = 1 - sceneProgress(localSeconds, 2.45, 3.0)
        let visible = min(inT, outT)

        ctx.saveGState()
        ctx.setAlpha(CGFloat(visible))
        rounded(ctx, CGRect(x: 130, y: 188, width: 112, height: 112), 28, fill: withAlpha(module.accent, 0.12), stroke: withAlpha(module.accent, 0.28), line: 1.5)
        drawIcon(ctx, center: CGPoint(x: 186, y: 244), kind: index, color: module.accent, progress: inT)
        drawText(module.name, CGRect(x: 130, y: 330, width: 560, height: 78), size: 54, weight: .bold)
        drawText(module.subtitle, CGRect(x: 134, y: 422, width: 600, height: 70), size: 28, color: NSColor(hex: "#53606D"))

        let image = screenshots[module.image]!
        let x = lerp(790, 720, inT)
        drawScreenshot(ctx, image: image, rect: CGRect(x: x, y: 190, width: 1040, height: 585), alpha: visible)
        ctx.restoreGState()
    } else if seconds < 28.0 {
        drawReportingHub(
            ctx,
            seconds: seconds,
            start: 21.5,
            end: 28.0,
            title: "Centralised reporting and oversight.",
            subtitle: "Insight Hub brings the pillars together, so senior managers see what they need at a single glance."
        )
    } else {
        let end = sceneProgress(seconds, 28.0, 29.3)
        fillRect(ctx, CGRect(x: 0, y: 0, width: width, height: height), withAlpha(NSColor(hex: "#071B33"), CGFloat(end)))
        drawReportingHub(
            ctx,
            seconds: seconds,
            start: 28.0,
            end: 34.0,
            title: "Five hubs. One Single Pane of Glass.",
            subtitle: "Everything senior managers need, visible at a single glance.",
            dark: true
        )
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
