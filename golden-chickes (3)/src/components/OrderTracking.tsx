import React, { useState } from 'react';
import { db } from '../firebase';
import { collection, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { translations } from '../lib/translations';
import { Order } from '../types';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Search, Calendar, MapPin, Egg, Banknote, Clock, Bell, Package } from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';

export default function OrderTracking() {
  const [searchQuery, setSearchQuery] = useState('');
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setLoading(true);
    setSearched(true);
    try {
      const ordersRef = collection(db, 'orders');
      let q = query(ordersRef, where('customerNumber', '==', searchQuery));
      let querySnapshot = await getDocs(q);
      
      let results: Order[] = [];
      querySnapshot.forEach((doc) => {
        results.push({ id: doc.id, ...doc.data() } as Order);
      });

      if (results.length === 0) {
        try {
          const docRef = query(ordersRef, where('__name__', '==', searchQuery));
          const docSnap = await getDocs(docRef);
          docSnap.forEach((doc) => {
            results.push({ id: doc.id, ...doc.data() } as Order);
          });
        } catch (e) {}
      }

      setOrders(results);
      if (results.length === 0) {
        toast.error(translations.noOrderFound);
      }
    } catch (error) {
      console.error("Search error:", error);
      toast.error("অনুসন্ধান করতে সমস্যা হয়েছে");
    } finally {
      setLoading(false);
    }
  };

  const getDaysRemaining = (hatchDate: any) => {
    const date = hatchDate instanceof Timestamp ? hatchDate.toDate() : new Date(hatchDate);
    const diff = differenceInDays(date, new Date());
    return diff > 0 ? diff : 0;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending': return <Badge variant="outline" className="border-primary/50 text-primary">{translations.pending}</Badge>;
      case 'hatching': return <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/50">{translations.hatching}</Badge>;
      case 'completed': return <Badge className="bg-green-500/20 text-green-400 border-green-500/50">{translations.completed}</Badge>;
      case 'cancelled': return <Badge variant="destructive" className="bg-red-500/20 text-red-400 border-red-500/50">{translations.cancelled}</Badge>;
      default: return <Badge>{status}</Badge>;
    }
  };

  const Logo = () => (
    <div className="relative w-20 h-20 md:w-24 md:h-24 overflow-hidden rounded-full border-4 border-primary/20 shadow-2xl mx-auto bg-white chicken-float">
      <img 
        src="https://i.ibb.co.com/hxvz2hrz/e512-uqqs-210723.jpg" 
        alt="Golden Chickes Logo" 
        className="w-full h-full object-cover mix-blend-multiply"
        referrerPolicy="no-referrer"
      />
    </div>
  );

  return (
    <div className="max-w-3xl mx-auto space-y-10">
      <div className="text-center space-y-6">
        <Logo />
        <div className="space-y-2">
          <h2 className="text-4xl md:text-5xl font-heading font-bold text-foreground leading-tight">{translations.trackYourOrder}</h2>
          <p className="text-muted-foreground text-lg">{translations.enterOrderNumber}</p>
        </div>
      </div>

      <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3 glass-panel p-2">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-primary" />
          <Input 
            className="pl-12 border-none focus-visible:ring-0 h-14 bg-transparent text-lg"
            placeholder="মোবাইল নম্বর বা অর্ডার আইডি"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Button type="submit" disabled={loading} className="btn-gold h-14 px-10 text-lg w-full sm:w-auto">
          {loading ? <div className="animate-spin h-6 w-6 border-3 border-white border-t-transparent rounded-full" /> : translations.search}
        </Button>
      </form>

      <AnimatePresence mode="wait">
        {orders.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            {orders.map((order) => (
              <Card key={order.id} className="elegant-card overflow-hidden">
                <CardHeader className="border-b border-primary/10 bg-primary/5">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                      <CardTitle className="text-2xl font-heading font-bold text-foreground">{order.customerName}</CardTitle>
                      <p className="text-xs text-muted-foreground font-mono mt-1">ID: {order.id}</p>
                    </div>
                    {getStatusBadge(order.status)}
                  </div>
                </CardHeader>
                <CardContent className="pt-6 space-y-8">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-full bg-primary/10 text-primary">
                          <Egg className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">{translations.totalEggs}</p>
                          <p className="text-xl font-bold">{order.totalEggs} টি</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-full bg-destructive/10 text-destructive">
                          <Banknote className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">{translations.dueAmount}</p>
                          <p className="text-xl font-bold text-destructive">৳{order.dueAmount}</p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-full bg-primary/10 text-primary">
                          <Calendar className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">{translations.orderDate}</p>
                          <p className="font-medium">{format(order.orderDate instanceof Timestamp ? order.orderDate.toDate() : new Date(order.orderDate), 'dd MMMM, yyyy')}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-full bg-primary/10 text-primary">
                          <Bell className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">{translations.hatchDate}</p>
                          <p className="font-medium text-primary">{format(order.hatchDate instanceof Timestamp ? order.hatchDate.toDate() : new Date(order.hatchDate), 'dd MMMM, yyyy')}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="pt-8 border-t border-primary/10">
                    {getDaysRemaining(order.hatchDate) > 0 ? (
                      <div className="space-y-4">
                        <div className="flex justify-between items-end">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 text-primary">
                              <Clock className="w-5 h-5 animate-pulse" />
                              <span className="text-sm font-bold uppercase tracking-widest">{translations.daysRemaining}</span>
                            </div>
                            <p className="text-4xl font-bold text-primary">{getDaysRemaining(order.hatchDate)} দিন</p>
                          </div>
                          <div className="text-right text-sm text-muted-foreground">
                            {Math.round((1 - getDaysRemaining(order.hatchDate) / (order.hatchDuration || 21)) * 100)}% সম্পন্ন
                          </div>
                        </div>
                        <div className="w-full bg-secondary rounded-full h-3 overflow-hidden">
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${Math.max(0, Math.min(100, (1 - getDaysRemaining(order.hatchDate) / (order.hatchDuration || 21)) * 100))}%` }}
                            className="bg-primary h-full shadow-sm"
                          />
                        </div>
                      </div>
                    ) : (
                      order.status === 'hatching' && (
                        <motion.div 
                          initial={{ scale: 0.95, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          className="bg-primary/10 border border-primary/30 p-6 rounded-2xl text-center space-y-4"
                        >
                          <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mx-auto">
                            <Bell className="w-8 h-8 text-primary animate-bounce" />
                          </div>
                          <div className="space-y-2">
                            <h4 className="text-2xl font-bold text-primary">{translations.hatchComplete}</h4>
                            <p className="text-muted-foreground">আপনার বাচ্চাগুলো সংগ্রহ করার জন্য প্রস্তুত। অনুগ্রহ করে আমাদের সাথে যোগাযোগ করুন।</p>
                          </div>
                        </motion.div>
                      )
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </motion.div>
        )}

        {searched && orders.length === 0 && !loading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-12 elegant-card border-destructive/20 bg-destructive/5"
          >
            <Package className="w-12 h-12 text-destructive/20 mx-auto mb-4" />
            <p className="text-destructive font-heading font-bold uppercase tracking-widest">{translations.noOrderFound}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
