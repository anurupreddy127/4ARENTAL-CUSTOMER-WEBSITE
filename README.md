# 4A Rentals - Premium Car Rental Service

A modern, full-featured car rental application built with React, TypeScript, and Tailwind CSS. This application provides a complete car rental experience with user authentication, vehicle browsing, booking system, and admin management using local storage.

## 🚀 Features

- **User Authentication**: Secure login/registration system with Supabase Auth
- **Vehicle Catalog**: Browse vehicles by category (Economy, SUV, Luxury)
- **Smart Search**: Date-based availability checking
- **Booking System**: Complete reservation workflow with customer information
- **Admin Portal**: Manage vehicles, bookings, and special offers
- **Responsive Design**: Works perfectly on desktop and mobile
- **Real-time Updates**: Live availability status based on bookings
- **Database Integration**: PostgreSQL database with Supabase backend

## 🛠️ Tech Stack

- **Frontend**: React 18, TypeScript, Tailwind CSS
- **Backend**: Supabase (PostgreSQL database, Authentication, Real-time)
- **Database**: PostgreSQL with Row Level Security (RLS)
- **Authentication**: Supabase Auth with JWT tokens
- **Icons**: Lucide React
- **Routing**: React Router DOM
- **Build Tool**: Vite
- **Deployment**: Netlify ready with Supabase integration

## 📋 Prerequisites

Before you begin, ensure you have the following installed:
- **Node.js** (version 18 or higher)
- **npm** (comes with Node.js)
- **Git** (for cloning the repository)

## 🔧 Installation & Setup

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/4a-rentals.git
cd 4a-rentals
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Start Development Server

Before starting the development server, ensure your Supabase project is properly configured with the required database tables and RLS policies.

```bash
npm run dev
```

The application will be available at `http://localhost:5173`

## 📁 Project Structure

```
src/
├── components/              # Reusable UI components
│   ├── layout/             # Layout components
│   │   ├── Navbar.tsx      # Navigation component
│   │   ├── Footer.tsx      # Footer component
│   │   ├── Hero.tsx        # Hero section
│   │   └── index.ts        # Barrel exports
│   ├── modals/             # Modal components
│   │   ├── AuthModal.tsx   # Login/Register modal
│   │   ├── BookingModal.tsx # Vehicle booking form
│   │   ├── UserProfileModal.tsx # User profile display
│   │   ├── VehicleDetailsModal.tsx # Vehicle details popup
│   │   └── index.ts        # Barrel exports
│   ├── features/           # Feature-specific components
│   │   ├── vehicles/       # Vehicle-related components
│   │   │   ├── VehicleGrid.tsx # Vehicle display grid
│   │   │   └── index.ts    # Barrel exports
│   │   ├── offers/         # Offers components
│   │   │   ├── Offers.tsx  # Special offers section
│   │   │   └── index.ts    # Barrel exports
│   │   └── testimonials/   # Testimonial components
│   │       ├── Testimonials.tsx # Customer testimonials
│   │       └── index.ts    # Barrel exports
│   └── ui/                 # Reusable UI elements
│       ├── Loader.tsx      # Loading spinner
│       └── index.ts        # Barrel exports
│
├── pages/                  # Main page components
│   ├── Home.tsx           # Landing page
│   ├── Fleet.tsx          # Vehicle fleet page
│   ├── Contact.tsx        # Contact page
│   ├── VehicleDetails.tsx # Individual vehicle page
│   ├── MyBookings.tsx     # User bookings page
│   └── PrivacyPolicy.tsx  # Privacy policy page
│
├── context/               # React context providers
│   └── AuthContext.tsx    # Authentication state management
│
├── hooks/                 # Custom React hooks
│   ├── useVehicles.ts     # Vehicle data management
│   ├── useOffers.ts       # Offers data management
│   └── useBookings.ts     # Bookings data management
│
├── services/              # Data service functions
│   ├── vehicles/          # Vehicle services
│   │   └── vehicleService.ts # Vehicle CRUD operations
│   ├── bookings/          # Booking services
│   │   └── bookingService.ts # Booking management
│   ├── offers/            # Offers services
│   │   └── offerService.ts # Offers management
│   ├── contact/           # Contact services
│   │   └── contactService.ts # Contact form handling
│   ├── images/            # Image services
│   │   └── imageService.ts # Image upload/management
│   └── index.ts           # Barrel exports for all services
│
├── types/                 # TypeScript type definitions
│   ├── index.ts           # Main type exports
│   ├── auth.types.ts      # Authentication types
│   ├── booking.types.ts   # Booking types
│   ├── user.types.ts      # User types
│   └── vehicle.types.ts   # Vehicle types
│
├── config/                # Configuration files
│   ├── supabase.ts        # Supabase client configuration
│   ├── stripe.ts          # Stripe configuration (if needed)
│   └── constants.ts       # Application constants
│
└── utils/                 # Utility functions
    ├── formatters.ts      # Data formatting utilities
    ├── validators.ts      # Validation utilities
    └── helpers.ts         # General helper functions
```

## 🎯 Usage

### For Customers
1. **Browse Vehicles**: View available cars by category
2. **Search with Dates**: Select pickup/return dates to see available vehicles
3. **Create Account**: Register with Supabase Auth to book vehicles
4. **Make Reservations**: Complete booking with customer information
5. **View Profile**: Check account details and booking history

### For Administrators
1. **Access Admin Portal**: Login with admin email (`admin@4arentals.com`)
2. **Manage Vehicles**: Add, edit, delete vehicles in the fleet
3. **Handle Reservations**: View and update booking statuses
4. **Create Offers**: Add special promotions and deals
5. **Monitor Business**: View booking statistics and revenue

### Default Admin Account
- **Email**: `admin@4arentals.com` (configured in Supabase RLS policies)
- **Password**: Any password (mock authentication)

## 🚀 Deployment

### Deploy to Netlify

1. **Build the project**:
   ```bash
   npm run build
   ```

2. **Deploy to Netlify**:
   - Connect your GitHub repository to Netlify
   - Set build command: `npm run build`
   - Set publish directory: `dist`

### Environment Variables

Ensure the following environment variables are set in your deployment:
- `VITE_SUPABASE_URL`: Your Supabase project URL
- `VITE_SUPABASE_ANON_KEY`: Your Supabase anonymous key

## 🔒 Data Management

- All data is stored in Supabase PostgreSQL database
- Data persists between sessions
- Row Level Security (RLS) policies ensure data security
- Real-time updates and secure authentication
- Professional-grade database with backup and scaling capabilities

## 🎨 Customization

### Adding New Vehicle Categories
1. Update the `Vehicle` type in `src/types/index.ts`
2. Add the new category to vehicle forms in `src/pages/Admin.tsx`
3. Update category filters in `src/components/VehicleGrid.tsx`

### Modifying Booking Flow
1. Edit `src/components/BookingModal.tsx` for form changes
2. Update `src/services/bookingService.ts` for data handling
3. Modify `src/types/index.ts` for new booking fields

### Styling Changes
- All styles use Tailwind CSS classes
- Custom animations and themes in `tailwind.config.js`
- Global styles in `src/index.css`

## 🐛 Troubleshooting

### Common Issues

**Data Not Persisting**
- Check your Supabase connection and environment variables
- Verify RLS policies allow the required operations
- Check the browser console for Supabase error messages

**Build Errors**
- Run `npm install` to ensure all dependencies are installed
- Check for TypeScript errors with `npm run lint`
- Verify all imports are correct and Supabase is properly configured

**Authentication Issues**
- The system uses Supabase Auth for secure authentication
- Admin access is granted to `admin@4arentals.com` with any password
- User data is stored in Supabase and persists between sessions
- Check RLS policies if users can't access their data

## 📞 Support

For issues or questions:
1. Check the troubleshooting section above
2. Ensure all dependencies are properly installed
3. Verify localStorage is working in your browser

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

---

**Built with ❤️ for 4A Rentals**