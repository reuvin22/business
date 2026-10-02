// Every form in the app is defined here. To add or remove a field, edit its line.
// (If a field is new, also add it to the backend schema in my-business-be/app/schemas.)
import * as opt from '../constants/options'
import type { Option } from '../constants/options'
import type { Section } from './fields'

// ---- Business identity (section 1) ----------------------------------------------------------

export const businessSections = (categoryOptions: Option[]): Section[] => [
  {
    title: 'Basic information',
    fields: [
      { key: 'businessName', label: 'Business name', required: true, placeholder: 'e.g. Sunrise Bakery' },
      { key: 'tradeName', label: 'Trade name / brand name' },
      { key: 'legalName', label: 'Registered / legal name', placeholder: 'e.g. Sunrise Bakery Inc.' },
      {
        key: 'businessTypes',
        label: 'Business type (choose all that apply)',
        type: 'checkboxes',
        options: opt.BUSINESS_TYPES,
        required: true,
      },
      { key: 'industry', label: 'Industry', type: 'select', options: opt.INDUSTRIES },
      { key: 'categoryIds', label: 'Categories', type: 'checkboxes', options: categoryOptions },
      { key: 'businessDescription', label: 'Description', type: 'textarea', placeholder: 'What does your business do?' },
      { key: 'yearEstablished', label: 'Year established', type: 'number', placeholder: 'e.g. 2015' },
      { key: 'businessSize', label: 'Business size', type: 'select', options: opt.BUSINESS_SIZES, emptyAsNull: true },
      {
        key: 'businessStatus',
        label: 'Status',
        type: 'select',
        options: opt.BUSINESS_STATUSES,
        required: true,
        hint: 'Only ACTIVE businesses appear in the directory.',
      },
      { key: 'currency', label: 'Currency', type: 'select', options: opt.CURRENCIES, required: true },
    ],
  },
  {
    title: 'Contact',
    fields: [
      { key: 'primaryEmail', label: 'Business email', type: 'email', placeholder: 'hello@business.com' },
      { key: 'primaryPhone', label: 'Phone', type: 'tel', placeholder: '+63 912 345 6789' },
      { key: 'website', label: 'Website', type: 'url', placeholder: 'https://' },
    ],
  },
  {
    // Only in the edit form: the logo is shown on the business's cards (directory, My businesses), not as text here
    title: 'Logo',
    hint: 'Shown as the big picture on your card in the directory and in My businesses. A square image looks best.',
    fields: [{ key: 'businessLogo', label: 'Logo', type: 'image' }],
  },
]

export const newBusinessValues = {
  businessTypes: [],
  businessStatus: 'ACTIVE',
  currency: 'PHP',
  categoryIds: [],
}

// ---- Legal & registration (section 2) --------------------------------------------------------

export const legalSections: Section[] = [
  {
    title: 'Registration',
    hint: "Fill in what applies to your business. Nothing here is required.",
    fields: [
      { key: 'registrationType', label: 'Registered with', type: 'select', options: opt.REGISTRATION_TYPES, emptyAsNull: true },
      { key: 'registrationNumber', label: 'Registration number' },
      { key: 'registrationDate', label: 'Registration date', type: 'date' },
    ],
  },
  {
    title: 'Tax (BIR)',
    fields: [
      { key: 'taxIdentificationNumber', label: 'Tax identification number (TIN)' },
      { key: 'taxRegistered', label: 'BIR registered', type: 'checkbox' },
      { key: 'vatRegistered', label: 'VAT registered', type: 'checkbox' },
    ],
  },
  {
    title: 'Permits & licenses',
    fields: [
      { key: 'businessPermitNumber', label: "Mayor's / business permit no." },
      { key: 'businessPermitExpiry', label: 'Permit expiry', type: 'date' },
      { key: 'licenseNumber', label: 'Industry license no.' },
      { key: 'licenseExpiry', label: 'License expiry', type: 'date' },
    ],
  },
]

// ---- People & places (sections 3-4) -----------------------------------------------------------

export const contactSections = (memberOptions: Option[]): Section[] => [
  {
    title: 'Contact person',
    fields: [
      { key: 'firstName', label: 'First name', required: true },
      { key: 'lastName', label: 'Last name' },
      { key: 'position', label: 'Position', type: 'select', options: opt.CONTACT_POSITIONS, required: true },
      { key: 'contactType', label: 'Contact type', type: 'select', options: opt.CONTACT_TYPES, required: true },
      { key: 'email', label: 'Email', type: 'email' },
      { key: 'phone', label: 'Phone', type: 'tel' },
      {
        key: 'userId',
        label: 'Team member account (optional)',
        type: 'select',
        options: memberOptions,
        hint: 'Linking a contact to a team member marks it as verified.',
      },
      { key: 'isPrimary', label: 'Primary contact', type: 'checkbox' },
      { key: 'showOnProfile', label: 'Show on public profile', type: 'checkbox' },
    ],
  },
]
export const newContactValues = { position: 'SALES', contactType: 'REPRESENTATIVE', showOnProfile: true }

export const locationSections: Section[] = [
  {
    title: 'Location',
    fields: [
      { key: 'locationName', label: 'Name', required: true, placeholder: 'e.g. Pasig warehouse' },
      { key: 'locationType', label: 'Type', type: 'select', options: opt.LOCATION_TYPES, required: true },
      { key: 'contactPhone', label: 'Phone', type: 'tel' },
      { key: 'isPrimary', label: 'Primary location', type: 'checkbox' },
    ],
  },
  {
    title: 'Address',
    fields: [
      { key: 'addressLine1', label: 'Address line 1', placeholder: 'Unit, building, street' },
      { key: 'addressLine2', label: 'Address line 2' },
      { key: 'barangay', label: 'Barangay' },
      { key: 'city', label: 'City / municipality' },
      { key: 'province', label: 'Province' },
      { key: 'region', label: 'Region', placeholder: 'e.g. NCR' },
      { key: 'postalCode', label: 'Postal code' },
      { key: 'country', label: 'Country' },
      { key: 'latitude', label: 'Latitude', type: 'number' },
      { key: 'longitude', label: 'Longitude', type: 'number' },
    ],
  },
]
export const newLocationValues = { locationType: 'HEAD_OFFICE', country: 'Philippines', operatingHours: [] }

// ---- Online presence & trust (sections 18-19, 24) -------------------------------------------

export const socialLinkSections: Section[] = [
  {
    title: 'Link',
    fields: [
      { key: 'platform', label: 'Platform', type: 'select', options: opt.SOCIAL_PLATFORMS, required: true },
      { key: 'username', label: 'Username / page name' },
      { key: 'url', label: 'Link', type: 'url', required: true, placeholder: 'https://' },
    ],
  },
]
export const newSocialLinkValues = { platform: 'FACEBOOK' }

export const certificationSections: Section[] = [
  {
    title: 'Certification',
    fields: [
      { key: 'certificationName', label: 'Name', required: true, placeholder: 'e.g. FDA LTO, ISO 9001, Halal' },
      { key: 'issuingOrganization', label: 'Issued by' },
      { key: 'certificateNumber', label: 'Certificate number' },
      { key: 'issueDate', label: 'Issue date', type: 'date' },
      { key: 'expiryDate', label: 'Expiry date', type: 'date' },
      { key: 'documentUrl', label: 'Copy of certificate (link)', type: 'url', hint: 'Private: only your team and platform admins.' },
    ],
  },
]

export const documentSections: Section[] = [
  {
    title: 'Document',
    hint: 'Upload the file to Google Drive, Dropbox, or similar and paste a share link. Documents are private.',
    fields: [
      { key: 'documentType', label: 'Type', type: 'select', options: opt.DOCUMENT_TYPES, required: true },
      { key: 'fileName', label: 'File name', placeholder: 'e.g. Business permit 2026' },
      { key: 'fileUrl', label: 'File link', type: 'url', required: true, placeholder: 'https://' },
      { key: 'issueDate', label: 'Issue date', type: 'date' },
      { key: 'expiryDate', label: 'Expiry date', type: 'date' },
    ],
  },
]
export const newDocumentValues = { documentType: 'BUSINESS_PERMIT' }

// ---- Catalog (sections 6-12, 23) ----------------------------------------------------------

export const brandSections: Section[] = [
  {
    title: 'Brand',
    fields: [
      { key: 'brandName', label: 'Brand name', required: true },
      { key: 'status', label: 'Status', type: 'select', options: opt.ACTIVE_STATUSES, required: true },
      { key: 'description', label: 'Description', type: 'textarea' },
      { key: 'logo', label: 'Logo link', type: 'url' },
      { key: 'website', label: 'Website', type: 'url' },
    ],
  },
]
export const newBrandValues = { status: 'ACTIVE' }

export const productSections = (brandOptions: Option[], categoryOptions: Option[]): Section[] => [
  {
    title: 'Product details',
    fields: [
      { key: 'productName', label: 'Product name', required: true, placeholder: 'e.g. Chocolate croissant' },
      { key: 'sku', label: 'SKU', placeholder: 'e.g. CRS-CHOC-01' },
      { key: 'barcode', label: 'Barcode' },
      { key: 'unit', label: 'Unit', type: 'select', options: opt.UNITS, required: true },
      { key: 'categoryId', label: 'Category', type: 'select', options: categoryOptions, emptyAsNull: true },
      { key: 'brandId', label: 'Brand', type: 'select', options: brandOptions, emptyAsNull: true },
      { key: 'status', label: 'Status', type: 'select', options: opt.PRODUCT_STATUSES, required: true },
      { key: 'visibility', label: 'Visibility', type: 'select', options: opt.VISIBILITIES, required: true },
      { key: 'description', label: 'Description', type: 'textarea' },
      {
        key: 'costPrice',
        label: 'Cost price (private)',
        type: 'number',
        hint: 'What one unit costs you. Used for profit margin; never shown to others.',
      },
    ],
  },
  {
    title: 'Order rules for buyers',
    fields: [
      { key: 'minimumOrderQuantity', label: 'Minimum order quantity (MOQ)', type: 'number', required: true },
      { key: 'maximumOrderQuantity', label: 'Maximum order quantity', type: 'number' },
      { key: 'orderMultiple', label: 'Order in multiples of', type: 'number', required: true },
      { key: 'minimumOrderValue', label: 'Minimum order value', type: 'number' },
      { key: 'leadTimeDays', label: 'Lead time (days)', type: 'number' },
      { key: 'preorderAllowed', label: 'Pre-orders allowed', type: 'checkbox' },
    ],
  },
]

export const customerPriceSections = (customerOptions: Option[], productOptions: Option[]): Section[] => [
  {
    title: 'Customer price',
    hint: 'A private price for one customer. It replaces your normal price tiers for them.',
    fields: [
      { key: 'customerBusinessId', label: 'Customer', type: 'select', options: customerOptions, required: true },
      { key: 'productId', label: 'Product', type: 'select', options: productOptions, required: true },
      { key: 'price', label: 'Price per unit', type: 'number', required: true },
      { key: 'minimumQuantity', label: 'From quantity', type: 'number', required: true },
      { key: 'effectiveFrom', label: 'Valid from', type: 'date' },
      { key: 'effectiveUntil', label: 'Valid until', type: 'date' },
    ],
  },
]
export const newCustomerPriceValues = { minimumQuantity: 1 }

// ---- Inventory & sales --------------------------------------------------------------------

export const inventorySections = (stockItemOptions: Option[], locationOptions: Option[]): Section[] => [
  {
    title: 'Stock record',
    fields: [
      { key: 'stockItem', label: 'Product', type: 'select', options: stockItemOptions, required: true },
      { key: 'locationId', label: 'Location', type: 'select', options: locationOptions, required: true },
      { key: 'quantity', label: 'Quantity on hand', type: 'number', required: true },
      { key: 'reorderLevel', label: 'Low-stock alert at', type: 'number' },
    ],
  },
]

export const saleSections = (stockItemOptions: Option[], locationOptions: Option[]): Section[] => [
  {
    title: 'Walk-in sale',
    fields: [
      { key: 'stockItem', label: 'Product', type: 'select', options: stockItemOptions, required: true },
      { key: 'locationId', label: 'Sold from', type: 'select', options: locationOptions, required: true },
      { key: 'quantity', label: 'Quantity', type: 'number', required: true },
      { key: 'unitPrice', label: 'Unit price', type: 'number', required: true },
      { key: 'date', label: 'Date', type: 'date', required: true },
    ],
  },
]

// ---- Commerce settings (sections 13-17) -----------------------------------------------------

export const deliverySections: Section[] = [
  {
    title: 'Options',
    fields: [
      { key: 'pickupAvailable', label: 'Pickup available', type: 'checkbox' },
      { key: 'deliveryAvailable', label: 'Delivery available', type: 'checkbox' },
      { key: 'shippingAvailable', label: 'Shipping (nationwide courier) available', type: 'checkbox' },
      { key: 'deliveryMethods', label: 'How you deliver', type: 'checkboxes', options: opt.DELIVERY_METHODS },
    ],
  },
  {
    title: 'Fees & limits',
    fields: [
      { key: 'deliveryFee', label: 'Standard delivery fee', type: 'number', hint: 'Used when no delivery zone matches.' },
      { key: 'freeDeliveryThreshold', label: 'Free delivery from order value', type: 'number' },
      { key: 'minimumOrderForDelivery', label: 'Minimum order for delivery', type: 'number' },
      { key: 'deliveryRadiusKm', label: 'Delivery radius (km)', type: 'number' },
      { key: 'estimatedDeliveryDays', label: 'Estimated delivery (days)', type: 'number' },
      { key: 'deliveryNotes', label: 'Notes', type: 'textarea' },
    ],
  },
]

// The area of a zone is picked with PlacePicker (see pages/business/DeliveryZoneForm.tsx)
export const deliveryZoneSections: Section[] = [
  {
    title: 'Fee',
    fields: [
      { key: 'deliveryFee', label: 'Delivery fee', type: 'number', required: true },
      { key: 'estimatedDays', label: 'Estimated days', type: 'number' },
    ],
  },
]
export const newDeliveryZoneValues = { country: 'Philippines', deliveryFee: 0 }

export const paymentMethodSections: Section[] = [
  {
    title: 'Payment method',
    hint: 'Account details are private. A buyer only sees them after you confirm their order.',
    fields: [
      { key: 'paymentType', label: 'Type', type: 'select', options: opt.PAYMENT_TYPES, required: true },
      { key: 'provider', label: 'Bank / provider', placeholder: 'e.g. BDO, GCash' },
      { key: 'accountName', label: 'Account name' },
      { key: 'accountNumber', label: 'Account number' },
      { key: 'instructions', label: 'Instructions', type: 'textarea' },
      { key: 'isActive', label: 'Active', type: 'checkbox' },
    ],
  },
]
export const newPaymentMethodValues = { paymentType: 'BANK_TRANSFER', isActive: true }

export const paymentTermsSections: Section[] = [
  {
    title: 'Payment terms',
    fields: [
      { key: 'paymentTerms', label: 'Terms you offer', type: 'checkboxes', options: opt.PAYMENT_TERMS },
      { key: 'creditLimit', label: 'Credit limit', type: 'number' },
      { key: 'creditDays', label: 'Credit days', type: 'number' },
      { key: 'downPaymentPercentage', label: 'Down payment (%)', type: 'number' },
      { key: 'notes', label: 'Notes', type: 'textarea' },
    ],
  },
]

export const returnPolicySections: Section[] = [
  {
    title: 'Returns & refunds',
    fields: [
      { key: 'returnAllowed', label: 'Returns accepted', type: 'checkbox' },
      { key: 'replacementAvailable', label: 'Replacements available', type: 'checkbox' },
      { key: 'returnPeriodDays', label: 'Return period (days)', type: 'number' },
      { key: 'refundMethod', label: 'Refund method', type: 'select', options: opt.REFUND_METHODS, emptyAsNull: true },
      { key: 'damagedGoodsPolicy', label: 'Damaged goods', type: 'textarea' },
      { key: 'defectiveGoodsPolicy', label: 'Defective goods', type: 'textarea' },
      { key: 'policyDescription', label: 'Full policy', type: 'textarea' },
    ],
  },
]

export const supplierProfileSections: Section[] = [
  {
    title: 'What you can do',
    hint: 'Buyers can search the directory by these, e.g. "suppliers with private label".',
    fields: opt.SUPPLIER_CAPABILITIES.map((c) => ({ key: c.value, label: c.label, type: 'checkbox' as const })),
  },
]
