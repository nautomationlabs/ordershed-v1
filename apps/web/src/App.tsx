import { lazy, Suspense, type ComponentType } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { DesktopShell } from './shells/DesktopShell';
import { ADMIN_NAV, BUYER_NAV } from './shells/nav';
import { ME } from './api/mock/data';
import { LoadingBlock } from './components/StateViews';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const L = <M extends Record<string, any>>(f: () => Promise<M>, name: keyof M) =>
  lazy(() => f().then((m) => ({ default: m[name] as ComponentType })));

const buyer = () => import('./features/buyer');
const supplier = () => import('./features/supplier');
const admin = () => import('./features/admin');
const pub = () => import('./features/public');

const ScreenIndex = L(pub, 'ScreenIndex');
const Login = L(pub, 'Login');
const BuyerSignup = L(pub, 'BuyerSignup');
const GetQuote = L(pub, 'GetQuote');

const Home = L(buyer, 'Home');
const Commitments = L(buyer, 'Commitments');
const Chat = L(buyer, 'Chat');
const CreateRequest = L(buyer, 'CreateRequest');
const FindVendors = L(buyer, 'FindVendors');
const RfqList = L(buyer, 'RfqList');
const RfqView = L(buyer, 'RfqView');
const Compare = L(buyer, 'Compare');
const Auctions = L(buyer, 'Auctions');
const Award = L(buyer, 'Award');
const Orders = L(buyer, 'Orders');
const Shipments = L(buyer, 'Shipments');
const Transport = L(buyer, 'Transport');
const GrnScreen = L(buyer, 'GrnScreen');
const Payments = L(buyer, 'Payments');
const VendorList = L(buyer, 'VendorList');
const VendorView = L(buyer, 'VendorView');
const Onboarding = L(buyer, 'Onboarding');
const Materials = L(buyer, 'Materials');
const DocsLibrary = L(buyer, 'DocsLibrary');
const Intelligence = L(buyer, 'Intelligence');
const Reports = L(buyer, 'Reports');
const Audit = L(buyer, 'Audit');
const Settings = L(buyer, 'Settings');
const MaskedCall = L(buyer, 'MaskedCall');

const Join = L(supplier, 'Join');
const Profile = L(supplier, 'Profile');
const ProfileSection = L(supplier, 'ProfileSection');
const OpenItems = L(supplier, 'OpenItems');
const QuoteScreen = L(supplier, 'QuoteScreen');
const Catalogue = L(supplier, 'Catalogue');
const SupplierOrders = L(supplier, 'SupplierOrders');
const OrderChat = L(supplier, 'OrderChat');
const Dispatch = L(supplier, 'Dispatch');
const WhatsAppPreview = L(supplier, 'WhatsAppPreview');
const JobBoard = L(supplier, 'JobBoard');
const JobPack = L(supplier, 'JobPack');
const MyWork = L(supplier, 'MyWork');

const OpsHome = L(admin, 'OpsHome');
const Verification = L(admin, 'Verification');
const RfqOps = L(admin, 'RfqOps');
const SupplierDirectory = L(admin, 'SupplierDirectory');
const BuyerOrgs = L(admin, 'BuyerOrgs');
const Messaging = L(admin, 'Messaging');
const CostModels = L(admin, 'CostModels');
const Disputes = L(admin, 'Disputes');

export function App() {
  return (
    <Suspense fallback={<LoadingBlock lines={6} />}>
      <Routes>
        <Route path="/" element={<ScreenIndex />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<BuyerSignup />} />
        <Route path="/get-a-quote" element={<GetQuote />} />

        <Route path="/b" element={<DesktopShell nav={BUYER_NAV} context="Buyer" user={ME} />}>
          <Route index element={<Navigate to="home" replace />} />
          <Route path="home" element={<Home />} />
          <Route path="commitments" element={<Commitments />} />
          <Route path="chat" element={<Chat />} />
          <Route path="requests/new" element={<CreateRequest />} />
          <Route path="vendors/find" element={<FindVendors />} />
          <Route path="rfqs" element={<RfqList />} />
          <Route path="rfqs/:id" element={<RfqView />} />
          <Route path="compare/:id" element={<Compare />} />
          <Route path="auctions" element={<Auctions />} />
          <Route path="award/:id" element={<Award />} />
          <Route path="orders" element={<Orders />} />
          <Route path="shipments" element={<Shipments />} />
          <Route path="transport" element={<Transport />} />
          <Route path="grn" element={<GrnScreen />} />
          <Route path="payments" element={<Payments />} />
          <Route path="vendors" element={<VendorList />} />
          <Route path="vendors/:id" element={<VendorView />} />
          <Route path="onboarding" element={<Onboarding />} />
          <Route path="materials" element={<Materials />} />
          <Route path="docs" element={<DocsLibrary />} />
          <Route path="intelligence" element={<Intelligence />} />
          <Route path="reports" element={<Reports />} />
          <Route path="audit" element={<Audit />} />
          <Route path="settings" element={<Settings />} />
          <Route path="call/:id" element={<MaskedCall />} />
        </Route>

        <Route path="/s/join" element={<Join />} />
        <Route path="/s/profile" element={<Profile />} />
        <Route path="/s/profile/:section" element={<ProfileSection />} />
        <Route path="/s/open" element={<OpenItems />} />
        <Route path="/s/quote/:id" element={<QuoteScreen />} />
        <Route path="/s/catalogue" element={<Catalogue />} />
        <Route path="/s/orders" element={<SupplierOrders />} />
        <Route path="/s/orders/:id" element={<OrderChat />} />
        <Route path="/s/dispatch/:id" element={<Dispatch />} />
        <Route path="/s/whatsapp" element={<WhatsAppPreview />} />
        <Route path="/s/web/jobs" element={<JobBoard />} />
        <Route path="/s/web/jobs/:id" element={<JobPack />} />
        <Route path="/s/web/work" element={<MyWork />} />

        <Route path="/a" element={<DesktopShell nav={ADMIN_NAV} context="Admin" user={{ name: 'Divya Menon', role: 'Ops' }} />}>
          <Route index element={<Navigate to="ops" replace />} />
          <Route path="ops" element={<OpsHome />} />
          <Route path="verification" element={<Verification />} />
          <Route path="rfqs" element={<RfqOps />} />
          <Route path="suppliers" element={<SupplierDirectory />} />
          <Route path="buyers" element={<BuyerOrgs />} />
          <Route path="messaging" element={<Messaging />} />
          <Route path="cost" element={<CostModels />} />
          <Route path="disputes" element={<Disputes />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}
