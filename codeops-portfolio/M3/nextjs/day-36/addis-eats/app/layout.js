import Link from "next/link";
import "./globals.css";

export const metadata = {
  title: "Addis Eats",
  description: "A simple Addis Eats restaurant ordering app built with Next.js."
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <header className="border-b bg-white">
          <nav className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
            <Link href="/" className="text-2xl font-bold text-orange-700">
              Addis Eats
            </Link>

            <div className="flex gap-5 text-sm font-medium">
              <Link href="/" className="hover:text-orange-700">Home</Link>
              <Link href="/menu" className="hover:text-orange-700">Menu</Link>
              <Link href="/cart" className="hover:text-orange-700">Cart</Link>
              <Link href="/checkout" className="hover:text-orange-700">Checkout</Link>
            </div>
          </nav>
        </header>

        {children}

        <footer className="mt-16 border-t bg-white py-6 text-center text-sm text-gray-500">
          Addis Eats · Day 36 Next.js Mini-Project
        </footer>
      </body>
    </html>
  );
}