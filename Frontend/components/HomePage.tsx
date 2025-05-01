"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Package, LogOut, Calendar, X, Bell, Truck, Layers, ShoppingCart, MessageSquare, Camera, BarChart2 } from "lucide-react"
import { useNavigate, Link } from "react-router-dom"
import { useUser } from "../hooks/useUser"
import CustomerPage from "./CustomerPage"

import InventoryList from "./InventoryList"
import StockAlerts from "./StockAlerts"
import BatchTracking from "./BatchTracking"
import SupplierIntegration from "./SupplierIntegration"
import Analytics from "./Analytics"

interface Photo {
  id: number;
  url: string;
  category: string;
  approved: number;
}

interface ReportType {
  id: string;
  name: string;
  endpoint: string;
}

const reportTypes: ReportType[] = [
  { id: 'stock-turnover', name: 'Stock Turnover', endpoint: 'reports/stock-turnover' },
  { id: 'profit-analysis', name: 'Profit Analysis', endpoint: 'reports/profit-analysis' },
  { id: 'batch-aging', name: 'Batch Aging Report', endpoint: 'reports/batch-aging' },
  { id: 'top-selling-products', name: 'Top Selling Products', endpoint: 'reports/top-selling-products' }
];

const HomePage: React.FC = () => {
  const { user } = useUser()
  const [inventory, setInventory] = useState([])
  const [photosToApprove, setPhotosToApprove] = useState<Photo[]>([])
  const [showDateRangeModal, setShowDateRangeModal] = useState(false)
  const [dateRange, setDateRange] = useState({
    startDate: "",
    endDate: ""
  })
  const [selectedReport, setSelectedReport] = useState<string>('');
  const navigate = useNavigate()

  // Format date for display in input fields
  const formatDateForInput = (dateString: string) => {
    if (!dateString) return "";
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return "";
      return date.toISOString().split('T')[0];
    } catch (error) {
      return "";
    }
  };

  // Format date for API request
  const formatDateForApi = (dateString: string) => {
    if (!dateString) return "";
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return "";
      return date.toISOString().split('T')[0];
    } catch (error) {
      return "";
    }
  };

  const fetchProducts = async () => {
    try {
      const response = await fetch("http://localhost:8000/products")
      const data = await response.json()
      setInventory(data)
    } catch (error) {
      console.error("Error fetching products:", error)
    }
  }

  useEffect(() => {
    fetchProducts()
    const interval = setInterval(fetchProducts, 5000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    const fetchPhotosToApprove = async () => {
      try {
        const response = await fetch('http://localhost:8000/photos/all')
        const data = await response.json()
        setPhotosToApprove(data.filter((photo: Photo) => photo.approved === 0))
      } catch (error) {
        console.error('Error fetching photos for approval:', error)
      }
    }

    fetchPhotosToApprove()
  }, [])

  const handleLogout = () => {
    navigate("/")
  }

  const handleApprovePhoto = async (photoId: number) => {
    try {
      const response = await fetch(`http://localhost:8000/photos/${photoId}/approve`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem("token")}`,
          'Content-Type': 'application/json'
        }
      });
      if (response.ok) {
        alert('Photo approved successfully!');
        const updatedPhotos = photosToApprove.filter(photo => photo.id !== photoId);
        setPhotosToApprove(updatedPhotos);
      } else {
        alert('Failed to approve photo.');
      }
    } catch (error) {
      console.error('Error approving photo:', error)
    }
  };

  const handleRejectPhoto = async (photoId: number) => {
    try {
      const response = await fetch(`http://localhost:8000/photos/${photoId}/reject`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem("token")}`
        }
      });
      if (response.ok) {
        alert('Photo rejected successfully!');
        const updatedPhotos = photosToApprove.filter(photo => photo.id !== photoId);
        setPhotosToApprove(updatedPhotos);
      } else {
        alert('Failed to reject photo.');
      }
    } catch (error) {
      console.error('Error rejecting photo:', error)
    }
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>, field: 'startDate' | 'endDate') => {
    const value = e.target.value;
    console.log(`Setting ${field} to:`, value); // Debug log
    setDateRange(prev => {
      const newState = {
        ...prev,
        [field]: value
      };
      console.log('New date range state:', newState); // Debug log
      return newState;
    });
  };

  const handleExport = (type: 'csv' | 'pdf') => {
    if (!selectedReport) {
      alert('Please select a report type');
      return;
    }

    const reportType = reportTypes.find(r => r.id === selectedReport);
    if (!reportType) {
      alert('Invalid report type');
      return;
    }

    const baseUrl = "http://localhost:8000";
    const url = `${baseUrl}/${reportType.endpoint}/export/${type}`;
    const queryParams = new URLSearchParams();
    
    console.log('Exporting with date range:', dateRange);
    
    if (dateRange.startDate) {
      queryParams.append('start_date', formatDateForApi(dateRange.startDate));
    }
    if (dateRange.endDate) {
      queryParams.append('end_date', formatDateForApi(dateRange.endDate));
    }

    const finalUrl = `${url}?${queryParams.toString()}`;
    console.log('Final URL:', finalUrl);
    window.open(finalUrl, "_blank");
    setShowDateRangeModal(false);
    setSelectedReport(''); // Reset selection
  };

  if (user?.role_id === 1) {
    return (
      <div className="min-h-screen bg-gray-50/80">
        <nav className="bg-gradient-to-r from-brand-pink to-brand-blue text-white p-4 shadow-lg sticky top-0 z-50 backdrop-blur-sm bg-opacity-90">
          <div className="container mx-auto flex justify-between items-center">
            <div className="flex items-center space-x-6">
              <div className="flex items-center gap-4">
                <div className="relative w-12 sm:w-14 md:w-16 aspect-square">
                  <img
                    src="/valpo-icon.svg"
                    alt="Valpo Velvet Icon"
                    className="w-full h-full object-contain hover:scale-105 transition-transform"
                  />
                </div>
                <div className="h-8 sm:h-10 md:h-12 relative">
                  <img
                    src="/valpo-text.svg"
                    alt="Valpo Velvet"
                    className="h-full w-auto object-contain opacity-90 hover:opacity-100 transition-opacity"
                  />
                </div>
              </div>
              <div className="h-8 w-px bg-white/20 hidden md:block"></div>
              <h1 className="text-xl md:text-2xl font-bold hidden md:block text-white/90">
                Merchandise Inventory Manager
              </h1>
            </div>
            <div className="flex items-center gap-4">
              <div className="relative">
                <button
                  onClick={() => setShowDateRangeModal(true)}
                  className="bg-white/10 backdrop-blur-sm text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-white/20 transition-colors border border-white/20"
                >
                  <Calendar className="w-5 h-5" />
                  Export Reports
                </button>
                {showDateRangeModal && (
                  <div className="absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-xl p-6 z-10 border border-brand-blue/10">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-lg font-semibold text-gray-800">Export Report</h3>
                      <button
                        onClick={() => {
                          setShowDateRangeModal(false);
                          setDateRange({ startDate: "", endDate: "" });
                          setSelectedReport('');
                        }}
                        className="text-gray-500 hover:text-gray-700"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Report Type</label>
                        <select
                          value={selectedReport}
                          onChange={(e) => setSelectedReport(e.target.value)}
                          className="w-full bg-white border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-brand-blue focus:border-transparent"
                        >
                          <option value="">Select a report type</option>
                          {reportTypes.map((report) => (
                            <option key={report.id} value={report.id}>
                              {report.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                        <input
                          type="date"
                          value={dateRange.startDate}
                          onChange={(e) => handleDateChange(e, 'startDate')}
                          className="w-full bg-white border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-brand-blue focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                        <input
                          type="date"
                          value={dateRange.endDate}
                          onChange={(e) => handleDateChange(e, 'endDate')}
                          className="w-full bg-white border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-brand-blue focus:border-transparent"
                        />
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleExport('csv')}
                          className="flex-1 bg-brand-green text-white px-4 py-2 rounded-lg hover:bg-opacity-90 transition-colors"
                        >
                          Export CSV
                        </button>
                        <button
                          onClick={() => handleExport('pdf')}
                          className="flex-1 bg-brand-orange text-white px-4 py-2 rounded-lg hover:bg-opacity-90 transition-colors"
                        >
                          Export PDF
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              <button 
                onClick={handleLogout} 
                className="bg-white/10 backdrop-blur-sm hover:bg-white/20 border border-white/20 px-4 py-2 rounded-lg flex items-center transition-colors"
              >
                <LogOut className="w-5 h-5 mr-2" />
                Logout
              </button>
            </div>
          </div>
        </nav>

        <main className="container mx-auto p-6 space-y-8">
          {/* Dashboard Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="bg-white shadow-md hover:shadow-xl rounded-lg p-6 transition-all duration-200 border-l-4 border-brand-blue">
              <div className="flex items-center gap-3 mb-4">
                <Package className="w-5 h-5 text-brand-blue" />
                <h2 className="text-lg font-semibold text-gray-800">Inventory Management</h2>
              </div>
              <InventoryList inventory={inventory} refreshInventory={fetchProducts} />
            </div>

            <Link to="/alerts" className="group bg-white shadow-md hover:shadow-xl rounded-lg p-6 transition-all duration-200 border-l-4 border-brand-pink">
              <div className="flex items-center gap-3 mb-4">
                <Bell className="w-5 h-5 text-brand-pink" />
                <h2 className="text-lg font-semibold text-gray-800 group-hover:text-brand-pink transition-colors">Stock Alerts</h2>
              </div>
              <StockAlerts inventory={inventory} />
            </Link>

            <div className="bg-white shadow-md hover:shadow-xl rounded-lg p-6 transition-all duration-200 border-l-4 border-brand-yellow overflow-visible">
              <div className="flex items-center gap-3 mb-4">
                <Truck className="w-5 h-5 text-brand-yellow" />
                <h2 className="text-lg font-semibold text-gray-800">Supplier Integration</h2>
              </div>
              <SupplierIntegration inventory={inventory} fetchInventory={fetchProducts} />
            </div>

            <Link to="/batches" className="group bg-white shadow-md hover:shadow-xl rounded-lg p-6 transition-all duration-200 border-l-4 border-brand-green">
              <div className="flex items-center gap-3">
                <Layers className="w-5 h-5 text-brand-green" />
                <h2 className="text-lg font-semibold group-hover:text-brand-green transition-colors">Batch Tracking</h2>
              </div>
            </Link>

            <Link to="/approve-purchases" className="group bg-white shadow-md hover:shadow-xl rounded-lg p-6 transition-all duration-200 border-l-4 border-brand-orange">
              <div className="flex items-center gap-3">
                <ShoppingCart className="w-5 h-5 text-brand-orange" />
                <h2 className="text-lg font-semibold group-hover:text-brand-orange transition-colors">Manage Orders</h2>
              </div>
            </Link>

            <Link to="/approve-customer-reviews" className="group bg-white shadow-md hover:shadow-xl rounded-lg p-6 transition-all duration-200 border-l-4 border-brand-blue">
              <div className="flex items-center gap-3">
                <MessageSquare className="w-5 h-5 text-brand-blue" />
                <h2 className="text-lg font-semibold group-hover:text-brand-blue transition-colors">Customer Reviews</h2>
              </div>
            </Link>
          </div>

          {/* Analytics Section */}
          <div className="bg-white shadow-md hover:shadow-xl rounded-lg p-6 transition-all duration-200 border-l-4 border-brand-pink">
            <div className="flex items-center gap-3 mb-4">
              <BarChart2 className="w-5 h-5 text-brand-pink" />
              <h2 className="text-lg font-semibold text-gray-800">Analytics Overview</h2>
            </div>
            <Analytics inventory={inventory} />
          </div>

          {/* Photos Section */}
          <div className="bg-white rounded-lg shadow-md hover:shadow-xl transition-all duration-200">
            <div className="p-6 border-b">
              <div className="flex items-center gap-3">
                <Camera className="w-5 h-5 text-brand-blue" />
                <h2 className="text-lg font-semibold text-gray-800">Photos Pending Approval</h2>
              </div>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {photosToApprove.map(photo => (
                  <div key={photo.id} className="bg-gray-50 rounded-lg overflow-hidden shadow-md hover:shadow-xl transition-all duration-200">
                    <img src={photo.url} alt="Uploaded" className="w-full h-48 object-cover" />
                    <div className="p-4">
                      <p className="text-gray-600 mb-4">Category: {photo.category}</p>
                      <div className="flex justify-between gap-4">
                        <button 
                          onClick={() => handleApprovePhoto(photo.id)} 
                          className="bg-brand-green text-white px-4 py-2 rounded-lg flex-1 hover:bg-opacity-90 transition-colors"
                        >
                          Approve
                        </button>
                        <button 
                          onClick={() => handleRejectPhoto(photo.id)} 
                          className="bg-brand-pink text-white px-4 py-2 rounded-lg flex-1 hover:bg-opacity-90 transition-colors"
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  } else if (user?.role_id === 2) {
    return <CustomerPage />;
  }

  return <div>Please log in.</div>;
};

export default HomePage;
