"use client"

import type React from "react"
import { useNavigate } from "react-router-dom"
import BatchTracking from "../components/BatchTracking"
import { ArrowLeft } from "lucide-react"

const BatchesPage: React.FC = () => {
  const navigate = useNavigate()

  return (
    <div className="container mx-auto p-4">
      <button onClick={() => navigate("/home")} className="mb-4 flex items-center text-blue-600 hover:text-blue-800">
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Dashboard
      </button>
      <h1 className="text-2xl font-bold mb-4">Batch Tracking</h1>
      <BatchTracking inventory={[]} /> {/* Pass the actual inventory data here */}
    </div>
  )
}

export default BatchesPage

