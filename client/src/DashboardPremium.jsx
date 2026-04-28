import { LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { 
  ArrowUpRight,
  ArrowDownRight,
  LayoutDashboard, 
  LineChart as LineChartIcon, 
  PieChart as PieChartIcon, 
  ArrowLeftRight, 
  Settings, 
  AlertTriangle, 
  TrendingUp,
  TrendingDown,
  Search,
  Star,
  Activity,
  Download,
  Info,
  Newspaper,
  CreditCard,
  MessageSquare,
  X,
  Send,
  Bell,
  Clock,
  Wallet,
  Zap,
  Target,
  Eye,
  EyeOff,
  Sparkles
} from 'lucide-react';
import './Dashboard.css';
import TradingViewChart from './TradingViewChart';
import { Tabs, TabsList, TabsTrigger } from "./components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./components/ui/select";
import { Input } from "./components/ui/input";
import { Button } from "./components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./components/ui/card";
import { Badge } from "./components/ui/badge";
import { Separator } from "./components/ui/separator";

axios.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

const CURRENCY_RATES = {
  USD: 1,
  EUR: 0.92,
  RON: 4.60
};

const CURRENCY_SYMBOLS = {
  USD: '$',
  EUR: '€',
  RON: 'RON'
};

// Premium theme colors inspired by TradingView
const PREMIUM_COLORS = {
  bg: {
    primary: '#0b0e14',      // Deep dark background
    secondary: '#1a1d27',    // Slightly lighter
    card: '#18202d',         // Card background
    hover: '#212a38',        // Hover state
  },
  text: {
    primary: '#f0f3f7',      // Light text
    secondary: '#d1d5db',    // Muted text
    muted: '#848e9c',        // Very muted
  },
  accent: {
    blue: '#3b82f6',         // Primary blue
    green: '#2ebd85',        // Up/positive
    red: '#f6465d',          // Down/negative
    gold: '#fbbf24',         // Highlight
  },
  chart: {
    gridUp: 'rgba(46, 189, 133, 0.1)',
    gridDown: 'rgba(246, 70, 93, 0.1)',
  }
};

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { 
    opacity: 1, 
    y: 0, 
    transition: { 
      duration: 0.5, 
      ease: "easeOut" 
    } 
  }
};

function DashboardPremium() {
  const [watchlist, setWatchlist] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [balanceHistory, setBalanceHistory] = useState([]);
  const [portfolio, setPortfolio] = useState([]);
  const [assets, setAssets] = useState([]);
  
  const [isBuyModalOpen, setIsBuyModalOpen] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [buyQuantity, setBuyQuantity] = useState('');
  
  const [isSellModalOpen, setIsSellModalOpen] = useState(false);
  const [selectedSellAsset, setSelectedSellAsset] = useState(null);
  const [sellQuantity, setSellQuantity] = useState('');

  const [orderType, setOrderType] = useState('MARKET');
  const [limitPrice, setLimitPrice] = useState('');
  const [autoOrders, setAutoOrders] = useState([]);

  const [isChartModalOpen, setIsChartModalOpen] = useState(false);
  const [selectedChartAsset, setSelectedChartAsset] = useState(null);
  const [chartData, setChartData] = useState([]);

  const [isDepositModalOpen, setIsDepositModalOpen] = useState(false);
  const [depositData, setDepositData] = useState({
    amount: '',
    cardNumber: '',
    cardName: '',
    expiry: '',
    cvv: ''
  });

  const [is2FAModalOpen, setIs2FAModalOpen] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [twoFactorCode, setTwoFactorCode] = useState('');
  
  const [priceAlerts, setPriceAlerts] = useState([]);
  const [isAlertModalOpen, setIsAlertModalOpen] = useState(false);
  const [selectedAlertAsset, setSelectedAlertAsset] = useState(null);
  const [alertTargetPrice, setAlertTargetPrice] = useState('');
  const [alertCondition, setAlertCondition] = useState('ABOVE');
  
  const [user, setUser] = useState(null);
  const [activeView, setActiveView] = useState('dashboard');
  const [searchQuery, setSearchQuery] = useState('');
  const [marketFilter, setMarketFilter] = useState('ALL');
  const [alerts, setAlerts] = useState([]);
  const [news, setNews] = useState([]);
  const [isNewsLoading, setIsNewsLoading] = useState(false);
  const fileInputRef = useRef(null);
  const navigate = useNavigate();
  const [marketPage, setMarketPage] = useState(1);
  const assetsPerPage = 10;

  const [chartTradeSide, setChartTradeSide] = useState('BUY');

  const portfolioPieData = portfolio.map(item => ({
    name: item.asset.symbol,
    value: parseFloat((item.quantity * item.asset.currentPrice).toFixed(2))
  }));

  const COLORS = ['#3b82f6', '#2ebd85', '#f59e0b', '#8b5cf6', '#ec4899', '#f6465d'];

  const formatCurrency = (value, customDecimals = null) => {
    if (value === undefined || value === null) return '';
    const currency = user?.currency || 'USD';
    const rate = CURRENCY_RATES[currency] || 1;
    const convertedValue = value * rate;

    let decimals = customDecimals !== null ? customDecimals : (convertedValue < 1 ? 4 : 2);

    if (currency === 'RON') {
      return `${convertedValue.toFixed(decimals)} RON`;
    }
    return `${CURRENCY_SYMBOLS[currency]}${convertedValue.toFixed(decimals)}`;
  };

  const handleCurrencyChange = async (newCurrency) => {
    try {
      const updatedUser = { ...user, currency: newCurrency };
      setUser(updatedUser);
      localStorage.setItem('user', JSON.stringify(updatedUser));

      await axios.put('http://localhost:3000/api/auth/update-profile', {
        userId: user.id,
        name: user.name,
        currency: newCurrency,
        profilePicture: user.profilePicture
      });
      toast.success(`Currency changed to ${newCurrency}`);
    } catch (err) {
      toast.error('Failed to update currency preference');
    }
  };

  const fetchAssets = async () => {
    try {
      const response = await axios.get('http://localhost:3000/api/assets');
      setAssets(response.data);
    } catch (error) {}
  };

  useEffect(() => {
    if (assets.length > 0) {
      setSelectedChartAsset(prev => {
        if (!prev) return prev;
        const liveAsset = assets.find(a => a.id === prev.id);
        return liveAsset && liveAsset.currentPrice !== prev.currentPrice ? liveAsset : prev;
      });

      setSelectedAsset(prev => {
        if (!prev) return prev;
        const liveAsset = assets.find(a => a.id === prev.id);
        return liveAsset && liveAsset.currentPrice !== prev.currentPrice ? liveAsset : prev;
      });

      setSelectedSellAsset(prev => {
        if (!prev) return prev;
        const liveAsset = assets.find(a => a.id === prev.asset.id);
        return liveAsset && liveAsset.currentPrice !== prev.asset.currentPrice 
          ? { ...prev, asset: liveAsset } 
          : prev;
      });

      setSelectedAlertAsset(prev => {
        if (!prev) return prev;
        const liveAsset = assets.find(a => a.id === prev.id);
        return liveAsset && liveAsset.currentPrice !== prev.currentPrice ? liveAsset : prev;
      });
    }
  }, [assets]);

  useEffect(() => {
    if (user && user.id) {
      axios.get(`http://localhost:3000/api/alerts/${user.id}`)
        .then(res => setPriceAlerts(res.data))
        .catch(err => {});
        
      axios.get(`http://localhost:3000/api/auto-orders/${user.id}`)
        .then(res => setAutoOrders(res.data))
        .catch(err => {});
    }
  }, [user]);

  useEffect(() => {
    if (assets.length > 0 && priceAlerts.length > 0) {
      priceAlerts.forEach(alert => {
        const asset = assets.find(a => a.symbol === alert.symbol);
        if (asset) {
          let isTriggered = false;
          if (alert.condition === 'ABOVE' && asset.currentPrice >= alert.targetPrice) {
            isTriggered = true;
          } else if (alert.condition === 'BELOW' && asset.currentPrice <= alert.targetPrice) {
            isTriggered = true;
          }

          if (isTriggered) {
            try {
              const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
              audio.play().catch(err => {});
            } catch(e) {}

            toast.success(
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <strong style={{ fontSize: '16px' }}>🎯 Price Alert: {alert.symbol}</strong>
                <span>Hit your target of {formatCurrency(alert.targetPrice)}!</span>
              </div>, 
              { duration: 8000, style: { background: PREMIUM_COLORS.accent.green, color: 'white', border: 'none' } }
            );

            setPriceAlerts(prev => prev.filter(a => a.id !== alert.id));
            axios.delete(`http://localhost:3000/api/alerts/${alert.id}`).catch(() => {});
          }
        }
      });
    }
  }, [assets, priceAlerts]);

  useEffect(() => {
    const fetchNews = async () => {
      if (activeView === 'news') {
        setIsNewsLoading(true);
        try {
          const res = await axios.get('http://localhost:3000/api/assets/market-news');
          if (res.data && Array.isArray(res.data)) {
            setNews(res.data.slice(0, 15));
          } else {
            setNews([]);
          }
        } catch (err) {
          setNews([]);
        } finally {
          setIsNewsLoading(false);
        }
      }
    };
    fetchNews();
  }, [activeView]);
    
  useEffect(() => {
    const fetchTransactions = async () => {
      try {
        if (user && user.id) {
          const res = await axios.get(`http://localhost:3000/api/trade/history/${user.id}`);
          setTransactions(res.data);
        }
      } catch (err) {}
    };

    if (activeView === 'transactions' || activeView === 'dashboard') {
      fetchTransactions();
    }
  }, [activeView, user]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');

    if (!token) {
      navigate('/');
    } else {
      setUser(JSON.parse(userData));
      fetchAssets();
      
      const interval = setInterval(() => {
        fetchAssets();
        if (isChartModalOpen && selectedChartAsset) {
          handleRefreshChartData(selectedChartAsset.id);
        }
      }, 3000);

      return () => clearInterval(interval);
    }
  }, [navigate, isChartModalOpen, selectedChartAsset]);

  useEffect(() => {
    setMarketPage(1);
  }, [searchQuery, marketFilter]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        if (user && user.id) {
          const portRes = await axios.get(`http://localhost:3000/api/portfolio/${user.id}`);
          setPortfolio(portRes.data);
          
          const histRes = await axios.get(`http://localhost:3000/api/portfolio/history/${user.id}`);
          setBalanceHistory(histRes.data);

          const watchRes = await axios.get(`http://localhost:3000/api/watchlist/${user.id}`);
          setWatchlist(watchRes.data);
          
          const autoRes = await axios.get(`http://localhost:3000/api/auto-orders/${user.id}`);
          setAutoOrders(autoRes.data);
        }
      } catch (err) {}
    };

    if (activeView === 'portfolio' || activeView === 'dashboard') {
      fetchData();
    }
  }, [activeView, user]);

  useEffect(() => {
    const newAlerts = [];

    if (user && user.balance < 50) {
      newAlerts.push({
        id: 'low-balance',
        type: 'warning',
        text: `Your balance is below ${formatCurrency(50)}. Consider adding funds.`,
        icon: <AlertTriangle size={20} />
      });
    }

    if (portfolio.length > 0) {
      const cryptoTotal = portfolio.filter(p => p.asset.type === 'CRYPTO').reduce((sum, p) => sum + p.currentValue, 0);
      const stockTotal = portfolio.filter(p => p.asset.type === 'STOCK').reduce((sum, p) => sum + p.currentValue, 0);
      const totalValue = cryptoTotal + stockTotal;

      if (totalValue > 0) {
        if (cryptoTotal / totalValue > 0.8) {
          newAlerts.push({
            id: 'high-crypto',
            type: 'info',
            text: 'Portfolio heavily concentrated in Crypto (>80%). Consider diversifying.',
            icon: <Info size={20} />
          });
        } else if (stockTotal / totalValue > 0.8) {
          newAlerts.push({
            id: 'high-stocks',
            type: 'info',
            text: 'Portfolio heavily concentrated in Stocks (>80%). Consider adding Crypto.',
            icon: <Info size={20} />
          });
        }
      }

      const bestAsset = [...portfolio].sort((a, b) => b.profitLossPercentage - a.profitLossPercentage)[0];
      if (bestAsset && bestAsset.profitLossPercentage > 5) {
        newAlerts.push({
          id: 'best-asset',
          type: 'success',
          text: `Great! ${bestAsset.asset.name} is up ${bestAsset.profitLossPercentage.toFixed(2)}%!`,
          icon: <TrendingUp size={20} />
        });
      }

      const worstAsset = [...portfolio].sort((a, b) => a.profitLossPercentage - b.profitLossPercentage)[0];
      if (worstAsset && worstAsset.profitLossPercentage < -5) {
        newAlerts.push({
          id: 'worst-asset',
          type: 'danger',
          text: `${worstAsset.asset.name} is down ${Math.abs(worstAsset.profitLossPercentage).toFixed(2)}%. Monitor closely.`,
          icon: <TrendingDown size={20} />
        });
      }
    } else if (user) {
      newAlerts.push({
        id: 'empty-portfolio',
        type: 'info',
        text: 'Your portfolio is empty. Head to Markets to make your first trade!',
        icon: <Activity size={20} />
      });
    }

    setAlerts(newAlerts);
  }, [portfolio, user]);

  const handleRefreshChartData = async (assetId) => {
    try {
      const res = await axios.get(`http://localhost:3000/api/assets/history/${assetId}`);
      setChartData(res.data);
    } catch (err) {}
  };

  const handleOpenChart = async (asset) => {
    setSelectedChartAsset(asset);
    setSelectedAsset(asset);
    const pItem = portfolio.find(p => p.asset.id === asset.id);
    if (pItem) setSelectedSellAsset(pItem);
    
    setIsChartModalOpen(true);
    setChartTradeSide('BUY');
    setChartData([]);
    try {
      const res = await axios.get(`http://localhost:3000/api/assets/history/${asset.id}`);
      setChartData(res.data);
    } catch (err) {}
  };

  const handleToggleWatchlist = async (assetId) => {
    try {
      await axios.post('http://localhost:3000/api/watchlist/toggle', {
        userId: user.id,
        assetId
      });
      const watchRes = await axios.get(`http://localhost:3000/api/watchlist/${user.id}`);
      setWatchlist(watchRes.data);
      
      const isAdded = watchRes.data.some(w => w.assetId === assetId);
      if(isAdded) {
        toast.success('Asset added to watchlist');
      } else {
        toast.info('Asset removed from watchlist');
      }
    } catch (err) {
      toast.error('Failed to update watchlist');
    }
  };

  const handleBuyAsset = async () => {
    if (!buyQuantity || buyQuantity <= 0) return;
    
    if (orderType === 'LIMIT') {
      if (!limitPrice || limitPrice <= 0) return toast.warning('Please enter a valid target price');
      try {
        const res = await axios.post('http://localhost:3000/api/auto-orders', {
          userId: user.id,
          assetId: selectedAsset.id,
          symbol: selectedAsset.symbol,
          type: 'BUY',
          targetPrice: limitPrice,
          quantity: buyQuantity
        });
        setAutoOrders([res.data, ...autoOrders]);
        toast.success(`Limit Buy order placed for ${buyQuantity} ${selectedAsset.symbol}`);
        setIsBuyModalOpen(false);
        setBuyQuantity('');
        setLimitPrice('');
        setOrderType('MARKET');
      } catch (err) {
        toast.error('Failed to place limit order');
      }
      return;
    }

    try {
      const res = await axios.post('http://localhost:3000/api/trade/buy', {
        userId: user.id,
        assetId: selectedAsset.id,
        quantity: buyQuantity
      });
      const updatedUser = { ...user, balance: res.data.newBalance };
      setUser(updatedUser);
      localStorage.setItem('user', JSON.stringify(updatedUser));
      
      const portRes = await axios.get(`http://localhost:3000/api/portfolio/${user.id}`);
      setPortfolio(portRes.data);
      
      const histRes = await axios.get(`http://localhost:3000/api/portfolio/history/${user.id}`);
      setBalanceHistory(histRes.data);

      const transRes = await axios.get(`http://localhost:3000/api/trade/history/${user.id}`);
      setTransactions(transRes.data);

      toast.success(`Successfully purchased ${buyQuantity} ${selectedAsset.symbol}`);
      setIsBuyModalOpen(false);
      setBuyQuantity('');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Transaction failed');
    }
  };

  const handleSellAsset = async () => {
    if (!sellQuantity || sellQuantity <= 0) return;
    if (sellQuantity > selectedSellAsset.quantity) {
      return toast.warning('You cannot sell more than you own!');
    }

    if (orderType === 'LIMIT') {
      if (!limitPrice || limitPrice <= 0) return toast.warning('Please enter a valid target price');
      try {
        const res = await axios.post('http://localhost:3000/api/auto-orders', {
          userId: user.id,
          assetId: selectedSellAsset.asset.id,
          symbol: selectedSellAsset.asset.symbol,
          type: 'SELL',
          targetPrice: limitPrice,
          quantity: sellQuantity
        });
        setAutoOrders([res.data, ...autoOrders]);
        toast.success(`Limit Sell order placed for ${sellQuantity} ${selectedSellAsset.asset.symbol}`);
        setIsSellModalOpen(false);
        setSellQuantity('');
        setLimitPrice('');
        setOrderType('MARKET');
      } catch (err) {
        toast.error('Failed to place limit order');
      }
      return;
    }

    try {
      const res = await axios.post('http://localhost:3000/api/trade/sell', {
        userId: user.id,
        assetId: selectedSellAsset.asset.id,
        quantity: sellQuantity
      });
      
      const updatedUser = { ...user, balance: res.data.newBalance };
      setUser(updatedUser);
      localStorage.setItem('user', JSON.stringify(updatedUser));
      
      toast.success(`Successfully sold ${sellQuantity} ${selectedSellAsset.asset.symbol}`);
      setIsSellModalOpen(false);
      setSellQuantity('');
      
      const portRes = await axios.get(`http://localhost:3000/api/portfolio/${user.id}`);
      setPortfolio(portRes.data);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Transaction failed');
    }
  };

  const handleCancelAutoOrder = async (id) => {
    try {
      await axios.delete(`http://localhost:3000/api/auto-orders/${id}`);
      setAutoOrders(autoOrders.filter(a => a.id !== id));
      toast.success('Auto order cancelled');
    } catch (err) {
      toast.error('Failed to cancel order');
    }
  };

  const handleDepositSubmit = async () => {
    if (!depositData.amount || isNaN(depositData.amount) || parseFloat(depositData.amount) <= 0) {
      return toast.warning('Please enter a valid amount.');
    }
    
    try {
      const amountInUSD = parseFloat(depositData.amount) / (CURRENCY_RATES[user?.currency || 'USD'] || 1);

      const res = await axios.post('http://localhost:3000/api/trade/deposit', {
        userId: user.id,
        amount: amountInUSD
      });
      const updatedUser = { ...user, balance: res.data.newBalance };
      setUser(updatedUser);
      localStorage.setItem('user', JSON.stringify(updatedUser));
      
      toast.success('Funds deposited successfully!');
      setIsDepositModalOpen(false);
      setDepositData({ amount: '', cardNumber: '', cardName: '', expiry: '', cvv: '' });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Deposit failed');
    }
  };

  const handleAddPriceAlert = async (e) => {
    e.preventDefault();
    if (!alertTargetPrice) return toast.warning('Please enter a target price');
    
    try {
      const res = await axios.post('http://localhost:3000/api/alerts', {
        userId: user.id,
        symbol: selectedAlertAsset.symbol,
        targetPrice: alertTargetPrice,
        condition: alertCondition
      });
      setPriceAlerts([res.data, ...priceAlerts]);
      setAlertTargetPrice('');
      toast.success('Price alert created successfully!');
      setIsAlertModalOpen(false);
    } catch (err) {
      toast.error('Failed to create alert');
    }
  };

  const handleDeleteAlert = async (id) => {
    try {
      await axios.delete(`http://localhost:3000/api/alerts/${id}`);
      setPriceAlerts(priceAlerts.filter(a => a.id !== id));
      toast.success('Alert removed');
    } catch (err) {
      toast.error('Failed to remove alert');
    }
  };

  const formatChartData = (historicalData) => {
    if (!historicalData || historicalData.length === 0) return { candles: [], volume: [] };

    let lastValidTime = Math.floor(Date.now() / 1000) - (historicalData.length * 60);
    const candles = [];
    const volume = [];

    historicalData.forEach((item, index, arr) => {
      const rawTime = item.time || item.date;
      let timestamp = new Date(rawTime).getTime();

      if (isNaN(timestamp) && typeof rawTime === 'string') {
        timestamp = new Date(`${new Date().toDateString()} ${rawTime}`).getTime();
      }

      let tvTime = Math.floor(timestamp / 1000);
      if (isNaN(tvTime)) tvTime = lastValidTime + 60;
      if (tvTime <= lastValidTime) tvTime = lastValidTime + 60; 
      lastValidTime = tvTime;

      const prevPrice = index === 0 ? item.price : arr[index - 1].price;
      const open = prevPrice;
      const close = item.price;
      const volatility = item.price * 0.0015; 
      
      const priceDiff = Math.abs(close - open);
      const baseVolume = 1000 + Math.random() * 5000;
      const simulatedVolume = baseVolume + (priceDiff * 10000);
      const isUp = close >= open;

      candles.push({
        time: tvTime,
        open: open,
        high: Math.max(open, close) + volatility,
        low: Math.min(open, close) - volatility,
        close: close
      });

      volume.push({
        time: tvTime,
        value: simulatedVolume,
        color: isUp ? 'rgba(46, 189, 133, 0.4)' : 'rgba(246, 70, 93, 0.4)'
      });
    });

    return { candles, volume };
  };

  const renderDashboardView = () => {
    const totalPortfolioValue = portfolio.reduce((sum, item) => sum + item.currentValue, 0);
    const totalInvested = portfolio.reduce((sum, item) => sum + (item.quantity * item.avgBuyPrice), 0);
    const totalPnL = totalPortfolioValue - totalInvested;
    const isPnLPositive = totalPnL >= 0;
    const roiPercentage = totalInvested > 0 ? ((totalPnL / totalInvested) * 100).toFixed(2) : '0.00';

    return (
      <motion.div variants={containerVariants} initial="hidden" animate="show" className="w-full space-y-8">
        {/* Header */}
        <motion.div variants={itemVariants} className="flex flex-col md:flex-row md:justify-between md:items-end gap-4 pb-6 border-b" style={{ borderColor: PREMIUM_COLORS.text.muted + '33' }}>
          <div>
            <h1 className="text-4xl font-bold mb-2 flex items-center gap-2" style={{ color: PREMIUM_COLORS.text.primary }}>
              <Sparkles size={32} style={{ color: PREMIUM_COLORS.accent.gold }} />
              Premium Portfolio
            </h1>
            <p style={{ color: PREMIUM_COLORS.text.muted }}>
              Welcome back, {user?.name || 'Investor'}. Track your investments and market performance.
            </p>
          </div>
          <div className="flex gap-3">
            <button 
              onClick={() => navigate('/dashboard')}
              className="px-4 py-2 rounded-lg font-semibold transition-all text-sm"
              style={{ 
                background: PREMIUM_COLORS.bg.secondary,
                color: PREMIUM_COLORS.text.secondary,
                border: `1px solid ${PREMIUM_COLORS.text.muted}33`
              }}
            >
              ← Classic View
            </button>
            <button 
              onClick={() => setIsDepositModalOpen(true)}
              className="flex items-center gap-2 px-6 py-2 rounded-lg font-semibold transition-all"
              style={{ 
                background: PREMIUM_COLORS.accent.blue,
                color: PREMIUM_COLORS.text.primary,
                boxShadow: `0 8px 24px ${PREMIUM_COLORS.accent.blue}40`
              }}
            >
              <CreditCard size={18} /> 
              Add Funds
            </button>
          </div>
        </motion.div>

        {/* Alerts */}
        {alerts.length > 0 && (
          <motion.div variants={itemVariants} className="space-y-3">
            {alerts.map(alert => {
              let bgColor, borderColor, textColor;
              if (alert.type === 'warning' || alert.type === 'danger') {
                bgColor = PREMIUM_COLORS.chart.gridDown;
                borderColor = PREMIUM_COLORS.accent.red; 
                textColor = PREMIUM_COLORS.accent.red;
              } else if (alert.type === 'success') {
                bgColor = PREMIUM_COLORS.chart.gridUp;
                borderColor = PREMIUM_COLORS.accent.green; 
                textColor = PREMIUM_COLORS.accent.green;
              } else {
                bgColor = PREMIUM_COLORS.accent.blue + '20';
                borderColor = PREMIUM_COLORS.accent.blue; 
                textColor = PREMIUM_COLORS.accent.blue;
              }

              return (
                <div 
                  key={alert.id} 
                  className="flex items-center gap-4 p-4 rounded-lg border-l-4 transition-all hover:scale-[1.02]"
                  style={{ 
                    background: bgColor,
                    borderColor: borderColor,
                    borderLeftWidth: '4px'
                  }}
                >
                  <div style={{ color: textColor }}>
                    {alert.icon}
                  </div>
                  <p className="text-sm font-semibold" style={{ color: PREMIUM_COLORS.text.primary }}>
                    {alert.text}
                  </p>
                </div>
              );
            })}
          </motion.div>
        )}

        {/* Stats Cards */}
        <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Balance Card */}
          <div 
            className="p-6 rounded-xl backdrop-blur-md border transition-all hover:scale-105"
            style={{ 
              background: PREMIUM_COLORS.bg.card,
              borderColor: PREMIUM_COLORS.text.muted + '33'
            }}
          >
            <div className="flex justify-between items-start mb-4">
              <div>
                <p className="text-sm font-medium mb-2" style={{ color: PREMIUM_COLORS.text.muted }}>Available Balance</p>
                <h3 className="text-2xl font-bold" style={{ color: PREMIUM_COLORS.text.primary }}>
                  {formatCurrency(user?.balance || 0)}
                </h3>
              </div>
              <div className="w-12 h-12 rounded-lg flex items-center justify-center" style={{ background: PREMIUM_COLORS.accent.blue + '20' }}>
                <Wallet size={24} style={{ color: PREMIUM_COLORS.accent.blue }} />
              </div>
            </div>
          </div>

          {/* Profit/Loss Card */}
          <div 
            className="p-6 rounded-xl backdrop-blur-md border transition-all hover:scale-105"
            style={{ 
              background: PREMIUM_COLORS.bg.card,
              borderColor: PREMIUM_COLORS.text.muted + '33'
            }}
          >
            <div className="flex justify-between items-start mb-4">
              <div>
                <p className="text-sm font-medium mb-2" style={{ color: PREMIUM_COLORS.text.muted }}>Total Profit/Loss</p>
                <h3 className="text-2xl font-bold" style={{ color: isPnLPositive ? PREMIUM_COLORS.accent.green : PREMIUM_COLORS.accent.red }}>
                  {isPnLPositive ? '+' : ''}{formatCurrency(totalPnL)}
                </h3>
                <div className="flex items-center gap-1 text-xs font-semibold mt-2" style={{ color: isPnLPositive ? PREMIUM_COLORS.accent.green : PREMIUM_COLORS.accent.red }}>
                  {isPnLPositive ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                  {Math.abs(roiPercentage)}%
                </div>
              </div>
              <div className="w-12 h-12 rounded-lg flex items-center justify-center" style={{ background: (isPnLPositive ? PREMIUM_COLORS.accent.green : PREMIUM_COLORS.accent.red) + '20' }}>
                <TrendingUp size={24} style={{ color: isPnLPositive ? PREMIUM_COLORS.accent.green : PREMIUM_COLORS.accent.red }} />
              </div>
            </div>
          </div>

          {/* Active Investments Card */}
          <div 
            className="p-6 rounded-xl backdrop-blur-md border transition-all hover:scale-105"
            style={{ 
              background: PREMIUM_COLORS.bg.card,
              borderColor: PREMIUM_COLORS.text.muted + '33'
            }}
          >
            <div className="flex justify-between items-start mb-4">
              <div>
                <p className="text-sm font-medium mb-2" style={{ color: PREMIUM_COLORS.text.muted }}>Active Investments</p>
                <h3 className="text-2xl font-bold" style={{ color: PREMIUM_COLORS.text.primary }}>
                  {portfolio.length}
                </h3>
              </div>
              <div className="w-12 h-12 rounded-lg flex items-center justify-center" style={{ background: PREMIUM_COLORS.accent.gold + '20' }}>
                <PieChartIcon size={24} style={{ color: PREMIUM_COLORS.accent.gold }} />
              </div>
            </div>
          </div>

          {/* Total Trades Card */}
          <div 
            className="p-6 rounded-xl backdrop-blur-md border transition-all hover:scale-105"
            style={{ 
              background: PREMIUM_COLORS.bg.card,
              borderColor: PREMIUM_COLORS.text.muted + '33'
            }}
          >
            <div className="flex justify-between items-start mb-4">
              <div>
                <p className="text-sm font-medium mb-2" style={{ color: PREMIUM_COLORS.text.muted }}>Total Trades</p>
                <h3 className="text-2xl font-bold" style={{ color: PREMIUM_COLORS.text.primary }}>
                  {transactions.length}
                </h3>
              </div>
              <div className="w-12 h-12 rounded-lg flex items-center justify-center" style={{ background: PREMIUM_COLORS.accent.blue + '20' }}>
                <Activity size={24} style={{ color: PREMIUM_COLORS.accent.blue }} />
              </div>
            </div>
          </div>
        </motion.div>

        {/* Charts Section */}
        <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Balance History Chart */}
          <div 
            className="lg:col-span-2 p-6 rounded-xl backdrop-blur-md border"
            style={{ 
              background: PREMIUM_COLORS.bg.card,
              borderColor: PREMIUM_COLORS.text.muted + '33'
            }}
          >
            <h3 className="text-xl font-bold mb-6" style={{ color: PREMIUM_COLORS.text.primary }}>Balance History</h3>
            <div style={{ width: '100%', height: '300px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={balanceHistory}>
                  <CartesianGrid strokeDasharray="3 3" stroke={PREMIUM_COLORS.text.muted + '33'} />
                  <XAxis dataKey="name" stroke={PREMIUM_COLORS.text.muted} />
                  <YAxis stroke={PREMIUM_COLORS.text.muted} />
                  <Tooltip 
                    contentStyle={{ 
                      background: PREMIUM_COLORS.bg.secondary,
                      border: `1px solid ${PREMIUM_COLORS.text.muted}33`,
                      borderRadius: '8px',
                      color: PREMIUM_COLORS.text.primary
                    }}
                    formatter={(value) => [formatCurrency(value), 'Balance']}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="value" 
                    stroke={PREMIUM_COLORS.accent.blue} 
                    strokeWidth={3}
                    dot={false}
                    isAnimationActive={true}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Asset Allocation */}
          <div 
            className="p-6 rounded-xl backdrop-blur-md border"
            style={{ 
              background: PREMIUM_COLORS.bg.card,
              borderColor: PREMIUM_COLORS.text.muted + '33'
            }}
          >
            <h3 className="text-xl font-bold mb-6" style={{ color: PREMIUM_COLORS.text.primary }}>Asset Allocation</h3>
            {portfolioPieData.length > 0 ? (
              <div style={{ width: '100%', height: '300px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={portfolioPieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                      stroke={PREMIUM_COLORS.bg.secondary}
                      isAnimationActive={true}
                    >
                      {portfolioPieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-full flex items-center justify-center rounded-lg text-center" style={{ background: PREMIUM_COLORS.bg.primary }}>
                <p style={{ color: PREMIUM_COLORS.text.muted }}>No assets yet</p>
              </div>
            )}
          </div>
        </motion.div>

        {/* Watchlist, Alerts, Transactions */}
        <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Watchlist */}
          <div 
            className="p-6 rounded-xl backdrop-blur-md border"
            style={{ 
              background: PREMIUM_COLORS.bg.card,
              borderColor: PREMIUM_COLORS.text.muted + '33'
            }}
          >
            <h3 className="text-xl font-bold mb-4" style={{ color: PREMIUM_COLORS.text.primary }}>Watchlist</h3>
            <div className="space-y-3">
              {watchlist.length === 0 ? (
                <p style={{ color: PREMIUM_COLORS.text.muted }} className="text-sm text-center py-8">
                  Add assets to your watchlist
                </p>
              ) : (
                watchlist.map(item => (
                  <div 
                    key={item.id}
                    onClick={() => handleOpenChart(item.asset)}
                    className="p-3 rounded-lg border cursor-pointer transition-all hover:scale-105"
                    style={{ 
                      background: PREMIUM_COLORS.bg.primary,
                      borderColor: PREMIUM_COLORS.text.muted + '33'
                    }}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-semibold" style={{ color: PREMIUM_COLORS.text.primary }}>
                          {item.asset.symbol}
                        </p>
                        <p style={{ color: PREMIUM_COLORS.text.muted }} className="text-xs">
                          {item.asset.name}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold" style={{ color: PREMIUM_COLORS.text.primary }}>
                          {formatCurrency(item.asset.currentPrice)}
                        </p>
                        <p className="text-xs" style={{ color: item.asset.change24h >= 0 ? PREMIUM_COLORS.accent.green : PREMIUM_COLORS.accent.red }}>
                          {item.asset.change24h >= 0 ? '+' : ''}{item.asset.change24h?.toFixed(2)}%
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Price Alerts */}
          <div 
            className="p-6 rounded-xl backdrop-blur-md border"
            style={{ 
              background: PREMIUM_COLORS.bg.card,
              borderColor: PREMIUM_COLORS.text.muted + '33'
            }}
          >
            <h3 className="text-xl font-bold mb-4 flex items-center gap-2" style={{ color: PREMIUM_COLORS.text.primary }}>
              <Bell size={20} style={{ color: PREMIUM_COLORS.accent.blue }} />
              Price Alerts
            </h3>
            <div className="space-y-3">
              {priceAlerts.length === 0 ? (
                <p style={{ color: PREMIUM_COLORS.text.muted }} className="text-sm text-center py-8">
                  No active alerts
                </p>
              ) : (
                priceAlerts.map(alert => (
                  <div 
                    key={alert.id}
                    className="p-3 rounded-lg border flex justify-between items-start"
                    style={{ 
                      background: PREMIUM_COLORS.bg.primary,
                      borderColor: alert.condition === 'ABOVE' ? PREMIUM_COLORS.accent.green + '33' : PREMIUM_COLORS.accent.red + '33'
                    }}
                  >
                    <div>
                      <p className="font-semibold text-sm" style={{ color: PREMIUM_COLORS.text.primary }}>
                        {alert.symbol}
                      </p>
                      <p className="text-xs" style={{ color: PREMIUM_COLORS.text.muted }}>
                        {alert.condition === 'ABOVE' ? '↑' : '↓'} {formatCurrency(alert.targetPrice)}
                      </p>
                    </div>
                    <button 
                      onClick={() => handleDeleteAlert(alert.id)}
                      className="text-red-400 hover:text-red-500 transition"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Recent Transactions */}
          <div 
            className="p-6 rounded-xl backdrop-blur-md border"
            style={{ 
              background: PREMIUM_COLORS.bg.card,
              borderColor: PREMIUM_COLORS.text.muted + '33'
            }}
          >
            <h3 className="text-xl font-bold mb-4" style={{ color: PREMIUM_COLORS.text.primary }}>Recent Trades</h3>
            <div className="space-y-3">
              {transactions.length === 0 ? (
                <p style={{ color: PREMIUM_COLORS.text.muted }} className="text-sm text-center py-8">
                  No recent trades
                </p>
              ) : (
                transactions.slice(0, 4).map(tx => {
                  const isBuy = tx.type === 'BUY';
                  return (
                    <div 
                      key={tx.id}
                      className="p-3 rounded-lg border"
                      style={{ 
                        background: PREMIUM_COLORS.bg.primary,
                        borderColor: PREMIUM_COLORS.text.muted + '33'
                      }}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: (isBuy ? PREMIUM_COLORS.accent.green : PREMIUM_COLORS.accent.red) + '20' }}>
                            {isBuy ? <ArrowDownRight size={14} style={{ color: PREMIUM_COLORS.accent.green }} /> : <ArrowUpRight size={14} style={{ color: PREMIUM_COLORS.accent.red }} />}
                          </div>
                          <div>
                            <p className="font-semibold text-sm" style={{ color: PREMIUM_COLORS.text.primary }}>
                              {isBuy ? 'Buy' : 'Sell'}
                            </p>
                            <p className="text-xs" style={{ color: PREMIUM_COLORS.text.muted }}>
                              {tx.asset.symbol}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-sm" style={{ color: PREMIUM_COLORS.text.primary }}>
                            {tx.quantity}
                          </p>
                          <p className="text-xs" style={{ color: PREMIUM_COLORS.text.muted }}>
                            {new Date(tx.date).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>
    );
  };

  return (
    <div 
      className="min-h-screen p-6 md:p-8"
      style={{ background: PREMIUM_COLORS.bg.primary }}
    >
      <div className="max-w-7xl mx-auto">
        {activeView === 'dashboard' && renderDashboardView()}
      </div>
    </div>
  );
}

export default DashboardPremium;
