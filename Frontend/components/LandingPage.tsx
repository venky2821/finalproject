import type React from "react";
import { Link } from "react-router-dom";

const LandingPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 flex flex-col justify-center items-center text-white px-4">
      
      {/* Glass background for the logo */}
      <div className="backdrop-blur-md bg-white/10 px-6 py-3 rounded-xl shadow-xl mb-6">
        <img
          src="/valpo-logo.png"
          alt="Valpo Velvet Logo"
          className="h-12 sm:h-14 md:h-16 object-contain"
        />
      </div>

      {/* Main Heading */}
      <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-center mb-4 leading-tight tracking-tight drop-shadow-lg animate-slideUp">
        Merchandise Inventory Manager
      </h1>

      {/* Subtext */}
      <p className="text-lg sm:text-xl text-center max-w-2xl text-white/90 mb-10 animate-fadeIn delay-200">
        Real-time updates, stock alerts, batch tracking, supplier integration,<br />
        and powerful analytics — all in one place.
      </p>

      {/* CTA Button */}
      <Link
        to="/login"
        className="bg-white text-blue-600 px-8 py-3 rounded-full font-semibold text-lg hover:bg-blue-100 transition duration-300 shadow-md hover:shadow-xl animate-bounceOnce"
      >
        Login to Dashboard
      </Link>
    </div>
  );
};

export default LandingPage;
