// The shapes of the data the backend sends and receives.
// They match the Python models in my-business-be/app/models and app/schemas.

/** Fields every saved document has. createdAt/updatedAt are milliseconds, like Date.now(). */
export type Saved = { id: string; createdAt: number; updatedAt: number }

/** Dates without a time are sent as "YYYY-MM-DD". */
export type DateText = string

// ---- User & business -------------------------------------------------------------------

export type CurrentUser = { uid: string; email: string | null; name: string | null; picture: string | null; isAdmin: boolean }

export type BusinessIn = {
  businessName: string
  legalName: string
  tradeName: string
  businessTypes: string[]
  businessDescription: string
  businessLogo: string
  coverImage: string
  yearEstablished: number | null
  businessSize: string | null
  industry: string
  categoryIds: string[]
  businessStatus: string
  website: string
  primaryEmail: string
  primaryPhone: string
  currency: string
}

export type Business = Saved &
  BusinessIn & {
    ownerUid: string
    memberUids: string[]
    verificationStatus: string
    verificationLevel: string | null
    capabilities: string[]
    primaryCity: string
    primaryProvince: string
    ratingAverage: number
    ratingCount: number
  }

export type BusinessSummary = Pick<
  Business,
  | 'id'
  | 'businessName'
  | 'tradeName'
  | 'businessTypes'
  | 'businessDescription'
  | 'businessLogo'
  | 'coverImage'
  | 'industry'
  | 'categoryIds'
  | 'verificationStatus'
  | 'verificationLevel'
  | 'ratingAverage'
  | 'ratingCount'
  | 'capabilities'
  | 'primaryCity'
  | 'primaryProvince'
  | 'currency'
>

export type BusinessPublicDetails = BusinessSummary &
  Pick<Business, 'legalName' | 'yearEstablished' | 'businessSize' | 'website' | 'primaryEmail' | 'primaryPhone' | 'createdAt'>

export type MyRole = { role: string; permissions: string[] }

export type Member = Saved & {
  email: string
  displayName: string
  role: string
  permissions: string[]
  status: string
  joinedAt: number
  /** Sellers only: the store they sell from (null = any) */
  locationId?: string | null
}

// ---- Profile ---------------------------------------------------------------------------

export type Legal = Saved & {
  registrationType: string | null
  registrationNumber: string
  registrationDate: DateText | null
  taxIdentificationNumber: string
  taxRegistered: boolean
  vatRegistered: boolean
  businessPermitNumber: string
  businessPermitExpiry: DateText | null
  licenseNumber: string
  licenseExpiry: DateText | null
  legalDocumentUrls: string[]
  verificationStatus: string
}

export type Contact = Saved & {
  userId: string
  contactType: string
  firstName: string
  lastName: string
  position: string
  email: string
  phone: string
  isPrimary: boolean
  showOnProfile: boolean
  isVerified: boolean
}

export type TimeRange = { start: string; end: string }
export type DayHours = { day: string; openingTime: string; closingTime: string; isClosed: boolean; breakPeriods: TimeRange[] }

export type Location = Saved & {
  locationName: string
  locationType: string
  addressLine1: string
  addressLine2: string
  barangay: string
  city: string
  province: string
  region: string
  postalCode: string
  country: string
  latitude: number | null
  longitude: number | null
  contactPhone: string
  operatingHours: DayHours[]
  isPrimary: boolean
}

export type SocialLink = Saved & { platform: string; username: string; url: string; verified: boolean }

export type Certification = Saved & {
  certificationName: string
  issuingOrganization: string
  certificateNumber: string
  issueDate: DateText | null
  expiryDate: DateText | null
  documentUrl: string
  verificationStatus: string
}

export type BusinessDocument = Saved & {
  documentType: string
  fileUrl: string
  fileName: string
  issueDate: DateText | null
  expiryDate: DateText | null
  verificationStatus: string
  verifiedAt: number | null
}

export type VerificationRequest = Saved & {
  businessId: string
  businessName: string
  verificationType: string
  documentIds: string[]
  notes: string
  status: string
  submittedAt: number
  submittedBy: string
  reviewedAt: number | null
  reviewedBy: string | null
  rejectionReason: string
}

// ---- Catalog ---------------------------------------------------------------------------

export type Category = Saved & { categoryName: string; parentCategoryId: string | null; status: string }

export type Brand = Saved & { brandName: string; description: string; logo: string; website: string; status: string }

/** A product photo or video. Only an image can be the primary (the thumbnail in lists). */
export type ProductImage = { imageUrl: string; mediaType?: MediaType; sortOrder: number; isPrimary: boolean }
export type MediaType = 'IMAGE' | 'VIDEO'
export type Specification = { name: string; value: string }
export type OrderRules = {
  minimumOrderQuantity: number
  maximumOrderQuantity: number | null
  orderMultiple: number
  minimumOrderValue: number | null
  leadTimeDays: number | null
  preorderAllowed: boolean
}

export type Product = Saved & {
  productName: string
  sku: string
  barcode: string
  categoryId: string | null
  brandId: string | null
  description: string
  specifications: Specification[]
  unit: string
  status: string
  visibility: string
  images: ProductImage[]
  orderRules: OrderRules
  costPrice: number | null
}

export type Variant = Saved & {
  productId: string
  variantName: string
  sku: string
  barcode: string
  attributes: Record<string, string>
  weightKg: number | null
  lengthCm: number | null
  widthCm: number | null
  heightCm: number | null
  unit: string
  status: string
}

export type Price = Saved & {
  productId: string
  variantId: string | null
  priceType: string
  price: number
  currency: string
  minimumQuantity: number
  maximumQuantity: number | null
  customerType: string | null
  effectiveFrom: DateText | null
  effectiveUntil: DateText | null
  status: string
}

export type CustomerPrice = Saved & {
  customerBusinessId: string
  customerBusinessName: string
  productId: string
  variantId: string | null
  price: number
  minimumQuantity: number
  effectiveFrom: DateText | null
  effectiveUntil: DateText | null
}

/** A product with its variants and price tiers (what the product form edits). */
export type ProductFull = { product: Product; variants: Variant[]; prices: Price[] }

// ---- Inventory & sales -----------------------------------------------------------------

export type InventoryItem = Saved & {
  productId: string
  variantId: string | null
  locationId: string
  quantity: number
  reorderLevel: number | null
  reservedQuantity: number
  availableQuantity: number
  stockStatus: string
}

/** One change to a quantity on hand (a line in the stock history). */
export type StockMovement = Saved & {
  productId: string
  variantId: string | null
  locationId: string
  productName: string
  variantName: string
  locationName: string
  movementType: string
  change: number
  quantityAfter: number
  note: string
  referenceId: string
  referenceLabel: string
  byUid: string
  byName: string
}

export type Sale = Saved & {
  productId: string
  variantId: string | null
  locationId: string
  productName: string
  variantName: string
  quantity: number
  unitPrice: number
  unitCost: number | null
  date: DateText
  /** Set when the sale was made in the selling app */
  receiptId: string
  receiptNumber: string
}

// ---- Commerce settings -------------------------------------------------------------------

export type DeliverySettings = Saved & {
  deliveryAvailable: boolean
  pickupAvailable: boolean
  shippingAvailable: boolean
  deliveryRadiusKm: number | null
  deliveryMethods: string[]
  minimumOrderForDelivery: number | null
  deliveryFee: number | null
  freeDeliveryThreshold: number | null
  estimatedDeliveryDays: number | null
  deliveryNotes: string
}

export type DeliveryZone = Saved & {
  region: string
  province: string
  city: string
  barangay: string
  deliveryFee: number
  estimatedDays: number | null
}

export type PaymentMethod = Saved & {
  paymentType: string
  accountName: string
  accountNumber: string
  provider: string
  instructions: string
  isActive: boolean
}

export type PaymentTerms = Saved & {
  paymentTerms: string[]
  creditLimit: number | null
  creditDays: number | null
  downPaymentPercentage: number | null
  notes: string
}

export type ReturnPolicy = Saved & {
  returnAllowed: boolean
  returnPeriodDays: number | null
  refundMethod: string | null
  replacementAvailable: boolean
  damagedGoodsPolicy: string
  defectiveGoodsPolicy: string
  policyDescription: string
}

export type SupplierProfile = Saved & Record<string, boolean>

// ---- Orders ----------------------------------------------------------------------------

export type Address = {
  recipientName: string
  phone: string
  addressLine1: string
  addressLine2: string
  barangay: string
  city: string
  province: string
  region: string
  postalCode: string
  country: string
}

export type OrderItemIn = { productId: string; variantId: string | null; quantity: number }

export type OrderIn = {
  sellerBusinessId: string
  items: OrderItemIn[]
  fulfillmentMethod: string
  shippingAddress: Address | null
  paymentMethodType: string | null
  paymentTerm: string | null
  notes: string
}

export type QuoteLine = {
  productId: string
  variantId: string | null
  productName: string
  variantName: string
  sku: string
  unit: string
  quantity: number
  unitPrice: number | null
  subtotal: number
}

export type Quote = {
  lines: QuoteLine[]
  subtotal: number
  deliveryFee: number
  total: number
  currency: string
  problems: string[]
}

export type OrderItem = Omit<QuoteLine, 'unitPrice'> & { unitPrice: number; discount: number }

export type Order = Saved & {
  orderNumber: string
  buyerBusinessId: string
  buyerBusinessName: string
  sellerBusinessId: string
  sellerBusinessName: string
  businessIds: string[]
  placedByUid: string
  orderStatus: string
  paymentStatus: string
  deliveryStatus: string
  items: OrderItem[]
  currency: string
  subtotal: number
  deliveryFee: number
  tax: number
  discount: number
  total: number
  fulfillmentMethod: string
  shippingAddress: Address | null
  paymentMethodType: string | null
  paymentTerm: string | null
  notes: string
  fulfillmentLocationId: string | null
  statusReason: string
  reviewed: boolean
  orderedAt: number
  confirmedAt: number | null
  shippedAt: number | null
  deliveredAt: number | null
  completedAt: number | null
  cancelledAt: number | null
}

export type PaymentInstructions = {
  paymentType: string
  accountName: string
  accountNumber: string
  provider: string
  instructions: string
}

export type OrderView = Order & { paymentInstructions: PaymentInstructions[] }

// ---- Network ---------------------------------------------------------------------------

export type RelationshipView = {
  id: string
  otherBusinessId: string
  otherBusinessName: string
  theirRole: string
  direction: 'OUTGOING' | 'INCOMING'
  status: string
  notes: string
  createdAt: number
  startedAt: number | null
  endedAt: number | null
}

export type Ratings = {
  productQuality: number | null
  communication: number | null
  delivery: number | null
  packaging: number | null
  accuracy: number | null
  customerService: number | null
}

export type Review = Saved & {
  reviewerBusinessId: string
  reviewerBusinessName: string
  orderId: string
  ratings: Ratings
  rating: number
  review: string
  response: string
  respondedAt: number | null
  status: string
}

export type Conversation = Saved & {
  businessIds: string[]
  businessNames: Record<string, string>
  status: string
  lastMessage: string
  lastMessageAt: number
  lastSenderBusinessId: string
  lastReadAt: Record<string, number>
  otherBusinessId: string
  otherBusinessName: string
  unread: boolean
}

export type Message = Saved & {
  senderUid: string
  senderName: string
  senderBusinessId: string
  message: string
  attachments: string[]
  readAt: number | null
}

/** A message in the team or market channel (from the Realtime Database). */
export type ChatMessage = {
  id: string
  senderUid: string
  senderName: string
  businessId: string
  businessName: string
  businessLogo: string
  message: string
  createdAt: number
}

/** A direct message as saved in the Realtime Database (chat/dm/{conversationId}/messages). */
export type LiveMessage = {
  id: string
  senderUid: string
  senderName: string
  senderBusinessId: string
  message: string
  createdAt: number
}

export type ChatAccess = { uid: string; businessId: string; teamPath: string; marketPath: string }

// ---- Directory -------------------------------------------------------------------------

export type PublicContact = Pick<
  Contact,
  'id' | 'contactType' | 'firstName' | 'lastName' | 'position' | 'email' | 'phone' | 'isPrimary' | 'isVerified'
>

export type PublicCertification = Omit<Certification, 'documentUrl' | 'createdAt' | 'updatedAt'>

export type PublicProfile = {
  business: BusinessPublicDetails
  locations: Location[]
  contacts: PublicContact[]
  brands: Brand[]
  supplierProfile: SupplierProfile
  delivery: DeliverySettings
  deliveryZones: DeliveryZone[]
  paymentTerms: PaymentTerms
  returnPolicy: ReturnPolicy
  paymentTypes: string[]
  certifications: PublicCertification[]
  socialLinks: SocialLink[]
}

export type MyCustomerPrice = {
  variantId: string | null
  price: number
  minimumQuantity: number
  effectiveFrom: DateText | null
  effectiveUntil: DateText | null
}

export type PublicProduct = Pick<
  Product,
  | 'id'
  | 'productName'
  | 'sku'
  | 'barcode'
  | 'categoryId'
  | 'brandId'
  | 'description'
  | 'specifications'
  | 'unit'
  | 'images'
  | 'orderRules'
> & { variants: Variant[]; prices: Price[]; customerPrices: MyCustomerPrice[] }
