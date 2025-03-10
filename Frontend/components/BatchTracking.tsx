import type React from "react"
import { Layers } from "lucide-react"

interface InventoryItemType {
  id: number
  name: string
  batchInfo: string
}

interface BatchTrackingProps {
  inventory: InventoryItemType[]
}

const BatchTracking: React.FC<BatchTrackingProps> = ({ inventory }) => {
  const uniqueBatches = new Set(inventory.map((item) => item.batchInfo))

  return (
    <div className="bg-white rounded-lg p-4">
      <div className="flex items-center mb-4">
        <Layers className="w-6 h-6 text-purple-500 mr-2" />
        <h2 className="text-xl font-semibold">Batch Tracking</h2>
      </div>
      <p>{uniqueBatches.size} active batches</p>
    </div>
  )
}

export default BatchTracking

