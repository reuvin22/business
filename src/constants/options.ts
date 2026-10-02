// Every fixed list of choices. Keep these in sync with my-business-be/app/schemas/enums.py.

export type Option = { value: string; label: string }

// Labels that can't be made automatically from the value
const SPECIAL_LABELS: Record<string, string> = {
  DTI: 'DTI',
  SEC: 'SEC',
  CDA: 'CDA (cooperative)',
  ID: 'ID',
  COD: 'Cash on delivery (COD)',
  GCASH: 'GCash',
  E_WALLET: 'E-wallet',
  ONLINE_PAYMENT: 'Online payment link',
  X: 'X (Twitter)',
  TIKTOK: 'TikTok',
  LINKEDIN: 'LinkedIn',
  YOUTUBE: 'YouTube',
  FARMER_PRODUCER: 'Farmer / producer',
  DOWN_PAYMENT_50: '50% down payment',
  NET_7: 'Net 7 days',
  NET_15: 'Net 15 days',
  NET_30: 'Net 30 days',
  NET_60: 'Net 60 days',
  BIR_DOCUMENT: 'BIR document',
  DTI_CERTIFICATE: 'DTI certificate',
  SEC_CERTIFICATE: 'SEC certificate',
  MICRO: 'Micro (1–9 employees)',
  SMALL: 'Small (10–99)',
  MEDIUM: 'Medium (100–199)',
  LARGE: 'Large (200+)',
  SHIPPED: 'Shipped / picked up',
}

/** "BANK_TRANSFER" -> "Bank transfer" */
export function labelOf(value: string | null | undefined): string {
  if (!value) return '—'
  if (SPECIAL_LABELS[value]) return SPECIAL_LABELS[value]
  const words = value.toLowerCase().replace(/_/g, ' ')
  return words.charAt(0).toUpperCase() + words.slice(1)
}

const options = (...values: string[]): Option[] => values.map((value) => ({ value, label: labelOf(value) }))

// ---- Business ----
export const BUSINESS_TYPES = options(
  'MANUFACTURER',
  'SUPPLIER',
  'DISTRIBUTOR',
  'WHOLESALER',
  'RETAILER',
  'IMPORTER',
  'EXPORTER',
  'SERVICE_PROVIDER',
  'BRAND_OWNER',
  'FARMER_PRODUCER',
  'OTHER',
)
export const BUSINESS_SIZES = options('MICRO', 'SMALL', 'MEDIUM', 'LARGE')
export const BUSINESS_STATUSES = options('ACTIVE', 'INACTIVE', 'CLOSED')
export const INDUSTRIES = [
  'Retail',
  'Food & Beverage',
  'Agriculture',
  'Manufacturing',
  'Wholesale & Distribution',
  'Services',
  'Technology',
  'Health & Wellness',
  'Construction',
  'Education',
  'Creative & Design',
  'Other',
].map((name) => ({ value: name, label: name }))
export const CURRENCIES = ['PHP', 'USD', 'EUR', 'GBP', 'JPY', 'AUD', 'CAD', 'SGD'].map((c) => ({ value: c, label: c }))

// ---- Verification & documents ----
export const VERIFICATION_TYPES: (Option & { description: string })[] = [
  { value: 'BASIC', label: 'Basic', description: 'Contact details confirmed' },
  { value: 'IDENTITY', label: 'Identity verified', description: "Owner's government ID checked" },
  { value: 'BUSINESS', label: 'Business verified', description: 'Registration documents (DTI/SEC, permit, BIR) checked' },
  { value: 'SUPPLIER', label: 'Supplier verified', description: 'Supplier capabilities and certifications checked' },
]
export const REGISTRATION_TYPES = options('DTI', 'SEC', 'CDA', 'OTHER')
export const DOCUMENT_TYPES = options(
  'BUSINESS_PERMIT',
  'DTI_CERTIFICATE',
  'SEC_CERTIFICATE',
  'BIR_DOCUMENT',
  'TAX_DOCUMENT',
  'LICENSE',
  'CERTIFICATION',
  'ID',
  'CONTRACT',
  'OTHER',
)

// ---- People ----
export const CONTACT_TYPES = options('OWNER', 'REPRESENTATIVE', 'EMPLOYEE', 'AGENT')
export const CONTACT_POSITIONS = options(
  'OWNER',
  'MANAGER',
  'SALES',
  'PURCHASING',
  'ACCOUNTING',
  'CUSTOMER_SERVICE',
  'LOGISTICS',
  'ADMIN',
  'OTHER',
)
export const MEMBER_ROLES = options('ADMIN', 'MANAGER', 'SALES', 'PURCHASING', 'ACCOUNTING', 'WAREHOUSE', 'STAFF')
export const MEMBER_STATUSES = options('ACTIVE', 'SUSPENDED')

export const PERMISSIONS: Option[] = [
  { value: 'business.edit', label: 'Edit business profile' },
  { value: 'members.manage', label: 'Manage team' },
  { value: 'products.manage', label: 'Manage products & prices' },
  { value: 'inventory.manage', label: 'Manage inventory & walk-in sales' },
  { value: 'orders.sell', label: 'Handle orders from customers' },
  { value: 'orders.buy', label: 'Place orders with suppliers' },
  { value: 'payments.manage', label: 'Manage payment methods & terms' },
  { value: 'messages.send', label: 'Send messages' },
  { value: 'relationships.manage', label: 'Manage business relationships' },
  { value: 'reviews.write', label: 'Write reviews' },
  { value: 'pos.use', label: 'Sell in the selling app' },
]

// Default permissions for each role (same as app/core/permissions.py)
const ALL = PERMISSIONS.map((p) => p.value)
export const ROLE_PERMISSIONS: Record<string, string[]> = {
  OWNER: ALL,
  ADMIN: ALL,
  MANAGER: ALL.filter((p) => p !== 'members.manage'),
  SALES: ['products.manage', 'orders.sell', 'messages.send', 'relationships.manage'],
  PURCHASING: ['orders.buy', 'messages.send', 'relationships.manage', 'reviews.write'],
  ACCOUNTING: ['payments.manage'],
  WAREHOUSE: ['inventory.manage', 'orders.sell', 'pos.use'],
  STAFF: [],
}

// ---- Locations ----
export const LOCATION_TYPES = options(
  'HEAD_OFFICE',
  'BRANCH',
  'WAREHOUSE',
  'FACTORY',
  'STORE',
  'DISTRIBUTION_CENTER',
  'PICKUP_POINT',
)
export const DAYS = options('MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY')

// ---- Catalog ----
export const ACTIVE_STATUSES = options('ACTIVE', 'INACTIVE')
export const PRODUCT_STATUSES = options('ACTIVE', 'DRAFT', 'ARCHIVED')
export const VISIBILITIES: Option[] = [
  { value: 'PUBLIC', label: 'Public — shown in the directory' },
  { value: 'PRIVATE', label: 'Private — only your team' },
]
export const PRICE_TYPES = options('RETAIL', 'WHOLESALE', 'DISTRIBUTOR', 'BULK', 'SPECIAL')
export const STOCK_MOVEMENT_TYPES: Option[] = [
  { value: 'STOCK_ADDED', label: 'Stock added' },
  { value: 'ADJUSTMENT', label: 'Adjustment' },
  { value: 'CORRECTION', label: 'Count correction' },
  { value: 'SALE', label: 'Walk-in sale' },
  { value: 'SALE_UNDONE', label: 'Sale undone / voided' },
  { value: 'ORDER_SHIPPED', label: 'Order shipped' },
  { value: 'ORDER_ACCEPTED', label: 'Order accepted' },
  { value: 'ORDER_CANCELLED', label: 'Order cancelled (stock back)' },
  { value: 'RECORD_REMOVED', label: 'Record removed' },
]
export const UNITS = ['pcs', 'box', 'case', 'pack', 'set', 'bottle', 'can', 'sack', 'kg', 'g', 'L', 'mL', 'm'].map(
  (u) => ({ value: u, label: u }),
)

// ---- Logistics & payments ----
export const DELIVERY_METHODS = options('OWN_DELIVERY', 'COURIER', 'FREIGHT', 'OTHER')
export const FULFILLMENT_METHODS = options('DELIVERY', 'PICKUP', 'SHIPPING')
// The kind of payment; which bank / e-wallet / cards is the method's provider. (Older methods named
// the provider here: GCASH, MAYA, CREDIT_CARD, DEBIT_CARD. They still have labels, for old orders.)
export const PAYMENT_TYPES = options(
  'CASH',
  'COD',
  'BANK_TRANSFER',
  'E_WALLET',
  'CARD',
  'ONLINE_PAYMENT',
  'CHEQUE',
  'CREDIT_TERMS',
)
export const PAYMENT_TERMS = options('PREPAID', 'COD', 'DOWN_PAYMENT_50', 'NET_7', 'NET_15', 'NET_30', 'NET_60')
export const REFUND_METHODS = options('ORIGINAL_PAYMENT', 'CASH', 'BANK_TRANSFER', 'STORE_CREDIT', 'REPLACEMENT_ONLY')
export const SOCIAL_PLATFORMS = options(
  'FACEBOOK',
  'INSTAGRAM',
  'TIKTOK',
  'LINKEDIN',
  'YOUTUBE',
  'X',
  'WEBSITE',
  'SHOPEE',
  'LAZADA',
  'OTHER',
)

// The keys match SupplierProfile in the backend (camelCase)
export const SUPPLIER_CAPABILITIES: Option[] = [
  { value: 'manufacturing', label: 'Manufacturing' },
  { value: 'privateLabel', label: 'Private label' },
  { value: 'whiteLabel', label: 'White label' },
  { value: 'customOrders', label: 'Custom orders' },
  { value: 'bulkOrders', label: 'Bulk orders' },
  { value: 'exportGoods', label: 'Export' },
  { value: 'importGoods', label: 'Import' },
  { value: 'distribution', label: 'Distribution' },
  { value: 'contractManufacturing', label: 'Contract manufacturing' },
  { value: 'sampleAvailable', label: 'Samples available' },
  { value: 'customizationAvailable', label: 'Customization' },
]

// ---- Orders & network ----
export const PAYMENT_STATUSES = options('UNPAID', 'PARTIALLY_PAID', 'PAID', 'REFUNDED')
export const RELATIONSHIP_TYPES = options(
  'SUPPLIER',
  'CUSTOMER',
  'DISTRIBUTOR',
  'RESELLER',
  'PARTNER',
  'MANUFACTURER',
  'AUTHORIZED_DEALER',
)
export const RATING_DIMENSIONS: Option[] = [
  { value: 'productQuality', label: 'Product quality' },
  { value: 'communication', label: 'Communication' },
  { value: 'delivery', label: 'Delivery' },
  { value: 'packaging', label: 'Packaging' },
  { value: 'accuracy', label: 'Order accuracy' },
  { value: 'customerService', label: 'Customer service' },
]
