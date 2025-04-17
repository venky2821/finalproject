import type React from "react"
import InventoryItem from "./InventoryItem"
import { List, Plus } from "lucide-react";
import { useState, useEffect } from "react";

interface InventoryItemType {
  id: number
  name: string
  category: string
  stock_level: number
  reorder_threshold: number
  batchInfo: string
  supplier: string
  image_url: string
}

interface InventoryListProps {
  inventory: InventoryItemType[]
  refreshInventory: () => void;
}

const InventoryList: React.FC<InventoryListProps> = ({ inventory, refreshInventory }) => {
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    category: "",
    stock_level: 0,
    reserved_stock: 0,
    reorder_threshold: 0,
    cost_price: 0,
    price: 0,
    supplier_id: "",
    image_url: "",
  });

  // const [selectedFile, setSelectedFile] = useState<File | null>(null);
  // const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);


  const [suppliers, setSuppliers] = useState([]);

  useEffect(() => {
    const fetchSuppliers = async () => {
      const response = await fetch("http://localhost:8000/suppliers");
      if (response.ok) {
        const data = await response.json();
        setSuppliers(data);
      }
    };
    fetchSuppliers();
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setSelectedFiles(files);
    const urls = files.map(file => URL.createObjectURL(file));
    setPreviewUrls(urls);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const uploadImages = async (productId: number) => {
    const formData = new FormData();
    selectedFiles.forEach(file => formData.append("files", file));
    await fetch(`http://localhost:8000/products/${productId}/upload-images`, {
      method: "POST",
      body: formData
    });
  };

  const handleSubmit = async () => {
    try {
      // Step 1: Set the first image as the main image_url
      let uploadedImageUrl = "";
      if (selectedFiles.length > 0) {
        const firstImageFormData = new FormData();
        firstImageFormData.append("uploaded_file", selectedFiles[0]);

        const firstUploadResponse = await fetch("http://localhost:8000/products/upload-image", {
          method: "POST",
          body: firstImageFormData,
        });

        if (!firstUploadResponse.ok) {
          throw new Error("Main image upload failed");
        }

        const firstUploadData = await firstUploadResponse.json();
        uploadedImageUrl = firstUploadData.image_url;
      }

      // Step 2: Create the product using the first image URL
      const productResponse = await fetch("http://localhost:8000/products/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...formData, image_url: uploadedImageUrl }),
      });

      if (!productResponse.ok) {
        throw new Error("Failed to add product");
      }

      const createdProduct = await productResponse.json();
      const productId = createdProduct.product.id;

      // Step 3: Upload remaining additional images
      if (selectedFiles.length > 1) {
        const additionalFormData = new FormData();
        selectedFiles.slice(1).forEach(file => additionalFormData.append("files", file));

        const additionalUpload = await fetch(`http://localhost:8000/products/${productId}/upload-images`, {
          method: "POST",
          body: additionalFormData,
        });

        if (!additionalUpload.ok) {
          throw new Error("Additional images upload failed");
        }
      }

      refreshInventory();
      setShowModal(false);
      setFormData({
        name: "",
        category: "",
        stock_level: 0,
        reserved_stock: 0,
        reorder_threshold: 0,
        cost_price: 0,
        price: 0,
        supplier_id: "",
        image_url: "",
      });
      setSelectedFiles([]);
      setPreviewUrls([]);
    } catch (error) {
      console.error("Error:", error);
    }
  };


  return (
    // <div className="bg-white shadow-md rounded-lg p-6">
    <div className="bg-white shadow-md rounded-lg p-6 h-[340px] flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <List className="w-6 h-6 text-blue-500 mr-2" />
          <h2 className="text-xl font-semibold">Inventory List</h2>
        </div>
        <button
          className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 flex items-center transition-colors"
          onClick={() => setShowModal(true)}
        >
          <Plus className="w-4 h-4 mr-1" /> Add Product
        </button>
      </div>

      {/* <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2"> */}
      <div className="space-y-3 overflow-y-auto pr-2 flex-1">
        {inventory.map((item) => (
          <InventoryItem key={item.id} item={item} />
        ))}
      </div>

      {/* Modal for Adding Product */}
      {showModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-gray-900 bg-opacity-50">
          <div className="bg-white p-6 rounded-lg shadow-lg w-96">
            <h2 className="text-lg font-semibold mb-4">Add New Product</h2>
            <div className="space-y-3">
              <input
                type="text"
                name="name"
                placeholder="Product Name"
                className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                onChange={handleInputChange}
              />
              <input
                type="text"
                name="category"
                placeholder="Category"
                className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                onChange={handleInputChange}
              />
              <input
                type="number"
                name="stock_level"
                placeholder="Stock Level"
                className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                onChange={handleInputChange}
              />
              <input
                type="number"
                name="price"
                placeholder="Price"
                className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                onChange={handleInputChange}
              />
              <input
                type="number"
                name="cost_price"
                placeholder="Cost Price"
                className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                onChange={handleInputChange}
              />
              <input
                type="number"
                name="reorder_threshold"
                placeholder="Reorder Threshold"
                className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                onChange={handleInputChange}
              />
              <select
                name="supplier_id"
                className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                onChange={handleInputChange}
              >
                <option value="">Select a Supplier</option>
                {suppliers.map((supplier) => (
                  <option key={supplier.id} value={supplier.id}>
                    {supplier.name}
                  </option>
                ))}
              </select>
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  name="image_url"
                  placeholder="No file selected"
                  className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  // value={selectedFile ? selectedFile.name : ""}
                  value={selectedFiles.map(file => file.name).join(", ")}
                  readOnly
                />
                <button
                  onClick={() => document.getElementById("imageUpload")?.click()}
                  className="bg-blue-500 text-white px-3 py-2 rounded hover:bg-blue-600 transition-colors"
                >
                  Attach
                </button>
                <input
                  type="file"
                  id="imageUpload"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={handleFileSelect}
                />
              </div>

              {/* Image Preview */}
              {/* {previewUrl && (
                <div className="mt-2">
                  <img src={previewUrl} alt="Preview" className="w-24 h-24 object-cover rounded" />
                </div>
              )} */}
              {previewUrls.length > 0 && (
                <div className="grid grid-cols-3 gap-2 mt-2">
                  {previewUrls.map((url, idx) => (
                    <img key={idx} src={url} alt="Preview" className="w-24 h-24 object-cover rounded" />
                  ))}
                </div>
              )}

            </div>
            <div className="flex justify-end mt-6 space-x-3">
              <button
                className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400 transition-colors"
                onClick={() => setShowModal(false)}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                onClick={handleSubmit}
              >
                Submit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default InventoryList

