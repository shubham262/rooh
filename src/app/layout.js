import { Manrope } from "next/font/google";
import "./globals.css";
import AntdProvider from "@/layouts/AntdProvider";

// AntdProvider's theme asks for Manrope, so it has to actually be loaded.
const manrope = Manrope({
	variable: "--font-manrope",
	subsets: ["latin"],
	display: "swap",
});

export const metadata = {
	title: "rooh — Experience Intelligence",
	description:
		"Turn experience sources into structured, review-ready rooh content.",
};

export default function RootLayout({ children }) {
	return (
		<html lang="en" className={manrope.variable}>
			<body>
				<AntdProvider>{children}</AntdProvider>
			</body>
		</html>
	);
}
