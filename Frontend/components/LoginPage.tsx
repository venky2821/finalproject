"use client"

import React, { useState } from "react"
import { useNavigate, Link } from "react-router-dom"
import { User, Lock } from "lucide-react"
import axios from "axios"

const LoginPage: React.FC = () => {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const navigate = useNavigate()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const response = await axios.post(
        "http://localhost:8000/token",
        new URLSearchParams({
          username: email,
          password: password,
        }),
        {
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
        }
      )
      // alert("Login successful!")
      localStorage.setItem("token", response.data.access_token);
      navigate("/home")
    } catch (error) {
      alert("Invalid credentials. Please try again.")
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-r from-blue-400 to-purple-500 flex justify-center items-center">
      <div className="bg-white p-8 rounded-lg shadow-md w-96">
        <div className="flex justify-center mb-6">
          <User className="w-16 h-16 text-blue-500" />
        </div>
        <h2 className="text-2xl font-bold mb-6 text-center text-gray-800">Login</h2>
        <form onSubmit={handleLogin}>
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="email">
              Email
            </label>
            <div className="flex items-center border rounded-md">
              <User className="w-5 h-5 text-gray-400 mx-3" />
              <input
                className="appearance-none border-none w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none"
                id="email"
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>
          <div className="mb-6">
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="password">
              Password
            </label>
            <div className="flex items-center border rounded-md">
              <Lock className="w-5 h-5 text-gray-400 mx-3" />
              <input
                className="appearance-none border-none w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none"
                id="password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>
          <div className="flex items-center justify-between">
            <button
              className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
              type="submit"
            >
              Login
            </button>
          </div>
        </form>
        <div className="mt-4 text-center">
          <Link to="/change-password" className="text-sm text-blue-500 hover:underline">
            Forgot Password?
          </Link>
          <span className="mx-2">|</span>
          <Link to="/register" className="text-sm text-blue-500 hover:underline">
            Register New User
          </Link>
        </div>
      </div>
    </div>
  )
}

export default LoginPage
