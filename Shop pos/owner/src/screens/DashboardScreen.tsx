import React, { useState, useMemo } from 'react';
import {
  TrendingUp,
  DollarSign,
  Package,
  AlertTriangle,
  Calendar,
  ChevronDown,
  ArrowRight,
  ShoppingBag,
  Wallet,
  Receipt,
  Store,
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
  ExternalLink,
} from 'lucide-react';
import { usePos } from '../context/PosContext';
import { ProductThumb } from '../components/ProductThumb';

export const DashboardScreen: React.FC = () => {
  const {
    sales,
    products,
    storeInfo,
    currentUser,
    setActiveScreen,
    setSelectedSaleForReceipt,
    refreshAllData,
  } = usePos();

  const [dateFilter, setDateFilter] = useState<'Today' | 'Yesterday' | 'Last 7 Days' | 'Last 30 Days' | 'This Month' | 'All Time'>('Today');
  const [dateDropdownOpen, setDateDropdownOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [hoveredBarIndex, setHoveredBarIndex] = useState<number | null>(null);

  // Manual refresh handler
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      if (refreshAllData) {
        await refreshAllData();
      }
    } finally {
      setTimeout(() => setIsRefreshing(false), 500);
    }
  };

  // Dynamic greeting based on time of day
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return 'Good Morning';
    if (hour >= 12 && hour < 17) return 'Good Afternoon';
    if (hour >= 17 && hour < 21) return 'Good Evening';
    return 'Good Night';
  }, []);

  // Filter completed sales only
  const allCompletedSales = useMemo(() => {
    return sales.filter((s) => s.status === 'completed');
  }, [sales]);

  // Product cost map for accurate profit calculation
  const productCostMap = useMemo(() => {
    const map = new Map<string, number>();
    products.forEach((p) => {
      map.set(p.id, typeof p.costPrice === 'number' && p.costPrice > 0 ? p.costPrice : p.price * 0.7);
    });
    return map;
  }, [products]);

  // Card Labels based on Date Filter
  const cardLabels = useMemo(() => {
    switch (dateFilter) {
      case 'Yesterday':
        return {
          sales: "Yesterday's Sales (গতকালকের বিক্রি)",
          profit: "Yesterday's Profit (গতকালকের লাভ)",
          orders: "Yesterday's Orders (অর্ডার সংখ্যা)",
          catalog: "Catalog & Stock (মোট পণ্য ও স্টক)",
          comparison: "vs day before",
          chartTitle: "Yesterday's Sales Timeline (গতকালকের বিক্রয় প্রবাহ)",
          chartSubtitle: "Hourly sales distribution for yesterday",
          channelsTitle: "Payment Channels (Yesterday)",
          topSellingTitle: "Top Selling Products (Yesterday)",
          transactionsTitle: "Yesterday's Transactions (গতকালকের বিক্রয় হিসাব)",
        };
      case 'Last 7 Days':
        return {
          sales: "Last 7 Days Sales (গত ৭ দিনের বিক্রি)",
          profit: "Last 7 Days Profit (গত ৭ দিনের লাভ)",
          orders: "Last 7 Days Orders (অর্ডার সংখ্যা)",
          catalog: "Catalog & Stock (মোট পণ্য ও স্টক)",
          comparison: "vs prior 7 days",
          chartTitle: "Last 7 Days Sales Trend (গত ৭ দিনের বিক্রি চার্ট)",
          chartSubtitle: "Daily sales performance over the past week",
          channelsTitle: "Payment Channels (Last 7 Days)",
          topSellingTitle: "Top Selling Products (Last 7 Days)",
          transactionsTitle: "Last 7 Days Transactions (গত ৭ দিনের লেনদেন)",
        };
      case 'Last 30 Days':
        return {
          sales: "Last 30 Days Sales (গত ৩০ দিনের বিক্রি)",
          profit: "Last 30 Days Profit (গত ৩০ দিনের লাভ)",
          orders: "Last 30 Days Orders (অর্ডার সংখ্যা)",
          catalog: "Catalog & Stock (মোট পণ্য ও স্টক)",
          comparison: "vs prior 30 days",
          chartTitle: "Last 30 Days Sales Trend (গত ৩০ দিনের বিক্রি চার্ট)",
          chartSubtitle: "Daily and weekly revenue trend",
          channelsTitle: "Payment Channels (Last 30 Days)",
          topSellingTitle: "Top Selling Products (Last 30 Days)",
          transactionsTitle: "Last 30 Days Transactions (গত ৩০ দিনের লেনদেন)",
        };
      case 'This Month':
        return {
          sales: "This Month's Sales (চলতি মাসের বিক্রি)",
          profit: "This Month's Profit (চলতি মাসের লাভ)",
          orders: "This Month's Orders (অর্ডার সংখ্যা)",
          catalog: "Catalog & Stock (মোট পণ্য ও স্টক)",
          comparison: "vs last month",
          chartTitle: "This Month's Sales Trend (চলতি মাসের বিক্রি চার্ট)",
          chartSubtitle: "Monthly cumulative sales trajectory",
          channelsTitle: "Payment Channels (This Month)",
          topSellingTitle: "Top Selling Products (This Month)",
          transactionsTitle: "This Month's Transactions (চলতি মাসের লেনদেন)",
        };
      case 'All Time':
        return {
          sales: "All Time Sales (সর্বমোট বিক্রি)",
          profit: "All Time Profit (সর্বমোট লাভ)",
          orders: "All Time Orders (মোট অর্ডার)",
          catalog: "Catalog & Stock (মোট পণ্য ও স্টক)",
          comparison: "Lifetime total",
          chartTitle: "All Time Sales Trend (সার্বক্ষণিক বিক্রয় গ্রাফ)",
          chartSubtitle: "Overall sales performance timeline",
          channelsTitle: "Payment Channels (All Time)",
          topSellingTitle: "Top Selling Products (All Time)",
          transactionsTitle: "All Time Transactions (সর্বমোট লেনদেন রেকর্ড)",
        };
      case 'Today':
      default:
        return {
          sales: "Today's Sales (আজকের মোট বিক্রি)",
          profit: "Today's Profit (আজকের নিট লাভ)",
          orders: "Today's Orders (অর্ডার সংখ্যা)",
          catalog: "Catalog & Stock (মোট পণ্য ও স্টক)",
          comparison: "vs yesterday",
          chartTitle: "Today's Sales Timeline (আজকের বিক্রয় প্রবাহ)",
          chartSubtitle: "Hourly sales distribution for today",
          channelsTitle: "Payment Channels (Today)",
          topSellingTitle: "Top Selling Products (Today)",
          transactionsTitle: "Today's Transactions (আজকের লেনদেন তালিকা)",
        };
    }
  }, [dateFilter]);

  // Date range calculation for filter
  const { filteredSales, previousPeriodSales } = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    let start: Date;
    let end: Date = endOfToday;
    let prevStart: Date;
    let prevEnd: Date;
    let label = 'Today';

    switch (dateFilter) {
      case 'Yesterday': {
        start = new Date(startOfToday.getTime() - 86400000);
        end = new Date(endOfToday.getTime() - 86400000);
        prevStart = new Date(startOfToday.getTime() - 2 * 86400000);
        prevEnd = new Date(endOfToday.getTime() - 2 * 86400000);
        label = 'Yesterday';
        break;
      }
      case 'Last 7 Days': {
        start = new Date(startOfToday.getTime() - 6 * 86400000);
        end = endOfToday;
        prevStart = new Date(startOfToday.getTime() - 13 * 86400000);
        prevEnd = new Date(startOfToday.getTime() - 7 * 86400000 + 86399999);
        label = 'Last 7 Days';
        break;
      }
      case 'Last 30 Days': {
        start = new Date(startOfToday.getTime() - 29 * 86400000);
        end = endOfToday;
        prevStart = new Date(startOfToday.getTime() - 59 * 86400000);
        prevEnd = new Date(startOfToday.getTime() - 30 * 86400000 + 86399999);
        label = 'Last 30 Days';
        break;
      }
      case 'This Month': {
        start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
        end = endOfToday;
        prevStart = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
        prevEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
        label = 'This Month';
        break;
      }
      case 'All Time': {
        start = new Date(0);
        end = new Date(8640000000000000);
        prevStart = new Date(0);
        prevEnd = new Date(0);
        label = 'All Time';
        break;
      }
      case 'Today':
      default: {
        start = startOfToday;
        end = endOfToday;
        prevStart = new Date(startOfToday.getTime() - 86400000);
        prevEnd = new Date(endOfToday.getTime() - 86400000);
        label = 'Today';
        break;
      }
    }

    const currentList = allCompletedSales.filter((s) => {
      const saleTime = new Date(s.createdAt).getTime();
      return saleTime >= start.getTime() && saleTime <= end.getTime();
    });

    const prevList = allCompletedSales.filter((s) => {
      const saleTime = new Date(s.createdAt).getTime();
      return saleTime >= prevStart.getTime() && saleTime <= prevEnd.getTime();
    });

    return {
      filteredSales: currentList,
      previousPeriodSales: prevList,
      periodLabel: label,
    };
  }, [allCompletedSales, dateFilter]);

  // Aggregate metrics
  const salesTotal = useMemo(() => {
    return filteredSales.reduce((acc, s) => acc + (s.total || 0), 0);
  }, [filteredSales]);

  const prevSalesTotal = useMemo(() => {
    return previousPeriodSales.reduce((acc, s) => acc + (s.total || 0), 0);
  }, [previousPeriodSales]);

  // Percentage difference vs previous period
  const salesGrowthPercent = useMemo(() => {
    if (prevSalesTotal <= 0) {
      return salesTotal > 0 ? 100 : 0;
    }
    return Math.round(((salesTotal - prevSalesTotal) / prevSalesTotal) * 100);
  }, [salesTotal, prevSalesTotal]);

  // Accurate Profit Calculation
  const profitTotal = useMemo(() => {
    return filteredSales.reduce((acc, s) => {
      let saleProfit = 0;
      if (s.items && s.items.length > 0) {
        s.items.forEach((item) => {
          const cost =
            typeof item.costPrice === 'number' && item.costPrice >= 0
              ? item.costPrice
              : (productCostMap.get(item.productId) ?? item.unitPrice * 0.7);
          saleProfit += (item.unitPrice - cost) * (item.quantity || 1);
        });
        if (s.discountAmount) {
          saleProfit -= s.discountAmount;
        }
      } else {
        saleProfit = s.total * 0.28;
      }
      return acc + Math.max(0, saleProfit);
    }, 0);
  }, [filteredSales, productCostMap]);

  const profitMarginPercent = useMemo(() => {
    if (salesTotal <= 0) return 0;
    return Math.round((profitTotal / salesTotal) * 100);
  }, [profitTotal, salesTotal]);

  const ordersCount = filteredSales.length;
  const averageOrderValue = useMemo(() => {
    return ordersCount > 0 ? Math.round(salesTotal / ordersCount) : 0;
  }, [salesTotal, ordersCount]);

  // Inventory stats
  const totalProductsCount = products.length;
  const lowStockProducts = useMemo(() => {
    return products.filter((p) => p.stock <= (p.lowStockThreshold || 5));
  }, [products]);
  const lowStockCount = lowStockProducts.length;

  // Adaptive Chart Data based on dateFilter
  const dynamicChartData = useMemo(() => {
    const now = new Date();

    if (dateFilter === 'Today' || dateFilter === 'Yesterday') {
      // 24-hour distribution split into 8 blocks of 3 hours
      const targetBase = dateFilter === 'Today' ? now : new Date(now.getTime() - 86400000);
      const year = targetBase.getFullYear();
      const month = targetBase.getMonth();
      const date = targetBase.getDate();

      const blocks = [
        { label: '00-03h', sub: '12am', startH: 0, endH: 3 },
        { label: '03-06h', sub: '3am', startH: 3, endH: 6 },
        { label: '06-09h', sub: '6am', startH: 6, endH: 9 },
        { label: '09-12h', sub: '9am', startH: 9, endH: 12 },
        { label: '12-15h', sub: '12pm', startH: 12, endH: 15 },
        { label: '15-18h', sub: '3pm', startH: 15, endH: 18 },
        { label: '18-21h', sub: '6pm', startH: 18, endH: 21 },
        { label: '21-24h', sub: '9pm', startH: 21, endH: 24 },
      ];

      const points = blocks.map((b) => {
        const startMs = new Date(year, month, date, b.startH, 0, 0).getTime();
        const endMs = new Date(year, month, date, b.endH, 0, 0).getTime() - 1;
        const matchingSales = filteredSales.filter((s) => {
          const t = new Date(s.createdAt).getTime();
          return t >= startMs && t <= endMs;
        });
        const total = matchingSales.reduce((acc, s) => acc + (s.total || 0), 0);
        const currentHour = now.getHours();
        const isCurrentBlock = dateFilter === 'Today' && currentHour >= b.startH && currentHour < b.endH;

        return {
          id: b.label,
          dayLabel: b.label,
          dateShort: b.sub,
          sales: total,
          orders: matchingSales.length,
          isHighlight: isCurrentBlock,
        };
      });

      const maxSales = Math.max(...points.map((p) => p.sales), 100);
      const totalPeriodSales = points.reduce((acc, p) => acc + p.sales, 0);
      const best = [...points].sort((a, b) => b.sales - a.sales)[0];

      return { points, maxSales, totalPeriodSales, bestPointLabel: best?.dayLabel, bestPointSales: best?.sales || 0 };
    }

    if (dateFilter === 'Last 30 Days') {
      // 6 blocks of 5 days
      const points = [];
      for (let i = 5; i >= 0; i--) {
        const blockEndDay = i * 5;
        const blockStartDay = (i + 1) * 5 - 1;
        const startMs = new Date(now.getFullYear(), now.getMonth(), now.getDate() - blockStartDay, 0, 0, 0, 0).getTime();
        const endMs = new Date(now.getFullYear(), now.getMonth(), now.getDate() - blockEndDay, 23, 59, 59, 999).getTime();

        const matchingSales = filteredSales.filter((s) => {
          const t = new Date(s.createdAt).getTime();
          return t >= startMs && t <= endMs;
        });
        const total = matchingSales.reduce((acc, s) => acc + (s.total || 0), 0);

        points.push({
          id: `b-${i}`,
          dayLabel: i === 0 ? 'Last 5d' : `${blockStartDay + 1}-${blockEndDay + 1}d ago`,
          dateShort: `D-${blockStartDay + 1}`,
          sales: total,
          orders: matchingSales.length,
          isHighlight: i === 0,
        });
      }

      const maxSales = Math.max(...points.map((p) => p.sales), 100);
      const totalPeriodSales = points.reduce((acc, p) => acc + p.sales, 0);
      const best = [...points].sort((a, b) => b.sales - a.sales)[0];

      return { points, maxSales, totalPeriodSales, bestPointLabel: best?.dayLabel, bestPointSales: best?.sales || 0 };
    }

    if (dateFilter === 'This Month') {
      // Weeks of this month
      const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
      const points = [];

      for (let w = 1; w <= 5; w++) {
        const startDay = (w - 1) * 7 + 1;
        const endDay = Math.min(w * 7, daysInMonth);
        if (startDay > daysInMonth) break;

        const startMs = new Date(now.getFullYear(), now.getMonth(), startDay, 0, 0, 0, 0).getTime();
        const endMs = new Date(now.getFullYear(), now.getMonth(), endDay, 23, 59, 59, 999).getTime();

        const matchingSales = filteredSales.filter((s) => {
          const t = new Date(s.createdAt).getTime();
          return t >= startMs && t <= endMs;
        });
        const total = matchingSales.reduce((acc, s) => acc + (s.total || 0), 0);
        const currentDayOfMonth = now.getDate();
        const isCurrentWeek = currentDayOfMonth >= startDay && currentDayOfMonth <= endDay;

        points.push({
          id: `w-${w}`,
          dayLabel: `Week ${w}`,
          dateShort: `${startDay}-${endDay} ${now.toLocaleDateString('en-US', { month: 'short' })}`,
          sales: total,
          orders: matchingSales.length,
          isHighlight: isCurrentWeek,
        });
      }

      const maxSales = Math.max(...points.map((p) => p.sales), 100);
      const totalPeriodSales = points.reduce((acc, p) => acc + p.sales, 0);
      const best = [...points].sort((a, b) => b.sales - a.sales)[0];

      return { points, maxSales, totalPeriodSales, bestPointLabel: best?.dayLabel, bestPointSales: best?.sales || 0 };
    }

    if (dateFilter === 'All Time') {
      // Past 6 calendar months
      const points = [];
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

      for (let m = 5; m >= 0; m--) {
        const d = new Date(now.getFullYear(), now.getMonth() - m, 1);
        const y = d.getFullYear();
        const mon = d.getMonth();
        const startMs = new Date(y, mon, 1, 0, 0, 0, 0).getTime();
        const endMs = new Date(y, mon + 1, 0, 23, 59, 59, 999).getTime();

        const matchingSales = allCompletedSales.filter((s) => {
          const t = new Date(s.createdAt).getTime();
          return t >= startMs && t <= endMs;
        });
        const total = matchingSales.reduce((acc, s) => acc + (s.total || 0), 0);

        points.push({
          id: `m-${y}-${mon}`,
          dayLabel: monthNames[mon],
          dateShort: `${y}`,
          sales: total,
          orders: matchingSales.length,
          isHighlight: m === 0,
        });
      }

      const maxSales = Math.max(...points.map((p) => p.sales), 100);
      const totalPeriodSales = points.reduce((acc, p) => acc + p.sales, 0);
      const best = [...points].sort((a, b) => b.sales - a.sales)[0];

      return { points, maxSales, totalPeriodSales, bestPointLabel: best?.dayLabel, bestPointSales: best?.sales || 0 };
    }

    // Default: Last 7 Days
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const points = [];

    for (let i = 6; i >= 0; i--) {
      const targetDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
      const startMs = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 0, 0, 0, 0).getTime();
      const endMs = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 23, 59, 59, 999).getTime();

      const daySales = allCompletedSales.filter((s) => {
        const t = new Date(s.createdAt).getTime();
        return t >= startMs && t <= endMs;
      });
      const dayTotal = daySales.reduce((acc, s) => acc + (s.total || 0), 0);

      points.push({
        id: `d-${i}`,
        dayLabel: i === 0 ? 'Today' : dayNames[targetDate.getDay()],
        dateShort: targetDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }),
        sales: dayTotal,
        orders: daySales.length,
        isHighlight: i === 0,
      });
    }

    const maxSales = Math.max(...points.map((p) => p.sales), 100);
    const totalPeriodSales = points.reduce((acc, p) => acc + p.sales, 0);
    const best = [...points].sort((a, b) => b.sales - a.sales)[0];

    return { points, maxSales, totalPeriodSales, bestPointLabel: best?.dayLabel, bestPointSales: best?.sales || 0 };
  }, [dateFilter, filteredSales, allCompletedSales]);

  // Payment method breakdown for selected period
  const paymentBreakdown = useMemo(() => {
    const stats: Record<string, { total: number; count: number }> = {
      Cash: { total: 0, count: 0 },
      bKash: { total: 0, count: 0 },
      Nagad: { total: 0, count: 0 },
      Card: { total: 0, count: 0 },
    };

    filteredSales.forEach((s) => {
      const method = s.paymentMethod || 'Cash';
      if (!stats[method]) {
        stats[method] = { total: 0, count: 0 };
      }
      stats[method].total += s.total || 0;
      stats[method].count += 1;
    });

    return Object.entries(stats).map(([method, data]) => {
      const percent = salesTotal > 0 ? Math.round((data.total / salesTotal) * 100) : 0;
      return {
        method,
        total: data.total,
        count: data.count,
        percent,
      };
    });
  }, [filteredSales, salesTotal]);

  // Circular Donut Segments Calculation
  const CIRCLE_RADIUS = 46;
  const CIRCLE_CIRCUMFERENCE = 2 * Math.PI * CIRCLE_RADIUS; // ~289.026

  const donutSegments = useMemo(() => {
    if (salesTotal <= 0) return [];

    const methodColors: Record<string, string> = {
      Cash: '#10b981', // emerald-500
      bKash: '#ec4899', // pink-500
      Nagad: '#f59e0b', // amber-500
      Card: '#3b82f6', // blue-500
    };

    let accumulated = 0;
    return paymentBreakdown
      .filter((item) => item.total > 0)
      .map((item) => {
        const itemFraction = item.total / salesTotal;
        const strokeLength = Math.max(2, itemFraction * CIRCLE_CIRCUMFERENCE);
        const segment = {
          method: item.method,
          color: methodColors[item.method] || '#64748b',
          strokeLength,
          strokeOffset: -accumulated,
          percent: item.percent,
        };
        accumulated += strokeLength;
        return segment;
      });
  }, [paymentBreakdown, salesTotal]);

  // Top Selling Products in Selected Period
  const topSellingProducts = useMemo(() => {
    const countMap = new Map<string, { qty: number; revenue: number }>();
    filteredSales.forEach((sale) => {
      sale.items?.forEach((item) => {
        const existing = countMap.get(item.productId) || { qty: 0, revenue: 0 };
        countMap.set(item.productId, {
          qty: existing.qty + (item.quantity || 1),
          revenue: existing.revenue + (item.totalPrice || item.unitPrice * (item.quantity || 1)),
        });
      });
    });

    if (countMap.size > 0) {
      const ranked = Array.from(countMap.entries())
        .map(([prodId, stat]) => {
          const product = products.find((p) => p.id === prodId);
          return {
            product: product || {
              id: prodId,
              name: 'Product Item',
              category: 'General',
              price: stat.revenue / (stat.qty || 1),
              stock: 0,
              unit: 'pcs',
              iconType: 'tag',
            },
            soldQty: stat.qty,
            revenue: stat.revenue,
          };
        })
        .sort((a, b) => b.soldQty - a.soldQty)
        .slice(0, 5);
      return ranked;
    }

    // If no sales in current period, fallback to featured products in catalog
    return products.slice(0, 5).map((p) => ({
      product: p,
      soldQty: 0,
      revenue: p.price,
    }));
  }, [filteredSales, products]);

  // Date format helper
  const formatSaleTime = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      const now = new Date();
      const isToday = d.toDateString() === now.toDateString();
      const isYesterday = new Date(now.getTime() - 86400000).toDateString() === d.toDateString();
      const timeStr = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
      if (isToday) return `Today, ${timeStr}`;
      if (isYesterday) return `Yesterday, ${timeStr}`;
      return `${d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}, ${timeStr}`;
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Top Header / Greeting Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              {greeting}, {currentUser?.name || storeInfo.name || 'Store Owner'}!
            </h1>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
              <Store className="w-3 h-3 text-blue-600" />
              <span>{storeInfo.name}</span>
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Real-time store metrics for <span className="font-bold text-slate-800">{dateFilter}</span>
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto flex-wrap">
          {/* Refresh Button */}
          <button
            type="button"
            onClick={handleRefresh}
            disabled={isRefreshing}
            title="Refresh database metrics"
            className="flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-50 border border-slate-200/80 rounded-xl text-xs font-semibold text-slate-700 shadow-2xs transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${isRefreshing ? 'animate-spin text-blue-600' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          {/* Subscription Status Pill */}
          {storeInfo.subscription && (
            <button
              type="button"
              onClick={() => setActiveScreen('settings')}
              className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200/80 rounded-xl text-xs shadow-2xs hover:bg-slate-50 transition-all text-left cursor-pointer"
              title="Click to view subscription details"
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  storeInfo.subscription.status === 'active'
                    ? 'bg-emerald-500 animate-pulse'
                    : 'bg-rose-500'
                }`}
              />
              <div className="flex flex-col">
                <span className="text-[9px] uppercase font-bold text-slate-400 leading-tight">
                  {storeInfo.subscription.plan || 'Standard'}
                </span>
                <span
                  className={`font-bold text-[11px] leading-tight ${
                    storeInfo.subscription.status === 'active' ? 'text-emerald-700' : 'text-rose-600'
                  }`}
                >
                  {storeInfo.subscription.status === 'active' ? 'Active' : 'Expired'}
                </span>
              </div>
            </button>
          )}

          {/* Interactive Date Filter Dropdown */}
          <div className="relative">
            <button
              onClick={() => setDateDropdownOpen(!dateDropdownOpen)}
              className="flex items-center gap-2 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>{dateFilter}</span>
              <ChevronDown className="w-3.5 h-3.5" />
            </button>

            {dateDropdownOpen && (
              <div className="absolute right-0 mt-1.5 w-44 bg-white rounded-2xl shadow-xl border border-slate-200 py-1.5 z-30 animate-in fade-in slide-in-from-top-2 duration-150">
                {(['Today', 'Yesterday', 'Last 7 Days', 'Last 30 Days', 'This Month', 'All Time'] as const).map(
                  (opt) => (
                    <button
                      key={opt}
                      onClick={() => {
                        setDateFilter(opt);
                        setDateDropdownOpen(false);
                      }}
                      className={`w-full px-3.5 py-2 text-xs text-left flex items-center justify-between transition-colors ${
                        dateFilter === opt
                          ? 'bg-blue-50 text-blue-700 font-bold'
                          : 'text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <span>{opt}</span>
                      {dateFilter === opt && <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />}
                    </button>
                  )
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Low Stock Warning Banner */}
      {lowStockCount > 0 && (
        <div className="p-3.5 sm:p-4 rounded-2xl bg-amber-50/90 border border-amber-200/90 text-amber-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center shrink-0 text-amber-700">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs sm:text-sm font-bold">
                Low Stock Alert ({lowStockCount} items need restock)
              </h4>
              <p className="text-[11px] text-amber-800/80 mt-0.5">
                {lowStockProducts.slice(0, 3).map((p) => `${p.name} (${p.stock} ${p.unit})`).join(', ')}
                {lowStockCount > 3 ? ` and ${lowStockCount - 3} more...` : ''}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setActiveScreen('products')}
            className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-2xs transition-colors self-start sm:self-auto flex items-center gap-1.5"
          >
            <span>Restock Inventory</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 4 Core Summary Metric Cards - Names dynamically change with dropdown */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-5">
        {/* Card 1: Total Revenue (Dynamic Title) */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 truncate" title={cardLabels.sales}>
              {cardLabels.sales}
            </span>
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shadow-2xs shrink-0">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight font-mono tabular-nums">
              {storeInfo.currency} {salesTotal.toLocaleString()}
            </h3>
            <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
              {prevSalesTotal > 0 ? (
                <span
                  className={`inline-flex items-center text-[11px] font-bold px-1.5 py-0.5 rounded-md ${
                    salesGrowthPercent >= 0
                      ? 'bg-emerald-50 text-emerald-700'
                      : 'bg-rose-50 text-rose-700'
                  }`}
                >
                  {salesGrowthPercent >= 0 ? (
                    <ArrowUpRight className="w-3 h-3 mr-0.5" />
                  ) : (
                    <ArrowDownRight className="w-3 h-3 mr-0.5" />
                  )}
                  {salesGrowthPercent >= 0 ? `+${salesGrowthPercent}%` : `${salesGrowthPercent}%`}
                </span>
              ) : (
                <span className="text-[11px] font-medium text-slate-400">
                  {ordersCount} order{ordersCount === 1 ? '' : 's'}
                </span>
              )}
              <span className="text-[11px] text-slate-400 font-medium">
                {cardLabels.comparison}
              </span>
            </div>
          </div>
        </div>

        {/* Card 2: Estimated Net Profit (Dynamic Title) */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 truncate" title={cardLabels.profit}>
              {cardLabels.profit}
            </span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shadow-2xs shrink-0">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight font-mono tabular-nums text-emerald-700">
              {storeInfo.currency} {profitTotal.toLocaleString()}
            </h3>
            <div className="flex items-center gap-1.5 mt-1.5">
              <span className="inline-flex items-center text-[11px] font-bold px-1.5 py-0.5 rounded-md bg-emerald-50 text-emerald-700">
                {profitMarginPercent}% margin
              </span>
              <span className="text-[11px] text-slate-400 font-medium">actual margin</span>
            </div>
          </div>
        </div>

        {/* Card 3: Completed Orders & AOV (Dynamic Title) */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 truncate" title={cardLabels.orders}>
              {cardLabels.orders}
            </span>
            <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shadow-2xs shrink-0">
              <Receipt className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight font-mono tabular-nums">
              {ordersCount.toLocaleString()}
            </h3>
            <p className="text-[11px] font-semibold text-slate-500 mt-1.5">
              Avg Order: <span className="font-mono text-slate-800 font-bold">{storeInfo.currency} {averageOrderValue.toLocaleString()}</span>
            </p>
          </div>
        </div>

        {/* Card 4: Catalog & Low Stock */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 truncate" title={cardLabels.catalog}>
              {cardLabels.catalog}
            </span>
            <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shadow-2xs shrink-0">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight font-mono tabular-nums">
              {totalProductsCount.toLocaleString()}
            </h3>
            <button
              type="button"
              onClick={() => setActiveScreen('products')}
              className={`text-[11px] font-bold flex items-center gap-1 mt-1.5 cursor-pointer ${
                lowStockCount > 0 ? 'text-amber-600 hover:text-amber-700' : 'text-blue-600 hover:text-blue-700'
              }`}
            >
              {lowStockCount > 0 ? (
                <>
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                  <span>{lowStockCount} items low stock →</span>
                </>
              ) : (
                <span>Manage Inventory →</span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Dynamic Sales Chart & Payment Channels Row */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6">
        {/* Dynamic Sales Chart */}
        <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs flex flex-col justify-between">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-blue-600" />
                <span>{cardLabels.chartTitle}</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                {cardLabels.chartSubtitle} • Total: <span className="font-mono font-bold text-slate-700">{storeInfo.currency} {dynamicChartData.totalPeriodSales.toLocaleString()}</span>
              </p>
            </div>
            {dynamicChartData.bestPointSales > 0 && (
              <span className="text-[11px] font-bold px-2.5 py-1 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 self-start sm:self-auto">
                Peak: {dynamicChartData.bestPointLabel} ({storeInfo.currency} {dynamicChartData.bestPointSales.toLocaleString()})
              </span>
            )}
          </div>

          {/* Dynamic Bar Chart Visualization */}
          <div className="py-6">
            <div className="flex items-end justify-between gap-1.5 sm:gap-3 h-44 sm:h-48 pt-6 px-1">
              {dynamicChartData.points.map((point, index) => {
                const heightPercent = Math.max(8, Math.round((point.sales / dynamicChartData.maxSales) * 100));
                const isHovered = hoveredBarIndex === index;

                return (
                  <div
                    key={point.id}
                    onMouseEnter={() => setHoveredBarIndex(index)}
                    onMouseLeave={() => setHoveredBarIndex(null)}
                    className="flex-1 flex flex-col items-center h-full justify-end group cursor-pointer relative"
                  >
                    {/* Hover Floating Tooltip */}
                    {isHovered && (
                      <div className="absolute -top-12 z-20 px-2.5 py-1.5 rounded-xl bg-slate-900 text-white text-[11px] font-bold shadow-lg pointer-events-none whitespace-nowrap animate-in fade-in zoom-in-95 duration-100">
                        <span className="font-mono text-emerald-300">{storeInfo.currency} {point.sales.toLocaleString()}</span>
                        <span className="block text-[9px] text-slate-300 font-normal">{point.orders} sales • {point.dateShort}</span>
                      </div>
                    )}

                    {/* Bar Pill */}
                    <div className="w-full max-w-[40px] flex flex-col justify-end items-center h-full">
                      <div
                        style={{ height: `${heightPercent}%` }}
                        className={`w-full rounded-xl transition-all duration-300 relative flex items-center justify-center ${
                          point.isHighlight
                            ? 'bg-linear-to-t from-blue-600 to-indigo-500 shadow-xs shadow-blue-500/20'
                            : point.sales > 0
                            ? 'bg-linear-to-t from-slate-200 to-slate-300 hover:from-blue-400 hover:to-blue-500'
                            : 'bg-slate-100'
                        }`}
                      >
                        {point.sales > 0 && (
                          <span className="text-[9px] font-mono font-bold text-white hidden sm:block opacity-0 group-hover:opacity-100 transition-opacity">
                            {point.orders}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Labels */}
                    <div className="mt-2 text-center w-full">
                      <span
                        className={`block text-[11px] sm:text-xs font-bold truncate leading-tight ${
                          point.isHighlight ? 'text-blue-600' : 'text-slate-700'
                        }`}
                      >
                        {point.dayLabel}
                      </span>
                      <span className="block text-[9px] sm:text-[10px] text-slate-400 leading-tight truncate">
                        {point.dateShort}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
            <span>Filtered for <strong className="text-slate-600">{dateFilter}</strong></span>
            <button
              onClick={() => setActiveScreen('sales')}
              className="text-blue-600 font-semibold hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>View full sales history</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Payment Channels Breakdown - Circular Donut Shape */}
        <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="pb-3 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h2 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
                  <Wallet className="w-4 h-4 text-emerald-600" />
                  <span>{cardLabels.channelsTitle}</span>
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">Cash & mobile wallet distribution</p>
              </div>
            </div>

            {/* Circular Donut Shape Chart */}
            <div className="relative flex items-center justify-center my-4 py-1">
              <svg className="w-36 h-36 -rotate-90 transform" viewBox="0 0 120 120">
                {/* Background Ring */}
                <circle
                  cx="60"
                  cy="60"
                  r={CIRCLE_RADIUS}
                  fill="none"
                  stroke="#f1f5f9"
                  strokeWidth="11"
                />
                {/* Donut Arc Segments */}
                {salesTotal > 0 &&
                  donutSegments.map((seg) => (
                    <circle
                      key={seg.method}
                      cx="60"
                      cy="60"
                      r={CIRCLE_RADIUS}
                      fill="none"
                      stroke={seg.color}
                      strokeWidth="11"
                      strokeDasharray={`${seg.strokeLength} ${CIRCLE_CIRCUMFERENCE}`}
                      strokeDashoffset={seg.strokeOffset}
                      className="transition-all duration-500"
                    />
                  ))}
              </svg>
              {/* Center Metrics Inside Circle */}
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none px-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 leading-tight">
                  {dateFilter}
                </span>
                <span className="text-sm font-black text-slate-900 font-mono tracking-tight leading-tight mt-0.5">
                  {storeInfo.currency} {salesTotal.toLocaleString()}
                </span>
                <span className="text-[10px] font-semibold text-emerald-600 leading-tight mt-0.5">
                  {ordersCount} {ordersCount === 1 ? 'Sale' : 'Sales'}
                </span>
              </div>
            </div>

            {/* Channels Grid Legend */}
            <div className="grid grid-cols-2 gap-2 my-2">
              {paymentBreakdown.map((item) => {
                const getColors = () => {
                  switch (item.method) {
                    case 'bKash':
                      return { dot: 'bg-pink-500', text: 'text-pink-600', bg: 'bg-pink-50/60 border-pink-100' };
                    case 'Nagad':
                      return { dot: 'bg-amber-500', text: 'text-amber-600', bg: 'bg-amber-50/60 border-amber-100' };
                    case 'Card':
                      return { dot: 'bg-blue-500', text: 'text-blue-600', bg: 'bg-blue-50/60 border-blue-100' };
                    case 'Cash':
                    default:
                      return { dot: 'bg-emerald-500', text: 'text-emerald-600', bg: 'bg-emerald-50/60 border-emerald-100' };
                  }
                };
                const colors = getColors();

                return (
                  <div
                    key={item.method}
                    className={`p-2.5 rounded-xl border ${colors.bg} flex flex-col justify-between transition-all`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                        <span className={`w-2 h-2 rounded-full ${colors.dot}`} />
                        <span>{item.method}</span>
                      </span>
                      <span className={`text-[10px] font-extrabold ${colors.text}`}>
                        {item.percent}%
                      </span>
                    </div>
                    <div className="mt-1 flex items-baseline justify-between">
                      <span className="text-xs font-mono font-bold text-slate-900">
                        {storeInfo.currency} {item.total.toLocaleString()}
                      </span>
                      <span className="text-[10px] text-slate-400 font-medium">
                        {item.count} ord
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <button
            type="button"
            onClick={() => setActiveScreen('pos')}
            className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-colors flex items-center justify-center gap-2 shadow-xs cursor-pointer mt-3"
          >
            <ShoppingBag className="w-4 h-4" />
            <span>Launch POS Terminal</span>
          </button>
        </div>
      </div>

      {/* Top Selling Products in Selected Period */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h2 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span>{cardLabels.topSellingTitle}</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">High volume items in catalog for {dateFilter}</p>
          </div>
          <button
            onClick={() => setActiveScreen('products')}
            className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer"
          >
            <span>Manage catalog</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="divide-y divide-slate-100 my-2">
          {topSellingProducts.length > 0 ? (
            topSellingProducts.map((entry, index) => {
              const prod = entry.product;
              const isOutOfStock = prod.stock <= 0;
              const isLowStock = !isOutOfStock && prod.stock <= ((prod as any).lowStockThreshold || 5);

              return (
                <div key={prod.id} className="py-3 flex items-center justify-between gap-3 hover:bg-slate-50/60 px-2 rounded-xl transition-colors">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="w-6 text-xs font-black text-slate-300 font-mono text-center shrink-0">
                      #{index + 1}
                    </span>
                    <ProductThumb iconType={prod.iconType} name={prod.name} category={prod.category} size="sm" />
                    <div className="min-w-0">
                      <p className="text-xs sm:text-sm font-bold text-slate-800 truncate">{prod.name}</p>
                      <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5 flex-wrap">
                        <span>{prod.category}</span>
                        <span>•</span>
                        <span
                          className={`font-semibold ${
                            isOutOfStock
                              ? 'text-rose-600'
                              : isLowStock
                              ? 'text-amber-600'
                              : 'text-emerald-600'
                          }`}
                        >
                          {isOutOfStock ? 'Out of stock' : `Stock: ${prod.stock} ${prod.unit || 'pcs'}`}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-xs sm:text-sm font-mono font-bold text-slate-900 block">
                      {storeInfo.currency} {entry.revenue.toLocaleString()}
                    </span>
                    <span className="text-[11px] font-semibold text-slate-500">
                      {entry.soldQty > 0 ? `${entry.soldQty} sold` : `${storeInfo.currency} ${prod.price}/unit`}
                    </span>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="py-8 text-center text-slate-400 text-xs">
              No products sold in this period.
            </div>
          )}
        </div>
      </div>

      {/* Transactions Feed for Selected Period */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h2 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
              <Receipt className="w-4 h-4 text-blue-600" />
              <span>{cardLabels.transactionsTitle}</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">Click any transaction to preview and print receipt</p>
          </div>
          <button
            onClick={() => setActiveScreen('sales')}
            className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer"
          >
            <span>View all sales ({sales.length})</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {filteredSales.length > 0 ? (
          <div className="divide-y divide-slate-100">
            {filteredSales.slice(0, 8).map((sale) => (
              <div
                key={sale.id}
                onClick={() => setSelectedSaleForReceipt(sale)}
                className="py-3.5 flex items-center justify-between gap-3 hover:bg-slate-50/80 px-2.5 rounded-xl cursor-pointer transition-colors group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-blue-50 group-hover:bg-blue-100 text-blue-700 flex items-center justify-center font-mono text-xs font-bold shrink-0 transition-colors shadow-2xs">
                    #{sale.invoiceNo}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                      {sale.items && sale.items.length > 0
                        ? `${sale.items[0]?.productName}${sale.items.length > 1 ? ` +${sale.items.length - 1} more` : ''}`
                        : 'POS Invoice'}
                    </p>
                    <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5 flex-wrap">
                      <span className="font-semibold text-slate-600">{formatSaleTime(sale.createdAt)}</span>
                      <span>•</span>
                      <span
                        className={`font-semibold px-1.5 py-0.2 rounded text-[10px] ${
                          sale.paymentMethod === 'bKash'
                            ? 'bg-pink-50 text-pink-700'
                            : sale.paymentMethod === 'Nagad'
                            ? 'bg-amber-50 text-amber-700'
                            : sale.paymentMethod === 'Card'
                            ? 'bg-blue-50 text-blue-700'
                            : 'bg-emerald-50 text-emerald-700'
                        }`}
                      >
                        {sale.paymentMethod || 'Cash'}
                      </span>
                      {sale.customerName && (
                        <>
                          <span>•</span>
                          <span className="text-slate-600">{sale.customerName}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <div className="text-right shrink-0 flex items-center gap-3">
                  <div>
                    <span className="text-xs sm:text-sm font-mono font-bold text-slate-900 block">
                      {storeInfo.currency} {sale.total.toLocaleString()}
                    </span>
                    <span
                      className={`text-[10px] font-bold ${
                        sale.status === 'refunded' ? 'text-rose-600' : 'text-emerald-600'
                      }`}
                    >
                      {sale.status === 'refunded' ? 'Refunded' : 'Paid'}
                    </span>
                  </div>
                  <div className="p-1.5 rounded-lg border border-slate-200 text-slate-400 group-hover:text-blue-600 group-hover:border-blue-300 transition-colors">
                    <ExternalLink className="w-3.5 h-3.5" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-12 flex flex-col items-center justify-center text-center">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mb-3">
              <Receipt className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-bold text-slate-800">No transactions recorded for {dateFilter}</h4>
            <p className="text-xs text-slate-400 mt-1 mb-4 max-w-sm">
              Launch the POS checkout screen to complete sales and invoices for your shop.
            </p>
            <button
              type="button"
              onClick={() => setActiveScreen('pos')}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-colors shadow-xs flex items-center gap-2 cursor-pointer"
            >
              <ShoppingBag className="w-4 h-4" />
              <span>Launch POS Checkout</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
