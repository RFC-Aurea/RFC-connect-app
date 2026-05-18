import SwiftUI
import UIKit

extension UIImage {
    func resizedForAvatar(maxDimension: CGFloat) -> UIImage {
        let largestSide = max(size.width, size.height)
        guard largestSide > maxDimension else { return self }
        let scale = maxDimension / largestSide
        let newSize = CGSize(width: size.width * scale, height: size.height * scale)
        let renderer = UIGraphicsImageRenderer(size: newSize)
        return renderer.image { _ in
            self.draw(in: CGRect(origin: .zero, size: newSize))
        }
    }
}

struct UserAvatar: View {
    let name: String
    let profileImageUrl: String?
    let size: CGFloat
    var backgroundColor: Color = Color(hex: "1B4332").opacity(0.15)
    var foregroundColor: Color = Color(hex: "1B4332")

    @State private var loadedImage: UIImage?
    @State private var didFailLoad = false

    var body: some View {
        ZStack {
            Circle()
                .fill(backgroundColor)
                .frame(width: size, height: size)
            if let img = loadedImage {
                Image(uiImage: img)
                    .resizable()
                    .scaledToFill()
                    .frame(width: size, height: size)
                    .clipShape(Circle())
            } else {
                Text(name.prefix(1).uppercased())
                    .font(.system(size: size * 0.42, weight: .bold))
                    .foregroundColor(foregroundColor)
            }
        }
        .frame(width: size, height: size)
        .task(id: profileImageUrl ?? "") {
            await loadIfNeeded()
        }
    }

    private func loadIfNeeded() async {
        guard let path = profileImageUrl, !path.isEmpty else {
            loadedImage = nil
            return
        }
        if let cached = ImageCache.shared.get(path) {
            loadedImage = cached
            return
        }
        do {
            let data = try await APIClient.shared.downloadFileData(from: path)
            if let img = UIImage(data: data) {
                ImageCache.shared.set(path, img)
                loadedImage = img
            } else {
                didFailLoad = true
            }
        } catch {
            didFailLoad = true
        }
    }
}
