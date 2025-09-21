# TraceWorka Requisition Form

A modern, mobile-first requisition form application built with Next.js, NextAuth.js, and Firebase. This application provides a responsive interface for submitting and managing internal requisitions.

## Features

- **📱 Mobile-First Design**: Fully responsive interface optimized for mobile devices
- **🔐 Authentication**: Secure user authentication with NextAuth.js
- **💾 Real-time Database**: Firebase integration for real-time data management
- **👤 Role-Based Access**: Admin and user roles with different permissions
- **📊 Responsive Tables**: Mobile-friendly card layout and desktop table view
- **🎨 Modern UI**: Clean, intuitive interface using Tailwind CSS

## Mobile Optimizations

### Touch-Friendly Interface
- Minimum 44px touch targets for better mobile accessibility
- Larger text inputs with improved padding (12px on mobile, 8px on desktop)
- Full-width buttons on mobile, auto-width on desktop
- Optimized spacing and typography for different screen sizes

### Responsive Layouts
- **Forms**: Single column on mobile, two columns on tablet+
- **Tables**: Card-based layout on mobile, traditional table on desktop
- **Navigation**: Stacked navigation on mobile, horizontal on desktop
- **Cards**: Responsive padding and spacing across breakpoints

### Performance Features
- Mobile-first CSS utilities
- Optimized component rendering
- Efficient data loading with SWR

## Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Firebase project setup
- Environment variables configured

### Installation

1. Clone the repository:
```bash
git clone [repository-url]
cd requistion-form
```

2. Install dependencies:
```bash
npm install
# or
yarn install
```

3. Set up environment variables:
Create `.env.local` and add your Firebase and NextAuth configuration.

4. Run the development server:
```bash
npm run dev
# or
yarn dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Mobile Testing

To test mobile responsiveness:

1. **Chrome DevTools**: Press F12 and toggle device toolbar
2. **Real Device Testing**: Access the app on actual mobile devices
3. **Responsive Design Mode**: Test various breakpoints (320px, 768px, 1024px+)

## Responsive Breakpoints

- **Mobile**: < 640px (sm)
- **Tablet**: 640px - 1023px (sm to lg)
- **Desktop**: 1024px+ (lg+)

## Technology Stack

- **Framework**: Next.js 15.5.3
- **Authentication**: NextAuth.js
- **Database**: Firebase Firestore
- **Styling**: Tailwind CSS
- **Language**: TypeScript
- **Data Fetching**: SWR

## Project Structure

```
src/
├── app/                 # App Router pages
├── components/          # Reusable UI components
│   └── ui/             # Base UI components
├── types/              # TypeScript type definitions
└── globals.css         # Global styles with mobile utilities
```

## Build and Deploy

```bash
# Build for production
npm run build

# Start production server
npm start

# Run linting
npm run lint
```

## Contributing

1. Follow the mobile-first approach for new components
2. Test on multiple screen sizes
3. Maintain minimum touch target sizes
4. Use the provided CSS utility classes for consistency

## Support

For support or questions about mobile optimization, please refer to the project documentation or contact the development team.
# Traceworka
