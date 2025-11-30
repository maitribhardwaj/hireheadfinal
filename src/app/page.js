'use client';

import { useRouter } from 'next/navigation';
import { auth, provider } from '../config/firebase';
import { signInWithPopup } from "firebase/auth";
import { useEffect } from 'react';

export default function LandingPage() {
  const router = useRouter();

  const getUserRouteName = (user) => {
    if (user?.displayName) {
      return user.displayName.toLowerCase().replace(/\s+/g, '-');
    }
    if (user?.email) {
      return user.email.split('@')[0].toLowerCase();
    }
    return 'user';
  };

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        const routeName = getUserRouteName(user);
        router.push(`/${routeName}`);
      }
    });
    return unsubscribe;
  }, [router]);

  const handleGoogleLogin = async () => {
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      const routeName = getUserRouteName(user);
      router.push(`/${routeName}`);
    } catch (error) {
      console.error('Google Login Error:', error);
    }
  };

  return (
    <main className="min-h-screen w-full flex flex-col md:flex-row items-stretch justify-center overflow-hidden bg-gradient-to-br from-[#f0fcff] via-[#e6f9fb] to-[#d9f4f7]
">
      {/* LEFT PANEL */}
      <div className="w-full md:w-1/2 flex items-center justify-center p-10">
        <img
          src="https://i.pinimg.com/1200x/84/b8/00/84b800e1b804715b82f3878d10021073.jpg"
          alt="AI Illustration"
          className="w-full max-w-[700px] h-full object-cover rounded-3xl shadow-[0_25px_50px_rgba(0,0,0,0.15)] animate-float border-[4px] border-white/50"
        />
      </div>

      {/* RIGHT PANEL (Glass Card) */}
      <div className="w-full md:w-1/2 flex items-center justify-center p-10">
        <div className="w-full max-w-lg h-full bg-white/20 backdrop-blur-xl shadow-[0_20px_60px_rgba(0,0,0,0.25)] border-4 border-white rounded-3xl p-12 flex flex-col justify-between animate-slideUp">
          <h1 className="text-5xl font-extrabold text-center bg-gray-800 bg-clip-text text-transparent mb-5 tracking-tight animate-gradientText">
            HIREHEAD.AI
          </h1>
          <p className="text-center text-gray-900 text-lg mb-8">
            Your AI-powered recruitment partner!
          </p>
          <div className="bg-white text-gray-800 text-sm mb-10 space-y-3 p-6 rounded-xl shadow-lg">
            <p className="pl-3 border-l-2 border-[#00acc1] flex items-center gap-2">
              <span className="text-[#00bcd4] animate-pulse">•</span> AI-powered candidate screening with precision
            </p>
            <p className="pl-3 border-l-2 border-[#00acc1] flex items-center gap-2">
              <span className="text-[#00bcd4] animate-pulse">•</span> ATS-focused resume insights and optimization
            </p>
            <p className="pl-3 border-l-2 border-[#00acc1] flex items-center gap-2">
              <span className="text-[#00bcd4] animate-pulse">•</span> Data-backed performance and hiring analytics
            </p>
            <p className="pl-3 border-l-2 border-[#00acc1] flex items-center gap-2">
              <span className="text-[#00bcd4] animate-pulse">•</span> Smarter hiring decisions with intelligent automation
            </p>
          </div>
          <button
            onClick={handleGoogleLogin}
            className="w-full flex items-center justify-center gap-3 py-3 px-6 rounded-full bg-white hover:bg-[#00bcd4] text-gray-800 shadow-md hover:shadow-xl transition-all duration-300 transform hover:bg-gray-800 hover:text-white"
          >
            <img
              src="https://developers.google.com/identity/images/g-logo.png"
              width={20}
              height={20}
              alt="Google"
            />
            <span className="font-medium">Continue with Google</span>
          </button>
        </div>
      </div>

      {/* Animations */}
      <style jsx>{`
        @keyframes float {
          0% { transform: translateY(0px); }
          50% { transform: translateY(-15px); }
          100% { transform: translateY(0px); }
        }
        .animate-float { animation: float 3s ease-in-out infinite; }

        @keyframes slideUp {
          0% { opacity: 0; transform: translateY(40px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        .animate-slideUp { animation: slideUp 0.6s ease-out; }

        @keyframes gradientText {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        .animate-gradientText { background-size: 200% 200%; animation: gradientText 4s ease infinite; }
      `}</style>
    </main>
  );
}
