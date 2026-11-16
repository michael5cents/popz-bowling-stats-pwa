import Cocoa
import Foundation

final class FounderAdmin: NSObject, NSApplicationDelegate {
    private var window: NSWindow!
    private var email: NSTextField!
    private var checkButton: NSButton!
    private var grantButton: NSButton!
    private var status: NSTextField!
    private var output: NSTextView!
    private var approvedEmail: String?
    private var working = false

    private func label(_ title: String, x: CGFloat, y: CGFloat, w: CGFloat, h: CGFloat, size: CGFloat, bold: Bool = false) -> NSTextField {
        let v = NSTextField(wrappingLabelWithString: title)
        v.frame = NSRect(x: x, y: y, width: w, height: h)
        v.font = bold ? .boldSystemFont(ofSize: size) : .systemFont(ofSize: size)
        v.textColor = .white
        return v
    }
    func applicationDidFinishLaunching(_ notification: Notification) {
        let rect = NSRect(x: 0, y: 0, width: 710, height: 495)
        window = NSWindow(contentRect: rect, styleMask: [.titled, .closable, .miniaturizable], backing: .buffered, defer: false)
        window.title = "Popz Bowling - Founder Admin"
        window.center()
        window.appearance = NSAppearance(named: .darkAqua)
        let root = NSView(frame: rect)
        root.wantsLayer = true
        root.layer?.backgroundColor = NSColor(calibratedRed: 0.075, green: 0.12, blue: 0.20, alpha: 1).cgColor
        window.contentView = root
        root.addSubview(label("Popz Bowling  |  Founder Admin", x: 25, y: 431, w: 655, h: 41, size: 25, bold: true))
        root.addSubview(label("Manually grant permanent, free Pro to a verified Google account.", x: 27, y: 406, w: 655, h: 23, size: 14))
        root.addSubview(label("Google email address", x: 27, y: 354, w: 610, h: 25, size: 15, bold: true))
        email = NSTextField(frame: NSRect(x: 27, y: 309, width: 656, height: 37))
        email.placeholderString = "someone@gmail.com"
        email.font = .systemFont(ofSize: 17)
        root.addSubview(email)
        checkButton = NSButton(title: "1. Check Google account", target: self, action: #selector(checkAccount))
        checkButton.frame = NSRect(x: 27, y: 256, width: 286, height: 39)
        checkButton.bezelStyle = .rounded
        checkButton.keyEquivalent = "\r"
        root.addSubview(checkButton)
        grantButton = NSButton(title: "2. Grant Lifetime Founder", target: self, action: #selector(grantAccount))
        grantButton.frame = NSRect(x: 329, y: 256, width: 354, height: 39)
        grantButton.bezelStyle = .rounded
        grantButton.isEnabled = false
        root.addSubview(grantButton)
        status = label("Ready. Enter a Google email and click Check.", x: 27, y: 224, w: 660, h: 26, size: 14, bold: true)
        status.textColor = .systemTeal
        root.addSubview(status)
        let scroll = NSScrollView(frame: NSRect(x: 27, y: 66, width: 656, height: 150))
        scroll.borderType = .bezelBorder
        scroll.hasVerticalScroller = true
        scroll.backgroundColor = NSColor(calibratedRed: 0.11, green: 0.17, blue: 0.26, alpha: 1)
        output = NSTextView(frame: NSRect(x: 0, y: 0, width: 635, height: 142))
        output.isEditable = false
        output.isRichText = false
        output.font = .monospacedSystemFont(ofSize: 13, weight: .regular)
        output.textColor = .white
        output.backgroundColor = scroll.backgroundColor
        output.textContainerInset = NSSize(width: 10, height: 9)
        output.string = "This private Mac app uses your existing Google Cloud owner login.\n\nOnly verified Google accounts may become Founders. An existing payment or pending checkout blocks granting. No bowling scores or history are touched."
        scroll.documentView = output
        root.addSubview(scroll)
        let footer = label("The person must first install Popz Bowling and sign in with Google. The grant does not charge them.", x: 27, y: 16, w: 655, h: 43, size: 12)
        root.addSubview(footer)
        if let p = Bundle.main.path(forResource: "icon-512", ofType: "png"),
           let icon = NSImage(contentsOfFile: p) {
            NSApplication.shared.applicationIconImage = icon
        }
        window.makeKeyAndOrderFront(nil)
        NSApplication.shared.activate(ignoringOtherApps: true)
    }
    private var currentEmail: String {
        email.stringValue.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
    }
    @objc private func checkAccount() {
        guard !working else { return }
        let address = currentEmail
        guard address.contains("@"), address.contains("."), address.count < 255 else {
            status.stringValue = "Enter the person's Google email first."
            status.textColor = .systemOrange
            return
        }
        approvedEmail = nil
        grantButton.isEnabled = false
        execute("check", address)
    }
    @objc private func grantAccount() {
        let address = currentEmail
        guard !working, approvedEmail == address else {
            status.stringValue = "Check this exact Google email first."
            status.textColor = .systemOrange
            grantButton.isEnabled = false
            return
        }
        let confirmation = NSAlert()
        confirmation.alertStyle = .warning
        confirmation.messageText = "Grant free Lifetime Founder Pro?"
        confirmation.informativeText = "Google account: \(address)\n\nThis permanently unlocks Pro for this one account. No payment or bowling history changes will occur.\n\nContinue only if you approve this person."
        confirmation.addButton(withTitle: "Grant Lifetime Founder")
        confirmation.addButton(withTitle: "Cancel")
        guard confirmation.runModal() == .alertFirstButtonReturn else { return }
        approvedEmail = nil
        execute("grant", address)
    }
    private func execute(_ action: String, _ address: String) {
        working = true
        checkButton.isEnabled = false
        grantButton.isEnabled = false
        status.textColor = .systemTeal
        status.stringValue = action == "check" ? "Checking Google Firebase account..." : "Granting Lifetime Founder..."
        output.string = "Contacting Firebase securely. No purchase or bowling data is being changed."
        DispatchQueue.global(qos: .userInitiated).async { [weak self] in
            let result = self?.backend(action, address) ?? ["ok": false, "message": "Unable to start the app."]
            DispatchQueue.main.async { [weak self] in
                self?.show(result, action: action, address: address)
            }
        }
    }
    private func backend(_ action: String, _ address: String) -> [String: Any] {
        let binary = NSHomeDirectory() + "/.nvm/versions/node/v24.15.0/bin/node"
        guard FileManager.default.isExecutableFile(atPath: binary),
              let directory = Bundle.main.resourcePath else {
            return ["ok": false, "message": "The local Node runtime or app files are missing."]
        }
        let task = Process()
        task.executableURL = URL(fileURLWithPath: binary)
        task.arguments = [directory + "/founder-admin.mjs", action, "--email", address] +
                         (action == "grant" ? ["--confirm-email", address] : [])
        var env = ProcessInfo.processInfo.environment
        env["HOME"] = NSHomeDirectory()
        task.environment = env
        let pipe = Pipe()
        task.standardOutput = pipe
        task.standardError = Pipe()
        do {
            try task.run()
            let data = pipe.fileHandleForReading.readDataToEndOfFile()
            task.waitUntilExit()
            return (try? JSONSerialization.jsonObject(with: data)) as? [String: Any] ??
                  ["ok": false, "message": "Could not read Google Firebase response."]
        } catch {
            return ["ok": false, "message": "Could not run the private Founder Admin on this Mac."]
        }
    }
    private func show(_ response: [String: Any], action: String, address: String) {
        working = false
        checkButton.isEnabled = true
        let ok = response["ok"] as? Bool ?? false
        let eligible = response["eligible"] as? Bool ?? false
        let granted = response["granted"] as? Bool ?? false
        let found = response["found"] as? Bool ?? false
        let google = response["verifiedGoogle"] as? Bool ?? false
        let accountStatus = response["accountStatus"] as? String ?? "Unknown"
        let message = response["message"] as? String ?? "No result provided."
        approvedEmail = action == "check" && ok && eligible ? address : nil
        grantButton.isEnabled = approvedEmail != nil
        status.stringValue = granted ? "Founder Pro - Lifetime granted and verified!" :
            !ok ? "The action could not be completed." :
            eligible ? "Account eligible. You can now Grant Lifetime Founder." :
            found ? "This account is not eligible or already has permanent Pro." :
                    "No Google account found. It must sign in first."
        status.textColor = granted || eligible ? .systemGreen : .systemOrange
        output.string = """
        Google email: \(address)
        Account found: \(found ? "Yes" : "No")
        Verified Google sign-in: \(google ? "Yes" : "No")
        Plan: \(granted ? "Founder Pro - Lifetime" : accountStatus)
        Eligible for a Founder grant: \(eligible ? "Yes" : "No")

        \(message)

        \(granted ? "Ask the person to reopen Popz Bowling and sign in with this same Google account." : "You must explicitly approve each individual Founder.")
        """
    }
    func applicationShouldTerminateAfterLastWindowClosed(_ app: NSApplication) -> Bool { true }
}
let app = NSApplication.shared
app.setActivationPolicy(.regular)
let delegate = FounderAdmin()
app.delegate = delegate
app.run()
