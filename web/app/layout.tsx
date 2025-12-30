import "./globals.css";
import "./styles/pixel-borders.scss";
import "@hackernoon/pixel-icon-library/fonts/iconfont.css";
import { Silkscreen } from "next/font/google";
import { AuthProvider } from "./context/auth-context";
import { EditModeProvider } from "./context/edit-mode-context";
import { ProfileProvider } from "./context/profile-context";
import { AnimatedCursor } from "./components/shared/animated-cursor";

const silkscreen = Silkscreen({
  subsets: ["latin"],
  weight: ["400"],
});

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={silkscreen.className}>
        <AuthProvider>
          <ProfileProvider>
            <EditModeProvider>
              {children}
            </EditModeProvider>
          </ProfileProvider>
        </AuthProvider>
        <AnimatedCursor />
      </body>
    </html>
  );
}
