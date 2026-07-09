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
  Menu,
  PackageCheck,
  Save,
  Search,
  Settings,
  ShieldCheck,
  ShoppingCart,
  Sparkles,
  Star,
  User,
  Users,
  Zap,
  X,
} from 'lucide-react';
import iconGif from '../Icon/RYUU_ICON.gif';
import bannerGif from '../Banner/RYUU_BANNER.gif';
import discordIcon from './assets/discord-brand.svg';
import { isSupabaseConfigured, supabase } from './lib/supabase';
import { appConfig, integrations } from './lib/config';
import { createMercadoPagoPayment, notifyDiscordOrder, notifyEmailOrder } from './lib/integrations';

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

const formatCurrency = (value) =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);

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
  const [activeView, setActiveView] = useState('home');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [deliveryHours, setDeliveryHours] = useState(24);
  const [discordUser, setDiscordUser] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [userRole, setUserRole] = useState('usuario');
  const [checkoutSuccess, setCheckoutSuccess] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [orderStatus, setOrderStatus] = useState(orders);
  const [registeredUsers, setRegisteredUsers] = useState(users);
  const [adminCoupons, setAdminCoupons] = useState(initialAdminCoupons);
  const [couponRules, setCouponRules] = useState(coupons);
  const [isLoadingStore, setIsLoadingStore] = useState(false);

  useEffect(() => {
    localStorage.setItem(cartStorageKey, JSON.stringify(cart));
  }, [cart]);

  const notify = (message, type = 'success') => setToast({ message: `Ryuu: ${message}`, type });

  const ensureProfile = async (user) => {
    if (!isSupabaseConfigured || !user) return null;

    const { data: existingProfile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
    if (existingProfile) return existingProfile;

    const nextProfile = {
      id: user.id,
      name: user.user_metadata.name || user.email?.split('@')[0] || 'Cliente Ryuu',
      email: user.email || '',
      discord: getDiscordNameFromUser(user),
      role: 'usuario',
    };

    const { data, error } = await supabase.from('profiles').insert(nextProfile).select('*').single();
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
          nextProfile.role === 'administrador'
            ? supabase.from('orders').select('*').order('created_at', { ascending: false })
            : supabase.from('orders').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
        const { data: dbOrders, error: ordersError } = await query;
        if (ordersError) throw ordersError;
        setOrderStatus((dbOrders || []).map(dbOrderToOrder));

        if (nextProfile.role === 'administrador') {
          const { data: dbProfiles, error: profilesError } = await supabase
            .from('profiles')
            .select('*')
            .order('created_at', { ascending: false });
          if (profilesError) throw profilesError;
          setRegisteredUsers(
            (dbProfiles || []).map((item) => ({
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
        setUserRole(nextProfile.role || 'usuario');
        setDiscordUser(nextProfile.discord || '');
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
        setUserRole(nextProfile.role || 'usuario');
        setDiscordUser(nextProfile.discord || '');
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
    const canSeeClientDashboard = isLoggedIn && ['cliente', 'administrador'].includes(userRole);
    if (activeView === 'dashboard' && !canSeeClientDashboard) {
      setActiveView('catalogo');
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
      coupon_code: activeCoupon.code || null,
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
      name: profile.name || currentUser.email?.split('@')[0] || 'Cliente Ryuu',
      email: currentUser.email || profile.email || '',
      discord: discordUser.trim(),
    },
    coupon: activeCoupon.code || null,
    subtotal,
    discount,
    total,
  });

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

  const handleAuth = async (event) => {
    event.preventDefault();
    const formDate = new FormDate(event.currentTarget);
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
      setUserRole(nextProfile.role || 'usuario');
    }

    setIsAuthOpen(false);
    notify(authTab === 'login' ? 'Login realizado.' : 'Conta criada.');
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

  const removeProduct = async (productId) => {
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
    const items = [
      { label: 'Início', id: 'home' },
      { label: 'Catálogo', id: 'catalogo' },
    ];

    if (isLoggedIn && ['cliente', 'administrador'].includes(userRole)) {
      items.push({ label: 'Dashboard', id: 'dashboard' });
    }

    if (isLoggedIn && userRole === 'administrador') {
      items.push({ label: 'Admin', id: 'admin' });
    }

    return items;
  }, [isLoggedIn, userRole]);

  return (
    <div className="min-h-screen overflow-x-hidden text-white">
      <Navbar
        navItems={navItems}
        activeView={activeView}
        setActiveView={setActiveView}
        cartCount={cartCount}
        setIsCartOpen={setIsCartOpen}
        setIsAuthOpen={setIsAuthOpen}
        isLoggedIn={isLoggedIn}
        userRole={userRole}
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
            checkoutSuccess={checkoutSuccess}
            startMercadoPagoPayment={startMercadoPagoPayment}
            isProcessingPayment={isProcessingPayment}
            setActiveView={setActiveView}
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
            removeProduct={removeProduct}
            orders={orderStatus}
            markAsSent={markAsSent}
            userRole={userRole}
            users={registeredUsers}
            coupons={adminCoupons}
            setCoupons={setAdminCoupons}
            notify={notify}
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
  isLoggedIn,
  userRole,
  mobileMenuOpen,
  setMobileMenuOpen,
}) {
  const navigate = (id) => {
    setActiveView(id);
    setMobileMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <header className="sticky top-0 z-40 border-b border-purple-300/10 bg-ryuu-black/82 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        <button className="flex items-center gap-3" onClick={() => navigate('home')} type="button">
          <img
            src={iconGif}
            alt="ÍCONE GIF Ryuu Group"
            decoding="async"
            className="h-12 w-12 rounded-lg border border-ryuu-neon/40 object-cover shadow-glow-sm"
          />
          <div className="text-left">
            <p className="bg-gradient-to-r from-white via-ryuu-soft to-ryuu-neon bg-clip-text text-xl font-black uppercase tracking-wide text-transparent">
              Ryuu Group
            </p>
            <p className="text-xs font-medium text-purple-200/70">Blood Strike Panels</p>
          </div>
        </button>

        <nav className="hidden items-center gap-2 md:flex">
          {navItems.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => navigate(item.id)}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                activeView === item.id ? 'bg-ryuu-neon text-white shadow-glow-sm' : 'text-purple-100/78 hover:bg-white/8'
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
            className="relative rounded-full border border-purple-200/15 bg-white/5 p-3 text-purple-100 transition hover:border-ryuu-neon hover:text-white hover:shadow-glow-sm"
            aria-label="Abrir carrinho"
          >
            <ShoppingCart size={19} />
            {cartCount > 0 && (
              <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-ryuu-neon px-1 text-xs font-black">
                {cartCount}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setIsAuthOpen(true)}
            className="hidden items-center gap-2 rounded-full bg-gradient-to-r from-ryuu-violet to-ryuu-neon px-4 py-2 text-sm font-bold shadow-glow-sm transition hover:scale-[1.02] sm:flex"
          >
              {isLoggedIn ? <User size={17} /> : <LogIn size={17} />}
              {isLoggedIn ? roleLabels[userRole] : 'Entrar'}
          </button>
          <button
            type="button"
            onClick={() => setMobileMenuOpen((value) => !value)}
            className="rounded-full border border-purple-200/15 bg-white/5 p-3 md:hidden"
            aria-label="Abrir menu"
          >
            {mobileMenuOpen ? <X size={19} /> : <Menu size={19} />}
          </button>
        </div>
      </div>

      {mobileMenuOpen && (
        <div className="border-t border-purple-300/10 bg-ryuu-ink px-4 py-3 md:hidden">
          <div className="grid gap-2">
            {navItems.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => navigate(item.id)}
                className="rounded-lg px-3 py-2 text-left text-sm font-semibold text-purple-100 hover:bg-white/8"
              >
                {item.label}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setIsAuthOpen(true)}
              className="rounded-lg bg-ryuu-neon px-3 py-2 text-left text-sm font-bold"
            >
              {isLoggedIn ? `Cargo: ${roleLabels[userRole]}` : 'Entrar / Cadastrar'}
            </button>
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
          alt="BANNER GIF Ryuu Group"
          decoding="async"
          fetchPriority="high"
          className="h-36 w-full object-cover sm:h-52 lg:h-72"
        />
      </div>
      <div className="py-12">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-ryuu-neon/25 bg-ryuu-deep/60 px-4 py-2 text-sm font-semibold text-ryuu-soft">
          <Sparkles size={16} />
          Ryuu Group
        </div>
        <h1 className="max-w-4xl text-4xl font-black leading-tight sm:text-5xl lg:text-6xl">
          Paineis para Blood Strike com entrega rápida e suporte direto da{' '}
          <span className="bg-gradient-to-r from-ryuu-soft to-ryuu-neon bg-clip-text text-transparent">Ryuu Group</span>
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
          <h2 className="mt-2 text-3xl font-black sm:text-4xl">Paineis Ryuu Group</h2>
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
            <div className="mb-5 grid h-36 place-items-center rounded-lg border border-purple-200/12 bg-black/30 text-center">
              <div>
                <Crown className="mx-auto mb-2 text-ryuu-soft" size={30} />
                <p className="text-sm font-bold text-purple-100/68">{product.image}</p>
              </div>
            </div>
            <div className="mb-3 flex items-start justify-between gap-3">
              <h3 className="text-2xl font-black">{product.name}</h3>
              <StatusBadge available={product.available} />
            </div>
            <p className="min-h-20 text-sm leading-6 text-purple-100/70">
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
              {product.available && <p className="mt-2 text-sm text-purple-100/70">Estoque: {product.stock}</p>}
            </div>
            <div className="grid gap-2">
              <button
                type="button"
                onClick={() => setSelectedProduct(product)}
                className="flex w-full items-center justify-center gap-2 rounded-lg border border-ryuu-neon/30 bg-white/5 px-4 py-3 font-black text-purple-50 transition hover:shadow-glow-sm"
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
      <div className="purple-scrollbar glass max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-lg">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-purple-200/10 bg-ryuu-black/94 p-5 backdrop-blur">
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
            <div className="grid h-48 place-items-center rounded-lg border border-purple-200/12 bg-ryuu-deep/24 text-center">
              <div>
                <Crown className="mx-auto mb-3 text-ryuu-soft" size={42} />
                <p className="font-black text-purple-100">{product.image}</p>
                <p className="mt-1 text-sm text-purple-100/58">Imagem ou GIF editável no admin</p>
              </div>
            </div>
            <div className="mt-5 rounded-lg border border-ryuu-neon/18 bg-ryuu-neon/10 p-4">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-ryuu-soft">
                Acesso vitalício
              </p>
              <p className="mt-1 text-4xl font-black">{formatCurrency(product.price)}</p>
              <p className="mt-2 text-sm text-purple-100/70">Estoque: {product.stock}</p>
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
                        : 'border border-purple-200/12 bg-white/5 text-purple-100/72 hover:border-ryuu-neon'
                    }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {activeTab === 'overview' && (
              <div className="rounded-lg border border-purple-200/12 bg-black/22 p-5">
                <h3 className="text-2xl font-black">Smoke External</h3>
                <p className="mt-3 leading-7 text-purple-100/76">{product.shortDescription || product.description}</p>
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
                  <div key={group.title} className="rounded-lg border border-purple-200/12 bg-black/22 p-5">
                    <h3 className="text-lg font-black text-ryuu-soft">{group.title}</h3>
                    <ul className="mt-3 grid gap-2 text-sm text-purple-100/76">
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
              <div className="rounded-lg border border-purple-200/12 bg-black/22 p-5">
                <h3 className="text-2xl font-black">Entrega manual monitorada</h3>
                <p className="mt-3 leading-7 text-purple-100/76">
                  Após a confirmação do pagamento, a equipe Ryuu Group envia o acesso manualmente pelo Discord informado
                  no checkout em até {deliveryHours} horas.
                </p>
                <div className="mt-5 rounded-lg border border-ryuu-neon/20 bg-ryuu-neon/10 p-4 text-sm font-bold text-purple-100">
                  Informe seu usuario do Discord corretamente no checkout para evitar atraso na entrega.
                </div>
              </div>
            )}

            {activeTab === 'terms' && (
              <div className="rounded-lg border border-purple-200/12 bg-black/22 p-5">
                <h3 className="text-2xl font-black">Compra clara e suporte direto</h3>
                <div className="mt-4 grid gap-3">
                  {[
                    'Pagamento único, sem assinatura ou renovação.',
                    'Produtos indisponíveis ficam bloqueados para compra.',
                    'Pedido aparece no dashboard do cliente após confirmação.',
                    'Suporte e dúvidas pelo Discord oficial da Ryuu Group.',
                  ].map((item) => (
                    <div key={item} className="flex gap-3 rounded-lg bg-white/[0.035] p-3 text-purple-100/78">
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
    <div className="flex items-center gap-3 rounded-lg border border-purple-200/12 bg-white/[0.035] p-3">
      <div className="grid h-10 w-10 place-items-center rounded-lg bg-ryuu-neon/14 text-ryuu-soft">
        <Icon size={18} />
      </div>
      <div>
        <p className="text-xs font-bold text-purple-100/52">{label}</p>
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
            className="rounded-lg border border-purple-200/12 bg-white/[0.035] p-5 transition hover:border-ryuu-neon/45 hover:shadow-glow-sm"
          >
            <div className="mb-3 grid h-10 w-10 place-items-center rounded-lg bg-ryuu-neon/18 text-ryuu-soft">
              <item.icon size={20} />
            </div>
            <h3 className="text-lg font-black">{item.title}</h3>
            <p className="mt-1 text-sm leading-6 text-purple-100/70">{item.text}</p>
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
            <details key={item.q} className="rounded-lg border border-purple-200/12 bg-black/24 p-4">
              <summary className="flex cursor-pointer items-center gap-3 font-black text-purple-50">
                <HelpCircle size={18} className="text-ryuu-soft" />
                {item.q}
              </summary>
              <p className="mt-3 pl-8 leading-7 text-purple-100/70">{item.a}</p>
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
        className={`purple-scrollbar absolute right-0 top-0 flex h-full w-full max-w-md flex-col overflow-y-auto border-l border-ryuu-neon/25 bg-ryuu-black shadow-glow transition-transform duration-300 ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between border-b border-purple-200/10 p-5">
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
            <div className="grid min-h-64 place-items-center rounded-lg border border-dashed border-purple-200/18 text-center">
              <div>
                <ShoppingCart className="mx-auto mb-3 text-purple-200/60" size={36} />
                <p className="font-bold">Seu carrinho está vazio.</p>
                <p className="mt-1 text-sm text-purple-100/60">Adicione um produto disponível para continuar.</p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {cart.map((item) => (
                <div key={item.id} className="rounded-lg border border-purple-200/12 bg-white/[0.035] p-4">
                  <div className="flex justify-between gap-3">
                    <div>
                      <p className="font-black">{item.name}</p>
                      <p className="text-sm text-ryuu-soft">{item.accessLabel || 'Plano selecionado'}</p>
                    </div>
                    <p className="font-black">{formatCurrency(item.price)}</p>
                  </div>
                  <div className="mt-4 flex items-center justify-between">
                    <div className="flex items-center rounded-full border border-purple-200/15">
                      <button type="button" onClick={() => updataQuantity(item.id, item.quantity - 1)} className="px-3 py-1">
                        -
                      </button>
                      <input
                        type="number"
                        min="1"
                        max={item.stock || undefined}
                        value={item.quantity}
                        onChange={(event) => updataQuantity(item.id, event.target.value)}
                        className="w-12 border-x border-purple-200/15 bg-transparent px-1 py-1 text-center text-sm font-bold outline-none"
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

          <div className="mt-5 rounded-lg border border-purple-200/12 bg-black/22 p-4">
            <label htmlFor="coupon" className="text-sm font-black text-purple-100">
              Cupom de desconto
            </label>
            <input
              id="coupon"
              value={couponCode}
              onChange={(event) => setCouponCode(event.target.value)}
              placeholder="Ex: RYUU10"
              className="mt-2 w-full rounded-lg border border-purple-200/15 bg-black/40 px-4 py-3 text-sm outline-none transition focus:border-ryuu-neon"
            />
            {couponCode && (
              <p className={`mt-2 text-sm font-semibold ${activeCoupon ? 'text-emerald-300' : 'text-red-200'}`}>
                {activeCoupon ? `Cupom aplicado: ${activeCoupon.label}` : 'Cupom inválido ou expirado.'}
              </p>
            )}
          </div>
        </div>

        <div className="border-t border-purple-200/10 p-5">
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
    <div className="mt-2 flex items-center justify-between text-sm text-purple-100/72">
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
              alt="Ryuu Group"
              className="h-full w-full rounded-xl object-cover"
            />
          </div>
          <p className="mt-4 text-sm font-black uppercase tracking-[0.18em] text-ryuu-soft">Ryuu Group</p>
          <h2 className="mt-1 text-3xl font-black">{isLogin ? 'Entrar' : 'Criar conta'}</h2>
        </div>

        <div className="mb-5 grid grid-cols-2 rounded-lg border border-purple-200/12 bg-black/24 p-1">
          {['login', 'cadastro'].map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setAuthTab(tab)}
              className={`rounded-md py-2 text-sm font-black capitalize ${
                authTab === tab ? 'bg-ryuu-neon text-white' : 'text-purple-100/68'
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
            className="rounded-lg border border-ryuu-neon/35 bg-white/5 px-4 py-3 text-center font-black text-purple-50 transition hover:shadow-glow-sm"
          >
            {isLogin ? 'Entrar' : 'Criar conta'}
          </button>
        </form>

        <div className="my-5 flex items-center gap-3 text-xs font-black uppercase tracking-[0.2em] text-purple-100/45">
          <span className="h-px flex-1 bg-purple-200/12" />
          ou
          <span className="h-px flex-1 bg-purple-200/12" />
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
    <label className="grid gap-1 text-sm font-bold text-purple-100">
      {label}
      <input
        required
        className="rounded-lg border border-purple-200/15 bg-black/42 px-4 py-3 font-normal outline-none transition focus:border-ryuu-neon"
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
              debitCard: 'all',
              ticket: 'all',
              bankTransfer: 'all',
              maxInstallments: 1,
            },
          },
          callbacks: {
            onReady: () => setIsReady(true),
            onSubmit: ({ formDate }) =>
              new Promise((resolve, reject) => {
                onPaymentRef.current(formDate).then(resolve).catch(reject);
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
      <div className="mt-4 rounded-lg border border-purple-200/12 bg-black/24 p-4 text-sm font-bold text-purple-100/70">
        Configure o Mercado Pago para ativar PIX e cartão dentro da loja.
      </div>
    );
  }

  return (
    <div className={`mt-5 rounded-lg border border-purple-200/12 bg-black/24 p-3 ${disabled ? 'opacity-55' : ''}`}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <p className="font-black">Mercado Pago</p>
          <p className="text-xs font-bold text-purple-100/60">PIX e cartão sem sair da loja.</p>
        </div>
        {!isReady && <span className="text-xs font-black text-ryuu-soft">Carregando...</span>}
      </div>
      {disabled && (
        <div className="mb-3 rounded-md border border-amber-200/20 bg-amber-300/10 p-3 text-xs font-bold text-amber-100">
          Informe seu Discord antes de pagar.
        </div>
      )}
      {brickError && (
        <div className="mb-3 rounded-md border border-red-300/25 bg-red-500/10 p-3 text-xs font-bold text-red-100">
          {brickError}
        </div>
      )}
      <div id="mercado-pago-payment-brick" className={disabled ? 'pointer-events-none' : ''} />
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
  checkoutSuccess,
  startMercadoPagoPayment,
  isProcessingPayment,
  setActiveView,
}) {
  if (checkoutSuccess) {
    return (
      <section className="mx-auto grid min-h-[72vh] max-w-3xl place-items-center px-4 py-16 text-center sm:px-6 lg:px-8">
        <div className="glass rounded-lg p-8">
          <div className="mx-auto mb-5 grid h-16 w-16 place-items-center rounded-full bg-emerald-400/18 text-emerald-300">
            <Check size={34} />
          </div>
          <h1 className="text-3xl font-black">Pedido criado</h1>
          <p className="mt-4 leading-8 text-purple-100/76">
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

          <label className="mt-6 grid gap-2 text-sm font-black text-purple-100">
            Discord para entrega manual
            <input
              required
              value={discordUser}
              onChange={(event) => setDiscordUser(event.target.value)}
              placeholder="Seu Discord"
              className="rounded-lg border border-purple-200/15 bg-black/40 px-4 py-3 font-normal outline-none transition focus:border-ryuu-neon"
            />
          </label>

          <div className="mt-5 rounded-lg border border-amber-200/20 bg-amber-300/10 p-4 text-amber-100">
            Após a confirmação do pagamento, seu acesso será enviado manualmente por nossa equipe em até{' '}
            <strong>{deliveryHours} horas</strong>.
          </div>
        </div>

        <div className="glass rounded-lg p-6">
          <h2 className="text-2xl font-black">Resumo</h2>
          <div className="mt-4 rounded-lg border border-purple-200/12 bg-black/24 p-3 text-sm font-bold text-purple-100/72">
            {integrations.mercadoPago
              ? 'Mercado Pago ativo para PIX e cartão.'
              : 'Configure o Mercado Pago para finalizar pedidos.'}
          </div>
          <div className="my-5 border-y border-purple-200/10 py-4">
            <PriceRow label="Subtotal" value={subtotal} />
            <PriceRow label={activeCoupon ? `Cupom ${activeCoupon.code}` : 'Desconto'} value={discount} negative />
            <div className="mt-4 flex items-center justify-between text-2xl font-black">
              <span>Total</span>
              <span>{formatCurrency(total)}</span>
            </div>
          </div>
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
  if (!isLoggedIn) {
    return (
      <section className="mx-auto grid min-h-[68vh] max-w-2xl place-items-center px-4 py-16 text-center">
        <div className="glass rounded-lg p-8">
          <Lock className="mx-auto mb-4 text-ryuu-soft" size={42} />
          <h1 className="text-3xl font-black">Login obrigatório</h1>
          <p className="mt-3 text-purple-100/70">Entre na sua conta para ver histórico de compras e dados do perfil.</p>
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

  if (!['cliente', 'administrador'].includes(userRole)) {
    return (
      <section className="mx-auto grid min-h-[68vh] max-w-2xl place-items-center px-4 py-16 text-center">
        <div className="glass rounded-lg p-8">
          <ShoppingCart className="mx-auto mb-4 text-ryuu-soft" size={42} />
          <h1 className="text-3xl font-black">Você ainda é Usuário</h1>
          <p className="mt-3 text-purple-100/70">
            O dashboard do cliente aparece somente depois de uma compra confirmada.
          </p>
          <button
            type="button"
            onClick={() => setActiveView('catalogo')}
            className="mt-6 rounded-lg bg-gradient-to-r from-ryuu-violet to-ryuu-neon px-6 py-3 font-black shadow-glow-sm"
          >
            Ver produtos
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="mb-8">
        <p className="text-sm font-black uppercase tracking-[0.22em] text-ryuu-soft">Dashboard do cliente</p>
        <h1 className="mt-2 text-4xl font-black">Minha conta</h1>
      </div>

      <div className="grid gap-6 lg:grid-cols-[0.72fr_1fr]">
        <div className="glass rounded-lg p-6">
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
          <h2 className="mb-4 text-2xl font-black">Histórico de compras</h2>
          <DateTable
            headers={['Pedido', 'Produto', 'Valor', 'Status', 'Date']}
            rows={orderStatus.map((order) => [order.id, order.product, formatCurrency(order.value), order.status, order.data])}
          />
        </div>
      </div>
    </section>
  );
}

function ProfileEditor({ profile, currentUser, userRole, saveProfile }) {
  const [draft, setDraft] = useState({
    name: profile.name || 'Cliente Ryuu',
    email: profile.email || currentUser.email || '',
    discord: profile?.discord || '',
    password: '',
  });

  useEffect(() => {
    setDraft({
      name: profile.name || 'Cliente Ryuu',
      email: profile.email || currentUser.email || '',
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
      <label className="grid gap-1 text-sm font-bold text-purple-100">
        Cargo
        <input
          value={roleLabels[userRole] || 'Usuário'}
          disabled
          className="rounded-lg border border-purple-200/15 bg-black/28 px-4 py-3 font-normal text-purple-100/78 outline-none"
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
  removeProduct,
  orders: adminOrders,
  markAsSent,
  userRole,
  users: adminUsers,
  coupons: adminCoupons,
  setCoupons,
  notify,
}) {
  const [orderFilter, setOrderFilter] = useState('Todos');
  const [couponDraft, setCouponDraft] = useState({ code: '', value: '', type: 'Percentual' });
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
          <p className="mt-3 text-purple-100/70">
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

  return (
    <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <p className="text-sm font-black uppercase tracking-[0.22em] text-ryuu-soft">Admin Dashboard</p>
          <h1 className="mt-2 text-4xl font-black">Painel administrativo</h1>
        </div>
        <div className="inline-flex items-center gap-2 rounded-full border border-ryuu-neon/25 bg-ryuu-deep/40 px-4 py-2 text-sm font-bold text-purple-100">
          <ShieldCheck size={17} /> Rota protegida por role admin
        </div>
      </div>

      <div className="grid gap-5 md:grid-cols-3">
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
                    <stop offset="5%" stopColor="#9B30FF" stopOpacity={0.75} />
                    <stop offset="95%" stopColor="#9B30FF" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="rgba(216,180,254,.12)" />
                <XAxis dataKey="label" stroke="#D8B4FE" />
                <YAxis stroke="#D8B4FE" />
                <Tooltip contentStyle={{ background: '#1A001A', border: '1px solid #6A0DAD', borderRadius: 8 }} />
                <Area type="monotone" dataKey="vendas" stroke="#9B30FF" fill="url(#vendas)" strokeWidth={3} />
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
                <XAxis dataKey="name" stroke="#D8B4FE" tick={{ fontSize: 11 }} />
                <YAxis stroke="#D8B4FE" />
                <Tooltip contentStyle={{ background: '#1A001A', border: '1px solid #6A0DAD', borderRadius: 8 }} />
                <Bar dataKey="sales" fill="#9B30FF" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_0.86fr]">
        <div className="glass rounded-lg p-6">
          <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <h2 className="text-2xl font-black">Gerenciamento de pedidos</h2>
            <div className="flex gap-2">
              <div className="flex items-center gap-2 rounded-lg border border-purple-200/15 bg-white/6 px-3 py-2">
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
              <button type="button" className="rounded-lg border border-purple-200/15 bg-white/6 p-2" title="Buscar">
                <Search size={18} />
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="text-purple-100/62">
                <tr>
                  {['Pedido', 'Cliente', 'Produto', 'Status', 'Discord', 'Ação'].map((header) => (
                    <th key={header} className="border-b border-purple-200/10 px-3 py-3 font-black">
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-3 py-8 text-center text-purple-100/58">
                      Nenhum pedido ainda.
                    </td>
                  </tr>
                ) : (
                  filteredOrders.map((order) => (
                    <tr key={order.id} className="border-b border-purple-200/8">
                      <td className="px-3 py-4 font-black">{order.id}</td>
                      <td className="px-3 py-4">{order.client}</td>
                      <td className="px-3 py-4">{order.product}</td>
                      <td className="px-3 py-4">{order.status}</td>
                      <td className="px-3 py-4">{order.discord}</td>
                      <td className="px-3 py-4">
                        <button
                          type="button"
                          onClick={() => markAsSent(order.id)}
                          className="rounded-lg bg-ryuu-neon/22 px-3 py-2 text-xs font-black text-ryuu-soft disabled:cursor-not-allowed disabled:opacity-50"
                          disabled={order.status === 'Acesso Enviado'}
                        >
                          Marcar enviado
                        </button>
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
            <label className="grid gap-2 text-sm font-black text-purple-100">
              Tempo de entrega exibido no checkout
              <input
                type="number"
                min="1"
                value={deliveryHours}
                onChange={(event) => setDeliveryHours(Number(event.target.value))}
                className="rounded-lg border border-purple-200/15 bg-black/40 px-4 py-3 font-normal outline-none focus:border-ryuu-neon"
              />
            </label>
          </div>

          <div className="glass rounded-lg p-6">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="text-2xl font-black">Produtos</h2>
              <button
                type="button"
                onClick={addProduct}
                className="rounded-lg bg-ryuu-neon/22 px-3 py-2 text-xs font-black text-ryuu-soft hover:shadow-glow-sm"
              >
                Criar produto
              </button>
            </div>
            <div className="grid gap-4">
              {products.map((product) => (
                <div key={product.id} className="rounded-lg border border-purple-200/12 bg-black/22 p-4">
                  <input
                    value={product.name}
                    onChange={(event) => updataProduct(product.id, 'name', event.target.value)}
                    className="w-full rounded-lg border border-purple-200/15 bg-black/40 px-3 py-2 font-black outline-none focus:border-ryuu-neon"
                  />
                  <textarea
                    value={product.description}
                    onChange={(event) => updataProduct(product.id, 'description', event.target.value)}
                    className="mt-2 h-24 w-full rounded-lg border border-purple-200/15 bg-black/40 px-3 py-2 text-sm outline-none focus:border-ryuu-neon"
                  />
                  <div className="mt-2 grid grid-cols-3 gap-2">
                    <input
                      type="number"
                      value={product.price}
                      onChange={(event) => updataProduct(product.id, 'price', event.target.value)}
                      className="rounded-lg border border-purple-200/15 bg-black/40 px-3 py-2 outline-none focus:border-ryuu-neon"
                    />
                    <input
                      type="number"
                      min="0"
                      value={product.stock || 0}
                      onChange={(event) => updataProduct(product.id, 'stock', event.target.value)}
                      className="rounded-lg border border-purple-200/15 bg-black/40 px-3 py-2 outline-none focus:border-ryuu-neon"
                      title="Estoque"
                    />
                    <select
                      value={product.available ? 'available' : 'unavailable'}
                      onChange={(event) => updataProduct(product.id, 'available', event.target.value === 'available')}
                      className="rounded-lg border border-purple-200/15 bg-black/40 px-3 py-2 outline-none focus:border-ryuu-neon"
                    >
                      <option value="available">Disponível</option>
                      <option value="unavailable">Indisponível</option>
                    </select>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => saveProduct(product)}
                      className="flex items-center justify-center gap-2 rounded-lg border border-ryuu-neon/25 bg-ryuu-neon/10 px-3 py-2 text-xs font-black text-ryuu-soft"
                    >
                      <Save size={15} />
                      Salvar
                    </button>
                    <button
                      type="button"
                      onClick={() => removeProduct(product.id)}
                      className="rounded-lg border border-red-300/20 bg-red-400/10 px-3 py-2 text-xs font-black text-red-100"
                    >
                      Remover
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <AdminPanel title="Gerenciamento de usuários" icon={Users}>
          <DateTable
            headers={['Nome', 'Gmail', 'Discord', 'Role', 'Compras']}
            rows={adminUsers.map((user) => [user.name, user.email, user.discord, user.role, user.orders])}
          />
        </AdminPanel>

        <AdminPanel title="Gerenciamento de cupons" icon={Gift}>
          <div className="mb-4 grid gap-2 sm:grid-cols-[1fr_0.8fr_0.8fr_auto]">
            <input
              value={couponDraft.code}
              onChange={(event) => setCouponDraft((current) => ({ ...current, code: event.target.value }))}
              placeholder="Código"
              className="rounded-lg border border-purple-200/15 bg-black/40 px-3 py-2 text-sm outline-none focus:border-ryuu-neon"
            />
            <select
              value={couponDraft.type}
              onChange={(event) => setCouponDraft((current) => ({ ...current, type: event.target.value }))}
              className="rounded-lg border border-purple-200/15 bg-black/40 px-3 py-2 text-sm outline-none focus:border-ryuu-neon"
            >
              <option value="Percentual">Percentual</option>
              <option value="Valor fixo">Valor fixo</option>
            </select>
            <input
              value={couponDraft.value}
              onChange={(event) => setCouponDraft((current) => ({ ...current, value: event.target.value }))}
              placeholder="Ex: 10% ou R$ 20"
              className="rounded-lg border border-purple-200/15 bg-black/40 px-3 py-2 text-sm outline-none focus:border-ryuu-neon"
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
              <thead className="text-purple-100/62">
                <tr>
                  {['Código', 'Tipo', 'Valor', 'Limite', 'Status', 'Ação'].map((header) => (
                    <th key={header} className="border-b border-purple-200/10 px-3 py-3 font-black">
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {adminCoupons.map((coupon) => (
                  <tr key={coupon.code} className="border-b border-purple-200/8">
                    <td className="px-3 py-4 font-black">{coupon.code}</td>
                    <td className="px-3 py-4">{coupon.type}</td>
                    <td className="px-3 py-4">{coupon.value}</td>
                    <td className="px-3 py-4">{coupon.limit}</td>
                    <td className="px-3 py-4">{coupon.status}</td>
                    <td className="px-3 py-4">
                      <button
                        type="button"
                        onClick={() => toggleCoupon(coupon.code)}
                        className="rounded-lg bg-white/6 px-3 py-2 text-xs font-black text-purple-100 hover:shadow-glow-sm"
                      >
                        {coupon.status === 'Ativo' ? 'Desativar' : 'Ativar'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </AdminPanel>
      </div>

      <div className="mt-6">
        <AdminPanel title="Integrações de produção" icon={Settings}>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-5">
            {[
              'Stripe Checkout',
              'Mercado Pago',
              'Webhook Discord',
              'Gmail automático',
              'Cupons no backend',
            ].map((item) => (
              <div key={item} className="rounded-lg border border-purple-200/12 bg-black/24 p-4">
                <div className="mb-3 grid h-10 w-10 place-items-center rounded-lg bg-ryuu-neon/14 text-ryuu-soft">
                  <Settings size={18} />
                </div>
                <p className="font-black">{item}</p>
                <p className="mt-1 text-xs leading-5 text-purple-100/58">Pronto para conectar via backend/API.</p>
              </div>
            ))}
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
        <BarChart3 className="text-purple-200/40" size={20} />
      </div>
      <p className="text-sm text-purple-100/62">{label}</p>
      <p className="mt-1 text-3xl font-black">{value}</p>
    </div>
  );
}

function AdminPanel({ title, icon: Icon, children }) {
  return (
    <div className="glass rounded-lg p-6">
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
        <thead className="text-purple-100/62">
          <tr>
            {headers.map((header) => (
              <th key={header} className="border-b border-purple-200/10 px-3 py-3 font-black">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={headers.length} className="px-3 py-8 text-center text-purple-100/58">
                Nada por aqui ainda.
              </td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr key={row.join('-')} className="border-b border-purple-200/8">
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
    <footer className="border-t border-purple-200/10 bg-black/30">
      <div className="mx-auto flex max-w-7xl flex-col justify-between gap-5 px-4 py-8 sm:px-6 md:flex-row md:items-center lg:px-8">
        <div className="flex items-center gap-3">
          <img
            src={iconGif}
            alt="ÍCONE GIF Ryuu Group"
            loading="lazy"
            decoding="async"
            className="h-11 w-11 rounded-lg object-cover"
          />
          <div>
            <p className="font-black">Ryuu Group</p>
            <p className="text-sm text-purple-100/62">Acesso vitalício.</p>
          </div>
        </div>
        <a
          href="https://discord.gg/SKQXhFHtEp"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-ryuu-neon/30 px-4 py-3 font-black text-purple-100 hover:shadow-glow-sm"
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

