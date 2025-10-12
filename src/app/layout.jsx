import Script from "next/script";
import "./globals.css";

export const metadata = {
  title: "Calibração Expresso - Oster + Moedor Manual",
  description: "Guia interativo para calibrar seu café expresso.",
};

export default function RootLayout({children}) {
  return (
    <html lang="pt-BR">
      <head>
        <Script src="https://cdn.tailwindcss.com" />
        <Script id="tailwind-config">
          {`
            // Configuração customizada do TailwindCSS para adicionar cores
            tailwind.config = {
              darkMode: "class",
              important: true,
              theme: {
                extend: {
                  colors: {
                    "brown-700": "#7B3F00",
                    "yellow-700": "#B98A17",
                    "orange-600": "#FF8C00",
                  },
                },
              },
            };
          `}
        </Script>
      </head>
      <body className="bg-gray-50 text-gray-800 dark:bg-gray-900 dark:text-gray-200 transition-colors duration-300">
        {children}
      </body>
    </html>
  );
}
