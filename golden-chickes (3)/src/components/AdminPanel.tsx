import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { 
  collection, 
  addDoc, 
  onSnapshot, 
  query, 
  orderBy, 
  Timestamp, 
  updateDoc, 
  doc,
  deleteDoc
} from 'firebase/firestore';
import { translations } from '../lib/translations';
import { Order, OrderStatus } from '../types';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Plus, Trash2, Edit, CheckCircle, Clock, AlertCircle, Settings2 } from 'lucide-react';
import { format, addDays } from 'date-fns';
import { toast } from 'sonner';
import { motion } from 'motion/react';

export default function AdminPanel() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  
  // Emergency Notification state
  const [emergencyData, setEmergencyData] = useState({
    phoneNumber: '',
    message: 'আসসালামু আলাইকুম, গোল্ডেন চিকস থেকে বলছি। আপনার ডিম ফুটে বাচ্চা বের হয়েছে। অনুগ্রহ করে আপনার বাচ্চাগুলো সংগ্রহ করুন। ধন্যবাদ।'
  });
  const [sendingEmergency, setSendingEmergency] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    customerName: '',
    customerNumber: '',
    totalEggs: '',
    address: '',
    totalPrice: '',
    dueAmount: '',
    hatchDuration: '21',
    status: 'pending' as OrderStatus
  });

  // Auto-calculate price when eggs change
  useEffect(() => {
    const eggs = Number(formData.totalEggs);
    if (eggs > 0) {
      const calculatedPrice = eggs * 15;
      setFormData(prev => ({
        ...prev,
        totalPrice: String(calculatedPrice),
        dueAmount: String(calculatedPrice) // Default due to total price
      }));
    }
  }, [formData.totalEggs]);

  useEffect(() => {
    const q = query(collection(db, 'orders'), orderBy('orderDate', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const ordersData: Order[] = [];
      snapshot.forEach((doc) => {
        ordersData.push({ id: doc.id, ...doc.data() } as Order);
      });
      setOrders(ordersData);
      setLoading(false);
    }, (error) => {
      console.error("Firestore error:", error);
      toast.error("ডাটা লোড করতে সমস্যা হয়েছে");
    });

    return () => unsubscribe();
  }, []);

  const handleAddOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const orderDate = new Date();
      const duration = Number(formData.hatchDuration) || 21;
      const hatchDate = addDays(orderDate, duration);

      const newOrder = {
        customerName: formData.customerName,
        customerNumber: formData.customerNumber,
        totalEggs: Number(formData.totalEggs),
        address: formData.address,
        totalPrice: Number(formData.totalPrice),
        dueAmount: Number(formData.dueAmount),
        hatchDuration: duration,
        orderDate: Timestamp.fromDate(orderDate),
        hatchDate: Timestamp.fromDate(hatchDate),
        status: formData.status,
        uid: 'admin-created'
      };

      await addDoc(collection(db, 'orders'), newOrder);
      toast.success("অর্ডার সফলভাবে যোগ করা হয়েছে");
      setIsAddOpen(false);
      resetForm();
    } catch (error) {
      console.error("Add order error:", error);
      toast.error("অর্ডার যোগ করতে ব্যর্থ হয়েছে");
    }
  };

  const handleUpdateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingOrder?.id) return;

    try {
      const duration = Number(formData.hatchDuration) || 21;
      const orderDate = editingOrder.orderDate instanceof Timestamp ? editingOrder.orderDate.toDate() : new Date(editingOrder.orderDate);
      const hatchDate = addDays(orderDate, duration);

      await updateDoc(doc(db, 'orders', editingOrder.id), {
        customerName: formData.customerName,
        customerNumber: formData.customerNumber,
        totalEggs: Number(formData.totalEggs),
        address: formData.address,
        totalPrice: Number(formData.totalPrice),
        dueAmount: Number(formData.dueAmount),
        hatchDuration: duration,
        hatchDate: Timestamp.fromDate(hatchDate),
        status: formData.status
      });

      toast.success("অর্ডার আপডেট করা হয়েছে");
      setEditingOrder(null);
      resetForm();
    } catch (error) {
      console.error("Update error:", error);
      toast.error("আপডেট করতে ব্যর্থ হয়েছে");
    }
  };

  const resetForm = () => {
    setFormData({
      customerName: '',
      customerNumber: '',
      totalEggs: '',
      address: '',
      totalPrice: '',
      dueAmount: '',
      hatchDuration: '21',
      status: 'pending'
    });
  };

  const openEdit = (order: Order) => {
    setEditingOrder(order);
    setFormData({
      customerName: order.customerName,
      customerNumber: order.customerNumber,
      totalEggs: String(order.totalEggs),
      address: order.address,
      totalPrice: String(order.totalPrice),
      dueAmount: String(order.dueAmount),
      hatchDuration: String(order.hatchDuration || 21),
      status: order.status
    });
  };

  const updateStatus = async (id: string, newStatus: OrderStatus) => {
    try {
      await updateDoc(doc(db, 'orders', id), { status: newStatus });
      toast.success("অবস্থা আপডেট করা হয়েছে");
    } catch (error) {
      toast.error("আপডেট করতে ব্যর্থ হয়েছে");
    }
  };

  const deleteOrder = async (id: string) => {
    if (!confirm("আপনি কি নিশ্চিতভাবে এই অর্ডারটি মুছে ফেলতে চান?")) return;
    try {
      await deleteDoc(doc(db, 'orders', id));
      toast.success("অর্ডার মুছে ফেলা হয়েছে");
    } catch (error) {
      toast.error("মুছে ফেলতে ব্যর্থ হয়েছে");
    }
  };

  const handleSendEmergency = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emergencyData.phoneNumber) {
      toast.error("ফোন নাম্বার দিন");
      return;
    }
    setSendingEmergency(true);
    try {
      const response = await fetch('/api/send-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(emergencyData)
      });
      const data = await response.json();
      if (data.success) {
        toast.success("মেসেজ এবং কল পাঠানো হয়েছে");
      } else {
        toast.error("পাঠাতে ব্যর্থ হয়েছে");
      }
    } catch (error) {
      console.error("Emergency send error:", error);
      toast.error("সার্ভার ত্রুটি");
    } finally {
      setSendingEmergency(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending': return <Badge variant="outline" className="border-primary/30 text-primary bg-primary/5">{translations.pending}</Badge>;
      case 'hatching': return <Badge className="bg-blue-50 text-blue-600 border-blue-200">{translations.hatching}</Badge>;
      case 'completed': return <Badge className="bg-green-50 text-green-600 border-green-200">{translations.completed}</Badge>;
      case 'cancelled': return <Badge variant="destructive" className="bg-red-50 text-red-600 border-red-200">{translations.cancelled}</Badge>;
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

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 glass-panel p-6">
        <div className="flex items-center gap-4">
          <Logo />
          <h2 className="text-3xl font-heading font-bold text-foreground">{translations.adminPanel}</h2>
        </div>
        <Dialog open={isAddOpen} onOpenChange={(open) => { setIsAddOpen(open); if(!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button className="btn-gold w-full sm:w-auto h-12 px-8 text-lg">
              <Plus className="w-5 h-5 mr-2" />
              {translations.addOrder}
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px] border-primary/20 bg-white rounded-3xl overflow-hidden p-0">
            <div className="bg-primary/5 p-6 border-b border-primary/10">
              <DialogHeader>
                <DialogTitle className="text-foreground font-heading text-3xl flex items-center gap-3">
                  <Logo />
                  {translations.addOrder}
                </DialogTitle>
              </DialogHeader>
            </div>
            <form onSubmit={handleAddOrder} className="p-6 sm:p-8 space-y-6 max-h-[80vh] overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="grid gap-2">
                  <Label className="text-sm font-bold text-foreground/70">{translations.customerName}</Label>
                  <Input className="h-12 border-primary/20 focus:border-primary rounded-xl text-base" placeholder="নাম লিখুন" required value={formData.customerName} onChange={e => setFormData({...formData, customerName: e.target.value})} />
                </div>
                <div className="grid gap-2">
                  <Label className="text-sm font-bold text-foreground/70">{translations.customerNumber}</Label>
                  <Input className="h-12 border-primary/20 focus:border-primary rounded-xl text-base" placeholder="017XXXXXXXX" type="tel" required value={formData.customerNumber} onChange={e => setFormData({...formData, customerNumber: e.target.value})} />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="grid gap-2">
                  <Label className="text-sm font-bold text-foreground/70">{translations.totalEggs} (প্রতিটি ১৫ টাকা)</Label>
                  <Input className="h-12 border-primary/20 focus:border-primary rounded-xl text-base" type="number" placeholder="ডিমের সংখ্যা" required value={formData.totalEggs} onChange={e => setFormData({...formData, totalEggs: e.target.value})} />
                </div>
                <div className="grid gap-2">
                  <Label className="text-sm font-bold text-foreground/70">{translations.hatchDuration} (দিন)</Label>
                  <Input className="h-12 border-primary/20 focus:border-primary rounded-xl text-base" type="number" required value={formData.hatchDuration} onChange={e => setFormData({...formData, hatchDuration: e.target.value})} />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="grid gap-2">
                  <Label className="text-sm font-bold text-foreground/70">{translations.totalTaka} (অটোমেটিক)</Label>
                  <Input className="h-12 border-primary/10 bg-primary/5 rounded-xl text-base font-bold text-primary" type="number" readOnly value={formData.totalPrice} />
                </div>
                <div className="grid gap-2">
                  <Label className="text-sm font-bold text-foreground/70">{translations.dueAmount} (বাকি টাকা)</Label>
                  <Input className="h-12 border-primary/20 focus:border-primary rounded-xl text-base" type="number" required value={formData.dueAmount} onChange={e => setFormData({...formData, dueAmount: e.target.value})} />
                </div>
              </div>
              <div className="grid gap-2">
                <Label className="text-sm font-bold text-foreground/70">{translations.address}</Label>
                <Input className="h-12 border-primary/20 focus:border-primary rounded-xl text-base" placeholder="ঠিকানা লিখুন" required value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} />
              </div>
              <Button type="submit" className="w-full btn-gold h-14 text-lg rounded-2xl shadow-xl">অর্ডার সেভ করুন</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Dialog open={!!editingOrder} onOpenChange={(open) => { if(!open) { setEditingOrder(null); resetForm(); } }}>
        <DialogContent className="sm:max-w-[500px] border-primary/20 bg-white">
          <DialogHeader>
            <DialogTitle className="text-foreground font-heading text-2xl">{translations.editOrder}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdateOrder} className="space-y-4 py-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label className="text-sm font-medium">{translations.customerName}</Label>
                <Input className="border-primary/20 focus:border-primary" required value={formData.customerName} onChange={e => setFormData({...formData, customerName: e.target.value})} />
              </div>
              <div className="grid gap-2">
                <Label className="text-sm font-medium">{translations.customerNumber}</Label>
                <Input className="border-primary/20 focus:border-primary" required value={formData.customerNumber} onChange={e => setFormData({...formData, customerNumber: e.target.value})} />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label className="text-sm font-medium">{translations.totalEggs}</Label>
                <Input className="border-primary/20 focus:border-primary" type="number" required value={formData.totalEggs} onChange={e => setFormData({...formData, totalEggs: e.target.value})} />
              </div>
              <div className="grid gap-2">
                <Label className="text-sm font-medium">{translations.hatchDuration} (দিন)</Label>
                <Input className="border-primary/20 focus:border-primary" type="number" required value={formData.hatchDuration} onChange={e => setFormData({...formData, hatchDuration: e.target.value})} />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label className="text-sm font-medium">{translations.totalTaka}</Label>
                <Input className="border-primary/20 focus:border-primary" type="number" required value={formData.totalPrice} onChange={e => setFormData({...formData, totalPrice: e.target.value})} />
              </div>
              <div className="grid gap-2">
                <Label className="text-sm font-medium">{translations.dueAmount}</Label>
                <Input className="border-primary/20 focus:border-primary" type="number" required value={formData.dueAmount} onChange={e => setFormData({...formData, dueAmount: e.target.value})} />
              </div>
            </div>
            <div className="grid gap-2">
              <Label className="text-sm font-medium">{translations.address}</Label>
              <Input className="border-primary/20 focus:border-primary" required value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} />
            </div>
            <div className="grid gap-2">
              <Label className="text-sm font-medium">{translations.status}</Label>
              <select 
                className="flex h-10 w-full rounded-md border border-primary/20 bg-white px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={formData.status}
                onChange={e => setFormData({...formData, status: e.target.value as OrderStatus})}
              >
                <option value="pending">{translations.pending}</option>
                <option value="hatching">{translations.hatching}</option>
                <option value="completed">{translations.completed}</option>
                <option value="cancelled">{translations.cancelled}</option>
              </select>
            </div>
            <Button type="submit" className="w-full btn-gold">{translations.update}</Button>
          </form>
        </DialogContent>
      </Dialog>

      <Card className="elegant-card border-none bg-transparent shadow-none">
        <CardContent className="p-0">
          {/* Desktop Table View */}
          <div className="hidden sm:block overflow-x-auto elegant-card">
            <Table>
              <TableHeader className="bg-primary/5">
                <TableRow className="border-primary/10">
                  <TableHead className="text-foreground font-bold">{translations.customerName}</TableHead>
                  <TableHead className="text-foreground font-bold hidden md:table-cell">{translations.totalEggs}</TableHead>
                  <TableHead className="text-foreground font-bold hidden lg:table-cell">{translations.dueAmount}</TableHead>
                  <TableHead className="text-foreground font-bold">{translations.hatchDate}</TableHead>
                  <TableHead className="text-foreground font-bold">{translations.status}</TableHead>
                  <TableHead className="text-right text-foreground font-bold">{translations.actions}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12">
                      <div className="flex justify-center items-center gap-2">
                        <div className="animate-spin h-5 w-5 border-2 border-primary border-t-transparent rounded-full" />
                        লোড হচ্ছে...
                      </div>
                    </TableCell>
                  </TableRow>
                ) : orders.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">কোন অর্ডার নেই</TableCell>
                  </TableRow>
                ) : (
                  orders.map((order) => (
                    <TableRow key={order.id} className="border-primary/5 hover:bg-primary/5 transition-colors">
                      <TableCell>
                        <div className="font-medium text-foreground">{order.customerName}</div>
                        <div className="text-xs text-muted-foreground font-mono">{order.customerNumber}</div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">{order.totalEggs}</TableCell>
                      <TableCell className="hidden lg:table-cell text-destructive font-medium">৳{order.dueAmount}</TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {format(order.hatchDate instanceof Timestamp ? order.hatchDate.toDate() : new Date(order.hatchDate), 'dd/MM/yyyy')}
                        </div>
                        <div className="text-[10px] text-muted-foreground">({order.hatchDuration || 21} দিন)</div>
                      </TableCell>
                      <TableCell>{getStatusBadge(order.status)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button size="icon" variant="ghost" onClick={() => openEdit(order)} className="text-primary hover:bg-primary/10">
                            <Edit className="w-4 h-4" />
                          </Button>
                          {order.status === 'pending' && (
                            <Button size="icon" variant="ghost" onClick={() => updateStatus(order.id!, 'hatching')} className="text-blue-500 hover:bg-blue-50">
                              <Clock className="w-4 h-4" />
                            </Button>
                          )}
                          {order.status === 'hatching' && (
                            <Button size="icon" variant="ghost" onClick={() => updateStatus(order.id!, 'completed')} className="text-green-500 hover:bg-green-50">
                              <CheckCircle className="w-4 h-4" />
                            </Button>
                          )}
                          <Button size="icon" variant="ghost" onClick={() => deleteOrder(order.id!)} className="text-destructive hover:bg-destructive/10">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Mobile Card View */}
          <div className="sm:hidden space-y-6">
            {loading ? (
              <div className="text-center py-20">
                <div className="animate-spin h-10 w-10 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
                <p className="font-heading text-primary font-bold">লোড হচ্ছে...</p>
              </div>
            ) : orders.length === 0 ? (
              <div className="text-center py-20 text-muted-foreground elegant-card bg-white/50">কোন অর্ডার নেই</div>
            ) : (
              orders.map((order) => (
                <motion.div
                  key={order.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                >
                  <Card className="elegant-card overflow-hidden border-none">
                    <div className="bg-primary/5 p-5 border-b border-primary/10 flex justify-between items-center">
                      <div className="space-y-1">
                        <p className="text-[10px] font-bold text-primary/60 uppercase tracking-widest">#{order.id?.slice(-6).toUpperCase()}</p>
                        <h4 className="font-heading font-bold text-foreground">{order.customerName}</h4>
                      </div>
                      {getStatusBadge(order.status)}
                    </div>
                    <CardContent className="p-6 space-y-6">
                      <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-1">
                          <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">{translations.customerNumber}</p>
                          <p className="text-sm font-bold">{order.customerNumber}</p>
                        </div>
                        <div className="space-y-1 text-right">
                          <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">{translations.totalEggs}</p>
                          <p className="text-sm font-bold">{order.totalEggs} টি</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-6 pt-4 border-t border-primary/5">
                        <div className="space-y-1">
                          <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">{translations.dueAmount}</p>
                          <p className="text-sm font-bold text-destructive">৳{order.dueAmount}</p>
                        </div>
                        <div className="space-y-1 text-right">
                          <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">{translations.hatchDate}</p>
                          <p className="text-sm font-bold text-primary">{order.hatchDate instanceof Timestamp ? format(order.hatchDate.toDate(), 'dd/MM/yy') : 'N/A'}</p>
                        </div>
                      </div>
                      <div className="flex flex-col gap-3 pt-4">
                        <div className="flex gap-3">
                          <Button variant="outline" size="sm" className="flex-1 h-11 rounded-xl border-primary/20 hover:bg-primary/5 text-primary font-bold" onClick={() => openEdit(order)}>
                            <Edit className="w-4 h-4 mr-2" />
                            {translations.edit}
                          </Button>
                          <Button variant="destructive" size="sm" className="flex-1 h-11 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 border-none font-bold" onClick={() => deleteOrder(order.id!)}>
                            <Trash2 className="w-4 h-4 mr-2" />
                            মুছুন
                          </Button>
                        </div>
                        {order.status === 'pending' && (
                          <Button size="sm" className="w-full h-11 rounded-xl btn-gold" onClick={() => updateStatus(order.id!, 'hatching')}>
                            <Clock className="w-4 h-4 mr-2" /> শুরু করুন
                          </Button>
                        )}
                        {order.status === 'hatching' && (
                          <Button size="sm" className="w-full h-11 rounded-xl bg-green-600 hover:bg-green-700 text-white font-bold" onClick={() => updateStatus(order.id!, 'completed')}>
                            <CheckCircle className="w-4 h-4 mr-2" /> সম্পন্ন করুন
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Emergency Notification Section */}
      <Card className="elegant-card mt-12 overflow-hidden border-none shadow-2xl shadow-red-100">
        <div className="bg-red-50 p-6 border-b border-red-100 flex items-center gap-3">
          <div className="bg-red-100 p-2 rounded-lg">
            <AlertCircle className="text-red-600 w-6 h-6" />
          </div>
          <div>
            <h3 className="text-xl font-heading font-bold text-red-900">Emergency Notification</h3>
            <p className="text-xs text-red-600 font-medium">ম্যানুয়ালি কল এবং SMS পাঠানোর জন্য এটি ব্যবহার করুন</p>
          </div>
        </div>
        <CardContent className="p-8">
          <form onSubmit={handleSendEmergency} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="grid gap-2">
                <Label className="text-sm font-bold text-foreground/70">Phone Number (ফোন নাম্বার)</Label>
                <Input 
                  className="h-12 border-red-100 focus:border-red-400 focus:ring-red-100 rounded-xl" 
                  placeholder="017XXXXXXXX" 
                  required 
                  value={emergencyData.phoneNumber} 
                  onChange={e => setEmergencyData({...emergencyData, phoneNumber: e.target.value})} 
                />
              </div>
              <div className="grid gap-2">
                <Label className="text-sm font-bold text-foreground/70">Message (মেসেজ)</Label>
                <Input 
                  className="h-12 border-red-100 focus:border-red-400 focus:ring-red-100 rounded-xl" 
                  required 
                  value={emergencyData.message} 
                  onChange={e => setEmergencyData({...emergencyData, message: e.target.value})} 
                />
              </div>
            </div>
            <Button 
              type="submit" 
              disabled={sendingEmergency} 
              className="w-full bg-red-600 hover:bg-red-700 text-white h-14 text-lg rounded-xl shadow-lg shadow-red-200 transition-all active:scale-[0.98] font-bold"
            >
              {sendingEmergency ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full" />
                  পাঠানো হচ্ছে...
                </div>
              ) : "Send Manual Call & SMS (কল এবং SMS পাঠান)"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
