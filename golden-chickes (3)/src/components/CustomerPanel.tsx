import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, query, where, onSnapshot, orderBy, Timestamp } from 'firebase/firestore';
import { translations } from '../lib/translations';
import { Order } from '../types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Egg, Banknote, Calendar, Clock, Bell, Package } from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { motion, AnimatePresence } from 'motion/react';

interface CustomerPanelProps {
  uid: string;
}

export default function CustomerPanel({ uid }: CustomerPanelProps) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(
      collection(db, 'orders'), 
      where('uid', '==', uid),
      orderBy('orderDate', 'desc')
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const ordersData: Order[] = [];
      snapshot.forEach((doc) => {
        ordersData.push({ id: doc.id, ...doc.data() } as Order);
      });
      setOrders(ordersData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [uid]);

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
    <div className="relative w-10 h-10 overflow-hidden rounded-full border border-primary/20 shadow-md bg-white chicken-float">
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
      <div className="flex flex-col items-center justify-center py-20 animate-pulse">
        <Logo />
        <p className="mt-4 font-heading text-primary font-bold">অর্ডারগুলো লোড হচ্ছে...</p>
      </div>
    );
  }

  return (
    <div className="space-y-10 max-w-5xl mx-auto">
      <div className="flex items-center gap-4 glass-panel p-6">
        <Logo />
        <h2 className="text-3xl md:text-4xl font-heading font-bold text-foreground">{translations.customerPanel}</h2>
      </div>
      
      <AnimatePresence mode="wait">
        {orders.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-20 elegant-card bg-white/50"
          >
            <div className="mb-6 opacity-20">
              <Logo />
            </div>
            <p className="text-2xl font-heading font-bold text-muted-foreground">আপনার কোন অর্ডার পাওয়া যায়নি</p>
          </motion.div>
        ) : (
          <motion.div 
            className="grid grid-cols-1 lg:grid-cols-2 gap-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            {orders.map((order, index) => {
              const daysLeft = getDaysRemaining(order.hatchDate);
              const totalDays = order.hatchDuration || 21;
              const progress = Math.max(0, Math.min(100, (1 - daysLeft / totalDays) * 100));

              return (
                <motion.div
                  key={order.id}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1, duration: 0.5 }}
                >
                  <Card className="elegant-card overflow-hidden h-full flex flex-col border-none">
                    <div className="bg-primary/5 p-6 border-b border-primary/10 flex justify-between items-start gap-4">
                      <div className="space-y-1">
                        <p className="text-[10px] font-bold text-primary/60 uppercase tracking-[0.2em]">অর্ডার আইডি: #{order.id?.slice(-6).toUpperCase()}</p>
                        <CardTitle className="text-2xl font-heading font-bold text-foreground">
                          {format(order.orderDate instanceof Timestamp ? order.orderDate.toDate() : new Date(order.orderDate), 'dd MMMM, yyyy')}
                        </CardTitle>
                      </div>
                      {getStatusBadge(order.status)}
                    </div>
                    <CardContent className="p-8 space-y-8 flex-1">
                      <div className="grid grid-cols-2 gap-8">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Package className="w-4 h-4 text-primary" />
                            <span className="text-xs font-bold uppercase tracking-wider">{translations.totalEggs}</span>
                          </div>
                          <p className="text-2xl font-bold">{order.totalEggs} টি</p>
                        </div>
                        <div className="space-y-2 text-right">
                          <div className="flex items-center gap-2 text-muted-foreground justify-end">
                            <Banknote className="w-4 h-4 text-primary" />
                            <span className="text-xs font-bold uppercase tracking-wider">{translations.dueAmount}</span>
                          </div>
                          <p className="text-2xl font-bold text-destructive">৳{order.dueAmount}</p>
                        </div>
                      </div>

                      <div className="space-y-6 pt-6 border-t border-primary/5">
                        <div className="flex justify-between items-end">
                          <div className="space-y-2">
                            <div className="flex items-center gap-2 text-primary">
                              <Clock className="w-5 h-5" />
                              <span className="text-xs font-bold uppercase tracking-wider">{translations.daysRemaining}</span>
                            </div>
                            <p className="text-4xl font-heading font-bold text-primary">{daysLeft} দিন</p>
                          </div>
                          <div className="text-right space-y-1">
                            <p className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">{translations.hatchDate}</p>
                            <p className="text-lg font-bold text-foreground/80">{format(order.hatchDate instanceof Timestamp ? order.hatchDate.toDate() : new Date(order.hatchDate), 'dd/MM/yy')}</p>
                          </div>
                        </div>
                        
                        <div className="space-y-3">
                          <div className="flex justify-between text-xs font-bold text-foreground/60">
                            <span>প্রগতি</span>
                            <span>{Math.round(progress)}%</span>
                          </div>
                          <div className="w-full bg-primary/10 rounded-full h-4 overflow-hidden border border-primary/5 p-0.5">
                            <motion.div 
                              initial={{ width: 0 }}
                              animate={{ width: `${progress}%` }}
                              transition={{ duration: 1.5, ease: "easeOut" }}
                              className="gold-gradient h-full rounded-full shadow-[0_0_10px_rgba(184,134,11,0.3)]"
                            />
                          </div>
                        </div>
                      </div>

                      {daysLeft === 0 && order.status === 'hatching' && (
                        <motion.div 
                          initial={{ scale: 0.95, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          className="bg-primary/10 border border-primary/20 p-6 rounded-2xl flex items-center gap-5"
                        >
                          <div className="w-14 h-14 bg-primary/20 rounded-full flex items-center justify-center shrink-0">
                            <Bell className="w-7 h-7 text-primary animate-bounce" />
                          </div>
                          <div className="space-y-1">
                            <p className="text-lg font-bold text-primary">{translations.hatchComplete}</p>
                            <p className="text-sm text-foreground/70">{translations.collectChicks}</p>
                          </div>
                        </motion.div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
