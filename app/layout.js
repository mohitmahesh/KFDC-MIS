import './globals.css'

export const metadata = {
  title: 'KFDC iFMS - Integrated Forestry Management System',
  description: 'Karnataka Forest Development Corporation - Stump to Sale Management Platform',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-background antialiased">
        {children}
      </body>
    </html>
  )
}
