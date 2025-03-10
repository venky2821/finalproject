"use client"

import type React from "react"
import { useNavigate } from "react-router-dom"
import StockAlerts from "../components/StockAlerts"
import { ArrowLeft } from "lucide-react"

const AlertsPage: React.FC = () => {
  const navigate = useNavigate()

  return (
    <div className="container mx-auto p-4">
      <button onClick={() => navigate("/home")} className="mb-4 flex items-center text-blue-600 hover:text-blue-800">
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Dashboard
      </button>
      <h1 className="text-2xl font-bold mb-4">Stock Alerts</h1>
      <StockAlerts inventory={[]} /> {/* Pass the actual inventory data here */}
    </div>
  )
}

export default AlertsPage

