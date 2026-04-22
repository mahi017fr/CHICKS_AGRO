/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as React from 'react';
import { useState, useEffect, Component, ErrorInfo, ReactNode } from 'react';
import { auth, db } from './firebase';
import { 
  onAuthStateChanged, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut,
  User
} from 'firebase/auth';
import { 
  doc, 
  getDoc, 
  setDoc, 
  collection, 
  onSnapshot, 
  query, 
  where,
  getDocFromServer
} from 'firebase/firestore';
import { translations } from './lib/translations';
import { UserProfile } from './types';
import { Button } from '@/components/ui/button';
import { Toaster } from '@/components/ui/sonner';
import { toast } from 'sonner';
import AdminPanel from './components/AdminPanel';
import CustomerPanel from './components/CustomerPanel';
import OrderTracking from './components/OrderTracking';
import { LogIn, LogOut, ShieldCheck, User as UserIcon, Search } from 'lucide-react';

// Simple wrapper instead of ErrorBoundary for now
const ErrorBoundary = ({ children }: { children: React.ReactNode }) => {
  return <>{children}</>;
};

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'tracking' | 'panel'>('tracking');
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        try {
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          if (userDoc.exists()) {
            const profileData = userDoc.data() as UserProfile;
            setProfile(profileData);
            // If user is admin, they still need to enter password to see admin panel
            if (profileData.role !== 'admin') {
              setIsAdminAuthenticated(false);
            }
          } else {
            // Create default profile for new users
            const isDefaultAdmin = firebaseUser.email === "mahimahi2009ma@gmail.com";
            const newProfile: UserProfile = {
              uid: firebaseUser.uid,
              name: firebaseUser.displayName || "User",
              email: firebaseUser.email || undefined,
              role: isDefaultAdmin ? 'admin' : 'customer'
            };
            await setDoc(doc(db, 'users', firebaseUser.uid), newProfile);
            setProfile(newProfile);
          }
        } catch (error) {
          console.error("Error fetching profile:", error);
          toast.error("প্রোফাইল লোড করতে সমস্যা হয়েছে");
        }
      } else {
        setProfile(null);
        setIsAdminAuthenticated(false);
      }
      setLoading(false);
    });

    // Test Firestore connection
    const testConnection = async () => {
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
      } catch (error: any) {
        if (error.message?.includes('the client is offline')) {
          console.error("Firebase configuration might be incorrect or client is offline.");
        }
      }
    };
    testConnection();

    return () => unsubscribe();
  }, []);

  const handleAdminAccess = () => {
    if (profile?.role === 'admin' && !isAdminAuthenticated) {
      const password = prompt("অ্যাডমিন পাসওয়ার্ড দিন:");
      if (password === "9502") {
        setIsAdminAuthenticated(true);
        setView('panel');
        toast.success("অ্যাডমিন লগইন সফল");
      } else {
        toast.error("ভুল পাসওয়ার্ড!");
      }
    } else {
      setView(view === 'tracking' ? 'panel' : 'tracking');
    }
  };

  const handleLogin = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      toast.success("লগইন সফল হয়েছে");
    } catch (error) {
      console.error("Login error:", error);
      toast.error("লগইন ব্যর্থ হয়েছে");
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setIsAdminAuthenticated(false);
      setView('tracking');
      toast.success("লগআউট সফল হয়েছে");
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const Logo = () => (
    <div className="relative w-12 h-12 md:w-14 md:h-14 overflow-hidden rounded-full border-2 border-primary/20 shadow-xl bg-white chicken-float">
      <img 
        src="https://i.ibb.co.com/hxvz2hrz/e512-uqqs-210723.jpg" 
        alt="Golden Chickes Logo" 
        className="w-full h-full object-cover mix-blend-multiply"
        referrerPolicy="no-referrer"
      />
    </div>
  );

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background">
        <div className="relative w-24 h-24">
          <div className="absolute inset-0 border-4 border-primary/20 rounded-full"></div>
          <div className="absolute inset-0 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <Logo />
          </div>
        </div>
        <p className="mt-6 font-heading text-xl font-bold text-primary tracking-widest animate-pulse">লোড হচ্ছে...</p>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-background font-sans">
        <header className="sticky top-0 z-50 w-full border-b border-primary/10 bg-white/80 backdrop-blur-md">
          <div className="container mx-auto px-4 h-20 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Logo />
              <h1 className="text-2xl md:text-3xl font-heading font-bold text-foreground">
                GOLDEN <span className="text-primary italic">CHICKES</span>
              </h1>
            </div>

            <div className="flex items-center gap-2">
              {user ? (
                <div className="flex items-center gap-2 md:gap-3">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="hidden sm:flex items-center gap-2 hover:bg-primary/5 text-foreground font-bold"
                    onClick={handleAdminAccess}
                  >
                    {view === 'tracking' ? (
                      profile?.role === 'admin' ? <ShieldCheck className="w-4 h-4" /> : <UserIcon className="w-4 h-4" />
                    ) : (
                      <Search className="w-4 h-4" />
                    )}
                    {view === 'tracking' ? (profile?.role === 'admin' ? translations.adminPanel : translations.customerPanel) : translations.orderTracking}
                  </Button>
                  
                  {/* Mobile Toggle View Button */}
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="sm:hidden text-primary"
                    onClick={handleAdminAccess}
                  >
                    {view === 'tracking' ? <ShieldCheck className="w-5 h-5" /> : <Search className="w-5 h-5" />}
                  </Button>

                  <Button variant="outline" size="sm" onClick={handleLogout} className="flex items-center gap-2 border-primary/20 hover:bg-primary/5 text-primary font-bold">
                    <LogOut className="w-4 h-4" />
                    <span className="hidden md:inline">{translations.logout}</span>
                  </Button>
                </div>
              ) : (
                <Button onClick={handleLogin} className="btn-gold px-6">
                  <LogIn className="w-4 h-4 mr-2" />
                  {translations.login}
                </Button>
              )}
            </div>
          </div>
        </header>

        <main className="container mx-auto px-4 py-10">
          {!user || view === 'tracking' ? (
            <OrderTracking />
          ) : (
            profile?.role === 'admin' ? (
              isAdminAuthenticated ? <AdminPanel /> : <div className="text-center py-20"><Button onClick={handleAdminAccess} className="btn-gold">অ্যাডমিন প্যানেল আনলক করুন</Button></div>
            ) : <CustomerPanel uid={user.uid} />
          )}
        </main>

        <footer className="border-t border-primary/10 py-10 mt-12 bg-white">
          <div className="container mx-auto px-4 text-center space-y-4">
            <div className="flex items-center justify-center gap-2">
              <ShieldCheck className="w-5 h-5 text-primary" />
              <h3 className="font-heading font-bold text-xl text-foreground">
                GOLDEN <span className="text-primary italic">CHICKES</span>
              </h3>
            </div>
            <p className="text-muted-foreground text-sm max-w-md mx-auto">
              আমরা উন্নত প্রযুক্তির মাধ্যমে আপনার ডিম থেকে সুস্থ বাচ্চা ফুটিয়ে দিতে প্রতিশ্রুতিবদ্ধ।
            </p>
            <div className="pt-4 border-t border-primary/5 text-muted-foreground text-xs">
              &copy; {new Date().getFullYear()} {translations.appName}. সর্বস্বত্ব সংরক্ষিত।
            </div>
          </div>
        </footer>
        <Toaster position="top-center" />
      </div>
    </ErrorBoundary>
  );
}
