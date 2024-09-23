import React from 'react'

interface LayoutProps {
  children: React.ReactNode
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <div className="min-h-screen bg-white">
      <main className="container mx-auto px-4 py-8">
        {children}
      </main>
    </div>
  )
}

export default Layout
