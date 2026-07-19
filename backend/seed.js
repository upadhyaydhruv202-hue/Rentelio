/**
 * Production-scale Indian seed for Rentelio.
 * Compatible with existing Prisma schema only — no schema/API changes.
 *
 * Demo logins preserved:
 *   admin@rentelio.com / admin123
 *   vendor@rentelio.com / vendor123  (single vendor: Dev)
 *   customer@rentelio.com / customer123
 */
require('dotenv').config();
const bcrypt = require('bcryptjs');
const prisma = require('./config/prisma');
const { calcSecurityDeposit, calcPricePerHour } = require('./utils/pricing');

const FIRST = [
  'Aarav', 'Vivaan', 'Aditya', 'Rahul', 'Rohan', 'Pranav', 'Arjun', 'Karthik', 'Harsh', 'Yash',
  'Nikhil', 'Abhishek', 'Ananya', 'Diya', 'Sneha', 'Kavya', 'Priya', 'Aditi', 'Meera', 'Pooja',
  'Ishaan', 'Kabir', 'Reyansh', 'Shaurya', 'Atharv', 'Vihaan', 'Dhruv', 'Ayaan', 'Krishna', 'Sai',
  'Anika', 'Ira', 'Myra', 'Aisha', 'Riya', 'Sara', 'Nisha', 'Tanvi', 'Isha', 'Neha',
  'Varun', 'Siddharth', 'Manish', 'Deepak', 'Amit', 'Suresh', 'Rajesh', 'Vikram', 'Sanjay', 'Naveen',
];

const LAST = [
  'Sharma', 'Patel', 'Gupta', 'Singh', 'Verma', 'Reddy', 'Naidu', 'Rao', 'Kulkarni', 'Nair',
  'Joshi', 'Jain', 'Yadav', 'Mishra', 'Agarwal', 'Bansal', 'Saxena', 'Tripathi', 'Choudhary', 'Pandey',
  'Mehta', 'Desai', 'Iyer', 'Menon', 'Pillai', 'Chopra', 'Kapoor', 'Malhotra', 'Bhatt', 'Shetty',
];

const CITIES = [
  { city: 'Bengaluru', state: 'Karnataka', pin: '560001', areas: ['Indiranagar', 'Koramangala', 'HSR Layout', 'Whitefield', 'Jayanagar'] },
  { city: 'Mumbai', state: 'Maharashtra', pin: '400001', areas: ['Andheri', 'Bandra', 'Powai', 'Dadar', 'Thane'] },
  { city: 'Delhi', state: 'Delhi', pin: '110001', areas: ['Saket', 'Rohini', 'Dwarka', 'Karol Bagh', 'Lajpat Nagar'] },
  { city: 'Hyderabad', state: 'Telangana', pin: '500001', areas: ['Banjara Hills', 'Gachibowli', 'Madhapur', 'Secunderabad', 'Kukatpally'] },
  { city: 'Chennai', state: 'Tamil Nadu', pin: '600001', areas: ['T Nagar', 'Adyar', 'Anna Nagar', 'Velachery', 'OMR'] },
  { city: 'Pune', state: 'Maharashtra', pin: '411001', areas: ['Hinjewadi', 'Kothrud', 'Viman Nagar', 'Baner', 'Hadapsar'] },
  { city: 'Ahmedabad', state: 'Gujarat', pin: '380001', areas: ['Navrangpura', 'Satellite', 'Bopal', 'SG Highway', 'Maninagar'] },
  { city: 'Jaipur', state: 'Rajasthan', pin: '302001', areas: ['Malviya Nagar', 'C Scheme', 'Vaishali Nagar', 'Tonk Road', 'Mansarovar'] },
  { city: 'Kolkata', state: 'West Bengal', pin: '700001', areas: ['Salt Lake', 'Park Street', 'Howrah', 'New Town', 'Ballygunge'] },
  { city: 'Lucknow', state: 'Uttar Pradesh', pin: '226001', areas: ['Gomti Nagar', 'Hazratganj', 'Aliganj', 'Indira Nagar', 'Aminabad'] },
  { city: 'Surat', state: 'Gujarat', pin: '395001', areas: ['Adajan', 'Vesu', 'Katargam', 'Ring Road', 'Athwa'] },
  { city: 'Indore', state: 'Madhya Pradesh', pin: '452001', areas: ['Vijay Nagar', 'Palasia', 'Rajwada', 'Scheme 54', 'Bhawarkuan'] },
  { city: 'Nagpur', state: 'Maharashtra', pin: '440001', areas: ['Dharampeth', 'Sitabuldi', 'Wardha Road', 'Manish Nagar', 'Civil Lines'] },
  { city: 'Noida', state: 'Uttar Pradesh', pin: '201301', areas: ['Sector 18', 'Sector 62', 'Sector 137', 'Greater Noida', 'Sector 76'] },
  { city: 'Gurugram', state: 'Haryana', pin: '122001', areas: ['Cyber City', 'Sector 29', 'Sohna Road', 'DLF Phase 3', 'Golf Course Road'] },
  { city: 'Mysuru', state: 'Karnataka', pin: '570001', areas: ['Vijayanagar', 'Gokulam', 'Jayalakshmipuram', 'Nazarbad', 'Kuvempunagar'] },
  { city: 'Kochi', state: 'Kerala', pin: '682001', areas: ['Marine Drive', 'Kakkanad', 'Edappally', 'Fort Kochi', 'Vyttila'] },
  { city: 'Coimbatore', state: 'Tamil Nadu', pin: '641001', areas: ['RS Puram', 'Peelamedu', 'Saibaba Colony', 'Gandhipuram', 'Race Course'] },
  { city: 'Bhubaneswar', state: 'Odisha', pin: '751001', areas: ['Saheed Nagar', 'Patia', 'Chandrasekharpur', 'Unit 4', 'Infocity'] },
  { city: 'Visakhapatnam', state: 'Andhra Pradesh', pin: '530001', areas: ['MVP Colony', 'Madhurawada', 'Gajuwaka', 'Beach Road', 'Dwaraka Nagar'] },
];

const COMPANY_PREFIX = [
  'Elite', 'Urban', 'Prime', 'Sai', 'Royal', 'Metro', 'Smart', 'TechGear', 'Balaji', 'ProLens',
  'Rapid', 'City', 'RentKart', 'Aarohan', 'Nexus', 'Orbit', 'Vista', 'Summit', 'Horizon', 'Pulse',
  'Apex', 'Nova', 'Zenith', 'Trident', 'Cascade', 'Beacon', 'Forge', 'Lumen', 'Vertex', 'Crest',
];
const COMPANY_SUFFIX = [
  'Camera Rentals', 'Ride Rentals', 'Equipment Rentals', 'Tool House', 'Furniture Rentals',
  'Event Solutions', 'Rental Hub', 'Gear Rentals', 'Bike Rentals', 'Construction Tools',
  'AV Rentals', 'Studio Kits', 'Power Tools', 'Camping Outfitters', 'Medical Rentals',
  'Sports Gear', 'Music Rentals', 'Appliance Rentals', 'Office Solutions', 'Party Rentals',
];

/** Coherent brand+model pairs (never mix brands across products). */
const CATEGORIES = [
  {
    cat: 'Photography',
    products: [
      ['Canon', 'EOS R5 Mirrorless Body'], ['Sony', 'A7 IV Mirrorless Kit'], ['Nikon', 'Z6 II Mirrorless Body'],
      ['Fujifilm', 'X-T5 Camera Body'], ['Canon', 'RF 24-70mm Lens'], ['Sony', 'FE 85mm Prime Lens'],
      ['Godox', 'AD200 Pro Flash'], ['Manfrotto', 'Carbon Tripod'],
    ],
  },
  {
    cat: 'Electronics',
    products: [
      ['Apple', 'MacBook Pro 14" M3'], ['Dell', 'XPS 15 Laptop'], ['Lenovo', 'ThinkPad X1 Carbon'],
      ['Apple', 'iPad Pro 12.9"'], ['Samsung', 'Galaxy Tab S9'], ['OnePlus', '12 Smartphone'],
      ['Samsung', 'Galaxy Watch 6'], ['Apple', 'AirPods Max'],
    ],
  },
  {
    cat: 'Vehicles',
    products: [
      ['Honda', 'Activa 6G Scooter'], ['TVS', 'Jupiter 125 Scooter'], ['Bajaj', 'Pulsar NS200'],
      ['Yamaha', 'MT-15 V2'], ['Hero', 'Splendor Plus'], ['Suzuki', 'Access 125 Scooter'],
      ['TVS', 'Apache RTR 160'], ['Hero', 'Pleasure+ Scooter'],
    ],
  },
  {
    cat: 'Furniture',
    products: [
      ['IKEA', 'Kivik 3-Seater Sofa'], ['Godrej', 'Dining Table Set'], ['Nilkamal', 'ErgoMesh Office Chair'],
      ['Urban Ladder', 'Queen Bed'], ['Pepperfry', 'Solid Wood Wardrobe'], ['IKEA', 'Poäng Recliner'],
      ['Nilkamal', 'Study Desk'], ['Godrej', 'Bean Bag XL'],
    ],
  },
  {
    cat: 'Construction Equipment',
    products: [
      ['Bosch', 'GBH Rotary Hammer'], ['Hilti', 'TE 2 Rotary Hammer'], ['Makita', 'Electric Tile Cutter'],
      ['Stanley', 'Laser Level'], ['JCB', 'Concrete Mixer'], ['Honda', '5kVA Generator'],
      ['Bosch', 'Demolition Hammer'], ['Hilti', 'Scaffold Set'],
    ],
  },
  {
    cat: 'Power Tools',
    products: [
      ['Bosch', 'GSB Drill Kit'], ['Makita', '18V Impact Driver'], ['Dewalt', 'Circular Saw'],
      ['Black+Decker', 'Heat Gun'], ['Hitachi', 'Orbital Sander'], ['Bosch', 'Jigsaw'],
      ['Makita', 'Angle Grinder'], ['Dewalt', 'Multi-Tool'],
    ],
  },
  {
    cat: 'Camping Gear',
    products: [
      ['Quechua', '4-Person Dome Tent'], ['Coleman', 'LED Camping Lantern'], ['Decathlon', 'Camping Gas Stove'],
      ['Wildcraft', 'Folding Camp Cot'], ['Naturehike', 'Sleeping Bag'], ['Quechua', '60L Hiking Pack'],
      ['Coleman', 'Cooler Box'], ['Decathlon', 'Trekking Poles'],
    ],
  },
  {
    cat: 'Medical Equipment',
    products: [
      ['Omron', 'BP Monitor'], ['Philips', 'Oxygen Concentrator'], ['Dr Trust', 'Foldable Wheelchair'],
      ['BPL', 'Hospital Bed'], ['Morepen', 'Pulse Oximeter'], ['Philips', 'Nebulizer'],
      ['Omron', 'Glucometer Kit'], ['ResMed', 'CPAP Machine'],
    ],
  },
  {
    cat: 'Sports Equipment',
    products: [
      ['Yonex', 'Badminton Racket Pair'], ['Nivia', 'Football Size 5'], ['SG', 'Cricket Kit'],
      ['Cosco', 'Table Tennis Set'], ['Adidas', 'Yoga Mat Pro'], ['Nivia', 'Dumbbell Pair'],
      ['Cosco', 'Folding Treadmill'], ['Hercules', 'Cycle Trainer'],
    ],
  },
  {
    cat: 'Musical Instruments',
    products: [
      ['Yamaha', 'F310 Acoustic Guitar'], ['Casio', 'CT-X700 Keyboard'], ['Fender', 'Stratocaster Electric'],
      ['Kadence', 'Concert Ukulele'], ['Cort', 'AD810 Acoustic Guitar'], ['Yamaha', 'P-45 Digital Piano'],
      ['Kadence', 'Violin 4/4'], ['Pearl', 'Export Drum Kit'],
    ],
  },
  {
    cat: 'Home Appliances',
    products: [
      ['LG', '1.5 Ton Split AC'], ['Samsung', '253L Refrigerator'], ['IFB', 'Front Load Washer'],
      ['Voltas', 'Window AC 1 Ton'], ['Whirlpool', 'Microwave 25L'], ['LG', 'Air Purifier'],
      ['Kent', 'RO Water Purifier'], ['Samsung', 'Robot Vacuum'],
    ],
  },
  {
    cat: 'Kitchen Appliances',
    products: [
      ['Philips', 'Mixer Grinder 750W'], ['Prestige', 'Air Fryer 4.2L'], ['Bajaj', 'Induction Cooktop'],
      ['Morphy Richards', 'OTG Oven'], ['Philips', 'Coffee Maker'], ['Kent', 'Hand Blender'],
      ['Prestige', 'Rice Cooker'], ['Bajaj', 'Electric Kettle'],
    ],
  },
  {
    cat: 'Event Equipment',
    products: [
      ['JBL', 'PA Speaker Pair'], ['Shure', 'Wireless Mic Set'], ['Absen', 'Indoor LED Wall Panel'],
      ['Epson', 'Full HD Projector'], ['Chauvet', 'LED Stage Light Kit'], ['Antari', 'Fog Machine'],
      ['Global Truss', 'Aluminium Truss Stand'], ['Pioneer DJ', 'DDJ Controller'],
    ],
  },
  {
    cat: 'Office Equipment',
    products: [
      ['HP', 'LaserJet Pro Printer'], ['Canon', 'Document Scanner'], ['Logitech', 'Conference Cam'],
      ['Epson', 'Projector Screen'], ['Brother', 'Label Printer'], ['Fellowes', 'Paper Shredder'],
      ['Quartet', 'Whiteboard Kit'], ['Cisco', 'IP Desk Phone'],
    ],
  },
];

const CONDITIONS = ['Excellent', 'Good', 'Fair', 'Like New'];
const PRODUCT_STATUSES = ['Available', 'Available', 'Available', 'Rented', 'Reserved', 'Maintenance'];
const LANGUAGES = ['en', 'hi', 'gu', 'en', 'en'];
const PAY_NOTES = [
  'UPI · Google Pay', 'UPI · PhonePe', 'UPI · Paytm', 'BHIM UPI', 'Debit Card · HDFC',
  'Credit Card · SBI', 'Net Banking · ICICI', 'UPI · PhonePe', 'Google Pay', 'Paytm Wallet',
];
const REVIEW_COMMENTS = [
  'Smooth pickup and the gear was in excellent condition. Will rent again.',
  'Vendor was punctual. Deposit refund came within two days.',
  'Good value for weekend shoot. Minor scuff on the case but gear worked perfectly.',
  'Late return fee was fair. Overall a reliable rental experience.',
  'Product matched the listing. Support team resolved a scheduling clash quickly.',
  'Average experience — item was fine but pickup counter was crowded.',
  'Outstanding service from the Bengaluru hub. Highly recommended.',
  'Battery packs were fully charged. Documentation was clear and professional.',
  'Had a delay on return verification, but deposit was eventually settled.',
  'Perfect for my wedding event setup. Clean, tested, and ready to use.',
  'Not happy with the condition — expected better for the deposit amount.',
  'Five-star logistics. OTP pickup flow made handover simple.',
  'Decent for short-term use. Would prefer newer stock next time.',
  'Transparent pricing, no hidden charges. Trustworthy seller.',
  'Item underperformed compared to description. Rating reflects that.',
];
const NOTIF_TEMPLATES = [
  { title: 'Rental Confirmed', body: 'Your rental request has been confirmed. Check My Rentals for schedule details.', type: 'success' },
  { title: 'Pickup Scheduled', body: 'Pickup is scheduled. Please carry a valid ID and the OTP shared with you.', type: 'info' },
  { title: 'Return Reminder', body: 'Your return window opens tomorrow. Avoid late fees by returning on time.', type: 'warning' },
  { title: 'Deposit Refunded', body: 'Security deposit refund has been processed to your original payment method.', type: 'success' },
  { title: 'Payment Successful', body: 'Payment received successfully via UPI. Invoice is available in your account.', type: 'success' },
  { title: 'Account Verified', body: 'Your identity documents were verified. You can now rent premium inventory.', type: 'success' },
  { title: 'Maintenance Scheduled', body: 'An item on your wishlist is undergoing inspection and will be back soon.', type: 'info' },
  { title: 'System Announcement', body: 'Festive season surge pricing applies this week on cameras and event gear.', type: 'info' },
  { title: 'Overdue Notice', body: 'Your rental is overdue. Please return the item or contact support.', type: 'alert' },
  { title: 'Coupon Applied', body: 'Discount coupon was applied successfully on your latest booking.', type: 'success' },
];
const VENDOR_NOTIFS = [
  { title: 'New Rental Order', body: 'A customer requested one of your listed products. Review and approve.', type: 'order' },
  { title: 'Payout Settled', body: 'Weekly settlement has been credited to your registered bank account.', type: 'payout' },
  { title: 'KYC Update', body: 'Your business documents were reviewed. Check KYC status in Profile.', type: 'kyc' },
  { title: 'Low Stock Alert', body: 'One SKU is fully reserved this week. Consider adding quantity.', type: 'inventory' },
  { title: 'Customer Review', body: 'You received a new product review. Moderate it from Reports.', type: 'review' },
  { title: 'Pickup OTP Generated', body: 'Pickup OTP for an active order is ready for the customer.', type: 'ops' },
  { title: 'Return Completed', body: 'Return verification completed. Deposit workflow can proceed.', type: 'ops' },
  { title: 'Fraud Flag Cleared', body: 'A prior risk flag on your account was resolved by Super Admin.', type: 'security' },
];
const ACTIVITY_TYPES = [
  'audit.login', 'audit.setting', 'audit.export', 'support.ticket', 'support.reply',
  'maintenance.scheduled', 'maintenance.completed', 'rental.created', 'rental.completed',
  'deposit.refunded', 'vendor.approved', 'kyc.verified', 'payout.released', 'coupon.redeemed',
];
const FRAUD_TYPES = ['identity', 'payment', 'listing', 'abuse', 'kyc', 'chargeback'];
const TRACKER = [
  'Pickup Scheduled', 'Pickup Assigned', 'Out For Pickup', 'Picked Up',
  'Rental Active', 'Return Scheduled', 'Returned', 'Completed',
];

function pick(arr, i) {
  return arr[((i % arr.length) + arr.length) % arr.length];
}

function hashish(n) {
  let x = (n * 1103515245 + 12345) >>> 0;
  return x;
}

function money(min, max, i) {
  const span = max - min;
  const v = min + (hashish(i) % (Math.floor(span) + 1));
  return Math.round(v * 100) / 100;
}

function phone(i) {
  const base = 7000000000 + (hashish(i) % 2999999999);
  return `+91 ${String(base).slice(0, 5)} ${String(base).slice(5)}`;
}

function personName(i) {
  return `${pick(FIRST, i)} ${pick(LAST, Math.floor(i / FIRST.length) + i * 3)}`;
}

function emailFor(name, i, domain = 'mail.in') {
  const slug = name.toLowerCase().replace(/[^a-z]/g, '.').replace(/\.+/g, '.').replace(/^\.|\.$/g, '');
  return `${slug}.${i}@${domain}`;
}

function address(i) {
  const loc = pick(CITIES, i);
  const area = pick(loc.areas, i * 2);
  const streetNo = 10 + (hashish(i) % 190);
  const pin = String(Number(loc.pin) + (hashish(i) % 80)).padStart(6, '0');
  return `${streetNo}, ${area} Main Road, Near ${area} Metro, ${loc.city}, ${loc.state} ${pin}`;
}

function companyName(i) {
  return `${pick(COMPANY_PREFIX, i)} ${pick(COMPANY_SUFFIX, i * 5)}`;
}

function daysAgo(n) {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() - n);
  return d;
}

function addDays(date, n) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

function otp(i) {
  return String(100000 + (hashish(i) % 900000));
}

async function clearAll() {
  await prisma.depositEvent.deleteMany();
  await prisma.deposit.deleteMany();
  await prisma.rental.deleteMany();
  await prisma.cartItem.deleteMany();
  await prisma.wishlistItem.deleteMany();
  await prisma.walletTxn.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.vendorNotification.deleteMany();
  await prisma.vendorInvoice.deleteMany();
  await prisma.discountOffer.deleteMany();
  await prisma.review.deleteMany();
  await prisma.quotation.deleteMany();
  await prisma.activity.deleteMany();
  await prisma.advertisement.deleteMany();
  await prisma.fraudAlert.deleteMany();
  await prisma.settlement.deleteMany();
  await prisma.backupRecord.deleteMany();
  await prisma.coupon.deleteMany();
  await prisma.product.deleteMany();
  await prisma.vendor.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.user.deleteMany();
  await prisma.setting.deleteMany();
}

async function chunkedCreateMany(model, rows, size = 100) {
  for (let i = 0; i < rows.length; i += size) {
    await model.createMany({ data: rows.slice(i, i + size) });
  }
}

const seed = async () => {
  const started = Date.now();
  console.log('Seeding production-scale Indian data…');
  await prisma.$connect();
  await clearAll();

  const passwordHash = await bcrypt.hash('Rentelio@2024', 10);
  const adminHash = await bcrypt.hash('admin123', 10);
  const vendorHash = await bcrypt.hash('vendor123', 10);
  const customerHash = await bcrypt.hash('customer123', 10);

  await prisma.user.createMany({
    data: [
      { name: 'Super Admin', email: 'admin@rentelio.com', password: adminHash, role: 'admin' },
      { name: 'Ops Lead', email: 'ops.lead@rentelio.com', password: passwordHash, role: 'admin' },
      { name: 'Support Desk', email: 'support.desk@rentelio.com', password: passwordHash, role: 'user' },
    ],
  });

  await prisma.setting.create({
    data: {
      orgName: 'Rentelio',
      lateFeePerDay: 150,
      gracePeriodHours: 6,
      maxLateFeePercent: 100,
      depositType: 'multiplier',
      depositPercent: 0,
      commissionPercent: 12,
    },
  });

  // ——— Single vendor: Dev (owns every product on the platform) ———
  await prisma.vendor.create({
    data: {
      name: 'Dev',
      email: 'vendor@rentelio.com',
      password: vendorHash,
      phone: phone(50),
      company: 'Dev Rentals',
      ownerName: 'Dev',
      address: address(3),
      location: 'Bengaluru',
      status: 'Approved',
      verified: true,
      blacklisted: false,
      performance: 96,
      fraudScore: 4,
      kycStatus: 'Verified',
      aadhaarUrl: '/uploads/kyc/aadhaar-dev.pdf',
      panUrl: '/uploads/kyc/pan-dev.pdf',
      licenseUrl: '/uploads/kyc/license-dev.pdf',
      businessCertUrl: '/uploads/kyc/biz-dev.pdf',
      gstUrl: '/uploads/kyc/gst-dev.pdf',
      kycNotes: 'GST and PAN verified — sole platform vendor (Dev)',
      complaintsCount: 0,
      failedKycAttempts: 0,
      pendingPayout: money(12000, 85000, 1),
      paidOut: money(50000, 420000, 9),
      lateFeeMode: 'daily',
      lateFeeAmount: money(50, 400, 1),
      gracePeriodHours: 6,
      maxLateFeePercent: 100,
      createdAt: daysAgo(700),
    },
  });
  const vendors = await prisma.vendor.findMany({ orderBy: { id: 'asc' } });
  const vendorDev = vendors[0];
  console.log(`Vendors: ${vendors.length} (Dev only)`);

  // ——— Customers (200+) ———
  const customerRows = [];
  for (let i = 0; i < 200; i++) {
    const name = i === 0 ? 'Rahul Verma' : personName(i + 77);
    customerRows.push({
      name,
      email: i === 0 ? 'customer@rentelio.com' : emailFor(name, i, 'inbox.in'),
      password: i === 0 ? customerHash : passwordHash,
      phone: phone(i + 900),
      address: address(i + 40),
      profileImage: '',
      status: i === 0 ? 'Active' : i % 23 === 0 ? 'Suspended' : 'Active',
      verified: i === 0 || i % 5 !== 0,
      idDocumentUrl: i % 5 !== 0 ? `/uploads/ids/aadhaar-user-${i + 1}.pdf` : '',
      language: pick(LANGUAGES, i),
      walletBalance: money(0, 12000, i + 2),
      fraudScore: 3 + (hashish(i) % 55),
      complaintsCount: hashish(i) % 4,
      createdAt: daysAgo(650 - (i % 640)),
    });
  }
  await chunkedCreateMany(prisma.customer, customerRows, 50);
  const customers = await prisma.customer.findMany({ orderBy: { id: 'asc' } });
  console.log(`Customers: ${customers.length}`);

  // ——— Products (250+) — all catalog items belong to vendor Dev ———
  const productRows = [];
  let pIdx = 0;
  while (productRows.length < 250) {
    const group = pick(CATEGORIES, pIdx);
    const [brand, item] = pick(group.products, pIdx);
    const vendor = vendorDev;
    const price = money(199, 8999, pIdx + 17);
    const sku = `REN-${group.cat.slice(0, 3).toUpperCase()}-${String(pIdx + 1).padStart(4, '0')}`;
    const qty = 1 + (hashish(pIdx) % 8);
    const status = pick(PRODUCT_STATUSES, pIdx);
    const maint = status === 'Maintenance' || pIdx % 19 === 0;
    productRows.push({
      name: `${brand} ${item}`,
      category: group.cat,
      quantity: qty,
      pricePerDay: price,
      pricePerHour: calcPricePerHour(price),
      status: maint ? 'Maintenance' : status,
      description: `${brand} ${item} available for rent across India. Includes basic accessories and condition report. SKU ${sku}. Listed by Dev.`,
      image: `/uploads/products/seed-${(pIdx % 10) + 1}.jpg`,
      securityDeposit: calcSecurityDeposit(price),
      brand,
      color: pick(['Black', 'Silver', 'Grey', 'White', 'Blue', 'Red'], pIdx),
      size: pick(['Standard', 'Compact', 'Pro', 'XL', 'Kit'], pIdx),
      storage: group.cat === 'Electronics' ? pick(['128GB', '256GB', '512GB', '1TB'], pIdx) : '',
      edition: pick(['2023', '2024', '2025', 'Standard', 'Pro'], pIdx),
      condition: pick(CONDITIONS, pIdx),
      warranty: pick(['Vendor covered 30 days', 'OEM 6 months left', 'No warranty'], pIdx),
      material: pick(['Metal', 'Alloy', 'ABS', 'Fabric', 'Wood', 'Composite'], pIdx),
      archived: pIdx % 41 === 0,
      maintenanceStatus: maint ? pick(['Scheduled', 'In Progress', 'Parts Pending'], pIdx) : 'None',
      maintenanceNote: maint ? 'Routine inspection and calibration before next booking window.' : '',
      reservedQty: status === 'Reserved' ? Math.min(qty, 1 + (pIdx % 2)) : 0,
      nextInspectionAt: maint ? addDays(new Date(), 3 + (pIdx % 14)) : addDays(new Date(), 20 + (pIdx % 40)),
      vendorId: vendor.id,
      createdAt: daysAgo(600 - (pIdx % 580)),
    });
    pIdx += 1;
  }
  await chunkedCreateMany(prisma.product, productRows, 40);
  const products = await prisma.product.findMany({ orderBy: { id: 'asc' } });
  console.log(`Products: ${products.length}`);

  // ——— Rentals (~700) for requests / active / completed / overdue / cancelled ———
  const rentalRows = [];
  const pushRental = (cfg) => {
    const customer = customers[cfg.ci % customers.length];
    const product = products[cfg.pi % products.length];
    const start = daysAgo(cfg.startAgo);
    const days = cfg.days;
    const ret = addDays(start, days);
    const amount = Math.round(Number(product.pricePerDay) * days * 100) / 100;
    const late = cfg.lateFee || 0;
    rentalRows.push({
      customerName: customer.name,
      customerId: customer.id,
      productId: product.id,
      startDate: start,
      returnDate: ret,
      billingUnit: 'daily',
      durationUnits: days,
      amount,
      lateFee: late,
      damageCharge: cfg.damage || 0,
      discountAmount: cfg.discount || 0,
      couponCode: cfg.coupon || '',
      status: cfg.status,
      fulfillment: cfg.fulfillment || (cfg.i % 4 === 0 ? 'delivery' : 'pickup'),
      shippingAddress: cfg.i % 4 === 0 ? customer.address : '',
      pickupStatus: cfg.pickupStatus,
      returnStatus: cfg.returnStatus,
      trackerStage: cfg.tracker,
      pickupOtp: otp(cfg.i + 11),
      returnOtp: otp(cfg.i + 77),
      scheduledPickup: addDays(start, -1),
      scheduledReturn: ret,
      pickupAt: cfg.picked ? addDays(start, 0) : null,
      returnedAt: cfg.returned ? addDays(ret, cfg.returnLag || 0) : null,
      rating: cfg.rating || null,
      review: cfg.review || '',
      damageReport: cfg.damageReport || '',
      createdAt: daysAgo(cfg.startAgo + 2),
    });
  };

  // 200 Requested
  for (let i = 0; i < 200; i++) {
    pushRental({
      i,
      ci: i,
      pi: i * 2,
      startAgo: -(2 + (i % 20)),
      days: 2 + (i % 10),
      status: 'Requested',
      pickupStatus: 'Scheduled',
      returnStatus: 'Pending',
      tracker: 'Pickup Scheduled',
      picked: false,
      returned: false,
    });
  }
  // 200 Active
  for (let i = 0; i < 200; i++) {
    pushRental({
      i: 200 + i,
      ci: i + 3,
      pi: i * 3 + 1,
      startAgo: 1 + (i % 12),
      days: 5 + (i % 14),
      status: 'Active',
      pickupStatus: 'Picked Up',
      returnStatus: 'Pending',
      tracker: 'Rental Active',
      picked: true,
      returned: false,
      coupon: i % 7 === 0 ? `SAVE${10 + (i % 20)}` : '',
      discount: i % 7 === 0 ? money(50, 800, i) : 0,
    });
  }
  // 200 Completed
  for (let i = 0; i < 200; i++) {
    pushRental({
      i: 400 + i,
      ci: i + 5,
      pi: i * 2 + 7,
      startAgo: 30 + (i % 500),
      days: 3 + (i % 12),
      status: 'Completed',
      pickupStatus: 'Picked Up',
      returnStatus: 'Returned',
      tracker: 'Completed',
      picked: true,
      returned: true,
      rating: 1 + (i % 5),
      review: pick(REVIEW_COMMENTS, i),
      coupon: i % 5 === 0 ? `FEST${i % 40}` : '',
      discount: i % 5 === 0 ? money(40, 600, i + 4) : 0,
    });
  }
  // 80 Overdue
  for (let i = 0; i < 80; i++) {
    pushRental({
      i: 600 + i,
      ci: i + 9,
      pi: i * 4,
      startAgo: 20 + (i % 40),
      days: 4,
      status: 'Overdue',
      pickupStatus: 'Picked Up',
      returnStatus: 'Pending',
      tracker: 'Rental Active',
      picked: true,
      returned: false,
      lateFee: money(150, 2500, i),
    });
  }
  // 60 Cancelled + 40 Return Pending
  for (let i = 0; i < 60; i++) {
    pushRental({
      i: 680 + i,
      ci: i + 12,
      pi: i * 5 + 2,
      startAgo: 10 + (i % 90),
      days: 3,
      status: 'Cancelled',
      pickupStatus: 'Cancelled',
      returnStatus: 'N/A',
      tracker: 'Pickup Scheduled',
      picked: false,
      returned: false,
    });
  }
  for (let i = 0; i < 40; i++) {
    pushRental({
      i: 740 + i,
      ci: i + 15,
      pi: i * 6 + 3,
      startAgo: 8 + (i % 15),
      days: 5,
      status: 'Return Pending',
      pickupStatus: 'Picked Up',
      returnStatus: 'Pending Verification',
      tracker: 'Return Scheduled',
      picked: true,
      returned: false,
      damage: i % 4 === 0 ? money(200, 1500, i) : 0,
      damageReport: i % 4 === 0 ? 'Minor cosmetic wear noted at return desk.' : '',
    });
  }

  // ——— Vendor Dev dense pickup / return / money workflow data ———
  // All products belong to Dev; pickup/return dates fall inside week/month filters.
  for (let i = 0; i < 18; i++) {
    // Future pickups within the next 6 days
    pushRental({
      i: 900 + i,
      ci: i + 20,
      pi: i % 40,
      startAgo: -(1 + (i % 6)),
      days: 3 + (i % 6),
      status: 'Requested',
      pickupStatus: 'Scheduled',
      returnStatus: 'Pending',
      tracker: pick(['Pickup Scheduled', 'Pickup Assigned', 'Out For Pickup'], i),
      picked: false,
      returned: false,
    });
  }
  for (let i = 0; i < 16; i++) {
    // Active rentals with return due within the next week
    pushRental({
      i: 920 + i,
      ci: i + 25,
      pi: (i + 5) % 40,
      startAgo: 2 + (i % 3),
      days: 4 + (i % 5),
      status: 'Active',
      pickupStatus: 'Picked Up',
      returnStatus: 'Pending',
      tracker: 'Rental Active',
      picked: true,
      returned: false,
    });
  }
  for (let i = 0; i < 12; i++) {
    // Returns due today through next few days
    pushRental({
      i: 940 + i,
      ci: i + 30,
      pi: (i + 12) % 40,
      startAgo: 3 + (i % 3),
      days: 4 + (i % 4),
      status: 'Return Pending',
      pickupStatus: 'Picked Up',
      returnStatus: 'Pending Verification',
      tracker: pick(['Return Scheduled', 'Returned', 'Inspection'], i),
      picked: true,
      returned: false,
      damage: i % 3 === 0 ? money(150, 1200, i + 3) : 0,
      damageReport: i % 3 === 0 ? 'Scratches on body noted during return check.' : '',
    });
  }
  for (let i = 0; i < 10; i++) {
    pushRental({
      i: 960 + i,
      ci: i + 35,
      pi: (i + 20) % 40,
      startAgo: 25 + (i % 40),
      days: 3 + (i % 5),
      status: 'Completed',
      pickupStatus: 'Picked Up',
      returnStatus: 'Returned',
      tracker: 'Completed',
      picked: true,
      returned: true,
      rating: 3 + (i % 3),
      review: pick(REVIEW_COMMENTS, i + 8),
    });
  }
  for (let i = 0; i < 6; i++) {
    pushRental({
      i: 980 + i,
      ci: i + 40,
      pi: (i + 28) % 40,
      startAgo: 10 + (i % 4),
      days: 3 + (i % 3),
      status: 'Overdue',
      pickupStatus: 'Picked Up',
      returnStatus: 'Pending',
      tracker: 'Rental Active',
      picked: true,
      returned: false,
      lateFee: money(200, 1800, i + 5),
    });
  }

  await chunkedCreateMany(prisma.rental, rentalRows, 50);
  const rentals = await prisma.rental.findMany({ orderBy: { id: 'asc' } });
  console.log(`Rentals: ${rentals.length}`);

  // ——— Deposits (200+) + events ———
  const depositCandidates = rentals.filter((r) =>
    ['Active', 'Completed', 'Overdue', 'Return Pending'].includes(r.status)
  );
  const depositRows = depositCandidates.slice(0, Math.max(220, Math.min(depositCandidates.length, 420))).map((r, i) => {
    const product = products.find((p) => p.id === r.productId);
    const amount = Number(product?.securityDeposit || calcSecurityDeposit(r.amount / 3));
    let status = 'Held';
    let refunded = 0;
    let lateDed = 0;
    if (r.status === 'Completed') {
      status = i % 5 === 0 ? 'Partially Refunded' : 'Refunded';
      lateDed = Number(r.lateFee) || 0;
      refunded = Math.max(0, amount - lateDed - Number(r.damageCharge || 0));
    } else if (r.status === 'Overdue') {
      status = 'Held';
      lateDed = Number(r.lateFee) || 0;
    } else if (r.status === 'Return Pending') {
      status = 'Pending Refund';
    }
    return {
      rentalId: r.id,
      amount,
      refundedAmount: refunded,
      lateFeeDeducted: lateDed,
      status,
      createdAt: r.createdAt,
    };
  });
  await chunkedCreateMany(prisma.deposit, depositRows, 50);
  const deposits = await prisma.deposit.findMany({ orderBy: { id: 'asc' } });
  console.log(`Deposits: ${deposits.length}`);

  const eventRows = [];
  deposits.forEach((d, i) => {
    eventRows.push({
      depositId: d.id,
      type: 'held',
      amount: d.amount,
      note: pick(PAY_NOTES, i),
      createdAt: d.createdAt,
    });
    if (Number(d.refundedAmount) > 0) {
      eventRows.push({
        depositId: d.id,
        type: 'refunded',
        amount: d.refundedAmount,
        note: 'Refund via original UPI / card rail',
        createdAt: addDays(d.createdAt, 8 + (i % 10)),
      });
    }
    if (Number(d.lateFeeDeducted) > 0) {
      eventRows.push({
        depositId: d.id,
        type: 'late_fee',
        amount: d.lateFeeDeducted,
        note: 'Late fee deducted from security deposit',
        createdAt: addDays(d.createdAt, 6),
      });
    }
  });
  await chunkedCreateMany(prisma.depositEvent, eventRows, 80);
  console.log(`Deposit events: ${eventRows.length}`);

  // ——— Reviews (200+) ———
  const completed = rentals.filter((r) => r.status === 'Completed');
  const reviewRows = [];
  for (let i = 0; i < 200; i++) {
    const r = completed[i % completed.length];
    reviewRows.push({
      customerId: r.customerId,
      productId: r.productId,
      rentalId: r.id,
      rating: 1 + (i % 5),
      comment: pick(REVIEW_COMMENTS, i + 3),
      status: i % 8 === 0 ? 'Pending' : 'Approved',
      reported: i % 37 === 0,
      createdAt: addDays(r.returnDate, 1 + (i % 5)),
    });
  }
  await chunkedCreateMany(prisma.review, reviewRows, 50);
  console.log(`Reviews: ${reviewRows.length}`);

  // ——— Notifications (220 customer + 220 vendor) ———
  const notifRows = [];
  for (let i = 0; i < 220; i++) {
    const t = pick(NOTIF_TEMPLATES, i);
    notifRows.push({
      customerId: customers[i % customers.length].id,
      title: t.title,
      body: `${t.body} Ref #RN${10000 + i}`,
      type: t.type,
      audience: 'user',
      priority: i % 9 === 0 ? 'High' : 'Normal',
      channel: pick(['website', 'email', 'sms', 'push'], i),
      read: i % 3 !== 0,
      createdAt: daysAgo(i % 400),
    });
  }
  // broadcast-style
  for (let i = 0; i < 30; i++) {
    const t = pick(NOTIF_TEMPLATES, i + 2);
    notifRows.push({
      customerId: null,
      title: t.title,
      body: t.body,
      type: t.type,
      audience: 'all',
      priority: 'Normal',
      channel: 'website',
      read: false,
      createdAt: daysAgo(20 + i),
    });
  }
  await chunkedCreateMany(prisma.notification, notifRows, 50);
  console.log(`Notifications: ${notifRows.length}`);

  const vNotifRows = [];
  for (let i = 0; i < 220; i++) {
    const t = pick(VENDOR_NOTIFS, i);
    vNotifRows.push({
      vendorId: vendorDev.id,
      title: t.title,
      body: `${t.body} Ticket VR-${2000 + i}`,
      type: t.type,
      read: i % 4 === 0,
      createdAt: daysAgo(i % 350),
    });
  }
  await chunkedCreateMany(prisma.vendorNotification, vNotifRows, 50);
  console.log(`Vendor notifications: ${vNotifRows.length}`);

  // ——— Wishlist (200 unique pairs) ———
  const wishRows = [];
  const wishKeys = new Set();
  let w = 0;
  while (wishRows.length < 200 && w < 5000) {
    const ci = customers[w % customers.length].id;
    const pi = products[(w * 7) % products.length].id;
    const key = `${ci}:${pi}`;
    if (!wishKeys.has(key)) {
      wishKeys.add(key);
      wishRows.push({ customerId: ci, productId: pi, createdAt: daysAgo(w % 200) });
    }
    w += 1;
  }
  await chunkedCreateMany(prisma.wishlistItem, wishRows, 50);
  console.log(`Wishlist: ${wishRows.length}`);

  // ——— Cart (80 unique pairs) ———
  const cartRows = [];
  const cartKeys = new Set();
  for (let i = 0; cartRows.length < 80 && i < 2000; i++) {
    const ci = customers[i % 40].id;
    const pi = products[(i * 11 + 3) % products.length].id;
    const key = `${ci}:${pi}`;
    if (cartKeys.has(key)) continue;
    cartKeys.add(key);
    cartRows.push({
      customerId: ci,
      productId: pi,
      startDate: addDays(new Date(), 1 + (i % 7)),
      returnDate: addDays(new Date(), 4 + (i % 10)),
      createdAt: daysAgo(i % 30),
    });
  }
  await chunkedCreateMany(prisma.cartItem, cartRows, 40);
  console.log(`Cart items: ${cartRows.length}`);

  // ——— Wallet txns as payment records (220+) ———
  const walletRows = [];
  for (let i = 0; i < 220; i++) {
    const c = customers[i % customers.length];
    const amt = money(100, 15000, i + 8);
    const type = pick(['credit', 'debit', 'refund', 'rental_payment', 'deposit_hold'], i);
    walletRows.push({
      customerId: c.id,
      type,
      amount: amt,
      balanceAfter: money(0, 20000, i + 1),
      note: `${pick(PAY_NOTES, i)} · ${type.replace('_', ' ')} · TXN${900000 + i}`,
      createdAt: daysAgo(i % 520),
    });
  }
  await chunkedCreateMany(prisma.walletTxn, walletRows, 50);
  console.log(`Wallet/payment txns: ${walletRows.length}`);

  // ——— Coupons (demo codes + vendor catalog) ———
  const couponRows = [
    {
      code: 'DEV15',
      type: 'percent',
      value: 15,
      label: 'Dev 15% off',
      description: '15% off rental cost for Dev catalog',
      minAmount: 0,
      maxUsage: 0,
      usedCount: 0,
      active: true,
      vendorId: vendorDev.id,
      expiresAt: addDays(new Date(), 365),
      createdAt: daysAgo(10),
    },
    {
      code: 'SAVE100',
      type: 'flat',
      value: 100,
      label: 'Flat ₹100 off',
      description: '₹100 off when rental is at least ₹500',
      minAmount: 500,
      maxUsage: 0,
      usedCount: 0,
      active: true,
      vendorId: vendorDev.id,
      expiresAt: addDays(new Date(), 365),
      createdAt: daysAgo(8),
    },
    {
      code: 'WEEKEND20',
      type: 'percent',
      value: 20,
      label: 'Weekend 20%',
      description: 'Platform weekend promo — 20% off',
      minAmount: 1000,
      maxUsage: 500,
      usedCount: 12,
      active: true,
      vendorId: null,
      expiresAt: addDays(new Date(), 90),
      createdAt: daysAgo(20),
    },
  ];
  for (let i = 0; i < 40; i++) {
    couponRows.push({
      code: `INDIA${100 + i}`,
      type: i % 3 === 0 ? 'flat' : 'percent',
      value: i % 3 === 0 ? money(50, 500, i) : 5 + (i % 25),
      label: pick(['Festive', 'Weekend', 'Student', 'First Booking', 'Loyalty'], i),
      description: 'Pan-India rental discount for eligible bookings',
      minAmount: money(500, 3000, i),
      maxUsage: 50 + (i % 100),
      usedCount: Math.min(5 + (hashish(i) % 20), 40),
      active: i % 11 !== 0,
      vendorId: i % 4 === 0 ? null : vendorDev.id,
      expiresAt: addDays(new Date(), 20 + (i % 120)),
      createdAt: daysAgo(100 + (i % 200)),
    });
  }
  await chunkedCreateMany(prisma.coupon, couponRows, 40);
  console.log(`Coupons: ${couponRows.length} (demo: DEV15, SAVE100, WEEKEND20)`);

  // ——— Discount offers ———
  const discountRows = [];
  for (let i = 0; i < 120; i++) {
    discountRows.push({
      vendorId: vendorDev.id,
      name: `${pick(['Student', 'Corporate', 'Festival', 'Flash', 'Weekend'], i)} Offer ${i + 1}`,
      discountType: pick(['Student Discount', 'Corporate Discount', 'Festival Offers', 'Flash Sale', 'Weekend Offers'], i),
      type: i % 2 === 0 ? 'percent' : 'flat',
      value: i % 2 === 0 ? 5 + (i % 30) : money(75, 900, i),
      description: 'Limited-period storefront promotion for Indian customers',
      active: i % 9 !== 0,
      startsAt: daysAgo(40 + (i % 30)),
      endsAt: addDays(new Date(), 10 + (i % 60)),
      createdAt: daysAgo(50 + (i % 40)),
    });
  }
  await chunkedCreateMany(prisma.discountOffer, discountRows, 40);
  console.log(`Discounts: ${discountRows.length}`);

  // ——— Settlements (200+) ———
  const settlementRows = [];
  for (let i = 0; i < 200; i++) {
    const vendor = vendorDev;
    const rental = rentals[(i * 3) % rentals.length];
    const rentalAmount = money(800, 45000, i + 6);
    const commission = Math.round(rentalAmount * 0.12 * 100) / 100;
    const tax = Math.round(rentalAmount * 0.02 * 100) / 100;
    const vendorAmount = Math.round((rentalAmount - commission - tax) * 100) / 100;
    const status = pick(['Pending', 'Processing', 'Paid', 'Paid', 'Paid', 'On Hold'], i);
    settlementRows.push({
      vendorId: vendor.id,
      rentalId: rental.id,
      settlementNo: `STL-2025-${String(i + 1).padStart(4, '0')}`,
      rentalAmount,
      commission,
      taxDeduction: tax,
      vendorAmount,
      status,
      paidAt: status === 'Paid' ? daysAgo(i % 180) : null,
      note: status === 'Paid' ? 'NEFT payout to vendor settlement account' : 'Awaiting finance cycle',
      createdAt: daysAgo(10 + (i % 400)),
    });
  }
  await chunkedCreateMany(prisma.settlement, settlementRows, 50);
  console.log(`Settlements: ${settlementRows.length}`);

  // ——— Vendor invoices (200+) + extra Dev invoices for Money Workflow ———
  const invoiceRows = [];
  for (let i = 0; i < 200; i++) {
    const vendor = vendorDev;
    const rental = rentals[(i * 5) % rentals.length];
    invoiceRows.push({
      vendorId: vendor.id,
      rentalId: rental.id,
      invoiceNo: `INV-RH-${2024000 + i}`,
      type: pick(['rental', 'late_fee', 'damage', 'deposit'], i),
      amount: money(300, 28000, i + 12),
      details: `${pick(PAY_NOTES, i)} · Generated for rental cycle`,
      createdAt: daysAgo(i % 360),
    });
  }
  const demoVendorRentals = rentals.filter((r) => {
    const product = products.find((p) => p.id === r.productId);
    return product && product.vendorId === vendorDev.id;
  });
  for (let i = 0; i < 28; i++) {
    const rental = demoVendorRentals[i % Math.max(demoVendorRentals.length, 1)] || rentals[i % rentals.length];
    invoiceRows.push({
      vendorId: vendorDev.id,
      rentalId: rental.id,
      invoiceNo: `INV-DEV-${2025000 + i}`,
      type: pick(['rental', 'late_fee', 'damage', 'deposit'], i + 3),
      amount: money(450, 32000, i + 44),
      details: `${pick(PAY_NOTES, i + 7)} · Dev Rentals invoice`,
      createdAt: daysAgo(i % 90),
    });
  }
  await chunkedCreateMany(prisma.vendorInvoice, invoiceRows, 50);
  console.log(`Invoices: ${invoiceRows.length}`);

  // ——— Activities = audit + support + maintenance (220+) ———
  const activityRows = [];
  for (let i = 0; i < 220; i++) {
    const type = pick(ACTIVITY_TYPES, i);
    activityRows.push({
      type,
      message:
        type.startsWith('support')
          ? `Support ticket ST-${1000 + i}: ${pick(['Pickup delay', 'Deposit query', 'Damaged item claim', 'OTP not received', 'Invoice correction'], i)}`
          : type.startsWith('maintenance')
            ? `Maintenance log ML-${1000 + i} for inventory unit`
            : type.startsWith('audit')
              ? `Audit trail AT-${1000 + i}: ${type}`
              : `Platform event ${type} #${i + 1}`,
      meta: JSON.stringify({
        actor: pick(['super_admin', 'vendor', 'customer', 'system'], i),
        city: pick(CITIES, i).city,
        ref: `EVT-${i + 1}`,
      }),
      vendorId: i % 2 === 0 ? vendorDev.id : null,
      createdAt: daysAgo(i % 500),
    });
  }
  await chunkedCreateMany(prisma.activity, activityRows, 50);
  console.log(`Activities/audit/support: ${activityRows.length}`);

  // ——— Quotations (120) ———
  const quoteRows = [];
  for (let i = 0; i < 120; i++) {
    const c = customers[i % customers.length];
    const p = products[i % products.length];
    quoteRows.push({
      customerId: c.id,
      productId: p.id,
      customerName: c.name,
      productName: p.name,
      days: 2 + (i % 14),
      offeredAmount: money(500, 20000, i),
      counterAmount: i % 3 === 0 ? money(400, 18000, i + 1) : null,
      status: pick(['Requested', 'Countered', 'Approved', 'Rejected', 'Expired'], i),
      notes: 'Negotiated rental quote for multi-day booking',
      history: 'Requested → Vendor review',
      createdAt: daysAgo(i % 200),
    });
  }
  await chunkedCreateMany(prisma.quotation, quoteRows, 40);
  console.log(`Quotations: ${quoteRows.length}`);

  // ——— Fraud alerts (100+) ———
  const fraudRows = [];
  for (let i = 0; i < 100; i++) {
    fraudRows.push({
      severity: pick(['low', 'medium', 'high', 'critical'], i),
      title: pick([
        'Unusual booking velocity',
        'KYC document mismatch',
        'High-risk payout request',
        'Duplicate identity signal',
        'Chargeback pattern',
        'Suspicious listing price',
      ], i),
      detail: `Automated risk engine flagged entity in ${pick(CITIES, i).city}. Score recalculated after behavioural signals.`,
      fraudType: pick(FRAUD_TYPES, i),
      entityType: i % 2 === 0 ? 'vendor' : 'customer',
      entityId: i % 2 === 0 ? vendorDev.id : customers[i % customers.length].id,
      riskScore: 20 + (hashish(i) % 75),
      actionTaken: i % 3 === 0 ? 'Monitoring' : i % 3 === 1 ? 'Under review' : 'Resolved with note',
      resolved: i % 4 === 0,
      createdAt: daysAgo(i % 300),
    });
  }
  await chunkedCreateMany(prisma.fraudAlert, fraudRows, 40);
  console.log(`Fraud alerts: ${fraudRows.length}`);

  // ——— Ads + backups ———
  const adRows = [];
  for (let i = 0; i < 24; i++) {
    adRows.push({
      title: pick(['Monsoon Camera Fest', 'Office Furniture Month', 'EV Scooter Week', 'Wedding AV Packs'], i),
      body: 'Pan-India rental deals with verified vendors on Rentelio.',
      imageUrl: `/uploads/ads/banner-${(i % 6) + 1}.jpg`,
      linkUrl: '/user/browse',
      placement: pick(['home', 'browse', 'checkout', 'wallet'], i),
      active: i % 5 !== 0,
      startsAt: daysAgo(30),
      endsAt: addDays(new Date(), 45),
      createdAt: daysAgo(40 + i),
    });
  }
  await prisma.advertisement.createMany({ data: adRows });

  const backupRows = [];
  for (let i = 0; i < 40; i++) {
    backupRows.push({
      filename: `rentelio-backup-2025-${String(i + 1).padStart(2, '0')}.sql`,
      sizeBytes: 5_000_000 + hashish(i) % 40_000_000,
      note: pick(['Nightly automated snapshot', 'Pre-settlement checkpoint', 'Manual admin backup'], i),
      backupType: i % 3 === 0 ? 'manual' : 'scheduled',
      createdBy: pick(['system', 'admin@rentelio.com', 'ops.lead@rentelio.com'], i),
      createdAt: daysAgo(i * 3),
    });
  }
  await prisma.backupRecord.createMany({ data: backupRows });
  console.log(`Ads: ${adRows.length}, Backups: ${backupRows.length}`);

  const elapsed = ((Date.now() - started) / 1000).toFixed(1);
  console.log('\n✅ Production seed complete in', elapsed, 's');
  console.log('Demo logins:');
  console.log('  Super Admin: admin@rentelio.com / admin123');
  console.log('  Vendor:      vendor@rentelio.com / vendor123  (Dev)');
  console.log('  Customer:    customer@rentelio.com / customer123');
  console.log('\nFixing product catalog + images…');
  const { spawnSync } = require('child_process');
  spawnSync('node', ['fix-product-catalog.js'], { stdio: 'inherit', cwd: __dirname });
  spawnSync('node', ['fix-images-verified.js'], { stdio: 'inherit', cwd: __dirname });
};

seed()
  .catch((err) => {
    console.error('Seed failed:', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
