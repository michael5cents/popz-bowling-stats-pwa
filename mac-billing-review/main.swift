import Cocoa
import Foundation

// Popz Bowling payment-review window. Production ONLY.
// The bundled CLI reads a mode-600 token from ~/.config; never bundle tokens.
// No action in this UI issues refunds, charges customers, or changes Pro access.

private let reviewPattern = #"^(?:evt_[A-Za-z0-9_]+|checkout_[a-f0-9]{32})$"#

private func ownerCLI(_ action: String, id: String = "", note: String = "") -> (Bool, String) {
    let choices = [
        NSHomeDirectory() + "/.nvm/versions/node/v24.15.0/bin/node",
        "/opt/homebrew/bin/node", "/usr/local/bin/node"
    ]
    guard let node = choices.first(where: { FileManager.default.isExecutableFile(atPath: $0) }),
          let dir = Bundle.main.resourcePath else {
        return (false, "Missing local Node runtime or app resources; no payment action was performed.")
    }
    let cli = dir + "/billing-review-owner.mjs"
    guard FileManager.default.fileExists(atPath: cli) else {
        return (false, "Billing review helper missing. Rebuild this owner-only Mac app.")
    }
    let task = Process()
    task.executableURL = URL(fileURLWithPath: node)
    task.arguments = [cli, "--production", action] +
        (id.isEmpty ? [] : [id]) + (note.isEmpty ? [] : [note])
    var env = ProcessInfo.processInfo.environment
    env["HOME"] = NSHomeDirectory()
    task.environment = env
    let output = Pipe()
    task.standardOutput = output
    task.standardError = output
    do {
        try task.run()
        let raw = output.fileHandleForReading.readDataToEndOfFile()
        task.waitUntilExit()
        let message = (String(data: raw, encoding: .utf8) ?? "").trimmingCharacters(in: .whitespacesAndNewlines)
        return (task.terminationStatus == 0,
                message.isEmpty ? "No result received. Verify owner authorization and network access." : message)
    } catch {
        return (false, "The payment review helper could not start. No payment action was performed.")
    }
}

if CommandLine.arguments.contains("--read-only-smoke-test") {
    let (ok, message) = ownerCLI("open")
    print(message)
    exit(ok ? 0 : 1)
}

final class PaymentReviews: NSObject, NSApplicationDelegate {
    private var window: NSWindow!
    private var status: NSTextField!
    private var output: NSTextView!
    private var reviewID: NSTextField!
    private var note: NSTextField!
    private var buttons: [NSButton] = []
    private var working = false

    private func textLabel(_ value: String, x: CGFloat, y: CGFloat, width: CGFloat, height: CGFloat,
                           size: CGFloat = 13, bold: Bool = false) -> NSTextField {
        let view = NSTextField(wrappingLabelWithString: value)
        view.frame = NSRect(x: x, y: y, width: width, height: height)
        view.font = bold ? .boldSystemFont(ofSize: size) : .systemFont(ofSize: size)
        view.textColor = .white
        return view
    }

    private func actionButton(_ value: String, x: CGFloat, y: CGFloat, width: CGFloat, target: Selector) -> NSButton {
        let button = NSButton(title: value, target: self, action: target)
        button.frame = NSRect(x: x, y: y, width: width, height: 41)
        button.bezelStyle = .rounded
        buttons.append(button)
        return button
    }

    func applicationDidFinishLaunching(_ notification: Notification) {
        let rect = NSRect(x: 0, y: 0, width: 865, height: 655)
        window = NSWindow(contentRect: rect,
                          styleMask: [.titled, .closable, .miniaturizable],
                          backing: .buffered, defer: false)
        window.title = "Popz Bowling - LIVE Payment Reviews"
        window.center()
        window.appearance = NSAppearance(named: .darkAqua)
        let root = NSView(frame: rect)
        root.wantsLayer = true
        root.layer?.backgroundColor = NSColor(calibratedRed: 0.067, green: 0.11, blue: 0.19, alpha: 1).cgColor
        window.contentView = root

        root.addSubview(textLabel("Popz Bowling  |  Payment Reviews",
                                  x: 26, y: 595, width: 800, height: 40, size: 27, bold: true))
        root.addSubview(textLabel("LIVE owner inbox  |  Duplicate charges, refunds, disputes and uncertain checkouts",
                                  x: 28, y: 570, width: 800, height: 24, size: 13))

        let open = actionButton("1. Check Open Issues", x: 27, y: 518, width: 224,
                                target: #selector(checkOpen))
        open.keyEquivalent = "\r"
        root.addSubview(open)
        root.addSubview(actionButton("Show All History", x: 260, y: 518, width: 191,
                                     target: #selector(showAll)))
        root.addSubview(actionButton("2. Open Stripe", x: 460, y: 518, width: 180,
                                     target: #selector(openStripe)))
        root.addSubview(actionButton("What Should I Do?", x: 650, y: 518, width: 185,
                                     target: #selector(help)))

        status = textLabel("Checking LIVE payment reviews...",
                           x: 28, y: 480, width: 808, height: 28, size: 15, bold: true)
        status.textColor = .systemTeal
        root.addSubview(status)

        let scroll = NSScrollView(frame: NSRect(x: 26, y: 246, width: 813, height: 228))
        scroll.borderType = .bezelBorder
        scroll.hasVerticalScroller = true
        scroll.hasHorizontalScroller = true
        scroll.backgroundColor = NSColor(calibratedRed: 0.10, green: 0.16, blue: 0.25, alpha: 1)
        output = NSTextView(frame: NSRect(x: 0, y: 0, width: 800, height: 218))
        output.isEditable = false
        output.isRichText = false
        output.font = .monospacedSystemFont(ofSize: 12, weight: .regular)
        output.textColor = .white
        output.backgroundColor = scroll.backgroundColor
        output.textContainerInset = NSSize(width: 11, height: 10)
        output.string = "Reading LIVE payment-review data. No changes are made by viewing this list."
        scroll.documentView = output
        root.addSubview(scroll)

        root.addSubview(textLabel("3. Handle a flagged review after checking the actual payment in Stripe",
                                  x: 27, y: 208, width: 812, height: 29, size: 16, bold: true))
        root.addSubview(textLabel("Review ID  (evt_... or checkout_...)", x: 28, y: 181, width: 390, height: 22))
        root.addSubview(textLabel("Resolution note  (what you verified in Stripe)", x: 449, y: 181,
                                   width: 390, height: 22))
        reviewID = NSTextField(frame: NSRect(x: 27, y: 141, width: 404, height: 33))
        reviewID.placeholderString = "Paste an ID from the review list above"
        reviewID.font = .monospacedSystemFont(ofSize: 12, weight: .regular)
        root.addSubview(reviewID)
        note = NSTextField(frame: NSRect(x: 447, y: 141, width: 392, height: 33))
        note.placeholderString = "Detailed note required to mark resolved"
        root.addSubview(note)

        root.addSubview(actionButton("Mark Investigating", x: 26, y: 88, width: 301,
                                     target: #selector(markInvestigating)))
        root.addSubview(actionButton("Mark Resolved (Confirm)", x: 344, y: 88, width: 295,
                                     target: #selector(markResolved)))
        root.addSubview(textLabel("Verify the charge, refund or dispute in Stripe before resolving any record.",
                                  x: 28, y: 52, width: 803, height: 27))
        let note = textLabel("Review actions do NOT issue refunds, make charges, change Pro, or release blocked checkouts.",
                             x: 28, y: 23, width: 815, height: 24, size: 12)
        note.textColor = .systemTeal
        root.addSubview(note)

        if let path = Bundle.main.path(forResource: "icon-512", ofType: "png"),
           let icon = NSImage(contentsOfFile: path) {
            NSApplication.shared.applicationIconImage = icon
        }
        window.makeKeyAndOrderFront(nil)
        NSApplication.shared.activate(ignoringOtherApps: true)
        checkOpen()
    }

    private func modal(_ title: String, _ message: String) {
        let popup = NSAlert()
        popup.alertStyle = .informational
        popup.messageText = title
        popup.informativeText = message
        popup.addButton(withTitle: "OK")
        popup.runModal()
    }

    private func confirmed(_ title: String, _ message: String, button: String) -> Bool {
        let popup = NSAlert()
        popup.alertStyle = .warning
        popup.messageText = title
        popup.informativeText = message
        popup.addButton(withTitle: button)
        popup.addButton(withTitle: "Cancel")
        return popup.runModal() == .alertFirstButtonReturn
    }

    private func selectedId() -> String? {
        let id = reviewID.stringValue.trimmingCharacters(in: .whitespacesAndNewlines)
        guard id.range(of: reviewPattern, options: .regularExpression) != nil else {
            modal("Enter a valid review ID", "Copy an ID beginning evt_ or checkout_ from the LIVE review list.")
            return nil
        }
        return id
    }

    private func execute(_ action: String, id: String = "", note: String = "") {
        guard !working else { return }
        working = true
        buttons.forEach { $0.isEnabled = false }
        status.textColor = .systemTeal
        status.stringValue = action == "open" ? "Checking LIVE open payment issues..." :
            action == "all" ? "Loading LIVE review history..." : "Submitting your confirmed review action..."
        DispatchQueue.global(qos: .userInitiated).async { [weak self] in
            let (success, result) = ownerCLI(action, id: id, note: note)
            DispatchQueue.main.async { [weak self] in
                guard let self = self else { return }
                self.working = false
                self.buttons.forEach { $0.isEnabled = true }
                self.output.string = result
                self.status.textColor = success ? .systemGreen : .systemOrange
                if !success {
                    self.status.stringValue = "Request unsuccessful. No change was confirmed."
                } else if action == "open" {
                    self.status.stringValue = result.contains("LIVE reviews: 0 (scope: open)") ?
                        "No open LIVE payment issues. No action is needed." :
                        "LIVE payment reviews loaded. Check each flagged case in Stripe."
                } else if action == "all" {
                    self.status.stringValue = "LIVE payment review history loaded."
                } else {
                    self.status.stringValue = "Review action confirmed by the LIVE operator API."
                }
            }
        }
    }

    @objc private func checkOpen() { execute("open") }
    @objc private func showAll() { execute("all") }

    @objc private func openStripe() {
        guard let url = URL(string: "https://dashboard.stripe.com/payments") else { return }
        NSWorkspace.shared.open(url)
    }

    @objc private func help() {
        modal("What to do when a payment is flagged",
              """
              1. Select Check Open Issues. Normal successful payments don't need your review.
              2. Open Stripe and independently check the actual payment, refund, dispute or Checkout reservation.
              3. If Stripe confirms a duplicate charge, decide whether a refund is due. Any refund is issued separately in Stripe.
              4. You can mark the exception Investigating while you work on it. Only mark Resolved after checking the actual Stripe outcome and writing a clear note.
              5. Closing the review does not issue refunds or unblock uncertain checkouts.

              This tool connects to LIVE production only. It reads its protected owner token locally on this Mac.
              """)
    }

    @objc private func markInvestigating() {
        guard let id = selectedId() else { return }
        let message = "Review: \(id)\n\nThis marks a private billing alert as acknowledged. It will NOT refund or charge anyone."
        if confirmed("Mark this review as investigating?", message, button: "Mark Investigating") {
            execute("ack", id: id, note: "Owner investigating in Stripe")
        }
    }

    @objc private func markResolved() {
        guard let id = selectedId() else { return }
        let message = note.stringValue.trimmingCharacters(in: .whitespacesAndNewlines)
        guard message.count >= 8, message.count <= 400,
              message.range(of: #"[<>\u{0000}-\u{001F}]"#, options: .regularExpression) == nil else {
            modal("Enter a resolution note",
                  "Describe what you verified in Stripe in 8–400 characters. Do not include card numbers or private customer details.")
            return
        }
        let explanation = """
            Review: \(id)
            Note: \(message)

            Confirm ONLY after independently verifying the charge, refund, or dispute in Stripe. This closes the review alert only; it cannot refund, charge, change Pro, or unblock a stalled checkout.
            """
        if confirmed("Are you sure this payment issue is resolved?", explanation, button: "Mark Resolved") {
            execute("resolve", id: id, note: message)
        }
    }

    func applicationShouldTerminateAfterLastWindowClosed(_ application: NSApplication) -> Bool { true }
}

let application = NSApplication.shared
application.setActivationPolicy(.regular)
let delegate = PaymentReviews()
application.delegate = delegate
application.run()
