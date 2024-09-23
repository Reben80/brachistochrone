import React from 'react'
import { Button } from "@/components/ui/button"

interface AboutMeModalProps {
  onClose: () => void
}

const AboutMeModal: React.FC<AboutMeModalProps> = ({ onClose }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg max-w-sm w-full shadow-xl relative">
        <Button 
          onClick={onClose} 
          className="absolute top-2 right-2 p-1" 
          variant="ghost"
          aria-label="Close"
        >
          X
        </Button>
        <h2 className="text-2xl font-bold mb-4 text-blue-600">About the Creator</h2>
        <div className="space-y-2">
          <p className="text-lg">
            Email: <a href="mailto:Reben80@gmail.com" className="text-blue-500 hover:underline">Reben80@gmail.com</a>
          </p>
          <p className="text-lg">
            Twitter: <a href="https://twitter.com/rebin3" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">@rebin3</a>
          </p>
        </div>
      </div>
    </div>
  )
}

export default AboutMeModal
