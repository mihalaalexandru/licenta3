import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { motion, AnimatePresence } from 'framer-motion';
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
  Sparkles,
  Zap,
  Moon,
  Sun,
  User,
  Lock,
  Shield,
  ArrowUpFromLine,
  DollarSign,
  Zap as ZapIcon
} from 'lucide-react';
import './Dashboard.css';
import TradingViewChart from './TradingViewChart';
import { useTheme } from './ThemeContext';
import { Tabs, TabsList, TabsTrigger } from "./components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./components/ui/select";
import { Input } from "./components/ui/input";
import { Button } from "./components/ui/button";
import { Card, CardContent } from "./components/ui/card";
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

const formatMarketCap = (value) => {
  if (!value) return "N/A";
  if (value >= 1e12) return `$${(value / 1e12).toFixed(2)}T`;
  if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
  if (value >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
  return `$${value.toLocaleString()}`;
};

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
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

function Dashboard() {
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

  const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawMethod, setWithdrawMethod] = useState('bank');

  const [savedCards, setSavedCards] = useState(() => JSON.parse(localStorage.getItem('investPro_cards')) || []);
  const [saveCardOption, setSaveCardOption] = useState(false);

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

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteTwoFactorCode, setDeleteTwoFactorCode] = useState('');

  const [priceAlerts, setPriceAlerts] = useState([]);
  const [isAlertModalOpen, setIsAlertModalOpen] = useState(false);
  const [selectedAlertAsset, setSelectedAlertAsset] = useState(null);
  const [alertTargetPrice, setAlertTargetPrice] = useState('');
  const [alertCondition, setAlertCondition] = useState('ABOVE');
  const [isDisable2FAModalOpen, setIsDisable2FAModalOpen] = useState(false);

  const [user, setUser] = useState(null);
  const [activeView, setActiveView] = useState('dashboard');
  const [searchQuery, setSearchQuery] = useState('');
  const [marketFilter, setMarketFilter] = useState('ALL');
  const [alerts, setAlerts] = useState([]);
  const [news, setNews] = useState([]);
  const [isNewsLoading, setIsNewsLoading] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState([
    { text: "Hello! I am your InvestPro AI assistant. How can I help you with the markets today?", sender: 'bot' }
  ]);
  const fileInputRef = useRef(null);
  const navigate = useNavigate();
  const { isPremium, toggleTheme, colors } = useTheme();
  const [marketPage, setMarketPage] = useState(1);
  const assetsPerPage = 10;

  const [chartTradeSide, setChartTradeSide] = useState('BUY');

  const portfolioPieData = portfolio.map(item => ({
    name: item.asset.symbol,
    value: parseFloat((item.quantity * item.asset.currentPrice).toFixed(2))
  }));

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#ef4444'];

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
    } catch (error) { }
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

      // Recompute portfolio derived values (currentValue, profitLoss, profitLossPercentage)
      // using the latest asset prices so dashboard/portfolio update in real-time
      setPortfolio(prev => {
        if (!prev || prev.length === 0) return prev;
        return prev.map(item => {
          const liveAsset = assets.find(a => a.id === item.assetId);
          if (!liveAsset) return item;
          const currentValue = item.quantity * liveAsset.currentPrice;
          const investedValue = item.quantity * (item.avgBuyPrice || liveAsset.currentPrice);
          const profitLoss = currentValue - investedValue;
          const profitLossPercentage = investedValue > 0 ? (profitLoss / investedValue) * 100 : 0;
          return {
            ...item,
            asset: liveAsset,
            currentValue,
            profitLoss,
            profitLossPercentage
          };
        });
      });
    }
  }, [assets]);

  useEffect(() => {
    if (user && user.id) {
      axios.get(`http://localhost:3000/api/alerts/${user.id}`)
        .then(res => setPriceAlerts(res.data))
        .catch(err => { });

      axios.get(`http://localhost:3000/api/auto-orders/${user.id}`)
        .then(res => setAutoOrders(res.data))
        .catch(err => { });
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
              audio.play().catch(err => { });
            } catch (e) { }

            toast.success(
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <strong style={{ fontSize: '16px' }}>🎯 Price Alert: {alert.symbol}</strong>
                <span>Hit your target of {formatCurrency(alert.targetPrice)}!</span>
              </div>,
              { duration: 8000, style: { background: '#10b981', color: 'white', border: 'none' } }
            );

            setPriceAlerts(prev => prev.filter(a => a.id !== alert.id));
            axios.delete(`http://localhost:3000/api/alerts/${alert.id}`).catch(() => { });
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
      } catch (err) { }
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
      }, 3000);

      return () => clearInterval(interval);
    }
  }, [navigate]);

  // Apply premium theme styles
  useEffect(() => {
    if (isPremium) {
      document.documentElement.style.setProperty('--bg-main', '#1a1d27');
      document.documentElement.style.setProperty('--bg-card', '#18202d');
      document.documentElement.style.setProperty('--bg-hover', '#212a38');
      document.documentElement.style.setProperty('--text-main', '#f0f3f7');
      document.documentElement.style.setProperty('--text-secondary', '#d1d5db');
      document.documentElement.style.setProperty('--text-muted', '#848e9c');
      document.documentElement.style.setProperty('--border-color', 'rgba(132, 142, 156, 0.2)');
      document.body.style.background = '#0b0e14';
    } else {
      // Reset to default CSS variables
      document.documentElement.style.removeProperty('--bg-main');
      document.documentElement.style.removeProperty('--bg-card');
      document.documentElement.style.removeProperty('--bg-hover');
      document.documentElement.style.removeProperty('--text-main');
      document.documentElement.style.removeProperty('--text-secondary');
      document.documentElement.style.removeProperty('--text-muted');
      document.documentElement.style.removeProperty('--border-color');
      document.body.style.background = '';
    }
  }, [isPremium]);

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
      } catch (err) { }
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
        text: `Your balance is below ${formatCurrency(50)}. Consider adding funds to avoid missing market opportunities.`,
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
            text: 'Your portfolio is heavily concentrated in Crypto (>80%). Consider diversifying into Stocks to reduce volatility risk.',
            icon: <Info size={20} />
          });
        } else if (stockTotal / totalValue > 0.8) {
          newAlerts.push({
            id: 'high-stocks',
            type: 'info',
            text: 'Your portfolio is heavily concentrated in Stocks (>80%). Consider adding Crypto for higher growth potential.',
            icon: <Info size={20} />
          });
        }
      }

      const bestAsset = [...portfolio].sort((a, b) => b.profitLossPercentage - a.profitLossPercentage)[0];
      if (bestAsset && bestAsset.profitLossPercentage > 5) {
        newAlerts.push({
          id: 'best-asset',
          type: 'success',
          text: `Great job! ${bestAsset.asset.name} is up ${bestAsset.profitLossPercentage.toFixed(2)}% in your portfolio.`,
          icon: <TrendingUp size={20} />
        });
      }

      const worstAsset = [...portfolio].sort((a, b) => a.profitLossPercentage - b.profitLossPercentage)[0];
      if (worstAsset && worstAsset.profitLossPercentage < -5) {
        newAlerts.push({
          id: 'worst-asset',
          type: 'danger',
          text: `${worstAsset.asset.name} is down by ${Math.abs(worstAsset.profitLossPercentage).toFixed(2)}%. Monitor this position closely.`,
          icon: <TrendingDown size={20} />
        });
      }
    } else if (user) {
      newAlerts.push({
        id: 'empty-portfolio',
        type: 'info',
        text: 'Your portfolio is empty. Head to the Markets tab to make your first trade and start investing!',
        icon: <Activity size={20} />
      });
    }

    setAlerts(newAlerts);
  }, [portfolio, user]);

  const handleRefreshChartData = async (assetId) => {
    try {
      const res = await axios.get(`http://localhost:3000/api/assets/history/${assetId}`);
      setChartData(res.data);
    } catch (err) { }
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
    } catch (err) { }
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
      if (isAdded) {
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
    // 1. Validare Sumă
    if (!depositData.amount || isNaN(depositData.amount) || parseFloat(depositData.amount) <= 0) {
      return toast.warning('Please enter a valid amount.');
    }

    // 2. Validare Numar Card (Fix 16 cifre)
    if (!depositData.cardNumber || depositData.cardNumber.length !== 16) {
      return toast.warning('Card number must be exactly 16 digits.');
    }

    // 3. Validare Dată Expirare
    if (!depositData.expiry || !/^(0[1-9]|1[0-2])\/\d{2}$/.test(depositData.expiry)) {
      return toast.warning('Expiry date must be in MM/YY format (e.g., 12/25).');
    }

    // Verificăm dacă nu e expirat deja cardul (lună/an)
    const [month, year] = depositData.expiry.split('/');
    const currentYear = new Date().getFullYear() % 100; // Ultimele 2 cifre din an (ex: 24)
    const currentMonth = new Date().getMonth() + 1;
    if (parseInt(year) < currentYear || (parseInt(year) === currentYear && parseInt(month) < currentMonth)) {
      return toast.warning('This card has expired.');
    }

    // 4. Validare CVV (Fix 3 cifre)
    if (!depositData.cvv || depositData.cvv.length !== 3) {
      return toast.warning('CVV must be exactly 3 digits.');
    }

    // 5. Validare Nume
    if (!depositData.cardName || depositData.cardName.trim().length < 3) {
      return toast.warning('Please enter a valid cardholder name.');
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

      // --- COD NOU PENTRU SALVARE CARD ---
      if (saveCardOption) {
        const newCard = {
          id: Date.now().toString(),
          last4: depositData.cardNumber.slice(-4),
          expiry: depositData.expiry,
          cardName: depositData.cardName
        };
        const updatedCards = [...savedCards, newCard];
        setSavedCards(updatedCards);
        localStorage.setItem('investPro_cards', JSON.stringify(updatedCards));
      }
      // --- END COD NOU ---

      toast.success('Funds deposited successfully!');
      setIsDepositModalOpen(false);
      setDepositData({ amount: '', cardNumber: '', cardName: '', expiry: '', cvv: '' });
      setSaveCardOption(false); // Resetăm căsuța
    } catch (err) {
      toast.error(err.response?.data?.message || 'Deposit failed');
    }
  };

  const handleWithdrawSubmit = async () => {
    if (!withdrawAmount || isNaN(withdrawAmount) || parseFloat(withdrawAmount) <= 0) {
      return toast.warning('Please enter a valid amount.');
    }
    if (parseFloat(withdrawAmount) > user.balance * (CURRENCY_RATES[user?.currency || 'USD'] || 1)) {
      return toast.warning('Insufficient funds.');
    }

    try {
      const amountInUSD = parseFloat(withdrawAmount) / (CURRENCY_RATES[user?.currency || 'USD'] || 1);

      const backendMethod = withdrawMethod.includes('card') ? 'card' : 'bank';

      const res = await axios.post('http://localhost:3000/api/trade/withdraw', {
        userId: user.id,
        amount: amountInUSD,
        method: backendMethod
      });

      const updatedUser = { ...user, balance: res.data.newBalance };
      setUser(updatedUser);
      localStorage.setItem('user', JSON.stringify(updatedUser));

      toast.success(
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <strong style={{ fontSize: '15px' }}>Withdrawal Successful</strong>
          <span>Requested: {formatCurrency(amountInUSD)}</span>
          <span style={{ color: '#ef4444' }}>Network Fee: -{formatCurrency(res.data.fee)}</span>
          <span style={{ color: '#10b981', fontWeight: 'bold' }}>You receive: {formatCurrency(res.data.received)}</span>
        </div>,
        { duration: 6000 }
      );

      setIsWithdrawModalOpen(false);
      setWithdrawAmount('');
      setWithdrawMethod('bank');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Withdrawal failed');
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

  const exportTransactionsPDF = () => {
    try {
      const doc = new jsPDF();

      doc.setFontSize(20);
      doc.setTextColor(15, 23, 42);
      doc.text('Transaction History - InvestPro', 14, 22);

      doc.setFontSize(11);
      doc.setTextColor(100);
      doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 30);
      doc.text(`Account: ${user?.name} (${user?.email})`, 14, 36);

      const tableColumn = ["Date", "Asset", "Type", "Quantity", "Price", "Total"];
      const tableRows = [];

      transactions.forEach(tx => {
        const isBuy = tx.type === 'BUY';
        const transactionData = [
          new Date(tx.date).toLocaleString(),
          `${tx.asset.name} (${tx.asset.symbol})`,
          tx.type,
          tx.quantity.toString(),
          formatCurrency(tx.priceAtPurchase),
          `${isBuy ? '-' : '+'}${formatCurrency(tx.quantity * tx.priceAtPurchase)}`
        ];
        tableRows.push(transactionData);
      });

      autoTable(doc, {
        head: [tableColumn],
        body: tableRows,
        startY: 45,
        theme: 'grid',
        headStyles: { fillColor: [15, 23, 42], textColor: 255 },
        alternateRowStyles: { fillColor: [248, 250, 252] },
      });

      doc.save(`InvestPro_Transactions_${new Date().toISOString().split('T')[0]}.pdf`);
      toast.success('PDF Exported Successfully!');
    } catch (error) {
      toast.error('Error generating PDF. Please try again.');
    }
  };

  const handleChatSubmit = async (e) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const userMsg = { text: chatInput, sender: 'user' };
    setChatMessages(prev => [...prev, userMsg]);
    setChatInput('');

    setChatMessages(prev => [...prev, { text: "...", sender: 'bot', isLoading: true }]);

    try {
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

      if (!apiKey) {
        throw new Error("API Key missing");
      }

      const promptText = `You are InvestPro AI, a smart financial assistant integrated into a trading platform. Answer concisely, friendly, professionally and strictly in English to the following user question: ${userMsg.text}`;

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            contents: [{ parts: [{ text: promptText }] }]
          })
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      const botText = data.candidates[0].content.parts[0].text;

      setChatMessages(prev => {
        const newMsgs = [...prev];
        newMsgs.pop();
        newMsgs.push({ text: botText, sender: 'bot' });
        return newMsgs;
      });

    } catch (error) {
      console.error(error);
      setChatMessages(prev => {
        const newMsgs = [...prev];
        newMsgs.pop();
        newMsgs.push({ text: "Sorry, I encountered a connection error with the AI server.", sender: 'bot' });
        return newMsgs;
      });
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('trustedDeviceToken');
    toast.info('Logged out successfully');
    navigate('/');
  };

  const handleGenerate2FA = async () => {
    try {
      const res = await axios.post('http://localhost:3000/api/auth/2fa/generate', { userId: user.id });
      setQrCodeUrl(res.data.qrCodeUrl);
      setIs2FAModalOpen(true);
    } catch (err) {
      toast.error('Failed to generate 2FA');
    }
  };

  const handleEnable2FA = async () => {
    if (twoFactorCode.length !== 6) return toast.warning('Please enter a 6-digit code');
    try {
      const res = await axios.post('http://localhost:3000/api/auth/2fa/enable', {
        userId: user.id,
        token: twoFactorCode
      });
      const updatedUser = { ...user, isTwoFactorEnabled: true };
      setUser(updatedUser);
      localStorage.setItem('user', JSON.stringify(updatedUser));
      toast.success(res.data.message);
      setIs2FAModalOpen(false);
      setTwoFactorCode('');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Invalid code');
    }
  };

  const handleDisable2FA = async () => {
    try {
      const res = await axios.post('http://localhost:3000/api/auth/2fa/disable', { userId: user.id });
      const updatedUser = { ...user, isTwoFactorEnabled: false };
      setUser(updatedUser);
      localStorage.setItem('user', JSON.stringify(updatedUser));
      toast.success(res.data.message || '2FA disabled successfully.');
      setIsDisable2FAModalOpen(false);
    } catch (err) {
      toast.error('Failed to disable 2FA');
    }
  };

  const handleDeleteAccount = async () => {
    if (!deletePassword && !(user.password && user.password.includes('Google!'))) {
      return toast.warning('Password is required to delete your account.');
    }
    if (user?.isTwoFactorEnabled && deleteTwoFactorCode.length !== 6) {
      return toast.warning('Valid 2FA code is required.');
    }

    try {
      await axios.delete(`http://localhost:3000/api/auth/delete-account/${user.id}`, {
        data: {
          password: deletePassword,
          twoFactorCode: deleteTwoFactorCode
        }
      });
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('trustedDeviceToken');
      toast.success('Account successfully deleted. We are sorry to see you go.');
      navigate('/');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error deleting account');
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

  const renderContent = () => {
    const totalPortfolioValue = portfolio.reduce((sum, item) => sum + item.currentValue, 0);
    const totalInvested = portfolio.reduce((sum, item) => sum + (item.quantity * item.avgBuyPrice), 0);
    const totalPnL = totalPortfolioValue - totalInvested;
    const isPnLPositive = totalPnL >= 0;
    const roiPercentage = totalInvested > 0 ? ((totalPnL / totalInvested) * 100).toFixed(2) : '0.00';

    const pnlData = portfolio.map(item => ({
      name: item.asset.symbol,
      pnl: parseFloat((item.profitLoss || 0).toFixed(2))
    })).sort((a, b) => b.pnl - a.pnl);

    switch (activeView) {
      case 'dashboard':
        return (
          <motion.div variants={containerVariants} initial="hidden" animate="show" className="dashboard-section" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <motion.header variants={itemVariants} className="header" style={{ marginBottom: '0', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '16px' }}>
              <div>
                <h1 style={{ fontSize: '28px', color: 'var(--text-main)', marginBottom: '8px' }}>Overview</h1>
                <p style={{ color: 'var(--text-muted)', margin: 0 }}>Welcome back, {user?.name || 'Investor'}. Here is what's happening with your money.</p>
              </div>
              <button
                onClick={() => setIsDepositModalOpen(true)}
                style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#3b82f6', color: 'white', border: 'none', padding: '12px 24px', borderRadius: '12px', fontSize: '15px', fontWeight: '700', cursor: 'pointer', transition: 'background 0.2s', boxShadow: '0 4px 15px rgba(59, 130, 246, 0.3)' }}
              >
                <CreditCard size={18} />
                Add Funds
              </button>
            </motion.header>

            {alerts.length > 0 && (
              <motion.div variants={itemVariants} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {alerts.map(alert => {
                  let bgColor, borderColor, textColor;
                  if (alert.type === 'warning' || alert.type === 'danger') {
                    bgColor = 'rgba(239, 68, 68, 0.15)';
                    borderColor = '#ef4444';
                    textColor = '#ef4444';
                  } else if (alert.type === 'success') {
                    bgColor = 'rgba(16, 185, 129, 0.15)';
                    borderColor = '#10b981';
                    textColor = '#10b981';
                  } else {
                    bgColor = 'rgba(59, 130, 246, 0.15)';
                    borderColor = '#3b82f6';
                    textColor = '#3b82f6';
                  }

                  return (
                    <div key={alert.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px', borderRadius: '12px', borderLeft: `4px solid ${borderColor}`, backgroundColor: bgColor, color: 'var(--text-main)', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)' }}>
                      <div style={{ color: textColor, display: 'flex', alignItems: 'center' }}>
                        {alert.icon}
                      </div>
                      <div style={{ fontSize: '14px', fontWeight: '600', color: textColor }}>{alert.text}</div>
                    </div>
                  );
                })}
              </motion.div>
            )}

            <motion.div variants={itemVariants} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px' }}>
              <motion.div variants={itemVariants} style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '8px' }}>Budget</p>
                  <h3 style={{ color: 'var(--text-main)', fontSize: '24px', fontWeight: 'bold', margin: '0' }}>{formatCurrency(user?.balance || 0)}</h3>
                </div>
                <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'linear-gradient(135deg, #3ea8ff, #0b78ff)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ color: 'white', fontSize: '24px', fontWeight: 'bold' }}>$</span>
                </div>
              </motion.div>

              <motion.div variants={itemVariants} style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '8px' }}>Total Profit</p>
                  <h3 style={{ color: 'var(--text-main)', fontSize: '24px', fontWeight: 'bold', margin: '0 0 8px 0' }}>{isPnLPositive ? '+' : ''}{formatCurrency(totalPnL)}</h3>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: isPnLPositive ? '#10b981' : '#ef4444', fontSize: '12px', fontWeight: '600' }}>
                    {isPnLPositive ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                    {Math.abs(roiPercentage)}%
                  </div>
                </div>
                <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'linear-gradient(135deg, #10b981, #059669)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <TrendingUp size={22} color="white" />
                </div>
              </motion.div>

              <motion.div variants={itemVariants} style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '8px' }}>Active Investments</p>
                  <h3 style={{ color: 'var(--text-main)', fontSize: '24px', fontWeight: 'bold', margin: '0' }}>{portfolio.length}</h3>
                </div>
                <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'linear-gradient(135deg, #d946ef, #9333ea)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <PieChartIcon size={22} color="white" />
                </div>
              </motion.div>

              <motion.div variants={itemVariants} style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '8px' }}>Total Trades</p>
                  <h3 style={{ color: 'var(--text-main)', fontSize: '24px', fontWeight: 'bold', margin: '0' }}>{transactions.length}</h3>
                </div>
                <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'linear-gradient(135deg, #f97316, #ea580c)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Activity size={22} color="white" />
                </div>
              </motion.div>
            </motion.div>

            <motion.div variants={itemVariants} style={{ display: 'flex', flexWrap: 'wrap', gap: '24px' }}>
              <div style={{ flex: '2 1 500px', backgroundColor: 'var(--bg-card)', padding: '24px', borderRadius: '20px', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column' }}>
                <h3 style={{ fontSize: '18px', margin: '0 0 24px 0', color: 'var(--text-main)' }}>Balance History</h3>
                <div style={{ width: '100%', height: '320px', position: 'relative' }}>
                  <ResponsiveContainer width="99%" height="100%" minWidth={1} minHeight={1}>
                    <LineChart data={balanceHistory}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isPremium ? '#2b3139' : '#e2e8f0'} opacity={0.5} />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: isPremium ? '#b0b8c4' : '#64748b', fontSize: 12 }} dy={10} minTickGap={30} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fill: isPremium ? '#b0b8c4' : '#64748b', fontSize: 12 }} dx={-10} tickFormatter={(value) => formatCurrency(value, 0)} />
                      <Tooltip
                        contentStyle={{ borderRadius: '12px', border: `1px solid ${isPremium ? '#2b3139' : '#e2e8f0'}`, boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)', backgroundColor: isPremium ? '#1a1d27' : '#ffffff', color: isPremium ? '#f0f3f7' : '#0f172a' }}
                        itemStyle={{ color: '#3b82f6', fontWeight: 'bold' }}
                        labelStyle={{ color: isPremium ? '#b0b8c4' : '#64748b', fontSize: '12px' }}
                        formatter={(value) => [formatCurrency(value), 'Balance']}
                      />
                      <Line type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={3} dot={{ r: 0 }} activeDot={{ r: 6, fill: '#3b82f6', stroke: 'var(--bg-card)', strokeWidth: 3 }} isAnimationActive={true} animationDuration={1500} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div style={{ flex: '1 1 300px', backgroundColor: 'var(--bg-card)', padding: '24px', borderRadius: '20px', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column' }}>
                <h3 style={{ fontSize: '18px', margin: '0 0 24px 0', color: 'var(--text-main)' }}>Asset Allocation</h3>
                {portfolioPieData.length > 0 ? (
                  <div style={{ width: '100%', flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ width: '100%', height: '260px', position: 'relative' }}>
                      <ResponsiveContainer width="99%" height="100%" minWidth={1} minHeight={1}>
                        <PieChart>
                          <Pie
                            data={portfolioPieData}
                            cx="50%"
                            cy="50%"
                            innerRadius={75}
                            outerRadius={105}
                            paddingAngle={5}
                            cornerRadius={6}
                            dataKey="value"
                            stroke="none"
                            isAnimationActive={true}
                            animationDuration={1500}
                          >
                            {portfolioPieData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip
                            contentStyle={{ backgroundColor: isPremium ? '#1a1d27' : '#ffffff', border: `1px solid ${isPremium ? '#2b3139' : '#e2e8f0'}`, borderRadius: '12px', color: isPremium ? '#f0f3f7' : '#0f172a' }}
                            itemStyle={{ fontWeight: 'bold', color: isPremium ? '#f0f3f7' : '#0f172a' }}
                            labelStyle={{ color: isPremium ? '#b0b8c4' : '#64748b', fontSize: '12px' }}
                            formatter={(value) => formatCurrency(value)}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', justifyContent: 'center', marginTop: '24px' }}>
                      {portfolioPieData.map((entry, index) => (
                        <div key={entry.name} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: 'var(--text-muted)', fontWeight: '600' }}>
                          <div style={{ width: '12px', height: '12px', borderRadius: '4px', backgroundColor: COLORS[index % COLORS.length] }}></div>
                          {entry.name}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '14px', textAlign: 'center', backgroundColor: 'var(--bg-main)', borderRadius: '12px', padding: '20px' }}>
                    No assets in portfolio yet.<br /><br />Buy some assets to see your allocation.
                  </div>
                )}
              </div>
            </motion.div>

            <motion.div variants={itemVariants} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '24px' }}>

              <div style={{ backgroundColor: 'var(--bg-card)', padding: '24px', borderRadius: '20px', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                  <h3 style={{ margin: 0, fontSize: '18px', color: 'var(--text-main)' }}>Watchlist</h3>
                </div>

                {watchlist.length === 0 ? (
                  <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '15px', border: '1px dashed var(--border-color)', borderRadius: '16px' }}>
                    Your watchlist is empty. Go to Markets to add assets.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {watchlist.map(item => {
                      const isPositive = item.asset.change24h >= 0;
                      return (
                        <div
                          key={item.id}
                          onClick={() => handleOpenChart(item.asset)}
                          style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', border: '1px solid var(--border-color)', borderRadius: '12px', backgroundColor: 'var(--bg-main)', cursor: 'pointer', transition: 'all 0.2s' }}
                          onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#3b82f6'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border-color)'; }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{ width: '40px', height: '40px', borderRadius: '10px', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', color: 'var(--text-main)' }}>
                              {item?.asset?.symbol ? item.asset.symbol.substring(0, 2) : '??'}
                            </div>
                            <div>
                              <div style={{ fontWeight: '700', color: 'var(--text-main)', fontSize: '15px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                {item.asset.symbol} <Star size={14} fill="#fbbf24" color="#fbbf24" />
                              </div>
                              <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '2px' }}>{item.asset.name}</div>
                            </div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontWeight: '700', color: 'var(--text-main)', fontSize: '15px' }}>{formatCurrency(item.asset.currentPrice)}</div>
                            <div style={{ fontSize: '13px', color: isPositive ? '#10b981' : '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px', marginTop: '2px', fontWeight: '600' }}>
                              {isPositive ? <TrendingUp size={14} /> : <TrendingDown size={14} />} {Math.abs(item.asset.change24h || 0).toFixed(2)}%
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div style={{ backgroundColor: 'var(--bg-card)', padding: '24px', borderRadius: '20px', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                  <h3 style={{ margin: 0, fontSize: '18px', color: 'var(--text-main)' }}>Price Alerts</h3>
                  <div style={{ padding: '6px', borderRadius: '8px', backgroundColor: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6' }}>
                    <Bell size={18} />
                  </div>
                </div>

                {priceAlerts.length === 0 ? (
                  <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '15px', border: '1px dashed var(--border-color)', borderRadius: '16px' }}>
                    No active alerts. Add them from the Markets page.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {priceAlerts.map(alert => (
                      <div key={alert.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', backgroundColor: 'var(--bg-main)', borderRadius: '12px', border: '1px solid var(--border-color)', transition: 'all 0.2s' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div style={{ width: '40px', height: '40px', borderRadius: '10px', backgroundColor: alert.condition === 'ABOVE' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: alert.condition === 'ABOVE' ? '#10b981' : '#ef4444', fontWeight: 'bold' }}>
                            {alert?.symbol ? alert.symbol.substring(0, 2) : '??'}
                          </div>
                          <div>
                            <div style={{ fontWeight: '700', color: 'var(--text-main)', fontSize: '15px' }}>{alert.symbol}</div>
                            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                              Target: {alert.condition === 'ABOVE' ? '↑' : '↓'} {formatCurrency(alert.targetPrice)}
                            </div>
                          </div>
                        </div>
                        <button onClick={() => handleDeleteAlert(alert.id)} style={{ background: 'transparent', color: '#ef4444', border: 'none', cursor: 'pointer', padding: '8px', opacity: '0.8', display: 'flex', alignItems: 'center' }}>
                          <X size={18} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div style={{ backgroundColor: 'var(--bg-card)', padding: '24px', borderRadius: '20px', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                  <h3 style={{ margin: 0, fontSize: '18px', color: 'var(--text-main)' }}>Recent Transactions</h3>
                  <button
                    onClick={() => setActiveView('transactions')}
                    style={{ background: 'none', border: 'none', color: '#3b82f6', fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}
                  >
                    View All
                  </button>
                </div>

                {transactions.length === 0 ? (
                  <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '15px', border: '1px dashed var(--border-color)', borderRadius: '16px' }}>
                    No recent transactions.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {transactions.slice(0, 5).map(tx => {
                      const isBuy = tx.type === 'BUY';
                      return (
                        <div key={tx.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', border: '1px solid var(--border-color)', borderRadius: '12px', backgroundColor: 'var(--bg-main)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{ width: '40px', height: '40px', borderRadius: '10px', backgroundColor: isBuy ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: isBuy ? '#10b981' : '#ef4444' }}>
                              {isBuy ? <ArrowDownRight size={20} /> : <ArrowUpRight size={20} />}
                            </div>
                            <div>
                              <div style={{ fontWeight: '700', color: 'var(--text-main)', fontSize: '15px' }}>
                                {isBuy ? 'Bought' : 'Sold'} {tx.asset.symbol}
                              </div>
                              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                                {new Date(tx.date).toLocaleDateString()}
                              </div>
                            </div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontWeight: '700', color: isBuy ? '#ef4444' : '#10b981', fontSize: '15px' }}>
                              {isBuy ? '-' : '+'}{formatCurrency(tx.quantity * tx.priceAtPurchase)}
                            </div>
                            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                              {tx.quantity} units
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

            </motion.div>
          </motion.div>
        );

      case 'markets':
        const filteredAssets = assets.filter(asset => {
          const matchesSearch = asset.name.toLowerCase().includes(searchQuery.toLowerCase()) || asset.symbol.toLowerCase().includes(searchQuery.toLowerCase());
          const matchesFilter = marketFilter === 'ALL' || asset.type === marketFilter;
          return matchesSearch && matchesFilter;
        });

        const totalPages = Math.ceil(filteredAssets.length / assetsPerPage);
        const indexOfLastAsset = marketPage * assetsPerPage;
        const indexOfFirstAsset = indexOfLastAsset - assetsPerPage;
        const currentAssets = filteredAssets.slice(indexOfFirstAsset, indexOfLastAsset);

        const topMovers = [...assets]
          .sort((a, b) => Math.abs(b.change24h || 0) - Math.abs(a.change24h || 0))
          .slice(0, 5);

        return (
          <motion.div variants={containerVariants} initial="hidden" animate="show" className="markets-section">
            <motion.header variants={itemVariants} className="header" style={{ marginBottom: '24px' }}>
              <h1 style={{ fontSize: '28px', color: 'var(--text-main)', marginBottom: '8px' }}>Markets</h1>
              <p style={{ color: 'var(--text-muted)', margin: 0 }}>Explore assets and expand your portfolio in real-time.</p>
            </motion.header>

            {topMovers.length > 0 && (
              <motion.div variants={itemVariants} style={{ backgroundColor: 'var(--bg-card)', padding: '24px', borderRadius: '20px', border: '1px solid var(--border-color)', marginBottom: '32px' }}>
                <h3 style={{ margin: '0 0 20px 0', fontSize: '18px', color: 'var(--text-main)' }}>Top Movers</h3>
                <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                  {topMovers.map(asset => {
                    const isPositive = asset.change24h >= 0;
                    return (
                      <div
                        key={`top-${asset.id}`}
                        onClick={() => handleOpenChart(asset)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          padding: '10px 20px',
                          borderRadius: '12px',
                          backgroundColor: isPositive ? 'rgba(16, 185, 129, 0.05)' : 'rgba(239, 68, 68, 0.05)',
                          border: `1px solid ${isPositive ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`,
                          cursor: 'pointer',
                          transition: 'transform 0.2s',
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                        onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                      >
                        <span style={{ fontWeight: '700', color: 'var(--text-main)', fontSize: '15px' }}>{asset.symbol}</span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: isPositive ? '#10b981' : '#ef4444', fontWeight: '700', fontSize: '15px' }}>
                          {isPositive ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
                          {Math.abs(asset.change24h || 0).toFixed(1)}%
                        </span>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            )}

            <motion.div variants={itemVariants} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
              <div className="search-container" style={{ margin: 0, backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
                <Search className="search-icon" size={20} color="var(--text-muted)" />
                <input
                  type="text"
                  placeholder="Search by symbol or name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="search-input"
                  style={{ backgroundColor: 'transparent', color: 'var(--text-main)' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => setMarketFilter('ALL')}
                  style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid var(--border-color)', background: marketFilter === 'ALL' ? '#3b82f6' : 'var(--bg-card)', color: marketFilter === 'ALL' ? 'white' : 'var(--text-muted)', cursor: 'pointer', fontWeight: '600' }}
                >
                  All
                </button>
                <button
                  onClick={() => setMarketFilter('CRYPTO')}
                  style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid var(--border-color)', background: marketFilter === 'CRYPTO' ? '#3b82f6' : 'var(--bg-card)', color: marketFilter === 'CRYPTO' ? 'white' : 'var(--text-muted)', cursor: 'pointer', fontWeight: '600' }}
                >
                  Crypto
                </button>
                <button
                  onClick={() => setMarketFilter('STOCK')}
                  style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid var(--border-color)', background: marketFilter === 'STOCK' ? '#3b82f6' : 'var(--bg-card)', color: marketFilter === 'STOCK' ? 'white' : 'var(--text-muted)', cursor: 'pointer', fontWeight: '600' }}
                >
                  Stocks
                </button>
              </div>
            </motion.div>

            <motion.div variants={itemVariants} className="assets-list-container" style={{ marginTop: 0 }}>
              {currentAssets.map(asset => {
                const isPositive = asset.change24h >= 0;
                return (
                  <motion.div variants={itemVariants} key={asset.id} className="asset-row-clean" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
                    <div
                      className="asset-info-main"
                      onClick={() => handleOpenChart(asset)}
                      style={{ cursor: 'pointer' }}
                    >
                      <span className="asset-symbol" style={{ color: 'var(--text-main)' }}>{asset.symbol}</span>
                      <span className="asset-name" style={{ color: 'var(--text-muted)' }}>{asset.name}</span>
                      <span className="asset-type-badge">{asset.type}</span>
                    </div>

                    <div className="asset-price-section" style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
                      <div className="price-wrapper" style={{ textAlign: 'right' }}>
                        <div style={{ color: 'var(--text-main)', fontSize: '16px', fontWeight: '800' }}>{formatCurrency(asset.currentPrice)}</div>
                        <div className={`price-change ${isPositive ? 'positive' : 'negative'}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px', fontSize: '13px', fontWeight: '600' }}>
                          {isPositive ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                          {Math.abs(asset.change24h || 0).toFixed(2)}%
                        </div>
                      </div>

                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handleOpenChart(asset)}
                        style={{
                          background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
                          border: 'none',
                          borderRadius: '10px',
                          padding: '10px 24px',
                          color: 'white',
                          fontWeight: '700',
                          cursor: 'pointer',
                          boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)'
                        }}
                      >
                        Trade
                      </motion.button>
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>

            {totalPages > 1 && (
              <motion.div variants={itemVariants} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '16px', marginTop: '32px', paddingBottom: '16px' }}>
                <button
                  onClick={() => setMarketPage(prev => Math.max(1, prev - 1))}
                  disabled={marketPage === 1}
                  style={{ padding: '8px 20px', borderRadius: '8px', border: '1px solid var(--border-color)', background: marketPage === 1 ? 'transparent' : 'var(--bg-card)', color: marketPage === 1 ? 'var(--text-muted)' : 'var(--text-main)', cursor: marketPage === 1 ? 'not-allowed' : 'pointer', fontWeight: '600', opacity: marketPage === 1 ? 0.5 : 1, transition: 'all 0.2s ease' }}
                >
                  Previous
                </button>
                <span style={{ color: 'var(--text-muted)', fontSize: '14px', fontWeight: '600' }}>
                  Page {marketPage} of {totalPages}
                </span>
                <button
                  onClick={() => setMarketPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={marketPage === totalPages}
                  style={{ padding: '8px 20px', borderRadius: '8px', border: '1px solid var(--border-color)', background: marketPage === totalPages ? 'transparent' : 'var(--bg-card)', color: marketPage === totalPages ? 'var(--text-muted)' : 'var(--text-main)', cursor: marketPage === totalPages ? 'not-allowed' : 'pointer', fontWeight: '600', opacity: marketPage === totalPages ? 0.5 : 1, transition: 'all 0.2s ease' }}
                >
                  Next
                </button>
              </motion.div>
            )}
          </motion.div>
        );

      case 'portfolio':
        return (
          <motion.div variants={containerVariants} initial="hidden" animate="show" className="portfolio-section" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <motion.header variants={itemVariants} className="header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '8px' }}>
              <div>
                <h1 style={{ fontSize: '28px', color: 'var(--text-main)', marginBottom: '8px' }}>My Portfolio</h1>
                <p style={{ color: 'var(--text-muted)', margin: 0 }}>Track your assets, investments and overall performance.</p>
              </div>

              <div style={{ display: 'flex', background: 'var(--bg-main)', borderRadius: '12px', padding: '4px', border: '1px solid var(--border-color)', flexShrink: 0 }}>
                {['USD', 'EUR', 'RON'].map(curr => (
                  <button
                    key={curr}
                    onClick={() => handleCurrencyChange(curr)}
                    style={{
                      padding: '8px 20px',
                      border: 'none',
                      background: user?.currency === curr ? 'var(--bg-card)' : 'transparent',
                      color: user?.currency === curr ? 'var(--text-main)' : 'var(--text-muted)',
                      borderRadius: '8px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      boxShadow: user?.currency === curr ? '0 2px 4px rgba(0,0,0,0.1)' : 'none',
                      transition: 'all 0.2s ease',
                      fontSize: '14px'
                    }}
                  >
                    {curr}
                  </button>
                ))}
              </div>
            </motion.header>

            <motion.div variants={itemVariants} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px' }}>
              <motion.div variants={itemVariants} style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '24px', display: 'flex', flexDirection: 'column' }}>
                <span style={{ color: 'var(--text-muted)', fontSize: '14px', marginBottom: '12px' }}>Total Value</span>
                <span style={{ color: 'var(--text-main)', fontSize: '28px', fontWeight: 'bold', margin: 0, letterSpacing: '-0.5px' }}>
                  {formatCurrency(totalPortfolioValue)}
                </span>
              </motion.div>

              <motion.div variants={itemVariants} style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '24px', display: 'flex', flexDirection: 'column' }}>
                <span style={{ color: 'var(--text-muted)', fontSize: '14px', marginBottom: '12px' }}>Initial Investment</span>
                <span style={{ color: 'var(--text-main)', fontSize: '28px', fontWeight: 'bold', margin: 0, letterSpacing: '-0.5px' }}>
                  {formatCurrency(totalInvested)}
                </span>
              </motion.div>

              <motion.div variants={itemVariants} style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '24px', display: 'flex', flexDirection: 'column' }}>
                <span style={{ color: 'var(--text-muted)', fontSize: '14px', marginBottom: '12px' }}>Profit/Loss</span>
                <span style={{ color: isPnLPositive ? '#10b981' : '#ef4444', fontSize: '28px', fontWeight: 'bold', margin: 0, letterSpacing: '-0.5px' }}>
                  {isPnLPositive ? '+' : ''}{formatCurrency(totalPnL)}
                </span>
              </motion.div>

              <motion.div variants={itemVariants} style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '24px', display: 'flex', flexDirection: 'column' }}>
                <span style={{ color: 'var(--text-muted)', fontSize: '14px', marginBottom: '12px' }}>ROI Yield</span>
                <span style={{ color: 'var(--text-main)', fontSize: '28px', fontWeight: 'bold', marginBottom: '16px', letterSpacing: '-0.5px' }}>
                  {isPnLPositive ? '+' : ''}{roiPercentage}%
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: isPnLPositive ? '#10b981' : '#ef4444', fontSize: '13px', fontWeight: '600' }}>
                  {isPnLPositive ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
                  Return on Investment
                </div>
              </motion.div>
            </motion.div>

            <motion.div variants={itemVariants} style={{ backgroundColor: 'var(--bg-card)', padding: '24px', borderRadius: '20px', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', marginTop: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h3 style={{ margin: 0, fontSize: '18px', color: 'var(--text-main)' }}>Pending Auto Orders</h3>
                <div style={{ padding: '6px', borderRadius: '8px', backgroundColor: 'rgba(0, 0, 0, 0.1)', color: '#3b82f6' }}>
                  <Clock size={18} />
                </div>
              </div>

              {autoOrders.length === 0 ? (
                <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)', border: '1px dashed var(--border-color)', borderRadius: '12px', fontSize: '14px' }}>
                  No pending auto orders. Set a Limit Order when buying or selling.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {autoOrders.map(order => (
                    <div key={order.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', backgroundColor: 'var(--bg-main)', borderRadius: '12px', border: '1px solid var(--border-color)', transition: 'all 0.2s' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                        <div style={{ width: '40px', height: '40px', borderRadius: '10px', backgroundColor: order.type === 'BUY' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: order.type === 'BUY' ? '#10b981' : '#ef4444', fontWeight: 'bold', fontSize: '12px' }}>
                          {order.type}
                        </div>
                        <div>
                          <p style={{ margin: 0, fontWeight: 'bold', color: 'var(--text-main)' }}>{order.quantity} {order.symbol}</p>
                          <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: 'var(--text-muted)' }}>
                            Target: {formatCurrency(order.targetPrice)}
                          </p>
                        </div>
                      </div>
                      <button onClick={() => handleCancelAutoOrder(order.id)} style={{ background: 'transparent', color: '#ef4444', border: 'none', cursor: 'pointer', padding: '8px' }}>
                        <X size={18} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>

            <motion.div variants={itemVariants} style={{ backgroundColor: 'var(--bg-card)', padding: '24px', borderRadius: '20px', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column' }}>
              <h3 style={{ fontSize: '20px', margin: '0 0 24px 0', color: 'var(--text-main)' }}>Profit/Loss</h3>
              <div style={{ width: '100%', height: '320px', position: 'relative' }}>
                {portfolio.length > 0 ? (
                  <ResponsiveContainer width="99%" height="100%" minWidth={1} minHeight={1}>
                    <BarChart data={pnlData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isPremium ? '#2b3139' : '#e2e8f0'} opacity={0.4} />
                      <XAxis dataKey="name" stroke={isPremium ? '#b0b8c4' : '#64748b'} tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: isPremium ? '#b0b8c4' : '#64748b' }} dy={10} />
                      <YAxis stroke={isPremium ? '#b0b8c4' : '#64748b'} tickLine={false} axisLine={false} tickFormatter={(val) => `$${val}`} tick={{ fontSize: 12, fill: isPremium ? '#b0b8c4' : '#64748b' }} dx={-10} />
                      <Tooltip
                        cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }}
                        contentStyle={{
                          backgroundColor: isPremium ? '#1a1d27' : '#ffffff',
                          border: `1px solid ${isPremium ? '#2b3139' : '#e2e8f0'}`,
                          borderRadius: '8px',
                          color: isPremium ? '#f0f3f7' : '#0f172a'
                        }}
                        labelStyle={{ color: isPremium ? '#b0b8c4' : '#64748b', fontSize: '12px' }}
                        formatter={(value) => [formatCurrency(value), 'Profit/Loss']}
                      />
                      <Bar dataKey="pnl" radius={[4, 4, 4, 4]}>
                        {pnlData.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={entry.pnl >= 0 ? '#10b981' : '#ef4444'}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', border: '1px dashed var(--border-color)', borderRadius: '12px' }}>
                    Buy assets to see your Profit/Loss chart
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', justifyContent: 'center', gap: '32px', marginTop: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: 'var(--text-main)', fontWeight: '500' }}>
                  <div style={{ width: '12px', height: '12px', borderRadius: '50%', border: '2px solid #3b82f6', backgroundColor: 'transparent' }}></div>
                  Your Portfolio
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: 'var(--text-muted)' }}>
                  <div style={{ width: '12px', height: '2px', backgroundColor: '#64748b' }}></div>
                  Market
                </div>
              </div>
            </motion.div>

            <motion.div variants={itemVariants} className="table-container" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
              <table className="portfolio-table">
                <thead>
                  <tr>
                    <th>ASSET NAME</th>
                    <th>SYMBOL</th>
                    <th>QUANTITY</th>
                    <th>AVG. BUY PRICE</th>
                    <th>CURRENT PRICE</th>
                    <th>TOTAL VALUE</th>
                    <th>PROFIT/LOSS</th>
                    <th>ACTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  {portfolio.length === 0 ? (
                    <tr>
                      <td colSpan="8" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                        No assets found. Start trading to build your portfolio.
                      </td>
                    </tr>
                  ) : (
                    portfolio.map(item => {
                      const isPositive = item.profitLoss >= 0;
                      return (
                        <motion.tr variants={itemVariants} key={item.id}>
                          <td>
                            <div className="table-asset-name" onClick={() => handleOpenChart(item.asset)} style={{ cursor: 'pointer', color: 'var(--text-main)' }}>
                              {item.asset.name}
                            </div>
                          </td>
                          <td><span className="badge">{item.asset.symbol}</span></td>
                          <td>{item.quantity}</td>
                          <td>{formatCurrency(item.avgBuyPrice)}</td>
                          <td className="text-blue" style={{ fontWeight: '600' }}>{formatCurrency(item.asset.currentPrice)}</td>
                          <td>{formatCurrency(item.currentValue)}</td>
                          <td>
                            <span className={`pnl-badge ${isPositive ? 'pnl-positive' : 'pnl-negative'}`}>
                              {isPositive ? '+' : ''}{formatCurrency(item.profitLoss)} ({isPositive ? '+' : ''}{item.profitLossPercentage.toFixed(2)}%)
                            </span>
                          </td>
                          <td>
                            <button
                              className="sell-btn"
                              onClick={() => {
                                setSelectedSellAsset(item);
                                setIsSellModalOpen(true);
                                setOrderType('MARKET');
                                setLimitPrice('');
                              }}
                            >
                              Sell
                            </button>
                          </td>
                        </motion.tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </motion.div>
          </motion.div>
        );

      case 'transactions':
        return (
          <motion.div variants={containerVariants} initial="hidden" animate="show" className="transactions-section">
            <motion.header variants={itemVariants} className="header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <h1 style={{ color: 'var(--text-main)' }}>Transaction History</h1>
                <p style={{ color: 'var(--text-muted)' }}>View all your past trades and operations.</p>
              </div>
              <button
                onClick={exportTransactionsPDF}
                disabled={transactions.length === 0}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 20px',
                  backgroundColor: transactions.length === 0 ? 'var(--border-color)' : '#3b82f6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: transactions.length === 0 ? 'not-allowed' : 'pointer',
                  fontWeight: '600'
                }}
              >
                <Download size={18} />
                Export PDF
              </button>
            </motion.header>

            <motion.div variants={itemVariants} className="table-container" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
              <table className="portfolio-table">
                <thead>
                  <tr>
                    <th>DATE</th>
                    <th>ASSET</th>
                    <th>TYPE</th>
                    <th>QUANTITY</th>
                    <th>PRICE</th>
                    <th>TOTAL</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.length === 0 ? (
                    <tr>
                      <td colSpan="6" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                        No transactions found. Start trading to see your history here.
                      </td>
                    </tr>
                  ) : (
                    transactions.map(tx => {
                      const isBuy = tx.type === 'BUY';
                      return (
                        <motion.tr variants={itemVariants} key={tx.id}>
                          <td>{new Date(tx.date).toLocaleString()}</td>
                          <td>
                            <div className="table-asset-name" style={{ color: 'var(--text-main)' }}>
                              {tx.asset.name} <span className="badge">{tx.asset.symbol}</span>
                            </div>
                          </td>
                          <td>
                            <span
                              className="badge"
                              style={{
                                backgroundColor: isBuy ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                                color: isBuy ? '#10b981' : '#ef4444'
                              }}
                            >
                              {tx.type}
                            </span>
                          </td>
                          <td>{tx.quantity}</td>
                          <td>{formatCurrency(tx.priceAtPurchase)}</td>
                          <td style={{ fontWeight: '600', color: isBuy ? '#ef4444' : '#10b981' }}>
                            {isBuy ? '-' : '+'}{formatCurrency(tx.quantity * tx.priceAtPurchase)}
                          </td>
                        </motion.tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </motion.div>
          </motion.div>
        );

      case 'news':
        const getImageUrl = (item) => {
          if (item.thumbnail) return item.thumbnail;
          if (item.enclosure && item.enclosure.link) return item.enclosure.link;
          return 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?auto=format&fit=crop&w=600&q=80';
        };

        return (
          <motion.div variants={containerVariants} initial="hidden" animate="show" className="news-section">
            <motion.header variants={itemVariants} className="header" style={{ marginBottom: '32px' }}>
              <div>
                <h1 style={{ fontSize: '32px', fontWeight: '800', background: 'linear-gradient(90deg, var(--text-main), #3b82f6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', margin: '0 0 8px 0' }}>
                  Market Intelligence
                </h1>
                <p style={{ fontSize: '16px', color: 'var(--text-muted)', margin: 0 }}>
                  Curated financial news, analysis, and breaking updates.
                </p>
              </div>
            </motion.header>

            {isNewsLoading ? (
              <motion.div variants={itemVariants} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '300px' }}>
                <div style={{ width: '40px', height: '40px', border: '4px solid var(--border-color)', borderTop: '4px solid #3b82f6', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
              </motion.div>
            ) : news.length > 0 ? (
              <motion.div variants={itemVariants} style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>

                <motion.a variants={itemVariants} href={news[0].link} target="_blank" rel="noreferrer" style={{ display: 'block', position: 'relative', height: '400px', borderRadius: '24px', overflow: 'hidden', textDecoration: 'none', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)' }}>
                  <img src={getImageUrl(news[0])} alt="Featured" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(15, 23, 42, 0.95) 0%, rgba(15, 23, 42, 0.4) 50%, transparent 100%)' }} />
                  <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '40px' }}>
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '16px' }}>
                      <span style={{ backgroundColor: '#3b82f6', color: 'white', padding: '6px 14px', borderRadius: '20px', fontSize: '12px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        Top Story
                      </span>
                      <span style={{ color: '#cbd5e1', fontSize: '14px', fontWeight: '500' }}>
                        {new Date(news[0].pubDate).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                      </span>
                    </div>
                    <h2 style={{ color: 'white', fontSize: '36px', fontWeight: '800', margin: '0 0 16px 0', lineHeight: '1.2', maxWidth: '800px' }}>
                      {news[0].title}
                    </h2>
                    <p style={{ color: '#94a3b8', fontSize: '16px', margin: 0, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', maxWidth: '800px' }}>
                      Click to read the full analysis and market impact.
                    </p>
                  </div>
                </motion.a>

                <motion.div variants={itemVariants} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '24px' }}>
                  {news.slice(1).map((item, index) => (
                    <motion.a
                      variants={itemVariants}
                      key={index}
                      href={item.link}
                      target="_blank"
                      rel="noreferrer"
                      style={{ backgroundColor: 'var(--bg-card)', borderRadius: '20px', overflow: 'hidden', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', textDecoration: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)', transition: 'transform 0.2s ease, box-shadow 0.2s ease' }}
                      onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-6px)'; e.currentTarget.style.boxShadow = '0 20px 25px -5px rgba(0, 0, 0, 0.1)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.05)'; }}
                    >
                      <div style={{ position: 'relative', height: '220px' }}>
                        <img src={getImageUrl(item)} alt="News" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        <div style={{ position: 'absolute', top: '16px', left: '16px', backgroundColor: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(8px)', color: 'white', padding: '6px 12px', borderRadius: '12px', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                          Finance
                        </div>
                      </div>
                      <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', flex: 1 }}>
                        <h3 style={{ fontSize: '18px', color: 'var(--text-main)', margin: '0 0 16px 0', lineHeight: '1.5', fontWeight: '700', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                          {item.title}
                        </h3>
                        <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
                          <span style={{ fontSize: '13px', fontWeight: '700', color: '#3b82f6' }}>Market News</span>
                          <span style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: '600' }}>
                            {new Date(item.pubDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                          </span>
                        </div>
                      </div>
                    </motion.a>
                  ))}
                </motion.div>
              </motion.div>
            ) : (
              <motion.div variants={itemVariants} style={{ padding: '60px 40px', color: 'var(--text-muted)', textAlign: 'center', backgroundColor: 'var(--bg-card)', borderRadius: '24px', border: '1px dashed var(--border-color)' }}>
                <Newspaper size={64} style={{ margin: '0 auto 24px auto', opacity: 0.3, color: '#3b82f6' }} />
                <h3 style={{ margin: '0 0 8px 0', color: 'var(--text-main)', fontSize: '20px' }}>No news available</h3>
                <p style={{ margin: 0, fontSize: '16px' }}>Check back later for updates.</p>
              </motion.div>
            )}
          </motion.div>
        );

      case 'settings':
        return (
          <motion.div variants={containerVariants} initial="hidden" animate="show" className="p-6 md:p-8 max-w-7xl mx-auto">
            <motion.header variants={itemVariants} className="mb-10">
              <h1 style={{ color: 'var(--text-main)', fontSize: '32px', fontWeight: '800', marginBottom: '8px' }}>Account Settings</h1>
              <p style={{ color: 'var(--text-muted)', fontSize: '16px' }}>Manage your security preferences, personal information, and funds.</p>
            </motion.header>

            <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-2 gap-8">

              <div className="flex flex-col gap-8">
                <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
                  <div className="flex items-center gap-3 px-6 py-5 border-b" style={{ borderColor: 'var(--border-color)' }}>
                    <div className="p-2 rounded-lg" style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)' }}>
                      <User size={20} color="#3b82f6" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold" style={{ color: 'var(--text-main)', margin: 0 }}>Profile Details</h3>
                      <p className="text-xs" style={{ color: 'var(--text-muted)', margin: 0 }}>Update your personal information and avatar</p>
                    </div>
                  </div>

                  <div className="p-6">
                    <form onSubmit={async (e) => {
                      e.preventDefault();
                      try {
                        const response = await axios.put('http://localhost:3000/api/auth/update-profile', {
                          userId: user.id,
                          name: user.name,
                          currency: user.currency || 'USD',
                          profilePicture: user.profilePicture
                        });
                        localStorage.setItem('user', JSON.stringify(response.data.user));
                        setUser(response.data.user);
                        toast.success('Profile preferences updated!');
                      } catch (err) {
                        toast.error('Failed to update profile');
                      }
                    }}>
                      <div className="flex items-center gap-6 mb-6">
                        <div className="h-20 w-20 rounded-full overflow-hidden flex items-center justify-center shrink-0 border-2" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-main)' }}>
                          {user.profilePicture ? (
                            <img src={user.profilePicture} alt="Profile" className="h-full w-full object-cover" />
                          ) : (
                            <span className="text-2xl font-bold" style={{ color: 'var(--text-muted)' }}>{user.name ? user.name.charAt(0).toUpperCase() : 'U'}</span>
                          )}
                        </div>
                        <div className="flex flex-col gap-2">
                          <input
                            type="file"
                            accept="image/*"
                            ref={fileInputRef}
                            style={{ display: 'none' }}
                            onChange={(e) => {
                              const file = e.target.files[0];
                              if (file) {
                                if (file.size > 5000000) return toast.error('File is too large. Maximum size is 5MB.');
                                const reader = new FileReader();
                                reader.onloadend = () => setUser({ ...user, profilePicture: reader.result });
                                reader.readAsDataURL(file);
                              }
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => fileInputRef.current.click()}
                            className="px-4 py-2 rounded-lg text-sm font-semibold transition-all hover:opacity-80"
                            style={{ backgroundColor: 'var(--bg-main)', border: '1px solid var(--border-color)', color: 'var(--text-main)', width: 'fit-content' }}
                          >
                            Upload New Photo
                          </button>
                          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>JPG or PNG. Max size 5MB.</span>
                        </div>
                      </div>

                      <div className="flex flex-col gap-2 mb-6">
                        <label className="text-sm font-semibold" style={{ color: 'var(--text-muted)' }}>Full Name</label>
                        <input
                          type="text"
                          value={user.name || ''}
                          onChange={(e) => setUser({ ...user, name: e.target.value })}
                          className="w-full px-4 py-3 rounded-lg text-sm outline-none transition-all focus:ring-2 focus:ring-blue-500"
                          style={{ backgroundColor: 'var(--bg-main)', border: '1px solid var(--border-color)', color: 'var(--text-main)' }}
                        />
                      </div>

                      <button type="submit" className="w-full py-3 rounded-lg text-sm font-bold text-white transition-all shadow-md hover:shadow-lg" style={{ backgroundColor: '#3b82f6' }}>
                        Save Changes
                      </button>
                    </form>
                  </div>
                </div>

                <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
                  <div className="flex items-center gap-3 px-6 py-5 border-b" style={{ borderColor: 'var(--border-color)' }}>
                    <div className="p-2 rounded-lg" style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)' }}>
                      <Lock size={20} color="#3b82f6" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold" style={{ color: 'var(--text-main)', margin: 0 }}>Change Password</h3>
                      <p className="text-xs" style={{ color: 'var(--text-muted)', margin: 0 }}>Ensure your account stays secure</p>
                    </div>
                  </div>

                  <div className="p-6">
                    <form onSubmit={async (e) => {
                      e.preventDefault();
                      const currentPassword = e.target.currentPassword.value;
                      const newPassword = e.target.newPassword.value;
                      const confirmPassword = e.target.confirmPassword.value;

                      if (newPassword !== confirmPassword) return toast.error('New passwords do not match');
                      if (newPassword.length < 6) return toast.error('Password must be at least 6 characters');

                      try {
                        await axios.put('http://localhost:3000/api/auth/change-password', {
                          userId: user.id,
                          currentPassword,
                          newPassword
                        });
                        toast.success('Password updated successfully!');
                        e.target.reset();
                      } catch (err) {
                        toast.error(err.response?.data?.message || 'Error updating password');
                      }
                    }}>
                      <div className="flex flex-col gap-2 mb-4">
                        <label className="text-sm font-semibold" style={{ color: 'var(--text-muted)' }}>Current Password</label>
                        <input type="password" name="currentPassword" required className="w-full px-4 py-3 rounded-lg text-sm outline-none transition-all focus:ring-2 focus:ring-blue-500" style={{ backgroundColor: 'var(--bg-main)', border: '1px solid var(--border-color)', color: 'var(--text-main)' }} />
                      </div>
                      <div className="flex flex-col gap-2 mb-4">
                        <label className="text-sm font-semibold" style={{ color: 'var(--text-muted)' }}>New Password</label>
                        <input type="password" name="newPassword" required className="w-full px-4 py-3 rounded-lg text-sm outline-none transition-all focus:ring-2 focus:ring-blue-500" style={{ backgroundColor: 'var(--bg-main)', border: '1px solid var(--border-color)', color: 'var(--text-main)' }} />
                      </div>
                      <div className="flex flex-col gap-2 mb-6">
                        <label className="text-sm font-semibold" style={{ color: 'var(--text-muted)' }}>Confirm New Password</label>
                        <input type="password" name="confirmPassword" required className="w-full px-4 py-3 rounded-lg text-sm outline-none transition-all focus:ring-2 focus:ring-blue-500" style={{ backgroundColor: 'var(--bg-main)', border: '1px solid var(--border-color)', color: 'var(--text-main)' }} />
                      </div>
                      <button type="submit" className="w-full py-3 rounded-lg text-sm font-bold text-white transition-all shadow-md hover:shadow-lg" style={{ backgroundColor: '#3b82f6' }}>
                        Update Password
                      </button>
                    </form>
                  </div>
                </div>

                <div className="rounded-2xl p-6 flex justify-between items-center" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-xl" style={{ backgroundColor: 'rgba(251, 191, 36, 0.1)' }}>
                      <Sparkles size={24} color="#fbbf24" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold mb-1" style={{ color: 'var(--text-main)' }}>Dark Mode</h3>
                      <p className="text-xs m-0" style={{ color: 'var(--text-muted)' }}>Premium immersive experience</p>
                    </div>
                  </div>
                  <div
                    onClick={toggleTheme}
                    className="relative flex items-center w-16 h-8 rounded-full p-1 cursor-pointer transition-colors duration-300"
                    style={{ backgroundColor: isPremium ? '#2ebd85' : '#64748b' }}
                  >
                    <div
                      className="absolute w-6 h-6 bg-white rounded-full shadow-md flex items-center justify-center transition-all duration-300"
                      style={{ left: isPremium ? 'calc(100% - 28px)' : '4px' }}
                    >
                      {isPremium ? <Sparkles size={14} color="#2ebd85" /> : <Sun size={14} color="#64748b" />}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-8">
                <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
                  <div className="flex items-center gap-3 px-6 py-5 border-b" style={{ borderColor: 'var(--border-color)' }}>
                    <div className="p-2 rounded-lg" style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)' }}>
                      <Wallet size={20} color="#10b981" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold" style={{ color: 'var(--text-main)', margin: 0 }}>Wallet Management</h3>
                      <p className="text-xs" style={{ color: 'var(--text-muted)', margin: 0 }}>Manage your fiat deposits and withdrawals</p>
                    </div>
                  </div>

                  <div className="p-6">
                    <div className="flex justify-between items-center mb-6 p-5 rounded-xl" style={{ backgroundColor: 'var(--bg-main)', border: '1px solid var(--border-color)' }}>
                      <div>
                        <p className="text-xs font-semibold mb-1" style={{ color: 'var(--text-muted)' }}>Available Balance</p>
                        <h4 className="text-3xl font-black m-0" style={{ color: 'var(--text-main)' }}>{formatCurrency(user?.balance || 0)}</h4>
                      </div>
                    </div>
                    <div className="flex gap-4">
                      <button
                        onClick={() => setIsDepositModalOpen(true)}
                        className="flex-1 py-3 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all hover:opacity-90"
                        style={{ backgroundColor: '#10b981', color: 'white' }}
                      >
                        <ArrowDownRight size={18} /> Add Funds
                      </button>
                      <button
                        onClick={() => setIsWithdrawModalOpen(true)}
                        className="flex-1 py-3 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all hover:bg-opacity-80"
                        style={{ backgroundColor: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-main)' }}
                      >
                        <ArrowUpRight size={18} /> Withdraw
                      </button>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
                  <div className="flex items-center gap-3 px-6 py-5 border-b" style={{ borderColor: 'var(--border-color)' }}>
                    <div className="p-2 rounded-lg" style={{ backgroundColor: 'rgba(139, 92, 246, 0.1)' }}>
                      <Shield size={20} color="#8b5cf6" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold" style={{ color: 'var(--text-main)', margin: 0 }}>Two-Factor Authentication</h3>
                      <p className="text-xs" style={{ color: 'var(--text-muted)', margin: 0 }}>Add an extra layer of security</p>
                    </div>
                  </div>

                  <div className="p-6">
                    <div className="flex justify-between items-center mb-6 p-4 rounded-xl" style={{ backgroundColor: 'var(--bg-main)', border: '1px solid var(--border-color)' }}>
                      <div className="flex flex-col gap-1">
                        <span className="text-sm font-bold" style={{ color: 'var(--text-main)' }}>Authenticator App</span>
                        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Status: {user?.isTwoFactorEnabled ? 'Active' : 'Inactive'}</span>
                      </div>
                      <div className="px-3 py-1 rounded-full text-xs font-bold tracking-wider" style={{ backgroundColor: user?.isTwoFactorEnabled ? 'rgba(16,185,129,0.1)' : 'rgba(246,70,93,0.1)', color: user?.isTwoFactorEnabled ? '#10b981' : '#f6465d' }}>
                        {user?.isTwoFactorEnabled ? 'ENABLED' : 'DISABLED'}
                      </div>
                    </div>

                    {user?.isTwoFactorEnabled ? (
                      <button
                        onClick={() => setIsDisable2FAModalOpen(true)} // Aici am schimbat funcția
                        className="w-full py-3 rounded-lg text-sm font-bold transition-all hover:bg-opacity-10"
                        style={{ background: 'transparent', color: '#f6465d', border: '1px solid #f6465d' }}
                      >
                        Disable 2FA
                      </button>
                    ) : (
                      <button
                        onClick={handleGenerate2FA}
                        className="w-full py-3 rounded-lg text-sm font-bold text-white transition-all hover:opacity-90 shadow-md"
                        style={{ background: '#8b5cf6' }}
                      >
                        Setup 2FA
                      </button>
                    )}
                  </div>
                </div>

                <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: 'rgba(246, 70, 93, 0.02)', border: '1px solid rgba(246, 70, 93, 0.3)', boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
                  <div className="flex items-center gap-3 px-6 py-5 border-b" style={{ borderColor: 'rgba(246, 70, 93, 0.2)' }}>
                    <div className="p-2 rounded-lg" style={{ backgroundColor: 'rgba(246, 70, 93, 0.1)' }}>
                      <AlertTriangle size={20} color="#f6465d" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold" style={{ color: '#f6465d', margin: 0 }}>Danger Zone</h3>
                      <p className="text-xs" style={{ color: 'var(--text-muted)', margin: 0 }}>Permanent account operations</p>
                    </div>
                  </div>

                  <div className="p-6">
                    <p className="text-sm mb-6 leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                      Once you delete your account, there is no going back. All your portfolio data, personal information, and active limits will be permanently erased.
                    </p>
                    <button
                      onClick={() => setIsDeleteModalOpen(true)}
                      className="w-full py-3 rounded-lg text-sm font-bold text-white transition-all shadow-md hover:shadow-lg"
                      style={{ backgroundColor: '#f6465d' }}
                    >
                      Delete Account
                    </button>
                  </div>
                </div>

              </div>
            </motion.div>
          </motion.div>
        );

      default:
        return null;
    }
  }

  if (!user) return <div>Loading...</div>;

  return (
    <div
      className="dashboard-container"
      style={isPremium ? {
        background: '#0b0e14',
        colorScheme: 'dark'
      } : {}}
    >
      <aside
        className="sidebar"
        style={isPremium ? {
          background: '#0b0e14',
          borderRight: '1px solid #1a1d27'
        } : {}}
      >
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">
            <TrendingUp size={20} color={isPremium ? 'black' : 'white'} />
          </div>
          <span style={isPremium ? { color: '#f0f3f7' } : {}}>InvestPro</span>
        </div>

        <nav className="sidebar-menu">
          <div
            className={`menu-item ${activeView === 'dashboard' ? 'active' : ''}`}
            onClick={() => setActiveView('dashboard')}
          >
            <LayoutDashboard size={20} /> Dashboard
          </div>
          <div
            className={`menu-item ${activeView === 'markets' ? 'active' : ''}`}
            onClick={() => setActiveView('markets')}
          >
            <LineChartIcon size={20} /> Markets
          </div>
          <div
            className={`menu-item ${activeView === 'portfolio' ? 'active' : ''}`}
            onClick={() => setActiveView('portfolio')}
          >
            <PieChartIcon size={20} /> Portfolio
          </div>
          <div
            className={`menu-item ${activeView === 'transactions' ? 'active' : ''}`}
            onClick={() => setActiveView('transactions')}
          >
            <ArrowLeftRight size={20} /> Transactions
          </div>
          <div
            className={`menu-item ${activeView === 'news' ? 'active' : ''}`}
            onClick={() => setActiveView('news')}
          >
            <Newspaper size={20} /> News
          </div>
          <div
            className={`menu-item ${activeView === 'settings' ? 'active' : ''}`}
            onClick={() => setActiveView('settings')}
          >
            <Settings size={20} /> Settings
          </div>
        </nav>

        <div className="sidebar-user" onClick={handleLogout} title="Click to logout">
          <div className="user-avatar" style={{ padding: 0, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {user.profilePicture ? (
              <img src={user.profilePicture} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              user.name ? user.name.charAt(0).toUpperCase() : 'U'
            )}
          </div>
          <div className="user-info">
            <div style={{ fontWeight: '600', fontSize: '14px', color: 'black' }}>{user.name}</div>
            <div style={{ fontSize: '12px', color: 'black', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '140px' }}>
              {user.email}
            </div>
          </div>
        </div>
      </aside>

      <main className="main-content" style={isPremium ? {
        background: '#0b0e14',
        color: '#f0f3f7'
      } : {}}>
        <motion.div
          key={activeView}
          variants={containerVariants}
          initial="hidden"
          animate="show"
          style={{ width: '100%', height: '100%' }}
        >
          {renderContent()}
        </motion.div>
      </main>

      <AnimatePresence>
        {isDeleteModalOpen && (
          <motion.div
            key="delete-modal-overlay"
            className="modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={{ display: 'flex' }}
          >
            <motion.div
              key="delete-modal-card"
              className="modal-card"
              style={{ maxWidth: '420px', padding: '28px' }}
              initial={{ scale: 0.9, y: 30, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.9, y: 30, opacity: 0 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
            >
              <div style={{ textAlign: 'center', marginBottom: '16px' }}>
                <h2 style={{ color: '#ef4444', margin: 0, fontSize: '22px', fontWeight: '600' }}>Delete Account</h2>
              </div>

              <p style={{ color: 'var(--text-muted)', lineHeight: '1.6', margin: '0 0 24px 0', fontSize: '14px' }}>
                Are you absolutely sure you want to delete your account? This action is irreversible. All your portfolio assets, transaction history, and remaining funds will be permanently removed.
              </p>

              {/* Câmpul de parolă (ascuns dacă utilizatorul s-a logat cu Google) */}
              {!(user?.password && user.password.includes('Google!')) && (
                <div className="form-group" style={{ marginBottom: '16px' }}>
                  <label style={{ color: 'var(--text-muted)', fontSize: '13px', display: 'block', marginBottom: '8px' }}>
                    Confirm Password
                  </label>
                  <input
                    type="password"
                    value={deletePassword}
                    onChange={(e) => setDeletePassword(e.target.value)}
                    placeholder="Enter your current password"
                    style={{ backgroundColor: 'var(--bg-main)', color: 'var(--text-main)', borderColor: 'var(--border-color)', width: '100%', padding: '12px', borderRadius: '8px' }}
                  />
                </div>
              )}

              {/* Câmpul de 2FA (afișat doar dacă utilizatorul are 2FA activat) */}
              {user?.isTwoFactorEnabled && (
                <div className="form-group" style={{ marginBottom: '16px' }}>
                  <label style={{ color: 'var(--text-muted)', fontSize: '13px', display: 'block', marginBottom: '8px' }}>
                    Authenticator Code (2FA)
                  </label>
                  <input
                    type="text"
                    maxLength="6"
                    value={deleteTwoFactorCode}
                    onChange={(e) => setDeleteTwoFactorCode(e.target.value.replace(/\D/g, ''))}
                    placeholder="000000"
                    style={{ backgroundColor: 'var(--bg-main)', color: 'var(--text-main)', borderColor: 'var(--border-color)', width: '100%', padding: '12px', borderRadius: '8px', letterSpacing: '4px', textAlign: 'center', fontWeight: 'bold' }}
                  />
                </div>
              )}

              <div className="modal-buttons" style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
                <button
                  className="cancel-btn"
                  onClick={() => {
                    setIsDeleteModalOpen(false);
                    setDeletePassword(''); // Curățăm câmpul dacă se anulează
                    setDeleteTwoFactorCode('');
                  }}
                  style={{ flex: 1 }}
                >
                  Cancel
                </button>
                <button
                  className="confirm-btn"
                  onClick={handleDeleteAccount} // Funcția ta de ștergere
                  style={{ flex: 1, backgroundColor: '#ef4444', color: 'white', transition: '0.2s ease' }}
                >
                  Delete Permanently
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Deposit Modal */}
      <AnimatePresence mode="wait">
        {isDepositModalOpen && (
          <motion.div
            key="deposit-modal-overlay"
            className="modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={{ display: 'flex' }}
          >
            <motion.div
              key="deposit-modal-card"
              className="modal-card"
              style={{ maxWidth: '450px' }}
              initial={{ scale: 0.9, y: 30, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.9, y: 30, opacity: 0 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
            >
              <h2>Deposit Funds</h2>

              <div className="credit-card-preview">
                <div className="card-chip"></div>
                <div className="card-number-display">
                  {depositData.cardNumber ? depositData.cardNumber.padEnd(16, '•').match(/.{1,4}/g).join(' ') : '•••• •••• •••• ••••'}
                </div>
                <div className="card-details-display">
                  <div>
                    <div>Card Holder</div>
                    <div>{depositData.cardName || 'YOUR NAME'}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div>Expires</div>
                    <div>{depositData.expiry || 'MM/YY'}</div>
                  </div>
                </div>
              </div>

              <div className="form-group">
                <label style={{ color: 'var(--text-muted)' }}>Amount ({user?.currency || 'USD'})</label>
                <input
                  type="number"
                  min="1"
                  value={depositData.amount}
                  onKeyDown={(e) => ["e", "E", "+", "-"].includes(e.key) && e.preventDefault()}
                  onChange={(e) => setDepositData({ ...depositData, amount: e.target.value })}
                  placeholder="0.00"
                  className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  style={{ backgroundColor: 'var(--bg-main)', color: 'var(--text-main)', borderColor: 'var(--border-color)' }}
                />
              </div>

              <div className="form-group">
                <label style={{ color: 'var(--text-muted)' }}>Card Number</label>
                <input
                  type="text"
                  maxLength="16"
                  value={depositData.cardNumber}
                  onChange={(e) => setDepositData({ ...depositData, cardNumber: e.target.value.replace(/\D/g, '') })}
                  placeholder="1234567890123456"
                  style={{ backgroundColor: 'var(--bg-main)', color: 'var(--text-main)', borderColor: 'var(--border-color)', letterSpacing: '2px' }}
                />
              </div>

              <div className="deposit-grid">
                <div className="form-group">
                  <label style={{ color: 'var(--text-muted)' }}>Expiry Date (MM/YY)</label>
                  <input
                    type="text"
                    maxLength="5"
                    value={depositData.expiry}
                    onChange={(e) => {
                      let val = e.target.value.replace(/\D/g, '');

                      if (val.length >= 2) {
                        let month = parseInt(val.substring(0, 2));
                        if (month > 12) val = '12' + val.substring(2);
                        if (month === 0 && val.length === 2) val = '01' + val.substring(2);
                      }

                      if (val.length >= 3) {
                        val = val.substring(0, 2) + '/' + val.substring(2, 4);
                      }

                      setDepositData({ ...depositData, expiry: val });
                    }}
                    placeholder="MM/YY"
                    style={{ backgroundColor: 'var(--bg-main)', color: 'var(--text-main)', borderColor: 'var(--border-color)' }}
                  />
                </div>
                <div className="form-group">
                  <label style={{ color: 'var(--text-muted)' }}>CVV</label>
                  <input
                    type="text"
                    maxLength="3"
                    value={depositData.cvv}
                    onChange={(e) => setDepositData({ ...depositData, cvv: e.target.value.replace(/\D/g, '') })}
                    placeholder="123"
                    style={{ backgroundColor: 'var(--bg-main)', color: 'var(--text-main)', borderColor: 'var(--border-color)' }}
                  />
                </div>
              </div>

              <div className="form-group">
                <label style={{ color: 'var(--text-muted)' }}>Name on Card</label>
                <input
                  type="text"
                  value={depositData.cardName}
                  onChange={(e) => setDepositData({ ...depositData, cardName: e.target.value.replace(/[^a-zA-Z\s]/g, '').toUpperCase() })}
                  placeholder="JOHN DOE"
                  style={{ backgroundColor: 'var(--bg-main)', color: 'var(--text-main)', borderColor: 'var(--border-color)' }}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '16px' }}>
                <input
                  type="checkbox"
                  id="saveCard"
                  checked={saveCardOption}
                  onChange={(e) => setSaveCardOption(e.target.checked)}
                  style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: '#3b82f6' }}
                />
                <label htmlFor="saveCard" style={{ color: 'var(--text-muted)', fontSize: '14px', cursor: 'pointer' }}>
                  Save this card for future withdrawals
                </label>
              </div>

              <div className="modal-buttons" style={{ marginTop: '24px' }}>
                <button className="cancel-btn" onClick={() => setIsDepositModalOpen(false)}>Cancel</button>
                <button className="confirm-btn" onClick={handleDepositSubmit}>Process Payment</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isWithdrawModalOpen && (
          <motion.div
            key="withdraw-modal-overlay"
            className="modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={{ display: 'flex' }}
          >
            <motion.div
              key="withdraw-modal-card"
              className="modal-card"
              style={{ maxWidth: '450px' }}
              initial={{ scale: 0.9, y: 30, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.9, y: 30, opacity: 0 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
            >
              <h2>Withdraw Funds</h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginBottom: '20px' }}>
                Available to withdraw: <strong style={{ color: 'var(--text-main)' }}>{formatCurrency(user?.balance || 0)}</strong>
              </p>

              <div className="form-group">
                <label style={{ color: 'var(--text-muted)' }}>Amount ({user?.currency || 'USD'})</label>
                <input
                  type="number"
                  min="1"
                  max={user?.balance}
                  value={withdrawAmount}
                  onKeyDown={(e) => ["e", "E", "+", "-"].includes(e.key) && e.preventDefault()}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  placeholder="0.00"
                  style={{ backgroundColor: 'var(--bg-main)', color: 'var(--text-main)', borderColor: 'var(--border-color)' }}
                />
              </div>

              <div className="form-group" style={{ marginTop: '16px' }}>
                <label style={{ color: 'var(--text-muted)' }}>Withdrawal Method</label>
                <select
                  value={withdrawMethod}
                  onChange={(e) => setWithdrawMethod(e.target.value)}
                  style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-main)', color: 'var(--text-main)', outline: 'none', cursor: 'pointer' }}
                >
                  <option value="bank">Bank Transfer ($3.00 Fixed Fee)</option>

                  {/* --- AICI AFIȘĂM DINAMIC CARDURILE --- */}
                  {savedCards.map(card => (
                    <option key={card.id} value={`card_${card.id}`}>
                      Card {card.cardName} (•••• {card.last4}) - 1.5% Fee
                    </option>
                  ))}
                </select>
              </div>

              <div className="modal-buttons" style={{ marginTop: '24px' }}>
                <button className="cancel-btn" onClick={() => setIsWithdrawModalOpen(false)}>Cancel</button>
                <button className="confirm-btn" onClick={handleWithdrawSubmit}>Confirm Withdrawal</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {isChartModalOpen && selectedChartAsset && (
        <div className="fixed inset-0 z-[9999] flex flex-col bg-[#0B0E11] text-slate-200 font-sans dark overflow-hidden">
          <header className="flex h-[60px] items-center justify-between border-b border-slate-800 bg-[#11141C] px-4 shrink-0">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-white font-bold text-xs">
                  {selectedChartAsset.symbol.substring(0, 2)}
                </div>
                <div>
                  <h1 className="text-lg font-bold text-white leading-none tracking-wide flex items-center gap-2">
                    {selectedChartAsset.symbol}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 rounded-full hover:bg-slate-800"
                      onClick={() => handleToggleWatchlist(selectedChartAsset.id)}
                    >
                      <Star size={14} className={watchlist.some(w => w.assetId === selectedChartAsset.id) ? "fill-yellow-500 text-yellow-500" : "text-slate-400"} />
                    </Button>
                  </h1>
                  <span className="text-xs text-slate-400">{selectedChartAsset.name}</span>
                </div>
              </div>

              <Separator orientation="vertical" className="h-8 bg-slate-800 mx-2" />

              <div className="flex gap-8">
                <div className="flex flex-col">
                  <span className="text-[11px] text-slate-400 mb-0.5">24h Change</span>
                  <span className={`text-sm font-bold ${selectedChartAsset.change24h >= 0 ? 'text-[#0ECB81]' : 'text-[#F6465D]'}`}>
                    {selectedChartAsset.change24h >= 0 ? '+' : ''}{selectedChartAsset.change24h.toFixed(2)}%
                  </span>
                </div>
                <div className="flex flex-col hidden sm:flex">
                  <span className="text-[11px] text-slate-400 mb-0.5">Market Status</span>
                  <div className="flex items-center gap-1.5 text-sm font-semibold text-[#0ECB81]">
                    <div className="h-2 w-2 rounded-full bg-[#0ECB81] animate-pulse shadow-[0_0_8px_rgba(14,203,129,0.8)]"></div>
                    OPEN
                  </div>
                </div>
              </div>
            </div>

            <Button variant="ghost" size="icon" onClick={() => setIsChartModalOpen(false)} className="text-slate-400 hover:text-white hover:bg-slate-800">
              <X size={20} />
            </Button>
          </header>

          <div className="flex flex-1 overflow-hidden h-[calc(100vh-60px)]">
            <aside className="w-[260px] border-r border-slate-800 bg-[#11141C] flex flex-col shrink-0 hidden lg:flex">
              <div className="p-4 border-b border-slate-800">
                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Market Price</h3>
                <div className={`text-3xl font-bold ${selectedChartAsset.change24h >= 0 ? 'text-[#0ECB81]' : 'text-[#F6465D]'}`}>
                  {formatCurrency(selectedChartAsset.currentPrice, 4)}
                </div>
                <div className="text-sm text-slate-400 mt-1">≈ {formatCurrency(selectedChartAsset.currentPrice, 2)} USD</div>
              </div>

              <div className="p-4 flex flex-col gap-3 flex-1">
                <Button
                  variant="outline"
                  className="w-full justify-start text-slate-300 border-slate-700 bg-[#181C25] hover:bg-slate-800 hover:text-white h-10"
                  onClick={() => {
                    setSelectedAlertAsset(selectedChartAsset);
                    setAlertTargetPrice(selectedChartAsset.currentPrice);
                    setIsAlertModalOpen(true);
                  }}
                >
                  <Bell size={16} className="mr-2 text-blue-400" />
                  Set Price Alert
                </Button>
              </div>
            </aside>

            <main className="flex-1 flex flex-col min-w-0 bg-[#0B0E11] p-2">
              <div className="flex-1 rounded-lg overflow-hidden border border-slate-800 relative">
                <TradingViewChart assetId={selectedChartAsset.id} symbol={selectedChartAsset.symbol} />
              </div>
            </main>

            <aside className="w-[320px] bg-[#11141C] border-l border-slate-800 flex flex-col shrink-0 overflow-y-auto">
              <div className="p-4 border-b border-slate-800 bg-[#131722]">
                <Card className="bg-[#181C25] border-slate-700">
                  <CardContent className="p-4 flex justify-between items-center">
                    <div className="flex flex-col gap-1">
                      <span className="text-xs text-slate-400">Available Balance</span>
                      <span className="text-lg font-bold text-white">
                        {chartTradeSide === 'BUY'
                          ? formatCurrency(user?.balance)
                          : `${portfolio.find(p => p.asset.id === selectedChartAsset.id)?.quantity || 0} ${selectedChartAsset.symbol}`}
                      </span>
                    </div>
                    <Wallet className="text-blue-500 opacity-50" size={24} />
                  </CardContent>
                </Card>
              </div>

              {/* --- START MARKET STATS --- */}
              <div className="p-4 border-b border-slate-800 bg-[#11141C]">
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
                  Market Stats
                </h3>
                <div className="grid grid-cols-2 gap-y-3 gap-x-4">

                  <div className="flex flex-col col-span-2 pb-2 border-b border-slate-800">
                    <span className="text-xs text-slate-400">Market Cap</span>
                    <span className="text-sm font-medium text-white">
                      {selectedChartAsset?.marketCap ? formatMarketCap(selectedChartAsset.marketCap) : 'N/A'}
                    </span>
                  </div>

                  <div className="flex flex-col">
                    <span className="text-xs text-slate-400">P/E Ratio</span>
                    <span className="text-sm font-medium text-white">
                      {selectedChartAsset?.peRatio ? selectedChartAsset.peRatio.toFixed(2) : 'N/A'}
                    </span>
                  </div>

                  <div className="flex flex-col">
                    <span className="text-xs text-slate-400">Div Yield</span>
                    <span className="text-sm font-medium text-white">
                      {selectedChartAsset?.dividendYield ? `${selectedChartAsset.dividendYield.toFixed(2)}%` : 'N/A'}
                    </span>
                  </div>

                  <div className="flex flex-col mt-1">
                    <span className="text-xs text-slate-400">52W High</span>
                    <span className="text-sm font-medium text-[#0ECB81]">
                      {selectedChartAsset?.high52w ? `$${selectedChartAsset.high52w.toFixed(2)}` : 'N/A'}
                    </span>
                  </div>

                  <div className="flex flex-col mt-1">
                    <span className="text-xs text-slate-400">52W Low</span>
                    <span className="text-sm font-medium text-[#F6465D]">
                      {selectedChartAsset?.low52w ? `$${selectedChartAsset.low52w.toFixed(2)}` : 'N/A'}
                    </span>
                  </div>

                </div>
              </div>
              {/* --- END MARKET STATS --- */}

              <div className="p-4 flex flex-col flex-1">
                <Tabs
                  defaultValue="buy"
                  value={chartTradeSide.toLowerCase()}
                  onValueChange={(v) => {
                    if (v === 'sell') {
                      const pItem = portfolio.find(p => p.asset.id === selectedChartAsset.id);
                      if (pItem) setSelectedSellAsset(pItem);
                    }
                    setChartTradeSide(v.toUpperCase());
                  }}
                  className="w-full mb-4"
                >
                  <TabsList className="grid w-full grid-cols-2 bg-[#181C25] h-10 border border-slate-800 p-1">
                    <TabsTrigger value="buy" className="data-[state=active]:bg-[#0ECB81] data-[state=active]:text-white text-slate-400 font-bold transition-all">Buy</TabsTrigger>
                    <TabsTrigger value="sell" className="data-[state=active]:bg-[#F6465D] data-[state=active]:text-white text-slate-400 font-bold transition-all">Sell</TabsTrigger>
                  </TabsList>
                </Tabs>

                <div className="flex bg-[#181C25] rounded-lg p-1 border border-slate-800 mb-6">
                  <button
                    onClick={() => setOrderType('MARKET')}
                    className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${orderType === 'MARKET' ? 'bg-[#2B3139] text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
                  >
                    Market Order
                  </button>
                  <button
                    onClick={() => setOrderType('LIMIT')}
                    className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${orderType === 'LIMIT' ? 'bg-[#2B3139] text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
                  >
                    {chartTradeSide === 'BUY' ? 'Auto Buy' : 'Stop Loss'}
                  </button>
                </div>

                <div className="flex flex-col gap-4 mb-6">
                  {orderType === 'LIMIT' && (
                    <div className="relative flex flex-col gap-1.5">
                      <div className="flex justify-between items-center">
                        <label className="text-xs font-semibold text-slate-400">Target Price</label>
                        <Badge variant="outline" className="text-[10px] cursor-pointer hover:bg-slate-800 border-slate-700 text-slate-400" onClick={() => setLimitPrice(selectedChartAsset.currentPrice)}>Set to Current</Badge>
                      </div>
                      <div className="relative">
                        <Input
                          type="number" min="0" step="0.01"
                          value={limitPrice} onChange={(e) => setLimitPrice(e.target.value)}
                          className="bg-[#181C25] border-slate-700 text-white pr-12 h-11 text-right focus-visible:ring-1 focus-visible:ring-blue-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          placeholder={selectedChartAsset.currentPrice.toFixed(2)}
                        />
                        <span className="absolute right-3 top-3 text-xs text-slate-400 font-semibold">{user?.currency === 'RON' ? 'RON' : CURRENCY_SYMBOLS[user?.currency || 'USD']}</span>
                      </div>
                    </div>
                  )}

                  <div className="relative flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-slate-400">Amount</label>
                    <div className="relative">
                      <Input
                        type="number" min="0" step="0.01"
                        value={chartTradeSide === 'BUY' ? buyQuantity : sellQuantity}
                        onChange={(e) => chartTradeSide === 'BUY' ? setBuyQuantity(e.target.value) : setSellQuantity(e.target.value)}
                        className="bg-[#181C25] border-slate-700 text-white pr-14 h-11 text-right focus-visible:ring-1 focus-visible:ring-blue-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        placeholder="0.00"
                      />
                      <span className="absolute right-3 top-3 text-xs text-slate-400 font-semibold">{selectedChartAsset.symbol}</span>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 mb-8">
                  {[0.25, 0.5, 0.75, 1].map((percent) => (
                    <Button
                      key={percent}
                      variant="outline"
                      size="sm"
                      className="flex-1 bg-[#181C25] border-slate-700 text-slate-400 hover:text-white hover:bg-slate-700 h-7 text-xs px-0"
                      onClick={() => {
                        const priceToUse = orderType === 'LIMIT' && limitPrice ? parseFloat(limitPrice) : selectedChartAsset.currentPrice;
                        if (chartTradeSide === 'BUY') {
                          const maxUnits = user.balance / priceToUse;
                          setBuyQuantity((maxUnits * percent).toFixed(4));
                        } else {
                          const pItem = portfolio.find(p => p.asset.id === selectedChartAsset.id);
                          if (pItem) setSellQuantity((pItem.quantity * percent).toFixed(4));
                        }
                      }}
                    >
                      {percent === 1 ? '100%' : `${percent * 100}%`}
                    </Button>
                  ))}
                </div>

                <div className="mt-auto flex flex-col gap-4">
                  <div className="bg-[#181C25] rounded-lg p-3 border border-slate-800 flex justify-between items-center">
                    <span className="text-xs text-slate-400 font-medium">Total Estimation</span>
                    <span className="text-sm font-bold text-white">
                      {formatCurrency((orderType === 'LIMIT' && limitPrice ? parseFloat(limitPrice) : selectedChartAsset.currentPrice) * (parseFloat(chartTradeSide === 'BUY' ? buyQuantity : sellQuantity) || 0))}
                    </span>
                  </div>

                  <Button
                    className={`w-full h-12 text-base font-bold shadow-lg transition-transform active:scale-95 border-none ${chartTradeSide === 'BUY'
                      ? 'bg-[#0ECB81] hover:bg-[#0BA86A] text-white shadow-[0_4px_14px_rgba(14,203,129,0.25)]'
                      : 'bg-[#F6465D] hover:bg-[#D9384E] text-white shadow-[0_4px_14px_rgba(246,70,93,0.25)]'
                      }`}
                    onClick={() => {
                      if (chartTradeSide === 'BUY') {
                        handleBuyAsset();
                      } else {
                        const pItem = portfolio.find(p => p.asset.id === selectedChartAsset.id);
                        if (!pItem) return toast.error("You don't own any units of this asset to sell!");
                        handleSellAsset();
                      }
                    }}
                  >
                    {chartTradeSide === 'BUY' ? 'Buy' : 'Sell'} {selectedChartAsset.symbol}
                  </Button>
                </div>
              </div>
            </aside>
          </div>
        </div>
      )}

      <AnimatePresence>
        {isDisable2FAModalOpen && (
          <motion.div
            key="disable-2fa-modal-overlay"
            className="modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={{ display: 'flex' }}
          >
            <motion.div
              key="disable-2fa-modal-card"
              className="modal-card"
              style={{ maxWidth: '400px', padding: '28px' }}
              initial={{ scale: 0.9, y: 30, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.9, y: 30, opacity: 0 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
            >
              <div style={{ textAlign: 'center', marginBottom: '16px' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: 'rgba(246, 70, 93, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px auto' }}>
                  <AlertTriangle size={24} color="#f6465d" />
                </div>
                <h2 style={{ color: 'var(--text-main)', margin: 0, fontSize: '20px', fontWeight: '700' }}>Disable 2FA?</h2>
              </div>

              <p style={{ color: 'var(--text-muted)', lineHeight: '1.6', margin: '0 0 24px 0', fontSize: '14px', textAlign: 'center' }}>
                Are you sure you want to disable Two-Factor Authentication? This will significantly reduce your account's security level.
              </p>

              <div className="modal-buttons" style={{ display: 'flex', gap: '12px' }}>
                <button
                  className="cancel-btn"
                  onClick={() => setIsDisable2FAModalOpen(false)}
                  style={{ flex: 1 }}
                >
                  Cancel
                </button>
                <button
                  className="confirm-btn"
                  onClick={handleDisable2FA}
                  style={{ flex: 1, backgroundColor: '#f6465d', color: 'white', transition: '0.2s ease' }}
                >
                  Yes, Disable
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {isBuyModalOpen && selectedAsset && (
        <div className="modal-overlay">
          <div className="modal-card">
            <h2>Buy {selectedAsset.symbol}</h2>
            <div className="modal-price-box" style={{ backgroundColor: 'var(--bg-main)' }}>
              <span style={{ color: 'var(--text-muted)' }}>Current Price</span>
              <h3 style={{ color: 'var(--text-main)' }}>{formatCurrency(selectedAsset.currentPrice, 4)}</h3>
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
              <button
                type="button"
                onClick={() => setOrderType('MARKET')}
                style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)', background: orderType === 'MARKET' ? '#3b82f6' : 'transparent', color: orderType === 'MARKET' ? 'white' : 'var(--text-main)', cursor: 'pointer', fontWeight: 'bold', transition: '0.2s' }}
              >Market</button>
              <button
                type="button"
                onClick={() => setOrderType('LIMIT')}
                style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)', background: orderType === 'LIMIT' ? '#3b82f6' : 'transparent', color: orderType === 'LIMIT' ? 'white' : 'var(--text-main)', cursor: 'pointer', fontWeight: 'bold', transition: '0.2s' }}
              >Limit (Auto)</button>
            </div>

            <div className="form-group" style={{ marginTop: '20px' }}>
              <label style={{ color: 'var(--text-muted)' }}>Quantity</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={buyQuantity}
                onChange={(e) => setBuyQuantity(e.target.value)}
                placeholder="e.g. 1.5"
                style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-main)', color: 'var(--text-main)' }}
              />
            </div>

            {orderType === 'LIMIT' && (
              <div className="form-group" style={{ marginTop: '16px' }}>
                <label style={{ color: 'var(--text-muted)' }}>Target Price (Auto Execute)</label>
                <input
                  type="number" min="0" step="0.01"
                  value={limitPrice} onChange={(e) => setLimitPrice(e.target.value)}
                  placeholder="Enter target price"
                  style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-main)', color: 'var(--text-main)' }}
                />
              </div>
            )}

            <div className="modal-summary">
              <span style={{ color: 'var(--text-muted)' }}>Estimated Cost:</span>
              <span style={{ color: 'var(--text-main)' }}>
                {formatCurrency((orderType === 'LIMIT' && limitPrice ? parseFloat(limitPrice) : selectedAsset.currentPrice) * (buyQuantity || 0))}
              </span>
            </div>

            <div className="modal-buttons">
              <button className="cancel-btn" onClick={() => setIsBuyModalOpen(false)}>Cancel</button>
              <button className="confirm-btn" onClick={handleBuyAsset}>{orderType === 'LIMIT' ? 'Place Auto Order' : 'Confirm Purchase'}</button>
            </div>
          </div>
        </div>
      )}

      <AnimatePresence mode="wait">
        {isSellModalOpen && selectedSellAsset && (
          <motion.div
            key="sell-modal-overlay"
            className="sell-modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => setIsSellModalOpen(false)}
          >
            <motion.div
              key="sell-modal-card"
              className="sell-modal-card"
              initial={{ scale: 0.85, y: 40, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.85, y: 40, opacity: 0 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header Section */}
              <div className="sell-modal-header">
                <div className="sell-modal-title-box">
                  <div className="sell-modal-icon">
                    <ArrowUpFromLine size={24} color="white" />
                  </div>
                  <div>
                    <h2 className="sell-modal-title">Sell {selectedSellAsset.asset.symbol}</h2>
                    <p className="sell-modal-subtitle">{selectedSellAsset.asset.name}</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsSellModalOpen(false)}
                  className="sell-modal-close-btn"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Content Section */}
              <div className="sell-modal-content">
                {/* Current Price Section */}
                <div className="sell-modal-price-section">
                  <div className="sell-price-card">
                    <div className="sell-price-label">Current Market Price</div>
                    <div className="sell-price-value">{formatCurrency(selectedSellAsset.asset.currentPrice, 4)}</div>
                    <div className="sell-price-change">24h: <span style={{ color: selectedSellAsset.asset.change24h >= 0 ? '#10b981' : '#ef4444' }}>{selectedSellAsset.asset.change24h >= 0 ? '+' : ''}{selectedSellAsset.asset.change24h?.toFixed(2)}%</span></div>
                  </div>
                  <div className="sell-quantity-info">
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>Available</div>
                    <div style={{ fontSize: '20px', fontWeight: '700', color: 'var(--text-main)' }}>{selectedSellAsset.quantity.toFixed(4)}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>units</div>
                  </div>
                </div>

                {/* Order Type Selector */}
                <div className="sell-order-type-selector">
                  <button
                    type="button"
                    onClick={() => {
                      setOrderType('MARKET');
                      setLimitPrice('');
                    }}
                    className={`sell-order-type-btn ${orderType === 'MARKET' ? 'active' : ''}`}
                  >
                    <DollarSign size={18} />
                    <div>
                      <div className="sell-order-type-name">Market Order</div>
                      <div className="sell-order-type-desc">Sell immediately</div>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setOrderType('LIMIT')}
                    className={`sell-order-type-btn ${orderType === 'LIMIT' ? 'active' : ''}`}
                  >
                    <ZapIcon size={18} />
                    <div>
                      <div className="sell-order-type-name">Limit Order</div>
                      <div className="sell-order-type-desc">Auto execute</div>
                    </div>
                  </button>
                </div>

                {/* Quantity Input */}
                <div className="sell-form-group">
                  <div className="sell-form-label">
                    <label>Quantity to Sell</label>
                    <button
                      type="button"
                      className="sell-max-btn"
                      onClick={() => setSellQuantity(selectedSellAsset.quantity.toString())}
                    >
                      Max
                    </button>
                  </div>
                  <div className="sell-input-wrapper">
                    <input
                      type="number"
                      min="0"
                      max={selectedSellAsset.quantity}
                      step="0.01"
                      value={sellQuantity}
                      onChange={(e) => setSellQuantity(e.target.value)}
                      placeholder="0.00"
                      className="sell-input"
                    />
                    <div className="sell-input-unit">{selectedSellAsset.asset.symbol}</div>
                  </div>
                  <div className="sell-input-hint">Max available: {selectedSellAsset.quantity.toFixed(4)}</div>
                </div>

                {/* Limit Price Input */}
                {orderType === 'LIMIT' && (
                  <motion.div
                    className="sell-form-group"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <label className="sell-form-label">
                      <span>Target Price (Auto Execute)</span>
                    </label>
                    <div className="sell-input-wrapper">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={limitPrice}
                        onChange={(e) => setLimitPrice(e.target.value)}
                        placeholder="0.00"
                        className="sell-input"
                      />
                      <div className="sell-input-unit">{user?.currency === 'RON' ? 'RON' : CURRENCY_SYMBOLS[user?.currency || 'USD']}</div>
                    </div>
                    <div className="sell-input-hint">Order will execute when price reaches this target</div>
                  </motion.div>
                )}

                {/* Summary Section */}
                <div className="sell-summary-box">
                  <div className="sell-summary-row">
                    <span className="sell-summary-label">Total Value:</span>
                    <span className="sell-summary-value">
                      {formatCurrency((orderType === 'LIMIT' && limitPrice ? parseFloat(limitPrice) : selectedSellAsset.asset.currentPrice) * (sellQuantity || 0))}
                    </span>
                  </div>
                  <div className="sell-summary-divider"></div>
                  <div className="sell-summary-row">
                    <span className="sell-summary-label">Profit/Loss:</span>
                    <span className="sell-summary-value" style={{ color: (sellQuantity * selectedSellAsset.asset.currentPrice - sellQuantity * selectedSellAsset.avgBuyPrice) >= 0 ? '#10b981' : '#ef4444' }}>
                      {formatCurrency(sellQuantity * selectedSellAsset.asset.currentPrice - sellQuantity * selectedSellAsset.avgBuyPrice)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="sell-modal-buttons">
                <button
                  className="sell-modal-btn-cancel"
                  onClick={() => setIsSellModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  className="sell-modal-btn-confirm"
                  onClick={handleSellAsset}
                  disabled={!sellQuantity || sellQuantity <= 0}
                >
                  <ArrowUpFromLine size={18} />
                  {orderType === 'LIMIT' ? 'Place Auto Order' : 'Confirm Sale'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {isAlertModalOpen && selectedAlertAsset && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-[#11141C] border border-slate-800 rounded-xl w-full max-w-sm p-6 shadow-2xl flex flex-col gap-4 text-slate-200">
            <div className="flex justify-between items-center mb-2">
              <h2 className="text-xl font-bold text-white m-0 flex items-center gap-2">
                <Bell className="text-blue-500" size={20} /> Price Alert
              </h2>
              <button onClick={() => setIsAlertModalOpen(false)} className="text-slate-500 hover:text-white transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="bg-[#181C25] rounded-lg p-4 flex justify-between items-center border border-slate-800">
              <span className="text-sm font-semibold text-slate-400">{selectedAlertAsset.symbol} Price</span>
              <span className="text-xl font-bold text-white">{formatCurrency(selectedAlertAsset.currentPrice, 4)}</span>
            </div>

            <form onSubmit={handleAddPriceAlert} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-400">Condition</label>
                <div className="flex bg-[#181C25] rounded-lg p-1 border border-slate-800">
                  <button
                    type="button"
                    onClick={() => setAlertCondition('ABOVE')}
                    className={`flex-1 py-2 text-xs font-bold rounded-md transition-all ${alertCondition === 'ABOVE' ? 'bg-[#2B3139] text-white shadow' : 'text-slate-500 hover:text-white'}`}
                  >
                    Goes Above
                  </button>
                  <button
                    type="button"
                    onClick={() => setAlertCondition('BELOW')}
                    className={`flex-1 py-2 text-xs font-bold rounded-md transition-all ${alertCondition === 'BELOW' ? 'bg-[#2B3139] text-white shadow' : 'text-slate-500 hover:text-white'}`}
                  >
                    Drops Below
                  </button>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-400">Target Price (USD)</label>
                <div className="relative">
                  <Input
                    type="number"
                    min="0"
                    step="0.0001"
                    value={alertTargetPrice}
                    onChange={(e) => setAlertTargetPrice(e.target.value)}
                    placeholder="0.0000"
                    required
                    className="w-full bg-[#181C25] border-slate-700 text-white pr-12 h-11 text-right focus-visible:ring-1 focus-visible:ring-blue-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                  <span className="absolute right-3 top-3 text-xs text-slate-400 font-semibold">{user?.currency === 'RON' ? 'RON' : CURRENCY_SYMBOLS[user?.currency || 'USD']}</span>
                </div>
              </div>

              <Button type="submit" className="w-full h-11 mt-2 bg-blue-600 hover:bg-blue-700 text-white font-bold border-none">
                Create Alert
              </Button>
            </form>
          </div>
        </div>
      )}
      <button
        className="chatbot-toggle-btn"
        onClick={() => setIsChatOpen(!isChatOpen)}
      >
        {isChatOpen ? <X size={24} /> : <MessageSquare size={24} />}
      </button>

      <AnimatePresence>
        {is2FAModalOpen && (
          <motion.div
            className="modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <motion.div
              className="modal-card"
              style={{ maxWidth: '400px', textAlign: 'center' }}
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
            >
              <h2 style={{ marginBottom: '8px' }}>Setup 2FA</h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginBottom: '20px' }}>Scan this QR code with Google Authenticator or Authy.</p>

              {qrCodeUrl && (
                <img src={qrCodeUrl} alt="2FA QR Code" style={{ margin: '0 auto 20px auto', borderRadius: '12px', border: '4px solid white', width: '200px', height: '200px' }} />
              )}

              <div className="form-group" style={{ textAlign: 'left' }}>
                <label style={{ color: 'var(--text-muted)' }}>Enter 6-digit code</label>
                <input
                  type="text"
                  maxLength="6"
                  value={twoFactorCode}
                  onChange={(e) => setTwoFactorCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="000000"
                  style={{ backgroundColor: 'var(--bg-main)', color: 'var(--text-main)', borderColor: 'var(--border-color)', textAlign: 'center', fontSize: '24px', letterSpacing: '8px', fontWeight: 'bold' }}
                />
              </div>

              <div className="modal-buttons" style={{ marginTop: '24px' }}>
                <button className="cancel-btn" onClick={() => { setIs2FAModalOpen(false); setTwoFactorCode(''); }}>Cancel</button>
                <button className="confirm-btn" onClick={handleEnable2FA}>Verify & Enable</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {isChatOpen && (
        <div className="chatbot-window">
          <div className="chatbot-header">
            <span>InvestPro AI</span>
            <button onClick={() => setIsChatOpen(false)} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}>
              <X size={18} />
            </button>
          </div>

          <div className="chatbot-messages">
            {chatMessages.map((msg, idx) => (
              <div key={idx} className={`chat-bubble ${msg.sender}`}>
                {msg.text}
              </div>
            ))}
          </div>

          <form onSubmit={handleChatSubmit} className="chatbot-input-area">
            <input
              type="text"
              placeholder="Ask me anything..."
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
            />
            <button type="submit">
              <Send size={20} />
            </button>
          </form>
        </div>
      )}

    </div>
  );
}

export default Dashboard;