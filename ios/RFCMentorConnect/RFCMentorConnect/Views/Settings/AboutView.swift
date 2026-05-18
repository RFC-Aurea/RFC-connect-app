import SwiftUI

struct AboutView: View {
    var body: some View {
        ZStack {
            Color(hex: "F5F5F0").ignoresSafeArea()
            ScrollView {
                VStack(spacing: 20) {
                    Image("RFCLogo")
                        .resizable()
                        .scaledToFit()
                        .frame(width: 120, height: 120)
                        .clipShape(RoundedRectangle(cornerRadius: 26))
                        .padding(.top, 24)

                    VStack(spacing: 6) {
                        Text("RFC Mentor Connect")
                            .font(.title.bold())
                            .foregroundColor(Color(hex: "1B4332"))
                        Text("By Rejuvenating Fertility Center")
                            .font(.subheadline)
                            .foregroundColor(Color(hex: "B8860B"))
                    }

                    Text("RFC Mentor Connect pairs fertility patients with peer mentors who have personally been through the fertility treatment journey. Your mentor is here to listen, share their experience, and support you through every phase — from your first consultation through early pregnancy and beyond. All accounts are created and managed by your care team at Rejuvenating Fertility Center. Your conversations are private and secure.")
                        .font(.footnote)
                        .foregroundColor(Color(hex: "444444"))
                        .multilineTextAlignment(.leading)
                        .fixedSize(horizontal: false, vertical: true)
                        .padding(20)
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .background(Color.white)
                        .cornerRadius(16)
                        .padding(.horizontal, 16)

                    VStack(spacing: 12) {
                        Link(destination: URL(string: "https://www.rejuvenatingfertility.com")!) {
                            HStack {
                                Image(systemName: "safari")
                                Text("Visit Our Website").font(.headline)
                            }
                            .frame(maxWidth: .infinity)
                            .frame(height: 50)
                            .background(Color(hex: "1B4332"))
                            .foregroundColor(.white)
                            .cornerRadius(12)
                        }

                        Link(destination: URL(string: "https://www.rejuvenatingfertility.com/contact-us")!) {
                            HStack {
                                Image(systemName: "envelope")
                                Text("Contact Support").font(.headline)
                            }
                            .frame(maxWidth: .infinity)
                            .frame(height: 50)
                            .background(Color(hex: "B8860B"))
                            .foregroundColor(.white)
                            .cornerRadius(12)
                        }
                    }
                    .padding(.horizontal, 16)

                    Spacer(minLength: 24)
                }
            }
        }
        .navigationTitle("About")
        .navigationBarTitleDisplayMode(.inline)
    }
}
