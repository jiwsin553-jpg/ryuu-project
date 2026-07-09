import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  BarChart3,
  BadgeCheck,
  Check,
  ChevronRight,
  ChevronDown,
  CreditCard,
  Crown,
  Disc3,
  FileText,
  Filter,
  Gift,
  Headphones,
  HelpCircle,
  KeyRound,
  Lock,
  LogIn,
  LogOut,
  Menu,
  PackageCheck,
  Save,
  Search,
  ShieldCheck,
  ShoppingCart,
  Sparkles,
  Star,
  User,
  Users,
  Zap,
  X,
} from 'lucide-react';
import iconGif from '../Icon/RYUU_ICON.png';
import bannerGif from '../Banner/RYUU_BANNER.png';
import discordIcon from './assets/discord-brand.svg';
import { isSupabaseConfigured, supabase } from './lib/supabase';
import { appConfig, integrations } from './lib/config';
import {
  cancelMercadoPagoPayment,
  createMercadoPagoPayment,
  getMercadoPagoPaymentStatus,
  notifyDiscordOrder,
  notifyEmailOrder,
} from './lib/integrations';

const initialProducts = [
  {
    id: 'ryuu-externo',
    name: 'Ryuu External',
    shortDescription: 'Painel externo para Blood Strike com acesso vitalício.',
    description:
      'Smoke External\n\nAIMBOT:\n- Aimbot Enabled\n- Draw FOV\n- Randomize Aim\n- FOV\n- Smooth\n\nESP:\n- ESP Enabled\n- Box ESP\n- Cornered Box\n- Filled Box\n- Bones ESP\n- Snapline\n\nOVERLAYS:\n- Show Hotkey\n- Watermark\n- Stream Bypass\n\nCOMPATIBILIDADE:\n- Windows 10/11.',
    features: [
      { title: 'AIMBOT', items: ['Aimbot Enabled', 'Draw FOV', 'Randomize Aim', 'FOV', 'Smooth'] },
      { title: 'ESP', items: ['ESP Enabled', 'Box ESP', 'Cornered Box', 'Filled Box', 'Bones ESP', 'Snapline'] },
      { title: 'OVERLAYS', items: ['Show Hotkey', 'Watermark', 'Stream Bypass'] },
      { title: 'COMPATIBILIDADE', items: ['Windows 10/11'] },
    ],
    price: 10,
    stock: 100,
    available: true,
    image: 'Produto principal',
    sales: 138,
  },
  {
    id: 'ryuu-changer',
    name: 'Ryuu Changer',
    shortDescription: 'Ferramenta de personalização avançada. Descrição editável pelo administrador.',
    description: 'Ferramenta de personalização avançada. Descrição editável pelo administrador.',
    features: [{ title: 'STATUS', items: ['Produto em preparação', 'Sem vendas liberadas no momento'] }],
    price: 79,
    available: false,
    image: 'Em breve',
    sales: 42,
  },
  {
    id: 'ryuu-extremer',
    name: 'Ryuu Extremer',
    shortDescription: 'Versão extrema em preparação, com recursos avançados e entrega manual.',
    description: 'Versão extrema em preparação, com recursos avançados e entrega manual.',
    features: [{ title: 'STATUS', items: ['Produto em preparação', 'Sem vendas liberadas no momento'] }],
    price: 147,
    available: false,
    image: 'Em breve',
    sales: 21,
  },
];

const coupons = {
  RYUU10: { type: 'percent', value: 10, label: '10% de desconto' },
  VITALICIO20: { type: 'fixed', value: 20, label: 'R$ 20,00 de desconto' },
};

const initialAdminCoupons = [
  { code: 'RYUU10', type: 'Percentual', value: '10%', status: 'Ativo', limit: 100 },
  { code: 'VITALICIO20', type: 'Valor fixo', value: 'R$ 20,00', status: 'Ativo', limit: 50 },
  { code: 'LANCAMENTO', type: 'Percentual', value: '15%', status: 'Inativo', limit: 25 },
];

const salesDate = [
  { label: 'Seg', vendas: 480, pedidos: 5 },
  { label: 'Ter', vendas: 720, pedidos: 8 },
  { label: 'Qua', vendas: 610, pedidos: 6 },
  { label: 'Qui', vendas: 980, pedidos: 11 },
  { label: 'Sex', vendas: 1320, pedidos: 14 },
  { label: 'Sáb', vendas: 1180, pedidos: 12 },
  { label: 'Dom', vendas: 860, pedidos: 9 },
];

const orders = [];

const users = [];

const roleLabels = {
  usuario: 'Usuário',
  cliente: 'Cliente',
  administrador: 'Administrador',
};

const cartStorageKey = 'ryuu-cart-v3';
const pixStorageKey = 'ryuu-pix-payment-v1';
const pixPaymentTtlMs = 5 * 60 * 1000;

const formatCurrency = (value) =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);

const getSavedPixPayment = () => {
  const savedPix = localStorage.getItem(pixStorageKey);
  if (!savedPix) return null;
  try {
    const parsedPix = JSON.parse(savedPix);
    return parsedPix?.expiresAt ? parsedPix : null;
  } catch {
    return null;
  }
};

const dbProductToProduct = (product) => ({
  id: product.id,
  name: product.name,
  shortDescription: product.short_description,
  description: product.description,
  features: product.features || [],
  price: Number(product.price || 0),
  stock: Number(product.stock || 0),
  available: Boolean(product.available),
  image: product.image,
  sales: Number(product.sales || 0),
});

const productToDbProduct = (product) => ({
  id: product.id,
  name: product.name,
  short_description: product.shortDescription || '',
  description: product.description || '',
  features: product.features || [],
  price: product.price || 0,
  stock: product.stock || 0,
  available: Boolean(product.available),
  image: product.image || '',
  sales: product.sales || 0,
});

const dbOrderToOrder = (order) => ({
  id: `#RY-${String(order.id).slice(0, 6).toUpperCase()}`,
  rawId: order.id,
  client: order.customer_name || 'Cliente Ryuu',
  product: (order.products || []).map((item) => item.name).join(', ') || 'Pedido Ryuu',
  value: Number(order.total || 0),
  status: order.status,
  date: new Date(order.created_at).toLocaleString('pt-BR'),
  createdAt: order.created_at,
  discord: order.discord,
});

const dbCouponToAdminCoupon = (coupon) => ({
  code: coupon.code,
  type: coupon.type === 'percent' ? 'Percentual' : 'Valor fixo',
  value: coupon.type === 'percent' ? `${Number(coupon.value)}%` : formatCurrency(Number(coupon.value)),
  status: coupon.active ? 'Ativo' : 'Inativo',
  limit: coupon.usage_limit,
  rawType: coupon.type,
  rawValue: Number(coupon.value),
});

const adminCouponToDbCoupon = (coupon) => ({
  code: coupon.code.trim().toUpperCase(),
  type: coupon.type === 'Percentual' ? 'percent' : 'fixed',
  value: Number(String(coupon.value).replace(/[^\d,.-]/g, '').replace(',', '.')) || 0,
  active: coupon.status !== 'Inativo',
  usage_limit: Number(coupon.limit || 100),
});

const getDiscordNameFromUser = (user) => {
  const metadata = user.user_metadata || {};
  return (
    metadata.full_name ||
    metadata.name ||
    metadata.preferred_username ||
    metadata.user_name ||
    metadata.global_name ||
    metadata.custom_claims.global_name ||
    ''
  );
};

function App() {
  const [products, setProducts] = useState(initialProducts);
  const [cart, setCart] = useState(() => {
    const savedCart = localStorage.getItem(cartStorageKey);
    return savedCart ? JSON.parse(savedCart) : [];
  });
  const [couponCode, setCouponCode] = useState('');
  const [activeCoupon, setActiveCoupon] = useState(null);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [authTab, setAuthTab] = useState('login');
  const [toast, setToast] = useState(null);
  const [activeView, setActiveView] = useState(() => (getSavedPixPayment() ? 'checkout' : 'home'));
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [deliveryHours, setDeliveryHours] = useState(24);
  const [discordUser, setDiscordUser] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [userRole, setUserRole] = useState('usuario');
  const [checkoutSuccess, setCheckoutSuccess] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [pixPayment, setPixPayment] = useState(getSavedPixPayment);
  const [pixTimeLeft, setPixTimeLeft] = useState(0);
  const [orderStatus, setOrderStatus] = useState(orders);
  const [registeredUsers, setRegisteredUsers] = useState(users);
  const [adminCoupons, setAdminCoupons] = useState(initialAdminCoupons);
  const [couponRules, setCouponRules] = useState(coupons);
  const [isLoadingStore, setIsLoadingStore] = useState(false);

  useEffect(() => {
    localStorage.setItem(cartStorageKey, JSON.stringify(cart));
  }, [cart]);

  useEffect(() => {
    if (!products.length || !cart.length) return;

    setCart((current) => {
      let changed = false;
      const nextCart = current
        .map((item) => {
          const product = products.find((currentProduct) => currentProduct.id === (item.productId || item.id));
          if (!product || !product.available) {
            changed = true;
            return null;
          }

          const nextQuantity = Math.min(item.quantity, Math.max(product.stock || 0, 0));
          if (nextQuantity <= 0) {
            changed = true;
            return null;
          }

          const nextItem = {
            ...item,
            ...product,
            productId: product.id,
            displayName: product.name,
            accessLabel: item.accessLabel || 'Vitalício',
            quantity: nextQuantity,
          };

          if (
            nextItem.price !== item.price ||
            nextItem.name !== item.name ||
            nextItem.quantity !== item.quantity ||
            nextItem.available !== item.available
          ) {
            changed = true;
          }

          return nextItem;
        })
        .filter(Boolean);

      return changed ? nextCart : current;
    });
  }, [products]);

  useEffect(() => {
    if (pixPayment) {
      localStorage.setItem(pixStorageKey, JSON.stringify(pixPayment));
    } else {
      localStorage.removeItem(pixStorageKey);
    }
  }, [pixPayment]);

  const notify = (message, type = 'success') => setToast({ message: `Ryuu: ${message}`, type });

  const ensureProfile = async (user) => {
    if (!isSupabaseConfigured || !user) return null;

    const { data: existingProfile } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle();
    if (existingProfile) return existingProfile;

    const nextProfile = {
      id: user.id,
      name: user.user_metadata.name || user.email?.split('@')[0] || 'Cliente Ryuu',
      email: user.email || '',
      discord: getDiscordNameFromUser(user),
      role: 'usuario',
    };

    const { data, error } = await supabase.from('profiles').upsert(nextProfile, { onConflict: 'id' }).select('*').single();
    if (error) {
      notify(error.message, 'error');
      return null;
    }
    return data;
  };

  const loadStoreData = async (user = currentUser, nextProfile = profile) => {
    if (!isSupabaseConfigured) return;

    setIsLoadingStore(true);
    try {
      const [{ data: dbProducts, error: productsError }, { data: dbCoupons, error: couponsError }] = await Promise.all([
        supabase.from('products').select('*').order('created_at', { ascending: true }),
        supabase.from('coupons').select('*').order('created_at', { ascending: false }),
      ]);

      if (productsError) throw productsError;
      if (couponsError) throw couponsError;

      if (dbProducts.length) setProducts(dbProducts.map(dbProductToProduct));

      if (dbCoupons) {
        setAdminCoupons(dbCoupons.map(dbCouponToAdminCoupon));
        const activeCoupons = dbCoupons
          .filter((coupon) => coupon.active)
          .reduce((acc, coupon) => {
            acc[coupon.code] = {
              type: coupon.type,
              value: Number(coupon.value),
              label:
                coupon.type === 'percent'
                  ? `${Number(coupon.value)}% de desconto`
                  : `${formatCurrency(Number(coupon.value))} de desconto`,
            };
            return acc;
          }, {});
        setCouponRules(activeCoupons);
      }

      if (user) {
        const query =
          nextProfile?.role === 'administrador'
            ? supabase.from('orders').select('*').order('created_at', { ascending: false })
            : supabase.from('orders').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
        const { data: dbOrders, error: ordersError } = await query;
        if (ordersError) throw ordersError;
        setOrderStatus((dbOrders || []).map(dbOrderToOrder));

        if (nextProfile?.role === 'administrador') {
          const { data: dbProfiles, error: profilesError } = await supabase
            .from('profiles')
            .select('*')
            .order('created_at', { ascending: false });
          if (profilesError) throw profilesError;
          setRegisteredUsers(
            (dbProfiles || []).map((item) => ({
              id: item.id,
              name: item.name || 'Sem nome',
              email: item.email,
              discord: item.discord || '-',
              role: item.role,
              orders: '-',
            })),
          );
        }
      }
    } catch (error) {
      notify(error.message || 'Erro ao carregar dados.', 'error');
    } finally {
      setIsLoadingStore(false);
    }
  };

  useEffect(() => {
    if (!isSupabaseConfigured) return undefined;

    let mounted = true;

    const boot = async () => {
      const { data } = await supabase.auth.getSession();
      const user = data.session?.user || null;
      if (!mounted) return;

      setCurrentUser(user);
      setIsLoggedIn(Boolean(user));

      if (user) {
        const nextProfile = await ensureProfile(user);
        if (!mounted) return;
        setProfile(nextProfile);
        setUserRole(nextProfile?.role || 'usuario');
        setDiscordUser(nextProfile?.discord || '');
        await loadStoreData(user, nextProfile);
      } else {
        await loadStoreData(null, null);
      }
    };

    boot();

    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const user = session?.user || null;
      setCurrentUser(user);
      setIsLoggedIn(Boolean(user));
      if (user) {
        const nextProfile = await ensureProfile(user);
        setProfile(nextProfile);
        setUserRole(nextProfile?.role || 'usuario');
        setDiscordUser(nextProfile?.discord || '');
        await loadStoreData(user, nextProfile);
      } else {
        setProfile(null);
        setUserRole('usuario');
        setOrderStatus([]);
      }
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = setTimeout(() => setToast(null), 3200);
    return () => clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    const normalized = couponCode.trim().toUpperCase();
    setActiveCoupon(couponRules[normalized] ? { code: normalized, ...couponRules[normalized] } : null);
  }, [couponCode, couponRules]);

  useEffect(() => {
    if (activeView === 'dashboard' && !isLoggedIn) {
      setIsAuthOpen(true);
      setActiveView('home');
    }

    if (activeView === 'admin' && userRole !== 'administrador') {
      setActiveView('home');
    }
  }, [activeView, isLoggedIn, userRole]);

  useEffect(() => {
    if (activeView === 'checkout' && !discordUser && profile?.discord) {
      setDiscordUser(profile?.discord);
    }
  }, [activeView, discordUser, profile]);

  const subtotal = useMemo(() => cart.reduce((total, item) => total + item.price * item.quantity, 0), [cart]);

  const discount = useMemo(() => {
    if (!activeCoupon) return 0;
    if (activeCoupon.type === 'percent') return subtotal * (activeCoupon.value / 100);
    return Math.min(activeCoupon.value, subtotal);
  }, [activeCoupon, subtotal]);

  const total = Math.max(subtotal - discount, 0);
  const cartCount = cart.reduce((count, item) => count + item.quantity, 0);

  const addToCart = (product) => {
    if (!product.available) {
      notify('Este produto está indisponível no momento.', 'error');
      return;
    }

    if (product.stock <= 0) {
      notify('Sem estoque no momento.', 'error');
      return;
    }

    const cartItem = {
      ...product,
      productId: product.id,
      displayName: product.name,
      accessLabel: 'Vitalício',
    };

    const existingItem = cart.find((item) => item.id === cartItem.id);
    if (existingItem && existingItem.quantity >= product.stock) {
      notify('Estoque máximo no carrinho.', 'warning');
      return;
    }

    setCart((current) => {
      const existing = current.find((item) => item.id === cartItem.id);
      if (existing) {
        return current.map((item) => (item.id === cartItem.id ? { ...item, quantity: item.quantity + 1 } : item));
      }
      return [...current, { ...cartItem, quantity: 1 }];
    });
    setIsCartOpen(true);
    notify(`${cartItem.displayName} foi adicionado ao carrinho.`);
  };

  const buyNow = (product) => {
    addToCart(product);
    setSelectedProduct(null);
  };

  const updataQuantity = (productId, quantity) => {
    const nextQuantity = Number(quantity);

    if (!Number.isFinite(nextQuantity)) return;

    if (nextQuantity <= 0) {
      setCart((current) => current.filter((item) => item.id !== productId));
      return;
    }

    const currentItem = cart.find((item) => item.id === productId);
    if (currentItem.stock && nextQuantity > currentItem.stock) {
      notify('Estoque máximo no carrinho.', 'warning');
      return;
    }

    setCart((current) =>
      current.map((item) => (item.id === productId ? { ...item, quantity: Math.floor(nextQuantity) } : item)),
    );
  };

  const handleCheckout = () => {
    if (!cart.length) {
      notify('Adicione um produto ao carrinho antes de finalizar.', 'warning');
      return;
    }

    if (!isLoggedIn) {
      setIsAuthOpen(true);
      notify('Faça login para continuar para o checkout.', 'warning');
      return;
    }

    setActiveView('checkout');
    setIsCartOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const createOrder = async (method) => {
    if (!discordUser.trim()) {
      notify('Informe seu usuario do Discord para continuar.', 'error');
      return null;
    }

    if (!isSupabaseConfigured || !currentUser) {
      notify('Supabase obrigatório para criar pedido.', 'error');
      return null;
    }

    const payload = {
      user_id: currentUser.id,
      customer_name: profile.name || currentUser.email?.split('@')[0] || 'Cliente Ryuu',
      customer_email: currentUser.email || '',
      discord: discordUser.trim(),
      products: cart.map((item) => ({
        id: item.productId || item.id,
        name: item.name,
        quantity: item.quantity,
        price: item.price,
      })),
      coupon_code: activeCoupon?.code || null,
      subtotal,
      discount,
      total,
      status: 'Aguardando Pagamento',
      payment_method: method,
    };

    const { data, error } = await supabase.from('orders').insert(payload).select('*').single();
    if (error) {
      notify(error.message, 'error');
      return null;
    }

    const nextProfile = { ...(profile || {}), discord: discordUser.trim() };
    await supabase.from('profiles').update({ discord: nextProfile.discord }).eq('id', currentUser.id);
    setProfile(nextProfile);
    const mappedOrder = dbOrderToOrder(data);
    setOrderStatus((current) => [mappedOrder, ...current]);
    return { ...mappedOrder, raw: data };
  };

  const buildCheckoutPayload = (order) => ({
    orderId: order.rawId || order.id,
    items: cart.map((item) => ({
      id: item.productId || item.id,
      name: item.name,
      quantity: item.quantity,
      price: item.price,
    })),
    customer: {
      name: profile?.name || currentUser.email?.split('@')[0] || 'Cliente Ryuu',
      email: currentUser.email || profile?.email || '',
      discord: discordUser.trim(),
    },
    coupon: activeCoupon?.code || null,
    subtotal,
    discount,
    total,
  });

  const startPixPayment = async () => {
    if (!discordUser.trim()) {
      notify('Informe seu Discord antes de pagar.', 'warning');
      return;
    }

    if (!integrations.mercadoPago) {
      notify('Pagamento não configurado.', 'error');
      return;
    }

    setIsProcessingPayment(true);
    setPixPayment(null);

    try {
      const order = await createOrder('Pix');
      if (!order) throw new Error('Pedido não foi criado.');

      const payload = buildCheckoutPayload(order);
      await Promise.allSettled([notifyDiscordOrder(payload), notifyEmailOrder(payload)]);

      const result = await createMercadoPagoPayment({
        ...payload,
        payment: {
          payment_method_id: 'pix',
          transaction_amount: total,
          payer: {
            email: currentUser.email || profile?.email || payload.customer.email,
          },
        },
      });

      const transactionData = result.point_of_interaction?.transaction_data || {};
      setPixPayment({
        orderId: order.id,
        rawOrderId: order.rawId,
        paymentId: result.id,
        qrCode: transactionData.qr_code || '',
        qrCodeBase64: transactionData.qr_code_base64 || '',
        ticketUrl: transactionData.ticket_url || '',
        status: result.status || 'pending',
        createdAt: Date.now(),
        expiresAt: Date.now() + pixPaymentTtlMs,
      });

      notify('Pix gerado. Aguardando pagamento.', 'warning');
    } catch (error) {
      notify(error.message || 'Erro ao gerar Pix.', 'error');
    } finally {
      setIsProcessingPayment(false);
    }
  };

  const applyPaymentStatus = (rawOrderId, status) => {
    setOrderStatus((current) =>
      current.map((order) => (order.rawId === rawOrderId ? { ...order, status } : order)),
    );
  };

  const startMercadoPagoPayment = async (paymentDate) => {
    if (!integrations.mercadoPago) {
      notify('Mercado Pago não está configurado.', 'error');
      throw new Error('Mercado Pago não configurado.');
    }

    setIsProcessingPayment(true);

    try {
      const order = await createOrder('Mercado Pago');
      if (!order) throw new Error('Pedido não foi criado.');

      const payload = buildCheckoutPayload(order);
      await Promise.allSettled([notifyDiscordOrder(payload), notifyEmailOrder(payload)]);

      const result = await createMercadoPagoPayment({
        ...payload,
        payment: paymentDate,
      });

      const status = result.status || result.payment?.status;
      const statusDetail = result.status_detail || result.payment?.status_detail;

      if (status === 'approved') {
        notify('Pagamento aprovado. Pedido enviado para entrega.');
        setCheckoutSuccess(true);
        setPixPayment(null);
        setCart([]);
        return result;
      }

      if (status === 'pending' || status === 'in_process') {
        notify('Pagamento pendente. Assim que aprovar, liberamos a entrega.', 'warning');
        setCheckoutSuccess(true);
        return result;
      }

      throw new Error(statusDetail || 'Pagamento não aprovado.');
    } catch (error) {
      notify(error.message || 'Erro ao processar pagamento.', 'error');
      throw error;
    } finally {
      setIsProcessingPayment(false);
    }
  };

  const cancelPixPayment = async ({ silent = false, expired = false } = {}) => {
    if (!pixPayment?.paymentId || !pixPayment?.rawOrderId) {
      setPixPayment(null);
      return;
    }

    if (!silent && !window.confirm('Cancelar este pagamento Pix?')) return;

    setIsProcessingPayment(true);
    try {
      await cancelMercadoPagoPayment({
        paymentId: pixPayment.paymentId,
        orderId: pixPayment.rawOrderId,
      });

      applyPaymentStatus(pixPayment.rawOrderId, 'Cancelado');
      setPixPayment(null);
      notify(expired ? 'Tempo esgotado. Pedido cancelado.' : 'Pagamento cancelado.', expired ? 'warning' : 'success');
    } catch (error) {
      notify(error.message || 'Erro ao cancelar pagamento.', 'error');
    } finally {
      setIsProcessingPayment(false);
    }
  };

  useEffect(() => {
    if (!pixPayment?.expiresAt) {
      setPixTimeLeft(0);
      return undefined;
    }

    const tick = () => {
      const remaining = Math.max(0, pixPayment.expiresAt - Date.now());
      setPixTimeLeft(remaining);

      if (remaining <= 0) {
        cancelPixPayment({ silent: true, expired: true });
      }
    };

    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [pixPayment?.expiresAt]);

  useEffect(() => {
    if (!pixPayment?.paymentId || !pixPayment?.rawOrderId) return undefined;

    let cancelled = false;

    const checkPaymentStatus = async () => {
      try {
        const result = await getMercadoPagoPaymentStatus({
          paymentId: pixPayment.paymentId,
          orderId: pixPayment.rawOrderId,
        });

        if (cancelled) return;

        if (result.status === 'approved') {
          applyPaymentStatus(pixPayment.rawOrderId, 'Aguardando Envio');
          setPixPayment(null);
          setCart([]);
          setCheckoutSuccess(true);
          notify('Pagamento aprovado. Pedido enviado para entrega.');
        }

        if (['cancelled', 'rejected', 'refunded'].includes(result.status)) {
          applyPaymentStatus(pixPayment.rawOrderId, 'Cancelado');
          setPixPayment(null);
          notify('Pedido cancelado.', 'warning');
        }
      } catch {
        // Mantem o Pix na tela; o webhook ainda pode atualizar o pedido.
      }
    };

    checkPaymentStatus();
    const timer = setInterval(checkPaymentStatus, 5000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [pixPayment?.paymentId, pixPayment?.rawOrderId]);

  const handleAuth = async (event) => {
    event.preventDefault();
    const formDate = new FormData(event.currentTarget);
    const email = String(formDate.get('email') || '').trim().toLowerCase();
    const password = String(formDate.get('password') || '');
    const name = String(formDate.get('name') || '').trim();

    if (!isSupabaseConfigured) {
      notify('Supabase não configurado.', 'error');
      return;
    }

    const response =
      authTab === 'login'
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({
            email,
            password,
            options: { data: { name } },
          });

    if (response.error) {
      notify(response.error.message, 'error');
      return;
    }

    const user = response.data.user || response.data.session?.user;
    if (user) {
      const nextProfile = await ensureProfile(user);
      setCurrentUser(user);
      setProfile(nextProfile);
      setIsLoggedIn(true);
      setUserRole(nextProfile?.role || 'usuario');
    }

    setIsAuthOpen(false);
    notify(response.data.session ? (authTab === 'login' ? 'Login realizado.' : 'Conta criada.') : 'Confira seu Gmail para confirmar a conta.');
  };

  const handleSignOut = async () => {
    if (isSupabaseConfigured) {
      const { error } = await supabase.auth.signOut();
      if (error) {
        notify(error.message, 'error');
        return;
      }
    }

    setCurrentUser(null);
    setProfile(null);
    setIsLoggedIn(false);
    setUserRole('usuario');
    setUserMenuOpen(false);
    setActiveView('home');
    notify('Você saiu da conta.');
  };

  const handleDiscordAuth = async () => {
    if (!isSupabaseConfigured) {
      notify('Supabase não configurado.', 'error');
      return;
    }

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'discord',
      options: { redirectTo: window.location.origin },
    });

    if (error) notify(error.message, 'error');
  };

  const markAsSent = async (orderId) => {
    const rawId = orderStatus.find((order) => order.id === orderId)?.rawId;

    if (isSupabaseConfigured && rawId) {
      const { error } = await supabase
        .from('orders')
        .update({ status: 'Acesso Enviado', sent_at: new Date().toISOString() })
        .eq('id', rawId);

      if (error) {
        notify(error.message, 'error');
        return;
      }
    }

    setOrderStatus((current) =>
      current.map((order) =>
        order.id === orderId
          ? { ...order, status: 'Acesso Enviado', data: new Date().toLocaleString('pt-BR') }
          : order,
      ),
    );
    notify('Pedido marcado como Acesso Enviado.');
  };

  const deleteOrder = async (orderId) => {
    if (!window.confirm('Excluir este pedido?')) return;

    const order = orderStatus.find((item) => item.id === orderId);

    if (isSupabaseConfigured && order?.rawId) {
      const { error } = await supabase.from('orders').delete().eq('id', order.rawId);
      if (error) {
        notify(error.message, 'error');
        return;
      }
    }

    setOrderStatus((current) => current.filter((item) => item.id !== orderId));
    notify('Pedido removido.');
  };

  const updataProduct = (productId, field, value) => {
    setProducts((current) =>
      current.map((product) =>
        product.id === productId
          ? {
              ...product,
              [field]: ['price', 'stock'].includes(field) ? Number(value) : value,
            }
          : product,
      ),
    );
  };

  const saveProduct = async (product) => {
    if (isSupabaseConfigured) {
      const { error } = await supabase.from('products').upsert(productToDbProduct(product));
      if (error) {
        notify(error.message, 'error');
        return;
      }
    }

    notify('Produto salvo.');
  };

  const addProduct = async () => {
    const newProduct = {
      id: `produto-${Date.now()}`,
      name: 'Novo Produto',
      shortDescription: 'Descrição curta editável pelo administrador.',
      description: 'Descrição completa editável pelo administrador.',
      features: [{ title: 'STATUS', items: ['Produto recém-criado'] }],
      price: 99,
      stock: 0,
      available: false,
      image: 'Novo produto',
      sales: 0,
    };

    if (isSupabaseConfigured) {
      const { error } = await supabase.from('products').insert(productToDbProduct(newProduct));
      if (error) {
        notify(error.message, 'error');
        return;
      }
    }

    setProducts((current) => [...current, newProduct]);
    notify('Produto criado.');
  };

  const duplicateProduct = async (product) => {
    const newProduct = {
      ...product,
      id: `produto-${Date.now()}`,
      name: `${product.name} cópia`,
      sales: 0,
      available: false,
    };

    if (isSupabaseConfigured) {
      const { error } = await supabase.from('products').insert(productToDbProduct(newProduct));
      if (error) {
        notify(error.message, 'error');
        return;
      }
    }

    setProducts((current) => [...current, newProduct]);
    notify('Produto duplicado.');
  };

  const removeProduct = async (productId) => {
    if (!window.confirm('Excluir este produto?')) return;

    if (isSupabaseConfigured) {
      const { error } = await supabase.from('products').delete().eq('id', productId);
      if (error) {
        notify(error.message, 'error');
        return;
      }
    }

    setProducts((current) => current.filter((product) => product.id !== productId));
    notify('Produto removido.');
  };

  const saveProfile = async (nextProfile) => {
    if (isSupabaseConfigured && currentUser) {
      if (nextProfile.password) {
        const { error: passwordError } = await supabase.auth.updateUser({ password: nextProfile.password });
        if (passwordError) {
          notify(passwordError.message, 'error');
          return;
        }
      }

      if (nextProfile.email && nextProfile.email !== currentUser.email) {
        const { error: emailError } = await supabase.auth.updateUser({ email: nextProfile.email });
        if (emailError) {
          notify(emailError.message, 'error');
          return;
        }
      }

      const { error } = await supabase
        .from('profiles')
        .update({
          name: nextProfile.name,
          email: nextProfile.email,
          discord: nextProfile.discord,
        })
        .eq('id', currentUser.id);

      if (error) {
        notify(error.message, 'error');
        return;
      }
    }

    const { password, ...profileDate } = nextProfile;
    setProfile((current) => ({ ...(current || {}), ...profileDate }));
    setDiscordUser(nextProfile.discord || '');
    notify('Perfil salvo.');
  };

  const navItems = useMemo(() => {
    return [
      { label: 'Início', id: 'home' },
      { label: 'Catálogo', id: 'catalogo' },
    ];
  }, []);

  return (
    <div className="min-h-screen overflow-x-hidden text-white">
      <Navbar
        navItems={navItems}
        activeView={activeView}
        setActiveView={setActiveView}
        cartCount={cartCount}
        setIsCartOpen={setIsCartOpen}
        setIsAuthOpen={setIsAuthOpen}
        setUserMenuOpen={setUserMenuOpen}
        userMenuOpen={userMenuOpen}
        isLoggedIn={isLoggedIn}
        userRole={userRole}
        profile={profile}
        currentUser={currentUser}
        handleSignOut={handleSignOut}
        mobileMenuOpen={mobileMenuOpen}
        setMobileMenuOpen={setMobileMenuOpen}
      />

      <main>
        {activeView === 'home' && (
          <>
            <Hero setActiveView={setActiveView} />
            <HomeSalesSections deliveryHours={deliveryHours} setActiveView={setActiveView} />
          </>
        )}

        {activeView === 'catalogo' && (
          <ProductCatalog
            products={products}
            addToCart={addToCart}
            setSelectedProduct={setSelectedProduct}
            standalone
          />
        )}

        {activeView === 'checkout' && (
          <Checkout
            cart={cart}
            subtotal={subtotal}
            discount={discount}
            total={total}
            activeCoupon={activeCoupon}
            deliveryHours={deliveryHours}
            discordUser={discordUser}
            setDiscordUser={setDiscordUser}
            pixPayment={pixPayment}
            pixTimeLeft={pixTimeLeft}
            startPixPayment={startPixPayment}
            cancelPixPayment={cancelPixPayment}
            checkoutSuccess={checkoutSuccess}
            startMercadoPagoPayment={startMercadoPagoPayment}
            isProcessingPayment={isProcessingPayment}
            setActiveView={setActiveView}
            notify={notify}
          />
        )}

        {activeView === 'dashboard' && (
          <UserDashboard
            isLoggedIn={isLoggedIn}
            userRole={userRole}
            setIsAuthOpen={setIsAuthOpen}
            setActiveView={setActiveView}
            orderStatus={orderStatus}
            profile={profile}
            currentUser={currentUser}
            saveProfile={saveProfile}
          />
        )}

        {activeView === 'admin' && (
          <AdminDashboard
            deliveryHours={deliveryHours}
            setDeliveryHours={setDeliveryHours}
            products={products}
            updataProduct={updataProduct}
            saveProduct={saveProduct}
            addProduct={addProduct}
            duplicateProduct={duplicateProduct}
            removeProduct={removeProduct}
            orders={orderStatus}
            markAsSent={markAsSent}
            deleteOrder={deleteOrder}
            userRole={userRole}
            users={registeredUsers}
            setUsers={setRegisteredUsers}
            coupons={adminCoupons}
            setCoupons={setAdminCoupons}
            notify={notify}
            profile={profile}
            currentUser={currentUser}
          />
        )}
      </main>

      <Footer />

      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        cart={cart}
        updataQuantity={updataQuantity}
        subtotal={subtotal}
        discount={discount}
        total={total}
        couponCode={couponCode}
        setCouponCode={setCouponCode}
        activeCoupon={activeCoupon}
        handleCheckout={handleCheckout}
      />

      {isAuthOpen && (
        <AuthModal
          authTab={authTab}
          setAuthTab={setAuthTab}
          onClose={() => setIsAuthOpen(false)}
          handleAuth={handleAuth}
          handleDiscordAuth={handleDiscordAuth}
        />
      )}

      {selectedProduct && (
        <ProductDetailModal
          product={selectedProduct}
          onClose={() => setSelectedProduct(null)}
          addToCart={buyNow}
          deliveryHours={deliveryHours}
        />
      )}

      {toast && <Toast toast={toast} />}
    </div>
  );
}

function Navbar({
  navItems,
  activeView,
  setActiveView,
  cartCount,
  setIsCartOpen,
  setIsAuthOpen,
  userMenuOpen,
  setUserMenuOpen,
  isLoggedIn,
  userRole,
  profile,
  currentUser,
  handleSignOut,
  mobileMenuOpen,
  setMobileMenuOpen,
}) {
  const userName = profile?.name || currentUser?.user_metadata?.name || currentUser?.email?.split('@')[0] || 'Usuário';
  const userButtonLabel = isLoggedIn ? userName : 'Entrar';

  const navigate = (id) => {
    setActiveView(id);
    setMobileMenuOpen(false);
    setUserMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const openAccount = (tab = 'perfil') => {
    window.location.hash = `conta-${tab}`;
    navigate('dashboard');
  };

  const handleUserButtonClick = () => {
    if (!isLoggedIn) {
      setIsAuthOpen(true);
      return;
    }

    setUserMenuOpen((value) => !value);
  };

  return (
    <header className="sticky top-0 z-40 border-b border-pink-300/10 bg-ryuu-black/82 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        <button className="flex items-center gap-3" onClick={() => navigate('home')} type="button">
          <img
            src={iconGif}
            alt="ÍCONE GIF Ryuu Cheats"
            decoding="async"
            className="h-12 w-12 rounded-lg border border-ryuu-neon/40 object-cover shadow-glow-sm"
          />
          <div className="text-left">
            <p className="bg-gradient-to-r from-white via-ryuu-soft to-ryuu-neon bg-clip-text text-xl font-black uppercase tracking-wide text-transparent">
              Ryuu Cheats
            </p>
            <p className="text-xs font-medium text-pink-200/70">Blood Strike Panels</p>
          </div>
        </button>

        <nav className="hidden items-center gap-2 md:flex">
          {navItems.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => navigate(item.id)}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                activeView === item.id ? 'bg-ryuu-neon text-white shadow-glow-sm' : 'text-pink-100/78 hover:bg-white/8'
              }`}
            >
              {item.label}
            </button>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsCartOpen(true)}
            className="relative rounded-full border border-pink-200/15 bg-white/5 p-3 text-pink-100 transition hover:border-ryuu-neon hover:text-white hover:shadow-glow-sm"
            aria-label="Abrir carrinho"
          >
            <ShoppingCart size={19} />
            {cartCount > 0 && (
              <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-ryuu-neon px-1 text-xs font-black">
                {cartCount}
              </span>
            )}
          </button>
          <div className="relative hidden sm:block">
            <button
              type="button"
              onClick={handleUserButtonClick}
              className="flex max-w-48 items-center gap-2 rounded-full bg-gradient-to-r from-ryuu-violet to-ryuu-neon px-4 py-2 text-sm font-bold shadow-glow-sm transition hover:scale-[1.02]"
            >
              {isLoggedIn ? <User size={17} /> : <LogIn size={17} />}
              <span className="truncate">{userButtonLabel}</span>
              {isLoggedIn && <ChevronDown size={15} />}
            </button>

            {isLoggedIn && userMenuOpen && (
              <div className="absolute right-0 mt-3 w-56 overflow-hidden rounded-lg border border-pink-200/15 bg-ryuu-ink shadow-glow">
                <div className="border-b border-pink-200/10 px-4 py-3">
                  <p className="truncate text-sm font-black">{userName}</p>
                  <p className="text-xs font-semibold text-ryuu-soft">{roleLabels[userRole]}</p>
                </div>
                <button
                  type="button"
                  onClick={() => openAccount('perfil')}
                  className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm font-bold text-pink-100 hover:bg-white/8"
                >
                  <User size={16} />
                  Perfil
                </button>
                <button
                  type="button"
                  onClick={() => openAccount('pedidos')}
                  className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm font-bold text-pink-100 hover:bg-white/8"
                >
                  <ShoppingCart size={16} />
                  Pedidos
                </button>
                <button
                  type="button"
                  onClick={() => openAccount('entrega')}
                  className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm font-bold text-pink-100 hover:bg-white/8"
                >
                  <PackageCheck size={16} />
                  Entrega
                </button>
                <button
                  type="button"
                  onClick={() => openAccount('suporte')}
                  className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm font-bold text-pink-100 hover:bg-white/8"
                >
                  <Headphones size={16} />
                  Suporte
                </button>
                {userRole === 'administrador' && (
                  <button
                    type="button"
                    onClick={() => navigate('admin')}
                    className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm font-bold text-pink-100 hover:bg-white/8"
                  >
                    <ShieldCheck size={16} />
                    Admin
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="flex w-full items-center gap-2 border-t border-pink-200/10 px-4 py-3 text-left text-sm font-bold text-red-200 hover:bg-red-500/10"
                >
                  <LogOut size={16} />
                  Sair
                </button>
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={() => setMobileMenuOpen((value) => !value)}
            className="rounded-full border border-pink-200/15 bg-white/5 p-3 md:hidden"
            aria-label="Abrir menu"
          >
            {mobileMenuOpen ? <X size={19} /> : <Menu size={19} />}
          </button>
        </div>
      </div>

      {mobileMenuOpen && (
        <div className="border-t border-pink-300/10 bg-ryuu-ink px-4 py-3 md:hidden">
          <div className="grid gap-2">
            {navItems.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => navigate(item.id)}
                className="rounded-lg px-3 py-2 text-left text-sm font-semibold text-pink-100 hover:bg-white/8"
              >
                {item.label}
              </button>
            ))}
            <button
              type="button"
              onClick={() => {
                if (isLoggedIn) {
                  openAccount('perfil');
                } else {
                  setIsAuthOpen(true);
                  setMobileMenuOpen(false);
                }
              }}
              className="rounded-lg bg-ryuu-neon px-3 py-2 text-left text-sm font-bold"
            >
              {isLoggedIn ? userName : 'Entrar / Cadastrar'}
            </button>
            {isLoggedIn &&
              [
                ['pedidos', 'Pedidos'],
                ['entrega', 'Entrega'],
                ['suporte', 'Suporte'],
              ].map(([tab, label]) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => openAccount(tab)}
                  className="rounded-lg px-3 py-2 text-left text-sm font-semibold text-pink-100 hover:bg-white/8"
                >
                  {label}
                </button>
              ))}
            {isLoggedIn && userRole === 'administrador' && (
              <button
                type="button"
                onClick={() => navigate('admin')}
                className="rounded-lg px-3 py-2 text-left text-sm font-semibold text-pink-100 hover:bg-white/8"
              >
                Admin
              </button>
            )}
            {isLoggedIn && (
              <button
                type="button"
                onClick={handleSignOut}
                className="rounded-lg px-3 py-2 text-left text-sm font-semibold text-red-200 hover:bg-red-500/10"
              >
                Sair
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  );
}

function Hero({ setActiveView }) {
  return (
    <section className="mx-auto max-w-7xl px-4 pb-14 pt-8 sm:px-6 lg:px-8">
      <div className="overflow-hidden rounded-lg border border-ryuu-neon/25 bg-ryuu-ink shadow-glow">
        <img
          src={bannerGif}
          alt="BANNER GIF Ryuu Cheats"
          decoding="async"
          fetchPriority="high"
          className="h-28 w-full object-cover sm:h-44 lg:h-48"
        />
      </div>
      <div className="py-12">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-ryuu-neon/25 bg-ryuu-deep/60 px-4 py-2 text-sm font-semibold text-ryuu-soft">
          <Sparkles size={16} />
          Ryuu Cheats
        </div>
        <h1 className="max-w-4xl text-4xl font-black leading-tight sm:text-5xl lg:text-6xl">
          Paineis para Blood Strike com entrega rápida e suporte direto da{' '}
          <span className="bg-gradient-to-r from-ryuu-soft to-ryuu-neon bg-clip-text text-transparent">Ryuu Cheats</span>
        </h1>
      </div>
    </section>
  );
}

function ProductCatalog({ products, addToCart, setSelectedProduct, standalone = false }) {
  return (
    <section id="catalogo" className={`mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 ${standalone ? 'py-12' : 'py-10'}`}>
      <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-black uppercase tracking-[0.24em] text-ryuu-soft">Catálogo</p>
          <h2 className="mt-2 text-3xl font-black sm:text-4xl">Paineis Ryuu Cheats</h2>
        </div>
      </div>

      <div className="grid gap-5 md:grid-cols-3">
        {products.map((product) => (
            <article
              key={product.id}
              className={`group rounded-lg border p-5 transition ${
                product.available
                  ? 'border-ryuu-neon/35 bg-gradient-to-b from-ryuu-deep/64 to-black/58 shadow-glow-sm hover:-translate-y-1 hover:shadow-glow'
                  : 'border-white/10 bg-white/[0.035] opacity-75'
              }`}
          >
            <ProductImage product={product} className="mb-5 h-36" />
            <div className="mb-3 flex items-start justify-between gap-3">
              <h3 className="text-2xl font-black">{product.name}</h3>
              <StatusBadge available={product.available} />
            </div>
            <p className="min-h-20 text-sm leading-6 text-pink-100/70">
              {product.shortDescription || product.description}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {(product.features || []).slice(0, 3).map((group) => (
                <span
                  key={group.title}
                  className="rounded-full border border-ryuu-neon/20 bg-ryuu-neon/10 px-3 py-1 text-xs font-black text-ryuu-soft"
                >
                  {group.title}
                </span>
              ))}
            </div>
            <div className="my-5 rounded-lg border border-ryuu-neon/18 bg-ryuu-neon/10 p-4">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-ryuu-soft">Acesso vitalício</p>
              <p className="mt-1 text-3xl font-black">{formatCurrency(product.price)}</p>
              {product.available && <p className="mt-2 text-sm text-pink-100/70">Estoque: {product.stock}</p>}
            </div>
            <div className="grid gap-2">
              <button
                type="button"
                onClick={() => setSelectedProduct(product)}
                className="flex w-full items-center justify-center gap-2 rounded-lg border border-ryuu-neon/30 bg-white/5 px-4 py-3 font-black text-pink-50 transition hover:shadow-glow-sm"
              >
                <FileText size={18} />
                Ver detalhes
              </button>
              <button
                type="button"
                onClick={() => addToCart(product)}
                disabled={!product.available}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-ryuu-violet to-ryuu-neon px-4 py-3 font-black text-white shadow-glow-sm transition enabled:hover:scale-[1.02] disabled:cursor-not-allowed disabled:from-zinc-700 disabled:to-zinc-600 disabled:text-zinc-300 disabled:shadow-none"
              >
                <ShoppingCart size={18} />
                {product.available ? 'Adicionar ao Carrinho' : 'Indisponível'}
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function ProductImage({ product, className = 'h-40' }) {
  const image = product.image || '';
  const isImageUrl = /^https?:\/\//i.test(image) || image.startsWith('data:image/');

  return (
    <div className={`overflow-hidden rounded-lg border border-pink-200/12 bg-black/30 ${className}`}>
      {isImageUrl ? (
        <img src={image} alt={product.name} className="h-full w-full object-cover" loading="lazy" />
      ) : (
        <div className="grid h-full place-items-center text-center">
          <div>
            <Crown className="mx-auto mb-2 text-ryuu-soft" size={30} />
            <p className="px-4 text-sm font-bold text-pink-100/68">{image || 'Imagem do produto'}</p>
          </div>
        </div>
      )}
    </div>
  );
}

function ProductDetailModal({ product, onClose, addToCart, deliveryHours }) {
  const [activeTab, setActiveTab] = useState('overview');

  const tabs = [
    { id: 'overview', label: 'Visão geral' },
    { id: 'features', label: 'Recursos' },
    { id: 'delivery', label: 'Entrega' },
    { id: 'terms', label: 'Confiança' },
  ];

  return (
    <div className="fixed inset-0 z-[65] grid place-items-center bg-black/80 px-4 py-6 backdrop-blur-sm">
      <div className="pink-scrollbar glass max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-lg">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-pink-200/10 bg-ryuu-black/94 p-5 backdrop-blur">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.22em] text-ryuu-soft">Detalhes do produto</p>
            <h2 className="mt-1 text-3xl font-black">{product.name}</h2>
          </div>
          <button type="button" onClick={onClose} className="rounded-full bg-white/8 p-2 hover:bg-white/14">
            <X size={20} />
          </button>
        </div>

        <div className="grid gap-6 p-5 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-lg border border-ryuu-neon/20 bg-black/28 p-5">
            <ProductImage product={product} className="h-48" />
            <div className="mt-5 rounded-lg border border-ryuu-neon/18 bg-ryuu-neon/10 p-4">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-ryuu-soft">
                Acesso vitalício
              </p>
              <p className="mt-1 text-4xl font-black">{formatCurrency(product.price)}</p>
              <p className="mt-2 text-sm text-pink-100/70">Estoque: {product.stock}</p>
            </div>
            <button
              type="button"
              onClick={() => addToCart(product)}
              disabled={!product.available || product.stock <= 0}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-ryuu-violet to-ryuu-neon px-4 py-4 font-black text-white shadow-glow-sm transition enabled:hover:scale-[1.01] disabled:cursor-not-allowed disabled:from-zinc-700 disabled:to-zinc-600 disabled:text-zinc-300 disabled:shadow-none"
            >
              <ShoppingCart size={18} />
              {product.available ? 'Comprar agora' : 'Produto indisponível'}
            </button>
          </div>

          <div>
            <div className="mb-5 flex flex-wrap gap-2">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                    className={`rounded-full px-4 py-2 text-sm font-black transition ${
                      activeTab === tab.id
                        ? 'bg-ryuu-neon text-white shadow-glow-sm'
                        : 'border border-pink-200/12 bg-white/5 text-pink-100/72 hover:border-ryuu-neon'
                    }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {activeTab === 'overview' && (
              <div className="rounded-lg border border-pink-200/12 bg-black/22 p-5">
                <h3 className="text-2xl font-black">Smoke External</h3>
                <p className="mt-3 leading-7 text-pink-100/76">{product.shortDescription || product.description}</p>
                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <DetailPill icon={BadgeCheck} label="Status" value={product.available ? 'Disponível' : 'Indisponível'} />
                  <DetailPill icon={KeyRound} label="Acesso" value="Vitalício" />
                  <DetailPill icon={ShieldCheck} label="Sistema" value="Windows 10/11" />
                  <DetailPill icon={Headphones} label="Suporte" value="Discord" />
                </div>
              </div>
            )}

            {activeTab === 'features' && (
              <div className="grid gap-4 sm:grid-cols-2">
                {(product.features || []).map((group) => (
                  <div key={group.title} className="rounded-lg border border-pink-200/12 bg-black/22 p-5">
                    <h3 className="text-lg font-black text-ryuu-soft">{group.title}</h3>
                    <ul className="mt-3 grid gap-2 text-sm text-pink-100/76">
                      {group.items.map((item) => (
                        <li key={item} className="flex items-center gap-2">
                          <Check size={15} className="text-ryuu-soft" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'delivery' && (
              <div className="rounded-lg border border-pink-200/12 bg-black/22 p-5">
                <h3 className="text-2xl font-black">Entrega manual monitorada</h3>
                <p className="mt-3 leading-7 text-pink-100/76">
                  Após a confirmação do pagamento, a equipe Ryuu Cheats envia o acesso manualmente pelo Discord informado
                  no checkout em até {deliveryHours} horas.
                </p>
                <div className="mt-5 rounded-lg border border-ryuu-neon/20 bg-ryuu-neon/10 p-4 text-sm font-bold text-pink-100">
                  Informe seu usuario do Discord corretamente no checkout para evitar atraso na entrega.
                </div>
              </div>
            )}

            {activeTab === 'terms' && (
              <div className="rounded-lg border border-pink-200/12 bg-black/22 p-5">
                <h3 className="text-2xl font-black">Compra clara e suporte direto</h3>
                <div className="mt-4 grid gap-3">
                  {[
                    'Pagamento único, sem assinatura ou renovação.',
                    'Produtos indisponíveis ficam bloqueados para compra.',
                    'Pedido aparece no dashboard do cliente após confirmação.',
                    'Suporte e dúvidas pelo Discord oficial da Ryuu Cheats.',
                  ].map((item) => (
                    <div key={item} className="flex gap-3 rounded-lg bg-white/[0.035] p-3 text-pink-100/78">
                      <ShieldCheck size={18} className="mt-0.5 shrink-0 text-ryuu-soft" />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function DetailPill({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-pink-200/12 bg-white/[0.035] p-3">
      <div className="grid h-10 w-10 place-items-center rounded-lg bg-ryuu-neon/14 text-ryuu-soft">
        <Icon size={18} />
      </div>
      <div>
        <p className="text-xs font-bold text-pink-100/52">{label}</p>
        <p className="font-black">{value}</p>
      </div>
    </div>
  );
}

function HomeSalesSections({ deliveryHours, setActiveView }) {
  const benefits = [
    {
      icon: Zap,
      title: 'Acesso vitalício',
      text: 'Pagamento único para o produto comprado.',
    },
    {
      icon: Headphones,
      title: 'Suporte',
      text: 'Atendimento pelo Discord.',
    },
  ];

  const faqs = [
    {
      q: 'O acesso é mensal',
      a: 'Não. O acesso é vitalício.',
    },
    {
      q: 'Quais sistemas são compatíveis',
      a: 'O Ryuu External informa compatibilidade com Windows 10 e Windows 11.',
    },
    {
      q: 'Em quanto tempo recebo',
      a: `Em até ${deliveryHours} horas após o pagamento.`,
    },
  ];

  return (
    <section className="mx-auto max-w-7xl px-4 pb-14 sm:px-6 lg:px-8">
      <div className="grid gap-4 md:grid-cols-3">
        {benefits.map((item) => (
          <div
            key={item.title}
            className="rounded-lg border border-pink-200/12 bg-white/[0.035] p-5 transition hover:border-ryuu-neon/45 hover:shadow-glow-sm"
          >
            <div className="mb-3 grid h-10 w-10 place-items-center rounded-lg bg-ryuu-neon/18 text-ryuu-soft">
              <item.icon size={20} />
            </div>
            <h3 className="text-lg font-black">{item.title}</h3>
            <p className="mt-1 text-sm leading-6 text-pink-100/70">{item.text}</p>
          </div>
        ))}
      </div>

      <div className="mt-8 grid gap-5 lg:grid-cols-[0.55fr_1fr] lg:items-start">
        <div>
          <p className="text-sm font-black uppercase tracking-[0.22em] text-ryuu-soft">FAQ</p>
          <h2 className="mt-2 text-3xl font-black">Dúvidas rápidas</h2>
        </div>
        <div className="grid gap-3">
          {faqs.map((item) => (
            <details key={item.q} className="rounded-lg border border-pink-200/12 bg-black/24 p-4">
              <summary className="flex cursor-pointer items-center gap-3 font-black text-pink-50">
                <HelpCircle size={18} className="text-ryuu-soft" />
                {item.q}
              </summary>
              <p className="mt-3 pl-8 leading-7 text-pink-100/70">{item.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

function StatusBadge({ available }) {
  return (
    <span
        className={`inline-flex shrink-0 items-center gap-2 rounded-full px-3 py-1 text-xs font-black ${
          available
            ? 'bg-emerald-400/12 text-emerald-300 ring-1 ring-emerald-300/30'
            : 'bg-red-400/10 text-red-200 ring-1 ring-red-300/20'
        }`}
    >
      <span className={`h-2 w-2 rounded-full ${available ? 'animate-pulse bg-emerald-300' : 'bg-red-300'}`} />
      {available ? 'Disponível' : 'Indisponível'}
    </span>
  );
}

function CartDrawer({
  isOpen,
  onClose,
  cart,
  updataQuantity,
  subtotal,
  discount,
  total,
  couponCode,
  setCouponCode,
  activeCoupon,
  handleCheckout,
}) {
  return (
    <div className={`fixed inset-0 z-50 ${isOpen ? 'pointer-events-auto' : 'pointer-events-none'}`}>
      <div
        className={`absolute inset-0 bg-black/70 transition-opacity ${isOpen ? 'opacity-100' : 'opacity-0'}`}
        onClick={onClose}
      />
      <aside
        className={`pink-scrollbar absolute right-0 top-0 flex h-full w-full max-w-md flex-col overflow-y-auto border-l border-ryuu-neon/25 bg-ryuu-black shadow-glow transition-transform duration-300 ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between border-b border-pink-200/10 p-5">
          <div>
            <p className="text-sm font-bold text-ryuu-soft">Carrinho</p>
            <h2 className="text-2xl font-black">Resumo do pedido</h2>
          </div>
          <button type="button" onClick={onClose} className="rounded-full bg-white/8 p-2 hover:bg-white/14">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 p-5">
          {!cart.length ? (
            <div className="grid min-h-64 place-items-center rounded-lg border border-dashed border-pink-200/18 text-center">
              <div>
                <ShoppingCart className="mx-auto mb-3 text-pink-200/60" size={36} />
                <p className="font-bold">Seu carrinho está vazio.</p>
                <p className="mt-1 text-sm text-pink-100/60">Adicione um produto disponível para continuar.</p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {cart.map((item) => (
                <div key={item.id} className="rounded-lg border border-pink-200/12 bg-white/[0.035] p-4">
                  <div className="flex justify-between gap-3">
                    <div>
                      <p className="font-black">{item.name}</p>
                      <p className="text-sm text-ryuu-soft">{item.accessLabel || 'Plano selecionado'}</p>
                    </div>
                    <p className="font-black">{formatCurrency(item.price)}</p>
                  </div>
                  <div className="mt-4 flex items-center justify-between">
                    <div className="flex items-center rounded-full border border-pink-200/15">
                      <button type="button" onClick={() => updataQuantity(item.id, item.quantity - 1)} className="px-3 py-1">
                        -
                      </button>
                      <input
                        type="number"
                        min="1"
                        max={item.stock || undefined}
                        value={item.quantity}
                        onChange={(event) => updataQuantity(item.id, event.target.value)}
                        className="w-12 border-x border-pink-200/15 bg-transparent px-1 py-1 text-center text-sm font-bold outline-none"
                        aria-label={`Quantidade de ${item.name}`}
                      />
                      <button type="button" onClick={() => updataQuantity(item.id, item.quantity + 1)} className="px-3 py-1">
                        +
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => updataQuantity(item.id, 0)}
                      className="text-sm font-bold text-red-200 hover:text-red-100"
                    >
                      Remover
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="mt-5 rounded-lg border border-pink-200/12 bg-black/22 p-4">
            <label htmlFor="coupon" className="text-sm font-black text-pink-100">
              Cupom de desconto
            </label>
            <input
              id="coupon"
              value={couponCode}
              onChange={(event) => setCouponCode(event.target.value)}
              placeholder="Ex: RYUU10"
              className="mt-2 w-full rounded-lg border border-pink-200/15 bg-black/40 px-4 py-3 text-sm outline-none transition focus:border-ryuu-neon"
            />
            {couponCode && (
              <p className={`mt-2 text-sm font-semibold ${activeCoupon ? 'text-emerald-300' : 'text-red-200'}`}>
                {activeCoupon ? `Cupom aplicado: ${activeCoupon.label}` : 'Cupom inválido ou expirado.'}
              </p>
            )}
          </div>
        </div>

        <div className="border-t border-pink-200/10 p-5">
          <PriceRow label="Subtotal" value={subtotal} />
          <PriceRow label="Desconto" value={discount} negative />
          <div className="mt-3 flex items-center justify-between text-xl font-black">
            <span>Total</span>
            <span>{formatCurrency(total)}</span>
          </div>
          <button
            type="button"
            onClick={handleCheckout}
            className="mt-5 w-full rounded-lg bg-gradient-to-r from-ryuu-violet to-ryuu-neon px-4 py-4 font-black shadow-glow-sm transition hover:scale-[1.01]"
          >
            Finalizar compra
          </button>
        </div>
      </aside>
    </div>
  );
}

function PriceRow({ label, value, negative = false }) {
  return (
    <div className="mt-2 flex items-center justify-between text-sm text-pink-100/72">
      <span>{label}</span>
      <span>
        {negative && value > 0 ? '-' : ''}
        {formatCurrency(value)}
      </span>
    </div>
  );
}

function AuthModal({ authTab, setAuthTab, onClose, handleAuth, handleDiscordAuth }) {
  const isLogin = authTab === 'login';

  return (
    <div className="fixed inset-0 z-[60] grid place-items-center bg-black/72 px-4 backdrop-blur-md">
      <div className="glass relative w-full max-w-md rounded-lg p-6 pt-8 text-center shadow-glow">
        <button type="button" onClick={onClose} className="absolute right-4 top-4 rounded-full bg-white/8 p-2 hover:bg-white/14">
          <X size={20} />
        </button>

        <div className="mb-6">
          <div className="mx-auto grid h-24 w-24 place-items-center rounded-2xl border border-ryuu-neon/45 bg-ryuu-deep/35 p-2 shadow-glow">
            <img
              src={iconGif}
              alt="Ryuu Cheats"
              className="h-full w-full rounded-xl object-cover"
            />
          </div>
          <p className="mt-4 text-sm font-black uppercase tracking-[0.18em] text-ryuu-soft">Ryuu Cheats</p>
          <h2 className="mt-1 text-3xl font-black">{isLogin ? 'Entrar' : 'Criar conta'}</h2>
        </div>

        <div className="mb-5 grid grid-cols-2 rounded-lg border border-pink-200/12 bg-black/24 p-1">
          {['login', 'cadastro'].map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setAuthTab(tab)}
              className={`rounded-md py-2 text-sm font-black capitalize ${
                authTab === tab ? 'bg-ryuu-neon text-white' : 'text-pink-100/68'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        <form onSubmit={handleAuth} className="grid gap-3 text-left">
          {authTab === 'cadastro' && (
            <AuthInput label="Nome" name="name" type="text" placeholder="Seu nome completo" autoComplete="name" />
          )}
          <AuthInput label="Gmail" name="email" type="email" placeholder="voce@gmail.com" autoComplete="email" />
          <AuthInput label="Senha" name="password" type="password" placeholder="Sua senha" autoComplete="current-password" />
          <button
            type="submit"
            className="rounded-lg border border-ryuu-neon/35 bg-white/5 px-4 py-3 text-center font-black text-pink-50 transition hover:shadow-glow-sm"
          >
            {isLogin ? 'Entrar' : 'Criar conta'}
          </button>
        </form>

        <div className="my-5 flex items-center gap-3 text-xs font-black uppercase tracking-[0.2em] text-pink-100/45">
          <span className="h-px flex-1 bg-pink-200/12" />
          ou
          <span className="h-px flex-1 bg-pink-200/12" />
        </div>

        <div className="grid gap-3">
          <button
            type="button"
            onClick={handleDiscordAuth}
            className="flex items-center justify-center gap-3 rounded-lg border border-[#5865F2]/55 bg-[#5865F2]/18 px-4 py-3 font-black text-white transition hover:bg-[#5865F2]/28"
          >
            <img src={discordIcon} alt="" className="h-5 w-5" />
            {isLogin ? 'Entrar com Discord' : 'Criar com Discord'}
          </button>
        </div>
      </div>
    </div>
  );
}

function AuthInput({ label, ...props }) {
  return (
    <label className="grid gap-1 text-sm font-bold text-pink-100">
      {label}
      <input
        required
        className="rounded-lg border border-pink-200/15 bg-black/42 px-4 py-3 font-normal outline-none transition focus:border-ryuu-neon"
        {...props}
      />
    </label>
  );
}

function MercadoPagoBrick({ publicKey, amount, enabled, disabled, onPayment }) {
  const [brickError, setBrickError] = useState('');
  const [isReady, setIsReady] = useState(false);
  const onPaymentRef = useRef(onPayment);

  useEffect(() => {
    onPaymentRef.current = onPayment;
  }, [onPayment]);

  useEffect(() => {
    if (!enabled || !publicKey || amount <= 0) return undefined;

    let brickController;
    let cancelled = false;

    const loadScript = () =>
      new Promise((resolve, reject) => {
        if (window.MercadoPago) {
          resolve();
          return;
        }

        const existingScript = document.querySelector('script[src="https://sdk.mercadopago.com/js/v2"]');
        if (existingScript) {
          existingScript.addEventListener('load', resolve, { once: true });
          existingScript.addEventListener('error', reject, { once: true });
          return;
        }

        const script = document.createElement('script');
        script.src = 'https://sdk.mercadopago.com/js/v2';
        script.async = true;
        script.onload = resolve;
        script.onerror = reject;
        document.body.appendChild(script);
      });

    const initBrick = async () => {
      try {
        setBrickError('');
        setIsReady(false);
        await loadScript();
        if (cancelled) return;

        const mercadoPago = new window.MercadoPago(publicKey, { locale: 'pt-BR' });
        const bricksBuilder = mercadoPago.bricks();

        brickController = await bricksBuilder.create('payment', 'mercado-pago-payment-brick', {
          initialization: {
            amount: Number(amount.toFixed(2)),
          },
          customization: {
            visual: {
              style: {
                theme: 'dark',
              },
            },
            paymentMethods: {
              creditCard: 'all',
              maxInstallments: 1,
            },
          },
          callbacks: {
            onReady: () => setIsReady(true),
            onSubmit: ({ formData }) =>
              new Promise((resolve, reject) => {
                onPaymentRef.current(formData).then(resolve).catch(reject);
              }),
            onError: (error) => {
              setBrickError(error.message || 'Erro ao carregar Mercado Pago.');
            },
          },
        });
      } catch (error) {
        setBrickError(error.message || 'Erro ao iniciar Mercado Pago.');
      }
    };

    initBrick();

    return () => {
      cancelled = true;
      if (brickController.unmount) brickController.unmount();
    };
  }, [amount, enabled, publicKey]);

  if (!enabled) {
    return (
      <div className="mt-4 rounded-lg border border-pink-200/12 bg-black/24 p-4 text-sm font-bold text-pink-100/70">
        Pagamento indisponível no momento.
      </div>
    );
  }

  return (
    <div className={`mt-5 rounded-lg border border-pink-200/12 bg-black/24 p-3 ${disabled ? 'opacity-65' : ''}`}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <span className="rounded-full border border-ryuu-neon/25 bg-ryuu-neon/10 px-3 py-1 text-xs font-black text-ryuu-soft">
            Cartão
          </span>
        </div>
        {!isReady && <span className="text-xs font-black text-ryuu-soft">Carregando...</span>}
      </div>
      {brickError && (
        <div className="mb-3 rounded-md border border-red-300/25 bg-red-500/10 p-3 text-xs font-bold text-red-100">
          {brickError}
        </div>
      )}
      <div id="mercado-pago-payment-brick" className={disabled ? 'pointer-events-none' : ''} />
    </div>
  );
}

function formatTimer(milliseconds) {
  const totalSeconds = Math.max(0, Math.ceil(milliseconds / 1000));
  const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, '0');
  const seconds = String(totalSeconds % 60).padStart(2, '0');
  return `${minutes}:${seconds}`;
}

function PixPaymentBox({ pixPayment, pixTimeLeft, disabled, isProcessingPayment, startPixPayment, cancelPixPayment, notify }) {
  const copyPix = async () => {
    if (!pixPayment?.qrCode) return;
    await navigator.clipboard.writeText(pixPayment.qrCode);
    notify('Pix copiado.');
  };

  return (
    <div className="mt-5 rounded-lg border border-pink-200/12 bg-black/24 p-4">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <p className="font-black">Pix</p>
          <p className="text-xs font-bold text-pink-100/58">QR Code e copia e cola automático.</p>
        </div>
        {pixPayment && (
          <div className="rounded-full border border-amber-200/25 bg-amber-300/10 px-3 py-1 text-xs font-black text-amber-100">
            Expira em {formatTimer(pixTimeLeft)}
          </div>
        )}
        {!pixPayment && (
          <button
            type="button"
            onClick={startPixPayment}
            disabled={disabled || isProcessingPayment}
            className="rounded-lg bg-gradient-to-r from-ryuu-violet to-ryuu-neon px-4 py-3 text-sm font-black shadow-glow-sm disabled:cursor-not-allowed disabled:from-zinc-700 disabled:to-zinc-600 disabled:text-zinc-300 disabled:shadow-none"
          >
            {isProcessingPayment ? 'Gerando...' : 'Gerar Pix'}
          </button>
        )}
      </div>

      {pixPayment && (
        <div className="mt-4 grid gap-4">
          {pixPayment.qrCodeBase64 && (
            <div className="mx-auto w-full max-w-56 rounded-lg bg-white p-3">
              <img
                src={`data:image/png;base64,${pixPayment.qrCodeBase64}`}
                alt="QR Code Pix"
                className="h-auto w-full"
              />
            </div>
          )}
          <div className="rounded-lg border border-pink-200/12 bg-black/34 p-3">
            <p className="mb-2 text-xs font-black uppercase tracking-[0.16em] text-ryuu-soft">Pix copia e cola</p>
            <textarea
              readOnly
              value={pixPayment.qrCode}
              className="h-24 w-full resize-none rounded-lg border border-pink-200/12 bg-black/40 p-3 text-xs text-pink-100 outline-none"
            />
            <button
              type="button"
              onClick={copyPix}
              className="mt-3 w-full rounded-lg border border-ryuu-neon/35 bg-ryuu-neon/10 px-4 py-3 text-sm font-black text-ryuu-soft"
            >
              Copiar Pix
            </button>
            <button
              type="button"
              onClick={cancelPixPayment}
              disabled={isProcessingPayment}
              className="mt-2 w-full rounded-lg border border-red-300/20 bg-red-400/10 px-4 py-3 text-sm font-black text-red-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Cancelar pagamento
            </button>
          </div>
          <p className="rounded-lg border border-amber-200/20 bg-amber-300/10 p-3 text-sm font-bold text-amber-100">
            Após pagar, a aprovação é automática. O pedido muda para Aguardando Envio assim que o banco confirmar.
          </p>
        </div>
      )}
    </div>
  );
}

function Checkout({
  cart,
  subtotal,
  discount,
  total,
  activeCoupon,
  deliveryHours,
  discordUser,
  setDiscordUser,
  pixPayment,
  startPixPayment,
  cancelPixPayment,
  checkoutSuccess,
  startMercadoPagoPayment,
  isProcessingPayment,
  setActiveView,
  notify,
}) {
  if (checkoutSuccess) {
    return (
      <section className="mx-auto grid min-h-[72vh] max-w-3xl place-items-center px-4 py-16 text-center sm:px-6 lg:px-8">
        <div className="glass rounded-lg p-8">
          <div className="mx-auto mb-5 grid h-16 w-16 place-items-center rounded-full bg-emerald-400/18 text-emerald-300">
            <Check size={34} />
          </div>
          <h1 className="text-3xl font-black">Pedido criado</h1>
          <p className="mt-4 leading-8 text-pink-100/76">
            Seu pedido foi salvo. Assim que o pagamento for confirmado, a equipe envia o acesso em até {deliveryHours}{' '}
            horas.
          </p>
          <button
            type="button"
            onClick={() => setActiveView('dashboard')}
            className="mt-7 rounded-lg bg-gradient-to-r from-ryuu-violet to-ryuu-neon px-6 py-3 font-black shadow-glow-sm"
          >
            Ver meu dashboard
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="mb-8">
        <p className="text-sm font-black uppercase tracking-[0.22em] text-ryuu-soft">Checkout</p>
        <h1 className="mt-2 text-4xl font-black">Finalize seu pedido</h1>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_0.72fr]">
        <div className="glass rounded-lg p-6">
          <h2 className="mb-4 text-2xl font-black">Produtos selecionados</h2>
          <div className="grid gap-3">
            {cart.map((item) => (
              <div key={item.id} className="flex items-center justify-between rounded-lg bg-black/26 p-4">
                <div>
                  <p className="font-black">{item.name}</p>
                  <p className="text-sm text-ryuu-soft">
                    Quantidade: {item.quantity} | {item.accessLabel || 'Plano selecionado'}
                  </p>
                </div>
                <p className="font-black">{formatCurrency(item.price * item.quantity)}</p>
              </div>
            ))}
          </div>

          <label className="mt-6 grid gap-2 text-sm font-black text-pink-100">
            Discord para entrega manual
            <input
              required
              value={discordUser}
              onChange={(event) => setDiscordUser(event.target.value)}
              placeholder="Seu Discord"
              className="rounded-lg border border-pink-200/15 bg-black/40 px-4 py-3 font-normal outline-none transition focus:border-ryuu-neon"
            />
          </label>

          <div className="mt-5 rounded-lg border border-amber-200/20 bg-amber-300/10 p-4 text-amber-100">
            Após a confirmação do pagamento, seu acesso será enviado manualmente por nossa equipe em até{' '}
            <strong>{deliveryHours} horas</strong>.
          </div>
        </div>

        <div className="glass rounded-lg p-6">
          <h2 className="text-2xl font-black">Resumo</h2>
          <div className="my-5 border-y border-pink-200/10 py-4">
            <PriceRow label="Subtotal" value={subtotal} />
            <PriceRow label={activeCoupon ? `Cupom ${activeCoupon.code}` : 'Desconto'} value={discount} negative />
            <div className="mt-4 flex items-center justify-between text-2xl font-black">
              <span>Total</span>
              <span>{formatCurrency(total)}</span>
            </div>
          </div>
          {!discordUser.trim() && (
            <div className="mb-4 rounded-lg border border-amber-200/20 bg-amber-300/10 p-3 text-sm font-black text-amber-100">
              Informe seu Discord antes de pagar.
            </div>
          )}
          <h3 className="text-sm font-black uppercase tracking-[0.18em] text-ryuu-soft">Métodos de pagamento</h3>
          <PixPaymentBox
            pixPayment={pixPayment}
            pixTimeLeft={pixTimeLeft}
            disabled={!discordUser.trim() || isProcessingPayment}
            isProcessingPayment={isProcessingPayment}
            startPixPayment={startPixPayment}
            cancelPixPayment={cancelPixPayment}
            notify={notify}
          />
          <MercadoPagoBrick
            publicKey={appConfig.mercadoPago.publicKey}
            amount={total}
            enabled={integrations.mercadoPago}
            disabled={!discordUser.trim() || isProcessingPayment}
            onPayment={startMercadoPagoPayment}
          />
        </div>
      </div>
    </section>
  );
}

function UserDashboard({ isLoggedIn, userRole, setIsAuthOpen, setActiveView, orderStatus, profile, currentUser, saveProfile }) {
  const getInitialAccountTab = () => {
    const tab = window.location.hash.replace('#conta-', '');
    return ['perfil', 'pedidos', 'entrega', 'suporte'].includes(tab) ? tab : 'perfil';
  };
  const [accountTab, setAccountTab] = useState(getInitialAccountTab);

  useEffect(() => {
    const syncHash = () => setAccountTab(getInitialAccountTab());
    syncHash();
    window.addEventListener('hashchange', syncHash);
    return () => window.removeEventListener('hashchange', syncHash);
  }, []);

  if (!isLoggedIn) {
    return (
      <section className="mx-auto grid min-h-[68vh] max-w-2xl place-items-center px-4 py-16 text-center">
        <div className="glass rounded-lg p-8">
          <Lock className="mx-auto mb-4 text-ryuu-soft" size={42} />
          <h1 className="text-3xl font-black">Login obrigatório</h1>
          <p className="mt-3 text-pink-100/70">Entre na sua conta para ver histórico de compras e dados do perfil.</p>
          <button
            type="button"
            onClick={() => setIsAuthOpen(true)}
            className="mt-6 rounded-lg bg-gradient-to-r from-ryuu-violet to-ryuu-neon px-6 py-3 font-black shadow-glow-sm"
          >
            Fazer login
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="mb-8">
        <p className="text-sm font-black uppercase tracking-[0.22em] text-ryuu-soft">Minha conta</p>
        <h1 className="mt-2 text-4xl font-black">Minha conta</h1>
        <p className="mt-3 max-w-2xl text-pink-100/68">
          Atualize seus dados, vincule seu Discord e acompanhe seus pedidos.
        </p>
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        {[
          ['perfil', 'Perfil'],
          ['pedidos', 'Pedidos'],
          ['entrega', 'Entrega'],
          ['suporte', 'Suporte'],
        ].map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => {
              window.location.hash = `conta-${id}`;
              setAccountTab(id);
            }}
            className={`rounded-full px-4 py-2 text-sm font-black transition ${
              accountTab === id
                ? 'bg-ryuu-neon text-white shadow-glow-sm'
                : 'border border-pink-200/12 bg-white/5 text-pink-100/72 hover:border-ryuu-neon'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[0.72fr_1fr]">
        <div className={`glass rounded-lg p-6 ${accountTab !== 'perfil' ? 'hidden lg:block' : ''}`}>
          <h2 className="mb-4 text-2xl font-black">Perfil</h2>
          <ProfileEditor profile={profile} currentUser={currentUser} userRole={userRole} saveProfile={saveProfile} />
          <a
            href="https://discord.gg/SKQXhFHtEp"
            target="_blank"
            rel="noreferrer"
            className="mt-5 flex items-center justify-center gap-2 rounded-lg border border-ryuu-neon/35 bg-ryuu-deep/35 px-4 py-3 font-black hover:shadow-glow-sm"
          >
            <img src={discordIcon} alt="" className="h-5 w-5 object-contain" />
            Contatar no Discord
          </a>
        </div>

        <div className="glass rounded-lg p-6">
          {accountTab === 'perfil' && (
            <>
              <h2 className="mb-4 text-2xl font-black">Resumo</h2>
              <div className="grid gap-3 sm:grid-cols-3">
                <AccountMiniStat label="Cargo" value={roleLabels[userRole] || 'Usuário'} />
                <AccountMiniStat label="Pedidos" value={String(orderStatus.length)} />
                <AccountMiniStat label="Discord" value={profile?.discord || 'Não vinculado'} />
              </div>
            </>
          )}

          {accountTab === 'pedidos' && (
            <>
              <h2 className="mb-4 text-2xl font-black">Histórico de compras</h2>
              <DateTable
                headers={['Pedido', 'Produto', 'Valor', 'Status', 'Data']}
                rows={orderStatus.map((order) => [
                  order.id,
                  order.product,
                  formatCurrency(order.value),
                  order.status,
                  order.data,
                ])}
              />
              {!['cliente', 'administrador'].includes(userRole) && (
                <button
                  type="button"
                  onClick={() => setActiveView('catalogo')}
                  className="mt-5 rounded-lg border border-ryuu-neon/35 bg-white/5 px-4 py-3 font-black text-pink-50 transition hover:shadow-glow-sm"
                >
                  Ver produtos
                </button>
              )}
            </>
          )}

          {accountTab === 'entrega' && (
            <>
              <h2 className="mb-4 text-2xl font-black">Entrega</h2>
              <div className="grid gap-3">
                {orderStatus.length === 0 ? (
                  <p className="rounded-lg border border-pink-200/12 bg-black/24 p-4 text-pink-100/66">
                    Nenhuma entrega pendente.
                  </p>
                ) : (
                  orderStatus.map((order) => (
                    <div key={order.id} className="rounded-lg border border-pink-200/12 bg-black/24 p-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="font-black">{order.product}</p>
                          <p className="text-sm text-pink-100/60">{order.id}</p>
                        </div>
                        <span className="rounded-full border border-ryuu-neon/25 bg-ryuu-neon/10 px-3 py-1 text-xs font-black text-ryuu-soft">
                          {order.status}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </>
          )}

          {accountTab === 'suporte' && (
            <>
              <h2 className="mb-4 text-2xl font-black">Suporte</h2>
              <p className="leading-7 text-pink-100/72">
                Precisa de ajuda com pagamento, entrega ou acesso? Chama a equipe Ryuu no Discord.
              </p>
              <a
                href="https://discord.gg/SKQXhFHtEp"
                target="_blank"
                rel="noreferrer"
                className="mt-5 inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-ryuu-violet to-ryuu-neon px-5 py-3 font-black shadow-glow-sm"
              >
                <img src={discordIcon} alt="" className="h-5 w-5 object-contain" />
                Entrar no Discord
              </a>
            </>
          )}
        </div>
      </div>
    </section>
  );
}

function AccountMiniStat({ label, value }) {
  return (
    <div className="rounded-lg border border-pink-200/12 bg-black/24 p-4">
      <p className="text-xs font-black uppercase tracking-[0.16em] text-pink-100/48">{label}</p>
      <p className="mt-2 truncate text-lg font-black">{value}</p>
    </div>
  );
}

function ProfileEditor({ profile, currentUser, userRole, saveProfile }) {
  const [draft, setDraft] = useState({
    name: profile?.name || currentUser?.user_metadata?.name || currentUser?.email?.split('@')[0] || 'Cliente Ryuu',
    email: profile?.email || currentUser?.email || '',
    discord: profile?.discord || '',
    password: '',
  });

  useEffect(() => {
    setDraft({
      name: profile?.name || currentUser?.user_metadata?.name || currentUser?.email?.split('@')[0] || 'Cliente Ryuu',
      email: profile?.email || currentUser?.email || '',
      discord: profile?.discord || '',
      password: '',
    });
  }, [profile, currentUser]);

  return (
    <div className="grid gap-3">
      <AuthInput
        label="Nome"
        type="text"
        value={draft.name}
        onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))}
      />
      <AuthInput
        label="Gmail"
        type="email"
        value={draft.email}
        onChange={(event) => setDraft((current) => ({ ...current, email: event.target.value }))}
      />
      <AuthInput
        label="Discord"
        type="text"
        value={draft.discord}
        placeholder="seu.discord"
        onChange={(event) => setDraft((current) => ({ ...current, discord: event.target.value }))}
      />
      <label className="grid gap-1 text-sm font-bold text-pink-100">
        Cargo
        <input
          value={roleLabels[userRole] || 'Usuário'}
          disabled
          className="rounded-lg border border-pink-200/15 bg-black/28 px-4 py-3 font-normal text-pink-100/78 outline-none"
        />
      </label>
      <AuthInput
        label="Senha"
        type="password"
        value={draft.password}
        placeholder="Nova senha"
        autoComplete="new-password"
        required={false}
        onChange={(event) => setDraft((current) => ({ ...current, password: event.target.value }))}
      />
      <button
        type="button"
        onClick={() => saveProfile(draft)}
        className="rounded-lg bg-gradient-to-r from-ryuu-violet to-ryuu-neon px-4 py-3 font-black shadow-glow-sm"
      >
        Salvar perfil
      </button>
    </div>
  );
}

function AdminDashboard({
  deliveryHours,
  setDeliveryHours,
  products,
  updataProduct,
  saveProduct,
  addProduct,
  duplicateProduct,
  removeProduct,
  orders: adminOrders,
  markAsSent,
  deleteOrder,
  userRole,
  users: adminUsers,
  setUsers,
  coupons: adminCoupons,
  setCoupons,
  notify,
  profile,
  currentUser,
}) {
  const [orderFilter, setOrderFilter] = useState('Todos');
  const [couponDraft, setCouponDraft] = useState({ code: '', value: '', type: 'Percentual' });
  const adminName = profile?.name || currentUser?.user_metadata?.name || currentUser?.email?.split('@')[0] || 'Admin';
  const revenue = adminOrders.reduce((total, order) => total + order.value, 0);
  const sentCount = adminOrders.filter((order) => order.status === 'Acesso Enviado').length;
  const filteredOrders =
    orderFilter === 'Todos' ? adminOrders : adminOrders.filter((order) => order.status === orderFilter);
  const weeklySalesDate = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'].map((label) => ({
    label,
    vendas: 0,
    pedidos: 0,
  }));

  adminOrders.forEach((order) => {
    const dayIndex = new Date(order.createdAt || order.data).getDay();
    const index = dayIndex === 0 ? 6 : dayIndex - 1;
    if (weeklySalesDate[index]) {
      weeklySalesDate[index].vendas += Number(order.value || 0);
      weeklySalesDate[index].pedidos += 1;
    }
  });

  if (userRole !== 'administrador') {
    return (
      <section className="mx-auto grid min-h-[68vh] max-w-2xl place-items-center px-4 py-16 text-center">
        <div className="glass rounded-lg p-8">
          <Lock className="mx-auto mb-4 text-ryuu-soft" size={42} />
          <h1 className="text-3xl font-black">Acesso administrativo bloqueado</h1>
          <p className="mt-3 text-pink-100/70">
            Esta área aparece somente para contas com cargo Administrador.
          </p>
        </div>
      </section>
    );
  }

  const createCoupon = async () => {
    if (!couponDraft.code.trim() || !couponDraft.value.trim()) {
      notify('Preencha código e valor do cupom.', 'warning');
      return;
    }

    const nextCoupon = {
      code: couponDraft.code.trim().toUpperCase(),
      type: couponDraft.type,
      value: couponDraft.value.trim(),
      status: 'Ativo',
      limit: 100,
    };

    if (isSupabaseConfigured) {
      const { error } = await supabase.from('coupons').insert(adminCouponToDbCoupon(nextCoupon));
      if (error) {
        notify(error.message, 'error');
        return;
      }
    }

    setCoupons((current) => [
      ...current,
      nextCoupon,
    ]);
    setCouponDraft({ code: '', value: '', type: 'Percentual' });
    notify('Cupom criado.');
  };

  const toggleCoupon = async (code) => {
    const coupon = adminCoupons.find((item) => item.code === code);
    const nextActive = coupon.status !== 'Ativo';

    if (isSupabaseConfigured) {
      const { error } = await supabase.from('coupons').update({ active: nextActive }).eq('code', code);
      if (error) {
        notify(error.message, 'error');
        return;
      }
    }

    setCoupons((current) =>
      current.map((coupon) =>
        coupon.code === code ? { ...coupon, status: coupon.status === 'Ativo' ? 'Inativo' : 'Ativo' } : coupon,
      ),
    );
    notify('Cupom atualizado.');
  };

  const deleteCoupon = async (code) => {
    if (!window.confirm('Excluir este cupom?')) return;

    if (isSupabaseConfigured) {
      const { error } = await supabase.from('coupons').delete().eq('code', code);
      if (error) {
        notify(error.message, 'error');
        return;
      }
    }

    setCoupons((current) => current.filter((coupon) => coupon.code !== code));
    notify('Cupom removido.');
  };

  const updateUserRole = async (userId, role) => {
    if (!userId) {
      notify('Usuário sem ID.', 'error');
      return;
    }

    if (isSupabaseConfigured) {
      const { error } = await supabase.from('profiles').update({ role }).eq('id', userId);
      if (error) {
        notify(error.message, 'error');
        return;
      }
    }

    setUsers((current) => current.map((user) => (user.id === userId ? { ...user, role } : user)));
    notify('Cargo atualizado.');
  };

  const handleProductImageUpload = async (product, file) => {
    if (!file) return;

    const maxSize = 20 * 1024 * 1024;
    if (file.size > maxSize) {
      notify('Imagem muito grande. Limite: 20MB.', 'error');
      return;
    }

    if (!isSupabaseConfigured) {
      notify('Supabase Storage não configurado.', 'error');
      return;
    }

    const extension = file.name.split('.').pop() || 'png';
    const path = `${product.id}/${Date.now()}.${extension}`;
    const { error: uploadError } = await supabase.storage.from('product-images').upload(path, file, {
      cacheControl: '3600',
      upsert: true,
    });

    if (uploadError) {
      notify(uploadError.message, 'error');
      return;
    }

    const { data } = supabase.storage.from('product-images').getPublicUrl(path);
    updataProduct(product.id, 'image', data.publicUrl);
    notify('Imagem adicionada.');
  };

  return (
    <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <p className="text-sm font-black uppercase tracking-[0.22em] text-ryuu-soft">Admin Dashboard</p>
          <h1 className="mt-2 text-4xl font-black">Painel administrativo</h1>
          <p className="mt-3 max-w-2xl text-pink-100/62">
            Controle pedidos, produtos, usuários e cupons em um só lugar.
          </p>
        </div>
        <div className="inline-flex items-center gap-2 rounded-full border border-ryuu-neon/25 bg-ryuu-deep/40 px-4 py-2 text-sm font-bold text-pink-100">
          <ShieldCheck size={17} /> Bem-vindo, {adminName}
        </div>
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        {[
          ['Resumo', '#admin-resumo'],
          ['Pedidos', '#admin-pedidos'],
          ['Produtos', '#admin-produtos'],
          ['Usuários', '#admin-usuarios'],
          ['Cupons', '#admin-cupons'],
        ].map(([label, href]) => (
          <a
            key={href}
            href={href}
            className="rounded-full border border-pink-200/12 bg-white/5 px-4 py-2 text-sm font-black text-pink-100/80 transition hover:border-ryuu-neon hover:text-white"
          >
            {label}
          </a>
        ))}
      </div>

      <div id="admin-resumo" className="grid scroll-mt-24 gap-5 md:grid-cols-3">
        <AdminStat icon={CreditCard} label="Receita total" value={formatCurrency(revenue)} />
        <AdminStat icon={ShoppingCart} label="Pedidos" value={String(adminOrders.length)} />
        <AdminStat icon={PackageCheck} label="Acessos enviados" value={String(sentCount)} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="glass rounded-lg p-6">
          <h2 className="mb-5 text-2xl font-black">Vendas da semana</h2>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={weeklySalesDate}>
                <defs>
                  <linearGradient id="vendas" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="5%" stopColor="#FF2D8D" stopOpacity={0.75} />
                    <stop offset="95%" stopColor="#FF2D8D" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="rgba(216,180,254,.12)" />
                <XAxis dataKey="label" stroke="#FFB3D6" />
                <YAxis stroke="#FFB3D6" />
                <Tooltip contentStyle={{ background: '#240011', border: '1px solid #C2185B', borderRadius: 8 }} />
                <Area type="monotone" dataKey="vendas" stroke="#FF2D8D" fill="url(#vendas)" strokeWidth={3} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass rounded-lg p-6">
          <h2 className="mb-5 text-2xl font-black">Produtos mais vendidos</h2>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={products}>
                <CartesianGrid stroke="rgba(216,180,254,.12)" />
                <XAxis dataKey="name" stroke="#FFB3D6" tick={{ fontSize: 11 }} />
                <YAxis stroke="#FFB3D6" />
                <Tooltip contentStyle={{ background: '#240011', border: '1px solid #C2185B', borderRadius: 8 }} />
                <Bar dataKey="sales" fill="#FF2D8D" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_0.86fr]">
        <div id="admin-pedidos" className="glass scroll-mt-24 rounded-lg p-6">
          <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <h2 className="text-2xl font-black">Gerenciamento de pedidos</h2>
            <div className="flex gap-2">
              <div className="flex items-center gap-2 rounded-lg border border-pink-200/15 bg-white/6 px-3 py-2">
                <Filter size={18} />
                <select
                  value={orderFilter}
                  onChange={(event) => setOrderFilter(event.target.value)}
                  className="bg-transparent text-sm font-bold outline-none"
                >
                  <option value="Todos">Todos</option>
                  <option value="Aguardando Pagamento">Aguardando Pagamento</option>
                  <option value="Aguardando Envio">Aguardando Envio</option>
                  <option value="Acesso Enviado">Acesso Enviado</option>
                </select>
              </div>
              <button type="button" className="rounded-lg border border-pink-200/15 bg-white/6 p-2" title="Buscar">
                <Search size={18} />
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="text-pink-100/62">
                <tr>
                  {['Pedido', 'Cliente', 'Produto', 'Status', 'Discord', 'Ações'].map((header) => (
                    <th key={header} className="border-b border-pink-200/10 px-3 py-3 font-black">
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-3 py-8 text-center text-pink-100/58">
                      Nenhum pedido ainda.
                    </td>
                  </tr>
                ) : (
                  filteredOrders.map((order) => (
                    <tr key={order.id} className="border-b border-pink-200/8">
                      <td className="px-3 py-4 font-black">{order.id}</td>
                      <td className="px-3 py-4">{order.client}</td>
                      <td className="px-3 py-4">{order.product}</td>
                      <td className="px-3 py-4">{order.status}</td>
                      <td className="px-3 py-4">{order.discord}</td>
                      <td className="px-3 py-4">
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => markAsSent(order.id)}
                            className="rounded-lg bg-ryuu-neon/22 px-3 py-2 text-xs font-black text-ryuu-soft disabled:cursor-not-allowed disabled:opacity-50"
                            disabled={order.status === 'Acesso Enviado'}
                          >
                            Enviado
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteOrder(order.id)}
                            className="rounded-lg border border-red-300/20 bg-red-400/10 px-3 py-2 text-xs font-black text-red-100"
                          >
                            Excluir
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-6">
          <div className="glass rounded-lg p-6">
            <h2 className="mb-4 text-2xl font-black">Configurações</h2>
            <label className="grid gap-2 text-sm font-black text-pink-100">
              Tempo de entrega exibido no checkout
              <input
                type="number"
                min="1"
                value={deliveryHours}
                onChange={(event) => setDeliveryHours(Number(event.target.value))}
                className="rounded-lg border border-pink-200/15 bg-black/40 px-4 py-3 font-normal outline-none focus:border-ryuu-neon"
              />
            </label>
          </div>
        </div>
      </div>

      <div id="admin-produtos" className="glass mt-6 scroll-mt-24 rounded-lg p-6">
        <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-2xl font-black">Produtos</h2>
            <p className="mt-1 text-sm text-pink-100/58">Edite preço, estoque, imagens e descrições com mais espaço.</p>
          </div>
          <button
            type="button"
            onClick={addProduct}
            className="rounded-lg bg-ryuu-neon/22 px-4 py-3 text-sm font-black text-ryuu-soft hover:shadow-glow-sm"
          >
            Criar produto
          </button>
        </div>
        <div className="grid gap-5">
          {products.map((product) => (
            <AdminProductEditor
              key={product.id}
              product={product}
              updataProduct={updataProduct}
              saveProduct={saveProduct}
              duplicateProduct={duplicateProduct}
              removeProduct={removeProduct}
              handleProductImageUpload={handleProductImageUpload}
            />
          ))}
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <AdminPanel title="Gerenciamento de usuários" icon={Users} id="admin-usuarios">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-left text-sm">
              <thead className="text-pink-100/62">
                <tr>
                  {['Nome', 'Gmail', 'Discord', 'Cargo', 'Compras'].map((header) => (
                    <th key={header} className="border-b border-pink-200/10 px-3 py-3 font-black">
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {adminUsers.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-3 py-8 text-center text-pink-100/58">
                      Nenhum usuário ainda.
                    </td>
                  </tr>
                ) : (
                  adminUsers.map((user) => (
                    <tr key={user.id || user.email} className="border-b border-pink-200/8">
                      <td className="px-3 py-4 font-black">{user.name}</td>
                      <td className="px-3 py-4">{user.email}</td>
                      <td className="px-3 py-4">{user.discord}</td>
                      <td className="px-3 py-4">
                        <select
                          value={user.role || 'usuario'}
                          onChange={(event) => updateUserRole(user.id, event.target.value)}
                          className="rounded-lg border border-pink-200/15 bg-black/40 px-3 py-2 text-sm font-bold outline-none focus:border-ryuu-neon"
                        >
                          <option value="usuario">Usuário</option>
                          <option value="cliente">Cliente</option>
                          <option value="administrador">Administrador</option>
                        </select>
                      </td>
                      <td className="px-3 py-4">{user.orders}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </AdminPanel>

        <AdminPanel title="Gerenciamento de cupons" icon={Gift} id="admin-cupons">
          <div className="mb-4 grid gap-2 sm:grid-cols-[1fr_0.8fr_0.8fr_auto]">
            <input
              value={couponDraft.code}
              onChange={(event) => setCouponDraft((current) => ({ ...current, code: event.target.value }))}
              placeholder="Código"
              className="rounded-lg border border-pink-200/15 bg-black/40 px-3 py-2 text-sm outline-none focus:border-ryuu-neon"
            />
            <select
              value={couponDraft.type}
              onChange={(event) => setCouponDraft((current) => ({ ...current, type: event.target.value }))}
              className="rounded-lg border border-pink-200/15 bg-black/40 px-3 py-2 text-sm outline-none focus:border-ryuu-neon"
            >
              <option value="Percentual">Percentual</option>
              <option value="Valor fixo">Valor fixo</option>
            </select>
            <input
              value={couponDraft.value}
              onChange={(event) => setCouponDraft((current) => ({ ...current, value: event.target.value }))}
              placeholder="Ex: 10% ou R$ 20"
              className="rounded-lg border border-pink-200/15 bg-black/40 px-3 py-2 text-sm outline-none focus:border-ryuu-neon"
            />
            <button
              type="button"
              onClick={createCoupon}
              className="rounded-lg bg-ryuu-neon/22 px-4 py-2 text-sm font-black text-ryuu-soft hover:shadow-glow-sm"
            >
              Criar
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead className="text-pink-100/62">
                <tr>
                  {['Código', 'Tipo', 'Valor', 'Limite', 'Status', 'Ações'].map((header) => (
                    <th key={header} className="border-b border-pink-200/10 px-3 py-3 font-black">
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {adminCoupons.map((coupon) => (
                  <tr key={coupon.code} className="border-b border-pink-200/8">
                    <td className="px-3 py-4 font-black">{coupon.code}</td>
                    <td className="px-3 py-4">{coupon.type}</td>
                    <td className="px-3 py-4">{coupon.value}</td>
                    <td className="px-3 py-4">{coupon.limit}</td>
                    <td className="px-3 py-4">{coupon.status}</td>
                    <td className="px-3 py-4">
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => toggleCoupon(coupon.code)}
                          className="rounded-lg bg-white/6 px-3 py-2 text-xs font-black text-pink-100 hover:shadow-glow-sm"
                        >
                          {coupon.status === 'Ativo' ? 'Desativar' : 'Ativar'}
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteCoupon(coupon.code)}
                          className="rounded-lg border border-red-300/20 bg-red-400/10 px-3 py-2 text-xs font-black text-red-100"
                        >
                          Excluir
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </AdminPanel>
      </div>

    </section>
  );
}

function AdminStat({ icon: Icon, label, value }) {
  return (
    <div className="glass rounded-lg p-5">
      <div className="mb-4 flex items-center justify-between">
        <div className="grid h-11 w-11 place-items-center rounded-lg bg-ryuu-neon/18 text-ryuu-soft">
          <Icon size={21} />
        </div>
        <BarChart3 className="text-pink-200/40" size={20} />
      </div>
      <p className="text-sm text-pink-100/62">{label}</p>
      <p className="mt-1 text-3xl font-black">{value}</p>
    </div>
  );
}

function AdminProductEditor({
  product,
  updataProduct,
  saveProduct,
  duplicateProduct,
  removeProduct,
  handleProductImageUpload,
}) {
  return (
    <div className="rounded-lg border border-pink-200/12 bg-black/24 p-4">
      <div className="mb-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-ryuu-soft">Produto</p>
          <h3 className="mt-1 text-xl font-black">{product.name}</h3>
          <p className="mt-1 text-xs text-pink-100/48">ID: {product.id}</p>
        </div>
        <span
          className={`w-fit rounded-full px-3 py-1 text-xs font-black ${
            product.available
              ? 'border border-emerald-300/25 bg-emerald-400/10 text-emerald-200'
              : 'border border-red-300/20 bg-red-400/10 text-red-100'
          }`}
        >
          {product.available ? 'Disponível' : 'Indisponível'}
        </span>
      </div>

      <div className="grid gap-5 xl:grid-cols-[0.62fr_1.38fr]">
        <div>
          <ProductImage product={product} className="h-64" />
          <div className="mt-3 grid gap-2">
            <AdminField label="Imagem ou GIF">
              <input
                value={product.image || ''}
                onChange={(event) => updataProduct(product.id, 'image', event.target.value)}
                placeholder="URL da imagem/GIF ou texto do placeholder"
                className="admin-input"
              />
            </AdminField>
            <label className="rounded-lg border border-dashed border-ryuu-neon/35 bg-ryuu-neon/8 px-3 py-3 text-center text-xs font-black text-ryuu-soft transition hover:bg-ryuu-neon/12">
              Enviar imagem/GIF até 20MB
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                className="hidden"
                onChange={(event) => handleProductImageUpload(product, event.target.files?.[0])}
              />
            </label>
          </div>
        </div>

        <div className="grid gap-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <AdminField label="Nome">
              <input
                value={product.name}
                onChange={(event) => updataProduct(product.id, 'name', event.target.value)}
                className="admin-input font-black"
              />
            </AdminField>
            <AdminField label="Status">
              <select
                value={product.available ? 'available' : 'unavailable'}
                onChange={(event) => updataProduct(product.id, 'available', event.target.value === 'available')}
                className="admin-input"
              >
                <option value="available">Disponível</option>
                <option value="unavailable">Indisponível</option>
              </select>
            </AdminField>
          </div>

          <AdminField label="Descrição curta">
            <input
              value={product.shortDescription || ''}
              onChange={(event) => updataProduct(product.id, 'shortDescription', event.target.value)}
              placeholder="Resumo que aparece no card"
              className="admin-input"
            />
          </AdminField>

          <AdminField label="Descrição completa">
            <textarea
              value={product.description}
              onChange={(event) => updataProduct(product.id, 'description', event.target.value)}
              className="admin-input h-32 resize-y"
            />
          </AdminField>

          <div className="grid gap-3 sm:grid-cols-3">
            <AdminField label="Preço">
              <input
                type="number"
                min="0"
                step="0.01"
                value={product.price}
                onChange={(event) => updataProduct(product.id, 'price', event.target.value)}
                className="admin-input"
              />
            </AdminField>
            <AdminField label="Estoque">
              <input
                type="number"
                min="0"
                value={product.stock || 0}
                onChange={(event) => updataProduct(product.id, 'stock', event.target.value)}
                className="admin-input"
              />
            </AdminField>
            <AdminField label="Vendas">
              <input value={product.sales || 0} disabled className="admin-input opacity-70" />
            </AdminField>
          </div>

          <div className="grid gap-2 pt-1 sm:grid-cols-3">
            <button
              type="button"
              onClick={() => saveProduct(product)}
              className="flex items-center justify-center gap-2 rounded-lg border border-ryuu-neon/25 bg-ryuu-neon/10 px-3 py-3 text-xs font-black text-ryuu-soft"
            >
              <Save size={15} />
              Salvar
            </button>
            <button
              type="button"
              onClick={() => duplicateProduct(product)}
              className="rounded-lg border border-pink-200/15 bg-white/5 px-3 py-3 text-xs font-black text-pink-100"
            >
              Duplicar
            </button>
            <button
              type="button"
              onClick={() => removeProduct(product.id)}
              className="rounded-lg border border-red-300/20 bg-red-400/10 px-3 py-3 text-xs font-black text-red-100"
            >
              Excluir
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function AdminField({ label, children }) {
  return (
    <label className="grid gap-1 text-xs font-black uppercase tracking-[0.12em] text-pink-100/58">
      {label}
      {children}
    </label>
  );
}

function AdminPanel({ title, icon: Icon, children, id }) {
  return (
    <div id={id} className="glass scroll-mt-24 rounded-lg p-6">
      <div className="mb-5 flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-lg bg-ryuu-neon/18 text-ryuu-soft">
          <Icon size={20} />
        </div>
        <h2 className="text-2xl font-black">{title}</h2>
      </div>
      {children}
    </div>
  );
}

function DateTable({ headers, rows }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[560px] text-left text-sm">
        <thead className="text-pink-100/62">
          <tr>
            {headers.map((header) => (
              <th key={header} className="border-b border-pink-200/10 px-3 py-3 font-black">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={headers.length} className="px-3 py-8 text-center text-pink-100/58">
                Nada por aqui ainda.
              </td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr key={row.join('-')} className="border-b border-pink-200/8">
                {row.map((cell) => (
                  <td key={cell} className="px-3 py-4">
                    {cell}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

function Footer() {
  return (
    <footer className="border-t border-pink-200/10 bg-black/30">
      <div className="mx-auto flex max-w-7xl flex-col justify-between gap-5 px-4 py-8 sm:px-6 md:flex-row md:items-center lg:px-8">
        <div className="flex items-center gap-3">
          <img
            src={iconGif}
            alt="ÍCONE GIF Ryuu Cheats"
            loading="lazy"
            decoding="async"
            className="h-11 w-11 rounded-lg object-cover"
          />
          <div>
            <p className="font-black">Ryuu Cheats</p>
            <p className="text-sm text-pink-100/62">Acesso vitalício.</p>
          </div>
        </div>
        <a
          href="https://discord.gg/SKQXhFHtEp"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-ryuu-neon/30 px-4 py-3 font-black text-pink-100 hover:shadow-glow-sm"
        >
          <img src={discordIcon} alt="" className="h-5 w-5 object-contain" />
          Entrar no Discord
        </a>
      </div>
    </footer>
  );
}

function Toast({ toast }) {
  const styles = {
    success: 'border-emerald-300/35 bg-emerald-400/14 text-emerald-100',
    error: 'border-red-300/35 bg-red-400/14 text-red-100',
    warning: 'border-amber-300/35 bg-amber-400/14 text-amber-100',
  };

  return (
    <div
      className={`fixed bottom-5 right-5 z-[70] w-[calc(100%-2rem)] max-w-sm rounded-lg border px-4 py-3 text-left text-sm font-bold shadow-glow-sm ${
        styles[toast.type]
      }`}
    >
      {toast.message}
    </div>
  );
}

export default App;

