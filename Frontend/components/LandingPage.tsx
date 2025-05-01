import type React from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";

const LandingPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-r from-brand-pink via-brand-blue to-brand-pink flex flex-col justify-center items-center text-white px-4 relative overflow-hidden">
      {/* Background Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />

      {/* Content Container */}
      <div className="relative z-10 flex flex-col items-center text-center space-y-8">
        
        {/* Logo and Title Block */}
        <div className="flex flex-col items-center space-y-6 animate-fade-in-up">
          <div className="backdrop-blur-xl bg-white/10 p-6 rounded-3xl shadow-xl transform hover:scale-105 transition duration-500">
            <img
              src="/valpo-icon.svg"
              alt="Valpo Velvet Icon"
              className="w-32 md:w-40 object-contain animate-bounce-slow"
            />
          </div>
          {/* <img
            src="/valpo-text.svg"
            alt="Valpo Velvet"
            className="h-16 md:h-20 object-contain"
          /> */}
        </div>

        {/* Main Heading */}
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight drop-shadow-md">
          Merchandise Inventory Manager
        </h1>

        {/* Subtext */}
        <p className="text-lg sm:text-xl max-w-2xl text-white/90 leading-relaxed">
          Real-time updates, stock alerts, batch tracking, supplier integration,<br />
          and powerful analytics — all in one place.
        </p>

        {/* CTA Button */}
        <div>
          <Link
            to="/login"
            className="group inline-flex items-center gap-3 bg-white/10 backdrop-blur-lg px-8 py-4 rounded-full font-semibold text-lg text-white border border-white/20 shadow-lg hover:shadow-2xl hover:bg-white/20 transition-all duration-300"
          >
            Login to Dashboard
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform duration-300" />
          </Link>
        </div>
      </div>
    </div>
  );
};

export default LandingPage;
